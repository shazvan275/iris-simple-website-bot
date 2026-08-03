import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeIrisConfig } from "./config.js";
import {
  chunkMarkdownDocuments,
  createMarkdownRagReply,
  loadMarkdownDocuments
} from "./rag.js";

const DESKTOP_EYE_SIZE = 53;
const MOBILE_EYE_SIZE = 43;
const INACTIVITY_TIMEOUT = 120_000;
const BLINK_INTERVAL = 10_000;

const INITIAL_STATE = {
  phase: "intro",
  showPopup: false,
  hovering: false,
  pressed: false,
  dancing: false,
  angry: false,
  mood: "neutral",
  bubbleText: null,
  messages: [],
  inputValue: "",
  isThinking: false,
  longWaitText: null,
  hasError: false,
  lastFailedText: null,
  blinkAmount: 0,
  introDone: false,
  animCue: null,
  facing: 1
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function nowTime() {
  const date = new Date();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

function getMediaMatch(query) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

export function IrisAssistant({ config } = {}) {
  const [mobile, setMobile] = useState(() => getMediaMatch("(max-width: 640px)"));
  const [reducedMotion, setReducedMotion] = useState(() =>
    getMediaMatch("(prefers-reduced-motion: reduce)")
  );
  const [assistant, setAssistant] = useState(INITIAL_STATE);
  const [motion, setMotion] = useState(() => {
    const eyeSize = getMediaMatch("(max-width: 640px)") ? MOBILE_EYE_SIZE : DESKTOP_EYE_SIZE;
    const edge = getMediaMatch("(max-width: 640px)") ? 18 : 28;
    const x = typeof window === "undefined" ? 0 : window.innerWidth - eyeSize - edge;
    return {
      pupil: { x: 0, y: 0 },
      lean: { x: 0, y: 0 },
      posX: x,
      isWalking: false
    };
  });

  const eyeRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const configRef = useRef(normalizeIrisConfig(config));
  const stateRef = useRef(assistant);
  const mobileRef = useRef(mobile);
  const reducedMotionRef = useRef(reducedMotion);
  const targetRef = useRef({ x: 0, y: 0 });
  const leanTargetRef = useRef({ x: 0, y: 0 });
  const homeXRef = useRef(motion.posX);
  const posXTargetRef = useRef(motion.posX);
  const eyeSizeRef = useRef(mobile ? MOBILE_EYE_SIZE : DESKTOP_EYE_SIZE);
  const edgeRef = useRef(mobile ? 18 : 28);
  const tabHiddenRef = useRef(false);
  const blinkTimerRef = useRef(null);
  const blinkFrameRef = useRef(null);
  const glanceTimerRef = useRef(null);
  const glanceResetTimerRef = useRef(null);
  const angryTimerRef = useRef(null);
  const reactionTimerRef = useRef(null);
  const activityTimerRef = useRef(null);
  const activityEndTimerRef = useRef(null);
  const jumpEndTimerRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const replyTimersRef = useRef([]);
  const replyRequestIdRef = useRef(0);
  const markdownChunksRef = useRef(null);
  const markdownLoadPromiseRef = useRef(null);

  stateRef.current = assistant;
  mobileRef.current = mobile;
  reducedMotionRef.current = reducedMotion;

  const updateAssistant = useCallback((update) => {
    setAssistant((current) => {
      const patch = typeof update === "function" ? update(current) : update;
      return patch ? { ...current, ...patch } : current;
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);

  const doBlink = useCallback((closeMs = 90, holdMs = 60, openMs = 90) => {
    if (reducedMotionRef.current) return;
    if (blinkFrameRef.current) cancelAnimationFrame(blinkFrameRef.current);

    const start = performance.now();
    const total = closeMs + holdMs + openMs;
    const step = (time) => {
      const elapsed = time - start;
      let amount = 0;

      if (elapsed < closeMs) amount = elapsed / closeMs;
      else if (elapsed < closeMs + holdMs) amount = 1;
      else if (elapsed < total) amount = 1 - (elapsed - closeMs - holdMs) / openMs;

      updateAssistant({ blinkAmount: clamp(amount, 0, 1) });
      if (elapsed < total) blinkFrameRef.current = requestAnimationFrame(step);
    };

    blinkFrameRef.current = requestAnimationFrame(step);
  }, [updateAssistant]);

  const clearSleepTimer = useCallback(() => {
    clearTimeout(sleepTimerRef.current);
  }, []);

  const scheduleSleep = useCallback(() => {
    clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = window.setTimeout(() => {
      const current = stateRef.current;
      if (current.hovering || current.showPopup) return;

      targetRef.current = { x: 0, y: 0 };
      leanTargetRef.current = { x: 0, y: 0 };
      updateAssistant({
        phase: "sleeping",
        dancing: false,
        angry: false,
        mood: "neutral",
        animCue: null,
        blinkAmount: 1,
        bubbleText: "Zzz…"
      });
    }, INACTIVITY_TIMEOUT);
  }, [updateAssistant]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMobileChange = (event) => setMobile(event.matches);
    const onReducedMotionChange = (event) => setReducedMotion(event.matches);

    mobileQuery.addEventListener?.("change", onMobileChange);
    reducedMotionQuery.addEventListener?.("change", onReducedMotionChange);

    return () => {
      mobileQuery.removeEventListener?.("change", onMobileChange);
      reducedMotionQuery.removeEventListener?.("change", onReducedMotionChange);
    };
  }, []);

  useEffect(() => {
    const updateViewportMetrics = () => {
      const nextEyeSize = mobileRef.current ? MOBILE_EYE_SIZE : DESKTOP_EYE_SIZE;
      const nextEdge = mobileRef.current ? 18 : 28;
      const nextHomeX = window.innerWidth - nextEyeSize - nextEdge;
      const maxX = window.innerWidth - nextEyeSize - 12;

      eyeSizeRef.current = nextEyeSize;
      edgeRef.current = nextEdge;
      homeXRef.current = nextHomeX;
      posXTargetRef.current = stateRef.current.showPopup
        ? nextHomeX
        : clamp(posXTargetRef.current, 12, maxX);
      setMotion((current) => ({
        ...current,
        posX: stateRef.current.showPopup ? nextHomeX : clamp(current.posX, 12, maxX)
      }));
    };

    updateViewportMetrics();
    window.addEventListener("resize", updateViewportMetrics);
    return () => window.removeEventListener("resize", updateViewportMetrics);
  }, [mobile]);

  useEffect(() => {
    const onVisibilityChange = () => {
      tabHiddenRef.current = document.hidden;
    };
    const onMouseMove = (event) => {
      if (mobileRef.current || !eyeRef.current) return;

      const rect = eyeRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const reducedTracking = stateRef.current.showPopup;
      const targetX = clamp(dx / 500, -1, 1);
      const targetY = clamp(dy / 500, -1, 1);

      targetRef.current = reducedTracking
        ? { x: targetX * 0.3, y: targetY * 0.3 }
        : { x: targetX, y: targetY };
      leanTargetRef.current = reducedTracking
        ? { x: 0, y: 0 }
        : { x: clamp(dx / 900, -1, 1), y: clamp(dy / 900, -1, 1) };
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (!tabHiddenRef.current) {
        setMotion((current) => {
          const speed = reducedMotionRef.current ? 1 : 0.12;
          const nextPupil = {
            x: lerp(current.pupil.x, targetRef.current.x, speed),
            y: lerp(current.pupil.y, targetRef.current.y, speed)
          };
          const nextLean = {
            x: lerp(current.lean.x, leanTargetRef.current.x, 0.08),
            y: lerp(current.lean.y, leanTargetRef.current.y, 0.08)
          };
          const nextPosX = lerp(current.posX, posXTargetRef.current, 0.022);
          const isWalking = Math.abs(posXTargetRef.current - nextPosX) > 1.5;
          const unchanged =
            Math.abs(nextPupil.x - current.pupil.x) < 0.0005 &&
            Math.abs(nextPupil.y - current.pupil.y) < 0.0005 &&
            Math.abs(nextLean.x - current.lean.x) < 0.0005 &&
            Math.abs(nextLean.y - current.lean.y) < 0.0005 &&
            Math.abs(nextPosX - current.posX) < 0.05 &&
            isWalking === current.isWalking;

          return unchanged
            ? current
            : { pupil: nextPupil, lean: nextLean, posX: nextPosX, isWalking };
        });
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timers = [];

    updateAssistant({ phase: "intro", animCue: "hop" });
    timers.push(
      window.setTimeout(() => {
        targetRef.current = { x: -0.5, y: -0.2 };
      }, 500),
      window.setTimeout(() => {
        targetRef.current = { x: 0.5, y: -0.1 };
      }, 850),
      window.setTimeout(() => {
        targetRef.current = { x: 0, y: 0 };
      }, 1200),
      window.setTimeout(() => updateAssistant({ bubbleText: "Hi.." }), 900),
      window.setTimeout(() => {
        updateAssistant({ bubbleText: null, phase: "idle", introDone: true, animCue: null });
      }, 2600)
    );

    return () => timers.forEach(clearTimeout);
  }, [updateAssistant]);

  useEffect(() => {
    const scheduleBlink = () => {
      blinkTimerRef.current = window.setTimeout(() => {
        if (!["intro", "pressed", "sleeping"].includes(stateRef.current.phase)) {
          doBlink(45, 20, 45);
        }
        scheduleBlink();
      }, BLINK_INTERVAL);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimerRef.current);
      if (blinkFrameRef.current) cancelAnimationFrame(blinkFrameRef.current);
    };
  }, [doBlink]);

  useEffect(() => {
    const scheduleRandomActivity = () => {
      activityTimerRef.current = window.setTimeout(() => {
        const current = stateRef.current;
        const canAnimate =
          !reducedMotionRef.current &&
          current.introDone &&
          !current.showPopup &&
          !current.hovering &&
          current.phase !== "sleeping";

        if (canAnimate) {
          const randomAction = Math.floor(Math.random() * 4);

          if (randomAction === 0) {
            updateAssistant({
              phase: "random-dance",
              dancing: true,
              angry: false,
              mood: "neutral",
              bubbleText: "Woo!"
            });
            activityEndTimerRef.current = window.setTimeout(() => {
              if (stateRef.current.phase !== "random-dance") return;
              updateAssistant({
                phase: "random-jump",
                dancing: false,
                bubbleText: null,
                animCue: "jump"
              });
              jumpEndTimerRef.current = window.setTimeout(() => {
                if (stateRef.current.phase === "random-jump") {
                  updateAssistant({ phase: "idle", animCue: null });
                }
              }, 900);
            }, 5000);
          } else if (randomAction === 1) {
            targetRef.current = { x: -0.15, y: 0.7 };
            updateAssistant({
              phase: "random-sad",
              dancing: false,
              angry: false,
              mood: "sad",
              bubbleText: "Aww…",
              animCue: null
            });
            activityEndTimerRef.current = window.setTimeout(() => {
              if (stateRef.current.phase !== "random-sad") return;
              targetRef.current = { x: 0, y: 0 };
              updateAssistant({ phase: "idle", mood: "neutral", bubbleText: null });
            }, 4500);
          } else if (randomAction === 2) {
            targetRef.current = { x: 0.15, y: -0.15 };
            updateAssistant({
              phase: "random-angry",
              dancing: false,
              angry: true,
              mood: "angry",
              bubbleText: "Grr!",
              animCue: null
            });
            activityEndTimerRef.current = window.setTimeout(() => {
              if (stateRef.current.phase !== "random-angry") return;
              targetRef.current = { x: 0, y: 0 };
              updateAssistant({
                phase: "idle",
                angry: false,
                mood: "neutral",
                bubbleText: null
              });
            }, 4000);
          } else {
            targetRef.current = { x: 0.85, y: -0.3 };
            updateAssistant({
              phase: "random-naughty",
              dancing: false,
              angry: false,
              mood: "naughty",
              bubbleText: "Hehe…",
              animCue: null
            });
            activityEndTimerRef.current = window.setTimeout(() => {
              if (stateRef.current.phase !== "random-naughty") return;
              targetRef.current = { x: 0, y: 0 };
              updateAssistant({ phase: "idle", mood: "neutral", bubbleText: null });
            }, 5000);
          }
        }

        scheduleRandomActivity();
      }, 12_000 + Math.random() * 12_000);
    };

    scheduleRandomActivity();
    return () => {
      clearTimeout(activityTimerRef.current);
      clearTimeout(activityEndTimerRef.current);
      clearTimeout(jumpEndTimerRef.current);
    };
  }, [updateAssistant]);

  useEffect(() => {
    scheduleSleep();
    return clearSleepTimer;
  }, [clearSleepTimer, scheduleSleep]);

  useEffect(() => {
    const scheduleGlance = () => {
      glanceTimerRef.current = window.setTimeout(() => {
        if (
          mobileRef.current &&
          !stateRef.current.showPopup &&
          stateRef.current.introDone &&
          stateRef.current.phase === "idle"
        ) {
          targetRef.current = {
            x: (Math.random() - 0.5) * 1.2,
            y: (Math.random() - 0.5) * 0.6
          };
          glanceResetTimerRef.current = window.setTimeout(() => {
            targetRef.current = { x: 0, y: 0 };
          }, 900);
        }
        scheduleGlance();
      }, 5000 + Math.random() * 5000);
    };

    scheduleGlance();
    return () => {
      clearTimeout(glanceTimerRef.current);
      clearTimeout(glanceResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [assistant.messages, assistant.isThinking, assistant.hasError, scrollToBottom]);

  useEffect(() => () => {
    clearTimeout(angryTimerRef.current);
    clearTimeout(reactionTimerRef.current);
    clearTimeout(activityTimerRef.current);
    clearTimeout(activityEndTimerRef.current);
    clearTimeout(jumpEndTimerRef.current);
    clearTimeout(sleepTimerRef.current);
    replyTimersRef.current.forEach(clearTimeout);
  }, []);

  const closePopup = useCallback(() => {
    updateAssistant({ showPopup: false, phase: "idle", pressed: false, animCue: null });
    leanTargetRef.current = { x: 0, y: 0 };
    scheduleSleep();
    window.setTimeout(() => eyeRef.current?.focus(), 0);
  }, [scheduleSleep, updateAssistant]);

  const openPopup = useCallback(() => {
    clearSleepTimer();
    clearTimeout(activityEndTimerRef.current);
    clearTimeout(jumpEndTimerRef.current);
    targetRef.current = { x: 0, y: 0 };
    updateAssistant({
      showPopup: true,
      phase: "open",
      pressed: true,
      bubbleText: null,
      animCue: "press",
      dancing: false,
      angry: false,
      mood: "neutral",
      blinkAmount: 0
    });
    clearTimeout(angryTimerRef.current);
    posXTargetRef.current = homeXRef.current;
    leanTargetRef.current = { x: -0.4, y: -0.3 };
    window.setTimeout(() => updateAssistant({ pressed: false }), 220);
    window.setTimeout(() => updateAssistant({ animCue: null }), 420);
    window.setTimeout(() => inputRef.current?.focus(), 200);
  }, [clearSleepTimer, updateAssistant]);

  const handleEyeClick = () => {
    if (stateRef.current.showPopup) closePopup();
    else openPopup();
  };

  const handleEyeEnter = () => {
    clearSleepTimer();
    clearTimeout(activityEndTimerRef.current);
    clearTimeout(jumpEndTimerRef.current);
    targetRef.current = { x: 0, y: 0 };
    updateAssistant({
      phase: stateRef.current.showPopup ? stateRef.current.phase : "hover",
      hovering: true,
      dancing: true,
      angry: false,
      mood: "neutral",
      animCue: null,
      blinkAmount: 0,
      bubbleText: null
    });
    posXTargetRef.current = motion.posX;
    clearTimeout(angryTimerRef.current);
    angryTimerRef.current = window.setTimeout(() => {
      updateAssistant({ angry: true, dancing: false });
    }, 3000);
  };

  const handleEyeLeave = () => {
    updateAssistant({
      phase: stateRef.current.showPopup ? stateRef.current.phase : "idle",
      hovering: false,
      dancing: false,
      angry: false,
      mood: "neutral"
    });
    clearTimeout(angryTimerRef.current);
    if (!stateRef.current.showPopup) scheduleSleep();
  };

  const handleEyeFocus = () => {
    clearSleepTimer();
    updateAssistant((current) => ({
      phase: current.phase === "sleeping" ? "idle" : current.phase,
      blinkAmount: 0,
      bubbleText: current.phase === "sleeping" ? null : current.bubbleText
    }));
    if (!stateRef.current.showPopup) scheduleSleep();
  };

  const loadMarkdownChunks = useCallback(async () => {
    if (markdownChunksRef.current) return markdownChunksRef.current;

    if (!markdownLoadPromiseRef.current) {
      markdownLoadPromiseRef.current = loadMarkdownDocuments(configRef.current.markdownFiles)
        .then((documents) => chunkMarkdownDocuments(documents))
        .catch(() => []);
    }

    markdownChunksRef.current = await markdownLoadPromiseRef.current;
    return markdownChunksRef.current;
  }, []);

  const clearReplyTimers = useCallback(() => {
    replyTimersRef.current.forEach(clearTimeout);
    replyTimersRef.current = [];
  }, []);

  const runAssistantReply = useCallback(async (text) => {
    const requestId = replyRequestIdRef.current + 1;
    replyRequestIdRef.current = requestId;

    updateAssistant({
      isThinking: true,
      phase: "thinking",
      longWaitText: null,
      hasError: false
    });
    clearReplyTimers();

    replyTimersRef.current.push(
      window.setTimeout(() => {
        if (replyRequestIdRef.current === requestId && stateRef.current.isThinking) {
          updateAssistant({ longWaitText: "Still working on it…" });
        }
      }, 3500)
    );

    try {
      const chunks = await loadMarkdownChunks();
      if (replyRequestIdRef.current !== requestId) return;

      const reply = await createMarkdownRagReply(text, configRef.current, chunks);
      if (replyRequestIdRef.current !== requestId) return;

      clearReplyTimers();
      updateAssistant((current) => ({
        messages: [
          ...current.messages,
          { id: `assistant-${Date.now()}`, text: reply, time: nowTime(), isUser: false }
        ],
        isThinking: false,
        longWaitText: null,
        phase: "success"
      }));
      doBlink(80, 50, 80);
      reactionTimerRef.current = window.setTimeout(() => {
        updateAssistant({ phase: stateRef.current.showPopup ? "open" : "idle" });
      }, 700);
    } catch {
      if (replyRequestIdRef.current !== requestId) return;

      clearReplyTimers();
      updateAssistant({
        isThinking: false,
        longWaitText: null,
        hasError: true,
        lastFailedText: text,
        phase: "error"
      });
      leanTargetRef.current = { x: -0.15, y: 0 };
      reactionTimerRef.current = window.setTimeout(() => {
        leanTargetRef.current = { x: 0, y: 0 };
      }, 500);
    }
  }, [clearReplyTimers, doBlink, loadMarkdownChunks, updateAssistant]);

  const sendMessage = useCallback((text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    updateAssistant((current) => ({
      messages: [
        ...current.messages,
        { id: `user-${Date.now()}`, text: cleanText, time: nowTime(), isUser: true }
      ],
      inputValue: "",
      hasError: false
    }));
    leanTargetRef.current = { x: 0.15, y: 0.2 };
    doBlink(70, 40, 70);
    runAssistantReply(cleanText);
  }, [doBlink, runAssistantReply, updateAssistant]);

  const handleRetry = () => {
    const text = stateRef.current.lastFailedText;
    updateAssistant({ hasError: false, lastFailedText: null });
    if (text) runAssistantReply(text);
  };

  const eyeSize = mobile ? MOBILE_EYE_SIZE : DESKTOP_EYE_SIZE;
  const edge = mobile ? 18 : 28;
  const irisSize = eyeSize * 0.5;
  const pupilSize = irisSize * 0.46;
  const travel = (eyeSize - irisSize) / 2 - 1.5;
  const hoverScale = assistant.hovering && !assistant.showPopup && !mobile ? 1.07 : 1;
  const pressScale = assistant.pressed ? 0.9 : 1;
  const blinkAmount = assistant.phase === "sleeping" ? 1 : assistant.blinkAmount;
  const moodTopLidBoost = assistant.mood === "sad"
    ? eyeSize * 0.1
    : assistant.mood === "naughty"
      ? eyeSize * 0.15
      : 0;
  const topLidHeight = clamp(
    eyeSize * (assistant.hovering ? 0.03 : 0.07) + eyeSize * 0.56 * blinkAmount + moodTopLidBoost,
    0,
    eyeSize
  );
  const bottomLidHeight = clamp(
    eyeSize * 0.05 + eyeSize * 0.46 * blinkAmount,
    0,
    eyeSize
  );
  const browRaise = assistant.hovering ? 1 : assistant.phase === "thinking" ? 0.7 : 0;
  const browY = assistant.angry
    ? -eyeSize * 0.1
    : assistant.mood === "sad"
      ? -eyeSize * 0.11
      : assistant.mood === "naughty"
        ? -eyeSize * 0.22
        : -eyeSize * 0.16 - browRaise * 3;
  const browRotation = assistant.angry
    ? -18
    : assistant.mood === "sad"
      ? 18
      : assistant.mood === "naughty"
        ? 24
        : motion.lean.x * -6 + browRaise * 3;
  const walkPhase = Date.now() / (assistant.dancing ? 130 : 280);
  const walkBob = motion.isWalking ? Math.abs(Math.sin(walkPhase)) * -4 : 0;
  const walkSwing = assistant.dancing
    ? Math.sin(walkPhase) * 26
    : motion.isWalking
      ? Math.sin(walkPhase) * 18
      : 0;

  let characterAnimation = "none";
  if (assistant.angry) characterAnimation = "iris-assistant-error-shake 0.25s ease-in-out infinite";
  else if (assistant.dancing) characterAnimation = "iris-assistant-dance 0.55s ease-in-out infinite";
  else if (assistant.mood === "sad") characterAnimation = "iris-assistant-sad 1.8s ease-in-out infinite";
  else if (assistant.mood === "naughty") characterAnimation = "iris-assistant-naughty 0.7s ease-in-out infinite";
  else if (assistant.animCue === "hop") {
    characterAnimation = "iris-assistant-hop 0.9s cubic-bezier(.34,1.56,.64,1) both";
  } else if (assistant.animCue === "press") {
    characterAnimation = "iris-assistant-press 0.4s cubic-bezier(.34,1.56,.64,1) both";
  } else if (assistant.animCue === "jump") {
    characterAnimation = "iris-assistant-jump 0.9s cubic-bezier(.34,1.56,.64,1) both";
  } else if (assistant.phase === "success") {
    characterAnimation = "iris-assistant-success 0.6s cubic-bezier(.34,1.56,.64,1) both";
  } else if (assistant.phase === "error") {
    characterAnimation = "iris-assistant-error-shake 0.4s cubic-bezier(.34,1.56,.64,1) both";
  } else if (!reducedMotion && assistant.introDone && assistant.phase !== "sleeping") {
    characterAnimation = "iris-assistant-idle 4.5s ease-in-out infinite";
  }

  const rootStyle = {
    "--iris-eye-size": `${eyeSize}px`,
    "--iris-edge": `${edge}px`,
    "--iris-position-x": `${motion.posX}px`,
    "--iris-iris-size": `${irisSize}px`,
    "--iris-pupil-size": `${pupilSize}px`,
    "--iris-pupil-x": `${motion.pupil.x * travel}px`,
    "--iris-pupil-y": `${motion.pupil.y * travel}px`,
    "--iris-top-lid-height": `${topLidHeight}px`,
    "--iris-bottom-lid-height": `${bottomLidHeight}px`,
    "--iris-brow-y": `${browY}px`,
    "--iris-brow-rotation": `${browRotation}deg`,
    "--iris-shadow-width": `${eyeSize * (0.7 + Math.abs(motion.lean.x) * 0.1)}px`,
    "--iris-shadow-opacity": assistant.hovering ? 0.85 : 0.6,
    "--iris-hover-scale": hoverScale,
    "--iris-vein-scale-90": eyeSize / 90,
    "--iris-vein-scale-95": eyeSize / 95,
    "--iris-vein-scale-100": eyeSize / 100,
    "--iris-vein-scale-110": eyeSize / 110,
    "--iris-vein-scale-130": eyeSize / 130,
    "--iris-vein-scale-140": eyeSize / 140,
    "--iris-left-leg-rotation": `${-8 + motion.lean.x * 6 + walkSwing}deg`,
    "--iris-right-leg-rotation": `${8 + motion.lean.x * 6 + (assistant.dancing ? 1 : -1) * walkSwing}deg`
  };

  const characterStyle = {
    transform: `translateY(${motion.lean.y * 6 + walkBob}px) rotate(${motion.lean.x * 4.8}deg) scale(${hoverScale * pressScale}) scaleX(${assistant.facing})`,
    transition: assistant.animCue ? "none" : "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
    animation: characterAnimation,
    filter: assistant.hovering
      ? "drop-shadow(0 6px 14px oklch(0.3 0.03 275 / 0.28))"
      : "none"
  };

  const statusText = assistant.hasError
    ? "Needs attention"
    : assistant.isThinking
      ? "Typing…"
      : "Online";
  const sendDisabled = !assistant.inputValue.trim();
  const assistantConfig = configRef.current;

  return (
    <aside className="iris-assistant-root" aria-label="AI chat assistant" style={rootStyle}>
      {assistant.showPopup ? (
        <section
          id="iris-chat-popup"
          className="iris-chat-popup"
          role="dialog"
          aria-modal="false"
          aria-label={`${assistantConfig.name} AI chat assistant`}
          onKeyDown={(event) => {
            if (event.key === "Escape") closePopup();
          }}
        >
          <header className="iris-chat-header">
            <span className="iris-header-avatar" aria-hidden="true">
              <span className="iris-header-iris"><span /></span>
            </span>
            <span className="iris-header-copy">
              <strong>{assistantConfig.name}</strong>
              <span className="iris-status"><i />{statusText}</span>
            </span>
            <span className="iris-header-actions">
              <button type="button" aria-label="Minimise chat" onClick={closePopup}>
                <span className="iris-minimise-icon" />
              </button>
              <button type="button" aria-label="Close chat" onClick={closePopup}>
                <span className="iris-close-icon" />
              </button>
            </span>
          </header>

          <div className="iris-messages" role="log" aria-live="polite" ref={messagesRef}>
            {assistant.messages.length === 0 && !assistant.hasError ? (
              <div className="iris-welcome">
                <p>{assistantConfig.introText}</p>
                {assistantConfig.tiles.length > 0 ? (
                  <div className="iris-chips">
                    {assistantConfig.tiles.map((tile) => (
                      <button type="button" onClick={() => sendMessage(tile.message)} key={tile.label}>
                        {tile.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {assistant.messages.map((message) => (
              <div
                className={`iris-message-row ${message.isUser ? "is-user" : "is-assistant"}`}
                key={message.id}
              >
                <div className="iris-message-bubble">{message.text}</div>
                <time>{message.time}</time>
              </div>
            ))}

            {assistant.isThinking ? (
              <div className="iris-typing-row">
                <div className="iris-typing-bubble" aria-label={`${assistantConfig.name} is typing`}>
                  <span /><span /><span />
                </div>
                {assistant.longWaitText ? <p>{assistant.longWaitText}</p> : null}
              </div>
            ) : null}

            {assistant.hasError ? (
              <div className="iris-error-row">
                <div className="iris-error-bubble">
                  <p>Something went wrong. Please try again.</p>
                  <button type="button" onClick={handleRetry}>Retry</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="iris-input-area">
            <textarea
              ref={inputRef}
              value={assistant.inputValue}
              onChange={(event) => updateAssistant({ inputValue: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(assistant.inputValue);
                }
              }}
              placeholder="Type your message…"
              aria-label={`Message ${assistantConfig.name}`}
              rows="1"
            />
            <button
              type="button"
              className="iris-send-button"
              aria-label="Send message"
              disabled={sendDisabled}
              onClick={() => sendMessage(assistant.inputValue)}
            >
              <span />
            </button>
          </div>
        </section>
      ) : null}

      <div className="iris-eye-region">
        {assistant.bubbleText ? <div className="iris-speech-bubble">{assistant.bubbleText}</div> : null}
        <span className="iris-shadow" />
        <span className="iris-leg iris-leg-left"><i /></span>
        <span className="iris-leg iris-leg-right"><i /></span>
        <button
          ref={eyeRef}
          type="button"
          className="iris-eye-button"
          aria-label={assistant.showPopup ? "Close AI chat assistant" : "Open AI chat assistant"}
          aria-expanded={assistant.showPopup}
          aria-controls="iris-chat-popup"
          data-angry={assistant.angry ? "true" : "false"}
          data-mood={assistant.mood}
          style={characterStyle}
          onClick={handleEyeClick}
          onMouseEnter={handleEyeEnter}
          onMouseLeave={handleEyeLeave}
          onFocus={handleEyeFocus}
          onBlur={() => {
            if (!stateRef.current.showPopup) scheduleSleep();
          }}
        >
          <span className="iris-eyebrow" />
          <span className="iris-sphere">
            <span className="iris-reflection iris-reflection-primary" />
            <span className="iris-reflection iris-reflection-secondary" />
            <span className="iris-eye-iris">
              <span className="iris-pupil"><i /></span>
            </span>
            <span className="iris-lid iris-lid-top" />
            <span className="iris-lid iris-lid-bottom" />
            <span className="iris-tear" />
            <span className="iris-vein iris-vein-1" />
            <span className="iris-vein iris-vein-1-branch" />
            <span className="iris-vein iris-vein-2" />
            <span className="iris-vein iris-vein-3" />
            <span className="iris-vein iris-vein-3-branch" />
            <span className="iris-vein iris-vein-4" />
            <span className="iris-vein iris-vein-5" />
            <span className="iris-vein iris-vein-5-branch" />
          </span>
        </button>
      </div>
    </aside>
  );
}
