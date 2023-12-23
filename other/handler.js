const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const Author = require('../models/Author')
const Action = require('../models/Action')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const ConfirmationToken = require('../models/ConfirmationToken')
const PasswordToken = require('../models/PasswordToken')
const AWS = require('aws-sdk')
const sharp = require('sharp')
const bucketName = process.env.BUCKET_NAME
const s3 = new AWS.S3({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

const handleError = (res, status, error) => {
    console.log('ERROR', error)
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
    console.log(data)
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
const handleMongoGet = async (req, res, modelName, id, key) => {
    const Model = mongoose.model(modelName)

    const model = await Model.findOne({ _id: id }, { [key]: 1 })

    if (!model) {
        return handleError(res, 404, `${modelName} was not found in the database`)
    }

    if (!(key in model)) {
        return handleError(res, 400, `${modelName} does not contain ${key}`)
    }

    return model[key]
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

const handleResize = async (buffer, size) => {
    let imageSize = parseInt(size, 10) || 1080 // Default size is 1080 if not provided or invalid

    // Resize the image using sharp
    const resizedImageBuffer = await sharp(buffer)
        .resize(imageSize, imageSize) // Resize to the desired size
        .toBuffer()

    return resizedImageBuffer
}

const deepDeleteAuthor = async (req, res, _id) => {
    const authorModel = await Author.findById(_id)

    if (!authorModel) {
        return handleError(res, 400, `Could not find author: "${_id}"`)
    }

    const scraps = authorModel.scraps
    const books = authorModel.books

    // Find all actions that reference the author
    const actions = await Action.find({
        $or: [
            { senderAuthor: _id },
            { targetAuthor: _id }
        ]
    }, '_id');

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

    // If necessary, delete the author's confirmation token
    await ConfirmationToken.deleteMany({ author: _id })

    // If necessary, delete any password reset token associated with the author
    await PasswordToken.deleteMany({ email: authorModel.email })

    // Delete the author document from MongoDB
    await Author.findOneAndDelete({ _id })
}
const deepDeleteBook = async (req, res, _id) => {
    const bookModel = await Book.findById(_id)

    if (!bookModel) {
        return handleError(res, 400, `Could not find book: "${_id}"`)
    }

    // Delete any action from any author that references the book id
    const deleteActions = []
    const actions = await Action.find({
        $or: [
            { senderBook: _id },
            { targetBook: _id }
        ]
    }, '_id');

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

    // Set the book's scraps' book to empty
    for (const scrap of bookModel.scraps) {
        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
        }

        scrapModel.book = ''
        await scrapModel.save()
    }

    // Delete the book from MongoDB
    await Book.findOneAndDelete({ _id })
}
const deepDeleteScrap = async (req, res, _id) => {
    const scrapModel = await Scrap.findById(_id)

    if (!scrapModel) {
        return handleError(res, 400, `scrap: "${_id}" doesn't exist`)
    }

    // Deep delete all actions associated with the scrap
    // Delete any action from any author that references the book id
    const deleteActions = []
    const actions = await Action.find({
        $or: [
            { senderScrap: _id },
            { targetScrap: _id }
        ]
    }, '_id');

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

    // Recalculate the miles traveled
    const coordinates = await getCoordinates(authorModel.scraps)
    const miles = await calculateMiles(coordinates)
    authorModel.miles = miles
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
        return handleError(res, 400, `Could not find action: "${_id}"`)
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

const sendEmail = async (req, res, email, subject, html) => {
    try {
        // Create a transporter using SMTP settings
        let transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        })

        // Email content
        let mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: subject,
            html: html,
        };

        // Send email
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return handleError(res, 400, `Error sending email: ${error}`)
            } else {
                return true
            }
        })
    } catch (error) {
        return handleError(res, 400, error)
    }
}

const handleScrapSort = async (scraps) => {
    let scrapDetails = [];

    // Fetch details for each scrap asynchronously
    for (const scrap of scraps) {
        try {
            const scrapModel = await Scrap.findById(scrap);
            if (scrapModel) {
                scrapDetails.push({
                    id: scrap,
                    createdAt: scrapModel.createdAt
                });
            }
        } catch (error) {
            console.error(`Error fetching details for scrap ID ${scrap}:`, error);
        }
    }

    // Sort the scrapDetails array by createdAt timestamp
    scrapDetails.sort((a, b) => a.createdAt - b.createdAt);

    // Extract only the IDs from the sorted scrapDetails
    const sortedIds = scrapDetails.map(scrap => scrap.id);

    return sortedIds;
}
const handleBookSort = async (books) => {
    let bookDetails = []

    // Fetch details for each book asynchronously
    for (const book of books) {
        try {
            const bookModel = await Book.findById(book)
            if (bookModel) {
                bookDetails.push({
                    id: book,
                    beginDate: bookModel.beginDate
                })
            }
        } catch (error) {
            console.error(`Error fetching details for book ID ${book}:`, error)
        }
    }

    // Sort the bookDetails array by beginDate timestamp
    bookDetails.sort((a, b) => a.beginDate - b.beginDate)

    // Extract only the IDs from the sorted bookDetails
    const sortedIds = bookDetails.map(book => book.id)

    return sortedIds
}

const getCoordinates = async (scraps) => {
    let coordinates = []
    for (const scrap of scraps) {
        const scrapModel = await Scrap.findById(scrap)

        coordinates.push({
            latitude: scrapModel.latitude,
            longitude: scrapModel.longitude,
        })
    }

    return coordinates
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180); // Difference in latitude in radians
    const dLon = (lon2 - lon1) * (Math.PI / 180); // Difference in longitude in radians
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
}
const calculateMiles = async (coordinates) => {
    let totalDistance = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const { latitude: lat1, longitude: lon1 } = coordinates[i];
        const { latitude: lat2, longitude: lon2 } = coordinates[i + 1];
        const distance = calculateDistance(lat1, lon1, lat2, lon2);
        totalDistance += distance;
    }

    // Convert total distance from kilometers to miles
    const totalMiles = totalDistance * 0.621371; // 1 kilometer = 0.621371 miles
    return totalMiles;
}

module.exports = {
    handleError,
    handleRequest,
    handleResponse,
    handleInputValidation,
    handleAction,
    handleMongoVerifyPassword,
    handleMongoFilter,
    handleMongoGet,
    handleS3Put,
    handleS3Get,
    handleS3Delete,
    handleResize,
    deepDeleteAuthor,
    deepDeleteBook,
    deepDeleteScrap,
    sendEmail,
    handleScrapSort,
    handleBookSort,
    getCoordinates,
    calculateMiles,
}