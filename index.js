//index.js
try {
    // Core Node.js modules
    var fs = require('fs');
    var path = require('path');
    var crypto = require('crypto'); // Node.js crypto module to generate random codes

    // Environment configuration
    require('dotenv').config();

    // Express and middleware
    var express = require('express');

    // Session and authentication
    var passport = require('passport');

    // Security and validation
    var { body, validationResult } = require('express-validator');
    var bcrypt = require('bcryptjs'); // Hashing passwords

    // Date and time
    var moment = require('moment-timezone');
    moment.locale('en'); // Set the locale to English
    moment.updateLocale('en', {
        calendar: {
            lastDay: '[Yesterday]',
            sameDay: '[Today]',
            nextDay: '[Tomorrow]',
            lastWeek: '[Last] dddd',
            nextWeek: 'dddd',
            sameElse: 'L'
        }
    });
    // Set a default global format for dates
    moment.defaultFormat = 'DD MMM YYYY h:mm A';

    var app = express();
    var port = process.env.PORT || 3000;

    //Import logging configuration
    var configureLogging = require('./middleware/loggingConfig');
    configureLogging(app); // Apply logging configuration

    // Import middleware configuration
    var configureMiddleware = require('./middleware/middlewareConfig'); 
    configureMiddleware(app); // Apply middleware configuration

    // Import the security configuration
    var configureSecurity = require('./middleware/securityConfig');
    configureSecurity(app); // Apply security settings

    //Connect to MongoDB
    var { Product, Category, Transaction, User, SignupCode, Activity, ApiToken, ApiEvent } = require('./middleware/database');

    // Import the authentication configuration and middleware
    var authConfig = require('./middleware/authConfig');
    var { checkAuthenticated, checkRole, roles } = require('./middleware/authConfig');
    authConfig(app); // Apply the auth configuration

    // Import the verifyToken middleware
    var verifyToken = require('./middleware/verifyToken');

    app.set('trust proxy', 1); // Trust the first proxy

    var activityLogger = require('./middleware/activityLogger');
    app.use(activityLogger);  // Apply the activity logging middleware

    app.listen(port, () => console.log(`Server running on port ${port}`));
} catch (err) {

    console.error('Error on startup/config:', err);
    process.exit(1); // Exit the process if an error occurs

}

try {

    //Import the routes
    const homeRoutes = require('./routes/homeRoutes'); //Import the home routes
    const authRoutes = require('./routes/authRoutes'); //Import the auth routes
    const productRoutes = require('./routes/productRoutes'); //Import the product routes
    const categoryRoutes = require('./routes/categoryRoutes'); //Import the category routes
    const transactionRoutes = require('./routes/transactionRoutes'); //Import the transaction routes
    const userRoutes = require('./routes/userRoutes'); //Import the user routes
    const logRoutes = require('./routes/logRoutes'); //Import the log routes
    const apiRoutes = require('./routes/apiRoutes'); //Import the API routes

    // Use the routes
    app.use(homeRoutes);
    app.use(authRoutes);
    app.use(productRoutes);
    app.use(categoryRoutes);
    app.use(transactionRoutes);
    app.use(userRoutes);
    app.use(logRoutes);
    app.use('/api', apiRoutes); // Apply the verifyToken middleware to the API routes

} catch (err) {

    console.error('Error on routes:', err);
    if (process.env.NODE_ENV === 'development') {
        process.exit(1); // Exit the process if an error occurs
    }

}