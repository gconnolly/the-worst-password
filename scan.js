const fetch = require('node-fetch')
const crypto = require('crypto')
//let index = 7445//8573 //jzi = 7445, 8572, qnl

// https://codereview.stackexchange.com/a/16129
function convertToNumberingScheme(number) {
    let baseChar = ("a").charCodeAt(0)
    let letters = ""

    do {
        number -= 1;
        letters = String.fromCharCode(baseChar + (number % 26)) + letters
        number = (number / 26) >> 0 // quick `floor`
    } while(number > 0)

    return letters;
}

function scan(cursor, callback) {
    const interval = setInterval(() => {
        let password = convertToNumberingScheme(cursor++);
        let hash = crypto.createHash("sha1").update(password).digest("hex")
        let hashPrefix = hash.substring(0, 5)
        let hashSuffix = hash.substring(5).toUpperCase()

        fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`)
            .then(res => res.text())
            .then(body => body.split('\r\n'))
            .then(matches => matches.some(tuple => tuple.startsWith(hashSuffix)))
            .then(ispwned => {
                if(!ispwned) {
                    clearInterval(interval)
                    callback(null, { cursor, password })
                }
            })
    }, 1500)
}

module.exports = scan