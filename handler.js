const mongoose = require('mongoose')
const Author = require('../models/Author')
const Action = require('../models/Action')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const AWS = require('aws-sdk')
const sharp = require('sharp')
const bucketName = process.env.BUCKET_NAME
const s3 = new AWS.S3({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

const handleError = (res, status, error) => {
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

const handleFindAuthor = async (_id) => {
    return await Author.findById(_id)
}
const handleFindAction = async (_id) => {
    return await Action.findById(_id)
}
const handleFindBook = async (_id) => {
    return await Book.findById(_id)
}
const handleFindScrap = async (_id) => {
    return await Scrap.findById(_id)
}

module.exports = {
    handleError,
    handleRequest,
    handleResponse,
    handleInputValidation,
    handleFindAuthor,
    handleFindAction,
    handleFindBook,
    handleFindScrap,
}