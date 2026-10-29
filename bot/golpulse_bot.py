#!/usr/bin/env python3
"""GolPulse bot — Telegram Mini App (WebApp) ishga tushirgichi.

Long polling, faqat stdlib (urllib). Token ~/workspace/golpulse/.env dan
o'qiladi va HECH QACHON logga yozilmaydi.
Chiqish proksi env orqali: https_proxy=http://hatch-egress-proxy:3128
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")
WEBAPP_URL = os.environ.get("GOLPULSE_WEBAPP_URL", "https://azizbek-web-dev.github.io/golpulse/")
API_ROOT = "https://api.telegram.org/bot"


def load_token() -> str:
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("BOT_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("BOT_TOKEN .env da topilmadi")


TOKEN = load_token()


def _sanitize(text: str) -> str:
    return text.replace(TOKEN, "***") if TOKEN else text


def api(method: str, payload: dict | None = None, timeout: int = 30):
    url = API_ROOT + TOKEN + "/" + method
    data = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    # Proksi env (http_proxy/https_proxy) urllib tomonidan avtomatik olinadi
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"API {method} HTTP {e.code}: {_sanitize(body)}") from None
    except Exception as e:
        raise RuntimeError(f"API {method}: {_sanitize(str(e))}") from None


def setup_bot() -> None:
    api("setMyCommands", {"commands": [
        {"command": "start", "description": "Ilovani ochish"},
    ]})
    api("setMyShortDescription", {
        "short_description": "GolPulse — jonli hisob va statistika: o'yinlar, statistika, tarkiblar va jadvallar bir joyda.",
    })
    api("setMyDescription", {
        "description": (
            "GolPulse — futbol jonli hisob va statistika ilovasi.\n"
            "⚽ Jonli o'yinlar va natijalar\n"
            "📊 Statistika, tarkiblar, H2H\n"
            "🏆 Ligalar va turnir jadvallari\n\n"
            "Ilovani ochish uchun /start bosing."
        ),
    })
    api("setChatMenuButton", {"menu_button": {
        "type": "web_app",
        "text": "⚽ GolPulse",
        "web_app": {"url": WEBAPP_URL},
    }})
    print("[golpulse] bot sozlamalari qo'llandi (commands, description, menu button)", flush=True)


def handle_start(chat_id: int, first_name: str = "") -> None:
    text = (
        f"Salom{', ' + first_name if first_name else ''}! 👋\n\n"
        "<b>GolPulse</b> — jonli hisob va statistika.\n"
        "O'yinlar, statistika, tarkiblar va jadvallar — barchasi bir joyda.\n\n"
        "Ilovani ochish uchun tugmani bosing 👇"
    )
    api("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": {"inline_keyboard": [[
            {"text": "⚽ Ilovani ochish", "web_app": {"url": WEBAPP_URL}},
        ]]},
    })


def main() -> None:
    me = api("getMe")
    username = me.get("result", {}).get("username", "?")
    print(f"[golpulse] bot ishga tushdi: @{username}; webapp: {WEBAPP_URL}", flush=True)
    try:
        setup_bot()
    except Exception as e:
        print(f"[golpulse] setup xatosi: {e}", file=sys.stderr, flush=True)

    offset = 0
    while True:
        try:
            res = api("getUpdates", {"offset": offset, "timeout": 50,
                                     "allowed_updates": ["message"]}, timeout=60)
            for upd in res.get("result", []):
                offset = upd["update_id"] + 1
                msg = upd.get("message") or {}
                text = (msg.get("text") or "").strip()
                chat_id = (msg.get("chat") or {}).get("id")
                if chat_id is None:
                    continue
                if text.startswith("/start"):
                    first = (msg.get("from") or {}).get("first_name", "")
                    try:
                        handle_start(chat_id, first)
                    except Exception as e:
                        print(f"[golpulse] sendMessage xatosi: {e}", file=sys.stderr, flush=True)
                elif text:
                    try:
                        handle_start(chat_id, (msg.get("from") or {}).get("first_name", ""))
                    except Exception as e:
                        print(f"[golpulse] sendMessage xatosi: {e}", file=sys.stderr, flush=True)
        except Exception as e:
            print(f"[golpulse] polling xatosi: {e}", file=sys.stderr, flush=True)
            time.sleep(5)


if __name__ == "__main__":
    main()
