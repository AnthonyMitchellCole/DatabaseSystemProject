const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'is invalid']  // Simple regex for email validation
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        enum: ['User', 'Editor', 'Admin'],
        default: 'User'
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    name: {
        type: String,
        required: [false, 'Name is optional']
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    emailVerificationToken: String,
    emailVerificationTokenExpires: Date,
    emailVerified: {
        type: Boolean,
        default: false
    },
    twoFAEnabled: { type: Boolean, default: false },
    twoFASecret: {
        type: String,
        required: false
    },
    qrCodeUrl: {
        type: String,
        required: false
    },
    qrCodeShow: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

// Method to check the entered password against the stored hash
userSchema.methods.isValidPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
