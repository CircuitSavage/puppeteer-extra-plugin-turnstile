// Type definitions for puppeteer-extra-plugin-turnstile

export interface TurnstilePluginOptions {
  /** Peak API key (pk_...). Defaults to process.env.PEAK_API_KEY. */
  apiKey?: string
  /** Optional proxy, e.g. http://user:pass@ip:port. */
  proxy?: string
  /** CSS selector for the Turnstile widget. Defaults to ".cf-turnstile". */
  selector?: string
  /** Try to solve automatically after each page load. Defaults to false. */
  autoSolve?: boolean
  /** In autoSolve mode, rethrow solve errors instead of swallowing them. */
  throwOnError?: boolean
  /** Override the Peak endpoint (self-hosted/testing). */
  endpoint?: string
}

export interface SolveOptions extends TurnstilePluginOptions {
  /** Skip the DOM read and solve this sitekey directly. */
  sitekey?: string
  /** Page URL to send to Peak. Defaults to page.url(). */
  url?: string
  /** Optional Turnstile action. */
  action?: string
  /** Optional Turnstile cData. */
  cData?: string
  /** Optional Turnstile pagedata (chlPageData). */
  pageData?: string
}

/** Solve a Turnstile challenge on a Puppeteer page and return the token. */
export function solveTurnstile (page: any, opts?: SolveOptions): Promise<string>

export class TurnstilePlugin {
  constructor (opts?: TurnstilePluginOptions)
  readonly name: string
}

declare function plugin (opts?: TurnstilePluginOptions): TurnstilePlugin
export default plugin
