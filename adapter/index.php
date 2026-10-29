<?php
/**
 * GolPulse BFF adapter — betgo.site /api/sports/* fidini GolPulse (Telegram Mini App)
 * tiplariga o'giradi: bozorlarni (eventGroups) kesadi, hash-id larni yechadi,
 * CORS beradi, fayl keshlaydi. Oddiy PHP skript (daemon emas).
 *
 * Endpointlar:
 *   ?a=live                     — bugungi ro'yxat: jonli + rejalashtirilgan + tugagan (liga guruhlari)
 *   ?a=match&id=<gameId>        — o'yin to'plami: hisob taxtasi, voqealar, statistika, tarkiblar, H2H, jadval
 *   ?a=table&game_id=<gameId>   — turnir jadvali (forma bilan)
 *   ?a=league&champ=<ligaId>    — liga sahifasi: o'yinlar + oxirgi natijalar + jadval kaliti
 *   ?a=leagues                  — ligalar katalogi
 *   ?a=search&q=<matn>          — jamoa/liga/o'yin qidiruvi (o'z indeksi)
 *   ?a=team&clId=<id>           — jamoa sahifasi
 *   ?a=player&game_id=&player=  — o'yinchi sahifasi (o'yin konteksti bilan)
 */

error_reporting(0);
ini_set('display_errors', '0');

const GP_ORIGIN = 'https://azizbek-web-dev.github.io';
const API = 'https://betgo.site/api/sports';
const FEED = 'https://n4aj3uj5s3enq.com';       // asosiy fid (logo_teams, logo-champ)
const STATFEED = 'https://kt4wza6ixmsodu.com';  // statistika fidi (playerlogo)

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . GP_ORIGIN);
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

// ---------------- Kesh (fayl) ----------------
function cache_dir(): string {
    $d = __DIR__ . '/cache';
    if (!is_dir($d)) { @mkdir($d, 0777, true); }
    if (!is_writable($d)) { $d = sys_get_temp_dir() . '/gp-api-cache'; if (!is_dir($d)) { @mkdir($d, 0777, true); } }
    return $d;
}
function cache_get(string $key, int $ttl) {
    $f = cache_dir() . '/' . md5($key) . '.json';
    if (!is_file($f)) return null;
    $age = time() - filemtime($f);
    if ($age > $ttl * 20) return null; // juda eski — ishlatmaymiz
    $raw = @file_get_contents($f);
    if ($raw === false) return null;
    $v = json_decode($raw, true);
    if (!is_array($v) || !isset($v['t'], $v['body'])) return null;
    return ['age' => $age, 'fresh' => $age <= $ttl, 'body' => $v['body']];
}
function cache_put(string $key, $body): void {
    $f = cache_dir() . '/' . md5($key) . '.json';
    @file_put_contents($f, json_encode(['t' => time(), 'body' => $body]), LOCK_EX);
    // Muvaffaqiyatli yangilash — SWR lockni ham yangilaydi (TTL ichida qayta navbatga tushmaydi)
    @file_put_contents(cache_dir() . '/' . md5('lock:' . $key) . '.lock', (string)time());
}
/** SWR lock: bitta path TTL ichida ko'pi bilan bir marta fonda yangilanadi (upstream himoyasi) */
function refresh_lock_acquire(string $key, int $ttl): bool {
    $f = cache_dir() . '/' . md5('lock:' . $key) . '.lock';
    $age = is_file($f) ? time() - filemtime($f) : PHP_INT_MAX;
    if ($age < $ttl) return false;
    @file_put_contents($f, (string)time());
    return true;
}

// ---------------- Yuqori oqim (betgo API) ----------------
function http_get_json(string $url, int $timeout = 25) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_USERAGENT => 'GolPulse-BFF/1.0',
        CURLOPT_ENCODING => '',
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $code < 200 || $code >= 300) return null;
    $v = json_decode($raw, true);
    return is_array($v) ? $v : null;
}
$GLOBALS['gp_refresh_queue'] = [];
/**
 * Keshlangan chaqiruv + stale-while-revalidate:
 * - fresh (age <= TTL) — keshdan;
 * - stale, lekin age <= 3*TTL — kesh darhol qaytadi, yangilash navbatga qo'yiladi
 *   (router javobni yuborgach fonda bajariladi — foydalanuvchi kutmaydi);
 * - undan eski / kesh yo'q — sinxron tarmoq (qisqa timeout); xatoda eski kesh (stale-if-error).
 * Upstream himoyasi: har bir path uchun chaqiruvlar TTL dan tez bo'lmaydi —
 * SWR yangilash ham lock bilan TTL da ko'pi bilan bir marta navbatga tushadi.
 */
function api(string $path, int $ttl) {
    $key = 'api:' . $path;
    $c = cache_get($key, $ttl);
    if ($c && $c['fresh']) return $c['body'];
    if ($c && $c['age'] <= $ttl * 3) {
        if (refresh_lock_acquire($key, $ttl)) $GLOBALS['gp_refresh_queue'][$path] = true;
        return $c['body']; // SWR: stale darhol
    }
    $v = http_get_json(API . $path, 10);
    if ($v !== null && !empty($v['success'])) { cache_put($key, $v); return $v; }
    if ($c) return $c['body']; // stale (xato holatda)
    return $v; // null yoki success=false javob — chaqiruvchi o'zi hal qiladi
}
/** Navbatdagi SWR yangilashlarni bajarish (javob mijozga yuborilgandan keyin chaqiriladi) */
function gp_flush_refresh_queue(): void {
    $q = $GLOBALS['gp_refresh_queue'] ?? [];
    $GLOBALS['gp_refresh_queue'] = [];
    $n = 0;
    foreach (array_keys($q) as $path) {
        if (++$n > 6) break; // bitta so'rovda cheklov — worker uzoq band bo'lmasin
        $v = http_get_json(API . $path, 8);
        if ($v !== null && !empty($v['success'])) cache_put('api:' . $path, $v);
    }
}
function api_data(string $path, int $ttl) {
    $v = api($path, $ttl);
    return (is_array($v) && array_key_exists('data', $v)) ? $v['data'] : null;
}

// ---------------- Yordamchilar ----------------
function s($v): string { return $v === null ? '' : (string)$v; }
function num($v): float {
    if (is_numeric($v)) return (float)$v;
    $c = preg_replace('/[^0-9.\-]/', '', s($v)); // "53%" -> "53"
    return is_numeric($c) ? (float)$c : 0.0;
}
function feed_url($path): ?string {
    if (!$path) return null;
    $p = s($path);
    if (strpos($p, 'http') === 0) return $p;
    return FEED . '/' . ltrim($p, '/');
}
function stat_url($file): ?string {
    if (!$file) return null;
    $f = s($file);
    if (strpos($f, 'http') === 0) return $f;
    if (strpos($f, 'playerlogo/') === 0) return STATFEED . '/' . $f;
    return STATFEED . '/playerlogo/' . ltrim($f, '/');
}
function team_short(string $name): string {
    $w = preg_replace('/[^A-Za-zÀ-ÿЀ-ӿ ]/u', '', $name);
    $parts = preg_split('/\s+/', trim($w));
    if (count($parts) >= 2) {
        $sh = '';
        foreach (array_slice($parts, 0, 3) as $p) { if ($p !== '') $sh .= mb_substr($p, 0, 1, 'UTF-8'); }
        if (strlen($sh) >= 2) return mb_strtoupper($sh, 'UTF-8');
    }
    return mb_strtoupper(mb_substr($w, 0, 3, 'UTF-8'), 'UTF-8');
}
function fmt_time(int $ts): string { return date('H:i', $ts); } // server vaqti — quyida TZ belgilanadi
function fmt_date(int $ts): string { return date('d.m.Y', $ts); }

