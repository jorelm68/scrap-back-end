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

const handleAction = async (req, res, action) => {
    const {
        actionType,
        senderAuthor,
        senderBook,
        senderScrap,
        targetAuthor,
        targetBook,
        targetScrap,
    } = action

    if (actionType === 'sendRequest') {
        // author -> author
        const senderAuthorModel = await Author.findById(senderAuthor)

        await pushAction(req, res, [targetAuthor], action)
        await pushNotification(req, res, [targetAuthor], `${getName(senderAuthorModel)} sent you a friend request`)
    }
    else if (actionType === 'acceptRequest') {
        // author -> author
        const senderAuthorModel = await Author.findById(senderAuthor)

        await pushAction(req, res, [targetAuthor], action)
        await pushNotification(req, res, [targetAuthor], `${getName(senderAuthorModel)} accepted your friend request`)
    }
    else if (actionType === 'likeBook') {
        // author -> book
        const senderAuthorModel = await Author.findById(senderAuthor)
        const targetBookModel = await Book.findById(targetBook)

        await pushAction(req, res, [targetAuthor], action)
        await pushNotification(req, res, [targetAuthor], `${getName(senderAuthorModel)} liked your Book: ${formatBody(targetBookModel.title)}`)
    }
    else if (actionType === 'postBook') {
        // author -> book
        const senderAuthorModel = await Author.findById(senderAuthor)
        const targetBookModel = await Book.findById(targetBook)

        const acquaintances = getAcquaintances(senderAuthorModel)
        await pushAction(req, res, acquaintances, action)
        await pushNotification(req, res, acquaintances, `${getName(senderAuthorModel)} posted a new Book: ${formatBody(targetBookModel.title)}`)
    }
    else if (actionType === 'updateAutobiography') {
        // author -> author
        const senderAuthorModel = await Author.findById(senderAuthor)

        const friends = senderAuthorModel.friends
        await pushAction(req, res, friends, action)
        await pushNotification(req, res, friends, `${getName(senderAuthorModel)} uupdated their Autobiography: ${formatBody(senderAuthorModel.autobiography)}`)
    }
}
const formatBody = (body) => {
    return `${body.slice(0, 30)}${body.length > 30 ? '. . .' : ''}`
}
const getAcquaintances = (authorModel) => {
    const { friends, incomingFriendRequests, outgoingFriendRequests } = authorModel
    const acquaintances = [...friends, ...incomingFriendRequests, ...outgoingFriendRequests]
    return acquaintances
}
const pushAction = async (req, res, authors, action) => {
    const newAction = {
        ...action,
        createdAt: new Date(),
    }
    for (const author of authors) {
        const authorModel = await Author.findById(author)
        authorModel.actions.push(newAction._id)
        await authorModel.save()
    }
}
const pushNotification = async (req, res, authors, message) => {
    for (const author of authors) {
        const authorModel = await Author.findById(author)
        const pushToken = authorModel.pushToken
        await sendPushNotification(pushToken, message)
    }
}
const getName = (authorModel) => {
    const { firstName, lastName, pseudonym } = authorModel

    let name = `${firstName}${firstName && lastName ? ' ' : ''}${lastName}`
    if (!name) {
        name = pseudonym
    }

    return name
}
async function sendPushNotification(expoPushToken, body) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: 'Scrap-BETA',
        body,
        data: {
            icon: 'https://scrap-back-dcece16d1741.herokuapp.com/notification-icon',
        },
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    })
}
const formatDateToString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    const dateString = `${year}-${month}-${day} ${hour}:${minute}:${seconds}`
    return dateString
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

