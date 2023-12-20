const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')

const authorSchema = new Schema({
    pseudonym: {
        type: String,
        unique: true,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    activated: Boolean,

    headshotAndCover: String,

    firstName: String,
    lastName: String,
    autobiography: String,

    friends: [String],
    incomingFriendRequests: [String],
    outgoingFriendRequests: [String],

    scraps: [String],
    books: [String],
    bookContributions: [String],
    miles: Number,

    likedScraps: [String],
    likedBooks: [String],

    actions: [String],

    pushToken: String,

    createdAt: Date,
})

authorSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password)
}

const Author = mongoose.model('Author', authorSchema);

module.exports = Author