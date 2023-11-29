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
    location: String,

    likes: [String],
    threads: [String],

    created_at: Date,
})

const Scrap = mongoose.model('Scrap', scrap_schema)

module.exports = Scrap