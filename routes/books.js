const express = require('express')
const {
    exists,
    save_book,
    add_scrap,
    remove_scrap,
    remove_thread,
    add_like,
    remove_like,
} = require('../controllers/book_controller')

const router = express.Router()

router.post('/exists', exists)
router.post('/save_book', save_book)

router.patch('/add_scrap', add_scrap)
router.patch('/remove_scrap', remove_scrap)

router.patch('/remove_thread', remove_thread)

router.patch('/add_like', add_like)
router.patch('/remove_like', remove_like)

module.exports = router