const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    activity_type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;