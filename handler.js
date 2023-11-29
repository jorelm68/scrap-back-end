const mongoose = require('mongoose')
const Author = require('../models/Author')
const Action = require('../models/Action')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const AWS = require('aws-sdk')
const sharp = require('sharp')
const bucketName = process.env.BUCKET_NAME
const s3 = new AWS.S3({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

const handleError = (res, status, error) => {
    res.status(status)
    throw new Error(error)
}
const handleRequest = async (req, res, code) => {
    try {
        await code(req, res)
    } catch (error) {
        // Check if the status code has been set before
        if (!res.statusCode) {
            res.status(500).json({ error: error.message, data: null })
        }
        res.json({ error: error.message, data: null })
    }
}
const handleResponse = async (res, data) => {
    return res.status(200).json(data)
}
const handleInputValidation = async (req, res, checks, validationResult) => {
    // Apply input validation and sanitization rules
    await Promise.all(checks.map((validation) => validation.run(req)))

    // Check for validation errors
    const errors = validationResult(req)
    let errorMessage = ''
    for (const error of errors.errors) {
        errorMessage += `${error.value} is not a valid ${error.path}, `
    }
    if (!errors.isEmpty()) {
        return handleError(res, 400, errorMessage)
    }
}

const handleCreateAuthor = async (author) => {
    const authorModel = await Author.create(author)
    await authorModel.save()

    return authorModel._id
}

const handleMongoVerifyPassword = async (_id, password) => {
    const authorModel = await Author.findById(_id)
    return authorModel && await authorModel.comparePassword(password)
}
const handleMongoFilter = async (modelName, key, value) => {
    const Model = mongoose.model(modelName)

    await Model.updateMany(
        { [key]: { $in: [value] } },
        { $pull: { [key]: value } }
    )
}

const deepDeleteAuthor = async (req, res, _id) => {
    const authorModel = await Author.findById(_id)

    if (!authorModel) {
        return handleError(res, 400, `Could not find author ${_id}`)
    }

    const scraps = authorModel.scraps
    const books = authorModel.books

    // Find all actions that reference the author
    let actions = []
    Action.find({
        $or: [
            { senderAuthor: _id },
            { targetAuthor: _id }
        ]
    }, '_id', (err, action_ids) => {
        if (err) {
            handleError(res, 400, `Error finding actions associated with ${authorModel.pseudonym}`)
        } else {
            actions = action_ids
        }
    });

    // Delete any Action from any author that references the author
    const deleteActions = []
    for (const action of actions) {
        deleteActions.push(deepDeleteAction(req, res, action))
    }
    await Promise.all(deleteActions)

    // Deep delete all the author's scraps
    const deleteScraps = []
    for (const scrap of scraps) {
        deleteScraps.push(deepDeleteScrap(req, res, scrap))
    }
    await Promise.all(deleteScraps)

    // Deep delete all the author's books
    const deleteBooks = []
    for (const book of books) {
        deleteBooks.push(deepDeleteBook(req, res, book))
    }

    await Promise.all([
        // Delete the author id from any friends
        handleMongoFilter('Author', 'friends', _id),
        handleMongoFilter('Author', 'incomingFriendRequests', _id),
        handleMongoFilter('Author', 'outgoingFriendRequests', _id),
        handleMongoFilter('Book', 'likes', _id),
    ])
    await Promise.all(deleteBooks)
}
const deepDeleteBook = async (req, res, _id) => {
    const bookModel = await Book.findById(_id)
    const scraps = bookModel.scraps
}
const deepDeleteScrap = async (req, res, _id) => {
    const scrapModel = await Scrap.findById(_id)
}
const deepDeleteAction = async (req, res, _id) => {
    const actionModel = await Action.findById(_id)

    // Find the authors associated with the exchange
    const senderAuthor = actionModel.senderAuthor
    const targetAuthor = actionModel.targetAuthor

    // Remove the action from each author's actions array
    Author.updateOne({ _id: senderAuthor }, { $pull: { actions: _id } })
    Author.updateOne({ _id: targetAuthor }, { $pull: { actions: _id } })

    // Delete the action itself from the database
    Action.deleteOne({ _id })
}

module.exports = {
    handleError,
    handleRequest,
    handleResponse,
    handleInputValidation,
    handleCreateAuthor,
    handleMongoVerifyPassword,
    handleMongoFilter,
    deepDeleteAuthor,
    deepDeleteBook,
    deepDeleteScrap,
}