require('dotenv').config()
const fs = require('fs')
const mongoose = require('mongoose')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handle_request
} = require('../handler')

const exists = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const save_book = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const add_scrap = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const remove_scrap = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const remove_thread = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const add_like = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const remove_like = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

module.exports = {
    exists,
    save_book,
    add_scrap,
    remove_scrap,
    remove_thread,
    add_like,
    remove_like,
}