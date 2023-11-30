const express = require('express')
const {
    get,
    set,
    reverseGeocode,
    authorSearch,
    scrapSearch,
    bookSearch,
    generalSearch,
    question,
} = require('../controllers/utilityController')

const router = express.Router()

router.patch('/get', get)
router.patch('/set', set)

router.post('/reverseGeocode', reverseGeocode)

router.post('/authorSearch', authorSearch)
router.post('/scrapSearch', scrapSearch)
router.post('/bookSearch', bookSearch)
router.post('/generalSearch', generalSearch)

router.post('/question', question)

module.exports = router