/** Raqib yozuvidan jamoa obyekti (clId, nom, gerb) */
function team_obj($opp): ?array {
    if (!is_array($opp)) return null;
    $name = s($opp['fullName'] ?? '');
    $ops = $opp['opps'][0] ?? null;
    if (is_array($ops)) {
        if ($name === '') $name = s($ops['name'] ?? '');
        return [
            'id' => s($ops['id'] ?? ''),
            'name' => $name !== '' ? $name : s($ops['name'] ?? ''),
            'short' => team_short($name),
            'crestUrl' => feed_url($ops['image'] ?? null),
        ];
    }
    return ['id' => '', 'name' => $name, 'short' => team_short($name), 'crestUrl' => null];
}

/** O'yin statusi va daqiqasi (jonli yozuvlar uchun) */
function live_status(array $g, $sc = null): array {
    if (!is_array($sc)) $sc = $g['scores'] ?? ($g['mainGameScores'] ?? null);
    if (!is_array($sc)) return ['status' => 'scheduled', 'minute' => null];
    $timer = $sc['timer'] ?? [];
    $sec = (int)($timer['timeSec'] ?? 0);
    $run = $timer['timeRun'] ?? true;
    $period = (int)($sc['currentPeriod'] ?? 1);
    $minute = (int)floor($sec / 60);
    if (!$run && $sec >= 2550 && $sec <= 3000) return ['status' => 'halftime', 'minute' => null];
    if ($period >= 3 && !$run) return ['status' => 'live', 'minute' => $minute];
    return ['status' => 'live', 'minute' => $minute];
}

/** Bitta o'yin yozuvini (live/line/games-by-champ shakli) GolPulse MatchRow ga o'girish */
function match_row(array $g, $ligaId = null, $ligaName = null): ?array {
    $home = team_obj($g['opponent1'] ?? null);
    $away = team_obj($g['opponent2'] ?? null);
    if (!$home || !$away) return null;
    $liga = $g['liga'] ?? [];
    $sc = $g['scores'] ?? ($g['mainGameScores'] ?? null);
    $row = [
        'id' => s($g['id'] ?? ''),
        'leagueId' => s($ligaId !== null ? $ligaId : ($liga['id'] ?? '')),
        'leagueName' => s($ligaName !== null ? $ligaName : ($liga['name'] ?? '')),
        'home' => $home,
        'away' => $away,
        'startTs' => (int)($g['startTs'] ?? 0),
        'startTime' => isset($g['startTs']) ? fmt_time((int)$g['startTs']) : '',
        'dateLabel' => isset($g['startTs']) ? fmt_date((int)$g['startTs']) : '',
    ];
    if (is_array($sc)) {
        $st = live_status($g, $sc);
        $row['status'] = $st['status'];
        if ($st['minute'] !== null) $row['minute'] = $st['minute'];
        // Lokal daqiqa taymeri uchun: fid soati (soniya) va yurish holati
        $tm = $sc['timer'] ?? [];
        if (isset($tm['timeSec'])) $row['timeSec'] = (int)$tm['timeSec'];
        $row['timeRun'] = (bool)($tm['timeRun'] ?? true);
        $row['homeScore'] = isset($sc['scoreOpp1']) ? (int)$sc['scoreOpp1'] : 0;
        $row['awayScore'] = isset($sc['scoreOpp2']) ? (int)$sc['scoreOpp2'] : 0;
        // 1-bo'lim hisobi (2-bo'lim ketayotgan yoki tugagan bo'lsa)
        $period = (int)($sc['currentPeriod'] ?? 1);
        if ($period >= 2) {
            foreach (($sc['periodScores'] ?? []) as $ps) {
                if ((int)($ps['period'] ?? 0) === 1) {
                    $row['htHome'] = (int)($ps['scoreOpp1'] ?? 0);
                    $row['htAway'] = (int)($ps['scoreOpp2'] ?? 0);
                }
            }
        }
        $tablo = $sc['tabloStats'][0] ?? null;
        if (is_array($tablo) && $tablo) {
            $row['tablo'] = array_map(function ($t) {
                return ['label' => s($t['name'] ?? ''), 'home' => num($t['s1'] ?? 0), 'away' => num($t['s2'] ?? 0)];
            }, $tablo);
        }
    } else {
        $row['status'] = 'scheduled';
    }
    return $row;
}

/** Statistika oilasidagi teams[] dan hash→{title, clId, image} lug'ati */
function teams_dict($teams): array {
    $d = [];
    if (is_array($teams)) foreach ($teams as $t) {
        if (isset($t['id'])) $d[s($t['id'])] = [
            'title' => s($t['title'] ?? ''), 'clId' => s($t['clId'] ?? ''),
            'image' => $t['image'] ?? null,
        ];
    }
    return $d;
}
/** hash jamoaning qaysi tomon ekani (home clId / away clId bilan solishtirib) */
function side_of(string $clId, string $homeClId, string $awayClId): ?string {
    if ($clId !== '' && $clId === $homeClId) return 'home';
    if ($clId !== '' && $clId === $awayClId) return 'away';
    return null;
}

// ---------------- Statistika o'girish ----------------
const STAT_LABEL_MAP = [
    'Total shots' => 'Jami zarbalar',
    'Shots on target' => 'Darvozaga aniq zarbalar',
    'Big Chances' => 'Katta vaziyatlar',
    'Assists' => 'Uzatmalar',
    'Crosses' => 'Kesishmalar (kross)',
    'Duels won' => 'Yakkakurashlarda g\'alaba',
    'Clearances' => 'Tozalashlar',
    'Steals' => 'To\'p olib qo\'yishlar',
    'Hit the woodwork' => 'Ustun/to\'sin',
    'Touches in opposition box' => 'Raqib jarima maydonida tegishlar',
    'Passes in final third' => 'Yakuniy uchdan birda uzatmalar',
    'Accurate through passes' => 'Aniq ochiq uzatmalar',
    'Shots from inside the penalty area' => 'Jarima maydonidan zarbalar',
    'Shots from outside the penalty area' => 'Tashqaridan zarbalar',
    'Errors leading to shot' => 'Zarbaga olib kelgan xatolar',
    'Errors leading to goal' => 'Golga olib kelgan xatolar',
    'Goal kicks' => 'Darvozadan tepishlar',
    'xGOT faced' => 'Qarshi xGOT',
    'Goals prevented' => 'Oldi olingan gollar',
    'Uzoqdan uzatishlar' => 'Uzoq uzatmalar',
];
const STAT_PRIORITY = ['To\'pga egalik qilish', 'Kutilayotgan gollar (xG)', 'xG', 'Jami zarbalar', 'Darvozaga aniq zarbalar', 'Katta vaziyatlar', 'Burchak to’plari', 'Burchak to\'plari', 'Ofsaydlar', 'Follar', 'Darvozabon seyvlari'];

