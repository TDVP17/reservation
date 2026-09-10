const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    nomBus: {
        type: String,
        required: true,
    },
    immatriculation: {
        type: String,
        required: true,
        unique: true, // Doit être unique
    },
    nombrePlace: {
        type: Number,
        required: true,
    },
    duree: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    }
});

const Bus = mongoose.model('Bus', busSchema);
module.exports = Bus;
