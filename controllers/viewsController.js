require('dotenv').config()
const mongoose = require('mongoose')
const PasswordToken = require('../models/PasswordToken')
const {
    handleRequest,
    handleInputValidation,
} = require('../other/handler')
const { body, param, validationResult } = require('express-validator')

const resetPassword = async (req, res) => {
    const code = async (req, res) => {
        const { passwordToken } = req.params

        if (!mongoose.Types.ObjectId.isValid(passwordToken)) {
            return res.render('invalidPasswordToken', { passwordToken })
        }

        const passwordTokenModel = await PasswordToken.findById(passwordToken)
        if (!passwordTokenModel) {
            return res.render('invalidPasswordToken', { passwordToken })
        }

        const expirationDate = passwordTokenModel.expirationDate
        if (expirationDate < new Date()) {
            return res.render('expiredPasswordToken', { passwordToken, expirationDate })
        }

        return res.render('resetPassword', { passwordToken })
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
    privacyPolicy,
    homePage,
}