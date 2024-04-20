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
    // console.log('Logging activity:', `${req.method} ${req.originalUrl}`);
    try {
        if (!req.user) return;  // Only log activities for authenticated users

        // console.log('All fields:', req.user.email, req.method, req.originalUrl, req.body, req.query);
        const activity = new Activity({
            user_id: req.user.email,  // Assuming the user object is stored in req.user
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