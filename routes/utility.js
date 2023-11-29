const express = require('express')
const {
    get,
    set,
    reverse_geocode,
    author_search,
    scrap_search,
    book_search,
    general_search,
} = require('../controllers/utility_controller')

const router = express.Router()

router.patch('/get', get)
router.patch('/set', set)

router.post('/reverse_geocode', reverse_geocode)

router.post('/author_search', author_search)
router.post('/scrap_search', scrap_search)
router.post('/book_search', book_search)
router.post('/general_search', general_search)

router.post('/question', question)

module.exports = router