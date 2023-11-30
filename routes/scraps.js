const express = require('express')
const {
    exists,
    saveScrap,
    deleteScraps,
} = require('../controllers/scrapController')

const router = express.Router()

router.post('/exists', exists)
router.post('/saveScrap', saveScrap)
router.patch('/deleteScraps', deleteScraps)

module.exports = router