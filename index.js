const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const crypto = require('crypto'); // Node.js crypto module to generate random codes
const bcrypt = require('bcryptjs'); // Ensure bcrypt is required at the top
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.set('view engine', 'ejs');  // Set EJS as the view engine
app.set('views', 'views');      // Specify the folder where the templates will be stored
app.use(express.static('public'));  // Serve static files from the 'public' directory
app.use(methodOverride('_method'));

//------------------MONGOOSE SETUP----------------//

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

//Import MongoDB schema models
const Product = require('./models/Product');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const User = require('./models/User'); // Assuming User model is imported

//------------------------------------------------//

//------------------AUTHENTICATION MIDDLEWARE----------------//

// Import your initialization method from passport-config
const initializePassport = require('./passport-config');
initializePassport(passport);

// Setup express-session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Use connect-flash for flash messages stored in session
app.use(flash());

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

//------------------------------------------------//

app.listen(port, () => console.log(`Server running on port ${port}`));

//------------------LOGIN AND LOGOUT---------------//

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true // Automatically use req.flash() to set flash message for failures
  })
);

// Then, in your route that renders the login form:
app.get('/login', (req, res) => {
    const messages = req.flash('error');
    const success = req.query.success;  // Capture the success message from the query string
    res.render('login', { 
        messages,
        success: success 
    });
});

app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(); // Optional: explicitly destroy session
        res.redirect('/login');
    });
});

// Route to display the registration form
app.get('/register', (req, res) => {
    // Generate a random 16-character alphanumeric code
    req.session.signUpCode = crypto.randomBytes(8).toString('hex');
    console.log("Sign Up Code:", req.session.signUpCode); // Log the code to the console

    res.render('register', { signUpCode: req.session.signUpCode });
});

// Route to handle the registration form submission
app.post('/register', async (req, res) => {
    const { email, password, confirmPassword, signUpCode } = req.body;
    
    // Check if the provided sign-up code matches the session code
    if (signUpCode !== req.session.signUpCode) {
        return res.status(400).render('register', { 
            error: "Invalid Sign Up Code.",
            email: email,
            signUpCode: req.session.signUpCode
        });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).render('register', {
            error: "Passwords do not match.",
            email: email,
            signUpCode: req.session.signUpCode
        });
    }

    // Hash password and create user
    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password with a salt round of 10
        const newUser = new User({
            email: email,
            password: hashedPassword
        });
        await newUser.save(); // Save the new user
        res.redirect('/login?success=User Created');
    } catch (err) {
        console.error('Failed to create new user:', err);
        res.status(500).render('register', {
            error: "Failed to register user.",
            email: email,
            signUpCode: req.session.signUpCode
        });
    }
});

//------------------------------------------------//

app.post('/', (req, res) => {
    console.log("Test Successful.");
    res.status(200);
    res.send('Hello World!');
});

//Render Index - activePage: 'home'
app.get('/', checkAuthenticated, async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        const transactions = await Transaction.find().populate('product').limit(5).sort({date: -1});
        const productData = products.map(product => ({
            name: product.name,
            quantity: product.quantity
        }));

        res.render('layout', { 
            title: 'Home', 
            user: req.user,  // Add this line to pass the user object to your views
            body: 'index',
            products: products,
            productData: escape(JSON.stringify(productData)), // Properly escape JSON data
            transactions: transactions,
            success: req.query.success,
            error: req.query.error,
            activePage: 'home'
        });
    } catch (err) {
        console.error('Error fetching data for homepage:', err);
        res.status(400).render('error', { error: 'Failed to load home page data.' });
    }
});


//------------------CRUD OPERATIONS FOR PRODUCT---------------//

// Get all products and handle a possible success message
app.get('/products', checkAuthenticated, async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category')  // Populate the category of each product
            .populate({
                path: 'transactions',  // Populate transactions linked to the product
                populate: { path: 'product', model: 'Product' },  // Populate product details within each transaction
                options: { sort: { 'date': -1 } }  // Sort transactions by date descending
            });

        const success = req.query.success;  // Capture the success message from the query string
        const error = req.query.error;  // Capture the error message from the query string

        res.render('layout', {
            title: 'Product List',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'products',
            products: products,
            activePage: 'products',
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(400).render('error', { error: 'Failed to load products.' });
    }
});
  
