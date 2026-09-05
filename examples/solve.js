'use strict'

/**
 * Example: solve a Cloudflare Turnstile challenge with puppeteer-extra.
 *
 *   PEAK_API_KEY=pk_your_api_key node examples/solve.js https://target.example/login
 *
 * Get a free key: https://peak.fo
 */

const puppeteer = require('puppeteer-extra')
const Turnstile = require('puppeteer-extra-plugin-turnstile')

puppeteer.use(
  Turnstile({
    apiKey: process.env.PEAK_API_KEY // defaults to this env var anyway
    // proxy: 'http://user:pass@ip:port',  // optional
    // appId: process.env.PEAK_APP_ID,     // optional: earn 5% solve credit (peak.fo/earn)
  })
)

async function main () {
  const target = process.argv[2] || 'https://target.example/login'

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(target, { waitUntil: 'domcontentloaded' })

  // Reads the sitekey from the DOM, solves it via Peak, injects the token,
  // and fires the widget callback. Returns the token string.
  const token = await page.solveTurnstile()
  console.log('Turnstile solved, token:', token.slice(0, 24) + '...')

  // The form now carries a valid cf-turnstile-response. Submit as usual, e.g.:
  // await Promise.all([page.click('#submit'), page.waitForNavigation()])

  await browser.close()
}

main().catch(function (err) {
  console.error(err)
  process.exit(1)
})
