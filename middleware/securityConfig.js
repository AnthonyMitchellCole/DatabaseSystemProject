// securityConfig.js
const helmet = require('helmet');
const cors = require('cors');
const cspConfig = require('./cspConfig');
const crypto = require('crypto');

module.exports = function(app) {
    console.log('Configuring security settings...');
    
    // Set nonce for CSP
    app.use((req, res, next) => {
        res.locals.nonce = crypto.randomBytes(16).toString('base64');
        next();
    });

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
    console.log('Security settings configured.');
};