🟥 Old Architecture: Interceptor Pipeline (current engine)

Model:

EventSequence → Interceptors (recursive, state-frozen) → CanonicalEvents → Apply all at end

Core properties

🔒 State is frozen during the entire event pipeline.

🔁 Interceptors recursively emit new EventSequences.

🧮 Complexity grows non-linearly in cascading interactions.

🧹 Many events are generated that become invalid once state actually updates.

🔄 Undo is easy (single final state applied).

🧩 Decorators/tiles implement intercept() which:

can replace/abort/extend events

but must work with stale references

cannot react to incremental state changes

Main weaknesses

⚠️ Interceptors see stale state
(state is not updated until the whole pipeline finishes).

⚠️ Recursion causes event explosion
especially with chain reactions (exploding pieces).

⚠️ Invalid events accumulate
(events emitted for actors already destroyed earlier).

⚠️ Ordering is difficult to reason about
because interceptors recursively create new sequences in arbitrary order.

⚠️ Hard to extend safely
as you add more roguelike content, recursion & stale state interactions get worse.

🟩 New Architecture: Listener Queue Model (target engine)

Model:

InitialEffects → Queue → 
  for each effect:
      run BEFORE listeners (priority-ordered)  
      APPLY effect (update state immediately)  
      run AFTER listeners (priority-ordered)  
      enqueue new effects  

Core properties

🔄 State updates incrementally after each effect.

📬 Listeners are generic event observers (not recursive interceptors).

🧾 EffectQueue is linear, not recursive.

⏱ Complexity is near-linear, not exponential.

🧠 Listeners decide if the effect matters (filter by position, actor, tags, etc.).

🛡️ High-priority listeners can modify/cancel effects before they apply.

🔥 After-effect listeners can add new effects for chain reactions.

Listeners have only 2 hooks

onBeforeEffect(ctx, effect)
→ modify, replace, or cancel (effect = null)

onAfterEffect(ctx, effect)
→ produce new effects to enqueue

Everything else is expressed in terms of these two generic hooks.

Fixes all the old weaknesses

✔ Live state, no stale references
Every listener sees the board exactly as it is right now.

✔ Chain reactions are clean & predictable
No recursion, no exponential growth.

✔ Protector-style logic works naturally
“Cancel damage to an adjacent ally BEFORE it applies.”

✔ Invalid events mostly never happen
Since listeners see updated state in real time.

✔ Content is easier to author
Listeners are simpler than recursive interceptors.

🟦 Conceptual Shift (in 3 lines)
Old: “Events mutate at the end. Interceptors rewrite future events using a frozen world.”
New: “Effects mutate immediately. Listeners observe/modify effects in real-time as the world changes.”
🟨 What Stayed the Same

Still an event-based architecture

Still fully extensible

Still power-up friendly

Still rule-agnostic

Still supports decorators & tiles

Still deterministic & undoable (immutable state snapshots)

🟦 What Improved Dramatically

Correctness (no stale state)

Predictability (linear queue)

Performance (no recursive explosion)

Moddability (generic hooks)

Ability design (protector-style interactions now natural)

Debugging (effect log makes sense)

AI friendliness (clean incremental state transitions)

🟩 In One Sentence

We are replacing the recursive, frozen-state interceptor chain with a linear, live-state listener queue, where abilities observe and modify effects before and after each state-changing action, producing clean, incremental, predictable simulation.