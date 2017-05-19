Listener = require("./listener")

class HealthCheckListener extends Listener

  type: ->
    "health check listener"

  listen: ->
    @server.get("/health_check", (req, res) =>
      @reply res, {success: true, reason: "Healthy"}
    )

module.exports = HealthCheckListener
