# Iris Expanded Actions Design

## Goal

Expand Iris's random idle behavior from the current four actions into a larger action catalog covering playful mascot actions and assistant-state mini-actions, while keeping the component maintainable.

## Current Behavior

`src/IrisAssistant.jsx` schedules random activity every 12-24 seconds after the intro completes. It currently chooses one of four branches:

- Dance, followed by a jump
- Sad
- Angry
- Naughty

The action logic is embedded directly in the scheduler. Visual expression is controlled by assistant state fields such as `phase`, `mood`, `dancing`, `angry`, `bubbleText`, `animCue`, pupil target, and lean target. CSS keyframes in `src/IrisAssistant.css` provide the actual motion.

## Action Catalog

Add idle mini-actions for:

- Existing actions: `dance-jump`, `sad`, `angry`, `naughty`
- Playful actions: `curious`, `wink`, `look-around`, `peek`, `spin`, `wave`, `nod`, `shake-head`, `excited`, `surprised`, `shy`, `sleepy`, `celebrate`, `stretch`, `bounce`, `hide`, `peekaboo`
- Assistant-state style actions: `confused`, `thinking`, `scan`, `listen`, `focus`, `typing`, `success`, `error`, `impatient`

These are idle visual actions only. Existing real chat states for thinking, success, and error must keep their current behavior and timing.

## Architecture

Replace the random scheduler's large conditional block with a data-driven catalog. Each idle action definition should describe:

- Stable action id
- Optional `phase`
- Optional `mood`
- Optional flags such as `dancing` or `angry`
- Optional `bubbleText`
- Optional `animCue` or CSS animation key
- Optional pupil target and lean target
- Duration before reset
- Optional follow-up action for sequences such as dance then jump

The scheduler should pick one action from the catalog and pass it to one runner function. The runner applies the action state, schedules any follow-up, and resets Iris to idle only if the same action is still active. This preserves the current guard pattern that avoids stale timers changing newer state.

## Visual Design

Reuse current Iris primitives where possible:

- Pupil target for looking, scanning, focusing, listening, shy, confused, and impatient
- Eyelid and mood adjustments for sad, naughty, sleepy, wink, and hide
- `dancing`, `angry`, and `animCue` for stronger movement states
- Short bubble text for personality beats, such as `Hmm?`, `Peek!`, `Yay!`, `Oops!`, and `Wait...`

Add new CSS keyframes for spin, wave, nod, shake-head, stretch, bounce, peek, hide, and scan. Reuse current animations for actions that can be represented by existing movement, mood, eyelid, pupil, and bubble state. Avoid large layout changes; Iris remains a compact floating eye assistant.

## Data Flow

1. Intro completes and `introDone` becomes true.
2. Random activity scheduler waits 12-24 seconds.
3. Scheduler checks the same existing eligibility rules: reduced motion is off, popup is closed, the eye is not hovered, and Iris is not sleeping.
4. Scheduler picks an idle action from the catalog.
5. Runner applies the action state and targets.
6. Timer resets Iris back to neutral idle unless another state has taken over.

## Accessibility And Reduced Motion

Keep random idle actions disabled when `prefers-reduced-motion: reduce` is active. The eye button labels and chat popup ARIA behavior do not change. Text bubbles remain decorative personality hints, not required instructions.

## Error Handling

Idle action timers must be cleared on component unmount. If an action has a follow-up timer, it must use the same stale-state guard as the current dance-to-jump flow. Chat provider errors remain handled by the existing `hasError` and retry flow.

## Testing

Extract the action catalog into a testable helper and add focused tests. At minimum, verify:

- The action catalog contains every requested action id.
- Picking and running an action returns Iris to neutral state after the configured duration.
- Existing chat thinking, success, and error behavior is not replaced by idle mini-actions.

Run the existing project test suite after implementation.

## Out Of Scope

- No new settings UI for selecting actions.
- No sound effects.
- No backend or provider changes.
- No changes to markdown RAG behavior.
