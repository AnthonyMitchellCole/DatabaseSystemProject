const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]  // Array of products
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
