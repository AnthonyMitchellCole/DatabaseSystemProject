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
const useragent = require('express-useragent');
const moment = require('moment-timezone');
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
app.use(useragent.express());

//------------------MONGOOSE SETUP----------------//

// Connect to MongoDB
// Connect to MongoDB with SSL
mongoose.connect(process.env.MONGO_URI, {
    ssl: true // Make sure to enable SSL
  })
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));  

//Import MongoDB schema models
const Product = require('./models/Product');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const User = require('./models/User'); // Assuming User model is imported
const SignupCode = require('./models/SignupCode'); // Assuming the model file is in the same directory

//------------------------------------------------//

//------------------AUTHENTICATION MIDDLEWARE----------------//

// Import your initialization method from passport-config
const initializePassport = require('./passport-config');
initializePassport(passport);

// Setup express-session
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

// Use connect-flash for flash messages stored in session
app.use(flash());

//Function to check user authentication, should be used in any route that requires login 
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

var roles = ['User', 'Editor', 'Admin'];  // Lower to higher roles, role hierarchy
//Function to check user role, should be placed in any route that has role limitations. Should be run AFTER authentication
//Check if role is in passed list OR if role is simply of higher permissions
function checkRole(allowedRoles) {
    return function(req, res, next) {
        if (!req.isAuthenticated()) {
            // Decide the response type based on the Accept header or a specific flag
            if (req.accepts('html')) {
                return res.redirect(`/login?error=${encodeURIComponent('You are not authenticated.')}`);
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        const userRole = req.user.role;
        const userRoleIndex = roles.indexOf(userRole);
        const allowedRoleIndices = allowedRoles.map(role => roles.indexOf(role));

        // Check if the user's role index is high enough
        const hasPermission = allowedRoleIndices.some(roleIndex => userRoleIndex >= roleIndex);

        if (hasPermission) {
            return next();
        } else {
            if (req.accepts('html')) {
                // Modify the referrer URL to replace or add the error message
                let backURL = req.header('Referer') || '/';
                let parsedUrl = new URL(backURL, `http://${req.headers.host}`);
                parsedUrl.searchParams.delete('error'); // Remove existing error param if any
                parsedUrl.searchParams.append('error', 'Insufficient permissions.'); // Add new error message

                return res.redirect(parsedUrl.href);
            } else {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
        }
    };
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

// render login page:
app.get('/login', (req, res) => {
    const messages = req.flash('error');
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string
    res.render('login', { 
        messages,
        success: success,
        error: error
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
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string
    const code = req.query.code; //Capture any code from the query string
    res.render('register', {
        success: success,
        error: error,
        moment: moment,  // Pass moment to the view
        code: code
    }); // No need to generate a code here
});

app.post('/register', async (req, res) => {
    const { email, password, confirmPassword, signUpCode } = req.body;

    // Find and remove the signup code in one atomic operation
    const foundCode = await SignupCode.findOneAndDelete({ code: signUpCode });
    if (!foundCode) {
        return res.status(400).render('register', {
            error: "Invalid or expired Sign Up Code.",
            email: email
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).render('register', {
            error: "Passwords do not match.",
            email: email
        });
    }

    try {
        const role = 'User'; //registrations default to lowest permission level
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            email: email,
            password: hashedPassword,
            role: role
        });
        await newUser.save();
        res.redirect('/login?success=User Created');
    } catch (err) {
        console.error('Failed to create new user:', err);
        res.status(500).render('register', {
            error: "Failed to register user.",
            email: email
        });
    }
});

//------------------------------------------------//

//Test route. Do not enable in prod environment, this boi be wide open
// app.post('/', (req, res) => {
//     console.log("Test Successful.");
//     res.status(200);
//     res.send('Hello World!');
// });

//Render Index - activePage: 'home'
app.get('/', checkAuthenticated, checkRole(['User']), async (req, res) => {
    // Detect if the user is using a mobile device
    if (req.useragent.isMobile) {
        res.status(403).send("Access denied: This page is not yet optimized for mobile devices.");
        return;
    }

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
            moment: moment,  // Pass moment to the view
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
app.get('/products', checkAuthenticated, checkRole(['User']), async (req, res) => {
    try {
        let { sort_by, order } = req.query;
        // Default sorting behavior
        sort_by = sort_by || 'name'; // Default field to sort by
        order = order === 'desc' ? -1 : 1; // Default order

        const products = await Product.find()
            .populate('category')  // Populate the category of each product
            .populate({
                path: 'transactions',  // Populate transactions linked to the product
                populate: { path: 'product', model: 'Product' },  // Populate product details within each transaction
                options: { sort: { 'date': -1 } }  // Sort transactions by date descending
            })
            .sort({ [sort_by]: order }); // Apply dynamic sorting based on query parameters

        const success = req.query.success;  // Capture the success message from the query string
        const error = req.query.error;  // Capture the error message from the query string

        // Check if the request is an AJAX request
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.json({ products });
        }

        res.render('layout', {
            title: 'Product List',
            user: req.user,  // Pass the user object to your views
            body: 'products',
            products: products,
            moment: moment,  // Pass moment to the view
            activePage: 'products',
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(400).json({ error: 'Failed to load products.' });
        }
        res.status(400).render('error', { error: 'Failed to load products.' });
    }
});
  
// Add a new product
app.post('/products', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            moment: moment,  // Pass moment to the view
            type: 'product',
            categories: await Category.find(),
            activePage: 'product'  // Highlight the correct navbar item
        });
    }
});

// Update a product
app.post('/products/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
                moment: moment,  // Pass moment to the view
                products: await Product.find(),
                activePage: 'products',
                error: err.message  // Pass the error message to the view
        });
    }
});

