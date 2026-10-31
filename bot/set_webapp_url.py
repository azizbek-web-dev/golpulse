#!/usr/bin/env python3
"""GolPulse WebApp URL versiyasini jonli bundle hash bilan sinxronlaydi.

Telegram WebView Mini App sahifasini qattiq keshlaydi — shuning uchun bot
URL iga ?v=<bundle-hash> qo'shiladi (Quizer precedentsi). Skript jonli
index.html dan bundle hashini o'qib, systemd unit dagi GOLPULSE_WEBAPP_URL
bilan solishtiradi; farq bo'lsa — unit nusxalarini yangilab, botni restart
qiladi (menyu tugmasi va /start tugmasi yangi URL oladi).

systemd timer (golpulse-webapp-url.timer) har 10 daqiqada chaqiradi.
"""
import re
import subprocess
import sys
import urllib.request

PAGES_URL = "https://azizbek-web-dev.github.io/golpulse/"
UNIT_PATHS = [
    "/etc/systemd/system/golpulse-bot.service",
    "/home/hatch/workspace/golpulse/bot/golpulse-bot.service",
]
ENV_KEY = "GOLPULSE_WEBAPP_URL="


def _hash_from_html(html: str) -> str:
    m = re.search(r"index-([A-Za-z0-9_-]+)\.js", html)
    if not m:
        raise RuntimeError("bundle hash topilmadi")
    return m.group(1)


def _fetch_urllib() -> str:
    req = urllib.request.Request(PAGES_URL, headers={"Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", "replace")


def _fetch_curl() -> str:
    # Oxirgi chora: curl (hatch-egress-proxy orqali, aniq -x bilan)
    out = subprocess.run(
        [
            "curl", "-fsS", "--max-time", "25",
            "-H", "Cache-Control: no-cache",
            "-x", "http://hatch-egress-proxy:3128",
            PAGES_URL,
        ],
        check=True, capture_output=True, text=True, timeout=40,
    )
    return out.stdout


def live_hash() -> str:
    # Proksi vaqti-vaqti bilan uziladi/timeout beradi (2026-10-31 11:43-11:46
    # oynasida bot ham, shu servis ham bir vaqtda yiqilgan — egress uzilishi).
    # Shuning uchun: urllib x2 -> curl fallback -> urllib yana bir marta.
    import time as _time

    last = None
    for fetch in (_fetch_urllib, _fetch_urllib, _fetch_curl, _fetch_urllib):
        try:
            return _hash_from_html(fetch())
        except Exception as e:  # noqa: BLE001
            last = e
            _time.sleep(4)
    raise RuntimeError(f"jonli sahifa olinmadi: {last}")


def current_url() -> str:
    with open(UNIT_PATHS[0], encoding="utf-8") as f:
        for line in f:
            if ENV_KEY in line:
                return line.split(ENV_KEY, 1)[1].strip()
    return ""


def main() -> int:
    want = f"{PAGES_URL}?v={live_hash()}"
    cur = current_url()
    if cur == want:
        print(f"[webapp-url] o'zgarish yo'q: {want}")
        return 0
    for path in UNIT_PATHS:
        with open(path, encoding="utf-8") as f:
            text = f.read()
        text = re.sub(r"(GOLPULSE_WEBAPP_URL=)\S+", r"\g<1>" + want, text)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    subprocess.run(["systemctl", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "restart", "golpulse-bot.service"], check=True)
    print(f"[webapp-url] yangilandi: {cur} -> {want}; bot restart qilindi")
    return 0


if __name__ == "__main__":
    sys.exit(main())
