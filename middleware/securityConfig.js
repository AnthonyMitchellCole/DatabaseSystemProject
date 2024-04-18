// securityConfig.js
const helmet = require('helmet');
const cors = require('cors');
const cspConfig = require('./cspConfig'); // Adjust path as necessary

module.exports = function(app) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: cspConfig.directives
        },
        crossOriginEmbedderPolicy: false
    }));

    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*', // Allow requests from any origin
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    // Additional Helmet setups
    app.use(helmet.xssFilter());
    app.use(helmet.frameguard({ action: 'deny' }));
    app.use(helmet.hidePoweredBy());
    app.use(helmet.hsts({
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }));
    app.use(helmet.noSniff());
    app.use(helmet.referrerPolicy({ policy: 'same-origin' })); // Set referrer policy to 'same-origin'
};