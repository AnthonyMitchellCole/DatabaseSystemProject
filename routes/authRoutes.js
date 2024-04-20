// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const flash = require('connect-flash');
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');

const bcrypt = require('bcryptjs'); // Hashing passwords

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');

// POST route for user login
router.post('/login', //(req, res, next) => {console.log('login route'); next();},
    [
        body('email').isEmail().withMessage('Please enter a valid email address.'),
        body('password').notEmpty().withMessage('Password cannot be empty.')
    ],
    // (req, res, next) => {console.log('login route 2'); next();},
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true // Automatically use req.flash() to set flash message for failures
    }),
    // (req, res, next) => {console.log('login route 3'); next();},
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array().map(err => err.msg).join(' '));
            res.redirect('/login');
        }
    }
);

// GET route for rendering the login page
router.get('/login', (req, res) => {
    const messages = req.flash('error');
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string
    res.render('login', { 
        messages,
        success: success,
        error: error
    });
});

// GET route for logging out
router.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy();
        res.redirect('/login');
    });
});

// GET route for displaying the registration form
router.get('/register', (req, res) => {
    const success = req.query.success;
    const error = req.query.error;
    const code = req.query.code;
    res.render('register', {
        success: success,
        error: error,
        code: code
    });
});

// POST route for user registration
router.post('/register', 
    [
        body('email').isEmail().normalizeEmail().withMessage('Invalid email address.'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match.');
            }
            return true;
        }),
        body('signUpCode').trim().notEmpty().withMessage('Sign up code is required.'),
        body('name').trim().escape().notEmpty().withMessage('Name must be alphanumeric.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('register', {
                error: errors.array()[0].msg,
                email: req.body.email,
                code: req.body.signUpCode
            });
        }

        const { email, password, signUpCode, name } = req.body;
        const foundCode = await SignupCode.findOneAndDelete({ code: signUpCode });
        if (!foundCode) {
            return res.status(400).render('register', {
                error: "Invalid or expired Sign Up Code.",
                email: email,
                code: signUpCode,
                name: name
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
                email: email,
                password: hashedPassword,
                role: foundCode.role,
                name: name
            });
            await newUser.save();
            res.redirect('/login?success=User Created');
        } catch (err) {
            console.error('Failed to create new user:', err);
            res.status(500).render('register', {
                error: "Failed to register user.",
                email: email,
                code: signUpCode,
                name: name
            });
        }
    }
);

module.exports = router;
