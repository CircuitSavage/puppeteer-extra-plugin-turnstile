# Testing

The test suite mocks Peak's `/solve` HTTP call (stubbed `fetch`) and uses a fake
Puppeteer `page` object, so it runs with no network, no API key, and no browser.

- `page.$eval` returns a sample sitekey (simulates the DOM read).
- `page.evaluate` captures the injected token (simulates writing the widget response).
- The stub `fetch` returns `{ "success": true, "data": { "token": "XXXX.TEST" } }`
  and records the request so the body can be asserted.

The test imports only `src/peak.js` and `src/solver.js` — never `src/index.js` —
so `puppeteer-extra-plugin` is not required to run it.

## What it asserts

1. `solveWithPeak` POSTs to `https://api.peak.fo/solve` with the `X-API-Key`
   header and body `{ task_type: "turnstiletask", sitekey, url }`; `proxy` is
   omitted when not supplied and included when it is.
2. `appId` is omitted from the body when unset and included when passed as an
   option or via `process.env.PEAK_APP_ID`.
3. A `{ success: false, error }` response throws.
4. `readSitekey` reads `data-sitekey` from the DOM.
5. `solveTurnstile` reads the sitekey, calls Peak with the correct body
   (sitekey from the DOM, url from `page.url()`), injects the returned token
   exactly once, and returns it.
6. An explicit `sitekey`/`url` override is honored (no DOM read).
7. A missing API key throws.
8. The browser-side `injectTokenInPage` writes the `cf-turnstile-response`
   input value and fires the `data-callback` handler.

## Run

Requires Node 18+ (tested on Node v22.11.0). No dependencies to install.

```bash
node --test
```

## Observed output (PASS)

```
TAP version 13
ok 1 - solveWithPeak posts the correct body and returns the token
ok 2 - solveWithPeak includes proxy when provided
ok 3 - solveWithPeak omits appId when not provided
ok 4 - solveWithPeak includes appId when provided
ok 5 - solveTurnstile threads appId into the Peak payload
ok 6 - solveTurnstile falls back to PEAK_APP_ID for appId
ok 7 - solveTurnstile omits appId when neither option nor env is set
ok 8 - solveWithPeak throws on a failure response
ok 9 - readSitekey reads data-sitekey from the DOM
ok 10 - solveTurnstile: reads sitekey, calls Peak correctly, injects the token
ok 11 - solveTurnstile: honors an explicit sitekey (no DOM read needed)
ok 12 - solveTurnstile: throws when no API key is available
ok 13 - injectTokenInPage writes the response input and fires the callback
1..13
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
