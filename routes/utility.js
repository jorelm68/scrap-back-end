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
    addThread,
    removeThread,
    scrapCoordinates,
    bookCoordinates,
    calcMiles,
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

router.patch('/addThread', addThread)
router.patch('/removeThread', removeThread)

router.post('/question', question)

router.post('/scrapCoordinates', scrapCoordinates)
router.post('/bookCoordinates', bookCoordinates)

router.post('/calculateMiles', calcMiles)
module.exports = router