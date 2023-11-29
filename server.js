require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const mongoose = require('mongoose')
const author_routes = require('./routes/authors')
const scrap_routes = require('./routes/scraps')
const book_routes = require('./routes/books')
const utility_routes = require('./routes/utility')

// express app
const app = express()

// CORS
app.use(cors())

// middleware
app.use(express.json())

// Configure Multer
const upload = multer()

// Middleware to process files
app.use((req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Handle Multer errors
            return res.status(400).json({ error: 'File upload error: ' + err.message, data: null })
        } else if (err) {
            // Handle other errors
            return res.status(400).json({ error: 'File upload error: ' + err.message, data: null })
        }
        next()
    })
})

// Log each request
app.use((req, res, next) => {
    console.log(req.path, req.method, req.body)
    next()
})

// Middleware to process the API key
const api_key_middleware = (req, res, next) => {
    const apiKey = req.header('x-api-key')

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    // API key is valid, continue to the next middleware or route handler
    next()
}
app.use('/api', api_key_middleware)

// routes
app.use('/api/authors', author_routes)
app.use('api/scraps', scrap_routes)
app.use('api/books', book_routes)
app.use('api/utility', utility_routes)

// connect to db
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        // listen for requests
        app.listen(process.env.PORT, () => {
            console.log(`connected to MongoDB & listening on port ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log(error)
    })