function stat_lines(array $periodStatistic): array {
    $out = [];
    foreach ($periodStatistic as $p) {
        $label = s($p['title'] ?? '');
        if (isset(STAT_LABEL_MAP[$label])) $label = STAT_LABEL_MAP[$label];
        $s1 = s($p['score1'] ?? '0'); $s2 = s($p['score2'] ?? '0');
        $line = ['label' => $label, 'home' => num($s1), 'away' => num($s2)];
        if (substr($s1, -1) === '%') $line['suffix'] = '%';
        if (strpos($s1, '.') !== false) $line['decimals'] = 2;
        $out[] = $line;
    }
    usort($out, function ($a, $b) {
        $pa = array_search($a['label'], STAT_PRIORITY, true); $pb = array_search($b['label'], STAT_PRIORITY, true);
        $pa = $pa === false ? 99 : $pa; $pb = $pb === false ? 99 : $pb;
        return $pa <=> $pb;
    });
    return $out;
}

function fetch_stats(string $gameId): ?array {
    $data = api_data('/game-statistics?game_id=' . urlencode($gameId) . '&sport=futbol&lng=uz', 5);
    $resp = is_array($data) ? ($data['response'] ?? null) : null;
    if (!is_array($resp)) return null;
    $groups = $resp['gameStatistic'] ?? [];
    if (!$groups) return null;
    $out = ['all' => [], 'h1' => null, 'h2' => null];
    foreach ($groups as $g) {
        $lines = stat_lines($g['periodStatistic'] ?? []);
        $t = s($g['title'] ?? '');
        if ($t === 'Match') $out['all'] = $lines;
        elseif (strpos($t, '1') === 0) $out['h1'] = $lines;
        elseif (strpos($t, '2') === 0) $out['h2'] = $lines;
    }
    if (!$out['all'] && $out['h1']) $out['all'] = $out['h1'];
    return $out['all'] ? $out : null;
}

// ---------------- Voqealar o'girish ----------------
const CARD_REASONS = [
    'Roughing' => 'Qo\'pol o\'yin', 'Tripping' => 'Yiqitish', 'Handling' => 'Qo\'l bilan o\'yin',
    'Foul' => 'Fol', 'Argument' => 'Etiroz', 'Time wasting' => 'Vaqt cho\'zish',
    'Diving' => 'Simulyatsiya', 'Unsporting behaviour' => 'Sportga zid xulq',
];
function event_type_map($type, string $note): string {
    if (stripos($note, 'yellow') !== false) return 'yellow';
    if (stripos($note, 'red') !== false) return 'red';
    if (stripos($note, 'penalty missed') !== false) return 'chance';
    if ((int)$type === 26 || stripos($note, 'penalti') !== false || stripos($note, 'penalty') !== false) return 'pen-goal';
    switch ((int)$type) {
        case 1: return 'goal';
        case 2: return 'sub';
        case 3: return 'yellow';
        case 4: return 'red';
        case 5: return 'chance';
    }
    if (stripos($note, 'goal') !== false) return 'goal';
    if (stripos($note, 'substitut') !== false) return 'sub';
    return 'chance';
}
function period_label(string $title): string {
    if (strpos($title, '1') === 0) return '1-bo\'lim';
    if (strpos($title, '2') === 0) return '2-bo\'lim';
    if (stripos($title, 'overtaym') !== false || stripos($title, 'overtime') !== false || stripos($title, 'penalt') !== false) return 'Penaltilar seriyasi';
    return $title;
}
function fetch_events(string $gameId, string $homeClId, string $awayClId): ?array {
    $data = api_data('/game-events?game_id=' . urlencode($gameId) . '&sport=futbol&lng=uz', 5);
    if (!is_array($data)) return null;
    $resp = $data['response'] ?? null;
    if (!is_array($resp) || !$resp) return null;
    $teams = teams_dict($data['teams'] ?? []);
    $players = [];
    foreach (($data['players'] ?? []) as $p) if (isset($p['id'])) $players[s($p['id'])] = s($p['name'] ?? '');
    $out = [];
    foreach ($resp as $period) {
        $label = period_label(s($period['title'] ?? ''));
        $shootout = $label === 'Penaltilar seriyasi';
        foreach (($period['events'] ?? []) as $ev) {
            $note = s($ev['note'] ?? '');
            $type = event_type_map($ev['type'] ?? 0, $note);
            $teamHash = s($ev['teamId'] ?? '');
            $teamClId = $teams[$teamHash]['clId'] ?? '';
            $side = side_of($teamClId, $homeClId, $awayClId);
            $playerName = $players[s($ev['player'] ?? '')] ?? '';
            $assistName = '';
            foreach (($ev['assistants'] ?? []) as $a) { if (isset($players[s($a)])) { $assistName = $players[s($a)]; break; } }
            $dispNote = '';
            if ($type === 'yellow' || $type === 'red') {
                $parts = explode(' - ', $note);
                $reason = trim($parts[1] ?? '');
                $dispNote = CARD_REASONS[$reason] ?? $reason;
            } elseif ($type === 'sub') {
                $dispNote = $assistName !== '' ? $assistName . ' o\'rniga' : '';
            } elseif ($type === 'goal') {
                $dispNote = $assistName !== '' ? $assistName . ' assist' : '';
            } elseif ($type === 'pen-goal') {
                $dispNote = $shootout ? 'Penalti (seriya)' : 'Penaltidan';
            } elseif ($type === 'chance') {
                $dispNote = 'Penalti — o\'tkazib yuborildi';
            }
            $minStr = s($ev['minute'] ?? '');
            $out[] = [
                'minute' => (int)preg_replace('/[^0-9].*$/', '', $minStr),
                'minuteLabel' => $minStr,
                'type' => $type,
                'teamId' => $side === 'home' ? $homeClId : ($side === 'away' ? $awayClId : $teamClId),
                'player' => $playerName,
                'playerId' => s($ev['player'] ?? ''),
                'note' => $dispNote,
                'period' => $label,
            ];
        }
    }
    return $out ?: null;
}

