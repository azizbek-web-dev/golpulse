#!/usr/bin/env python3
"""GolPulse kuzatuv watcheri — qo'ng'iroqcha obunalari bo'yicha bot xabarlari.

Har ~30 soniyada:
  1) adapter watchdata dan faol obunalarni oladi;
  2) tasdiqlanmagan obunalarga «Kuzatuv yoqildi» xabarini yuboradi
     (botni start qilmagan foydalanuvchi — deliverable=false belgilanadi,
     frontend shu orqali «/start bosing» eslatmasini ko'rsatadi);
  3) har o'yin holatini adapter a=match dan olib, lokal state bilan
     solishtiradi: start, gol (penaltidan bo'lsa — penalti xabari bilan),
     penalti (o'tkazib yuborilgan), qizil kartochka, tanaffus (HT), final (FT);
  4) FT dan keyin obuna avtomatik yopiladi (adapter unsub).

Faqat stdlib. Token .env dan (hech qachon logga yozilmaydi), watch kaliti
watcher-config.json dan. Holat notify-state.json da — restart da ham
takroriy xabar bo'lmaydi.

Rejimlar: --once (bitta sikl), --dry-run (xabar yubormay, log yozadi).
"""
import html
import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")
CONFIG_PATH = os.path.join(BASE_DIR, "watcher-config.json")
STATE_PATH = os.path.join(BASE_DIR, "notify-state.json")
API_BASE = "https://betgo.site/gp-api/"
TG_ROOT = "https://api.telegram.org/bot"
DRY = "--dry-run" in sys.argv
ONCE = "--once" in sys.argv


def load_env() -> dict:
    out = {}
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip()
    return out


ENV = load_env()
TOKEN = ENV.get("BOT_TOKEN", "")
BOT_USERNAME = ENV.get("BOT_USERNAME", "golpulse_bot")
with open(CONFIG_PATH, encoding="utf-8") as f:
    CONFIG = json.load(f)
WATCH_KEY = CONFIG.get("watch_key", "")
POLL_SEC = int(CONFIG.get("poll_seconds", 30))
RETRY_DELIVERABLE_SEC = 600  # deliverable=false larni qayta tekshirish oralig'i


def esc(v) -> str:
    """Telegram HTML uchun escape (matn ichida — qo'shtirnoqlar tegmaydi)."""
    return html.escape(str(v), quote=False)


def log(msg: str) -> None:
    print(f"[notify] {time.strftime('%H:%M:%S')} {msg}", flush=True)


def _sanitize(text: str) -> str:
    return text.replace(TOKEN, "***") if TOKEN else text


class TgError(Exception):
    def __init__(self, desc: str, code: int = 0):
        super().__init__(desc)
        self.desc = desc
        self.code = code


def tg(method: str, payload: dict, timeout: int = 25):
    url = TG_ROOT + TOKEN + "/" + method
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        desc = body
        try:
            desc = json.loads(body).get("description", body)
        except Exception:  # noqa: BLE001
            pass
        raise TgError(_sanitize(desc)[:200], e.code) from None


def adapter_get(action: str, params: str = ""):
    url = f"{API_BASE}?a={action}" + (f"&{params}" if params else "")
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        v = json.loads(resp.read().decode("utf-8"))
    if not v.get("success"):
        raise RuntimeError(f"adapter {action}: {v.get('message')}")
    return v.get("data") or {}


def adapter_post(action: str, body: dict):
    url = f"{API_BASE}?a={action}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        v = json.loads(resp.read().decode("utf-8"))
    if not v.get("success"):
        raise RuntimeError(f"adapter {action}: {v.get('message')}")
    return v.get("data") or {}


# ---------------- Holat ----------------
def load_state() -> dict:
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            v = json.load(f)
        if isinstance(v, dict) and isinstance(v.get("matches"), dict):
            return v
    except Exception:  # noqa: BLE001
        pass
    return {"matches": {}}


def save_state(state: dict) -> None:
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)
    os.replace(tmp, STATE_PATH)


# ---------------- Yuborish ----------------
UNDELIVERABLE_HINTS = ("initiate conversation", "chat not found", "bot was blocked",
                       "user is deactivated", "bot can't initiate")


def send(user_id: str, text: str, match_id: str) -> bool:
    """Bitta foydalanuvchiga xabar. True — yetkazildi (yoki dry-run).
    Yetkazib bo'lmaydigan foydalanuvchini substate da belgilaydi."""
    if DRY:
        log(f"[DRY] uid={user_id} match={match_id}: {text}")
        return True
    payload = {
        "chat_id": int(user_id),
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": {"inline_keyboard": [[
            {"text": "⚽ O'yinni ochish", "url": f"https://t.me/{BOT_USERNAME}?startapp=match_{match_id}"},
        ]]},
    }
    try:
        tg("sendMessage", payload)
        return True
    except TgError as e:
        if any(h in e.desc.lower() for h in UNDELIVERABLE_HINTS):
            log(f"uid={user_id}: yetkazib bo'lmaydi ({e.desc}) — deliverable=false")
            try:
                adapter_post("substate", {"key": WATCH_KEY, "match_id": match_id,
                                          "user_id": user_id, "deliverable": False,
                                          "lastTry": int(time.time())})
            except Exception as ex:  # noqa: BLE001
                log(f"substate xato: {ex}")
            return False
        log(f"sendMessage uid={user_id} xato: {e.desc}")
        return False
    except Exception as e:  # noqa: BLE001
        log(f"sendMessage uid={user_id} tarmoq xato: {_sanitize(str(e))}")
        return False


