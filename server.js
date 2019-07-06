const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const twitterParse = require('twitter-url-parser')

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send('OK')
})

app.post('/', (req, res) => {
    const twitterId = twitterParse(req.body.link).id
    console.log(twitterId)
    res.send('OK')
})