// Delete a product
app.delete('/products/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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

app.get('/categories', checkAuthenticated, checkRole(['User']), async (req, res) => {
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
            moment: moment,  // Pass moment to the view
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
app.post('/categories', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
                moment: moment,  // Pass moment to the view
                categories: null,
                products: null,
                activePage: 'category'  // Passing the activePage variable to highlight the correct navbar item
            });
    }
});

// Update a category
app.post('/categories/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
                moment: moment,  // Pass moment to the view
                categories: await Category.find(),
                activePage: 'categories',
                error: err.message  // Pass the error message to the view
        });
    }
});

// Delete a category
app.delete('/categories/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
app.get('/transactions', checkAuthenticated, checkRole(['User']), async (req, res) => {
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
            moment: moment,  // Pass moment to the view
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
app.post('/transactions', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            moment: moment,  // Pass moment to the view
            activePage: 'transactions',
            products: await Product.find()
        });
    }
});

// Update a transaction
app.post('/transactions/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            moment: moment,  // Pass moment to the view
            activePage: 'transactions',
            error: err.message
        });
    }
});

// Delete a transaction
app.delete('/transactions/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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

//------------------CRUD OPERATIONS FOR USER---------------//

//Get all Users
app.get('/users', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string

    try {
        const users = await User.find();
        res.render('layout', { 
            title: 'User List', 
            body: 'users',
            users: users, 
            roles: roles,
            activePage: 'users',
            user: req.user, // Ensure that the user object is always passed to the view
            moment: moment,  // Pass moment to the view
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(400).render('error', { error: 'Failed to load users.', user: req.user }); // Pass user here too
    }
});

//ADD new user
app.post('/users', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        const newUser = new User({
            email: email,
            password: hashedPassword,
            role: role
        });

        await newUser.save();
        res.redirect(`/users?success=Added user successfully`);
    } catch (err) {
        console.error('Error adding user:', err);
        res.status(400).render('layout', {
            title: 'Add User',
            user: req.user, 
            body: 'add-record',
            error: err.message,
            roles: roles,
            moment: moment,  // Pass moment to the view
            type: 'user',
            activePage: 'users'
        });
    }
});

//UPDATE existing user
app.post('/users/:id', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            throw new Error('User not found');
        }

        user.email = req.body.email;
        user.role = req.body.role;
        
        // Only hash and update the password if it's actually provided
        if (req.body.password) {
            user.password = await bcrypt.hash(req.body.password, 10);
        }

        await user.save();
        res.redirect(`/users?success=User updated successfully`);
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(400).render('layout', {
            title: 'User List',
            user: req.user,
            body: 'users',
            roles: roles,
            users: await User.find(),
            activePage: 'users',
            error: err.message
        });
    }
});