// ---------------- Tarkiblar o'girish ----------------
function fetch_lineups(string $gameId, string $homeClId, string $awayClId): ?array {
    $data = api_data('/lineups?game_id=' . urlencode($gameId) . '&sport=futbol&lng=uz', 15);
    if (!is_array($data)) return null;
    $resp = $data['response'] ?? null;
    if (!is_array($resp) || count($resp) < 2) return null;
    $teams = teams_dict($data['teams'] ?? []);
    $players = [];
    foreach (($data['players'] ?? []) as $p) if (isset($p['id'])) $players[s($p['id'])] = $p;
    $result = ['home' => null, 'away' => null];
    foreach ($resp as $idx => $t) {
        $teamHash = s($t['team'] ?? '');
        $clId = $teams[$teamHash]['clId'] ?? '';
        $side = side_of($clId, $homeClId, $awayClId);
        if ($side === null) $side = $idx === 0 ? 'home' : 'away';
        $hasPos = !empty($t['hasPositions']);
        $starters = []; $subs = []; $coach = null;
        foreach (($t['lineUps'] ?? []) as $lu) {
            $title = s($lu['title'] ?? '');
            $isCoach = stripos($title, 'Murabbiy') !== false || stripos($title, 'coach') !== false;
            $isStart = stripos($title, 'Asosiy') !== false;
            foreach (($lu['players'] ?? []) as $pl) {
                $info = $players[s($pl['player'] ?? '')] ?? [];
                $entry = [
                    'id' => s($pl['player'] ?? ''),
                    'name' => s($info['name'] ?? ''),
                    'shortName' => s($info['shortName'] ?? ''),
                    'number' => (int)($pl['num'] ?? 0),
                    'photo' => isset($info['image']) ? stat_url($info['image']) : null,
                    'country' => s($info['country']['title'] ?? ''),
                    'pos' => '',
                ];
                if ($isCoach) { $coach = $entry['name']; continue; }
                if ($isStart) {
                    $entry['line'] = (int)($pl['line'] ?? 0);
                    $entry['posIdx'] = (int)($pl['position'] ?? 0);
                    $starters[] = $entry;
                } else {
                    $subs[] = $entry;
                }
            }
        }
        // Pozitsiyalar fidda bo'lmasa — koordinata uydirilmaydi (maydon chizilmaydi)
        $anyLine = false;
        foreach ($starters as $p) if (($p['line'] ?? 0) > 0) { $anyLine = true; break; }
        if (!$hasPos || !$anyLine) {
            foreach ($starters as &$p) { unset($p['line'], $p['posIdx']); }
            unset($p);
            $result[$side] = ['formation' => null, 'hasPositions' => false, 'players' => $starters, 'subs' => $subs, 'coach' => $coach, 'teamId' => $side === 'home' ? $homeClId : $awayClId];
            continue;
        }
        // Sxema: line>0 qatorlardagi o'yinchilar soni (line 0 = darvozabon)
        $byLine = [];
        foreach ($starters as $p) { if ($p['line'] > 0) $byLine[$p['line']] = ($byLine[$p['line']] ?? 0) + 1; }
        ksort($byLine);
        $formation = $byLine ? implode('-', array_values($byLine)) : null;
        $lineCount = count($byLine);
        // Koordinatalar: x — qator ichida yoyish, y — o'z darvozasidan (FORMATIONS shkalasi 5..72)
        $lineSizes = [];
        foreach ($starters as $p) $lineSizes[$p['line']] = ($lineSizes[$p['line']] ?? 0) + 1;
        $seen = [];
        foreach ($starters as &$p) {
            $L = $p['line'];
            $n = $lineSizes[$L] ?? 1;
            $k = $seen[$L] = ($seen[$L] ?? 0) + 1;
            $idxInLine = max(0, $k - 1);
            $p['x'] = $n === 1 ? 50 : (int)round(12 + 76 * ($idxInLine / ($n - 1)));
            if ($L === 0) { $p['y'] = 6; $p['pos'] = 'GK'; }
            else {
                $p['y'] = $lineCount <= 1 ? 45 : (int)round(20 + 52 * (($L - 1) / max(1, $lineCount - 1)));
                $p['pos'] = $L === 1 ? 'DF' : ($L === max(array_keys($byLine)) ? 'FW' : 'MF');
            }
            unset($p['line'], $p['posIdx']);
        }
        unset($p);
        usort($starters, function ($a, $b) { return ($a['y'] <=> $b['y']) ?: ($a['x'] <=> $b['x']); });
        $result[$side] = ['formation' => $formation, 'hasPositions' => true, 'players' => $starters, 'subs' => $subs, 'coach' => $coach, 'teamId' => $side === 'home' ? $homeClId : $awayClId];
    }
    return ($result['home'] && $result['away']) ? $result : null;
}

// ---------------- H2H o'girish ----------------
function team_game_row(array $g, array $teams, string $perspClId): array {
    $t1 = $teams[s($g['team1'] ?? '')] ?? ['title' => '', 'clId' => ''];
    $t2 = $teams[s($g['team2'] ?? '')] ?? ['title' => '', 'clId' => ''];
    $s1 = $g['score1']; $s2 = $g['score2'];
    $row = [
        'date' => isset($g['dateStart']) ? fmt_date((int)$g['dateStart']) : '',
        'dateTs' => (int)($g['dateStart'] ?? 0),
        'home' => $t1['title'], 'away' => $t2['title'],
        'homeId' => $t1['clId'], 'awayId' => $t2['clId'],
        'score' => ($s1 === null || $s2 === null) ? null : ((int)$s1 . ':' . (int)$s2),
    ];
    if ($perspClId !== '' && $row['score'] !== null) {
        if ($t1['clId'] === $perspClId) $mine = (int)$s1 - (int)$s2;
        elseif ($t2['clId'] === $perspClId) $mine = (int)$s2 - (int)$s1;
        else $mine = 0;
        $row['result'] = $mine > 0 ? 'W' : ($mine < 0 ? 'L' : 'D');
    }
    return $row;
}
function fetch_h2h(string $gameId, string $homeClId, string $awayClId): ?array {
    $data = api_data('/head-to-head?game_id=' . urlencode($gameId) . '&sport=futbol&lng=uz', 60);
    if (!is_array($data)) return null;
    $resp = $data['response'] ?? null;
    if (!is_array($resp)) return null;
    $teams = teams_dict($data['teams'] ?? []);
    $t1 = $teams[s($resp['team1'] ?? '')] ?? null;
    $t2 = $teams[s($resp['team2'] ?? '')] ?? null;
    $swap = $t1 && side_of($t1['clId'], $homeClId, $awayClId) === 'away';
    $past = [];
    foreach (array_slice($resp['games'] ?? [], 0, 8) as $g) $past[] = team_game_row($g, $teams, '');
    $recent = function ($list, $clId) use ($teams) {
        $out = [];
        foreach (array_slice($list ?? [], 0, 5) as $g) {
            if (($g['status'] ?? 3) != 3 && ($g['score1'] ?? null) === null) continue;
            $out[] = team_game_row($g, $teams, $clId);
        }
        return $out;
    };
    return [
        'homeWins' => (int)($swap ? ($resp['winCount2'] ?? 0) : ($resp['winCount1'] ?? 0)),
        'draws' => (int)($resp['drowCount'] ?? 0),
        'awayWins' => (int)($swap ? ($resp['winCount1'] ?? 0) : ($resp['winCount2'] ?? 0)),
        'total' => count($resp['games'] ?? []),
        'past' => $past,
        'homeRecent' => $recent($swap ? ($resp['team2Games'] ?? []) : ($resp['team1Games'] ?? []), $homeClId),
        'awayRecent' => $recent($swap ? ($resp['team1Games'] ?? []) : ($resp['team2Games'] ?? []), $awayClId),
    ];
}

