// /routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { checkAuthenticated, checkRole, roles } = require('../middleware/authConfig');
const { body, validationResult } = require('express-validator');

// Date and time
const moment = require('moment-timezone');

//Connect to MongoDB
const { Product, Category, Transaction, User, SignupCode } = require('../middleware/database');

router.get('/categories', checkAuthenticated, checkRole(['User']), async (req, res) => {
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
router.post('/categories', 
    checkAuthenticated, 
    checkRole(['Editor']), 
    [
        body('name').trim().isLength({ min: 1 }).withMessage('Category name is required.'),
        body('description').optional({ checkFalsy: true }).trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).render('layout', {
            title: `Add Category`,
            user: req.user,
            body: 'add-record',
            error: errors.array()[0].msg,
            type: 'category',
            moment: moment,
            categories: null,
            products: null,
            activePage: 'category'
          });
        }
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
router.post('/categories/:id', 
    checkAuthenticated, 
    checkRole(['Editor']), 
    [
        body('name').trim().isLength({ min: 1 }).withMessage('Category name is required.'),
        body('description').optional({ checkFalsy: true }).trim()
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('layout', {
                title: 'Edit Category',
                user: req.user,
                body: 'categories',
                error: errors.array()[0].msg,
                categories: await Category.find(),
                activePage: 'categories'
            });
        }
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
router.delete('/categories/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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

// Edit a category
router.get('/categories/edit/:id', checkAuthenticated, checkRole(['Editor']), async (req, res) => {
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
            activePage: 'categories',
            req: req
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;