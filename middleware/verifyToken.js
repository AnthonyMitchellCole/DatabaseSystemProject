// middleware/verifyToken.js
const ApiToken = require('../models/ApiToken');

const verifyToken = async (req, res, next) => {
    try {
        const tokenString = req.headers['authorization'];
        if (!tokenString) return res.status(401).send('No token provided');

        const token = tokenString.split(' ')[1]; // Strip off the Bearer portion
        const tokenRecord = await ApiToken.findOne({ token });
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            return res.status(401).send('Token is invalid or expired');
        }

        // req.user = tokenRecord.user; // Assuming the user ID is stored in the token record
        tokenRecord.lastUsedAt = new Date();
        await tokenRecord.save();
        next();
    } catch (err) {
        res.status(500).send('Internal server error');
    }
};

module.exports = verifyToken;
