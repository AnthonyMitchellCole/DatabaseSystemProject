// models/ApiToken.js
const mongoose = require('mongoose');

const apiTokenSchema = new mongoose.Schema({
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: false },
    lastUsedAt: { type: Date, required: false },
}, { timestamps: true });

const ApiToken = mongoose.model('ApiToken', apiTokenSchema);

module.exports = ApiToken;