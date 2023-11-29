const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')

const author_schema = new Schema({
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

    headshot: String,
    cover: String,

    first_name: String,
    last_name: String,
    autobiography: String,

    friends: [String],
    incoming_friend_requests: [String],
    outgoing_friend_requests: [String],
    blocked: [String],

    scraps: [String],
    books: [String],
    book_contributions: [String],

    liked_scraps: [String],
    liked_books: [String],

    actions: [String],

    push_token: String,

    created_at: Date,
})

author_schema.methods.comparePassword = async function (password) {
    bcrypt.compare(password, this.password)
}

const Author = mongoose.model('Author', author_schema);

module.exports = Author