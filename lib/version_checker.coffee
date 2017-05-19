request = require("request")
semver = require('semver')
config = require('./config')

module.exports = class VersionChecker

  @newVersion = null

  constructor: ->

    @check()

    # Check for new versions every day
    setInterval(=>
      @check()
    , 24 * 60 * 60 * 1000)

  check: ->
    for repoUrl in [config.npmPackage.repository.url, "https://github.com/looker/lookerbot"]

      url = "#{repoUrl.split("github.com").join("api.github.com/repos")}/releases/latest"
      params = {url: url, headers: {"User-Agent": config.npmPackage.repository.url}}
      request params, (error, response, body) =>
        if error
          console.error "Could not check version at #{url}"
          @checked(null)
        else if response.statusCode == 200
          json = JSON.parse(body)
          if semver.gt(json.tag_name, config.npmPackage.version)
            console.log "Found update: #{json.tag_name} is newer than #{config.npmPackage.version}"
            @checked(json)
          else
            console.log "Checked for updates from #{url}. No new version available."
            @checked(null)
        else
          console.error "Version check at #{url} returned a non-200 status code."
          console.error body

  checked: (json) ->
    if json?
      @newVersion = {url: json.html_url, number: json.tag_name}
    else
      @newVersion = null
