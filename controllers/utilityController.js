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
    handleResponse,
    handleResize,
} = require('../other/handler')
const { body, param, validationResult } = require('express-validator')

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
            if (!userModel) {
                return handleError(res, 400, `user: "${user}" doesn't exist`)
            }

            let relationship = 'none'
            if (userModel.friends.includes(id)) {
                relationship = 'friends'
            }
            else if (userModel.outgoingFriendRequests.includes(id)) {
                relationship = 'outgoingFriendRequest'
            }
            else if (userModel.incomingFriendRequests.includes(id)) {
                relationship = 'incomingFriendRequest'
            }

            return handleResponse(res, { relationship })
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

        const { model, id, key, value } = req.body

        const Model = mongoose.model(model)
        if (!(Model instanceof mongoose.Model)) {
            return handleError(res, 400, `model: "${model}" doesn't exist`)
        }

        const document = await Model.findById(id)
        if (!document) {
            return handleError(res, 400, `id: "${id}" doesn't exist`)
        }

        // Update the document's property with the provided key and value
        document[key] = value
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