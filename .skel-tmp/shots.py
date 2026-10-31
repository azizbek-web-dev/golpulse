import asyncio, json, sys
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:4173/golpulse/'
OUT = '/home/hatch/workspace/golpulse/screenshots-ui'
TMP = '/home/hatch/workspace/golpulse/.skel-tmp'
DELAY = 25.0

def body(name):
    with open(f'{TMP}/{name}', 'r', encoding='utf-8') as f:
        return f.read()

LIVE = body('live.json')
LEAGUE = body('league.json')

async def fulfill(route, payload):
    await route.fulfill(status=200, content_type='application/json', body=payload)

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

        # --- 1) Ro'yxat skeleti: barcha API kechiktiriladi ---
        p1 = await ctx.new_page()
        await p1.route('**/gp-api/**', lambda r: asyncio.ensure_future(delayed_abort(r)))
        await p1.goto(BASE, wait_until='commit')
        await p1.wait_for_timeout(3500)
        await p1.screenshot(path=f'{OUT}/skel-01-royxat.png')
        print('skel-01 OK', flush=True)

        # --- 2) O'yin sahifasi skeleti: live darhol, match kechiktiriladi ---
        p2 = await ctx.new_page()
        async def h2(route):
            if 'a=match' in route.request.url:
                await delayed_abort(route)
            elif 'a=live' in route.request.url:
                await fulfill(route, LIVE)
            else:
                await delayed_abort(route)
        await p2.route('**/gp-api/**', h2)
        await p2.goto(BASE, wait_until='commit')
        await p2.wait_for_selector('.league-group .match-row', timeout=15000)
        await p2.wait_for_timeout(600)
        await p2.locator('.league-group .match-row').first.click()
        await p2.wait_for_timeout(2800)
        await p2.screenshot(path=f'{OUT}/skel-02-oyin.png')
        print('skel-02 OK', flush=True)

        # --- 3) Jadval skeleti: live+league darhol, table kechiktiriladi ---
        p3 = await ctx.new_page()
        async def h3(route):
            u = route.request.url
            if 'a=table' in u:
                await delayed_abort(route)
            elif 'a=league' in u:
                await fulfill(route, LEAGUE)
            elif 'a=live' in u:
                await fulfill(route, LIVE)
            else:
                await delayed_abort(route)
        await p3.route('**/gp-api/**', h3)
        await p3.goto(BASE, wait_until='commit')
        await p3.wait_for_selector('.league-group .match-row', timeout=15000)
        await p3.wait_for_timeout(600)
        # Liga header dagi jadval (grid) tugmasi — ikkinchi icon-btn
        await p3.locator('.league-header .icon-btn').nth(1).click()
        await p3.wait_for_selector('.league-hero', timeout=15000)
        await p3.wait_for_timeout(500)
        await p3.get_by_role('button', name='Jadval', exact=True).click()
        await p3.wait_for_timeout(2500)
        await p3.screenshot(path=f'{OUT}/skel-03-jadval.png')
        print('skel-03 OK', flush=True)

        await browser.close()

asyncio.run(main())
