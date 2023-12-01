require('dotenv').config()
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handleRequest,
    handleS3Put,
    deepDeleteScrap,
    handleInputValidation,
    handleResponse,
    handleError,
} = require('../other/handler')
const { ObjectId } = require('mongodb')
const { body, validationResult } = require('express-validator')

const exists = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('scrap').exists().withMessage('body: scrap is required'),
            body('scrap').isMongoId().withMessage('body: scrap must be MongoId'),
        ], validationResult)

        const { scrap } = req.body

        try {
            const scrapModel = await Scrap.findById(scrap)
            if (!scrapModel) {
                return handleResponse(res, { exists: false })
            }
            else {
                return handleResponse(res, { exists: true })
            }
        } catch (error) {
            return handleResponse(res, { exists: false })
        }
    }
    await handleRequest(req, res, code)
}
const saveScrap = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('latitude').exists().withMessage('body: latitude is required'),
            body('longitude').exists().withMessage('body: longitude is required'),
        ], validationResult)

        if (!req.files || !req.files[0] || !req.files[1] || !req.files[0].buffer || !req.files[1].buffer) {
            return handleError(res, 400, `Files were not properly delivered`)
        }

        let {
            author,
            title,
            description,
            place,
            location,

            latitude,
            longitude,

            threads,
            book,

            createdAt,
        } = req.body

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        // Generate a unique MongoId for each image
        const prograph = new ObjectId();
        const retrograph = new ObjectId();

        // Create the document in MongoDB
        const scrap = new Scrap({
            author,
            title,
            description,
            prograph,
            retrograph,
            place,
            location,

            latitude,
            longitude,

            threads,
            book,
            createdAt: createdAt ? createdAt : new Date()
        })
        await scrap.save()

        // Get the image buffer data from the req.files
        const prographBuffer = req.files[0].buffer
        const retrographBuffer = req.files[1].buffer

        // Add the scrap's retrograph and prograph to the AWS W3 bucket
        await Promise.all([
            handleS3Put(`photos/${prograph}.jpg`, prographBuffer),
            handleS3Put(`photos/${retrograph}.jpg`, retrographBuffer),
        ])

        // Add the scrap to the author's scraps array
        authorModel.scraps.push(scrap._id)
        await authorModel.save()

        return handleResponse(res, { scrap: scrap._id })
    }
    await handleRequest(req, res, code)
}
const deleteScraps = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('scraps').exists().withMessage('body: scraps is required'),
        ], validationResult)

        const { scraps } = req.body
        const parsedScraps = JSON.parse(scraps)

        // Deep delete each scrap
        const deleteScraps = []
        for (const scrap of parsedScraps) {
            deleteScraps.push(deepDeleteScrap(req, res, scrap))
        }
        await Promise.all(deleteScraps)

        return handleResponse(res, { scraps })
    }
    await handleRequest(req, res, code)
}

const addThread = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('scrap').exists().withMessage('body: scrap is required'),
            body('scrap').isMongoId().withMessage('body: scrap must be MongoId'),
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ], validationResult)

        const { scrap, book } = req.body

        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
        }

        const bookModel = await Book.findById(book)
        if (!bookModel) {
            return handleError(res, 400, `book: "${book}" doesn't exist`)
        }

        if (scrapModel.threads.includes(book) || bookModel.threads.includes(scrap)) {
            scrapModel.threads.pull(book)
            bookModel.threads.pull(scrap)
            scrapModel.threads.push(book)
            bookModel.threads.push(scrap)
            await Promise.all([
                bookModel.save(),
                scrapModel.save()
            ])
            return handleError(res, 400, `${scrapModel.title} has already been threaded with ${bookModel.title}`)
        }

        // Add the book as a thread to the scrap
        bookModel.threads.pull(scrap)
        scrapModel.threads.pull(book)
        bookModel.threads.push(scrap)
        scrapModel.threads.push(book)
        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])

        return handleResponse(res, { scrap, book })
    }
    await handleRequest(req, res, code)
}
const removeThread = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('scrap').exists().withMessage('body: scrap is required'),
            body('scrap').isMongoId().withMessage('body: scrap must be MongoId'),
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ], validationResult)

        const { scrap, book } = req.body

        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
        }

        const bookModel = await Book.findById(book)
        if (!bookModel) {
            return handleError(res, 400, `book: "${book}" doesn't exist`)
        }

        if (!scrapModel.threads.includes(book) || !bookModel.threads.includes(scrap)) {
            scrapModel.threads.pull(book)
            bookModel.threads.pull(scrap)
            await Promise.all([
                bookModel.save(),
                scrapModel.save()
            ])
            return handleError(res, 400, `${scrapModel.title} was never threaded with ${bookModel.title}`)
        }

        // Remove the thread between scrap and book
        bookModel.threads.pull(scrap)
        scrapModel.threads.pull(book)
        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])

        return handleResponse(res, { scrap, book })
    }
    await handleRequest(req, res, code)
}

module.exports = {
    exists,
    saveScrap,
    deleteScraps,
    addThread,
    removeThread,
}