'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

// Import only the pure core — never ./index (which needs puppeteer-extra-plugin).
const { solveWithPeak } = require('../src/peak')
const { solveTurnstile, readSitekey } = require('../src/solver')

const SAMPLE_SITEKEY = '0x4AAAAAAADnPIDRO14hardcoded'
const PAGE_URL = 'https://target.example/login'
const TEST_TOKEN = 'XXXX.TEST'

/**
 * Build a stub fetch that records the request and returns a canned response.
 */
function makeFetch (responseBody, statusCode) {
  const calls = []
  const fetchImpl = async function (url, init) {
    calls.push({ url: url, init: init })
    return {
      status: statusCode || 200,
      json: async function () { return responseBody }
    }
  }
  fetchImpl.calls = calls
  return fetchImpl
}

/**
 * Fake Puppeteer Page:
 *   $eval  -> returns the sitekey (DOM read)
 *   evaluate -> captures the injected token
 *   url()  -> the page url
 */
function makeFakePage () {
  const state = { injectedToken: null, evaluateCalls: 0, evalSelector: null }
  return {
    _state: state,
    url: function () { return PAGE_URL },
    $eval: async function (selector, fn) {
      state.evalSelector = selector
      // Simulate a DOM element carrying data-sitekey.
      return fn({ getAttribute: function () { return SAMPLE_SITEKEY } })
    },
    evaluate: async function (fn, token) {
      state.evaluateCalls++
      state.injectedToken = token
      return { inputs: 1, fired: 1, widgets: 1 }
    }
  }
}

test('solveWithPeak posts the correct body and returns the token', async function () {
  const fetchImpl = makeFetch({ success: true, data: { token: TEST_TOKEN }, cost: 0.001 })

  const token = await solveWithPeak({
    apiKey: 'pk_test_key',
    sitekey: SAMPLE_SITEKEY,
    url: PAGE_URL,
    fetchImpl: fetchImpl
  })

  assert.equal(token, TEST_TOKEN)
  assert.equal(fetchImpl.calls.length, 1)

  const call = fetchImpl.calls[0]
  assert.equal(call.url, 'https://api.peak.fo/solve')
  assert.equal(call.init.method, 'POST')
  assert.equal(call.init.headers['X-API-Key'], 'pk_test_key')
  assert.equal(call.init.headers['Content-Type'], 'application/json')

  const body = JSON.parse(call.init.body)
  assert.deepEqual(body, {
    task_type: 'turnstiletask',
    sitekey: SAMPLE_SITEKEY,
    url: PAGE_URL
  })
  // proxy omitted when not supplied
  assert.equal('proxy' in body, false)
})

test('solveWithPeak includes proxy when provided', async function () {
  const fetchImpl = makeFetch({ success: true, data: { token: TEST_TOKEN } })
  await solveWithPeak({
    apiKey: 'pk_test_key',
    sitekey: SAMPLE_SITEKEY,
    url: PAGE_URL,
    proxy: 'http://user:pass@1.2.3.4:8080',
    fetchImpl: fetchImpl
  })
  const body = JSON.parse(fetchImpl.calls[0].init.body)
  assert.equal(body.proxy, 'http://user:pass@1.2.3.4:8080')
})

test('solveWithPeak throws on a failure response', async function () {
  const fetchImpl = makeFetch({ success: false, error: 'insufficient balance' })
  await assert.rejects(
    solveWithPeak({ apiKey: 'pk_x', sitekey: SAMPLE_SITEKEY, url: PAGE_URL, fetchImpl: fetchImpl }),
    /insufficient balance/
  )
})

test('readSitekey reads data-sitekey from the DOM', async function () {
  const page = makeFakePage()
  const sitekey = await readSitekey(page)
  assert.equal(sitekey, SAMPLE_SITEKEY)
  assert.equal(page._state.evalSelector, '.cf-turnstile')
})

test('solveTurnstile: reads sitekey, calls Peak correctly, injects the token', async function () {
  const fetchImpl = makeFetch({ success: true, data: { token: TEST_TOKEN } })
  const page = makeFakePage()

  const token = await solveTurnstile(page, {
    apiKey: 'pk_test_key',
    fetchImpl: fetchImpl
  })

  // returned + injected token
  assert.equal(token, TEST_TOKEN)
  assert.equal(page._state.injectedToken, TEST_TOKEN, 'token was injected into the page')
  assert.equal(page._state.evaluateCalls, 1, 'injection ran exactly once')

  // Peak was called with the sitekey read from the DOM and the page url
  assert.equal(fetchImpl.calls.length, 1)
  const body = JSON.parse(fetchImpl.calls[0].init.body)
  assert.equal(body.task_type, 'turnstiletask')
  assert.equal(body.sitekey, SAMPLE_SITEKEY)
  assert.equal(body.url, PAGE_URL)
})

test('solveTurnstile: honors an explicit sitekey (no DOM read needed)', async function () {
  const fetchImpl = makeFetch({ success: true, data: { token: TEST_TOKEN } })
  const page = makeFakePage()

  await solveTurnstile(page, {
    apiKey: 'pk_test_key',
    sitekey: '0xEXPLICIT',
    url: 'https://other.example/',
    fetchImpl: fetchImpl
  })

  const body = JSON.parse(fetchImpl.calls[0].init.body)
  assert.equal(body.sitekey, '0xEXPLICIT')
  assert.equal(body.url, 'https://other.example/')
})

test('solveTurnstile: throws when no API key is available', async function () {
  const saved = process.env.PEAK_API_KEY
  delete process.env.PEAK_API_KEY
  try {
    const page = makeFakePage()
    await assert.rejects(
      solveTurnstile(page, { fetchImpl: makeFetch({ success: true, data: { token: TEST_TOKEN } }) }),
      /missing Peak API key/
    )
  } finally {
    if (saved !== undefined) process.env.PEAK_API_KEY = saved
  }
})

test('injectTokenInPage writes the response input and fires the callback', function () {
  // Exercise the browser-side function against a tiny fake DOM (no real browser).
  const { injectTokenInPage } = require('../src/solver')

  const created = []
  const responseInput = { name: 'cf-turnstile-response', value: '' }
  let callbackToken = null

  const widget = {
    getAttribute: function (a) { return a === 'data-callback' ? 'onTsSuccess' : SAMPLE_SITEKEY },
    closest: function () { return null },
    querySelector: function () { return responseInput }
  }

  global.window = { onTsSuccess: function (t) { callbackToken = t } }
  global.document = {
    querySelectorAll: function (sel) {
      if (sel.indexOf('cf-turnstile-response') !== -1) return [responseInput]
      return [widget]
    },
    createElement: function () { const el = {}; created.push(el); return el },
    body: {}
  }

  try {
    const result = injectTokenInPage(TEST_TOKEN)
    assert.equal(responseInput.value, TEST_TOKEN)
    assert.equal(callbackToken, TEST_TOKEN)
    assert.equal(result.fired, 1)
  } finally {
    delete global.window
    delete global.document
  }
})
