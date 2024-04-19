const bodyParser = require('body-parser');
const express = require('express');
const methodOverride = require('method-override');
const useragent = require('express-useragent');
const cookieParser = require('cookie-parser');

module.exports = function(app) {
    console.log('Configuring middleware...');
    app.use(bodyParser.json()); // for parsing application/json
    app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
    app.set('view engine', 'ejs');  // Set EJS as the view engine
    app.set('views', 'views');      // Specify the folder where the templates will be stored
    app.use(express.static('public'));  // Serve static files from the 'public' directory
    app.use(methodOverride('_method'));
    app.use(useragent.express());
    app.use(cookieParser());

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err);
        const referer = req.headers.referer || '/';
        res.redirect(`${referer}?error=${encodeURIComponent('Internal Server Error')}`);
    });
    console.log('Middleware configured.');
};
