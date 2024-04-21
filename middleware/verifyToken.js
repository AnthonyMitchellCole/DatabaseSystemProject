// middleware/verifyToken.js
const ApiToken = require('../models/ApiToken');

const verifyToken = async (req, res, next) => {
    try {
        const tokenString = req.headers['authorization'];
        if (!tokenString) return res.status(401).send('No token provided');

        const tokenRecord = await ApiToken.findOne({ token: tokenString });
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return res.status(401).send('Token is invalid or expired');
        }

        req.user = tokenRecord.user; // Assuming the user ID is stored in the token record
        next();
    } catch (err) {
        res.status(500).send('Internal server error');
    }
};

module.exports = verifyToken;