const handleS3Put = async (key, body) => {
    await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: body,
    }).promise()
}
const handleS3Get = async (key) => {
    return await s3.getObject({
        Bucket: bucketName,
        Key: key
    }).promise()
}
const handleS3Delete = async (key) => {
    await s3.deleteObject({
        Bucket: bucketName,
        Key: key
    }).promise()
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
    await Promise.all(deleteBooks)

    await Promise.all([
        // Delete the author id from any friends
        handleMongoFilter('Author', 'friends', _id),
        // Delete the author id from any incoming requests
        handleMongoFilter('Author', 'incomingFriendRequests', _id),
        // Delete the author id from any outgoing requests
        handleMongoFilter('Author', 'outgoingFriendRequests', _id),
        // Delete the author id from any books they may have liked
        handleMongoFilter('Book', 'likes', _id),
    ])

    // Delete the author document from MongoDB
    await Author.findOneAndDelete({ _id })
}
const deepDeleteBook = async (req, res, _id) => {
    const bookModel = await Book.findById(_id)

    if (!bookModel) {
        return handleError(res, 400, `Could not find book ${_id}`)
    }

    // Delete any action from any author that references the book id
    const deleteActions = []
    let actions = []
    Action.find({
        $or: [
            { senderBook: _id },
            { targetBook: _id }
        ]
    }, '_id', (err, action_ids) => {
        if (err) {
            handleError(res, 400, `Error finding actions associated with ${bookModel.title}`)
        } else {
            actions = action_ids
        }
    });
    for (const action of actions) {
        deleteActions.push(deepDeleteAction(req, res, action))
    }
    await Promise.all(deleteActions)

    await Promise.all([
        // Delete the book id from any scraps that thread it
        handleMongoFilter('Scrap', 'threads', _id),
        // Delete the book id from any author's libraries
        handleMongoFilter('Author', 'books', _id),
        // Delete the book id from any author's likedBooks array
        handleMongoFilter('Author', 'likedBooks', _id),
    ])

    // Delete the book from MongoDB
    await Book.findOneAndDelete({ _id })
}
const deepDeleteScrap = async (req, res, _id) => {
    const scrapModel = await Scrap.findById(_id)

    if (!scrapModel) {
        return handleError(res, 400, `Could not find scrap ${_id}`)
    }

    // Deep delete all actions associated with the scrap
    // Delete any action from any author that references the book id
    const deleteActions = []
    let actions = []
    Action.find({
        $or: [
            { senderScrap: _id },
            { targetScrap: _id }
        ]
    }, '_id', (err, action_ids) => {
        if (err) {
            handleError(res, 400, `Error finding actions associated with ${bookModel.title}`)
        } else {
            actions = action_ids
        }
    });
    for (const action of actions) {
        deleteActions.push(deepDeleteAction(req, res, action))
    }
    await Promise.all(deleteActions)

    // Remove the scrap from the author's headshot and cover if currently set
    const retrograph = scrapModel.retrograph
    const prograph = scrapModel.prograph
    const author = scrapModel.author
    const authorModel = Author.findById(author)
    if (authorModel.headshot === retrograph) {
        authorModel.headshot = ''
    }
    if (authorModel.cover === prograph) {
        authorModel.cover = ''
    }
    await authorModel.save()

    // Delete the scrap id from any book's cover
    await Book.updateMany(
        { $or: [{ cover: prograph }, { cover: retrograph }] },
        { $set: { cover: '' } }
    )

    // Delete the scrap from the book it is in
    const bookModel = Book.findById(scrapModel.book)
    bookModel.scraps.pull(_id)
    await bookModel.save()

    // Delete the scrap from the author's library
    authorModel.scraps.pull(_id)
    await authorModel.save()

    // Delete the Scrap's prograph and retrograph from AWS W3 storage
    handleS3Delete(`photos/${scrapModel.prograph}.jpg`)
    handleS3Delete(`photos/${scrapModel.retrograph}.jpg`)

    // Delete the scrap from mongodb
    await Scrap.findOneAndDelete({ _id })
}
const deepDeleteAction = async (req, res, _id) => {
    const actionModel = await Action.findById(_id)
    if (!actionModel) {
        return handleError(res, 400, `Could not find action ${_id}`)
    }

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
    handleAction,
    handleMongoVerifyPassword,
    handleMongoFilter,
    handleS3Put,
    handleS3Get,
    handleS3Delete,
    deepDeleteAuthor,
    deepDeleteBook,
    deepDeleteScrap,
}