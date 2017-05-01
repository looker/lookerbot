module.exports =

  listen: (server, bot, lookers) ->
    server.get("/health_check", (req, res) =>

      reply = (json) ->
        res.setHeader 'Content-Type', 'application/json'
        res.send JSON.stringify(json)
      reply {success: true, reason: "Healthy"}
    )