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
        ])

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
            body('scraps').exists().withMessage('body: scrap is required'),
        ], validationResult)

        const { scraps } = req.body

        // Deep delete each scrap
        const deleteScraps = []
        for (const scrap of scraps) {
            deleteScraps.push(deepDeleteScrap(req, res, scrap))
        }
        await Promise.all(deleteScraps)

        return handleResponse(res, { scraps })
    }
    await handleRequest(req, res, code)
}

module.exports = {
    exists,
    saveScrap,
    deleteScraps,
}