require('dotenv').config()
const bcrypt = require('bcrypt')
const fs = require('fs')
const ejs = require('ejs')
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const ConfirmationToken = require('../models/ConfirmationToken')
const {
    handleRequest,
    handleInputValidation,
    handleMongoGet,
    handleError,
    handleS3Get,
    handleResponse,
    handleResize,
    sendEmail,
    getCoordinates,
    calculateMiles,
    handleBookSort,
    getRelationship,
    thread,
    unThread,
    handleAction,
} = require('../other/handler')
const { body, param, validationResult } = require('express-validator')
const saltRounds = 10

const get = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            param('model').exists().withMessage('param: model is required'),
            param('id').exists().withMessage('param: id is required'),
            param('id').isMongoId().withMessage('param: id must be MongoId'),
            param('key').exists().withMessage('param: key is required'),
            param('user').exists().withMessage('param: user is required'),
            param('user').isMongoId().withMessage('param: user must be MongoId'),
        ], validationResult)

        const { model, id, key, user } = req.params
        if (key === 'relationship') {
            const userModel = await Author.findById(user)
            if (userModel) {
                let relationship = 'none'
                if (userModel.friends.includes(id)) {
                    relationship = 'friend'
                }
                else if (id === user) {
                    relationship = 'self'
                }
                else if (userModel.outgoingFriendRequests.includes(id)) {
                    relationship = 'outgoingFriendRequest'
                }
                else if (userModel.incomingFriendRequests.includes(id)) {
                    relationship = 'incomingFriendRequest'
                }

                return handleResponse(res, { relationship })
            }
            return handleError(res, 400, 'Could not get relationship')
        }
        else if (key === 'publicBooks') {
            const authorModel = await Author.findById(id)
            if (authorModel) {
                let publicBooks = []

                // Add all books that are public
                for (const book of authorModel.books) {
                    const bookModel = await Book.findById(book)
                    if (bookModel) {
                        if (bookModel.isPublic) {
                            publicBooks.push(book)
                        }
                    }
                }
                return handleResponse(res, { publicBooks })
            }
            return handleError(res, 400, 'Could not get publicBooks')
        }
        else if (key === 'profileBooks') {
            const userModel = await Author.findById(user)
            const authorModel = await Author.findById(id)
            if (userModel && authorModel) {
                const relationship = await getRelationship(userModel, authorModel)

                if (relationship === 'self') {
                    return handleResponse(res, { profileBooks: authorModel.books })
                }

                // Add everything if friends, only public if not friends
                const books = authorModel.books
                let filtered = []
                for (const book of books) {
                    const bookModel = await Book.findById(book)
                    if (bookModel) {
                        if (bookModel.isPublic) {
                            filtered.push(book)
                        }
                        else if (['friend'].includes(relationship)) {
                            filtered.push(book)
                        }
                    }
                }
                return handleResponse(res, { profileBooks: filtered })
            }
            return handleError(res, 400, 'Could not get profileBooks')
        }
        else if (key === 'feed') {
            // Fetch the current user's friends
            const authorModel = await Author.findById(id)
            if (authorModel) {
                // Find books posted by the current user and their friends
                const results = await Book.find({
                    $or: [
                        { author: id }, // Books posted by the current user
                        { author: { $in: authorModel.friends } }, // Books posted by friends
                    ]
                }).sort({ beginDate: -1 }) // Sort by creation date (descending)

                const bookIds = results.map(book => book._id)
                const sortedBookIds = await handleBookSort(bookIds)

                return handleResponse(res, { feed: sortedBookIds })
            }
            return handleError(res, 400, 'Could not get feed')
        }
        else if (key === 'unbookedScraps') {
            const authorModel = await Author.findById(id)
            if (authorModel) {
                let unbookedScraps = []
                for (const scrap of authorModel.scraps) {
                    const scrapModel = await Scrap.findById(scrap)
                    if (scrapModel) {
                        const book = scrapModel.book
                        if (!book || book === '') {
                            unbookedScraps.push(scrap)
                        }
                    }
                }
                return handleResponse(res, { unbookedScraps })
            }
            return handleError(res, 400, 'Could not get unbookedScraps')
        }

        const Model = require(`../models/${model}`)

        document = await Model.findById(id)
        if (!document) {
            return handleError(`id: "${id}" doesn't exist`)
        }

        // Access the property using the provided key
        const value = document[key]

        if (value === undefined) {
            return handleError(res, 400, `key: "${key}" doesn't exist in the document`)
        }

        // Return the value obtained from the document using the provided key
        return handleResponse(res, { [key]: value })
    }
    await handleRequest(req, res, code)
}
const set = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('model').exists().withMessage('body: model is required'),
            body('id').exists().withMessage('body: id is required'),
            body('id').isMongoId().withMessage('body: id must be MongoId'),
            body('key').exists().withMessage('body: key is required'),
            body('value').exists().withMessage('body: value is required'),
        ], validationResult)

        let { model, id, key, value } = req.body

        const Model = require(`../models/${model}`) // Assuming your models are in a 'models' folder

        const document = await Model.findById(id)
        if (!document) {
            return handleError(res, 400, `id: "${id}" doesn't exist`)
        }

        if (key === 'password') {
            value = await bcrypt.hash(value, saltRounds)
        }

        if (key === 'isPublic') {
            const bookModel = await Book.findById(id)
            await handleAction({
                type: 'postBook',
                sender: {
                    author: bookModel.author,
                },
                target: {
                    author: bookModel.author,
                    book: bookModel._id,
                },
            })
        }

        // Update the document's property with the provided key and value
        document[key] = value

        if (key === 'email') {
            document.activated = false
            document.email = value
            await document.save()
            // Send an email to activate the person's account
            // Create a ConfirmationToken for this account so they can verify
            const confirmationTokenModel = new ConfirmationToken({
                author: document._id,
            })
            await confirmationTokenModel.save()

            // Send an email to the person's email address to activate their account
            const templatePath = 'views/emailChangeEmail.ejs'; // Replace with your EJS file path
            const templateContent = fs.readFileSync(templatePath, 'utf8');

            const htmlContent = ejs.render(templateContent, { firstName: document.firstName, confirmationToken: confirmationTokenModel._id })
            await sendEmail(req, res, value, 'Confirm Email', htmlContent)
        }
        await document.save()

        // Return a success message or the updated document if needed
        return handleResponse(res, { [key]: value })
    }

    await handleRequest(req, res, code)
}

