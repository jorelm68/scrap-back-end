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

const recalculateBookMiles = async (bookModel) => {
    if (bookModel) {
        const coordinates = await getCoordinates(bookModel.scraps)
        const miles = await calculateMiles(coordinates)
        bookModel.miles = miles
        await bookModel.save()
    }
}
const recalculateAuthorMiles = async (authorModel) => {
    if (authorModel) {
        const coordinates = await getCoordinates(authorModel.scraps)
        const miles = await calculateMiles(coordinates)
        authorModel.miles = miles
        await authorModel.save()
    }
}
const recalculateBookDates = async (bookModel) => {
    if (bookModel) {
        const firstScrapModel = await Scrap.findById(bookModel.scraps[0])
        const lastScrapModel = await Scrap.findById(bookModel.scraps[bookModel.scraps.length - 1])
        if (firstScrapModel && lastScrapModel) {
            bookModel.beginDate = firstScrapModel.createdAt
            bookModel.endDate = lastScrapModel.createdAt
            await bookModel.save()
        }
    }
}
const sortAuthorBooks = async (authorModel) => {
    if (authorModel) {
        authorModel.books = await handleBookSort(authorModel.books)
        await authorModel.save()
    }
}
const sortAuthorScraps = async (authorModel) => {
    if (authorModel) {
        authorModel.scraps = await handleScrapSort(authorModel.scraps)
        await authorModel.save()
    }
}
const sortBookScraps = async (bookModel) => {
    if (bookModel) {
        bookModel.scraps = await handleScrapSort(bookModel.scraps)
        await bookModel.save()
    }
}
const unThread = async (bookModel, scrapModel) => {
    if (bookModel && scrapModel) {
        bookModel.threads.pull(scrapModel._id)
        scrapModel.threads.pull(bookModel._id)
        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])
    }
}
const thread = async (bookModel, scrapModel) => {
    if (bookModel && scrapModel) {
        bookModel.threads.pull(scrapModel._id)
        scrapModel.threads.pull(bookModel._id)
        bookModel.threads.push(scrapModel._id)
        scrapModel.threads.push(bookModel._id)
        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])
    }
}
const unLike = async (bookModel, authorModel) => {
    if (bookModel && authorModel) {
        bookModel.likes.pull(authorModel._id)
        authorModel.likedBooks.pull(bookModel._id)
        await Promise.all([
            authorModel.save(),
            bookModel.save(),
        ])
    }
}
const like = async (bookModel, authorModel) => {
    if (bookModel && authorModel) {
        bookModel.likes.pull(authorModel._id)
        authorModel.likedBooks.pull(authorModel._id)
        bookModel.likes.push(authorModel._id)
        authorModel.likedBooks.push(bookModel._id)
        await Promise.all([
            authorModel.save(),
            bookModel.save(),
        ])
    }
}
const handleBookRemoveScrap = async (bookModel, scrapModel) => {
    if (bookModel && scrapModel) {
        bookModel.scraps.pull(scrapModel._id)
        scrapModel.book = ''
        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])

        console.log(2.1)

        await unThread(bookModel, scrapModel)

        console.log(2.2)

        await recalculateBookMiles(bookModel)

        console.log(2.3)

        await recalculateBookDates(bookModel)

        console.log(2.4)

        const authorModel = await Author.findById(bookModel.author)
        await sortAuthorBooks(authorModel)

        console.log(2.5)
    }
}
const handleBookAddScrap = async (bookModel, scrapModel) => {
    // Add the scrap's id to the book's scraps array
    bookModel.scraps.push(scrapModel._id)
    await bookModel.save()

    // Set the book as the scrap's book
    scrapModel.book = bookModel._id
    await scrapModel.save()

    // Sort the book's scraps to adjust for the new scrap
    await sortBookScraps(bookModel)

    // Recalculate the miles traveled
    await recalculateBookMiles(bookModel)
    await recalculateBookDates(bookModel)

    // Sort the author's books again to adjust for changes
    const authorModel = await Author.findById(bookModel.author)
    await sortAuthorBooks(authorModel)
}
const getRelationship = async (authorModel1, authorModel2) => {
    if (authorModel1 && authorModel2) {
        if (authorModel1._id === authorModel2._id) {
            return 'self'
        }
        else if (authorModel1.friends.includes(authorModel2._id)) {
            return 'friend'
        }
        else if (authorModel1.incomingFriendRequests.includes(authorModel2._id)) {
            return 'incomingFriendRequest'
        }
        else if (authorModel2.outgoingFriendRequests.includes(authorModel2._id)) {
            return 'outgoingFriendRequest'
        }
        else {
            return 'none'
        }
    }
}

