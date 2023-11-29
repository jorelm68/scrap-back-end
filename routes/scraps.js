const express = require('express')
const {
    exists,
    saveScrap,
    addLike,
    removeLike,
    addThread,
    removeThread,
} = require('../controllers/scrapController')

const router = express.Router()

router.post('/exists', exists)
router.post('/saveScrap', saveScrap)

router.patch('/addLike', addLike)
router.patch('/removeLike', removeLike)

router.patch('/addThread', addThread)
router.patch('/removeThread', removeThread)

module.exports = router