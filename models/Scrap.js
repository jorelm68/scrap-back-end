const mongoose = require('mongoose')
const Schema = mongoose.Schema

const scrap_schema = new Schema({
    author: String,
    title: String,
    description: String,
    prograph: String,
    retrograph: String,

    latitude: Number,
    longitude: Number,

    place: String,

    likes: [String],
    threads: [String],

    createdAt: Date,
}, { timestamps: true })

const Scrap = mongoose.model('Scrap', scrap_schema)

module.exports = Scrap