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
      datePattern: "yyyy-MM-dd.",
      json: false,
      maxSize: 1000000,
      maxFiles: 7,
      level: logLevel
    }))
    winston.add(new winston.transports.Console())
    winston.level = logLevel
    winstonAttached.set(logFileName, winston)
  }
  
  return winstonAttached.get(logFileName)
}