crypto = require('crypto')

class Store

  randomPath: (extension = "png") ->
    path = crypto.randomBytes(256).toString('hex').match(/.{1,128}/g)
    "#{path.join("/")}.#{extension}"

module.exports = Store
