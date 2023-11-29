const express = require('express')
const {
    exists,
    saveBook,
    addScrap,
    removeScrap,
    removeThread,
    addLike,
    removeLike,
} = require('../controllers/bookController')

const router = express.Router()

router.post('/exists', exists)
router.post('/saveBook', saveBook)

router.patch('/addScrap', addScrap)
router.patch('/removeScrap', removeScrap)

router.patch('/removeThread', removeThread)

router.patch('/addLike', addLike)
router.patch('/removeLike', removeLike)

module.exports = router