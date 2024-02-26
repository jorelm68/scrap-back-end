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
    profileBooksImage,
    libraryScrapsImage,
    book1Image,
    book2Image,
    book3Image,
    book4Image,
    book5Image,
    book6Image,
    book7Image,
    book8Image,
    book9Image,
    book10Image,
    cameraPrograph,
    cameraRetrograph,
    profileMap,
} = require('../controllers/viewsController')

const router = express.Router()

router.get('/', homePage)
router.get('/privacyPolicy', privacyPolicy)
router.get('/resetPassword/:passwordToken', resetPassword)
router.post('/resetPasswordConfirmation', resetPasswordConfirmation)
router.get('/activateAccount/:confirmationToken', activateAccount)
router.get('/changeEmail/:confirmationToken', changeEmail)
router.get('/notificationIcon', notificationIcon)
router.get('/profileBooksImage', profileBooksImage)
router.get('/libraryScrapsImage', libraryScrapsImage)
router.get('/book1Image', book1Image),
router.get('/book2Image', book2Image),
router.get('/book3Image', book3Image),
router.get('/book4Image', book4Image),
router.get('/book5Image', book5Image),
router.get('/book6Image', book6Image),
router.get('/book7Image', book7Image),
router.get('/book8Image', book8Image),
router.get('/book9Image', book9Image),
router.get('/book10Image', book10Image),
router.get('/cameraPrograph', cameraPrograph),
router.get('/cameraRetrograph', cameraRetrograph),
router.get('/profileMap', profileMap),
module.exports = router