require('dotenv').config()
const fs = require('fs')
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const Action = require('../models/Action')
const {
    handleRequest,
    handleInputValidation,
    deepDeleteBook,
    handleResponse
} = require('../other/handler')
const { body, validationResult } = require('express-validator')

const exists = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanization rules
        await handleInputValidation(req, res, [
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ])

        const { book } = req.body

        try {
            const bookModel = await Book.findById(book)
            if (!bookModel) {
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

const saveBook = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        let {
            title,
            description,
            author,
            scraps: scrapsRaw,
            isPublic,
            representative,
            likes,
            createdAt,
        } = req.body

        const scraps = JSON.parse(scrapsRaw)

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }
        
        // Create the document in MongoDB
        const bookModel = new Book({
            author,
            scraps,
            title,
            description,
            isPublic: isPublic ? false : true,
            representative,
            likes,
            createdAt: createdAt ? createdAt : new Date()
        })
        await bookModel.save()

        // if (privacy === 'public') {
        //     await handleAction(req, res, {
        //         _id: new mongoose.Types.ObjectId(),
        //         actionType: 'postBook',
        //         senderAuthor: author,
        //         targetAuthor: author,
        //         targetBook: book._id,
        //     })
        // }

        // Add the book reference to each scrap
        for (const scrap of scraps) {
            const scrapModel = await Scrap.findById(scrap)
            if (!scrapModel) {
                return handleError(res, 400, `scrap: "${scrap}" doesn't exist`)
            }
            scrapModel.book = bookModel._id
            await scrapModel.save()
        }

        // Add the book to author's books array
        authorModel.books.push(bookModel._id)
        await authorModel.save()

        return handleResponse(res, { book: bookModel._id })
    }
    await handleRequest(req, res, code)
}

const addScrap = async (req, res) => {
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

        // Add the scrap's id to the book's scraps array
        bookModel.scraps.pull(scrap)
        bookModel.scraps.push(scrap)

        // Set the book as the scrap's book
        scrapModel.book = book

        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])

        return handleResponse(res, { book, scrap })
    }
    await handleRequest(req, res, code)
}

const removeScrap = async (req, res) => {
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

        if (!bookModel.scraps.includes(scrap) || !scrapModel.book === book) {
            bookModel.scraps.pull(scrap)
            scrapModel.book = ''
            await Promise.all([
                bookModel.save(),
                scrapModel.save(),
            ])
            return handleError(res, 400, `The scrap: "${scrapModel.title}" doesn't belong to the book: "${bookModel.title}"`)
        }

        // Remove the scrap's id from the book's scraps array
        bookModel.scraps.pull(scrap)

        // Set the scrap's book variable to empty
        scrapModel.book = ''

        await Promise.all([
            bookModel.save(),
            scrapModel.save(),
        ])

        return handleResponse(res, { book, scrap })
    }
    await handleRequest(req, res, code)
}

const addLike = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ], validationResult)

        const { author, book } = req.body

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `user: "${author}" doesn't exist`)
        }
        const bookModel = await Book.findById(book)
        if (!bookModel) {
            return handleError(res, 400, `book: "${book}" doesn't exist`)
        }

        // Check to see if the book is already liked by that person
        if (bookModel.likes.includes(author) || authorModel.likedBooks.includes(book)) {
            bookModel.likes.pull(author)
            authorModel.likedBooks.pull(book)

            bookModel.likes.push(author)
            authorModel.likedBooks.push(book)

            await Promise.all([
                bookModel.save(),
                authorModel.save(),
            ])

            return handleError(res, 400, `${authorModel.pseudonym} already liked the book: "${bookModel.title}"`)
        }

        // Refresh the array
        bookModel.likes.pull(author)
        authorModel.likedBooks.pull(book)

        // Add the like
        bookModel.likes.push(author)
        authorModel.likedBooks.push(book)

        await Promise.all([
            bookModel.save(),
            authorModel.save(),
        ])

        return handleResponse(res, { user: author, book })
    }
    await handleRequest(req, res, code)
}

const removeLike = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('book').exists().withMessage('body: book is required'),
            body('book').isMongoId().withMessage('body: book must be MongoId'),
        ], validationResult)

        const { author, book } = req.body

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `user: "${author}" doesn't exist`)
        }
        const bookModel = await Book.findById(book)
        if (!bookModel) {
            return handleError(res, 400, `book: "${book}" doesn't exist`)
        }

        // Check to see if the book isn't already liked by that person
        if (!bookModel.likes.includes(author) || !authorModel.likedBooks.includes(book)) {
            bookModel.likes.pull(author)
            authorModel.likedBooks.pull(book)

            await Promise.all([
                bookModel.save(),
                authorModel.save(),
            ])

            return handleError(res, 400, `${authorModel.pseudonym} never liked the book: "${bookModel.title}"`)
        }

        // Remove the book like association from the arrays
        bookModel.likes.pull(author)
        authorModel.likedBooks.pull(book)

        await Promise.all([
            bookModel.save(),
            authorModel.save(),
        ])

        return handleResponse(res, { user: author, book })
    }
    await handleRequest(req, res, code)
}

const deleteBooks = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('books').exists().withMessage('body: book is required'),
        ], validationResult)

        const { books } = req.body

        // Deep delete each book
        const deleteBooks = []
        for (const book of books) {
            deleteBooks.push(deepDeleteBook(req, res, book))
        }
        await Promise.all(deleteBooks)

        return handleResponse(res, { books })
    }
    await handleRequest(req, res, code)
}


module.exports = {
    exists,
    saveBook,
    addScrap,
    removeScrap,
    addLike,
    removeLike,
    deleteBooks,
}