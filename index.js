'use strict'

const Koa = require('koa')
const Router = require('koa-router')
const puppeteer = require('puppeteer')
const parseDataURL = require('data-urls')
const { createLogger, koaLoggerMiddleware } = require('./logger')

const HTTP_SERVER_PORT = process.env.HTTP_SERVER_PORT || 8080
const SCREENSHOT_API_ENDPOINT =
  process.env.HTTP_SERVER_PORT || 'http://localhost:3000'
const DEBUG = process.env.DEBUG || false

const logger = createLogger(DEBUG)

const main = async () => {
  logger.verbose('Starting puppeteer...')
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--remote-debugging-port=9222', // FIXME: to be removed
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
  logger.verbose('Puppeteer started')

  const httpServer = new Koa()
  const httpRouter = new Router()

  httpRouter.get('/', ctx => {
    ctx.status = 200
    ctx.body = 'Screenshot maker is ready to 📸!\n'
  })

  httpRouter.get('/screenshot/:lotId/preview', async (ctx, next) => {
    const lotId = ctx.params.lotId
    if (!lotId) {
      ctx.throw(400, 'The lotId parameter is missing or falsy')
    }

    const page = await browser.newPage()
    logger.silly('New browser page openned')

    return new Promise(async (resolve, reject) => {
      page.on('pageerror', err => {
        console.log(err)
        logger.error('Page error: ' + err.toString())
        reject(err)
      })

      page.on('error', err => {
        logger.error('Error: ' + err.toString())
        reject(err)
      })

      await page.exposeFunction('onScreenshotTakenListener', async e => {
        logger.silly(`onScreenshotTakenListener triggered`)

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

      const target = `${SCREENSHOT_API_ENDPOINT}/screenshot/${lotId}?defaultProducts=0&decorativeProducts=0&size=528`
      logger.silly(`Go to: ${target}`)
      await page.goto(target /*{ waitUntil: 'networkidle0' }*/) // TODO: Do we need that back?
    })
      .then(({ mimeType, body }) => {
        ctx.status = 200
        ctx.type = mimeType
        ctx.body = body
      })
      .finally(async () => {
        await page.close()
        logger.silly('Browser page closed')
      })
  })

  logger.verbose('Starting HTTP server...')
  httpServer.use(koaLoggerMiddleware(logger))
  httpServer.use(httpRouter.routes())
  httpServer.use(httpRouter.allowedMethods())
  httpServer.listen(HTTP_SERVER_PORT)
  logger.verbose(
    `HTTP server running and listening on port ${HTTP_SERVER_PORT}`,
  )

  logger.info(`Ready to work at http://0.0.0.0:${HTTP_SERVER_PORT}`)
}

main()