// Add a new product
app.post('/products', checkAuthenticated, async (req, res) => {
    const { name, description, price, quantity, category } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
        quantity: quantity ? quantity : 0,  // Default to 0 if no quantity is provided
        category
    });

    try {
        const savedProduct = await newProduct.save();
        if (category) {
            // Update the category with the new product's ID
            await Category.findByIdAndUpdate(category, {
                $push: { products: savedProduct._id }
            }, { new: true });
        }

        // console.log('Product added successfully:', savedProduct);
        res.redirect(`/products?success=${name} added successfully`);
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(400).render('layout', {
            title: 'Add Product',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'add-record',
            error: err.message,
            type: 'product',
            categories: await Category.find(),
            activePage: 'product'  // Highlight the correct navbar item
        });
    }
});

// Update a product
app.post('/products/:id', checkAuthenticated, async (req, res) => {
    // console.log(`Updating product with ID ${req.params.id}...`);
    try {
        var product = await Product.findById(req.params.id);
        if (!product) {
            throw new Error('Product not found');
        }

        // Update product details
        product.name = req.body.name;
        product.description = req.body.description;
        product.price = req.body.price;
        product.quantity = req.body.quantity ? req.body.quantity : 0;
        product.category = req.body.category;

        await product.save();
        // console.log('Product updated successfully:', product);
        res.redirect(`/products?success=${product.name} updated successfully`);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(400)
            .render('layout', { 
                title: 'Product List', 
                user: req.user,  // Add this line to pass the user object to your views
                body: 'products', 
                products: await Product.find(),
                activePage: 'products',
                error: err.message  // Pass the error message to the view
        });
    }
});

// Delete a product
app.delete('/products/:id', checkAuthenticated, async (req, res) => {
    try {
        var product = await Product.findById(req.params.id).populate('transactions');
        if (!product) {
            throw new Error(`${product.name} not found`);
        }

        // Check if the product has transactions
        if (product.transactions && product.transactions.length > 0) {
            throw new Error(`Cannot delete ${product.name} as it has ${product.transactions.length} transaction(s) associated with it.`);
        }

        // Remove product from the category
        if (product.category) {
            await Category.findByIdAndUpdate(product.category, { $pull: { products: req.params.id } });
        }

        // Delete the product
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: `${product.name} deleted successfully.` });
    } catch (err) {
        console.error(`Error deleting ${product.name}:`, err);
        res.status(400).json({ error: err.message });
    }
});

//------------------------------------------------//

//------------------CRUD OPERATIONS FOR CATEGORY---------------//

