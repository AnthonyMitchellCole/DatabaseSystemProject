//authConfig.js
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');

// Import your initialization method from passport-config
const initializePassport = require('./passportConfig');
initializePassport(passport);

module.exports = function(app) {
    console.log('Configuring authentication...');
    // Setup express-session
    app.use(session({
        secret: process.env.SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
        cookie: {
            secure: process.env.NODE_ENV === 'production', // Ensure cookies are only sent over HTTPS
            httpOnly: true, // Ensure cookies are not accessible via client-side scripts
            sameSite: 'strict' // Strictly limit cookies to first party contexts
        }
    }));

    // Initialize Passport and restore authentication state, if any, from the session.
    app.use(passport.initialize());
    app.use(passport.session());

    // Use connect-flash for flash messages stored in session
    app.use(flash());
    console.log('Authentication configured.');
};

const roles = ['User', 'Editor', 'Admin'];  // Lower to higher roles, role hierarchy

// Function to check user authentication, should be used in any route that requires login 
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    if (req.accepts('html')) {
        return res.redirect(`/login?error=${encodeURIComponent('Please login.')}`);
    } else {
        return res.status(401).json({ error: 'Not authenticated' });
    }
}

// Function to check user role, should be placed in any route that has role limitations.
function checkRole(allowedRoles) {
    return function(req, res, next) {
        if (!req.isAuthenticated()) {
            if (req.accepts('html')) {
                return res.redirect(`/login?error=${encodeURIComponent('You are not authenticated.')}`);
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        const userRole = req.user.role;
        const userRoleIndex = roles.indexOf(userRole);
        const allowedRoleIndices = allowedRoles.map(role => roles.indexOf(role));

        const hasPermission = allowedRoleIndices.some(roleIndex => userRoleIndex >= roleIndex);
        if (hasPermission) {
            return next();
        } else {
            if (req.accepts('html')) {
                let backURL = req.header('Referer') || '/';
                let parsedUrl = new URL(backURL, `http://${req.headers.host}`);
                parsedUrl.searchParams.set('error', 'Insufficient permissions.');
                return res.redirect(parsedUrl.href);
            } else {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
        }
    };
}

module.exports.checkAuthenticated = checkAuthenticated;
module.exports.checkRole = checkRole;
module.exports.roles = roles;
