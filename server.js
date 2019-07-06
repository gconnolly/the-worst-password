// express
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('OK')
})

// redis
const redis = require('redis')
const client = redis.createClient(process.env.REDIS_URL)

// twitter stuff
const twitterParse = require('twitter-url-parser')
const twitterAPI = require('node-twitter-api')
const twitter = new twitterAPI({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callback: process.env.TWITTER_OAUTH_CALLBACK || 'http://localhost:8080/oauth'
})

// scan
const scan = require('./scan')

app.post('/', (req, res) => {
  const twitterId = twitterParse(req.body.link).id
  console.log(twitterId)
  client.hgetall('cursor', (error, cursor) => {
    if(error) {
      console.log('Error connecting to redis')
      return
    }

    if(!cursor) {
      console.log('Error retrieving cursor')
      cursor = {
        value: 7440
      }
    }

    scan(cursor.value, (error, result) => {
      if(error) {
        console.log('Error scanning for value: ' + error)
        return
      }

      console.log(result.password)

      client.hmset('cursor', 'value', result.cursor, (error) => {
        if (error) {
          console.log(error)
        }
      })
    })
  })

  res.send('OK')
})

app.get('/authenticate', (req, res) => {
  twitter.getRequestToken((error, requestToken, requestTokenSecret, results) => {
    if (error) {
      console.log('Error getting OAuth request token : ' + JSON.stringify(error))
    } else {
      client.del('request')
      client.hmset('request', 'token', requestToken, 'tokenSecret', requestTokenSecret, (error, result) => {
        if (error) {
          console.log(error)
        } else {
          res.redirect(twitter.getAuthUrl(requestToken))
        }
      })
    }
  })
})

app.get('/oauth', (req, res) => {
  client.hgetall('request', (error, request) => {
    if (error) {
      console.log(error)
    } else if (request) {
      twitter.getAccessToken(
        request.token,
        request.tokenSecret,
        req.query.oauth_verifier,
        (error, accessToken, accessTokenSecret, results) => {
          if (error) {
            console.log(error)
          } else {
            twitter.verifyCredentials(
              accessToken,
              accessTokenSecret,
              {},
              (error, data, response) => {
                if (error) {
                  console.log(error)
                } else {
                  client.del('access')
                  client.hmset('access', 'token', accessToken, 'tokenSecret', accessTokenSecret, (error, result) => {
                    if (error) {
                      console.log(error)
                    } else {
                      res.send(data['screen_name'])
                    }
                  })
                }
              })
          }
        })
    }
  })
})

app.listen(process.env.PORT || 8080, () => console.log('listening ' + (process.env.PORT || 8080)))