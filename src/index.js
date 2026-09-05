'use strict'

const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')
const { solveTurnstile } = require('./solver')

/**
 * puppeteer-extra plugin that auto-solves Cloudflare Turnstile via the Peak API.
 *
 * Adds page.solveTurnstile([opts]) to every page. With { autoSolve: true } it
 * also attempts a solve automatically after each navigation when a widget is
 * present.
 */
class TurnstilePlugin extends PuppeteerExtraPlugin {
  constructor (opts) {
    super(opts)
  }

  get name () {
    return 'turnstile'
  }

  get defaults () {
    return {
      apiKey: process.env.PEAK_API_KEY,
      appId: process.env.PEAK_APP_ID,
      proxy: undefined,
      selector: undefined,
      autoSolve: false,
      throwOnError: false,
      endpoint: undefined
    }
  }

  /** Merge instance opts with any per-call overrides. */
  _resolve (override) {
    return Object.assign({}, this.opts, override || {})
  }

  async onPageCreated (page) {
    const plugin = this

    page.solveTurnstile = function (override) {
      return solveTurnstile(page, plugin._resolve(override))
    }

    if (!this.opts.autoSolve) return

    page.on('load', async function () {
      try {
        const sitekey = await page.$eval(
          plugin.opts.selector || '.cf-turnstile',
          function (el) { return el.getAttribute('data-sitekey') }
        ).catch(function () { return null })
        if (!sitekey) return
        await solveTurnstile(page, plugin._resolve())
      } catch (err) {
        if (plugin.opts.throwOnError) throw err
        plugin.debug('autoSolve failed: ' + err.message)
      }
    })
  }
}

/** Factory — matches the puppeteer-extra plugin convention. */
module.exports = function (opts) {
  return new TurnstilePlugin(opts)
}
module.exports.TurnstilePlugin = TurnstilePlugin
module.exports.solveTurnstile = solveTurnstile
