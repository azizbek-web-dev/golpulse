<?php
/**
 * GolPulse adapter maxfiylari — WORKSPACE NUSXASI (placeholder).
 * Jonli serverda (Beget, gp-api/ ichida) shu faylning haqiqiy qiymatli
 * nusxasi turadi; qiymatlar git/workspace ga HECH QACHON yozilmaydi.
 * To'g'ridan vebdan chaqirilsa — 403 va exit (token oshkor bo'lmaydi).
 */
if (basename(__FILE__) === basename((string)($_SERVER['SCRIPT_FILENAME'] ?? ''))) {
    http_response_code(403);
    exit;
}
return [
    'bot_token' => 'PUT_BOT_TOKEN_HERE',
    'watch_key' => 'PUT_WATCH_KEY_HERE',
];
