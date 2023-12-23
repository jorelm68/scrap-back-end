const express = require('express')
const {
    get,
    getPhoto,
    set,
    authorSearch,
    bookSearch,
    addThread,
    removeThread,
    scrapCoordinates,
    bookCoordinates,
} = require('../controllers/utilityController')

const router = express.Router()

router.get('/get/:model/:id/:key/:user', get)
router.get('/getPhoto/:photo/:size', getPhoto)
router.patch('/set', set)

router.post('/authorSearch', authorSearch)
router.post('/bookSearch', bookSearch)

router.patch('/addThread', addThread)
router.patch('/removeThread', removeThread)

router.post('/scrapCoordinates', scrapCoordinates)
router.post('/bookCoordinates', bookCoordinates)

module.exports = router