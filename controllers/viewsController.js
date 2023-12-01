require('dotenv').config()
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const PasswordToken = require('../models/PasswordToken')
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
        await authorModel.save()

        return res.render('resetPasswordSuccess', {})
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

module.exports = {
    resetPassword,
    resetPasswordConfirmation,
    privacyPolicy,
    homePage,
}