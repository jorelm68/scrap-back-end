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
            if (id === user) {
                return handleResponse(res, { relationship: 'self' })
            }
            const userModel = await Author.findById(user)
            if (!userModel) {
                return handleError(res, 400, `user: "${user}" doesn't exist`)
            }

            let relationship = 'none'
            if (userModel.friends.includes(id)) {
                relationship = 'friend'
            }
            else if (userModel.outgoingFriendRequests.includes(id)) {
                relationship = 'outgoingFriendRequest'
            }
            else if (userModel.incomingFriendRequests.includes(id)) {
                relationship = 'incomingFriendRequest'
            }

            return handleResponse(res, { relationship })
        }
        else if (['headshot', 'cover'].includes(key)) {
            const authorModel = await Author.findById(id)
            if (!authorModel) {
                return handleError(res, 400, `author: "${id}" doesn't exist`)
            }

            const scrap = authorModel.headshotAndCover
            const scrapModel = scrapModel.findById(scrap)
            if (!scrapModel) {
                return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
            }

            return handleResponse(res, {
                [key]: key === 'headshot' ? scrapModel.headshot : scrapModel.cover
            })
        }
        else if (key === 'publicBooks') {
            const authorModel = await Author.findById(id)
            if (!authorModel) {
                return handleError(res, 400, `author: "${id}" doesn't exist`)
            }

            const books = authorModel.books
            let publicBooks = []
            for (const book of books) {
                const bookModel = await Book.findById(book)
                if (!bookModel) {
                    return handleError(res, 400, `book: "${book}" doesn't exist`)
                }
                const isPublic = bookModel.isPublic
                if (isPublic) {
                    publicBooks.push(book)
                }
            }

            return handleResponse(res, {
                publicBooks,
            })
        }
        else if (key === 'profileBooks') {
            const authorModel = await Author.findById(id)
            if (!authorModel) {
                return handleError(res, 400, `author: "${id}" doesn't exist`)
            }

            const userModel = await Author.findById(user)
            if (!userModel) {
                return handleError(res, 400, `user: "${user}" doesn't exist`)
            }

            let relationship = 'none'
            if (user === id) {
                relationship = 'self'
            }
            else if (userModel.friends.includes(id)) {
                relationship = 'friend'
            }
            else if (userModel.incomingFriendRequests.includes(id)) {
                relationship = 'incomingFriendRequest'
            }
            else if (userModel.outgoingFriendRequests.includes(id)) {
                relationship = 'outgoingFriendRequest'
            }

            if (relationship === 'self') {
                return handleResponse(res, {
                    profileBooks: authorModel.books
                })
            }

            const books = authorModel.books
            let filtered = []
            for (const book of books) {
                const bookModel = await Book.findById(book)
                if (!bookModel) {
                    return handleError(res, 400, `book: "${book}" doesn't exist`)
                }

                const isPublic = bookModel.isPublic
                if (isPublic) {
                    filtered.push(book)
                }
                else if (['friend'].includes(relationship)) {
                    filtered.push(book)
                }
            }

            return handleResponse(res, {
                profileBooks: filtered
            })
        }
        else if (key === 'feed') {
            // Fetch the current user's friends
            const authorModel = await Author.findById(id)
            if (!authorModel) {
                return handleError(res, 400, `author: "${id}" doesn't exist`)
            }

            const friends = authorModel.friends

            // Find books posted by the current user and their friends
            const results = await Book.find({
                $or: [
                    { author: id }, // Books posted by the current user
                    { author: { $in: friends } }, // Books posted by friends
                ]
            }).sort({ createdAt: -1 }) // Sort by creation date (descending)

            const bookIds = results.slice(0, 10).map(book => book._id)

            return handleResponse(res, { feed: bookIds })
        }
        else if (key === 'unbookedScraps') {
            const authorModel = await Author.findById(id)
            if (!authorModel) {
                return handleError(res, 400, `author: "${id}" doesn't exist`)
            }

            const scraps = authorModel.scraps
            let unbookedScraps = []
            for (const scrap of scraps) {
                const scrapModel = await Scrap.findById(scrap)
                if (!scrapModel) {
                    return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
                }
                const book = scrapModel.book
                if (!book || book === '') {
                    unbookedScraps.push(scrap)
                }
            }

            return handleResponse(res, { unbookedScraps })
        }

        const Model = require(`../models/${model}`); // Assuming your models are in a 'models' folder

        document = await Model.findById(id);
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
            console.log(value)
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

