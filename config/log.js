// config/log.js

const winston = require("winston");
require("winston-daily-rotate-file");

const winstonAttached = new Map();

/**
 * @param {string} logFileName
 * @param {string} logLevel
 * @returns {import("winston").Logger}
 */
module.exports = (logFileName, logLevel) => {
  if (!winstonAttached.has(logFileName)) {
    winston.add(new (winston.transports.DailyRotateFile)({
      filename: logFileName,
      datePattern: "yyyy-MM-DD",
      // https://github.com/winstonjs/winston-daily-rotate-file/issues/188
      json: true,
      maxSize: 1000000,
      maxFiles: 7,
      level: logLevel
    }))
    winston.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.printf((info) => {
          const {
            timestamp, level, message, ...args
          } = info;

          const ts = timestamp.slice(0, 19).replace('T', ' ');
          return `${ts} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
        }),
      )
    }))
    winston.level = logLevel
    winstonAttached.set(logFileName, winston)
  }
  
  return winstonAttached.get(logFileName)
}