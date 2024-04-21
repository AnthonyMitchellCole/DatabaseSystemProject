// /routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');

// Get all products and handle a possible success message
router.get('/products', checkAuthenticated, checkRole(['User']), async (req, res) => {
    try {
        let { sort_by, order } = req.query;
        // Default sorting behavior
        sort_by = sort_by || 'updatedAt'; // Default field to sort by
        order = order === 'desc' ? 1 : -1; // Default order

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
router.post('/products', 
    checkAuthenticated, 
    checkRole(['Editor']), 
    [
        body('name').trim().isLength({ min: 1 }).withMessage('Product name is required.'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('quantity').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),
        body('description').optional({ checkFalsy: true }).trim(),
        body('category').isMongoId().withMessage('Invalid category ID.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Add Product',
                user: req.user,
                body: 'add-record',
                error: errors.array()[0].msg,
                moment: moment,
                type: 'product',
                categories: await Category.find(),
                activePage: 'product'
            });
        }

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
router.post('/products/:id', 
    checkAuthenticated, 
    checkRole(['Editor']), 
    [
        body('name').trim().isLength({ min: 1 }).withMessage('Product name is required.'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('quantity').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),
        body('description').optional({ checkFalsy: true }).trim(),
        body('category').isMongoId().withMessage('Invalid category ID.')
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Edit Product',
                user: req.user,
                body: 'products',
                error: errors.array()[0].msg,
                products: await Product.find(),
                activePage: 'products'
            });
        }
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
router.delete('/products/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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

router.get('/products/edit/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            activePage: 'products',  // Ensure this matches your navbar active logic
            req: req
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;