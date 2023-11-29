require('dotenv').config()
const fs = require('fs')
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handleRequest
} = require('../handler')

const exists = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const saveBook = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const addScrap = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const removeScrap = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const removeThread = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const addLike = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const removeLike = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

module.exports = {
    exists,
    saveBook,
    addScrap,
    removeScrap,
    removeThread,
    addLike,
    removeLike,
}