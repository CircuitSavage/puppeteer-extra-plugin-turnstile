'use strict'

const { solveWithPeak } = require('./peak')

const DEFAULT_SELECTOR = '.cf-turnstile'

/**
 * Browser-side function: write the token into the widget's response input
 * (creating it if needed) and fire the Turnstile success callback.
 * Serialized and run inside the page via page.evaluate.
 */
/* istanbul ignore next -- runs in the browser, not under node test */
function injectTokenInPage (token) {
  const widgets = Array.prototype.slice.call(
    document.querySelectorAll('.cf-turnstile, [data-sitekey]')
  )

  let inputs = 0
  let fired = 0

  const setInput = function (scope) {
    let input = scope.querySelector('input[name="cf-turnstile-response"]')
    if (!input) {
      input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'cf-turnstile-response'
      scope.appendChild(input)
    }
    input.value = token
    inputs++
  }

  if (widgets.length) {
    widgets.forEach(function (w) {
      // response input usually lives inside the widget or its parent form
      setInput(w.closest('form') || w)
      const cbName = w.getAttribute('data-callback')
      if (cbName && typeof window[cbName] === 'function') {
        try { window[cbName](token); fired++ } catch (e) { /* ignore */ }
      }
    })
  } else {
    setInput(document.body || document.documentElement)
  }

  // Update any pre-existing response inputs anywhere on the page.
  Array.prototype.slice
    .call(document.querySelectorAll(
      'input[name="cf-turnstile-response"], input[name="g-recaptcha-response"]'
    ))
    .forEach(function (i) { i.value = token })

  return { inputs: inputs, fired: fired, widgets: widgets.length }
}

/**
 * Read the Turnstile sitekey from the page DOM.
 * @param {object} page  A Puppeteer Page (or compatible).
 * @param {string} [selector]
 * @returns {Promise<string|null>}
 */
async function readSitekey (page, selector) {
  const sel = selector || DEFAULT_SELECTOR
  try {
    return await page.$eval(sel, function (el) {
      return el.getAttribute('data-sitekey')
    })
  } catch (err) {
    // Selector not present. Fall back to scanning any [data-sitekey] element.
    try {
      return await page.$eval('[data-sitekey]', function (el) {
        return el.getAttribute('data-sitekey')
      })
    } catch (err2) {
      return null
    }
  }
}

/**
 * Inject a solved token into the page and fire the widget callback.
 * @param {object} page
 * @param {string} token
 */
async function injectToken (page, token) {
  return page.evaluate(injectTokenInPage, token)
}

/**
 * End-to-end: read the sitekey, solve it via Peak, inject the token.
 * This is what page.solveTurnstile() calls.
 *
 * @param {object} page  A Puppeteer Page.
 * @param {object} [opts]
 * @param {string} [opts.apiKey]   Defaults to process.env.PEAK_API_KEY.
 * @param {string} [opts.proxy]
 * @param {string} [opts.sitekey]  Skip DOM read and use this sitekey.
 * @param {string} [opts.url]      Defaults to page.url().
 * @param {string} [opts.selector] CSS selector for the widget.
 * @param {string} [opts.action] / [opts.cData] / [opts.pageData]
 * @param {string} [opts.appId]    Peak app id to credit. Defaults to process.env.PEAK_APP_ID.
 * @param {string} [opts.endpoint] / [opts.fetchImpl]  (tests)
 * @returns {Promise<string>} The solved token.
 */
async function solveTurnstile (page, opts) {
  opts = opts || {}
  const apiKey = opts.apiKey || process.env.PEAK_API_KEY
  if (!apiKey) {
    throw new Error('[turnstile] missing Peak API key (set PEAK_API_KEY or pass apiKey)')
  }

  const sitekey = opts.sitekey || (await readSitekey(page, opts.selector))
  if (!sitekey) throw new Error('[turnstile] no Turnstile widget found on the page')

  const url = opts.url || (typeof page.url === 'function' ? page.url() : undefined)

  const token = await solveWithPeak({
    apiKey: apiKey,
    sitekey: sitekey,
    url: url,
    proxy: opts.proxy,
    action: opts.action,
    cData: opts.cData,
    pageData: opts.pageData,
    appId: opts.appId || process.env.PEAK_APP_ID,
    endpoint: opts.endpoint,
    fetchImpl: opts.fetchImpl
  })

  await injectToken(page, token)
  return token
}

module.exports = {
  solveTurnstile,
  readSitekey,
  injectToken,
  injectTokenInPage,
  DEFAULT_SELECTOR
}