//DELETE user
app.delete('/users/:id', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            throw new Error('User not found');
        }

        // Prevent user from deleting their own account
        if (userToDelete.id === req.user.id) {
            return res.status(403).json({ error: "You cannot delete your own account." });
        }

        // Ensure there are at least two users before deleting one
        const count = await User.countDocuments();
        if (count <= 1) {
            return res.status(403).json({ error: "Cannot delete the last user in the system." });
        }

        // Proceed with deletion if checks pass
        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(400).json({ error: err.message });
    }
});

//UPDATE USER VIA PROFILE EDITOR
// Route to handle the profile update
app.post('/update-profile', checkAuthenticated, checkRole(['User']), async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new Error('User not found');
        }
        user.email = email;
        if (password) {
            user.password = await bcrypt.hash(password, 10); // Hash new password
        }
        await user.save();
        res.redirect('/?success=Profile updated successfully');
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).render('layout', {
            title: 'Edit Profile',
            body: 'edit-profile',
            user: req.user,
            roles: roles,
            moment: moment,  // Pass moment to the view
            activePage: 'users',
            error: 'Failed to update profile.',
        });
    }
});


// Include routes for editing and deleting users, similar to the category CRUD operations

//------------------FRONTEND CRUD OPERATIONS---------------//

app.get('/add-record', checkAuthenticated, checkRole(['Editor']), (req, res) => {
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
                roles: roles,
                moment: moment,  // Pass moment to the view
                activePage  // Passing the activePage variable to highlight the correct navbar item
            });
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            res.status(400).send('Failed to load form data.');
        });
});

app.get('/products/edit/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            roles: roles,
            categories,
            products: [],
            moment: moment,  // Pass moment to the view
            activePage: 'products'  // Ensure this matches your navbar active logic
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/categories/edit/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            roles: roles,
            moment: moment,  // Pass moment to the view
            categories: await Category.find(),  // You might want to pass all categories for some reason
            products: [],
            activePage: 'categories'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/transactions/edit/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            roles: roles,
            moment: moment,  // Pass moment to the view
            categories: [], // Transactions typically don't need category data
            activePage: 'transactions'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/users/edit/:id', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            throw new Error('User not found');
        }
        res.render('layout', {
            title: 'Edit User',
            body: 'add-record', // Assume this EJS file is for the edit user form
            type: 'user',
            user: req.user,
            userData: user, // Pass the user data to be edited
            item: user,
            roles: roles,
            moment: moment,  // Pass moment to the view
            activePage: 'users'
        });
    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(400).render('error', { error: 'Failed to load user data.', user: req.user });
    }
});

app.post('/generate-signup-code', checkAuthenticated, checkRole(['Admin']), async (req, res) => {
    const newCode = new SignupCode({
        code: crypto.randomBytes(8).toString('hex')
    });

    try {
        await newCode.save();
        // Dynamically construct the full URL to the registration page with the code
        const registrationUrl = `${req.protocol}://${req.get('host')}/register?code=${newCode.code}`;
        res.redirect(`/users?success=New Sign Up Link Generated: <a href="${registrationUrl}">${registrationUrl}</a><br>This link will expire in 24 hours.`);
    } catch (err) {
        console.error('Error generating new signup code:', err);
        res.redirect('/users?error=Failed to generate new sign up code');
    }
});

// Route to serve the edit profile form
app.get('/edit-profile', checkAuthenticated, checkRole(['User']), (req, res) => {
    const success = req.query.success;  // Capture the success message from the query string
    const error = req.query.error;  // Capture the error message from the query string
    res.render('layout', {
        title: 'Edit Profile',
        body: 'edit-profile',
        user: req.user,
        roles: roles,
        moment: moment,  // Pass moment to the view
        activePage: 'users',
        success: success,
        error: error
    });
});


//------------------------------------------------//

//------------------REUSED FUNCTIONS---------------//



//------------------------------------------------//