const express = require('express')
const path = require('path')
const {
    resetPassword,
    privacyPolicy,
    homePage,
    resetPasswordConfirmation,
    activateAccount,
    changeEmail,
    notificationIcon,
    profileBooksIcon,
} = require('../controllers/viewsController')

const router = express.Router()

router.get('/', homePage)
router.get('/privacyPolicy', privacyPolicy)
router.get('/resetPassword/:passwordToken', resetPassword)
router.post('/resetPasswordConfirmation', resetPasswordConfirmation)
router.get('/activateAccount/:confirmationToken', activateAccount)
router.get('/changeEmail/:confirmationToken', changeEmail)
router.get('/notificationIcon', notificationIcon)
router.get('/profileBooksIcon', profileBooksIcon)

module.exports = router