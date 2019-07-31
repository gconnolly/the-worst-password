const fetch = require('node-fetch')
const crypto = require('crypto')

async function fetchPassword(password, callback) {
  console.log(password)
  let hash = crypto.createHash("sha1").update(password).digest("hex")
  let hashPrefix = hash.substring(0, 5)
  let hashSuffix = hash.substring(5).toUpperCase()

  return fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`)
    .then(res => res.text())
    .then(body => body.split('\r\n'))
    .then(matches => matches.some(tuple => tuple.startsWith(hashSuffix)));
}

module.exports = fetchPassword