def notify_all(users: dict, text: str, match_id: str) -> None:
    for uid, u in users.items():
        if (u or {}).get("deliverable") is False:
            continue  # botni start qilmagani aniq — behuda urinmaymiz
        send(uid, text, match_id)


# ---------------- Tasdiq xabarlari ----------------
def handle_confirmations(matches: dict) -> None:
    now = int(time.time())
    for match_id, rec in matches.items():
        meta = rec.get("meta") or {}
        title = f"{meta.get('home', '?')} — {meta.get('away', '?')}"
        text = (f"🔔 Kuzatuv yoqildi: <b>{esc(title)}</b>. "
                "Gol, tanaffus, qizil kartochka, penalti va final haqida yozaman.")
        for uid, u in (rec.get("users") or {}).items():
            u = u or {}
            need = (not u.get("confirmed")) or (
                u.get("deliverable") is False and now - int(u.get("lastTry") or 0) >= RETRY_DELIVERABLE_SEC)
            if not need:
                continue
            if DRY:
                log(f"[DRY] tasdiq uid={uid} match={match_id}: {title}")
                continue
            ok = send(uid, text, match_id)
            state_body = {"key": WATCH_KEY, "match_id": match_id, "user_id": uid,
                          "confirmed": True, "lastTry": now, "deliverable": ok}
            try:
                adapter_post("substate", state_body)
                u["confirmed"] = True
                u["deliverable"] = ok
                u["lastTry"] = now
            except Exception as e:  # noqa: BLE001
                log(f"substate (tasdiq) xato: {e}")


# ---------------- Hodisalar ----------------
def ev_key(e: dict) -> str:
    return "|".join([str(e.get("period", "")), str(e.get("type", "")), str(e.get("teamId", "")),
                     str(e.get("player", "")), str(e.get("minuteLabel", ""))])


def snapshot(bundle: dict, meta: dict) -> dict:
    m = bundle.get("match") or {}
    home = m.get("home") or {}
    away = m.get("away") or {}
    return {
        "status": m.get("status", "scheduled"),
        "homeScore": m.get("homeScore"),
        "awayScore": m.get("awayScore"),
        "htHome": m.get("htHome"),
        "htAway": m.get("htAway"),
        "home": home.get("name") or meta.get("home", "?"),
        "away": away.get("name") or meta.get("away", "?"),
        "homeId": home.get("id", ""),
        "awayId": away.get("id", ""),
        "league": m.get("leagueName") or meta.get("league", ""),
        "events": [ev_key(e) for e in (bundle.get("events") or [])],
        "htSent": False,
    }


def pair(s: dict) -> str:
    return f"<b>{esc(str(s['home']))}</b> {s['homeScore']}–{s['awayScore']} <b>{esc(str(s['away']))}</b>"


