# BetGO API tahlili — GolPulse ni real ma'lumotga ulash xaritasi

**Sana:** 2026-10-29. **Usul:** faqat o'qish — Laravel routes fayli (Beget, `routes/api.php`),
React/Flutter manbalardagi chaqiruv joylari, mehmon (guest) rejimida jonli chaqiruvlar.
Production ga hech narsa yozilmadi/o'zgartirilmadi.
**Eslatma:** `php8.4 artisan route:list` hozir bootstrap xatosi beradi (app ichidagi
`AgentBalanceBook` klass topilmadi) — marshrutlar shuning uchun routes faylidan olingan.

---

## 1. Umumiy manzara

- BetGO backend (Laravel, Beget) provayder sifatida **WinWin fidini** ishlatadi:
  `ExternalSportsProvider` — asosiy fid `n4aj3uj5s3enq.com`, statistika fidi
  `kt4wza6ixmsodu.com` (`/statistic`, `/playerlogo/`, `/api/short` yo'llari bilan).
- `/api/sports/*` — **public (auth siz)**, Redis kesh ustida. Javob formati:
  `{success, data, cached, stale?, cache_age_sec?}`.
- Til parametri: `lng=uz` (yoki `uz_UZ`) — o'zbekcha nomlar keladi.
- Sport parametri ikki ko'rinishda: ro'yxatlarda `sport=1` (futbol id),
  statistika oilasida `sport=futbol` (key).
- Statistika oilasi (`game-statistics` va boshqalar) bitta naqshda ishlaydi:
  javob `{teams, sportId, subSportId, response}`; `response` ichida haqiqiy kontent.
  Qaysi bo'limlar mavjudligi **o'yinning o'z `response.menu` ro'yxatiga** bog'liq —
  menu `type` raqamlari bilan keladi (pastda to'liq xarita). Menu da yo'q bo'limga
  chaqiruv **404** qaytaradi (bu xato emas — «bu o'yinda bu ma'lumot yo'q» degani).

## 2. Endpointlar ro'yxati (50 ta, `/api/sports/` ostida)

### 2.1 Ro'yxatlar va o'yin
| Endpoint | Parametrlar | Nima beradi |
|---|---|---|
| `available-sports` | `mode=live|line, scope=home, lng` | Sport turlari + o'yinlar soni |
| `live-championships` | `sport=1, lng` | Jonli ligalar: `mainLigas[]` (id, name, countryName, countryImage, image, gamesCount) + ichida o'yinlar |
| `live-matches` | `sport=1, gr=, lng` | Jonli o'yinlar to'liq yozuvi (pastda 3-bo'lim) |
| `line-championships` / `line-matches` | `sport=1, lng` | Rejalashtirilgan (liniya) ligalar/o'yinlar — xuddi shu tuzilma |
| `games-by-champ` | `champId, mode=live|line, sportId, lng` | Bitta chempionat o'yinlari |
| `games-by-global-champ` | champ parametri | Global chempionat bo'yicha o'yinlar |
| `match-detail` | `match_id, is_live, sport, lng` | O'yin to'liq yozuvi: hisob, timer, matchInfo, statistika bayroqlari, bozorlar (GolPulse ga kerak qismi — hisob/holat/info) |
| `short-game` / `subgame-detail` / `match-result` | `game_id` va h.k. | Qisqa yozuv / taym tafsiloti / yakuniy natija |
| `home-highlights` | `lng` | Bosh sahifa tavsiya o'yinlari (id, team1/2, img1/2, score, champ) |
| `search` | `q, lng` | **O'yinlar** bo'yicha qidiruv: `{live: [...], line: [...]}` — jamoa/o'yinchi alohida yozuvlari EMAS |
| `advised-teams` | `limit` | Tavsiya etilgan jamoalar ro'yxati |
| `event-labels` | `lng` | Bozor/hodisa nomlari lug'ati (GolPulse ga kerak emas) |
| `chrono-line` | `game_id` (qo'shimcha parametrsiz 404) | Koeffitsientlar xronologiyasi — stavka funksiyasi, GolPulse ga kerak emas |

### 2.2 Statistika oilasi (hammasi `sport=futbol, lng=uz` bilan)
| Endpoint | Parametr | Nima beradi |
|---|---|---|
| `game-statistics` | `game_id` (son yoki hash — ikkalasi ham ishladi) | Asosiy statistika + `response.menu` + `stadiumId`. `gameStatistic[]`: guruhlar («Match», «1 Taym», «2 Taym») → `periodStatistic[]` {title, score1, score2} |
| `game-events` | `game_id` | Voqealar oqimi: taymlar bo'yicha `events[]` {minute, type, player(hash), assistants[], note, teamId, png/svg ikonka}. Menu type 3 bo'lgan o'yinlarda ishlaydi |
| `head-to-head` | `game_id` | To'liq H2H: winCount1/drowCount/winCount2, teamStat (gollar, kartalar), `games[]` (o'zaro tarix: score1/2, dateStart, winner), `team1Games/team2Games` (har jamoaning oxirgi o'yinlari), future games |
| `lineups` | `game_id` | Tarkiblar: `response` = 2 jamoa yozuvi {team(hash), hasPositions, lineUps[] {title («Asosiy tarkib»/zaxira), players[] {player(hash), line, position, num}}}; alohida `players[]` — {id(hash), name, shortName, country{title,image}, image(foto)} |
| `tournament-table` | `game_id` | **Turnir jadvali**: {title, logo, table{groups[] {title, table{tableTitles, qatorlar}}}} — ustunlar: #, Jamoa, O'yinlar, W, L, T, G, Pts, **Shakli (forma)** |
| `champ-tournament-table` | `champ_id` | Xuddi shu jadval chempionat bo'yicha (tekshirilgan kubok champ_id da 404 — ishonchli yo'l: `tournament-table?game_id=`) |
| `teams-menu` | `game_id` | Jamoa statistikasi menyusi (type 9) — jamoalar ro'yxati |
| `team-characteristics` | `game_id` | Jamoa xususiyatlari (type 4) |
| `teams-facts` | `game_id` | Jamoa faktlari (type 43) |
| `squad` | `team_id`(hash) | Jamoa tarkibi: `players` — raqam, yosh, o'yinlar, gollar, sariq/qizil (React kodida tasdiqlangan maydonlar) |
| `transitions` | `team_id` | Transferlar (0=All, 1=Arrived, 2=Departed) |
| `completed-matches` / `future-matches` | `team_id` | Jamoaning tugagan/kelgusi o'yinlari |
| `player-statistics` | `game_id` | O'yinchilar statistikasi (type 10) — tekshirilgan o'yinda 404 (menu da yo'q edi) |
| `top-players` | `game_id` | Top o'yinchilar (type 40) — tekshiruvda 404 |
| `rating-table` | `game_id, rec_limit, start_rec` | Reyting jadvali (type 13) — tekshiruvda 404 |
| `heat-map` | `game_id` | Issiqlik xaritasi (type 38) — tekshiruvda 404 |
| `player-menu` | `game_id` | O'yinchi menyusi |
| `match-prediction` | `game_id` | Prognoz (type 42) — stavka/yo'nalish kontenti, GolPulse MVP siga kerak emas |
| `text-broadcast` | `game_id` | Matn translyatsiyasi (type 6): daqiqa + matn + muhimlik belgisi. Tekshirilgan jonli o'yinda bo'sh ro'yxat qaytdi |
| `stage-net` | `game_id` | Pley-off tori (type 7) |
| `chess-table` | `game_id` | «Shaxmatka» jadvali (type 44) |
| `champ-menu` | `game_id` | Chempionat statistikasi menyusi (type 11) |
| `champ-last-games` / `champ-future-games` | `game_id` | Chempionatning oxirgi/kelgusi o'yinlari (type 33/34) |
| `stadium` | `stadium_id, sport` | Stadion ma'lumoti (id `game-statistics.response.stadiumId` dan) |
| `referee-card` | `game_id` | Hakam kartochkasi (type 47) |
| `news` | `game_id` | O'yinga oid yangiliklar (type 45) |
| `video-stream` (POST) / `video-proxy` | `video_id` / `u` | Jonli video oqim — GolPulse ga kerak emas (huquq masalasi ham) |

### 2.3 Natijalar oilasi (tugagan o'yinlar)
| Endpoint | Parametrlar | Holat |
|---|---|---|
| `result-sports` | `dateFrom, dateTo` (**Unix soniya!**), `lng` | Ishlaydi |
| `result-champs` | `sportIds, dateFrom, dateTo, lng` | Ishlaydi: 24 soat oynada 153 chempionat (country → subChamps: id, name, image, countEvent) |
| `result-games` | `champIds, dateFrom, dateTo, lng` | Tekshiruvlarda (bir nechta champ, 24s–7kun oyna) **bo'sh `[]` qaytdi** — kesh bo'sh bo'lishi mumkin; adapterda ehtiyot bo'lish kerak |
| `result-game` | `gameId, champId, sportId, dateFrom, dateTo` | Bitta tugagan o'yin yozuvi (default oyna 7 kun) |

---

## 3. Jonli o'yin yozuvi — maydonlar (live-matches / match-detail)

Bitta yozuvda GolPulse uchun kerakli deyarli hammasi bor:

- `id, mainGameId, startTs, periodName, gameTypeName, countryId`
- `liga {id, name}`, `sport {id, name, nameEng}`
- `opponent1/opponent2 {fullName, countryId, opps[] {id, name, image}}` —
  **gerb**: `image` = `/sfiles/logo_teams/<hash>.png` (provayder yo'li; 5-bo'limga qarang)
- `scores {fullScore, scoreOpp1, scoreOpp2, periodScores[], currentPeriod,
  currentPeriodName, timer {timeSec, timeRun}, statusLineStr («9 daqiqa o'tdi»)}` —
  jonli daqiqa `timer.timeSec` dan hisoblanadi
- `scores.tabloStats` — tezkor statistika juftliklari {id, name, s1, s2}:
  Hujumlar, Havfli hujumlar, To'pga egalik %, Darvozaga aniq zarbalar (ro'yxatda ham keladi!)
- `matchInfoObj {tournamentStage, location (stadion), locationCity, stadiumId,
  havo ma'lumoti}` — stadion/hakam bloki uchun (hakam alohida `referee-card` da)
- `statisticInfo {gameId(hash), stageId, hasLineUps, hasStadiumInfo}` — statistika
  chaqiruvlari uchun kalitlar
- `hasHeadToHead: bool`, `hasGraph: true` (bayroq — pastda momentum izohi)
- `video {enabled, id}` — GolPulse ishlatmaydi
- `eventGroups` — **bozorlar/koeffitsientlar** (stavka). GolPulse bukmeker EMAS —
  adapter bu blokni tashlab yuborishi shart.
- Yangilanish: javobda `cached: true, cache_age_sec: 0, stale: false` (tekshiruv paytida);
  backend keshini scheduler yangilab turadi — amaliy kechikish soniyalar tartibida.

### Statistika chuqurligi (game-statistics) — liga darajasiga bog'liq
- Kichik liga o'yini (Rossiya kubogi): 8 ko'rsatkich — egalik %, jami zarbalar, aniq
  zarbalar, burchaklar, noaniq zarbalar, jarima zarbalari, to'p tashlashlar, follar.
- Boy o'yin (Misr Premier, Daniya kubogi): **33 ko'rsatkich** — shu jumladan
  **xG («Kutilayotgan gollar (xG)»)**, xGOT, xA, Big Chances, aniq zarbalar, burchaklar,
  ofsaydlar, seyvlari, «Goals prevented» va boshqalar — davrlar bo'yicha (Match/1T/2T).
- Xulosa: GolPulse statistika tabi fid bilan to'liq to'ladi; xG **bor, lekin hamma
  o'yinda emas** — UI da «mavjud bo'lsa ko'rsat» mantig'i kerak.

### Voqealar (game-events)
- Tuzilma: `[{title: «1 Taym», events: [{minute: "13'", type, player(hash),
  assistants[], note: "Yellow card - Foul", teamId(hash), png/svg}]}]`.
- O'yinchi ismi hash orqali boshqa javoblardagi `players[]` ro'yxatidan yechiladi —
  adapter vazifasi. Gol/karta/almashtirish turlari `type` + `note` matnidan aniqlanadi.
- Mavjudligi menu type 3 ga bog'liq; type 3 yo'q o'yinda 404. Matn translyatsiyasi
  (type 6, `text-broadcast`) muqobil oqim sifatida bor.

### Tarkiblar (lineups)
- `hasPositions: true` bo'lsa har o'yinchida `line` (maydon qatori) va `position`
  (qatordagi o'rni) bor — **maydon sxemasi chiziladi**.
- Alohida formation yozuvi («4-1-4-1») **yo'q** — sxemani adapter qatorlardagi
  o'yinchilar sonidan hisoblab chiqaradi (standart amaliyot).
- O'yinchi: ism, qisqa ism, mamlakat, **foto** (statistika fididagi rasm yo'li), raqam.
- **Lekin:** tarkib yozuvida o'yinchi **reytingi yo'q** (faqat line/position/num).

## 4. CORS — to'g'ridan-to'g'ri ulanish YO'Q

- Tekshiruv: `Origin: https://azizbek-web-dev.github.io` bilan GET va OPTIONS —
  javobda **`Access-Control-Allow-Origin` yo'q** (OPTIONS 204, faqat `Vary: Origin...`).
- Demak, GitHub Pages dagi GolPulse brauzeri betgo.site API ni **to'g'ridan-to'g'ri
  chaqira olmaydi** — oraliq qatlam majburiy (6-bo'lim).

## 5. Rasmlar (gerb/logotip/foto)

- API javoblarida rasm yo'llari provayderga nisbiy: `/sfiles/logo_teams/...`,
  `sfiles/logo-champ/...` (liga), o'yinchi fotolari statistika fidida.
- betgo.site da `/api/images/proxy` (public) ham bor — tashqi rasmlarni proksi qilish uchun.
- GolPulse hozir 20 ta gerbni self-host qiladi; real fid **barcha** jamoalarga gerb
  beradi — qamrov ancha kengayadi. Oraliq qatlam rasm yo'llarini to'liq URL ga
  aylantirib berishi kerak (yoki o'zi proksi qiladi).

## 6. Tavsiya etilgan arxitektura — oraliq qatlam (BFF/adapter)

To'g'ridan API emas, **kichik oraliq xizmat** tavsiya etiladi. Sabablari: CORS yo'q;
javoblar stavka-bozorlari bilan shishgan; hash-id larni (o'yinchi/jamoa) ismlarga
yechish kerak; format GolPulse tiplaridan (`app/src/data/types.ts`) farq qiladi.

Adapter vazifalari:
1. CORS qo'shish (faqat GolPulse origin iga).
2. `eventGroups`/bozorlarni tashlash — GolPulse ga faqat hisob/statistika boradi.
3. Provayder formatini GolPulse tiplariga o'girish (bitta ichki format — REJA 5-bo'limdagi tamoyil).
4. Kesh: jonli ro'yxat 5–10 s, statistika/tarkib 15–30 s, jadval 60 s.
5. Hash yechish: `players[]/teams[]` lug'atini javobning o'zidan qurish.
6. Rasm URL larini to'liq qilish/proksi.
7. Joylashuv: Beget dagi alohida kichik endpoint yoki VM/Beget da yengil servis —
  frontend (GitHub Pages) statik qoladi.

## 7. XARITA — GolPulse sahifa/blok → manba

| GolPulse bloki | Manba | Holat |
|---|---|---|
| Jonli ro'yxat (liga guruhlari, hisob, daqiqa) | `live-matches`, `live-championships` | ✅ To'liq (daqiqa = `scores.timer.timeSec`) |
| Filtrlar: Tugagan / Rejalashtirilgan | `result-*` oilasi / `line-matches`, `line-championships` | ✅ Bor (result-games tekshiruvda bo'sh — ehtiyot) |
| Sana/kalendar navigatsiyasi | `line-*` (kelgusi), `result-*` (o'tgan, Unix sana) | ✅ Bor |
| O'yin hisob taxtasi (stadion, bosqich) | `match-detail` (`matchInfoObj/Detail`) | ✅ To'liq |
| Voqealar oqimi (gol/karta/almashtirish) | `game-events` (menu type 3) + `text-broadcast` zaxira | ✅ Bor, lekin hamma o'yinda emas (404 = yo'q) |
| Momentum grafigi | — | ❌ **Yo'q.** `hasGraph: true` bayrog'i bor, lekin vaqt qatori (time-series) hech qayerda topilmadi. UI dagi grafik mock bo'lib qoladi yoki olib tashlanadi |
| Statistika (ikki tomonlama barlar) | `game-statistics` | ✅ To'liq; chuqurlik ligaga bog'liq (8–33 ko'rsatkich) |
| xG | `game-statistics` ichida | 🔶 Qisman — boy o'yinlarda bor, kichik ligalarda yo'q |
| Tarkiblar ro'yxati (asosiy/zaxira) | `lineups` | ✅ To'liq |
| Maydon sxemasi (pitch) | `lineups` (`line/position`, `hasPositions`) | ✅ Chiziladi; formation yozuvi hisoblab chiqariladi |
| O'yinchi reytingi (balon) | `rating-table`/`top-players`/`player-statistics` endpointlari bor | 🔶 **Kafolatlanmagan.** Tekshirilgan o'yinlarda 404 (menu da tegishli type yo'q edi); tarkiblarda reyting maydoni yo'q. Musbat holat audit paytida topilmadi — UI balonlari real fidda har o'yinda chiqmasligi mumkin, «namuna» rejimi kerak bo'lishi ehtimoli yuqori |
| H2H (hisob 3/3/4, tarix, oxirgi o'yinlar) | `head-to-head` | ✅ To'liq (winCount/drowCount, games[], teamGames) |
| Liga sahifasi (o'yinlar/natijalar) | `games-by-champ`, `champ-last/future-games` | ✅ Bor |
| Turnir jadvali (zona, forma) | `tournament-table?game_id=` | ✅ To'liq — ustunlar + «Shakli» (forma) ham bor |
| Jamoa sahifasi (stadion, tarkib, o'yinlar) | `stadium`, `squad`, `completed/future-matches`, `teams-menu` | ✅ Bor (stadion id statistika javobidan) |
| O'yinchi sahifasi (bio) | `lineups.players` (ism, foto, mamlakat), `player-menu` | 🔶 Qisman: ism/foto/pozitsiya bor; **bozor qiymati va shartnoma muddati fidda yo'q** — mock qoladi |
| O'yinchi oxirgi o'yinlari (W/D/L) | `head-to-head.team1Games`, `completed-matches` dan yig'iladi | 🔶 Qisman — adapter jamoa o'yinlaridan hisoblaydi |
| Qidiruv | `search` | 🔶 Qisman: faqat **o'yinlar** topiladi; GolPulse dagi Jamoalar/O'yinchilar/Ligalar guruhlari uchun adapter jonli/line ro'yxatlaridan indeks qurishi kerak |
| Sevimlilar | Frontend state (hozirgidek) | ✅ API kerak emas; kuzatuv ro'yxati lokal saqlanadi |
| Heatmap / Shotmap | `heat-map` endpointi bor | 🔶 Tekshiruvda 404; shotmap alohida topilmadi — 3-bosqich «namuna» bo'lib qoladi |
| Prognoz (`match-prediction`) | Bor | — GolPulse MVP siga kiritilmaydi (stavka ruhidagi kontent) |
| Video oqim | `video-stream` | — Ishlatilmaydi |

## 8. Xulosa

- **To'ladigan qism katta:** ro'yxat, hisob/daqiqa, voqealar, statistika (xG bilan),
  tarkiblar + maydon sxemasi, H2H, jadval (forma bilan), liga/jamoa sahifalari —
  bularning barchasi mavjud fidda bor va public API orqali olinadi.
- **Yo'q/kuchli ehtimol bilan yo'q:** momentum vaqt qatori; o'yinchi reytingi
  (endpointlar bor, lekin tekshirilgan o'yinlarda ma'lumot qaytmadi); bozor qiymati/
  shartnoma; shotmap.
- **Texnik shart:** CORS sababli oraliq adapter qatlami majburiy — u bir yo'la
  bozorlarni kesadi, formatni GolPulse tiplariga o'giradi va hash id larni yechadi.
- Keyingi amaliy qadam: adapter spetsifikatsiyasi (endpointma-endpoint mapping) +
  bitta jonli o'yin ustida uchidan-uchiga sinov (ro'yxat → o'yin → statistika/tarkib).
