const mongoose = require('mongoose')
const Schema = mongoose.Schema

const bookSchema = new Schema({
    author: String,
    title: String,
    description: String,
    isPublic: Boolean,
    miles: Number,
    
    beginDate: Date,
    endDate: Date,

    representative: String,

    likes: [String],
    scraps: [String],
    threads: [String],

    createdAt: Date,
})

const Book = mongoose.model('Book', bookSchema)

module.exports = Book