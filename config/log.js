// config/log.js

const winston = require("winston");
require("winston-daily-rotate-file");

const winstonAttached = new Map();

module.exports = (logFileName, logLevel) => {
  if (!winstonAttached.has(logFileName)) {
    winston.cli();
  
    winston.level = logLevel;
  
    winston.add(winston.transports.DailyRotateFile, {
      filename: logFileName,
      datePattern: "yyyy-MM-dd.",
      prepend: true,
      json: false,
      maxSize: 1000000,
      maxFiles: 7,
      level: logLevel
    });

    winstonAttached.set(logFileName, winston)
  
    return winston;
  }

  return winstonAttached.get(logFileName);
};
