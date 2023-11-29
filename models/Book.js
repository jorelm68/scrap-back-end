const mongoose = require('mongoose')
const Schema = mongoose.Schema

const book_schema = new Schema({
    author: String,
    title: String,
    description: String,
    cover: String,
    privacy: String,
    
    start_date: Date,
    end_date: Date,

    latitude: Number,
    longitude: Number,

    invites: [String],
    likes: [String],
    threads: [String],

    scraps: [{
        scrap: String,
        threads: [String],
    }],

    created_at: Date,
})

const Book = mongoose.model('Book', book_schema)

module.exports = Book