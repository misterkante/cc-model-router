import { expect, mock, test } from "claude-code/testing";
import { classify } from "../lib/classifier.js";

test("classifies mechanical, implementation and debugging prompts", () => {
  expect(classify("lint the changed files").tier).toBe("mechanical");
  expect(classify("create a new React component").tier).toBe("implementation");
  expect(classify("debug why the login test is flaky").tier).toBe("debugging");
});

test("uses project extra keywords", () => {
  const result = classify("mets à jour le libellé du bouton", {
    extraKeywords: { mechanical: ["libellé"] }
  });
  expect(result.tier).toBe("mechanical");
});

test("routes a mechanical prompt to Haiku with low effort", async ($, on) => {
  let currentModel = "sonnet";
  let seen: any;

  on("session.start", ($, e) => ({ cwd: e.cwd }));
  on("command.register", () => ({ value: undefined }));
  on("session.cwd", () => ({ value: "/work" }));
  mock.env(on, { HOME: "/home/test" });
  on("fs.exists", ($, e) => ({
    value: e.path.endsWith("/.claude/model-router.json")
  }));
  on("fs.read", ($, e) => ({
    value: e.path.startsWith("/work/")
      ? JSON.stringify({ extraKeywords: { mechanical: ["libellé"] } })
      : "{}"
  }));
  on("session.model", () => ({ value: currentModel }));
  on("prompt.submit", ($, e) => ({ text: e.text }));
  on("turn.start", ($, e) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  on("turn.step", async function* ($, e) {
    seen = e;
    yield { kind: "text", index: 0, text: "ok" };
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "ok",
      toolUses: [],
      stopReason: "end_turn",
      usage: null
    };
  });

  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/work"
  });
  await $.prompt.submit({ text: "lint the changed files" });
  await $.turn.start({ text: "lint the changed files", turnId: "t1" });

  const stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: currentModel,
    messageCount: 1
  });
  let step = await stream.next();
  while (step.done !== true) step = await stream.next();

  expect(seen.model).toBe("haiku");
  expect(seen.effort).toBe("low");

  const second = $.turn.step({
    turnId: "t1",
    index: 1,
    model: "sonnet",
    messageCount: 2
  });
  step = await second.next();
  while (step.done !== true) step = await second.next();
  expect(seen.model).toBe("haiku");
});

test("escalates a debugging prompt to Opus", async ($, on) => {
  let seen: any;

  on("session.start", ($, e) => ({ cwd: e.cwd }));
  on("command.register", () => ({ value: undefined }));
  on("session.cwd", () => ({ value: "/work" }));
  mock.env(on, { HOME: "/home/test" });
  on("fs.exists", () => ({ value: false }));
  on("session.model", () => ({ value: "sonnet" }));
  on("prompt.submit", ($, e) => ({ text: e.text }));
  on("turn.start", ($, e) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  on("turn.step", async function* ($, e) {
    seen = e;
    yield { kind: "text", index: 0, text: "ok" };
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "ok",
      toolUses: [],
      stopReason: "end_turn",
      usage: null
    };
  });

  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/work"
  });
  await $.prompt.submit({ text: "debug why the login test is flaky" });
  await $.turn.start({
    text: "debug why the login test is flaky",
    turnId: "t1"
  });

  const stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: "sonnet",
    messageCount: 1
  });
  let step = await stream.next();
  while (step.done !== true) step = await stream.next();

  expect(seen.model).toBe("opus");
  expect(seen.effort).toBe("high");
});

