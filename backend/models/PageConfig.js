const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    content: { type: String },
    icon: { type: String },
    isActive: { type: Boolean, default: true }
});

const pageConfigSchema = new mongoose.Schema({
    pageName: { type: String, required: true, unique: true }, // e.g. 'home'
    
    hero: {
        title: { type: String, default: 'Feel Free Play Better' },
        highlight: { type: String, default: 'Play Better' },
        subtext: { type: String, default: 'Select your squad. Lock your slot' },
        images: [{ type: String }],
        buttonText: { type: String, default: 'Book Now' }
    },

    stats: [{
        label: { type: String },
        value: { type: String },
        icon: { type: String }
    }],

    features: [sectionSchema],

    about: {
        title: { type: String, default: 'The Turf Miyapur' },
        description: { type: String },
        image: { type: String },
        tags: [String]
    },

    announcement: {
        text: { type: String },
        isActive: { type: Boolean, default: false },
        link: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('PageConfig', pageConfigSchema);