const reverseGeocode = async (req, res) => {
    const code = async (req, res) => {

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
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

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

        // I want the logic of this function to search through all Author documents and prioritize:
        // authorModel.pseudonym
        // then prioritze
        // authorModel.firstName and authorModel.lastName

        // Then I want it to build an array of 10 authorModel._ids sorted in the order of how relevant
        // the search is to the author
    }
    await handleRequest(req, res, code)
}
const scrapSearch = async (req, res) => {
    const code = async (req, res) => {

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
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

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

        // Return the list of relevant book IDs
        return handleResponse(res, {
            books: bookIds
        })
    }
    await handleRequest(req, res, code)
}

const generalSearch = async (req, res) => {
    const code = async (req, res) => {

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
        if (!bookModel) {
            return handleError(res, 400, `book: "${book}" doesn't exist`)
        }
        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
        }

        // Check to see if the scrap already threads to the book
        if (bookModel.threads.includes(scrap) || scrapModel.threads.includes(book)) {
            bookModel.threads.pull(scrap)
            scrapModel.threads.pull(book)
            bookModel.threads.push(scrap)
            scrapModel.threads.push(book)

            await Promise.all([
                bookModel.save(),
                scrapModel.save(),
            ])

            return handleError(res, 400, `The scrap: "${scrapModel.title}" and the book: "${bookModel.title}" are alerady threaded`)
        }

        // Remove to refresh the thread from the scrap to the book
        bookModel.threads.pull(scrap)
        scrapModel.threads.pull(book)

        // Add the thread between the scrap and book
        bookModel.threads.push(scrap)
        scrapModel.threads.push(book)

        await Promise.all([
            scrapModel.save(),
            bookModel.save()
        ])

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
        if (!bookModel) {
            return handleError(res, 400, `book: "${book}" doesn't exist`)
        }
        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
        }

        // Check to see if the scrap doesn't thread to the book
        if (!bookModel.threads.includes(scrap) || !scrapModel.threads.includes(book)) {
            bookModel.threads.pull(scrap)
            scrapModel.threads.pull(book)

            await Promise.all([
                bookModel.save(),
                scrapModel.save(),
            ])

            return handleError(res, 400, `The scrap: "${scrapModel.title}" and the book: "${bookModel.title}" were never threaded`)
        }

        // Remove the thread from the scrap to the book
        bookModel.threads.pull(scrap)
        scrapModel.threads.pull(book)

        await Promise.all([
            scrapModel.save(),
            bookModel.save()
        ])

        return handleResponse(res, { scrap, book })
    }
    await handleRequest(req, res, code)
}

const question = async (req, res) => {
    const code = async (req, res) => {

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

        const coordinates = await getCoordinates(req, res, scraps)

        return handleResponse(res, {
            coordinates,
        })
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

        let coordinates = []
        for (const book of books) {
            const bookModel = await Book.findById(book)
            if (!bookModel) {
                return handleResponse(res, 400, `book: "${book}" doesn't exist`)
            }

            const representative = bookModel.representative
            const scrapModel = await Scrap.findById(representative)
            if (!scrapModel) {
                return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
            }

            coordinates.push({
                latitude: scrapModel.latitude,
                longitude: scrapModel.longitude,
            })
        }

        return handleResponse(res, {
            coordinates,
        })
    }
    await handleRequest(req, res, code)
}

module.exports = {
    get,
    getPhoto,
    set,
    reverseGeocode,
    authorSearch,
    scrapSearch,
    bookSearch,
    generalSearch,
    addThread,
    removeThread,
    question,
    scrapCoordinates,
    bookCoordinates,
}