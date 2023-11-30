const express = require('express')
const {
    exists,
    saveBook,
    addScrap,
    removeScrap,
    addLike,
    removeLike,
    deleteBooks,
} = require('../controllers/bookController')

const router = express.Router()

router.post('/exists', exists)
router.post('/saveBook', saveBook)

router.patch('/addScrap', addScrap)
router.patch('/removeScrap', removeScrap)

router.patch('/addLike', addLike)
router.patch('/removeLike', removeLike)

router.patch('/deleteBooks', deleteBooks)

module.exports = router