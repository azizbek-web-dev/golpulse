# GolPulse BFF adapter

- Jonli manzil: https://betgo.site/gp-api/ (Beget: `~/betgo.site/public_html/gp-api/index.php`, cache/ — 777)
- Yangilash: shu faylni tahrirlab, serverga scp -> serverda `cp` bilan joyiga (ACL qoidasi), `php8.4 -l` tekshiruv.
- Endpointlar: `?a=health|live|match&id=|table&game_id=|league&champ=|leagues|search&q=|team&clId=|player&game_id=&player=`
- `?a=day&date=YYYY-MM-DD` — sana tanlash (Asia/Tashkent kuni), real oraliq **-14..+7 kun**: bugun = `a=live` javobi + `date`/`kind`; o'tgan kun = natijalar (result-champs/games, kun keshi 15 daq); kelgusi kun = liniya kunga kesilgan (line-matches + isTop/avval katta chempionatlar games-by-champ, kun keshi 5 daq; virtual/esoccer va «Mezbonlar» maxsus bozorlari kesiladi). Javob shakli LiveData bilan bir xil + `date`, `kind` (today/past/future). `a=match` ga `&date=` ishorasi o'tgan kun o'yinini kun ro'yxatidan topadi.
- CORS: faqat https://azizbek-web-dev.github.io
- Stavka bozorlari chaqirilmaydi ham, qaytarilmaydi ham (faqat oq ro'yxat maydonlar).
