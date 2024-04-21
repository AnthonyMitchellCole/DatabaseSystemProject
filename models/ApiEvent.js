//ApiEvent model
const mongoose = require('mongoose');

const apiEventSchema = new mongoose.Schema({
    webhookReceived: {
        headers: Map,
        body: mongoose.Schema.Types.Mixed,
        receivedAt: { type: Date, default: Date.now },
    },
    requestToSystemA: {
        headers: Map,
        body: mongoose.Schema.Types.Mixed,
        sentAt: { type: Date, default: Date.now },
    },
    responseFromSystemA: {
        headers: Map,
        body: mongoose.Schema.Types.Mixed,
        receivedAt: { type: Date, default: Date.now },
    },
    requestToSystemB: {
        headers: Map,
        body: mongoose.Schema.Types.Mixed,
        sentAt: { type: Date, default: Date.now },
    },
    responseFromSystemB: {
        headers: Map,
        body: mongoose.Schema.Types.Mixed,
        receivedAt: { type: Date, default: Date.now },
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'error'],
        default: 'pending',
    },
    errorMessage: String,
}, { timestamps: true });

const APIEvent = mongoose.model('APIEvent', apiEventSchema);

module.exports = APIEvent;
