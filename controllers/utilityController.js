require('dotenv').config()
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handleRequest,
} = require('../handler')

const get = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const set = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const reverseGeocode = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const authorSearch = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const scrapSearch = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const bookSearch = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

const generalSearch = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

module.exports = {
    get,
    set,
    reverseGeocode,
    authorSearch,
    scrapSearch,
    bookSearch,
    generalSearch,
}