// ---------------- Jadval o'girish ----------------
function parse_table_block(array $tableNode, array $teams): array {
    $titles = $tableNode['tableTitles'][0]['valueCol'] ?? [];
    $colByTitle = [];
    foreach ($titles as $t) $colByTitle[s($t['title'] ?? '')] = (int)($t['id'] ?? 0);
    $col = function ($name, $fallback) use ($colByTitle) { return $colByTitle[$name] ?? $fallback; };
    $cPos = $col('#', 1); $cTeam = $col('Jamoa', 2); $cPlayed = $col("O'yinlar soni", 3);
    $cW = $col('W', 4); $cL = $col('L', 5); $cD = $col('T', 6); $cG = $col('G', 7); $cPts = $col('Pts', 8); $cForm = $col('Shakli', 9);
    $rows = [];
    foreach (($tableNode['tableBody'] ?? []) as $groupRows) {
        if (!is_array($groupRows)) continue;
        foreach ($groupRows as $r) {
            $cells = [];
            foreach (($r['valueCol'] ?? []) as $c) $cells[(int)($c['id'] ?? 0)] = $c;
            $val = function ($id) use ($cells) {
                $v = $cells[$id]['value'] ?? [];
                return is_array($v) ? s($v[0] ?? '') : s($v);
            };
            $cid = s($cells[$cTeam]['competitorId'] ?? '');
            $t = $teams[$cid] ?? ['title' => '', 'clId' => $cid, 'image' => null];
            $form = [];
            $fv = $cells[$cForm]['value'] ?? [];
            if (is_array($fv)) foreach ($fv as $f) {
                if ($f === '1') $form[] = 'W'; elseif ($f === '2') $form[] = 'D'; elseif ($f === '3') $form[] = 'L';
            }
            $rows[] = [
                'pos' => (int)$val($cPos),
                'team' => ['id' => $t['clId'] !== '' ? $t['clId'] : $cid, 'name' => $t['title'], 'short' => team_short($t['title']), 'crestUrl' => isset($t['image']) && $t['image'] ? feed_url('/sfiles/logo_teams/' . $t['image']) : null],
                'played' => (int)$val($cPlayed), 'won' => (int)$val($cW), 'drawn' => (int)$val($cD), 'lost' => (int)$val($cL),
                'goals' => $val($cG), 'points' => (int)$val($cPts),
                'form' => array_slice($form, -5),
            ];
        }
    }
    return $rows;
}
function fetch_table(string $gameId): ?array {
    $data = api_data('/tournament-table?game_id=' . urlencode($gameId) . '&sport=futbol&lng=uz', 60);
    if (!is_array($data)) return null;
    $resp = $data['response'] ?? null;
    if (!is_array($resp)) return null;
    $teams = teams_dict($data['teams'] ?? []);
    $groups = [];
    $tbl = $resp['table'] ?? [];
    if (!empty($tbl['table']['tableBody'])) {
        $groups[] = ['name' => '', 'rows' => parse_table_block($tbl['table'], $teams)];
    }
    foreach (($tbl['groups'] ?? []) as $g) {
        $node = null;
        if (!empty($g['table']['tableBody'])) $node = $g['table'];
        elseif (!empty($g['table']['table']['tableBody'])) $node = $g['table']['table'];
        if ($node) $groups[] = ['name' => s($g['title'] ?? ''), 'rows' => parse_table_block($node, $teams)];
    }
    if (!$groups) return null;
    return ['title' => s($resp['title'] ?? ''), 'groups' => $groups];
}

// ---------------- Ro'yxatlar (umumiy) ----------------
/** Liga meta xaritasi: live/line championships dan id → {name, country, logo, countryImage} */
function league_meta_map(): array {
    $map = [];
    foreach (['/live-championships?sport=1&lng=uz', '/line-championships?sport=1&lng=uz'] as $path) {
        $data = api_data($path, 60);
        if (!is_array($data)) continue;
        foreach ($data as $elem) {
            foreach (['mainLigas', 'subLigas'] as $k) {
                foreach (($elem[$k] ?? []) as $l) {
                    $id = s($l['id'] ?? '');
                    if ($id === '') continue;
                    $entry = [
                        'name' => s($l['name'] ?? ''), 'country' => s($l['countryName'] ?? ''),
                        'logoUrl' => feed_url($l['image'] ?? null), 'countryImageUrl' => feed_url($l['countryImage'] ?? null),
                        'gamesCount' => (int)($l['gamesCount'] ?? 0),
                    ];
                    if (!isset($map[$id])) { $map[$id] = $entry; continue; }
                    // Merge: bo'sh maydonlarni to'ldirish, gamesCount — kattasi
                    foreach (['name', 'country', 'logoUrl', 'countryImageUrl'] as $f) {
                        if (empty($map[$id][$f]) && !empty($entry[$f])) $map[$id][$f] = $entry[$f];
                    }
                    $map[$id]['gamesCount'] = max($map[$id]['gamesCount'], $entry['gamesCount']);
                }
            }
        }
    }
    return $map;
}
function football_games(string $path, int $ttl): array {
    $data = api_data($path, $ttl);
    $out = [];
    if (is_array($data)) foreach ($data as $g) {
        if ((int)($g['sport']['id'] ?? 0) !== 1) continue; // faqat futbol
        $r = match_row($g);
        if ($r) $out[] = $r;
    }
    return $out;
}
function finished_today(): array {
    $now = (int)(floor(time() / 300) * 300); // 5 daqiqalik qadamlash — kesh kaliti barqaror bo'lsin
    $from = strtotime('today midnight');
    $ch = api_data('/result-champs?sportIds=1&dateFrom=' . $from . '&dateTo=' . $now . '&lng=uz', 120);
    $ids = []; $countryOf = [];
    if (is_array($ch)) foreach ($ch as $country) {
        foreach (($country['subChamps'] ?? []) as $sub) {
            if ((int)($sub['sportId'] ?? 1) !== 1) continue;
            if ((int)($sub['countEvent'] ?? 0) <= 0) continue;
            $nm = s($sub['name'] ?? '');
            // "Alternativ matchlar" — bukmeker simulyatsiya mahsuloti, real natija emas
            if (stripos($nm, 'Alternativ') !== false || stripos($nm, 'maxsus') !== false) continue;
            $ids[] = ['id' => (int)$sub['id'], 'count' => (int)$sub['countEvent'], 'name' => $nm, 'country' => s($country['name'] ?? '')];
            $countryOf[$nm] = s($country['name'] ?? '');
        }
    }
    usort($ids, function ($a, $b) { return $b['count'] <=> $a['count']; });
    // Bitta mamlakatdan ko'pi bilan 3 chempionat — ro'yxat muvozanati uchun
    $perCountry = []; $picked = [];
    foreach ($ids as $it) {
        $c = $it['country'];
        if (($perCountry[$c] ?? 0) >= 3) continue;
        $perCountry[$c] = ($perCountry[$c] ?? 0) + 1;
        $picked[] = $it;
        if (count($picked) >= 16) break;
    }
    $ids = $picked;
    if (!$ids) return [];
    $param = implode(',', array_column($ids, 'id'));
    $data = api_data('/result-games?champIds=' . $param . '&dateFrom=' . $from . '&dateTo=' . $now . '&lng=uz', 60);
    $out = [];
    if (is_array($data)) foreach ($data as $g) {
        if ((int)($g['sportId'] ?? 1) !== 1) continue;
        // Maxsus/bukmeker o'yinlari ("Mezbonlar — Mehmonlar" kabi) — real jamoalar emas
        $n1 = s($g['opp1'] ?? ''); $n2 = s($g['opp2'] ?? '');
        if (stripos($n1, 'Mezbon') !== false || stripos($n2, 'Mezbon') !== false || stripos($n1, 'maxsus') !== false || stripos($n2, 'maxsus') !== false) continue;
        $score = explode(':', s($g['scoreBase'] ?? ''));
        $ht = explode(',', s($g['scoreAdd'] ?? ''));
        $htScore = isset($ht[0]) ? explode(':', $ht[0]) : [];
        $out[] = [
            'id' => s($g['id'] ?? ''),
            'leagueId' => 'res-' . md5(s($g['champName'] ?? '')),
            'leagueName' => s($g['champName'] ?? ''),
            'country' => $countryOf[s($g['champName'] ?? '')] ?? '',
            'home' => ['id' => s($g['opp1Ids'][0] ?? ''), 'name' => s($g['opp1'] ?? ''), 'short' => team_short(s($g['opp1'] ?? '')), 'crestUrl' => isset($g['opp1Images'][0]) ? stat_url($g['opp1Images'][0]) : null],
            'away' => ['id' => s($g['opp2Ids'][0] ?? ''), 'name' => s($g['opp2'] ?? ''), 'short' => team_short(s($g['opp2'] ?? '')), 'crestUrl' => isset($g['opp2Images'][0]) ? stat_url($g['opp2Images'][0]) : null],
            'status' => 'finished',
            'homeScore' => (int)($score[0] ?? 0), 'awayScore' => (int)($score[1] ?? 0),
            'htHome' => (int)($htScore[0] ?? 0), 'htAway' => (int)($htScore[1] ?? 0),
            'startTs' => (int)($g['dateStart'] ?? 0),
            'startTime' => isset($g['dateStart']) ? fmt_time((int)$g['dateStart']) : '',
            'dateLabel' => isset($g['dateStart']) ? fmt_date((int)$g['dateStart']) : '',
        ];
    }
    usort($out, function ($a, $b) { return $b['startTs'] <=> $a['startTs']; });
    return array_slice($out, 0, 80);
}

