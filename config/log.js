/** @prettier */

const { createLogger, transports, format } = require('winston')
const util = require('util')
require('winston-daily-rotate-file')

// @ts-ignore
const transform = info => {
  const args = info[Symbol.for('splat')]
  if (args) {
    return { ...info, message: util.format(info.message, ...args) }
  }
  return info
}

const logFormatter = () => ({ transform })

const formatter = format.combine(
  format.colorize(),
  format.errors({ stack: true }),
  logFormatter(),
  format.prettyPrint(),
  format.timestamp(),
  format.simple(),
  format.align(),
  format.printf(info => {
    const { timestamp, level, message, stack, exception } = info

    const ts = timestamp.slice(0, 19).replace('T', ' ')
    const isObject = typeof message === 'object'
    const formattedJson = isObject ? JSON.stringify(message, null, 2) : message
    const formattedException = exception ? exception.stack : ''
    const errorMessage = stack || formattedException
    const formattedMessage = errorMessage ? errorMessage : formattedJson

    return `${ts} [${level}]: ${formattedMessage}`
  })
)

const Logger = createLogger({
  format: formatter,
  transports: [
    new transports.DailyRotateFile({
      filename: 'shockapi.log',
      datePattern: 'yyyy-MM-DD',
      // https://github.com/winstonjs/winston-daily-rotate-file/issues/188
      json: false,
      maxSize: 1000000,
      maxFiles: 7,
      handleExceptions: true
    }),
    new transports.Console({
      handleExceptions: true
    })
  ]
})

module.exports = Logger
