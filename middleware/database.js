// database.js
const mongoose = require('mongoose');

// Connect to MongoDB
// Connect to MongoDB with SSL
mongoose.connect(process.env.MONGO_URI, {
    ssl: true // Make sure to enable SSL
  })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));  

//Import MongoDB schema models
const Product = require('../models/Product');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const User = require('../models/User'); // Assuming User model is imported
const SignupCode = require('../models/SignupCode'); // Assuming the model file is in the same directory

module.exports = {
    Product,
    Category,
    Transaction,
    User,
    SignupCode
};