function action_live(): array {
    $live = football_games('/live-matches?sport=1&lng=uz', 2);
    $line = football_games('/line-matches?sport=1&lng=uz', 30);
    $fin = finished_today();
    $meta = league_meta_map();
    $seen = [];
    $groups = [];
    $add = function ($row, $isRes) use (&$groups, &$seen, $meta) {
        if (isset($seen[$row['id']])) return;
        $seen[$row['id']] = true;
        $lid = $row['leagueId'];
        if (!isset($groups[$lid])) {
            $m = $meta[$lid] ?? null;
            $groups[$lid] = [
                'id' => $lid,
                'name' => $m['name'] ?? $row['leagueName'],
                'country' => $m['country'] ?? ($row['country'] ?? ''),
                'logoUrl' => $m['logoUrl'] ?? null,
                'countryImageUrl' => $m['countryImageUrl'] ?? null,
                'games' => [], 'liveCount' => 0,
            ];
        }
        $groups[$lid]['games'][] = $row;
        if ($row['status'] === 'live' || $row['status'] === 'halftime') $groups[$lid]['liveCount']++;
    };
    foreach ($live as $r) $add($r, false);
    foreach ($fin as $r) $add($r, true);
    foreach ($line as $r) $add($r, false);
    $list = array_values($groups);
    usort($list, function ($a, $b) {
        $la = $a['liveCount'] > 0 ? 0 : 1; $lb = $b['liveCount'] > 0 ? 0 : 1;
        return ($la <=> $lb) ?: ($b['liveCount'] <=> $a['liveCount']) ?: (count($b['games']) <=> count($a['games']));
    });
    $counts = ['live' => 0, 'finished' => 0, 'scheduled' => 0];
    foreach ($list as $g) foreach ($g['games'] as $gm) {
        if ($gm['status'] === 'live' || $gm['status'] === 'halftime') $counts['live']++;
        elseif (isset($counts[$gm['status']])) $counts[$gm['status']]++;
    }
    return ['leagues' => $list, 'counts' => $counts, 'updatedAt' => time()];
}

// ---------------- O'yin to'plami ----------------
function action_match(string $id): ?array {
    $detail = api_data('/match-detail?match_id=' . urlencode($id) . '&is_live=1&sport=1&lng=uz', 5);
    $base = null; $isLiveDetail = false;
    if (is_array($detail) && isset($detail['opponent1'])) {
        $base = match_row($detail);
        $isLiveDetail = true;
    }
    if ($base === null) {
        // Tugagan o'yin (natijalar oilasidan) — asosiy taxtani result yozuvidan yig'amiz
        foreach (finished_today() as $r) {
            if ($r['id'] === $id) { $base = $r; break; }
        }
    }
    if ($base === null) {
        // line/live ro'yxatlarida qidirish (zaxira yo'l)
        foreach (array_merge(football_games('/live-matches?sport=1&lng=uz', 30), football_games('/line-matches?sport=1&lng=uz', 60)) as $r) {
            if ($r['id'] === $id) { $base = $r; break; }
        }
    }
    if ($base === null) return null;
    $homeClId = $base['home']['id']; $awayClId = $base['away']['id'];
    $meta = ['venue' => null, 'stage' => null, 'referee' => null, 'temperature' => null];
    if ($isLiveDetail) {
        $info = $detail['matchInfoObj'] ?? [];
        $meta['venue'] = $info['location'] ?? null;
        $meta['stage'] = $info['tournamentStage'] ?? null;
        $meta['temperature'] = $info['temperature'] ?? null;
        if (!empty($detail['mainGameScores']['tabloStats'][0])) {
            $base['tablo'] = array_map(function ($t) {
                return ['label' => s($t['name'] ?? ''), 'home' => num($t['s1'] ?? 0), 'away' => num($t['s2'] ?? 0)];
            }, $detail['mainGameScores']['tabloStats'][0]);
        }
        if (!empty($info['stadiumId'])) {
            $st = api_data('/stadium?stadium_id=' . urlencode($info['stadiumId']) . '&sport=futbol&lng=uz', 3600);
            if (isset($st['response']['capacity'])) $meta['capacity'] = s($st['response']['capacity']);
        }
        $ref = api_data('/referee-card?game_id=' . urlencode($id) . '&sport=futbol&lng=uz', 300);
        $rp = $ref['playerMenu']['players'][0]['name'] ?? null;
        if ($rp) $meta['referee'] = s($rp);
    }
    $bundle = [
        'match' => $base,
        'meta' => $meta,
        'events' => fetch_events($id, $homeClId, $awayClId),
        'stats' => fetch_stats($id),
        'lineups' => fetch_lineups($id, $homeClId, $awayClId),
        'h2h' => fetch_h2h($id, $homeClId, $awayClId),
        'table' => fetch_table($id),
    ];
    return $bundle;
}

