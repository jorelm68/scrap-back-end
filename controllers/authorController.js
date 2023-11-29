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
    handleFindAuthor,
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
            const author = await handleFindAuthor(user)
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

    }
    await handleRequest(req, res, code)
}

const signIn = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const deleteAccount = async (req, res) => {
    const code = async (req, res) => {

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