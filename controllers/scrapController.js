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
    getCoordinates,
    calculateMiles,
    handleScrapSort,
    recalculateAuthorMiles,
    sortAuthorScraps,
} = require('../other/handler')
const { ObjectId } = require('mongodb')
const { body, param, validationResult } = require('express-validator')

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

            latitude,
            longitude,

            threads,
            book,

            createdAt: createdAtRaw,
        } = req.body

        // Generate a unique MongoId for each image
        const prograph = new ObjectId();
        const retrograph = new ObjectId();

        // Get the image buffer data from the req.files
        const iPrograph = req.files[0].buffer
        const iRetrograph = req.files[1].buffer

        // Add the scrap's retrograph and prograph to the AWS W3 bucket
        await Promise.all([
            handleS3Put(`photos/${prograph}.jpg`, iPrograph),
            handleS3Put(`photos/${retrograph}.jpg`, iRetrograph),
        ])

        // Create the document in MongoDB
        const scrap = new Scrap({
            author: author ? author : '',
            title: title ? title : '',
            description: description ? description : '',
            prograph,
            retrograph,
            place: place ? place : '',

            latitude: latitude ? latitude : '',
            longitude: longitude ? longitude : '',

            threads: threads ? threads : [],
            book: book ? book : '',
            createdAt: createdAtRaw ? JSON.parse(createdAtRaw) : new Date()
        })
        await scrap.save()

        const authorModel = await Author.findById(author)
        if (authorModel) {
            // Add the scrap to the author's library
            authorModel.scraps.push(scrap._id)
            await authorModel.save()

            // Sort the author's scraps
            sortAuthorScraps(authorModel).then(() => {
                // Recalculate the total miles the author has traveled
                recalculateAuthorMiles(authorModel)
            })

        }

        return handleResponse(res, { scrap: scrap._id })
    }
    await handleRequest(req, res, code)
}
const deleteScraps = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            param('scraps').exists().withMessage('param: scraps is required'),
        ], validationResult)

        const { scraps: scrapsRaw } = req.params
        const scraps = JSON.parse(scrapsRaw)

        // Deep delete each scrap
        let promises = []
        for (const scrap of scraps) {
            const scrapModel = await Scrap.findById(scrap)
            if (scrapModel) {
                promises.push(deepDeleteScrap(scrapModel))
            }
        }

        const scrapModel = await Scrap.findById(scraps[0])
        if (scrapModel) {
            const authorModel = await Author.findById(scrapModel.author)
            if (authorModel) {
                // Recalculate the total miles the author has traveled
                Promise.all(promises).then(() => {
                    recalculateAuthorMiles(authorModel)
                })
            }
        }

        return handleResponse(res, { scraps })
    }
    await handleRequest(req, res, code)
}

module.exports = {
    exists,
    saveScrap,
    deleteScraps,
}