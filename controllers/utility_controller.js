require('dotenv').config()
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handle_request,
} = require('../handler')

const get = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const set = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const reverse_geocode = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const author_search = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const scrap_search = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const book_search = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const general_search = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

module.exports = {
    get,
    set,
    reverse_geocode,
    author_search,
    scrap_search,
    book_search,
    general_search,
}