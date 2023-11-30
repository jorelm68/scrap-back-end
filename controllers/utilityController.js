require('dotenv').config()
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handleRequest,
    handleInputValidation,
    handleMongoGet,
    handleError,
    handleS3Get,
} = require('../handler')

const get = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('demands').isMongoId().withMessage('body: demands is required'),
        ])

        const { author, demands } = req.body
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        let supply = []
        for (const demand of demands) {
            const { author, scrap, book, data } = demand
            if (author) {
                const authorModel = await Author.findById(author)
                if (!authorModel) {
                    return handleError(res, 400, `author: "${author}" doesn't exist`)
                }

                for (const key of data) {
                    // Array of strings (each string is a key)
                    const value = await handleMongoGet(req, res, 'Author', author, key)
                    supply.push({ [key]: value })
                }
            }
            else if (scrap) {
                const scrapModel = await Scrap.findById(scrap)
                if (!scrapModel) {
                    return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
                }

                for (const key of data) {
                    // Array of strings (each string is a key)
                    const value = await handleMongoGet(req, res, 'Scrap', scrap, key)
                    supply.push({ [key]: value })
                }
            }
            else if (book) {
                const bookModel = await Book.findById(book)
                if (!bookModel) {
                    return handleError(res, 400, `book: "${book}" doesn't exist`)
                }

                for (const key of data) {
                    // Array of strings (each string is a key)
                    const value = await handleMongoGet(req, res, 'Scrap', scrap, key)
                    supply.push({ [key]: value })
                }
            }
        }
        return handleResponse(res, { supply })
    }
    await handleRequest(req, res, code)
}
const set = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('demands').exists().withMessage('body: demands is required'),
        ], validationResult)

        const { author, demands } = req.body
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        for (const demand of demands) {
            const { author, book, scrap, data } = req.body
            if (author) {
                const authorModel = await Author.findById(author)
                if (!authorModel) {
                    return handleError(res, 400, `author: "${author}" doesn't exist`)
                }
                for (const pair of demand) {
                    const { key, value } = pair
                    authorModel[key] = value
                }
                await authorModel.save()
            }
            else if (book) {
                const bookModel = await Book.findById(book)
                if (!bookModel) {
                    return handleError(res, 400, `book: "${book}" doesn't exist`)
                }
                for (const pair of demand) {
                    const { key, value } = pair
                    bookModel[key] = value
                }
                await bookModel.save()
            }
            else if (scrap) {
                const scrapModel = await Scrap.findById(scrap)
                if (!scrapModel) {
                    return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
                }
                for (const pair of demand) {
                    const { key, value } = pair
                    scrapModel[key] = value
                }
                await scrapModel.save()
            }
        }

        return handleResponse(res, { author, demands })
    }
    await handleRequest(req, res, code)
}
const getPhoto = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('photo').exists().withMessage('body: photo is required'),
            body('photo').isMongoId().withMessage('body: photo must be MongoId'),
            body('size').exists().withMessage('body: size is required'),
        ])

        const { photo, size } = req.body

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
}