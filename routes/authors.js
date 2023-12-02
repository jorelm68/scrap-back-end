const express = require('express')
const {
    exists,
    signUp,
    signIn,
    deleteAccount,
    checkCredentials,
    changePassword,
    forgotPassword,
    sendRequest,
    removeRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    removeAction,
} = require('../controllers/authorController')

const router = express.Router()

router.post('/exists', exists)
router.post('/signUp', signUp)
router.post('/signIn', signIn)
router.delete('/deleteAccount', deleteAccount)
router.post('/checkCredentials', checkCredentials)
router.post('/changePassword', changePassword)
router.post('/forgotPassword', forgotPassword)

router.patch('/sendRequest', sendRequest)
router.patch('/removeRequest', removeRequest)
router.patch('/acceptRequest', acceptRequest)
router.patch('/rejectRequest', rejectRequest)
router.patch('/removeFriend', removeFriend)
router.patch('/removeAction', removeAction)

module.exports = router