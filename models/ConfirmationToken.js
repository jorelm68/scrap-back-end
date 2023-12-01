const mongoose = require('mongoose')
const Schema = mongoose.Schema

const confirmationTokenSchema = new Schema({
    author: String,
})

const ConfirmationToken = mongoose.model('ConfirmationToken', confirmationTokenSchema)

module.exports = ConfirmationToken