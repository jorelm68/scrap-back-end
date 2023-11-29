require('dotenv').config()
const mongoose = require('mongoose')
const fs = require('fs')
const bcrypt = require('bcrypt')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handleRequest,
    handleResponse,
    handleInputValidation,
} = require('../handler')
const { body, param, validationResult } = require('express-validator')
const saltRounds = 10

const exists = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
        ], validationResult)

        const { user } = req.body

        let exists = false;

        // Check if the user exists
        try {
            const author = await Author.findById(user)
            if (author) {
                exists = true
            }
        } catch (error) {
            exists = false
        }

        return handleResponse(res, { exists })
    }
    await handleRequest(req, res, code)
}

const signUp = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('pseudonym').exists().withMessage('body: pseudonym is required'),
            body('email').exists().withMessage('body: email is required'),
            body('password').exists().withMessage('body: password is required')
        ], validationResult)

        const { pseudonym, email, password, headshot, cover, firstName, lastName, pushToken } = req.body

        // Check if the pseudonym is already taken
        const existingPseudonym = await Author.findOne(pseudonym)
        if (existingPseudonym) {
            return handleError(res, 400, 'Pseudonym is already taken')
        }

        // Check if email is already registered
        const existingEmail = await Author.findOne(email)
        if (existingEmail) {
            return handleError(res, 400, 'Email is already registered with another account')
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create a new author document in MongoDB
        const user_id = await handleCreateAuthor({
            pseudonym,
            email,
            password: hashedPassword,

            headshot,
            cover,

            firstName,
            lastName,

            pushToken,
        })

        return handleResponse(res, { user: user_id })
    }
    await handleRequest(req, res, code)
}

const signIn = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('value').exists().withMessage('body: value is required'),
            body('password').exists().withMessage('body: password is required'),
        ], validationResult)

        const { value, password } = req.body

        // Find the user in the database by email or pseudonym
        const userModel = await Author.findOne({
            $or: [{ email: value }, { pseudonym: value }],
        })

        // Check if user exists
        if (!userModel) {
            return handleError(res, 400, 'Invalid credentials')
        }

        // Check if password is correct
        const correct = await handleMongoVerifyPassword(userModel._id, password)

        if (!correct) {
            return handleError(res, 400, 'Invalid credentials')
        }

        return handleResponse(res, { user: userModel._id})
    }
    await handleRequest(req, res, code)
}

const deleteAccount = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            param('user').exists().withMessage('body: user is required'),
            param('user').isMongoId().withMessage('body: user must be valid MongoId')
        ], validationResult)

        const { user } = req.params

        await deepDeleteAuthor(req, res, user)

        return handleResponse(res, { user })
    }
    await handleRequest(req, res, code)
}

const checkCredentials = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const sendRequest = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const removeRequest = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const acceptRequest = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const rejectRequest = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const removeFriend = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const removeAction = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

module.exports = {
    exists,
    signUp,
    signIn,
    deleteAccount,
    checkCredentials,
    sendRequest,
    removeRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    removeAction,
}