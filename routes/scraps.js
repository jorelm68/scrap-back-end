const express = require('express')
const {
    exists,
    saveScrap,
    addThread,
    removeThread,
} = require('../controllers/scrapController')

const router = express.Router()

router.post('/exists', exists)
router.post('/saveScrap', saveScrap)

module.exports = router