//passport-config.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Assuming User model is imported
const User = require('../models/User');

// Function to get a user by email
function getUserByEmail(email) {
    return User.findOne({ email: email });
}

// Function to get a user by ID (needed for session management)
function getUserById(id) {
    return User.findById(id);
}

function initialize(passport) {
    const authenticateUser = async (email, password, done) => {
        const user = await getUserByEmail(email);  // Make sure to await here!
        if (user == null) {
            return done(null, false, { message: 'No user with that email' });
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Password incorrect' });
            }
        } catch (e) {
            return done(e);
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await getUserById(id); // Ensure you use await here!
            done(null, user);
        } catch (e) {
            done(e);
        }
    });
}

module.exports = initialize;