require('dotenv').config()
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

const saveScrap = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
}

 const addThread = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
 }

 const removeThread = async (req, res) => {
    const code = async (req, res) => {

    }
    await handleRequest(req, res, code)
 }

module.exports = {
    exists,
    saveScrap,
    addThread,
    removeThread,
}