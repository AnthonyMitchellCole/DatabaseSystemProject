// /routes/userRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const flash = require('connect-flash');
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto'); // Node.js crypto module to generate random codes
const speakeasy = require('speakeasy'); // Two-factor authentication
const QRCode = require('qrcode'); // QR Code generator

const bcrypt = require('bcryptjs'); // Hashing passwords

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');


//Get all Users
router.get('/users', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string

    try {
        const users = await User.find();
        res.render('layout', { 
            title: 'User List', 
            body: 'users',
            users: users, 
            roles: roles,
            activePage: 'users',
            user: req.user, // Ensure that the user object is always passed to the view
            moment: moment,  // Pass moment to the view
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(400).render('error', { error: 'Failed to load users.', user: req.user }); // Pass user here too
    }
});

//ADD new user
router.post('/users', 
    checkAuthenticated, 
    checkRole(['Admin']), 
    [
        body('email').isEmail().withMessage('Invalid email address.'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
        body('role').isIn(roles).withMessage('Invalid user role.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Add User',
                user: req.user,
                body: 'add-record',
                error: errors.array()[0].msg,
                roles: roles,
                moment: moment,
                type: 'user',
                activePage: 'users'
            });
        }
        const { email, password, role } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
            const newUser = new User({
                email: email,
                password: hashedPassword,
                role: role
            });

            await newUser.save();
            res.redirect(`/users?success=Added user successfully`);
        } catch (err) {
            console.error('Error adding user:', err);
            res.status(400).render('layout', {
                title: 'Add User',
                user: req.user, 
                body: 'add-record',
                error: err.message,
                roles: roles,
                moment: moment,  // Pass moment to the view
                type: 'user',
                activePage: 'users'
            });
        }
});

//UPDATE existing user
router.post('/users/:id', 
    checkAuthenticated, 
    checkRole(['Admin']), 
    [
        body('email').isEmail().withMessage('Invalid email address.'),
        body('role').isIn(['User', 'Editor', 'Admin']).withMessage('Invalid user role.'),
        body('name').optional({ checkFalsy: true }).isLength({ min: 1 }).withMessage('Name must be atleast 1 character.'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Edit User',
                user: req.user,
                body: 'users',
                error: errors.array()[0].msg,
                users: await User.find(),
                activePage: 'users'
            });
        }
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                throw new Error('User not found');
            }

            user.email = req.body.email;
            user.role = req.body.role;
            user.name = req.body.name ? req.body.name : user.name;
            
            // Only hash and update the password if it's actually provided
            if (req.body.password) {
                user.password = await bcrypt.hash(req.body.password, 10);
            }

            await user.save();
            res.redirect(`/users?success=User updated successfully`);
        } catch (err) {
            console.error('Error updating user:', err);
            res.status(400).render('layout', {
                title: 'User List',
                user: req.user,
                body: 'users',
                roles: roles,
                users: await User.find(),
                activePage: 'users',
                error: err.message
            });
        }
});

//DELETE user
router.delete('/users/:id', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            throw new Error('User not found');
        }

        // Prevent user from deleting their own account
        if (userToDelete.id === req.user.id) {
            return res.status(403).json({ error: "You cannot delete your own account." });
        }

        // Ensure there are at least two users before deleting one
        const count = await User.countDocuments();
        if (count <= 1) {
            return res.status(403).json({ error: "Cannot delete the last user in the system." });
        }

        // Proceed with deletion if checks pass
        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(400).json({ error: err.message });
    }
});

//UPDATE USER VIA PROFILE EDITOR
// Route to handle the profile update
router.post('/update-profile', 
    checkAuthenticated, 
    checkRole(['User']), 
    [
        body('email').isEmail().withMessage('Invalid email address.'),
        body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters long if specified.'),
        body('name').optional({ checkFalsy: true }).isLength({ min: 1 }).withMessage('Name must be at least 1 character.'),
        body('twoFactorEnabled').optional().custom((value) => {
            return ['on', undefined].includes(value);
        }).withMessage('Invalid two-factor authentication status.')        
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Edit Profile',
                body: 'edit-profile',
                user: req.user,
                error: errors.array()[0].msg,
                activePage: 'profile'
            });
        }
        const { email, password, name, twoFactorEnabled } = req.body;
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                throw new Error('User not found');
            }
            user.email = email;
            user.name = name;

            // Handle password change
            if (password) {
                user.password = await bcrypt.hash(password, 10);
            }

            // Handle 2FA setup
            if (req.body.twoFactorEnabled === 'on' && !user.twoFAEnabled) {
                // Generate a new 2FA secret and QR code because the user is enabling 2FA
                const secret = speakeasy.generateSecret({
                    name: 'Web Portal', // This is not required by Speakeasy but part of the URL setup
                    length: 20
                });
                const otpAuthUrl = speakeasy.otpauthURL({
                    secret: secret.ascii,
                    label: encodeURIComponent(`Web Portal:${user.email}`), // User's email or a unique identifier
                    issuer: 'Web Portal',
                    algorithm: 'sha1',
                    digits: 6,
                    period: 30
                });
                
                user.twoFAEnabled = true;
                user.twoFASecret = secret.base32;
                user.qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
            } else if (!req.body.twoFactorEnabled) {
                // Disable 2FA since the checkbox was not checked
                user.twoFAEnabled = false;
                user.twoFASecret = undefined;
                user.qrCodeUrl = undefined;
            }

            await user.save();
            res.redirect('/?success=Profile updated successfully');
        } catch (err) {
            console.error('Error updating user profile:', err);
            res.status(500).render('layout', {
                title: 'Edit Profile',
                body: 'edit-profile',
                user: req.user,
                roles: roles,
                moment: moment,  // Pass moment to the view
                activePage: 'users',
                error: 'Failed to update profile.',
            });
        }
});

router.get('/users/edit/:id', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            throw new Error('User not found');
        }
        res.render('layout', {
            title: 'Edit User',
            body: 'add-record', // Assume this EJS file is for the edit user form
            type: 'user',
            user: req.user,
            userData: user, // Pass the user data to be edited
            item: user,
            roles: roles,
            moment: moment,  // Pass moment to the view
            activePage: 'users'
        });
    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(400).render('error', { error: 'Failed to load user data.', user: req.user });
    }
});

// Route to serve the edit profile form
router.get('/edit-profile', checkAuthenticated, checkRole(['User']), (req, res) => {
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string
    res.render('layout', {
        title: 'Edit Profile',
        body: 'edit-profile',
        user: req.user,
        roles: roles,
        moment: moment,  // Pass moment to the view
        activePage: 'users',
        success: success,
        error: error
    });
});

router.post('/generate-signup-code', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const role = req.body.role;
    const newCode = new SignupCode({
        code: crypto.randomBytes(8).toString('hex'),
        role: role
    });

    try {
        await newCode.save();
        // Dynamically construct the full URL to the registration page with the code
        const registrationUrl = `${req.protocol}://${req.get('host')}/register?code=${newCode.code}`;
        res.redirect(`/users?success=New Sign Up Link Generated: <a href="${registrationUrl}">${registrationUrl}</a><br>This link will expire in 24 hours.`);
    } catch (err) {
        console.error('Error generating new signup code:', err);
        res.redirect('/users?error=Failed to generate new sign up code');
    }
});

router.post('/signup-code-selection', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string
    res.render('layout', {
        title: 'Generate Sign Up Code',
        body: 'generate-signup-code',
        user: req.user,
        roles: roles,
        moment: moment,  // Pass moment to the view
        activePage: 'users',
        success: success,
        error: error
    }); 
});

module.exports = router;