const getPhoto = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            param('photo').exists().withMessage('param: photo is required'),
            param('photo').isMongoId().withMessage('param: photo must be MongoId'),
            param('size').exists().withMessage('param: size is required'),
        ], validationResult)

        const { photo, size } = req.params

        // Get the image buffer from AWS W3
        const { Body } = await handleS3Get(`photos/${photo}.jpg`)
        const buffer = await handleResize(Body, size)

        // Return the image buffer in the response
        res.setHeader('Content-Type', 'image/jpeg')
        return res.status(200).send(buffer)
    }
    await handleRequest(req, res, code)
}

const authorSearch = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('search').exists().withMessage('body: search is required'),
        ], validationResult)

        const { author, search } = req.body

        // Get the author searching
        const authorModel = await Author.findById(author)
        if (authorModel) {
            // MongoDB search query
            const result = await Author.find({
                $or: [
                    { pseudonym: { $regex: search, $options: 'i' } }, // Case-insensitive search for pseudonym
                    {
                        $and: [
                            { $or: [{ firstName: { $regex: search, $options: 'i' } }, { lastName: { $regex: search, $options: 'i' } }] }, // Case-insensitive search for firstName or lastName
                        ]
                    }
                ]
            })
                .sort({ pseudonym: -1, firstName: -1, lastName: -1 }) // Sort by relevance

            // Extracting IDs from the results
            const relevantAuthors = result.slice(0, 10).map(author => author._id)

            return handleResponse(res, {
                authors: relevantAuthors,
            })
        }
        return handleError(res, 400, 'Could not get search results')
    }
    await handleRequest(req, res, code)
}
const bookSearch = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('search').exists().withMessage('body: search is required'),
            body('remove').exists().withMessage('body: remove is required'),
        ], validationResult)

        const { author, search, remove: removeRaw } = req.body
        const remove = JSON.parse(removeRaw)

        // Get the author searching
        const authorModel = await Author.findById(author)
        if (authorModel) {
            // MongoDB query to search within Book documents based on title, description, and place
            const result = await Book.find({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { place: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            })
                .sort({ title: -1, place: -1, description: -1 }) // Sort by relevance

            // Remove private books from the query
            let filtered = [...result]

            if (remove.includes('selfBooks')) {
                filtered = filtered.filter((bookModel) => {
                    return bookModel.author !== author
                })
            }

            if (remove.includes('privateBooks')) {
                filtered = filtered.filter((bookModel) => {
                    return !bookModel.isPublic
                })
            }

            if (remove.includes('restrictedBooks')) {
                filtered = filtered.filter((bookModel) => {
                    const creator = bookModel.author
                    const isPublic = bookModel.isPublic
                    let relationship = 'none'
                    if (author === creator) {
                        relationship = 'self'
                    }
                    else if (authorModel.friends.includes(creator)) {
                        relationship = 'friend'
                    }
                    else if (authorModel.incomingFriendRequests.includes(creator)) {
                        relationship = 'incomingFriendRequest'
                    }
                    else if (authorModel.outgoingFriendRequests.includes(creator)) {
                        relationship = 'outgoingFriendRequest'
                    }

                    return !(!isPublic && !['self', 'friend'].includes(relationship))
                })
            }

            const bookIds = filtered.slice(0, 10).map(book => book._id)
            const sortedBookIds = await handleBookSort(bookIds)

            // Return the list of relevant book IDs
            return handleResponse(res, { books: sortedBookIds })
        }
        return handleError(res, 400, 'Could not get search results')
    }
    await handleRequest(req, res, code)
}

