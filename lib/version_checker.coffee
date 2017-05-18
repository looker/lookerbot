request = require("request")
npmPackage = require('./../package.json')
semver = require('semver')

module.exports = (callback) ->

  for repoUrl in [npmPackage.repository.url, "https://github.com/looker/lookerbot"]

    url = "#{repoUrl.split("github.com").join("api.github.com/repos")}/releases/latest"

    request {url: url, headers: {"User-Agent": npmPackage.repository.url}}, (error, response, body) ->
      if error
        console.error "Could not check version at #{url}"
        callback(null)
      else if response.statusCode == 200
        json = JSON.parse(body)
        if semver.gt(json.tag_name, npmPackage.version)
          console.log "Found update: #{json.tag_name} is newer than #{npmPackage.version}"
          callback(json)
        else
          console.log "Checked for updates from #{url}. No new version available."
          callback(null)
      else
        console.error "Version check at #{url} returned a non-200 status code."
        console.error body
