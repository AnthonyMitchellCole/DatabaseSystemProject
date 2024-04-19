// routes/homeRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const flash = require('connect-flash');
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto'); // Node.js crypto module to generate random codes

const bcrypt = require('bcryptjs'); // Hashing passwords

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');

//Render Index - activePage: 'home'
router.get('/', checkAuthenticated, checkRole(['User']), async (req, res) => {
    // Detect if the user is using a mobile device
    if (req.useragent.isMobile) {
        res.status(403).send("Access denied: This page is not yet optimized for mobile devices.");
        return;
    }

    try {
        const products = await Product.find().populate('category');
        const transactions = await Transaction.find().populate('product').limit(5).sort({date: -1});
        const productData = products.map(product => ({
            name: product.name,
            quantity: product.quantity
        }));

        res.render('layout', { 
            title: 'Home', 
            user: req.user,  // Add this line to pass the user object to your views
            body: 'index',
            products: products,
            productData: escape(JSON.stringify(productData)), // Properly escape JSON data
            transactions: transactions,
            moment: moment,  // Pass moment to the view
            success: req.query.success,
            error: req.query.error,
            activePage: 'home'
        });
    } catch (err) {
        console.error('Error fetching data for homepage:', err);
        res.status(400).render('error', { error: 'Failed to load home page data.' });
    }
});

router.get('/add-record', checkAuthenticated, checkRole(['Editor']), (req, res) => {
    const { type } = req.query;  // 'product', 'category', or 'transaction'

    // Determine the activePage based on the type
    let activePage = type;  // This assumes the type matches the navbar id you wish to activate

    // Initialize promises to fetch data
    let categoriesPromise = (type === 'product' || type === 'transaction') ? Category.find() : Promise.resolve([]);
    let productsPromise = (type === 'transaction') ? Product.find() : Promise.resolve([]);

    // Execute promises
    Promise.all([categoriesPromise, productsPromise])
        .then(([categories, products]) => {
            // console.log("Rendering add-record with type:", type);
            res.render('layout', {
                title: `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                user: req.user,  // Add this line to pass the user object to your views
                body: 'add-record',
                type,
                categories,
                products,
                roles: roles,
                moment: moment,  // Pass moment to the view
                activePage  // Passing the activePage variable to highlight the correct navbar item
            });
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            res.status(400).send('Failed to load form data.');
        });
});

//Test route. Do not enable in prod environment, this boi be wide open
// app.post('/', (req, res) => {
//     console.log("Test Successful.");
//     res.status(200);
//     res.send('Hello World!');
// });

module.exports = router; // Export the router for use in the application