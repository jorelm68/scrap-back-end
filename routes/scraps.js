const express = require('express')
const {
    exists,
    save_scrap,
    add_like,
    remove_like,
    add_thread,
    remove_thread,
} = require('../controllers/scrap_controller')

const router = express.Router()

router.post('/exists', exists)
router.post('/save_scrap', save_scrap)

router.patch('/add_like', add_like)
router.patch('/remove_like', remove_like)

router.patch('/add_thread', add_thread)
router.patch('/remove_thread', remove_thread)

module.exports = router