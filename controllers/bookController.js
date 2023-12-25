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
    handleResponse,
    handleScrapSort,
    getCoordinates,
    calculateMiles,
    handleError,
    handleBookSort,
    handleBookRemoveScrap,
    recalculateBookMiles,
    recalculateBookDates,
    sortAuthorBooks,
    handleBookAddScrap,
    like,
    unLike,
    handleAction
} = require('../other/handler')
const { body, param, validationResult } = require('express-validator')

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
            threads,
        } = req.body

        const scraps = JSON.parse(scrapsRaw)

        // Create the document in MongoDB
        const bookModel = new Book({
            author: author ? author : '',
            scraps: [],
            title: title ? title : '',
            description: description ? description : '',
            isPublic: isPublic ? isPublic : false,
            representative: representative ? representative : '',
            likes: likes ? likes : [],
            threads: threads ? threads : [],
            miles: 0,
            beginDate: new Date(),
            endDate: new Date(),
            createdAt: createdAt ? createdAt : new Date()
        })
        await bookModel.save()

        await recalculateBookMiles(bookModel)
        await recalculateBookDates(bookModel)

        // Add each scrap to the book
        for (const scrap of scraps) {
            const scrapModel = await Scrap.findById(scrap)
            await handleBookAddScrap(bookModel, scrapModel)
        }

        // Add the book to the author's library
        const authorModel = await Author.findById(bookModel.author)
        if (authorModel) {
            authorModel.books.push(bookModel._id)
            await authorModel.save()

            await sortAuthorBooks(authorModel)
        }

        if (isPublic) {
            await handleAction({
                type: 'postBook',
                sender: {
                    author,
                },
                target: {
                    author,
                    book: bookModel._id,
                },
            })
        }

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
        const scrapModel = await Scrap.findById(scrap)
        await handleBookAddScrap(bookModel, scrapModel)

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
        const scrapModel = await Scrap.findById(scrap)
        await handleBookRemoveScrap(bookModel, scrapModel)

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
        const bookModel = await Book.findById(book)
        await like(bookModel, authorModel)

        await handleAction({
            type: 'likeBook',
            sender: {
                author,
            },
            target: {
                author: bookModel.author,
                book,
            },
        })

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
        const bookModel = await Book.findById(book)
        await unLike(bookModel, authorModel)

        return handleResponse(res, { user: author, book })
    }
    await handleRequest(req, res, code)
}

const deleteBooks = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            param('books').exists().withMessage('param: books is required'),
        ], validationResult)

        const { books: booksRaw } = req.params

        const books = JSON.parse(booksRaw)

        // Deep delete each book
        for (const book of books) {
            const bookModel = await Book.findById(book)
            await deepDeleteBook(bookModel)
        }

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