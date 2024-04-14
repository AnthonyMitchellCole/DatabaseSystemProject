//SignupCode.js
const mongoose = require('mongoose');

const signupCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: '24h' } // Optional: set code to expire after 24 hours
});

const SignupCode = mongoose.model('SignupCode', signupCodeSchema);

module.exports = SignupCode;
