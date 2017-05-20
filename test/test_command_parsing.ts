import "mocha";
import SlackUtils from '../lib/slack_utils';
import { expect } from 'chai';

it("passes through basic text", () => {
  expect(SlackUtils.stripMessageText("hello")).to.equal("hello");
});

it("fixes gt", () => {
  expect(SlackUtils.stripMessageText("coolcommand &gt; 50")).to.equal("coolcommand > 50");
});

it("fixes lt", () => {
  expect(SlackUtils.stripMessageText("coolcommand &lt; 50")).to.equal("coolcommand < 50");
});

