'use strict'

const Koa = require('koa')
const Router = require('koa-router')
const puppeteer = require('puppeteer')
const parseDataURL = require('data-urls')
const stripScripts = require('strip-scripts')
const { URL } = require('url')
const queryString = require('querystring')
const Sentry = require('@sentry/node')
const { createLogger, koaLoggerMiddleware } = require('./logger')
const ScreenshotNotTakenInTime = require('./ScreenshotNotTakenInTime')

const HTTP_SERVER_PORT = process.env.HTTP_SERVER_PORT || 8080
const DEBUG = process.env.DEBUG === 'true' || false
const SENTRY_DSN = process.env.SENTRY_DSN || false

const main = async () => {
  const logger = createLogger(DEBUG)

  const puppeteerConfigurations = {
    headless: false, // We disable here the headless mode to activate it throught the `args` (see https://github.com/GoogleChrome/puppeteer/issues/1260#issuecomment-348878456)
    ignoreDefaultArgs: true,
    args: [
      ...puppeteer
        .defaultArgs()
        .filter(oneArgument => oneArgument !== '--disable-gpu'),
      // .filter(oneArgument => oneArgument !== '--disable-dev-shm-usage'),

      // Allow WebGL in headless mode (see https://github.com/GoogleChrome/puppeteer/issues/1260#issuecomment-348878456)
      ...['--headless', '--hide-scrollbars', '--mute-audio', '--enable-webgl'],

      // Docker related arguments
      ...[
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-logging',
        '--v=1',
      ],
    ],
  }

  logger.verbose('Starting puppeteer...')
  logger.debug(
    `With the configuration: ${JSON.stringify(puppeteerConfigurations)}`,
  )
  const browser = await puppeteer.launch(puppeteerConfigurations)
  logger.verbose('Puppeteer started')
  logger.info(`Will use Google Chrome "${await browser.version()}"`)

  const httpServer = new Koa()
  const httpRouter = new Router()

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
    })

    httpServer.on('error', (err, ctx) => {
      Sentry.withScope(scope => {
        scope.addEventProcessor(event =>
          Sentry.Handlers.parseRequest(event, ctx.request),
        )
        Sentry.captureException(err)
      })
    })
  } else {
    logger.warning('No error reporting configuration given')
  }

  httpRouter.get('/', ctx => {
    ctx.status = 200
    ctx.body = 'Screenshot maker is ready to 📸!\n'
  })

  httpRouter.get('/screenshot', async (ctx, next) => {
    const queryStringParameters = queryString.parse(ctx.querystring)
    const targetRaw = queryStringParameters.target
    if (!targetRaw) {
      ctx.throw(
        400,
        'The target parameter is missing (or falsy) in the query string',
      )
    }

    const targetUrl = new URL(targetRaw)

    const page = await browser.newPage()
    page.setCacheEnabled(true)

    logger.silly('New browser page openned')

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ScreenshotNotTakenInTime())
      }, 60 * 1000)

      page.on('pageerror', err => {
        logger.error('Page error: ' + err.toString())
        reject(err)
      })

      page.on('error', err => {
        logger.error('Error: ' + err.toString())
        reject(err)
      })

      await page.exposeFunction('onScreenshotTakenListener', async e => {
        logger.silly(`onScreenshotTakenListener triggered`)
        clearTimeout(timeoutId)

        const screenshotDataURI = parseDataURL(e.detail.dataURI)

        resolve({
          mimeType: screenshotDataURI.mimeType.toString(),
          body: screenshotDataURI.body,
        })
      })

      await page.evaluateOnNewDocument(() => {
        document.addEventListener('screenshotTaken', event => {
          window.onScreenshotTakenListener({
            detail: event.detail,
          })
        })
      })

      logger.info(
        `Visit "${targetUrl.toString()}" and wait for a screenshot to be taken`,
      )
      await page.goto(targetUrl.toString())
    })
      .then(({ mimeType, body }) => {
        ctx.status = 200
        ctx.type = mimeType
        ctx.body = body
      })
      .catch(err => {
        ctx.throw(500, err)
      })
      .finally(async () => {
        await page.close()
        logger.silly('Browser page closed')
      })
  })

  httpRouter.get('/health', ctx => {
    ctx.status = 200
  })

  if (DEBUG) {
    httpRouter.get('/capabilities/webgl.html', async ctx => {
      const page = await browser.newPage()
      await page.goto('https://alteredqualia.com/tools/webgl-features/', {
        waitUntil: 'networkidle0',
      })

      const html = stripScripts(await page.content())
      await browser.close()

      ctx.status = 200
      ctx.type = 'text/html'
      ctx.body = html
    })
  }

  logger.verbose('Starting HTTP server...')
  httpServer.use(koaLoggerMiddleware(logger))
  httpServer.use(httpRouter.routes())
  httpServer.use(httpRouter.allowedMethods())

  httpServer.listen(HTTP_SERVER_PORT)
  logger.verbose(
    `HTTP server running and listening on port ${HTTP_SERVER_PORT}`,
  )

  logger.info(`Ready to work at http://0.0.0.0:${HTTP_SERVER_PORT}`)
  logger.info(`Debug: "${DEBUG}"`)
}

module.exports = main
