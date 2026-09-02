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
2. A `{ success: false, error }` response throws.
3. `readSitekey` reads `data-sitekey` from the DOM.
4. `solveTurnstile` reads the sitekey, calls Peak with the correct body
   (sitekey from the DOM, url from `page.url()`), injects the returned token
   exactly once, and returns it.
5. An explicit `sitekey`/`url` override is honored (no DOM read).
6. A missing API key throws.
7. The browser-side `injectTokenInPage` writes the `cf-turnstile-response`
   input value and fires the `data-callback` handler.

## Run

Requires Node 18+ (tested on Node v22.11.0). No dependencies to install.

```bash
node --test
```

## Observed output (PASS)

```
TAP version 13
# Subtest: solveWithPeak posts the correct body and returns the token
ok 1 - solveWithPeak posts the correct body and returns the token
# Subtest: solveWithPeak includes proxy when provided
ok 2 - solveWithPeak includes proxy when provided
# Subtest: solveWithPeak throws on a failure response
ok 3 - solveWithPeak throws on a failure response
# Subtest: readSitekey reads data-sitekey from the DOM
ok 4 - readSitekey reads data-sitekey from the DOM
# Subtest: solveTurnstile: reads sitekey, calls Peak correctly, injects the token
ok 5 - solveTurnstile: reads sitekey, calls Peak correctly, injects the token
# Subtest: solveTurnstile: honors an explicit sitekey (no DOM read needed)
ok 6 - solveTurnstile: honors an explicit sitekey (no DOM read needed)
# Subtest: solveTurnstile: throws when no API key is available
ok 7 - solveTurnstile: throws when no API key is available
# Subtest: injectTokenInPage writes the response input and fires the callback
ok 8 - injectTokenInPage writes the response input and fires the callback
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 82.2554
```
