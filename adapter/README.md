# GolPulse BFF adapter

- Jonli manzil: https://betgo.site/gp-api/ (Beget: `~/betgo.site/public_html/gp-api/index.php`, cache/ — 777)
- Yangilash: shu faylni tahrirlab, serverga scp -> serverda `cp` bilan joyiga (ACL qoidasi), `php8.4 -l` tekshiruv.
- Endpointlar: `?a=health|live|match&id=|table&game_id=|league&champ=|leagues|search&q=|team&clId=|player&game_id=&player=`
- `?a=day&date=YYYY-MM-DD` — sana tanlash (Asia/Tashkent kuni), real oraliq **-14..+7 kun**: bugun = `a=live` javobi + `date`/`kind`; o'tgan kun = natijalar (result-champs/games, kun keshi 15 daq); kelgusi kun = liniya kunga kesilgan (line-matches + isTop/avval katta chempionatlar games-by-champ, kun keshi 5 daq; virtual/esoccer va «Mezbonlar» maxsus bozorlari kesiladi). Javob shakli LiveData bilan bir xil + `date`, `kind` (today/past/future). `a=match` ga `&date=` ishorasi o'tgan kun o'yinini kun ro'yxatidan topadi.
- CORS: faqat https://azizbek-web-dev.github.io
- Stavka bozorlari chaqirilmaydi ham, qaytarilmaydi ham (faqat oq ro'yxat maydonlar).

## Kuzatuv (qo'ng'iroqcha) obunalari
- `POST ?a=sub {initData, match_id, on, meta}` — obuna yoqish/o'chirish. `POST ?a=subs {initData}` — foydalanuvchining faol obunalari (+`deliverable` holati). Ikkalasi ham Telegram initData HMAC-SHA256 imzosi bilan himoyalangan (auth_date 24 soatdan eski bo'lsa rad).
- `GET ?a=watchdata&key=` — VM watcher uchun barcha obunalar; `POST ?a=unsub {key, match_id, user_id}` — tozalash (FT); `POST ?a=substate {key, ...}` — watcher confirmed/deliverable holatini yozadi.
- Saqlash: `subs-data.php` (birinchi qator himoya `exit`, qolgani JSON) — vebdan o'qib bo'lmaydi.
- Maxfiylar: `gp-secret.php` (`require` bilan o'qiladi; to'g'ridan chaqirilsa 403). Workspace nusxasi — placeholder (`adapter/gp-secret.php`), haqiqiy qiymatlar faqat serverda. DIQQAT: PHP da bir qatorli `//` komment ichida `?>` belgisi bo'lmasin — u PHP blokini yopib, kodni matn sifatida chiqarib yuboradi.
- Watcher: VM da `golpulse-notify.service` (`bot/golpulse_notify.py`, kalit `bot/watcher-config.json` da — repo da yo'q, .gitignore da).
