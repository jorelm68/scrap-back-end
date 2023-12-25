require('dotenv').config()
const ejs = require('ejs')
const fs = require('fs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Author = require('../models/Author')
const ConfirmationToken = require('../models/ConfirmationToken')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const Action = require('../models/Action')
const PasswordToken = require('../models/PasswordToken')
const {
    handleRequest,
    handleError,
    handleResponse,
    handleInputValidation,
    handleMongoVerifyPassword,
    deepDeleteAuthor,
    handleAction,
    sendEmail,
} = require('../other/handler')
const { body, param, validationResult } = require('express-validator')
const saltRounds = 10

const exists = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
        ], validationResult)

        const { author } = req.body

        let exists = false;

        // Check if the user exists
        try {
            const authorModel = await Author.findById(author)
            if (authorModel) {
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

        const {
            pseudonym,
            email,
            password,
            firstName,
            lastName,
            pushToken,
            createdAt,
            miles,
            headshotAndCover,
        } = req.body

        // Check if the pseudonym is already taken
        const existingPseudonym = await Author.findOne({ pseudonym })
        if (existingPseudonym) {
            return handleError(res, 400, 'That pseudonym is already taken')
        }

        // Check if email is already registered
        const existingEmail = await Author.findOne({ email })
        if (existingEmail) {
            return handleError(res, 400, 'That email is already registered with another account')
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create a new author document in MongoDB
        const authorModel = await Author.create({
            pseudonym: pseudonym ? pseudonym : '',
            email: email ? email : '',
            password: hashedPassword ? hashedPassword : '',
            activated: activated ? activated : false,

            firstName: firstName ? firstName : '',
            lastName: lastName ? lastName : '',

            headshotAndCover: headshotAndCover ? headshotAndCover : '',

            miles: miles ? miles : 0,

            pushToken: pushToken ? pushToken : '',

            createdAt: createdAt ? createdAt : new Date()
        })
        await authorModel.save()

        // Create a ConfirmationToken for this account so they can verify
        const confirmationTokenModel = new ConfirmationToken({
            author: authorModel._id,
        })
        await confirmationTokenModel.save()

        // Send an email to the person's email address to activate their account
        const templatePath = 'views/emailActivateAccount.ejs'; // Replace with your EJS file path
        const templateContent = fs.readFileSync(templatePath, 'utf8');

        const htmlContent = ejs.render(templateContent, { firstName: authorModel.firstName, confirmationToken: confirmationTokenModel._id })
        await sendEmail(req, res, email, 'Activate Account', htmlContent)

        return handleResponse(res, { author: authorModel._id })
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

        // Find the author in the database by email or pseudonym
        const authorModel = await Author.findOne({
            $or: [{ email: value }, { pseudonym: value }],
        })

        // Check if author exists
        if (!authorModel) {
            return handleError(res, 400, 'Invalid credentials')
        }

        // Check if password is correct
        const correct = await handleMongoVerifyPassword(authorModel._id, password)

        if (!correct) {
            return handleError(res, 400, 'Invalid credentials')
        }

        return handleResponse(res, { author: authorModel._id, pseudonym: authorModel.pseudonym })
    }
    await handleRequest(req, res, code)
}
const deleteAccount = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be valid MongoId')
        ], validationResult)

        const { author } = req.body

        await deepDeleteAuthor(req, res, author)

        return handleResponse(res, { author })
    }
    await handleRequest(req, res, code)
}
const checkCredentials = async (req, res) => {
    const code = async (req, res) => {
        // Apply input validation and sanitization rules
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be a MongoID'),
            body('password').exists().withMessage('body: password is required'),
        ], validationResult)

        const { author, password } = req.body

        // Perform password verification
        const correct = await handleMongoVerifyPassword(author, password)

        if (!correct) {
            return handleError(res, 400, 'Invalid credentials')
        }
        return handleResponse(res, { author })
    }
    await handleRequest(req, res, code)
}
const changePassword = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('currentPassword').exists().withMessage('body: currentPassword is required'),
            body('newPassword').exists().withMessage('body: newPassword is required'),
        ], validationResult)

        const { author, currentPassword, newPassword } = req.body

        const correct = await handleMongoVerifyPassword(author, currentPassword)
        if (!correct) {
            return handleError(res, 400, `Invalid credentials`)
        }

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
        const authorModel = await Author.findById(author)
        authorModel.password = hashedPassword
        await authorModel.save()

        return handleResponse(res, { author })
    }
    await handleRequest(req, res, code)
}
const forgotPassword = async (req, res) => {
    const code = async (req, res) => {
        await handleInputValidation(req, res, [
            body('email').exists().withMessage('body: email is required'),
        ], validationResult)

        const { email } = req.body
        const authorModel = await Author.findOne({ email })
        if (!authorModel) {
            return handleError(res, 400, `email: "${email}" isn't associated with an account`)
        }

        const existingPasswordToken = await PasswordToken.findOne({ email })
        if (existingPasswordToken) {
            if (existingPasswordToken.expirationDate < new Date()) {
                await existingPasswordToken.deleteOne()
            }
            else {
                return handleError(res, 400, `You already have an active password reset request. Please check your email or wait until your current request expires before making another.`)
            }
        }

        // Create a PasswordToken that expires in 10 minutes
        const currentTime = new Date();
        const tenMinutesLater = new Date(currentTime.getTime() + 10 * 60 * 1000);

        const passwordToken = new PasswordToken({
            email,

            createdAt: currentTime,
            expirationDate: tenMinutesLater,
        })
        await passwordToken.save()

        // Read the EJS template file
        const templatePath = 'views/emailResetPassword.ejs'; // Replace with your EJS file path
        const templateContent = fs.readFileSync(templatePath, 'utf8');

        const htmlContent = ejs.render(templateContent, { firstName: authorModel.firstName, passwordToken: passwordToken._id })
        await sendEmail(req, res, email, 'Reset Password', htmlContent)

        return handleResponse(res, { author: authorModel._id, email })
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
            return handleError(res, 400, `user: "${user}" doesn't exist`)
        }
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
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
            return handleError(res, 400, `You are already friends with ${authorModel.pseudonym}`)
        }

        if (userModel.outgoingFriendRequests.includes(author) || authorModel.incomingFriendRequests.includes(user)) {
            // Make sure the arrays are correct
            userModel.outgoingFriendRequests.pull(author)
            authorModel.incomingFriendRequests.pull(user)
            userModel.outgoingFriendRequests.push(author)
            authorModel.incomingFriendRequests.push(user)

            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, `You already sent a friend request to ${authorModel.pseudonym}`)
        }

        // Add the author to user's sent array
        userModel.outgoingFriendRequests.pull(author)
        userModel.outgoingFriendRequests.push(author)

        // Add the user to the author's received array
        authorModel.incomingFriendRequests.pull(user)
        authorModel.incomingFriendRequests.push(user)

        await Promise.all([
            userModel.save(),
            authorModel.save(),
        ])

        await handleAction({
            type: 'sendRequest',
            sender: {
                author: user,
            },
            target: {
                author,
            },
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
            return handleError(res, 400, `user: "${user}" doesn't exist`)
        }
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        if (userModel.friends.includes(author) || authorModel.friends.includes(user)) {
            // Fix the database
            userModel.friends.pull(author)
            authorModel.friends.pull(user)
            userModel.outgoingFriendRequests.pull(author)
            userModel.incomingFriendRequests.pull(author)
            authorModel.incomingFriendRequests.pull(user)
            authorModel.outgoingFriendRequests.pull(user)
            userModel.friends.push(author)
            authorModel.friends.push(user)

            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, `You are already friends with ${authorModel.pseudonym}`)
        }

        if (!userModel.outgoingFriendRequests.includes(author) || !authorModel.incomingFriendRequests.includes(user)) {
            userModel.outgoingFriendRequests.pull(author)
            authorModel.incomingFriendRequests.pull(user)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, `You haven\'t yet sent a friend request to ${authorModel.pseudonym}`)
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
            return handleError(res, 400, `user: "${user}" doesn't exist`)
        }

        if (user === author) {
            userModel.friends.pull(user)
            userModel.outgoingFriendRequests.pull(user)
            userModel.incomingFriendRequests.pull(user)
            await userModel.save()
            return handleError(res, 400, 'You cannot accept a friend request from yourself')
        }

        // Check for common errors in the request
        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        if (userModel.friends.includes(author) || authorModel.friends.includes(user)) {
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
            return handleError(res, 400, `You are already friends with ${authorModel.pseudonym}`)
        }
        else if (!userModel.incomingFriendRequests.includes(author) || !authorModel.outgoingFriendRequests.includes(user)) {
            userModel.incomingFriendRequests.pull(author)
            authorModel.outgoingFriendRequests.pull(user)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, `${authorModel.pseudonym} hasn\'t yet sent you a friend request`)
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

        await handleAction({
            type: 'acceptRequest',
            sender: {
                author: user,
            },
            target: {
                author,
            },
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
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        if (userModel.friends.includes(author) || authorModel.friends.includes(user)) {
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
            return handleError(res, 400, `You are already friends with ${authorModel.pseudonym}`)
        }
        else if (!authorModel.outgoingFriendRequests.includes(user) || !userModel.incomingFriendRequests.includes(author)) {
            authorModel.outgoingFriendRequests.pull(user)
            userModel.incomingFriendRequests.pull(author)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, `${authorModel.pseudonym} hasn't yet sent you a friend request`)
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
            return handleError(res, 400, `user: "${user}" doesn't exist`)
        }

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        if (!userModel.friends.includes(author)) {
            userModel.friends.pull(author)
            authorModel.friends.pull(user)
            await Promise.all([
                userModel.save(),
                authorModel.save(),
            ])
            return handleError(res, 400, `You are not already friends with ${authorModel.pseudonym}`)
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
            body('author').exists().withMessage('body: author is required'),
            body('author').isMongoId().withMessage('body: author must be MongoId'),
            body('action').exists().withMessage('body: action is required'),
            body('action').isMongoId().withMessage('body: action must be MongoId'),
        ], validationResult)

        const { author, action } = req.body

        const authorModel = await Author.findById(author)
        if (!authorModel) {
            return handleError(res, 400, `author: "${author}" doesn't exist`)
        }

        authorModel.actions.pull(action)
        await authorModel.save()

        await Action.findOneAndDelete({ _id: action })

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
    changePassword,
    forgotPassword,
    sendRequest,
    removeRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    removeAction,
}