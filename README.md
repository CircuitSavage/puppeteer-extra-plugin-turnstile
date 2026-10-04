<a href="https://peak.fo/?utm_source=github&utm_medium=readme&utm_campaign=packages&utm_content=puppeteer-extra-plugin-turnstile">
  <img src="https://raw.githubusercontent.com/CircuitSavage/puppeteer-extra-plugin-turnstile/main/assets/peak-banner.png" alt="Peak — solve Cloudflare Turnstile & the 5s challenge in ~1s" width="100%">
</a>

# puppeteer-extra-plugin-turnstile

**puppeteer-extra-plugin-turnstile** is a puppeteer-extra plugin that solves Cloudflare Turnstile automatically. It adds `page.solveTurnstile()`: it reads the sitekey from the DOM, gets a token from the Peak API, injects it into the widget, and fires the success callback.

## Why

`puppeteer-extra-plugin-recaptcha` is the plugin most people reach for, but it has no Turnstile support and has not shipped a release in about three years. Turnstile is not reCAPTCHA: it runs its own browser challenge and hands back a `cf-turnstile-response` token, so a reCAPTCHA-era solver never sees it. Headless browsers on datacenter IPs get held at the widget indefinitely. This is the drop-in for Turnstile. When your setup gets blocked, drop in a Peak API key and it just works.

## Powered by Peak

This package uses [Peak](https://peak.fo/?utm_source=github&utm_medium=readme&utm_campaign=packages&utm_content=puppeteer-extra-plugin-turnstile) to solve Turnstile.
- Solve Cloudflare Turnstile & the 5s challenge in about a second
- $0.90 per 1,000 successful Turnstile solves, down to $0.35 at volume
- 1,000 free solves to start, no card.

→ [Get your free API key](https://peak.fo/?utm_source=github&utm_medium=readme&utm_campaign=packages&utm_content=puppeteer-extra-plugin-turnstile) · [Docs](https://peak.fo/docs/turnstile?utm_source=github&utm_medium=readme&utm_campaign=packages&utm_content=puppeteer-extra-plugin-turnstile) · [Pricing](https://peak.fo/pricing?utm_source=github&utm_medium=readme&utm_campaign=packages&utm_content=puppeteer-extra-plugin-turnstile)

## Install

```bash
npm install puppeteer-extra puppeteer-extra-plugin-turnstile puppeteer
```

`puppeteer-extra` and `puppeteer-extra-plugin` are peer dependencies. Node 18+ (uses the built-in `fetch`).

## Quickstart

```js
const puppeteer = require('puppeteer-extra')
const Turnstile = require('puppeteer-extra-plugin-turnstile')

puppeteer.use(Turnstile({ apiKey: process.env.PEAK_API_KEY }))

;(async () => {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://target.example/login', { waitUntil: 'domcontentloaded' })

  // Read sitekey -> solve via Peak -> inject token -> fire callback.
  const token = await page.solveTurnstile()
  console.log('solved:', token.slice(0, 24) + '...')

  // The form now holds a valid cf-turnstile-response. Submit as usual.
  await browser.close()
})()
```

Run it:

```bash
PEAK_API_KEY=pk_your_api_key node examples/solve.js https://target.example/login
```

## Auto-solve

Solve every page automatically after it loads, whenever a widget is present:

```js
puppeteer.use(Turnstile({ apiKey: process.env.PEAK_API_KEY, autoSolve: true }))
```

## Options

Pass options to the factory, or override any of them per call in `page.solveTurnstile(opts)`.

| Option        | Default                    | Description                                             |
| ------------- | -------------------------- | ------------------------------------------------------- |
| `apiKey`      | `process.env.PEAK_API_KEY` | Peak API key (`pk_...`).                                 |
| `appId`       | `process.env.PEAK_APP_ID`  | Peak app id to credit for revenue share (see below).    |
| `proxy`       | `undefined`                | Optional proxy `http://user:pass@ip:port`.              |
| `selector`    | `.cf-turnstile`            | CSS selector for the widget.                            |
| `autoSolve`   | `false`                    | Solve automatically after each page load.               |
| `sitekey`     | read from DOM              | Solve this sitekey directly (per call).                 |
| `url`         | `page.url()`               | Page URL sent to Peak (per call).                       |
| `action`, `cData`, `pageData` | `undefined` | Optional advanced Turnstile parameters.               |

```js
// Per-call override, e.g. a specific widget and proxy:
const token = await page.solveTurnstile({
  selector: '#login-turnstile',
  proxy: 'http://user:pass@1.2.3.4:8080'
})
```

## Earn with your app ID

Pass your Peak app id and you earn 5% of every solve this tool makes, paid as solve credit. Set it once via the `appId` option or the `PEAK_APP_ID` environment variable. It is optional and only affects who gets credited; it does not change whether a solve succeeds or how fast it runs.

```js
puppeteer.use(Turnstile({
  apiKey: process.env.PEAK_API_KEY,
  appId: 'app_your_id' // or set PEAK_APP_ID
}))
```

Create an app id at [peak.fo/dashboard/developer](https://peak.fo/dashboard/developer). Details: [peak.fo/earn](https://peak.fo/earn).

## How it works

`POST https://api.peak.fo/solve` with `X-API-Key` and:

```json
{ "task_type": "turnstiletask", "sitekey": "0x4AAAAAAA...", "url": "https://target.example/login" }
```

Peak returns `{ "success": true, "data": { "token": "0.AgAAA..." }, "cost": 0.001 }`. The plugin writes that token into the widget's `cf-turnstile-response` input and calls the `data-callback` handler so the page behaves as if a human passed. Peak also supports the Cloudflare 5s challenge (`"task_type": "cloudflare5stask"`).

## Legitimate use

For automation, QA, and scraping public data you are allowed to access. Respect each target's Terms of Service and `robots.txt`, and rate-limit yourself. Do not use this for credential stuffing or any unauthorized access.

## License

MIT — see [LICENSE](./LICENSE).
