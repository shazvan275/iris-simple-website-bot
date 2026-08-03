export const NEUTRAL_IDLE_STATE = {
  phase: "idle",
  dancing: false,
  angry: false,
  mood: "neutral",
  bubbleText: null,
  animCue: null,
  blinkAmount: 0,
  idleAnimation: null,
  idleClassName: ""
};

function action({
  id,
  phase = `idle-${id}`,
  mood = "neutral",
  bubbleText = null,
  duration = 3600,
  target = { x: 0, y: 0 },
  lean = { x: 0, y: 0 },
  dancing = false,
  angry = false,
  animCue = null,
  blinkAmount = 0,
  animation = null,
  className = "",
  followUp = null
}) {
  return {
    id,
    phase,
    mood,
    bubbleText,
    duration,
    target,
    lean,
    dancing,
    angry,
    animCue,
    blinkAmount,
    animation,
    className,
    followUp
  };
}

export const IDLE_ACTIONS = [
  action({
    id: "dance-jump",
    dancing: true,
    bubbleText: "Woo!",
    duration: 5000,
    animation: "iris-assistant-dance 0.55s ease-in-out infinite",
    className: "is-idle-dance",
    followUp: {
      phase: "idle-dance-jump",
      duration: 900,
      animCue: "jump",
      animation: "iris-assistant-jump 0.9s cubic-bezier(.34,1.56,.64,1) both",
      className: "is-idle-jump"
    }
  }),
  action({
    id: "sad",
    mood: "sad",
    bubbleText: "Aww...",
    duration: 4500,
    target: { x: -0.15, y: 0.7 },
    animation: "iris-assistant-sad 1.8s ease-in-out infinite",
    className: "is-idle-sad"
  }),
  action({
    id: "angry",
    mood: "angry",
    angry: true,
    bubbleText: "Grr!",
    duration: 4000,
    target: { x: 0.15, y: -0.15 },
    animation: "iris-assistant-error-shake 0.25s ease-in-out infinite",
    className: "is-idle-angry"
  }),
  action({
    id: "naughty",
    mood: "naughty",
    bubbleText: "Hehe...",
    duration: 5000,
    target: { x: 0.85, y: -0.3 },
    animation: "iris-assistant-naughty 0.7s ease-in-out infinite",
    className: "is-idle-naughty"
  }),
  action({
    id: "curious",
    bubbleText: "Hmm?",
    target: { x: 0.45, y: -0.35 },
    lean: { x: 0.25, y: -0.1 },
    animation: "iris-assistant-curious 1.8s ease-in-out infinite",
    className: "is-idle-curious"
  }),
  action({
    id: "wink",
    bubbleText: "Wink!",
    duration: 2200,
    blinkAmount: 0.55,
    animation: "iris-assistant-wink 1.1s ease-in-out 2",
    className: "is-idle-wink"
  }),
  action({
    id: "look-around",
    bubbleText: "Looking...",
    duration: 4200,
    target: { x: -0.75, y: -0.15 },
    animation: "iris-assistant-look-around 2.1s ease-in-out infinite",
    className: "is-idle-look-around"
  }),
  action({
    id: "peek",
    bubbleText: "Psst!",
    duration: 3000,
    target: { x: -0.9, y: 0 },
    lean: { x: -0.65, y: 0.05 },
    animation: "iris-assistant-peek 1.4s ease-in-out infinite",
    className: "is-idle-peek"
  }),
  action({
    id: "spin",
    bubbleText: "Whoa!",
    duration: 2400,
    animation: "iris-assistant-spin 1.2s ease-in-out 2",
    className: "is-idle-spin"
  }),
  action({
    id: "wave",
    bubbleText: "Hi!",
    duration: 3000,
    animation: "iris-assistant-wave 1s ease-in-out 3",
    className: "is-idle-wave"
  }),
  action({
    id: "nod",
    bubbleText: "Yep",
    duration: 2600,
    animation: "iris-assistant-nod 0.9s ease-in-out 3",
    className: "is-idle-nod"
  }),
  action({
    id: "shake-head",
    bubbleText: "Nope",
    duration: 2600,
    animation: "iris-assistant-shake-head 0.8s ease-in-out 3",
    className: "is-idle-shake-head"
  }),
  action({
    id: "excited",
    dancing: true,
    bubbleText: "Yay!",
    duration: 3600,
    animation: "iris-assistant-excited 0.65s ease-in-out infinite",
    className: "is-idle-excited"
  }),
  action({
    id: "surprised",
    bubbleText: "Oh!",
    duration: 2600,
    target: { x: 0, y: -0.65 },
    lean: { x: 0, y: -0.35 },
    animation: "iris-assistant-surprised 1.1s ease-in-out 2",
    className: "is-idle-surprised"
  }),
  action({
    id: "shy",
    bubbleText: "Um...",
    duration: 3800,
    target: { x: -0.55, y: 0.45 },
    lean: { x: -0.3, y: 0.25 },
    animation: "iris-assistant-shy 1.8s ease-in-out infinite",
    className: "is-idle-shy"
  }),
  action({
    id: "sleepy",
    mood: "sleepy",
    bubbleText: "Yawn...",
    duration: 4200,
    blinkAmount: 0.75,
    animation: "iris-assistant-sleepy 2s ease-in-out infinite",
    className: "is-idle-sleepy"
  }),
  action({
    id: "celebrate",
    dancing: true,
    bubbleText: "Done!",
    duration: 3600,
    animation: "iris-assistant-celebrate 0.8s ease-in-out infinite",
    className: "is-idle-celebrate"
  }),
  action({
    id: "stretch",
    bubbleText: "Ahh...",
    duration: 3200,
    animation: "iris-assistant-stretch 1.6s ease-in-out 2",
    className: "is-idle-stretch"
  }),
  action({
    id: "bounce",
    bubbleText: "Boing!",
    duration: 3200,
    animation: "iris-assistant-bounce 0.7s cubic-bezier(.34,1.56,.64,1) infinite",
    className: "is-idle-bounce"
  }),
  action({
    id: "hide",
    bubbleText: "Shh...",
    duration: 3000,
    blinkAmount: 0.9,
    animation: "iris-assistant-hide 1.4s ease-in-out infinite",
    className: "is-idle-hide"
  }),
  action({
    id: "peekaboo",
    bubbleText: "Peek!",
    duration: 3200,
    target: { x: 0.7, y: -0.2 },
    animation: "iris-assistant-peekaboo 1.2s ease-in-out 2",
    className: "is-idle-peekaboo"
  }),
  action({
    id: "confused",
    bubbleText: "Huh?",
    duration: 3400,
    target: { x: -0.35, y: -0.15 },
    lean: { x: -0.2, y: 0.1 },
    animation: "iris-assistant-confused 1.4s ease-in-out infinite",
    className: "is-idle-confused"
  }),
  action({
    id: "thinking",
    bubbleText: "Thinking...",
    duration: 3800,
    target: { x: 0.2, y: -0.55 },
    lean: { x: 0.15, y: -0.05 },
    animation: "iris-assistant-thinking 1.6s ease-in-out infinite",
    className: "is-idle-thinking"
  }),
  action({
    id: "scan",
    bubbleText: "Scanning...",
    duration: 4200,
    animation: "iris-assistant-scan 1.6s ease-in-out infinite",
    className: "is-idle-scan"
  }),
  action({
    id: "listen",
    bubbleText: "Listening",
    duration: 3600,
    target: { x: -0.4, y: -0.05 },
    lean: { x: -0.35, y: 0 },
    animation: "iris-assistant-listen 1.5s ease-in-out infinite",
    className: "is-idle-listen"
  }),
  action({
    id: "focus",
    bubbleText: "Focus",
    duration: 3400,
    target: { x: 0, y: 0 },
    animation: "iris-assistant-focus 1.2s ease-in-out infinite",
    className: "is-idle-focus"
  }),
  action({
    id: "typing",
    bubbleText: "Tap tap",
    duration: 3600,
    target: { x: 0.45, y: 0.45 },
    animation: "iris-assistant-typing 0.45s ease-in-out infinite",
    className: "is-idle-typing"
  }),
  action({
    id: "success",
    bubbleText: "Nice!",
    duration: 2800,
    animation: "iris-assistant-success 0.6s cubic-bezier(.34,1.56,.64,1) 3",
    className: "is-idle-success"
  }),
  action({
    id: "error",
    bubbleText: "Oops!",
    duration: 2600,
    animation: "iris-assistant-error-shake 0.4s cubic-bezier(.34,1.56,.64,1) 4",
    className: "is-idle-error"
  }),
  action({
    id: "impatient",
    bubbleText: "Wait...",
    duration: 3400,
    target: { x: 0.65, y: -0.25 },
    animation: "iris-assistant-impatient 0.9s ease-in-out infinite",
    className: "is-idle-impatient"
  })
];

export const IDLE_ACTION_IDS = IDLE_ACTIONS.map((idleAction) => idleAction.id);

export function pickIdleAction(random = Math.random) {
  const index = Math.min(
    IDLE_ACTIONS.length - 1,
    Math.floor(random() * IDLE_ACTIONS.length)
  );
  return IDLE_ACTIONS[index];
}

export function getIdleActionById(id) {
  return IDLE_ACTIONS.find((idleAction) => idleAction.id === id);
}

export function buildIdleActionState(idleAction) {
  return {
    phase: idleAction.phase,
    dancing: Boolean(idleAction.dancing),
    angry: Boolean(idleAction.angry),
    mood: idleAction.mood || "neutral",
    bubbleText: idleAction.bubbleText || null,
    animCue: idleAction.animCue || null,
    blinkAmount: idleAction.blinkAmount || 0,
    idleAnimation: idleAction.animation || null,
    idleClassName: idleAction.className || ""
  };
}
