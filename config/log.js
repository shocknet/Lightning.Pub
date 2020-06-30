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
    const logger = winston.createLogger({
      level: logLevel,
      transports: [
        // Add "winston-daily-rotate-file" transport
        new (winston.transports.DailyRotateFile)({
          filename: logFileName,
          datePattern: "yyyy-MM-dd.",
          json: false,
          maxSize: 1000000,
          maxFiles: 7,
          level: logLevel
        }),
      ]
    })

    winstonAttached.set(logFileName, logger)
  
    return logger;
  }

  return winstonAttached.get(logFileName);
};
