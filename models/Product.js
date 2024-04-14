const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]  // Array of transaction IDs
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
