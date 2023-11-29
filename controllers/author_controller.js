require('dotenv').config()
const mongoose = require('mongoose')
const fs = require('fs')
const bcrypt = require('bcrypt')
const Author = require('../models/Author')
const Book = require('../models/Book')
const Scrap = require('../models/Scrap')
const {
    handle_request,
} = require('../handler')

const exists = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const sign_up = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const sign_in = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const delete_account = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const check_credentials = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const send_request = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const remove_request = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const accept_request = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const reject_request = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const remove_friend = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

const remove_action = async (req, res) => {
    const code = async (req, res) => {

    }
    await handle_request(req, res, code)
}

module.exports = {
    exists,
    sign_up,
    sign_in,
    delete_account,
    check_credentials,
    send_request,
    remove_request,
    accept_request,
    reject_request,
    remove_friend,
    remove_action,
}