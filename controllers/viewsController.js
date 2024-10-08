require('dotenv').config()
const bcrypt = require('bcrypt')
const fs = require('fs')
const mongoose = require('mongoose')
const PasswordToken = require('../models/PasswordToken')
const ConfirmationToken = require('../models/ConfirmationToken')
const Author = require('../models/Author')
const {
    handleRequest,
} = require('../other/handler')
const { body, param, validationResult } = require('express-validator')
const saltRounds = 10

const resetPassword = async (req, res) => {
    const code = async (req, res) => {
        const { passwordToken } = req.params

        if (!mongoose.Types.ObjectId.isValid(passwordToken)) {
            return res.render('invalidPasswordToken', { passwordToken })
        }

        const passwordTokenModel = await PasswordToken.findById(passwordToken)
        if (!passwordTokenModel || passwordTokenModel.expirationDate < new Date()) {
            return res.render('invalidPasswordToken', { passwordToken })
        }

        return res.render('resetPassword', { passwordToken })
    }
    await handleRequest(req, res, code)
}
const resetPasswordConfirmation = async (req, res) => {
    const code = async (req, res) => {
        const { newPassword, passwordToken } = req.body

        const passwordTokenModel = await PasswordToken.findById(passwordToken)
        const email = passwordTokenModel.email
        await passwordTokenModel.deleteOne()

        const authorModel = await Author.findOne({ email })
        if (!authorModel) {
            return res.render('resetPasswordFailure', {})
        }

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
        authorModel.password = hashedPassword
        authorModel.token = authorModel.token + 1
        await authorModel.save()

        return res.render('resetPasswordSuccess', {})
    }
    await handleRequest(req, res, code)
}
const activateAccount = async (req, res) => {
    const code = async (req, res) => {
        const { confirmationToken } = req.params

        const confirmationTokenModel = await ConfirmationToken.findById(confirmationToken)
        if (!confirmationTokenModel) {
            return res.render('activateAccountError', {})
        }

        const author = confirmationTokenModel.author
        await confirmationTokenModel.deleteOne()

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return res.render('activateAccountError', {})
        }

        authorModel.activated = true
        await authorModel.save()
        return res.render('activateAccount', { author })
    }
    await handleRequest(req, res, code)
}
const changeEmail = async (req, res) => {
    const code = async (req, res) => {
        const { confirmationToken } = req.params

        const confirmationTokenModel = await ConfirmationToken.findById(confirmationToken)
        if (!confirmationTokenModel) {
            return res.render('changeEmailError', {})
        }

        const author = confirmationTokenModel.author
        await confirmationTokenModel.deleteOne()

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return res.render('changeEmailError', {})
        }

        authorModel.activated = true
        await authorModel.save()
        return res.render('changeEmail', { author })
    }
    await handleRequest(req, res, code)
}

const privacyPolicy = async (req, res) => {
    const code = async (req, res) => {
        return res.render('privacyPolicy', {})
    }
    await handleRequest(req, res, code)
}

const homePage = async (req, res) => {
    const code = async (req, res) => {
        return res.render('homePage', {})
    }
    await handleRequest(req, res, code)
}

const notificationIcon = async (req, res) => {
    const buffer = fs.readFileSync('assets/images/icon.png')
    res.setHeader('Content-Type', 'image/png')
    res.send(buffer)
}

const profileBooksImage = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/profileBooks.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}

const libraryScrapsImage = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/libraryScraps.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}

const book1Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book1.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book2Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book2.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book3Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book3.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book4Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book4.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book5Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book5.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book6Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book6.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book7Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book7.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book8Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book8.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book9Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book9.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const book10Image = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/book10.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}

const cameraPrograph = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/cameraPrograph.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}
const cameraRetrograph = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/cameraRetrograph.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}

const profileMap = async (req, res) => {
    const buffer = fs.readFileSync('assets/photos/profileMap.jpg')
    res.setHeader('Content-Type', 'image/jpg')
    res.send(buffer)
}

module.exports = {
    resetPassword,
    resetPasswordConfirmation,
    privacyPolicy,
    activateAccount,
    changeEmail,
    homePage,
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
}