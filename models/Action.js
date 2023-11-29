const mongoose = require('mongoose')
const Schema = mongoose.Schema

const action_schema = new Schema({
    action_type: String,

    sender_author: String,
    sender_book: String,
    sender_scrap: String,

    target_author: String,
    target_book: String,
    target_scrap: String,

    createdAt: Date,
}, { timestamps: true })

const Action = mongoose.model('Action', action_schema)

module.exports = Action