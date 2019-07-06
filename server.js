// express
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
app.use(bodyParser.json())

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
  theworstpassword(req, true)
  res.send('OK')
})

app.post('/test', (req, res) => {
  theworstpassword(req, false)
  res.send('OK')
})

function theworstpassword(req, tweetTheResult) {
  const twitterId = twitterParse(req.body.link).id
  console.log('Process triggered by: ' + twitterId)

  client.hgetall('cursor', (error, cursor) => {
    if (error) {
      console.log('Error connecting to redis')
      return
    }

    if (!cursor) {
      console.log('Error retrieving cursor')
      cursor = {
        value: process.env.SEED_CURSOR
      }
    }

    scan(cursor.value, (error, result) => {
      if (error) {
        console.log('Error scanning for value: ' + error)
        return
      }

      // Log the result
      console.log('SUCCESS:' + result.password)

      // Persist the ursor
      client.hmset('cursor', 'value', result.cursor, (error) => {
        if (error) {
          console.log(error)
        }
      })

      // Tweet the result
      if (tweetTheResult) {
        client.hgetall('access', (error, access) => {
          if (error) {
            console.log(error)
            res.end()
          } 
          
          if (!access) {
            return
          }

          twitter.statuses(
            'update',
            {
              status: result.password,
              in_reply_to_status_id: twitterId
            },
            access.token,
            access.tokenSecret,
            (error) => {
              if (error) {
                console.log(error)
                return
              }

              console.log('Tweeted: ' + result.password)
            }
          )
        })
      }
    })
  })
}

app.post('/reset', (req, res) => {
  client.del('cursor')
  res.send('OK')
})

app.get('/', (req, res) => {
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