const addThread = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('scrap').exists().withMessage('body: scrap is required'),
            body('scrap').isMongoId().withMessage('body: scrap must be MongoId'),
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ], validationResult)

        const { book, scrap } = req.body

        const bookModel = await Book.findById(book)
        const scrapModel = await Scrap.findById(scrap)
        await thread(bookModel, scrapModel)

        return handleResponse(res, { scrap, book })
    }
    await handleRequest(req, res, code)
}
const removeThread = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('scrap').exists().withMessage('body: scrap is required'),
            body('scrap').isMongoId().withMessage('body: scrap must be MongoId'),
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ], validationResult)

        const { book, scrap } = req.body

        const bookModel = await Book.findById(book)
        const scrapModel = await Scrap.findById(scrap)
        await unThread(bookModel, scrapModel)

        return handleResponse(res, { scrap, book })
    }
    await handleRequest(req, res, code)
}

const scrapCoordinates = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('scraps').exists().withMessage('body: scraps is required'),
        ], validationResult)

        const { scraps: scrapsRaw } = req.body
        const scraps = JSON.parse(scrapsRaw)

        const coordinates = await getCoordinates(scraps)

        return handleResponse(res, { coordinates })
    }
    await handleRequest(req, res, code)
}
const bookCoordinates = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('books').exists().withMessage('body: books is required'),
        ], validationResult)

        const { books: booksRaw } = req.body

        const books = JSON.parse(booksRaw)

        // Calculate each coordinate based on each book's representative
        let coordinates = []
        for (const book of books) {
            const bookModel = await Book.findById(book)
            if (bookModel) {
                const representative = bookModel.representative
                const scrapModel = await Scrap.findById(representative)
                if (scrapModel) {
                    coordinates.push({
                        latitude: scrapModel.latitude,
                        longitude: scrapModel.longitude,
                    })
                }
            }
        }
        return handleResponse(res, { coordinates })
    }
    await handleRequest(req, res, code)
}

module.exports = {
    get,
    getPhoto,
    set,
    authorSearch,
    bookSearch,
    addThread,
    removeThread,
    scrapCoordinates,
    bookCoordinates,
}