const express = require('express')
const path = require('path')

const router = express.Router()

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'homePage.html'))
})
router.get('/privacyPolicy', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages', 'privacyPolicy.html'))
})

module.exports = router