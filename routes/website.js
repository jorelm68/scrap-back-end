const express = require('express')
const path = require('path')
const {
    resetPassword,
    privacyPolicy,
    homePage,
} = require('../controllers/viewsController')

const router = express.Router()

router.get('/', homePage)
router.get('/privacyPolicy', privacyPolicy)
router.get('/resetPassword/:passwordToken', resetPassword)

module.exports = router