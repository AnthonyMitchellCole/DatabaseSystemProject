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
const User = require('../models/User');
const SignupCode = require('../models/SignupCode');
const Activity = require('../models/Activity');
const ApiToken = require('../models/ApiToken');

module.exports = {
    Product,
    Category,
    Transaction,
    User,
    SignupCode,
    Activity,
    ApiToken
};
