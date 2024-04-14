// addTransaction.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json()); // for parsing application/json
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');  // Set EJS as the view engine
app.set('views', 'views');      // Specify the folder where the templates will be stored
app.use(express.static('public'));  // Serve static files from the 'public' directory
app.use(methodOverride('_method'));

//------------------MONGOOSE SETUP----------------//

// Connect to MongoDB
mongoose.connect('mongodb+srv://seeolee:XBh2ltYBT1zYpGVY@cluster0.ukutetu.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(port, () => console.log(`Server running on port ${port}`));

//Import MongoDB schema models
const Product = require('./models/Product');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');

//------------------------------------------------//

async function linkProductsToCategories() {
    // await connectDB();  // Ensure you're connected to the database

    const products = await Product.find();  // Fetch all products

    for (const product of products) {
        if (product.category) {  // Assuming product.category stores the category ID
            await Category.findByIdAndUpdate(
                product.category, 
                { $push: { products: product._id } },  // Add product ID to the category's products array
                { new: true, upsert: true }  // Create the field if it doesn't exist
            );
        }
    }

    console.log('Categories have been updated with product references.');
}

linkProductsToCategories().catch(console.error);
