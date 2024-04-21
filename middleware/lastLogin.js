// lastLogin.js

const User = require('../models/User');

function updateLastAccessed(req, res, next) {
    if (req.user) {
        User.findByIdAndUpdate(req.user._id, { lastLogin: Date.now() }, { new: true })
            .then(updatedUser => {
                // console.log("Updated last accessed time for user:", updatedUser.email, updatedUser.lastLogin);
                next();
            })
            .catch(err => {
                console.error("Error updating last accessed time:", err);
                next();
            });
    } else {
        next();
    }
}

module.exports = updateLastAccessed;
