const express = require('express')
const {
    exists,
    saveScrap,
    deleteScraps,
    addThread,
    removeThread,
} = require('../controllers/scrapController')

const router = express.Router()

router.post('/exists', exists)
router.post('/saveScrap', saveScrap)
router.post('/deleteScraps', deleteScraps)
router.patch('/addThread', addThread)
router.patch('/removeThread', removeThread)

module.exports = router