def detect_events(old: dict, cur: dict, bundle: dict, users: dict, match_id: str) -> bool:
    """old → cur o'tishidagi hodisalarni yuboradi; cur ni joyida yangilaydi (htSent).
    Qaytaradi: o'yin shu siklda tugadimi (FT)."""
    events = bundle.get("events") or []
    old_keys = set(old.get("events") or [])
    new_events = [e for e in events if ev_key(e) not in old_keys]
    new_events.sort(key=lambda e: (int(e.get("minute") or 0), str(e.get("minuteLabel", ""))))
    msgs: list[str] = []

    def team_name(e: dict) -> str:
        if e.get("teamId") and e.get("teamId") == cur.get("homeId"):
            return str(cur["home"])
        if e.get("teamId") and e.get("teamId") == cur.get("awayId"):
            return str(cur["away"])
        return str(cur["home"])

    # 1) Start
    if old["status"] == "scheduled" and cur["status"] in ("live", "halftime"):
        msgs.append(f"🔔 O'yin boshlandi: <b>{esc(str(cur['home']))}</b> — "
                    f"<b>{esc(str(cur['away']))}</b> ({esc(str(cur['league']))})")

    # Yangi voqealardan penalti-gol (gol xabari bilan birlashtiriladi)
    pen_goal = next((e for e in new_events if e.get("type") == "pen-goal"), None)
    goal_ev = next((e for e in new_events if e.get("type") == "goal"), None)

    # 2) Gol (hisob o'zgarishi) — muallif yangi gol voqeasidan
    if (old["homeScore"], old["awayScore"]) != (cur["homeScore"], cur["awayScore"]) \
            and cur["status"] in ("live", "halftime", "finished"):
        ev = pen_goal or goal_ev
        suffix = ""
        if ev and ev.get("player"):
            suffix = f" — {esc(str(ev['player']))}"
        if ev and ev.get("minuteLabel"):
            suffix += f" ({esc(str(ev['minuteLabel']))})"
        if pen_goal:
            msgs.append(f"🎯 Penalti — GOL! {pair(cur)}{suffix}")
        else:
            msgs.append(f"⚽ GOL! {pair(cur)}{suffix}")
    elif pen_goal is not None:
        # Hisob o'zgarishi boshqa siklda ko'rilgan, penalti voqeasi endi keldi
        p = f" — {esc(str(pen_goal['player']))}" if pen_goal.get("player") else ""
        msgs.append(f"🎯 Penalti — GOL! {pair(cur)}{p} ({esc(str(pen_goal.get('minuteLabel', '')))})")

    # 3) Penalti — o'tkazib yuborildi
    for e in new_events:
        if e.get("type") == "chance" and "Penalti" in str(e.get("note", "")):
            p = f": {esc(str(e['player']))}" if e.get("player") else ""
            msgs.append(f"🎯 Penalti — o'tkazib yuborildi{p}, {esc(team_name(e))} "
                        f"({esc(str(e.get('minuteLabel', '')))})")

    # 4) Qizil kartochka
    for e in new_events:
        if e.get("type") == "red":
            p = f" — {esc(str(e['player']))}" if e.get("player") else ""
            msgs.append(f"🟥 Qizil kartochka: {esc(team_name(e))}{p} "
                        f"({esc(str(e.get('minuteLabel', '')))})")

    # 5) Tanaffus (HT): status o'tishi yoki ht hisobi paydo bo'lishi (o'tish o'tkazib yuborilgan bo'lsa ham)
    ht_now = cur.get("htHome") is not None
    if not old.get("htSent") and old["status"] in ("live", "halftime"):
        if cur["status"] == "halftime" or (old.get("htHome") is None and ht_now and cur["status"] == "live"):
            msgs.append(f"⏸ Tanaffus: {pair(cur)}")
            cur["htSent"] = True

    # 6) Final (FT)
    finished = cur["status"] == "finished" and old["status"] != "finished"
    if finished:
        msgs.append(f"🏁 O'yin tugadi: {pair(cur)}")

    for text in msgs:
        notify_all(users, text, match_id)
    return finished


# ---------------- Sikl ----------------
def cycle(state: dict) -> None:
    # watchdata GET — kalit query da
    try:
        wd = adapter_get("watchdata", "key=" + urllib.parse.quote(WATCH_KEY))
    except Exception as e:  # noqa: BLE001
        log(f"watchdata xato: {e}")
        return
    matches = wd.get("matches") or {}

    handle_confirmations(matches)

    snaps = state["matches"]
    # Watcher endi kuzatmaydigan (obuna qolmagan) matchlar state dan tozalanadi
    for mid in list(snaps.keys()):
        if mid not in matches:
            del snaps[mid]

    for match_id, rec in matches.items():
        users = rec.get("users") or {}
        meta = rec.get("meta") or {}
        if not users:
            continue
        try:
            bundle = adapter_get("match", "id=" + urllib.parse.quote(match_id))
        except Exception as e:  # noqa: BLE001
            log(f"match {match_id} olishda xato: {e}")
            continue
        if not bundle or not bundle.get("match"):
            continue
        cur = snapshot(bundle, meta)
        old = snaps.get(match_id)
        if old is None:
            # Birinchi ko'rinish: hodisasiz snapshot. Agar o'yin allaqachon tugagan
            # bo'lsa — obuna ma'nosiz, darhol yopiladi (xabarsiz).
            snaps[match_id] = cur
            if cur["status"] == "finished":
                log(f"match {match_id}: birinchi ko'rinishda tugagan — obunalar yopiladi")
                for uid in users:
                    if not DRY:
                        try:
                            adapter_post("unsub", {"key": WATCH_KEY, "match_id": match_id, "user_id": uid})
                        except Exception as e:  # noqa: BLE001
                            log(f"unsub xato: {e}")
                del snaps[match_id]
            continue
        # htSent ni eski holatdan saqlab qolish (cur yangi — flag unda False)
        cur["htSent"] = bool(old.get("htSent"))
        finished = detect_events(old, cur, bundle, users, match_id)
        snaps[match_id] = cur
        if finished:
            log(f"match {match_id}: FT — obunalar yopiladi")
            for uid in users:
                if not DRY:
                    try:
                        adapter_post("unsub", {"key": WATCH_KEY, "match_id": match_id, "user_id": uid})
                    except Exception as e:  # noqa: BLE001
                        log(f"unsub xato: {e}")
            del snaps[match_id]


def main() -> None:
    if not TOKEN or not WATCH_KEY:
        raise RuntimeError("TOKEN yoki WATCH_KEY topilmadi (.env / watcher-config.json)")
    log(f"watcher ishga tushdi (poll={POLL_SEC}s, dry={DRY}, once={ONCE})")
    state = load_state()
    while True:
        try:
            cycle(state)
            save_state(state)
        except Exception as e:  # noqa: BLE001
            log(f"sikl xato: {_sanitize(str(e))}")
        if ONCE:
            break
        time.sleep(POLL_SEC)


if __name__ == "__main__":
    main()
