🎯 NEW TARGET ARCHITECTURE — FULL SUMMARY

This architecture has four layers:

Catalog — defines what content exists

GameManager — orchestrates the roguelike run

ChessManager — manages a single chess encounter

ChessEngine — the pure rules engine (stateless, effect-driven)

Plus, the Renderer, which consumes the outputs.

Each layer has strict responsibilities and boundaries.

🟩 1. Catalog
Purpose:

Owns all game content, but no logic about how a game runs.

Responsibilities

Defines all:

piece types

tile types

decorators

abilities/listeners

rulesets

AI types

Provides constructors for:

ActorSnapshot

TileSnapshot

Ability/Listener instances

RuleSet implementations

Provides metadata for the renderer:

animations

3D models

visual effects

sound mappings

Constraints

Must follow the interfaces defined by ChessEngine:

Listener

Effect

RuleSet

ActorSnapshot

TileSnapshot

Must not depend on ChessManager or GameManager.

Analogy:

“Content plugin library” — your entire chess roguelike lives here.

🟧 2. GameManager (Roguelike Runtime)
Purpose:

Owns a player's entire run — the roguelike meta-game.

Responsibilities

Manages:

player inventory

relics / items

run RNG seed

gold

shop options

map layout (fight → shop → event → boss)

Chooses:

the next encounter type

which AI to use for enemies

which rule set (classic, last-piece-standing, chaos, etc.)

Instantiates a new ChessManager whenever a fight starts.

Saves and loads run state.

Reads from Catalog to construct:

allowed pieces

allowed tiles

abilities in this run

possible upgrades

Constraints

Never touches ChessEngine directly.

Only interacts through ChessManager.

Analogy:

“Slay the Spire’s RunManager, Map, and Relic system.”
It orchestrates everything around chess, not the chess match itself.

🟨 3. ChessManager (Single Match Orchestrator)
Purpose:

Owns a single chess match, from start to finish.

Responsibilities

Maintains:

canonical list of GameStates

history (for undo, replay, animation)

turn counter

Provides:

getStateHistory()

undoLastMove()

playHumanTurn(move)

playAITurn(ai)

getLegalMoves()

Applies a player or AI move by delegating to ChessEngine.resolveMove.

Handles encounter-specific things:

“Boss phase 2 starts when HP < 50”

“Spawn reinforcements on turn 10”

“Extra abilities unlocked based on player relics”

Constraints

Does not know how abilities work internally.

Does not own piece types.

Cannot modify state except via ChessEngine-created GameStates.

Analogy:

“The referee + record keeper.”
ChessManager is the match state machine around the engine.

🟦 4. ChessEngine (Pure Logic Kernel)
Purpose:

A stateless, content-agnostic, deterministic simulation engine.

Responsibilities

Defines the vocabulary:

Effect / EffectType

GameState shape

ActorSnapshot shape

TileSnapshot shape

Listener interface

RuleSet interface

BoardSnapshot geometry

Implements:

resolveMove(gameState, move, config)

getLegalMoves(gameState, activePlayer, ruleset)

Provides the Listener Queue pipeline:

For each effect:

call all onBeforeEffect listeners

apply effect → produce new immutable GameState

call all onAfterEffect listeners

enqueue any new effects

Enforces:

move legality

turn invariants

core semantics of effects:

movement

capture

death

tile change

stat modifications

Constraints

Does not know specific piece types (Pawn, ExplodingRook).

Does not own movement logic — RuleSet handles that.

Does not know specific tiles (SlipperyTile).

Does not store state.

Does not maintain history.

Analogy:

“The physics engine of the chess world.”
It defines what a MovePieceEffect means, but not what a CannonBishop is.

🟥 5. Renderer (Frontend Layer)
Purpose:

Pure presentation / UI layer.

Responsibilities

Renders:

GameManager scenes (shop, map, fight, etc.)

Chess board (3D board, piece animations)

Reacts to:

state changes

resolved effect log

Provides:

user interaction

click → move input

inventory UI

visual decisions (VFX based on Catalog metadata)

Constraints

No game logic.

No move legality logic.

No AI.

🧱 How data flows between layers
GameManager → ChessManager

“Start a match with this setup and these rulesets/pieces.”

ChessManager → ChessEngine

“Resolve this move in this GameState.”

ChessEngine → ChessManager

“Here is your new GameState + event log.”

ChessManager → Renderer

“Render this board state + events.”

Renderer → ChessManager

“Player clicked here → produce a Move.”

🔥 One-Line Summary for Each Component
Catalog

Defines content (pieces, tiles, abilities, rulesets) that conform to ChessEngine’s interfaces.

GameManager

Owns the entire roguelike run; chooses encounters, inventories, upgrades, AI, shop, bosses.

ChessManager

Owns a single chess match; manages history, turns, and integrates ChessEngine into the run.

ChessEngine

Pure rules kernel; stateless; resolves moves into effects using the listener queue model.

Renderer

Shows everything; no logic.