module.exports = class SlackUtils

  @stripMessageText: (text) ->
    text.split("&gt;").join(">").split("&lt;").join("<")
