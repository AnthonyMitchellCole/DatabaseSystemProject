// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const passport = require('passport');
const flash = require('connect-flash');
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { header, body, validationResult } = require('express-validator');
const verifyToken = require('../middleware/verifyToken');

const bcrypt = require('bcryptjs'); // Hashing passwords

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode, ApiToken, ApiEvent } = require('../middleware/database');

// Generate a token
router.post('/generate-token', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        console.log('Generating API token');
        console.log(req.body);
        const user = req.user; // Make sure you have user information available, usually from authentication middleware
        console.log(user.email);
        const name = req.body.name; // Capture the name from the request body
        console.log(name);

        // Generate a random token using crypto
        const token = crypto.randomBytes(30).toString('hex');

        // Set token expiration date, e.g., 30 days from now
        //const expiresAt = new Date(Date.now() + 30*24*60*60*1000);

        // Create a new token record in the database
        const newToken = await ApiToken.create({ 
            token, 
            user: user._id, 
            name: name,});
        
        if (req.accepts('html')) {
            res.redirect('/api/tokens?success=Token created successfully: ' + newToken.token);
        } else {
            res.json({ token: newToken.token, expiresAt: newToken.expiresAt });
        }
    } catch (err) {
        console.error('Error generating API token:', err);
        if (req.accepts('html')) {
            res.redirect('/api/tokens?error=Error generating API token');
        } else {
            res.json({ error: 'Error generating API token' });
        }
    }
});

//Get all Tokens
router.get('/tokens', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const success = req.query.success;  // Capture the success message from the query string
        const error = req.query.error;  // Capture the error message from the query string

        const tokens = await ApiToken.find()
            .populate('user')  // Populate the category of each product
            .sort({ createdAt: -1 }); // Apply dynamic sorting based on query parameters
        const users = await User.find();
        res.render('layout', { 
            title: 'API Tokens', 
            body: 'tokens',
            tokens: tokens, 
            users: users,
            roles: roles,
            activePage: 'api-tokens',
            user: req.user, // Ensure that the user object is always passed to the view
            moment: moment,  // Pass moment to the view
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching API tokens:', err);
        res.status(400).render('error', { error: 'Failed to load API tokens.', user: req.user }); // Pass user here too
    }
});

// DELETE route for revoking a token
router.delete('/revoke-token/:tokenId', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        console.log('Revoking token');
        const { tokenId } = req.params;
        console.log(tokenId);
        const token = await ApiToken.findById(tokenId);
        console.log(token.name);

        if (!token) {
            return res.status(404).json({ message: 'Token not found' });
        }

        await ApiToken.findByIdAndDelete(tokenId);
        res.json({ success: true, message: 'Token revoked successfully' });
    } catch (err) {
        console.error('Error revoking token:', err);
        res.status(500).json({ success: false, message: 'Failed to revoke token', error: err.message });
    }
});

// Route to handle the incoming webhook from System A
router.post('/webhook-system-a', verifyToken, [
    // Validate headers
    header('content-type').exists().withMessage('Content-Type header is required'),
    header('content-type').equals('application/json').withMessage('Content-Type must be application/json'),
    // Validate body as an object
    body().isObject().withMessage('Body should be a JSON object')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Create a new API event record with the received webhook details
        var newEvent = new ApiEvent({
            webhookReceived: {
                headers: req.headers,
                body: req.body,
                receivedAt: new Date()
            },
            status: 'pending'
        });

        // Save the event to the database
        await newEvent.save();

        // Send a response to acknowledge the receipt of the webhook
        res.status(200).json({ message: 'Webhook received successfully', eventId: newEvent._id });

        // Here you would continue the process
        // For example, making a call to System A to get more details
        // Then, updating the event with the details from System A
        // And finally, sending the remapped data to System B
        // Each step should update the APIEvent record with the new data

    } catch (err) {
        console.error('Error handling webhook from System A:', err);
        res.status(500).json({ message: 'Failed to handle webhook', error: err.message });
        newEvent.status = 'error';
        newEvent.errorMessage = err.message;
        await newEvent.save();
    }
});

// Route to view all API events
router.get('/events', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const success = req.query.success;  // Capture the success message from the query string
        const error = req.query.error;  // Capture the error message from the query string

        const events = await ApiEvent.find().sort({ createdAt: -1 });
        res.render('layout', {
            events: events,
            user: req.user,
            title: 'API Events',
            activePage: 'api-events',
            body: 'api-events',
            roles: roles,
            user: req.user, // Ensure that the user object is always passed to the view
            moment: moment,  // Pass moment to the view
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching API events:', err);
        res.status(500).render('error', { error: 'Failed to load API events.', user: req.user });
    }
});

// Route to fetch details of a specific event
router.get('/events/details/:eventId', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const event = await ApiEvent.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (err) {
        console.error('Error fetching event details:', err);
        res.status(500).json({ message: 'Failed to fetch event details', error: err.message });
    }
});

module.exports = router;