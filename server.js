require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const mongoose = require('mongoose')
const authorRoutes = require('./routes/authors')
const scrapRoutes = require('./routes/scraps')
const bookRoutes = require('./routes/books')
const utilityRoutes = require('./routes/utility')

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
const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.header('x-api-key')

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    // API key is valid, continue to the next middleware or route handler
    next()
}
app.use('/api', apiKeyMiddleware)

// routes
app.use('/api/authors', authorRoutes)
app.use('api/scraps', scrapRoutes)
app.use('api/books', bookRoutes)
app.use('api/utility', utilityRoutes)

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