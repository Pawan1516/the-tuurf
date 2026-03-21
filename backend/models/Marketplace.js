const mongoose = require('mongoose');

const marketplaceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Scorer', 'Umpire', 'Equipment', 'Coach'],
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // the owner of the listing
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Booked', 'Sold', 'Inactive'],
        default: 'Active'
    },
    price: {
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        rate: { type: String, enum: ['Per Match', 'Per Hour', 'Fixed', 'Negotiable'], default: 'Fixed' }
    },
    location: { // For equipment / services
        city: { type: String },
        area: { type: String }
    },
    images: [{
        url: { type: String }
    }],
    experience: { // For Coaches, Umpires, Scorers
        years: { type: Number },
        certifications: [{ type: String }]
    },
    condition: { // For equipment
        type: String,
        enum: ['New', 'Like New', 'Good', 'Fair', 'Poor']
    },
    contact_details: {
        phone: { type: String },
        email: { type: String }
    }
}, { timestamps: true });

const Marketplace = mongoose.model('Marketplace', marketplaceSchema);
module.exports = Marketplace;
