const mongoose = require('mongoose')
const Schema = mongoose.Schema

const scrapSchema = new Schema({
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

    createdAt: Date,
})

const Scrap = mongoose.model('Scrap', scrapSchema)

module.exports = Scrap