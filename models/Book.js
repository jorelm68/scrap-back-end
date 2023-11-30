const mongoose = require('mongoose')
const Schema = mongoose.Schema

const bookSchema = new Schema({
    author: String,
    title: String,
    description: String,
    cover: String,
    privacy: String,
    
    startDate: Date,
    endDate: Date,

    latitude: Number,
    longitude: Number,

    invites: [String],
    likes: [String],
    threads: [String],

    scraps: [String],

    createdAt: Date,
})

const Book = mongoose.model('Book', bookSchema)

module.exports = Book