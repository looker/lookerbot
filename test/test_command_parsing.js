assert = require('assert')
SlackUtils = require('../lib/slack_utils')

it "passes through basic text", ->
  assert.equal(SlackUtils.stripMessageText("hello"), "hello")

it "fixes gt", ->
  assert.equal(SlackUtils.stripMessageText("coolcommand &gt; 50"), "coolcommand > 50")

it "fixes lt", ->
  assert.equal(SlackUtils.stripMessageText("coolcommand &lt; 50"), "coolcommand < 50")