const deepDeleteAuthor = async (authorModel) => {
    if (authorModel) {
        // Find all actions that reference the author
        const actions = await Action.find({
            $or: [
                { senderAuthor: authorModel._id },
                { targetAuthor: authorModel._id }
            ]
        }, '_id');
        // Delete any Action from any author that references the author
        for (const action of actions) {
            const actionModel = await Action.findById(action)
            await deepDeleteAction(actionModel)
        }

        // Deep delete every book the author made
        for (const book of authorModel.books) {
            const bookModel = await Book.findById(book)
            await deepDeleteBook(bookModel)
        }

        // Deep delete every scrap the author made
        for (const scrap of authorModel.scraps) {
            const scrapModel = await Scrap.findById(scrap)
            await deepDeleteScrap(scrapModel)
        }

        // Remove the like between this author and any book
        for (const book of authorModel.likedBooks) {
            const bookModel = await Book.findById(book)
            await unLike(bookModel, authorModel)
        }

        // Remove the connection between this author and any other author
        await Promise.all([
            // Delete the author id from any friends
            handleMongoFilter('Author', 'friends', authorModel._id),
            // Delete the author id from any incoming requests
            handleMongoFilter('Author', 'incomingFriendRequests', authorModel._id),
            // Delete the author id from any outgoing requests
            handleMongoFilter('Author', 'outgoingFriendRequests', authorModel._id),
        ])

        // If necessary, delete the author's confirmation token
        await ConfirmationToken.deleteMany({ author: authorModel._id })

        // If necessary, delete any password reset token associated with the author
        await PasswordToken.deleteMany({ email: authorModel.email })

        // Delete the author document from MongoDB
        await Author.findOneAndDelete({ _id: authorModel._id })
    }
}
const deepDeleteBook = async (bookModel) => {
    if (bookModel) {
        // Delete any action from any author that references the book id
        const actions = await Action.find({
            $or: [
                { senderBook: bookModel._id },
                { targetBook: bookModel._id }
            ]
        }, '_id');
        for (const action of actions) {
            const actionModel = await Action.findById(action)
            await deepDeleteAction(actionModel)
        }

        console.log('a')

        // Remove all threads between this book and any scraps
        for (const scrap of bookModel.threads) {
            const scrapModel = await Scrap.findById(scrap)
            await unThread(bookModel, scrapModel)
        }

        console.log('b')

        // Remove any likes between this book and any authors
        for (const author of bookModel.likes) {
            const authorModel = await Author.findById(author)
            await unLike(bookModel, authorModel)
        }

        console.log('c')

        // Remove each scrap from the book
        for (const scrap of bookModel.scraps) {
            const scrapModel = await Scrap.findById(scrap)
            await handleBookRemoveScrap(bookModel, scrapModel)
        }

        console.log('d')

        // Remove the book from the author's library
        const authorModel = await Author.findById(bookModel.author)
        authorModel.books.pull(bookModel._id)
        await authorModel.save()

        console.log('e')

        // Delete the book from MongoDB
        await Book.findOneAndDelete({ _id: bookModel._id })

        console.log('f')
    }
}
const deepDeleteScrap = async (scrapModel) => {
    if (scrapModel) {
        // Deep delete all actions associated with the scrap
        // Delete any action from any author that references the book id
        const actions = await Action.find({
            $or: [
                { senderScrap: scrapModel._id },
                { targetScrap: scrapModel._id }
            ]
        }, '_id');
        for (const action of actions) {
            const actionModel = await Action.findById(action)
            await deepDeleteAction(actionModel)
        }

        // Update relevant author data
        const authorModel = await Author.findById(scrapModel.author)
        if (authorModel) {
            // Remove the scrap from the author's headshot and cover if currently set
            if (authorModel.headshotAndCover === scrapModel._id) {
                authorModel.headshotAndCover = ''
            }

            // Delete the scrap from the author's library
            authorModel.scraps.pull(scrapModel._id)
            await authorModel.save()

            // Recalculate the author's miles traveled
            await recalculateAuthorMiles(authorModel)
            console.log(1)
        }

        // Delete the scrap from the book it is in
        if (scrapModel.book) {
            const bookModel = await Book.findById(scrapModel.book)
            await handleBookRemoveScrap(bookModel, scrapModel)
        }

        console.log(2)

        // Remove the threads between this scrap and any books
        for (const book of scrapModel.threads) {
            const bookModel = await Book.findById(book)
            await unThread(bookModel, scrapModel)
        }

        console.log(3)

        // Delete the Scrap's prograph and retrograph from AWS W3 storage
        await handleS3Delete(`photos/${scrapModel.prograph}.jpg`)
        await handleS3Delete(`photos/${scrapModel.retrograph}.jpg`)

        console.log(4)

        // Delete the scrap from mongodb
        await Scrap.findOneAndDelete({ _id: scrapModel._id })

        console.log(5)
    }
}
const deepDeleteAction = async (actionModel) => {
    if (actionModel) {
        // Find the authors associated with the exchange
        const senderAuthor = actionModel.senderAuthor
        const targetAuthor = actionModel.targetAuthor

        // Remove the action from each author's actions array
        await Author.updateOne({ _id: senderAuthor }, { $pull: { actions: actionModel._id } })
        await Author.updateOne({ _id: targetAuthor }, { $pull: { actions: actionModel._id } })

        // Delete the action itself from the database
        await Action.findOneAndDelete({ _id: actionModel._id })
    }
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
    scrapDetails.sort((a, b) => b.createdAt - a.createdAt);

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
    bookDetails.sort((a, b) => b.beginDate - a.beginDate)

    // Extract only the IDs from the sorted bookDetails
    const sortedIds = bookDetails.map(book => book.id)

    return sortedIds
}

const getCoordinates = async (scraps) => {
    let coordinates = []
    for (const scrap of scraps) {
        const scrapModel = await Scrap.findById(scrap)
        if (scrapModel) {
            coordinates.push({
                latitude: scrapModel.latitude,
                longitude: scrapModel.longitude,
            })
        }
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
    handleBookRemoveScrap,
    handleBookAddScrap,
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
    sortAuthorScraps,
    getCoordinates,
    calculateMiles,
    recalculateAuthorMiles,
    recalculateBookDates,
    recalculateBookMiles,
    sortAuthorBooks,
    unThread,
    thread,
    unLike,
    like,
    getRelationship,
}