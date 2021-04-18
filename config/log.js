// config/log.js

const winston = require("winston");
const util = require("util")
require("winston-daily-rotate-file");

const winstonAttached = new Map();

const transform = (info) => {
  const args = info[Symbol.for('splat')];
  if (args) { 
    return {...info, message: util.format(info.message, ...args)}; 
  }
  return info;
}

const logFormatter = () => ({ transform })

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
        logFormatter(),
        winston.format.prettyPrint(),
        winston.format.timestamp(),
        winston.format.simple(),
        winston.format.align(),
        winston.format.printf((info) => {
          const {
            timestamp, level, message
          } = info;

          const ts = timestamp.slice(0, 19).replace('T', ' ');
          return `${ts} [${level}]: ${typeof message === "object" ? JSON.stringify(message, null, 2) : message}`;
        }),
      )
    }))
    winston.level = logLevel
    winstonAttached.set(logFileName, winston)
  }
  
  return winstonAttached.get(logFileName)
}