test("keeps Opus during the cache-aware cooldown after a downgrade", async ($, on) => {
  let currentModel = "sonnet";
  let seen: any;

  on("session.start", ($, e) => ({ cwd: e.cwd }));
  on("command.register", () => ({ value: undefined }));
  on("session.cwd", () => ({ value: "/work" }));
  mock.env(on, { HOME: "/home/test" });
  on("fs.exists", () => ({ value: false }));
  on("session.model", () => ({ value: currentModel }));
  on("prompt.submit", ($, e) => ({ text: e.text }));
  on("turn.start", ($, e) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  on("turn.step", async function* ($, e) {
    seen = e;
    yield { kind: "text", index: 0, text: "ok" };
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "ok",
      toolUses: [],
      stopReason: "end_turn",
      usage: null
    };
  });

  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/work"
  });

  await $.prompt.submit({ text: "debug why the login test is flaky" });
  await $.turn.start({ text: "debug why the login test is flaky", turnId: "t1" });
  let stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: currentModel,
    messageCount: 1
  });
  let step = await stream.next();
  while (step.done !== true) step = await stream.next();
  expect(seen.model).toBe("opus");

  currentModel = "opus";
  await $.prompt.submit({ text: "lint the changed files" });
  await $.turn.start({ text: "lint the changed files", turnId: "t2" });
  stream = $.turn.step({
    turnId: "t2",
    index: 0,
    model: currentModel,
    messageCount: 1
  });
  step = await stream.next();
  while (step.done !== true) step = await stream.next();
  expect(seen.model).toBe("opus");
});


test("leaves the model unchanged when routing is off", async ($, on) => {
  let seen: any;

  on("session.start", ($, e) => ({ cwd: e.cwd }));
  on("command.register", () => ({ value: undefined }));
  on("session.cwd", () => ({ value: "/work" }));
  mock.env(on, { HOME: "/home/test" });
  on("fs.exists", () => ({ value: true }));
  on("fs.read", () => ({
    value: JSON.stringify({ routing: { mode: "off" } })
  }));
  on("session.model", () => ({ value: "sonnet" }));
  on("prompt.submit", ($, e) => ({ text: e.text }));
  on("turn.start", ($, e) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  on("turn.step", async function* ($, e) {
    seen = e;
    yield { kind: "text", index: 0, text: "ok" };
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "ok",
      toolUses: [],
      stopReason: "end_turn",
      usage: null
    };
  });

  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/work"
  });
  await $.prompt.submit({ text: "lint the changed files" });
  await $.turn.start({ text: "lint the changed files", turnId: "t1" });

  const stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: "sonnet",
    messageCount: 1
  });
  let step = await stream.next();
  while (step.done !== true) step = await stream.next();

  expect(seen.model).toBe("sonnet");
  expect(seen.effort).toBeUndefined();
});

test("keeps the first model for the whole session in session mode", async ($, on) => {
  let seen: any;

  on("session.start", ($, e) => ({ cwd: e.cwd }));
  on("command.register", () => ({ value: undefined }));
  on("session.cwd", () => ({ value: "/work" }));
  mock.env(on, { HOME: "/home/test" });
  on("fs.exists", () => ({ value: true }));
  on("fs.read", () => ({
    value: JSON.stringify({ routing: { mode: "session" } })
  }));
  on("session.model", () => ({ value: "sonnet" }));
  on("prompt.submit", ($, e) => ({ text: e.text }));
  on("turn.start", ($, e) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  on("turn.step", async function* ($, e) {
    seen = e;
    yield { kind: "text", index: 0, text: "ok" };
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "ok",
      toolUses: [],
      stopReason: "end_turn",
      usage: null
    };
  });

  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/work"
  });

  await $.prompt.submit({ text: "debug why the login test is flaky" });
  await $.turn.start({ text: "debug why the login test is flaky", turnId: "t1" });
  let stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: "sonnet",
    messageCount: 1
  });
  let step = await stream.next();
  while (step.done !== true) step = await stream.next();
  expect(seen.model).toBe("opus");

  await $.prompt.submit({ text: "lint the changed files" });
  await $.turn.start({ text: "lint the changed files", turnId: "t2" });
  stream = $.turn.step({
    turnId: "t2",
    index: 0,
    model: "sonnet",
    messageCount: 1
  });
  step = await stream.next();
  while (step.done !== true) step = await stream.next();
  expect(seen.model).toBe("opus");
});
