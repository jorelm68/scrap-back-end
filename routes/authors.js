const express = require('express')
const {
    exists,
    sign_up,
    sign_in,
    delete_account,
    check_credentials,
    send_request,
    remove_request,
    accept_request,
    reject_request,
    remove_friend,
    remove_action,
} = require('../controllers/author_controller')

const router = express.Router()

router.post('/exists', exists)
router.post('/sign_up', sign_up)
router.post('/sign_in', sign_in)
router.post('/delete_account', delete_account)
router.post('/check_credentials', check_credentials)

router.patch('/send_request', send_request)
router.patch('/remove_request', remove_request)
router.patch('/accept_request', accept_request)
router.patch('/reject_request', reject_request)
router.patch('/remove_friend', remove_friend)
router.patch('/remove_action', remove_action)

module.exports = router