app.get('/categories', checkAuthenticated, async (req, res) => {
    try {
        // Assuming each category document contains an array of product IDs
        const categories = await Category.find().populate('products'); // 'products' should be the field in the Category schema that refers to products
        // console.log(`Found ${categories.length} categories.`);
        const success = req.query.success; 
        const error = req.query.error; 
        res.render('layout', { 
            title: 'Category List', 
            user: req.user,  // Add this line to pass the user object to your views
            body: 'categories', 
            categories: categories, 
            activePage: 'categories',
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(400).render('error', { error: 'Failed to load categories.' });
    }
});
  
// Add a new category
app.post('/categories', checkAuthenticated, async (req, res) => {
    // console.log('Adding new category:', req.body);
    const newCategory = new Category({
        name: req.body.name,
        description: req.body.description
    });

    try {
        await newCategory.save();
        // console.log('Category added successfully:', newCategory);
        res.redirect(`/categories?success=${req.body.name} added successfully`);
    } catch (err) {
        console.error('Error adding category:', err);
        res.status(400)
            .render('layout', {
                title: `Add Category`,
                user: req.user,  // Add this line to pass the user object to your views
                body: 'add-record',
                error: `${err.message}`,
                type: 'category',
                categories: null,
                products: null,
                activePage: 'category'  // Passing the activePage variable to highlight the correct navbar item
            });
    }
});

// Update a category
app.post('/categories/:id', checkAuthenticated, async (req, res) => {
    // console.log(`Updating category with ID ${req.params.id}...`);
    try {
        var category = await Category.findById(req.params.id);
        if (!category) {
            throw new Error('Category not found');
        }

        // Update category details
        category.name = req.body.name;
        category.description = req.body.description;

        await category.save();
        // console.log('Category updated successfully:', category);
        res.redirect(`/categories?success=${category.name} updated successfully`);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(400)
            .render('layout', { 
                title: 'Category List', 
                user: req.user,  // Add this line to pass the user object to your views
                body: 'categories', 
                categories: await Category.find(),
                activePage: 'categories',
                error: err.message  // Pass the error message to the view
        });
    }
});

// Delete a category
app.delete('/categories/:id', checkAuthenticated, async (req, res) => {
    try {
        var category = await Category.findById(req.params.id).populate('products');
        if (!category) {
            throw new Error(`${category.name} not found`);
        }

        // Check if the category has products
        if (category.products && category.products.length > 0) {
            throw new Error(`Cannot delete ${category.name} as it has ${category.products.length} product(s) associated with it.`);
        }

        // Delete the category
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: `${category.name} deleted successfully.` });
    } catch (err) {
        console.error(`Error deleting ${category.name}:`, err);
        res.status(400).json({ error: err.message });
    }
});

//------------------------------------------------//

//------------------CRUD OPERATIONS FOR TRANSACTION---------------//

// Get all transactions and handle a possible success message
app.get('/transactions', checkAuthenticated, async (req, res) => {
    try {
        const transactions = await Transaction.find().populate({
            path: 'product',
            populate: { path: 'category' } // Ensure the product's category is also fetched
        });
        const success = req.query.success;  // Capture the success message from the query string
        const error = req.query.error;  // Capture the error message from the query string
        res.render('layout', { 
            title: 'Transaction List', 
            user: req.user,  // Add this line to pass the user object to your views
            body: 'transactions',
            transactions: transactions,
            activePage: 'transactions',
            success: success,  // Pass the success message to the view
            error: error  // Pass the error message to the view
        });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(400).render('error', { error: 'Failed to load transactions.' });
    }
});
  
// Add a new transaction
app.post('/transactions', checkAuthenticated, async (req, res) => {
    const { product, type, quantity } = req.body;
    const numericQuantity = +quantity; // Convert quantity to a number

    try {
        const foundProduct = await Product.findById(product);
        if (!foundProduct) {
            throw new Error('Product not found');
        }

        if (type === 'out' && numericQuantity > foundProduct.quantity) {
            throw new Error('Insufficient stock to complete transaction');
        }

        const newTransaction = new Transaction({
            product,
            type,
            quantity: numericQuantity,
            date: req.body.date || new Date()
        });

        await newTransaction.save();

        if (type === 'in') {
            foundProduct.quantity += numericQuantity;
        } else if (type === 'out') {
            foundProduct.quantity -= numericQuantity;
        }

        foundProduct.transactions.push(newTransaction._id);
        await foundProduct.save();

        res.redirect(`/transactions?success=${type.toUpperCase()} transaction added and ${foundProduct.name} quantity updated`);
    } catch (err) {
        console.error('Error processing transaction:', err);
        const transactions = await Transaction.find().populate('product'); // Fetch all transactions with product details
        res.status(400).render('layout', {
            title: 'Transaction List',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'transactions',
            error: err.message,
            transactions: transactions,
            activePage: 'transactions',
            products: await Product.find()
        });
    }
});

