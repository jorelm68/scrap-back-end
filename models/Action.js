const mongoose = require('mongoose')
const Schema = mongoose.Schema

const actionSchema = new Schema({
    actionType: String,

    senderAuthor: String,
    senderBook: String,
    senderScrap: String,

    targetAuthor: String,
    targetBook: String,
    targetScrap: String,

    createdAt: Date,
})

const Action = mongoose.model('Action', actionSchema)

module.exports = Action