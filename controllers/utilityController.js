require('dotenv').config()
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handleRequest,
} = require('../handler')

const get = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const set = async (req, res) => {
    const code = async (req, res) => {

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
            return handleError(res, 400, `book: ${book} doesn't exist`)
        }
        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: ${scrap} doesn't exist`)
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

            return handleError(res, 400, 'Specified scrap and book are alerady threaded')
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
            return handleError(res, 400, `book: ${book} doesn't exist`)
        }
        const scrapModel = await Scrap.findById(scrap)
        if (!scrapModel) {
            return handleError(res, 400, `scrap: ${scrap} doesn't exist`)
        }

        // Check to see if the scrap doesn't thread to the book
        if (!bookModel.threads.includes(scrap) || !scrapModel.threads.includes(book)) {
            bookModel.threads.pull(scrap)
            scrapModel.threads.pull(book)
            
            await Promise.all([
                bookModel.save(),
                scrapModel.save(),
            ])

            return handleError(res, 400, 'Specified scrap and book were never threaded')
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

module.exports = {
    get,
    set,
    reverseGeocode,
    authorSearch,
    scrapSearch,
    bookSearch,
    generalSearch,
    addThread,
    removeThread,
}