// ---------------- Liga sahifasi ----------------
function action_league(string $champ): ?array {
    $games = [];
    $seen = [];
    foreach (['live', 'line'] as $mode) {
        $data = api_data('/games-by-champ?champId=' . urlencode($champ) . '&mode=' . $mode . '&sportId=1&lng=uz', 30);
        if (!is_array($data)) continue;
        foreach (($data['games'] ?? []) as $g) {
            $r = match_row($g, $champ, $data['liga']['name'] ?? null);
            if ($r && !isset($seen[$r['id']])) { $seen[$r['id']] = true; $games[] = $r; }
        }
    }
    $meta = league_meta_map();
    $m = $meta[$champ] ?? null;
    $name = $m['name'] ?? ($games[0]['leagueName'] ?? '');
    if ($name === '' && !$games) return null;
    $lastGames = null; $tableGameId = null;
    if ($games) {
        $tableGameId = $games[0]['id'];
        $data = api_data('/champ-last-games?game_id=' . urlencode($tableGameId) . '&sport=futbol&lng=uz', 120);
        if (is_array($data) && isset($data['response']['games'])) {
            $teams = teams_dict($data['teams'] ?? []);
            $lastGames = [];
            foreach (array_slice($data['response']['games'], 0, 10) as $g) $lastGames[] = team_game_row($g, $teams, '');
        }
    }
    return [
        'league' => ['id' => $champ, 'name' => $name, 'country' => $m['country'] ?? '', 'logoUrl' => $m['logoUrl'] ?? null, 'countryImageUrl' => $m['countryImageUrl'] ?? null],
        'games' => $games, 'lastGames' => $lastGames, 'tableGameId' => $tableGameId,
    ];
}

function action_leagues(): array {
    $meta = league_meta_map();
    $liveCounts = [];
    $data = api_data('/live-championships?sport=1&lng=uz', 30);
    if (is_array($data)) foreach ($data as $elem) {
        foreach (['mainLigas', 'subLigas'] as $k) foreach (($elem[$k] ?? []) as $l) {
            $liveCounts[s($l['id'] ?? '')] = count($l['games'] ?? []);
        }
    }
    $out = [];
    foreach ($meta as $id => $m) {
        $name = $m['name'];
        if (stripos($name, 'maxsus garovlari') !== false || stripos($name, 'Statistikasi') !== false) continue;
        $lc = $liveCounts[$id] ?? 0;
        if ($lc === 0 && $m['gamesCount'] === 0) continue;
        $out[] = ['id' => $id, 'name' => $name, 'country' => $m['country'], 'logoUrl' => $m['logoUrl'], 'countryImageUrl' => $m['countryImageUrl'], 'liveCount' => $lc, 'gamesCount' => $m['gamesCount']];
    }
    usort($out, function ($a, $b) { return ($b['liveCount'] <=> $a['liveCount']) ?: ($b['gamesCount'] <=> $a['gamesCount']); });
    return ['leagues' => array_slice($out, 0, 60)];
}

function norm_str(string $v): string {
    $v = mb_strtolower($v, 'UTF-8');
    return str_replace(['\'', '’', '`', 'ʼ'], '', $v);
}
/** Qidiruv/jamoa indeksi: jonli + liniya + top chempionatlar o'yinlari (dam kunida ham topilsin) */
function index_games(): array {
    $games = array_merge(
        football_games('/live-matches?sport=1&lng=uz', 60),
        football_games('/line-matches?sport=1&lng=uz', 60)
    );
    $seen = [];
    foreach ($games as $g) $seen[$g['id']] = true;
    // Eng ko'p o'yinli chempionatlardan qo'shimcha qamrov (UCL, UEL va b.)
    $meta = league_meta_map();
    $champs = [];
    foreach ($meta as $id => $m) {
        if ($m['gamesCount'] < 6) continue;
        if (stripos($m['name'], 'maxsus') !== false || stripos($m['name'], 'Statistikasi') !== false || stripos($m['name'], 'Alternativ') !== false) continue;
        // Xalqaro kuboklar (UEFA/FIFA) mamlakat agregatlaridan ustun — qidiruv qamrovi uchun
        $boost = in_array($m['country'], ['Yevropa', 'Dunyo'], true) ? 1000 : 0;
        $champs[] = ['id' => $id, 'count' => $m['gamesCount'] + $boost];
    }
    usort($champs, function ($a, $b) { return $b['count'] <=> $a['count']; });
    foreach (array_slice($champs, 0, 8) as $c) {
        foreach (['line', 'live'] as $mode) {
            $data = api_data('/games-by-champ?champId=' . urlencode($c['id']) . '&mode=' . $mode . '&sportId=1&lng=uz', 300);
            if (!is_array($data)) continue;
            foreach (($data['games'] ?? []) as $g) {
                $r = match_row($g, $c['id'], $data['liga']['name'] ?? null);
                if ($r && !isset($seen[$r['id']])) { $seen[$r['id']] = true; $games[] = $r; }
            }
        }
    }
    return $games;
}
function action_search(string $q): array {
    $q = norm_str(trim($q));
    $res = ['teams' => [], 'leagues' => [], 'matches' => []];
    if ($q === '') return $res;
    $games = index_games();
    $meta = league_meta_map();
    $seenT = []; $seenL = [];
    foreach ($games as $g) {
        foreach (['home', 'away'] as $side) {
            $t = $g[$side];
            if ($t['id'] !== '' && !isset($seenT[$t['id']]) && strpos(norm_str($t['name']), $q) !== false) {
                $seenT[$t['id']] = true;
                $res['teams'][] = ['id' => $t['id'], 'name' => $t['name'], 'short' => $t['short'], 'crestUrl' => $t['crestUrl'], 'leagueName' => $g['leagueName']];
            }
        }
        if (strpos(norm_str($g['home']['name']), $q) !== false || strpos(norm_str($g['away']['name']), $q) !== false) {
            if (count($res['matches']) < 12) $res['matches'][] = $g;
        }
        $lid = $g['leagueId'];
        if (!isset($seenL[$lid]) && strpos(norm_str($g['leagueName']), $q) !== false) {
            $seenL[$lid] = true;
            $m = $meta[$lid] ?? null;
            $res['leagues'][] = ['id' => $lid, 'name' => $g['leagueName'], 'country' => $m['country'] ?? '', 'logoUrl' => $m['logoUrl'] ?? null];
        }
    }
    foreach ($meta as $id => $m) {
        if (!isset($seenL[$id]) && strpos(norm_str($m['name']), $q) !== false) {
            $seenL[$id] = true;
            $res['leagues'][] = ['id' => $id, 'name' => $m['name'], 'country' => $m['country'], 'logoUrl' => $m['logoUrl']];
        }
    }
    $res['teams'] = array_slice($res['teams'], 0, 15);
    $res['leagues'] = array_slice($res['leagues'], 0, 10);
    return $res;
}

