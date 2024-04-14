const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, required: true, enum: ['in', 'out'] },
    quantity: { type: Number, required: true },
    date: { type: Date, default: Date.now } // Ensure it handles both date and time
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
