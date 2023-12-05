const express = require('express')
const {
    get,
    getPhoto,
    set,
    reverseGeocode,
    authorSearch,
    scrapSearch,
    bookSearch,
    generalSearch,
    question,
} = require('../controllers/utilityController')

const router = express.Router()

router.get('/get/:model/:id/:key/:user', get)
router.get('/getPhoto/:photo/:size', getPhoto)
router.patch('/set', set)

router.post('/reverseGeocode', reverseGeocode)

router.post('/authorSearch', authorSearch)
router.post('/scrapSearch', scrapSearch)
router.post('/bookSearch', bookSearch)
router.post('/generalSearch', generalSearch)

router.post('/question', question)

module.exports = router