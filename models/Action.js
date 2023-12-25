const mongoose = require('mongoose')
const Schema = mongoose.Schema

const actionSchema = new Schema({
    type: String,
    name: String,
    description: String,
    read: Boolean,

    sender: {
        author: String,
        book: String,
        scrap: String,
    },

    target: {
        author: String,
        book: String,
        scrap: String,
    },

    createdAt: Date,
})

const Action = mongoose.model('Action', actionSchema)

module.exports = Action