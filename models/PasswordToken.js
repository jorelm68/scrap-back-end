const mongoose = require('mongoose')
const Schema = mongoose.Schema

const passwordTokenSchema = new Schema({
    email: String,

    createdAt: Date,
    expirationDate: Date,
})

const PasswordToken = mongoose.model('PasswordToken', passwordTokenSchema)

module.exports = PasswordToken