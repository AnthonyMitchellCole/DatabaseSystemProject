// /routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');

router.get('/transactions', checkAuthenticated, checkRole(['User']), async (req, res) => {
    try {
        let { sort_by, order } = req.query;
        // Ensure valid sorting parameters
        const validSortFields = ['date', 'quantity', 'type', 'product.name']; // Assume product.name sorting is handled differently
        if (!validSortFields.includes(sort_by)) {
            sort_by = 'date'; // Default field to sort by
        }
        order = order === 'desc' ? 1 : -1; // Convert order string to MongoDB sort order

        // Adjust sorting for embedded document fields
        let sortOptions = { [sort_by]: order };
        if (sort_by === 'product.name') {
            sortOptions = { 'product.name': order }; // Adjust if using a path in a populated document
        }

        const transactions = await Transaction.find()
            .populate({
                path: 'product',
                populate: { path: 'category' }
            })
            .sort(sortOptions);

        const success = req.query.success;
        const error = req.query.error;

        if (req.xhr || req.headers.accept.includes('json')) {
            return res.json({ transactions });
        }

        res.render('layout', { 
            title: 'Transaction List',
            user: req.user,
            body: 'transactions',
            transactions: transactions,
            moment: moment,
            activePage: 'transactions',
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(400).json({ error: 'Failed to load transactions.' });
        }
        res.status(400).render('error', { error: 'Failed to load transactions.' });
    }
});

// Add a new transaction
router.post('/transactions', 
    checkAuthenticated, 
    checkRole(['Editor']), 
    [
        body('product').isMongoId().withMessage('Invalid product ID.'),
        body('type').isIn(['in', 'out']).withMessage('Invalid transaction type. Choose either "in" or "out".'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Transaction List',
                user: req.user,
                body: 'transactions',
                error: errors.array()[0].msg,
                transactions: await Transaction.find().populate('product'),
                moment: moment,
                activePage: 'transactions',
                products: await Product.find()
            });
        }
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
router.post('/transactions/:id', 
    checkAuthenticated, 
    checkRole(['Editor']), 
    [
        body('product').isMongoId().withMessage('Invalid product ID.'),
        body('type').isIn(['in', 'out']).withMessage('Invalid transaction type. Choose either "in" or "out".'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer.')
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Edit Transaction',
                user: req.user,
                body: 'transactions',
                error: errors.array()[0].msg,
                transactions: await Transaction.find().populate('product'),
                activePage: 'transactions'
            });
        }
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
router.delete('/transactions/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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

router.get('/transactions/edit/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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

module.exports = router;