// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const flash = require('connect-flash');
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');
const speakeasy = require('speakeasy'); // Two-factor authentication
const QRCode = require('qrcode'); // QR Code generator

const bcrypt = require('bcryptjs'); // Hashing passwords

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');

// POST route for user login
// POST route for user login
router.post('/login',
    [
        body('email').isEmail().withMessage('Please enter a valid email address.'),
        body('password').notEmpty().withMessage('Password cannot be empty.')
    ],
    passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
    (req, res, next) => {
        // Check if 2FA is enabled for the user
        if (req.user.twoFAEnabled) {
            // Redirect to a new page where they can enter their OTP
            res.redirect('/enter-otp');
        } else {
            res.redirect('/');
        }
    }
);

// GET route for entering OTP
router.get('/enter-otp', checkAuthenticated, (req, res) => {
    res.render('enter-otp', {
        user: req.user,
        message: req.flash('error')
    });
});

// POST route for verifying OTP
router.post('/verify-otp', checkAuthenticated, (req, res) => {
    const { token } = req.body;

    const verified = speakeasy.totp.verify({
        secret: req.user.twoFASecret,
        encoding: 'base32',
        token: token,
        window: 1
    });

    if (verified) {
        req.session.authenticated = true; // Confirm that the session is fully authenticated
        res.redirect('/');
    } else {
        req.flash('error', 'Invalid OTP');
        res.redirect('/enter-otp');
    }
});

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
        console.log('Registering new user...');
        var { email, password, signUpCode, name } = req.body;
        console.log('Email:', email);   
        var foundCode = await SignupCode.findOne({ code: signUpCode });
        console.log('Found Code:', foundCode);
        if (!foundCode) {
            return res.status(400).render('register', {
                error: "Invalid or expired Sign Up Code.",
                email: email,
                code: signUpCode,
                name: name
            });
        }
        console.log('Creating new user...');
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
                email: email,
                password: hashedPassword,
                role: foundCode.role,
                name: name
            });
            try {
                console.log('Saving new user...');
                await newUser.save();
            } catch (error) {
                if (error.code === 11000) {
                    console.log('User with that email already exists.');
                    return res.status(400).render('register', {
                        error: "User with that email already exists.",
                        email: email,
                        code: signUpCode,
                        name: name
                    });
                } else {
                    console.error('Failed to register new user:', err);
                    return res.status(500).render('register', {
                        error: "Failed to register user.",
                        email: email,
                        code: signUpCode,
                        name: name
                    });
                }
            }
            res.redirect('/login?success=User Created');
            try {
                console.log('Deleting Sign Up Code...');
                await SignupCode.deleteOne({ code: signUpCode });
            } catch (err) {
                console.error('Failed to delete Sign Up Code:', err);
            }
        } catch (err) {
            if (error.code === 11000) {
                console.log('User with that email already exists.');
                return res.status(400).render('register', {
                    error: "User with that email already exists.",
                    email: email,
                    code: signUpCode,
                    name: name
                });
            } else {
                console.error('Failed to register new user:', err);
                return res.status(500).render('register', {
                    error: "Failed to register user.",
                    email: email,
                    code: signUpCode,
                    name: name
                });
            }
        }
    }
);

module.exports = router;
