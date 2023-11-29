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

router.patch('/addThread', addThread)
router.patch('/removeThread', removeThread)

module.exports = router