// Update a transaction
app.post('/transactions/:id', checkAuthenticated, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('product');
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        const product = transaction.product;
        const oldQuantity = +transaction.quantity;
        const newQuantity = +req.body.quantity;
        const newType = req.body.type;

        if (transaction.type === 'in') {
            product.quantity -= oldQuantity;
        } else if (transaction.type === 'out') {
            product.quantity += oldQuantity;
        }

        // Check if the new transaction details are valid
        if (newType === 'out' && newQuantity > product.quantity) {
            throw new Error('Insufficient stock to complete transaction update');
        }

        transaction.product = req.body.product;
        transaction.type = newType;
        transaction.quantity = newQuantity;
        transaction.date = req.body.date;

        if (newType === 'in') {
            product.quantity += newQuantity;
        } else if (newType === 'out') {
            product.quantity -= newQuantity;
        }

        await product.save();
        await transaction.save();
        res.redirect(`/transactions?success=Transaction updated successfully and product adjusted!`);
    } catch (err) {
        console.error('Error updating transaction:', err);
        res.status(400).render('layout', {
            title: 'Transaction List',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'transactions',
            transactions: await Transaction.find().populate('product'),
            products: await Product.find(),
            activePage: 'transactions',
            error: err.message
        });
    }
});

// Delete a transaction
app.delete('/transactions/:id', checkAuthenticated, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('product');
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        const product = transaction.product;
        const quantityToReverse = transaction.quantity;

        // Check if reversing the transaction is valid
        if (transaction.type === 'out' && product.quantity + quantityToReverse < 0) {
            throw new Error('Reversing this transaction would result in negative stock levels');
        }

        if (transaction.type === 'in') {
            product.quantity -= quantityToReverse;
        } else if (transaction.type === 'out') {
            product.quantity += quantityToReverse;
        }

        await product.save();
        await Product.findByIdAndUpdate(product._id, { $pull: { transactions: req.params.id } });
        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Transaction deleted and product updated!' });
    } catch (err) {
        console.error('Error handling transaction deletion:', err);
        res.status(400).json({ error: err.message });
    }
});

//------------------------------------------------//

//------------------FRONTEND CRUD OPERATIONS---------------//

app.get('/add-record', checkAuthenticated, (req, res) => {
    const { type } = req.query;  // 'product', 'category', or 'transaction'

    // Determine the activePage based on the type
    let activePage = type;  // This assumes the type matches the navbar id you wish to activate

    // Initialize promises to fetch data
    let categoriesPromise = (type === 'product' || type === 'transaction') ? Category.find() : Promise.resolve([]);
    let productsPromise = (type === 'transaction') ? Product.find() : Promise.resolve([]);

    // Execute promises
    Promise.all([categoriesPromise, productsPromise])
        .then(([categories, products]) => {
            // console.log("Rendering add-record with type:", type);
            res.render('layout', {
                title: `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                user: req.user,  // Add this line to pass the user object to your views
                body: 'add-record',
                type,
                categories,
                products,
                activePage  // Passing the activePage variable to highlight the correct navbar item
            });
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            res.status(400).send('Failed to load form data.');
        });
});

app.get('/products/edit/:id', checkAuthenticated, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        const categories = await Category.find();
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('layout', {
            title: 'Edit Product',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'add-record',
            type: 'product',
            item: product,
            categories,
            products: [],
            activePage: 'products'  // Ensure this matches your navbar active logic
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/categories/edit/:id', checkAuthenticated, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send('Category not found');
        }
        res.render('layout', {
            title: 'Edit Category',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'add-record',
            type: 'category',
            item: category,
            categories: await Category.find(),  // You might want to pass all categories for some reason
            products: [],
            activePage: 'categories'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/transactions/edit/:id', checkAuthenticated, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('product');
        const products = await Product.find();
        if (!transaction) {
            return res.status(404).send('Transaction not found');
        }
        res.render('layout', {
            title: 'Edit Transaction',
            user: req.user,  // Add this line to pass the user object to your views
            body: 'add-record',
            type: 'transaction',
            item: transaction,
            products,
            categories: [], // Transactions typically don't need category data
            activePage: 'transactions'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

//------------------------------------------------//

//------------------REUSED FUNCTIONS---------------//



//------------------------------------------------//