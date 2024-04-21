//activityLogger.js
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const { checkAuthenticated, checkRole, roles } = require('./authConfig');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto'); // Node.js crypto module to generate random codes

const bcrypt = require('bcryptjs'); // Hashing passwords

// Date and time
const moment = require('moment-timezone');

// Import your initialization method from passport-config
const initializePassport = require('./passportConfig');
initializePassport(passport);
const Activity = require('../models/Activity'); // Adjust the path as necessary

async function logActivity(req) {
    //console.log(req);
    //console.log(req.headers);

    if (req.headers['authorization']) {
        const tokenString = req.headers['authorization'];
        var token = tokenString.split(' ')[1]; // Strip off the Bearer portion
        //console.log('Token:', token);
    }
    
    // console.log('Logging activity:', `${req.method} ${req.originalUrl}`);
    if (!req.user) {
        // console.log('No user to log activity for.');
        return;  // Optionally skip logging activities without a user
    }  

    try {  
         //console.log('All fields:', req.user.email, req.method, req.originalUrl, req.body, req.query);
        const activity = new Activity({
            user_id: req.user.email ? req.user.email : token ? token : 'No User',  // Assuming the user object is stored in req.user
            activity_type: `${req.method} ${req.originalUrl}`,
            details: {
                body: req.body.password ? { ...req.body, password: '***' } : req.body,
                queryParams: req.query
            }
        });
        // console.log('Activity:', activity);

        await activity.save();
        // console.log('Activity logged successfully');
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}
module.exports = (req, res, next) => {
    res.on('finish', () => logActivity(req));
    next();
};