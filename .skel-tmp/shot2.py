import asyncio
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:4173/golpulse/'
OUT = '/home/hatch/workspace/golpulse/screenshots-ui'
TMP = '/home/hatch/workspace/golpulse/.skel-tmp'
DELAY = 25.0

with open(f'{TMP}/live.json', encoding='utf-8') as f:
    LIVE = f.read()

async def delayed_abort(route):
    try:
        await asyncio.sleep(DELAY)
        await route.abort()
    except Exception:
        pass

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        ctx = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=2,
            ignore_https_errors=True,
        )
        page = await ctx.new_page()
        async def h(route):
            if 'a=live' in route.request.url:
                await route.fulfill(status=200, content_type='application/json', body=LIVE)
            else:
                await delayed_abort(route)
        await page.route('**/gp-api/**', h)
        await page.goto(BASE, wait_until='commit')
        await page.wait_for_selector('.league-group .match-row', timeout=15000)
        await page.wait_for_timeout(600)
        await page.locator('.league-group .match-row').first.click()
        await page.wait_for_timeout(2800)
        await page.screenshot(path=f'{OUT}/skel-02-oyin.png')
        print('skel-02 OK', flush=True)
        await browser.close()

asyncio.run(main())
