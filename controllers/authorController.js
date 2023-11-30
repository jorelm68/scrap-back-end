require('dotenv').config()
const mongoose = require('mongoose')
const fs = require('fs')
const bcrypt = require('bcrypt')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const Action = require('../models/Action')
const {
    handleRequest,
    handleResponse,
    handleInputValidation,
    handleMongoVerifyPassword,
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

        return handleResponse(res, { user: userModel._id })
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
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be a MongoID'),
            body('password').exists().withMessage('body: password is required'),
        ])

        const { user, password } = req.body

        // Perform password verification
        const correct = await handleMongoVerifyPassword(user, password)

        if (!correct) {
            return handleError(res, 400, 'Invalid credentials')
        }
        return handleResponse(res, { user })
    }
    await handleRequest(req, res, code)
}

const sendRequest = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be MongoId'),
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        const { user, author } = req.body

        if (user === author) {
            return handleError(res, 400, 'You cannot send a request to yourself')
        }

        // Check for common errors in the request
        const userModel = await Author.findById(user)
        if (!userModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: ${author} doesn't exist`)
        }

        if (userModel.friends.includes(author) || authorModel.friends.includes(user)) {
            // Make sure the arrays are correct
            userModel.friends.pull(author)
            userModel.friends.push(author)

            authorModel.friends.pull(user)
            authorModel.friends.push(user)

            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, 'You are already friends')
        }

        // Add the author to user's sent array
        userModel.outgoingFriendRequests.pull(author)
        userModel.outgoingFriendRequests.push(author)

        // Add the user to the author's received array
        authorModel.incomingFriendRequests.pull(author)
        authorModel.incomingFriendRequests.push(author)

        await Promise.all([
            userModel.save(),
            authorModel.save(),
        ])

        await handleAction(req, res, {
            _id: new mongoose.Types.ObjectId(),
            actionType: 'sendRequest',
            senderAuthor: user,
            targetAuthor: author,
        })

        return handleResponse(res, { user, author })
    }
    await handleRequest(req, res, code)
}
const removeRequest = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be MongoId'),
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        const { user, author } = req.body

        // Check for common errors in the request
        const userModel = await Author.findById(user)
        if (!userModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: ${author} doesn't exist`)
        }

        if (!userModel.outgoingFriendRequests.includes(author) || !authorModel.incomingFriendRequests.includes(user)) {
            userModel.outgoingFriendRequests.pull(author)
            authorModel.incomingFriendRequests.pull(user)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, 'You never sent that author a friend request')
        }

        // Remove the author from the user's sent array
        userModel.outgoingFriendRequests.pull(author)

        // Remove the user from the author's received array
        authorModel.incomingFriendRequests.pull(user)

        await Promise.all([
            userModel.save(),
            authorModel.save(),
        ])

        return handleResponse(res, { user, author })
    }
    await handleRequest(req, res, code)
}
const acceptRequest = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be MongoId'),
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        const { user, author } = req.body

        const userModel = await Author.findById(user)
        if (!userModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }

        if (user === author) {
            userModel.friends.pull(user)
            userModel.outgoingFriendRequests.pull(user)
            userModel.incomingFriendRequests.pull(user)
            await userModel.save()
            return handleError(res, 400, 'You cannot interact with yourself')
        }

        // Check for common errors in the request
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: ${author} doesn't exist`)
        }

        if (!userModel.incomingFriendRequests.includes(author) || !authorModel.outgoingFriendRequests.includes(user)) {
            userModel.incomingFriendRequests.pull(author)
            authorModel.outgoingFriendRequests.pull(user)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, 'That user never sent you a friend request')
        }
        else if (userModel.friends.includes(author) || authorModel.friends.includes(user)) {
            userModel.outgoingFriendRequests.pull(author)
            userModel.incomingFriendRequests.pull(author)
            authorModel.outgoingFriendRequests.pull(user)
            authorModel.incomingFriendRequests.pull(user)
            userModel.friends.pull(author)
            authorModel.friends.pull(user)
            userModel.friends.push(author)
            authorModel.friends.push(user)
            await Promise.all([
                authorModel.save(),
                userModel.save(),
            ])
            return handleError(res, 400, 'You are already friends')
        }

        // Remove the user from the author's sent array
        authorModel.outgoingFriendRequests.pull(user)

        // Remove the author from the user's received array
        userModel.incomingFriendRequests.pull(author)

        // Add the user to the author's friends array
        authorModel.friends.push(user)

        // Add the author to the user's friends array
        userModel.friends.push(author)

        await Promise.all([
            authorModel.save(),
            userModel.save(),
        ])

        await handleAction(req, res, {
            _id: new mongoose.Types.ObjectId(), // Generate a new unique ObjectId
            actionType: 'acceptRequest',
            senderAuthor: user,
            targetAuthor: author,
        })

        return handleResponse(res, { user, author })
    }
    await handleRequest(req, res, code)
}
const rejectRequest = async (req, res) => {
    const code = async (req, res) => {
        // Handle input validation and sanitization
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be MongoId'),
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        const { user, author } = req.body

        // Check for common errors in the request
        const userModel = await Author.findById(user)
        if (!userModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: ${author} doesn't exist`)
        }
        if (!authorModel.outgoingFriendRequests.includes(user) || !userModel.incomingFriendRequests.includes(author)) {
            authorModel.outgoingFriendRequests.pull(user)
            userModel.incomingFriendRequests.pull(author)
            authorModel.incomingFriendRequests.pull(user)
            userModel.outgoingFriendRequests.pull(author)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, 'That author never sent you a friend request')
        }

        // Remove the user from the author's sent array
        authorModel.outgoingFriendRequests.pull(user)

        // Remove the author from the user's received array
        userModel.incomingFriendRequests.pull(author)

        await Promise.all([
            authorModel.save(),
            userModel.save(),
        ])

        return handleResponse(res, { user, author })
    }
    await handleRequest(req, res, code)
}
const removeFriend = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be MongoId'),
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        const { user, author } = req.body

        // Check for common errors in the request
        const userModel = await Author.findById(user)
        if (!userModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }

        if (!userModel.friends.includes(author)) {
            userModel.friends.pull(author)
            authorModel.friends.pull(user)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, 'You are not friends with that author')
        }

        // Remove the author from the user's friends array
        userModel.friends.pull(author)

        // Remove the user from the author's friends array
        authorModel.friends.pull(user)

        await Promise.all([
            userModel.save(),
            authorModel.save(),
        ])

        return handleResponse(res, { user, author })
    }
    await handleRequest(req, res, code)
}
const removeAction = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('user').exists().withMessage('body: user is required'),
            body('user').isMongoId().withMessage('body: user must be MongoId'),
            body('action').exists().withMessage('body: action is required'),
            body('action').isMongoId().withMessage('body: action must be MongoId'),
        ], validationResult)

        const { user, action } = req.body

        const userModel = await Author.findById(user)
        if (!userModel) {
            return handleError(res, 400, `user: ${user} doesn't exist`)
        }

        authorModel.actions.pull(action)
        await authorModel.save()

        return handleResponse(res, { author, action })
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