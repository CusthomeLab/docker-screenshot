const koaLogger = require('koa-logger')
const winston = require('winston')

module.exports = {
  createLogger: debug => {
    const consoleTransport = new winston.transports.Console({
      stderrLevels: ['error'],
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.metadata(),
        winston.format.errors(),
        winston.format.cli(),
      ),
    })

    const logger = winston.createLogger({
      levels: winston.config.npm.levels,
      level: debug ? 'silly' : 'http',
      transports: [consoleTransport],
    })

    logger.exceptions.handle([consoleTransport])

    return logger
  },
  koaLoggerMiddleware: logger =>
    koaLogger((str, args) => {
      const [direction, method, url, status, executionTime, length] = args

      if (status && status >= 500) {
        logger.error(str)
      } else {
        logger.http(str)
      }
    }),
}
