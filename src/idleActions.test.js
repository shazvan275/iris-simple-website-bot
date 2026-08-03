import test from "node:test";
import assert from "node:assert/strict";
import {
  IDLE_ACTIONS,
  IDLE_ACTION_IDS,
  NEUTRAL_IDLE_STATE,
  buildIdleActionState,
  getIdleActionById,
  pickIdleAction
} from "./idleActions.js";

const REQUIRED_ACTION_IDS = [
  "dance-jump",
  "sad",
  "angry",
  "naughty",
  "curious",
  "wink",
  "look-around",
  "peek",
  "spin",
  "wave",
  "nod",
  "shake-head",
  "excited",
  "surprised",
  "shy",
  "sleepy",
  "celebrate",
  "stretch",
  "bounce",
  "hide",
  "peekaboo",
  "confused",
  "thinking",
  "scan",
  "listen",
  "focus",
  "typing",
  "success",
  "error",
  "impatient"
];

test("IDLE_ACTIONS contains every requested action exactly once", () => {
  assert.deepEqual([...IDLE_ACTION_IDS].sort(), [...REQUIRED_ACTION_IDS].sort());
  assert.equal(new Set(IDLE_ACTION_IDS).size, REQUIRED_ACTION_IDS.length);
  assert.equal(IDLE_ACTIONS.length, REQUIRED_ACTION_IDS.length);
});

test("each idle action has runnable timing and neutral fallback fields", () => {
  for (const action of IDLE_ACTIONS) {
    assert.equal(typeof action.id, "string");
    assert.match(action.phase, /^idle-/);
    assert.equal(typeof action.duration, "number");
    assert.ok(action.duration >= 900);
    assert.ok(action.duration <= 6000);

    const state = buildIdleActionState(action);
    assert.equal(state.phase, action.phase);
    assert.equal(state.dancing, Boolean(action.dancing));
    assert.equal(state.angry, Boolean(action.angry));
    assert.equal(state.mood, action.mood || "neutral");
    assert.equal(state.blinkAmount, action.blinkAmount || 0);
    assert.equal(state.idleAnimation, action.animation || null);
    assert.equal(state.idleClassName, action.className || "");
  }
});

test("pickIdleAction is deterministic for injected random values", () => {
  assert.equal(pickIdleAction(() => 0).id, IDLE_ACTIONS[0].id);
  assert.equal(pickIdleAction(() => 0.999999).id, IDLE_ACTIONS.at(-1).id);
});

test("getIdleActionById returns the catalog action", () => {
  const action = getIdleActionById("peekaboo");
  assert.equal(action.id, "peekaboo");
  assert.equal(action.bubbleText, "Peek!");
  assert.equal(getIdleActionById("missing"), undefined);
});

test("neutral idle state does not overwrite chat messages or popup state", () => {
  assert.deepEqual(NEUTRAL_IDLE_STATE, {
    phase: "idle",
    dancing: false,
    angry: false,
    mood: "neutral",
    bubbleText: null,
    animCue: null,
    blinkAmount: 0,
    idleAnimation: null,
    idleClassName: ""
  });
});
