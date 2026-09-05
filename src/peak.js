'use strict'

/**
 * Peak API client for Cloudflare Turnstile.
 *
 * Contract (https://peak.fo/docs/turnstile):
 *   POST https://api.peak.fo/solve
 *   Headers: X-API-Key: pk_..., Content-Type: application/json
 *   Body:    { task_type: "turnstiletask", sitekey, url, proxy? }
 *   OK:      { success: true, data: { token }, cost }
 *   Fail:    { success: false, error }
 */

const DEFAULT_ENDPOINT = 'https://api.peak.fo/solve'

/**
 * Solve a Turnstile challenge through Peak and return the token string.
 *
 * @param {object} opts
 * @param {string} opts.apiKey    Peak API key (pk_...).
 * @param {string} opts.sitekey   Turnstile sitekey read from the page.
 * @param {string} opts.url       URL of the page hosting the widget.
 * @param {string} [opts.proxy]   Optional proxy, e.g. http://user:pass@ip:port.
 * @param {string} [opts.action]  Optional Turnstile action.
 * @param {string} [opts.cData]   Optional Turnstile cData.
 * @param {string} [opts.pageData] Optional Turnstile pagedata (chlPageData).
 * @param {string} [opts.appId]    Optional Peak app id to credit for revenue share.
 * @param {string} [opts.endpoint] Override the Peak endpoint (tests/self-hosted).
 * @param {Function} [opts.fetchImpl] Override fetch (tests). Defaults to global fetch.
 * @returns {Promise<string>} The solved Turnstile token.
 */
async function solveWithPeak (opts) {
  const {
    apiKey,
    sitekey,
    url,
    proxy,
    action,
    cData,
    pageData,
    appId,
    endpoint = DEFAULT_ENDPOINT,
    fetchImpl
  } = opts || {}

  if (!apiKey) throw new Error('[turnstile] missing Peak API key (set PEAK_API_KEY or pass apiKey)')
  if (!sitekey) throw new Error('[turnstile] missing sitekey')
  if (!url) throw new Error('[turnstile] missing url')

  const doFetch = fetchImpl || globalThis.fetch
  if (typeof doFetch !== 'function') {
    throw new Error('[turnstile] global fetch is not available; use Node 18+ or pass opts.fetchImpl')
  }

  const body = { task_type: 'turnstiletask', sitekey, url }
  if (proxy) body.proxy = proxy
  if (action) body.action = action
  if (cData) body.cdata = cData
  if (pageData) body.pagedata = pageData
  if (appId) body.appId = appId

  const res = await doFetch(endpoint, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  let json
  try {
    json = await res.json()
  } catch (err) {
    throw new Error('[turnstile] Peak returned a non-JSON response (HTTP ' + (res && res.status) + ')')
  }

  if (!json || json.success !== true) {
    const reason = (json && json.error) || ('HTTP ' + (res && res.status))
    throw new Error('[turnstile] Peak solve failed: ' + reason)
  }

  const token = json.data && json.data.token
  if (!token) throw new Error('[turnstile] Peak response missing data.token')

  return token
}

module.exports = { solveWithPeak, DEFAULT_ENDPOINT }
