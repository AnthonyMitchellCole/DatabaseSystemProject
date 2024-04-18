//loggingCOnfig.js
const winston = require('winston');
const morgan = require('morgan');
require('winston-daily-rotate-file'); // Ensure this is required if your Winston version doesn't automatically handle it

const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

const combinedLogFormat = winston.format.printf(({ level, message, timestamp, service }) => {
    return JSON.stringify({ level, message, timestamp, service });
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        combinedLogFormat
    ),
    transports: [
        fileRotateTransport,
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
    ]
});

module.exports = function(app) {
    morgan.token('userid', function(req) {
        return req.user ? req.user.email : '-';
    });

    app.use(morgan(':remote-addr - :userid [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', { 
        stream: { write: message => logger.info(message) }
    }));
};

// // In development, log to the console
// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.simple()
//     }));
// }

// Middleware