// ---------------- Jamoa / O'yinchi ----------------
function find_team_game(string $clId): ?array {
    foreach (index_games() as $g) {
        if ($g['home']['id'] === $clId || $g['away']['id'] === $clId) return $g;
    }
    return null;
}
function team_hash_for(string $gameId, string $clId): ?string {
    $data = api_data('/head-to-head?game_id=' . urlencode($gameId) . '&sport=futbol&lng=uz', 120);
    if (!is_array($data)) return null;
    foreach (($data['teams'] ?? []) as $t) {
        if (s($t['clId'] ?? '') === $clId) return s($t['id'] ?? '');
    }
    return null;
}
function action_team(string $clId): ?array {
    $rep = find_team_game($clId);
    if (!$rep) return null;
    $isHome = $rep['home']['id'] === $clId;
    $teamObj = $isHome ? $rep['home'] : $rep['away'];
    $out = [
        'team' => $teamObj,
        'league' => ['id' => $rep['leagueId'], 'name' => $rep['leagueName']],
        'coach' => null, 'nextMatch' => null, 'recent' => [], 'squad' => [],
        'repGameId' => $rep['id'],
    ];
    if ($rep['status'] === 'scheduled') $out['nextMatch'] = $rep;
    // Murabbiy + tarkib uchun hash kerak
    $hash = team_hash_for($rep['id'], $clId);
    if ($hash) {
        $lu = fetch_lineups($rep['id'], $rep['home']['id'], $rep['away']['id']);
        if ($lu) $out['coach'] = $isHome ? ($lu['home']['coach'] ?? null) : ($lu['away']['coach'] ?? null);
        $comp = api_data('/completed-matches?team_id=' . urlencode($hash) . '&lng=uz', 120);
        if (is_array($comp) && isset($comp['response']) && is_array($comp['response'])) {
            $teams = teams_dict($comp['teams'] ?? []);
            foreach (array_slice($comp['response'], 0, 6) as $g) $out['recent'][] = team_game_row($g, $teams, $clId);
            // Murabbiy: vakil o'yin tarkibida bo'lmasa, oxirgi tugagan o'yin tarkibidan
            if (!$out['coach'] && isset($comp['response'][0]['id'])) {
                $pastId = s($comp['response'][0]['id']);
                $teamsPast = teams_dict($comp['teams'] ?? []);
                $hId = ''; $aId = '';
                foreach (['team1', 'team2'] as $ix => $tk) {
                    $cid = $teamsPast[s($comp['response'][0][$tk] ?? '')]['clId'] ?? '';
                    if ($ix === 0) $hId = $cid; else $aId = $cid;
                }
                $plu = fetch_lineups($pastId, $hId, $aId);
                if ($plu) $out['coach'] = ($hId === $clId) ? ($plu['home']['coach'] ?? null) : ($plu['away']['coach'] ?? null);
            }
        }
        $sq = api_data('/squad?team_id=' . urlencode($hash) . '&lng=uz', 300);
        if (is_array($sq) && isset($sq['players']) && is_array($sq['players'])) {
            foreach ($sq['players'] as $p) {
                $out['squad'][] = [
                    'id' => s($p['id'] ?? ''), 'name' => s($p['name'] ?? ''), 'shortName' => s($p['shortName'] ?? ''),
                    'photo' => isset($p['image']) ? stat_url($p['image']) : null, 'country' => s($p['country']['title'] ?? ''),
                ];
            }
        }
    }
    if (!$out['nextMatch']) {
        foreach (football_games('/line-matches?sport=1&lng=uz', 60) as $g) {
            if ($g['home']['id'] === $clId || $g['away']['id'] === $clId) { $out['nextMatch'] = $g; break; }
        }
    }
    return $out;
}
function action_player(string $gameId, string $playerHash): ?array {
    // fetch_lineups tomon yechimi uchun avval o'yinning o'zini topamiz
    $game = null;
    foreach (array_merge(football_games('/live-matches?sport=1&lng=uz', 60), football_games('/line-matches?sport=1&lng=uz', 60)) as $g) {
        if ($g['id'] === $gameId) { $game = $g; break; }
    }
    if (!$game) {
        $det = api_data('/match-detail?match_id=' . urlencode($gameId) . '&is_live=1&sport=1&lng=uz', 60);
        if (is_array($det) && isset($det['opponent1'])) $game = match_row($det);
    }
    if (!$game) return null;
    $lu = fetch_lineups($gameId, $game['home']['id'], $game['away']['id']);
    if (!$lu) return null;
    foreach (['home', 'away'] as $side) {
        $all = array_merge($lu[$side]['players'], $lu[$side]['subs']);
        foreach ($all as $p) {
            if ($p['id'] === $playerHash) {
                $teamObj = $side === 'home' ? $game['home'] : $game['away'];
                $h2h = fetch_h2h($gameId, $game['home']['id'], $game['away']['id']);
                return [
                    'player' => $p + ['teamId' => $teamObj['id']],
                    'team' => $teamObj,
                    'teamRecent' => $h2h ? ($side === 'home' ? $h2h['homeRecent'] : $h2h['awayRecent']) : [],
                    'gameId' => $gameId,
                ];
            }
        }
    }
    return null;
}

// ---------------- Router ----------------
date_default_timezone_set('Asia/Tashkent');
$action = s($_GET['a'] ?? 'live');
try {
    switch ($action) {
        case 'live': $out = action_live(); break;
        case 'match': $out = isset($_GET['id']) ? action_match(s($_GET['id'])) : null; break;
        case 'table': $out = isset($_GET['game_id']) ? fetch_table(s($_GET['game_id'])) : null; break;
        case 'league': $out = isset($_GET['champ']) ? action_league(s($_GET['champ'])) : null; break;
        case 'leagues': $out = action_leagues(); break;
        case 'search': $out = action_search(s($_GET['q'] ?? '')); break;
        case 'team': $out = isset($_GET['clId']) ? action_team(s($_GET['clId'])) : null; break;
        case 'player': $out = (isset($_GET['game_id'], $_GET['player'])) ? action_player(s($_GET['game_id']), s($_GET['player'])) : null; break;
        case 'health': $out = ['ok' => true, 'time' => time()]; break;
        default: http_response_code(400); $out = null; echo json_encode(['success' => false, 'message' => 'unknown action']); exit;
    }
    if ($out === null) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'not found'], JSON_UNESCAPED_UNICODE);
    } else {
        if (is_array($out)) {
            // v — kontent hashi: frontend javob o'zgarmaganini bilib, qayta render qilmaydi.
            // Vaqt maydonlari (updatedAt/time) hashga kirmaydi — ular har javobda o'zgaradi.
            $h = $out;
            unset($h['updatedAt'], $h['time']);
            $out['v'] = substr(md5(json_encode($h)), 0, 12);
        }
        echo json_encode(['success' => true, 'data' => $out], JSON_UNESCAPED_UNICODE);
        // SWR: javob mijozga ketgach, navbatdagi kesh yangilashlarni fonda bajaramiz
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
            gp_flush_refresh_queue();
        }
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'adapter error'], JSON_UNESCAPED_UNICODE);
}
