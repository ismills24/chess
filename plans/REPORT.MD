# Chess Engine Technical Report
## Package Boundaries, Architecture, and Integration Points

---

## Executive Summary

The **Chess Engine** (`src/engine/`) is a **pure game logic engine** that implements a turn-based chess game with extensible mechanics. It operates as a **stateless computation layer** that processes moves and maintains game state history, but has **no dependencies on rendering, UI, or game progression systems**.

**Key Characteristics:**
- **Pure TypeScript/JavaScript** - No external runtime dependencies
- **Event-driven architecture** with interceptor pattern
- **Immutable state management** with full history support
- **Modular and extensible** - New pieces, tiles, and rules can be added without core changes
- **Simulation-capable** - Can evaluate moves without side effects

---

## Package Boundaries

### What the Engine DOES

✅ **Core Responsibilities:**
1. **Game State Management** - Maintains immutable game state snapshots with full history
2. **Move Processing** - Converts player moves into events and processes them through an interceptor pipeline
3. **Rule Enforcement** - Validates moves and determines game termination conditions
4. **Turn Management** - Orchestrates turn flow (start → move → end → advance)
5. **Event System** - Provides event-driven architecture for extensible mechanics
6. **AI Support** - Provides simulation capabilities for AI move evaluation
7. **History/Undo** - Maintains linear history for undo/redo functionality

### What the Engine DOES NOT

❌ **Out of Scope:**
1. **Rendering** - No visual representation, no graphics, no UI components
2. **Input Handling** - Does not capture mouse/keyboard events
3. **Game Progression** - No shop, no random encounters, no boss battles, no roguelike progression
4. **Persistence** - No save/load functionality (though state can be serialized externally)
5. **Networking** - No multiplayer synchronization
6. **Asset Management** - No loading of images, sounds, or other assets
7. **3D Engine Integration** - No direct connection to 3D rendering systems

### Integration Contract

The engine exposes a **minimal, well-defined interface**:

```typescript
// Primary Integration Points:
1. GameEngine constructor: (initialState, whiteController, blackController, ruleset)
2. GameEngine.runTurn(): void  // Process one turn
3. GameEngine.currentState: GameState  // Read current state
4. GameEngine.isGameOver(): boolean
5. GameEngine.getWinner(): PlayerColor | null
6. GameEngine.onEventPublished?: (ev: GameEvent) => void  // Event subscription
7. PlayerController.selectMove(state: GameState): Move | null  // Controller interface
```

**Data Flow:**
```
External System → Controllers → GameEngine → Events → State Updates → External System (via onEventPublished)
```

---

## Architecture Overview

### Design Patterns

1. **Event-Driven Architecture**
   - All game actions are represented as immutable `GameEvent` objects
   - Events flow through an interceptor pipeline before state mutation
   - Enables extensible mechanics without core changes

2. **Interceptor Pattern**
   - Pieces (via decorators) and tiles can intercept events
   - Priority-based execution order
   - Events can be replaced, suppressed, or modified

3. **Decorator Pattern**
   - Pieces can be wrapped with decorators to add abilities
   - Decorators implement `Interceptor` to modify event behavior
   - Supports chaining (decorator wrapping decorator)

4. **Strategy Pattern**
   - `RuleSet` interface allows different rule implementations
   - `PlayerController` interface allows different AI/human implementations
   - `GameMode` interface allows different game setups

5. **Immutable State Pattern**
   - `GameState` is immutable - each event creates a new state
   - Enables history, undo/redo, and safe simulation

### Core Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SYSTEM                          │
│  (Frontend, Game Progression, 3D Engine, etc.)              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 1. submitMove(move)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  PlayerController                            │
│  (HumanController, GreedyAIController, etc.)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 2. selectMove(state)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    GameEngine                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  runTurn()                                           │   │
│  │    ├─ TurnStartEvent                                 │   │
│  │    ├─ ProcessMove.buildMoveSequence()               │   │
│  │    │   └─ CaptureEvent (if applicable)              │   │
│  │    │   └─ MoveEvent                                 │   │
│  │    ├─ dispatch(sequence)                            │   │
│  │    │   └─ EventPipeline                             │   │
│  │    │       ├─ Collect Interceptors                  │   │
│  │    │       ├─ Process by Priority                   │   │
│  │    │       └─ Apply Canonical Events                │   │
│  │    ├─ TurnEndEvent                                   │   │
│  │    └─ TurnAdvancedEvent                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  State History: [{event, state}, ...]               │   │
│  │  - Immutable snapshots                               │   │
│  │  - Full undo/redo support                            │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ 3. onEventPublished(ev)
                        │    currentState (read-only)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SYSTEM                          │
│  (React hooks, 3D engine, progression system, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Core System (`core/`)

**GameEngine.ts** - Central orchestrator
- Manages state history (linear array of `{event, state}` pairs)
- Provides undo/redo/jumpTo functionality
- Tracks turn metrics for debugging
- Applies canonical events to state
- **No business logic** - delegates to other components

**EventPipeline.ts** - Event processing engine
- Implements `dispatch()` method (added via prototype extension)
- Collects interceptors from tiles and pieces
- Processes events through interceptor pipeline
- Validates event references before processing
- Handles event replacement and chain abortion

**ProcessMove.ts** - Move-to-event conversion
- Converts a `Move` into an `EventSequence`
- Creates `CaptureEvent` (if target exists) + `MoveEvent`
- Pure function - no state mutation

**Turns.ts** - Turn orchestration
- Implements `runTurn()` method (added via prototype extension)
- Coordinates: TurnStart → Controller selection → Move processing → TurnEnd → TurnAdvance
- Tracks turn metrics

**Simulation.ts** - Move evaluation
- Creates temporary `GameEngine` instance
- Processes moves with `simulation: true` flag (no history mutation)
- Returns resulting state for AI evaluation

**action-packages.ts** - Event sequence helpers
- Factory functions for creating `EventSequence` objects
- Common fallback policies

### 2. Event System (`events/`)

**GameEvent.ts** - Event base classes
- Abstract `GameEvent` base class
- Concrete events: `MoveEvent`, `CaptureEvent`, `DestroyEvent`, `TurnAdvancedEvent`, `TurnStartEvent`, `TurnEndEvent`, `TileChangedEvent`, `PieceChangedEvent`
- All events are immutable with unique IDs
- `getReferencedActors()` for validation

**EventSequence.ts** - Event grouping
- Groups events with a `FallbackPolicy` (AbortChain/ContinueChain)
- Immutable sequence container

**EventSequences.ts** - Common sequences
- Factory functions: `Continue`, `Abort`, `Single()`, `Many()`

**Interceptor.ts** - Interceptor interface
- `Interceptor<TEvent>` interface with `priority` and `intercept()` method
- `InterceptorGuards` utility helpers

### 3. State Management (`state/`)

**GameState.ts** - Immutable game state
- Contains: `Board`, `currentPlayer`, `turnNumber`, `moveHistory`, `movementRestrictions`
- Provides: `clone()`, `simulate()`, `evaluate()`, `getAllLegalMoves()`
- **No mutation methods** - state changes only via events

### 4. Board System (`board/`)

**Board.ts** - 2D grid container
- Manages `pieces[][]` and `tiles[][]` arrays
- Provides spatial queries: `getPieceAt()`, `getTile()`, `getAllPieces()`, `getAllTiles()`
- Mutation methods: `placePiece()`, `removePiece()`, `movePiece()`, `setTile()`
- **Note:** Board is mutable, but `GameState` cloning creates new board instances

### 5. Pieces System (`pieces/`)

**Piece.ts** - Piece interface
- Core properties: `id`, `name`, `owner`, `position`, `movesMade`, `capturesMade`
- Methods: `getCandidateMoves()`, `getRestrictedSquares()`, `getValue()`, `clone()`

**PieceBase.ts** - Base implementation
- Abstract base class with default behavior
- Concrete pieces inherit and override movement/value logic

**standard/** - Standard chess pieces
- `Pawn`, `Knight`, `Bishop`, `Rook`, `Queen`, `King`
- Each implements movement patterns and piece values

**decorators/** - Piece decorators
- `PieceDecoratorBase` - Base decorator class
- Examples: `ExplodingDecorator`, `MarksmanDecorator`, `ScapegoatDecorator`, `PiercingDecorator`, `BouncerDecorator`, `CannibalDecorator`
- Decorators wrap pieces and implement `Interceptor` to modify behavior
- Support chaining (decorator wrapping decorator)

**MovementHelper.ts** - Movement utilities
- `getSlidingMoves()` - For rooks, bishops, queens
- `getJumpMoves()` - For knights, kings
- `CandidateMoves` - Result container with categorized moves
- `MovementRestrictions` - Interface for restricting movement

**PieceValueCalculator.ts** - Value calculation
- Walks decorator chain to compute total piece value
- Used for AI evaluation

### 6. Tiles System (`tiles/`)

**Tile.ts** - Tile interface
- Core properties: `id`, `position`
- Methods: `clone()`, `getRestrictedSquares()`

**BaseTile.ts** - Base implementation
- Abstract base class

**Concrete Tiles:**
- `StandardTile` - Default empty tile
- `FogTile` - Conceals pieces from captures
- `GuardianTile` - Protects pieces
- `SlipperyTile` - Causes sliding movement
- Tiles can implement `Interceptor` to modify events

### 7. Rules System (`rules/`)

**RuleSet.ts** - Rules interface
- `getLegalMoves(state, piece): Move[]` - Filters pseudo-legal moves
- `isGameOver(state): {over, winner}` - Determines game termination

**StandardChess.ts** - Standard chess rules
- Implements check/checkmate detection
- Uses `CheckRules` helper for king safety

**CheckRules.ts** - Check detection
- `isKingInCheck()` - Checks if king is under attack
- `wouldMovePutKingInCheck()` - Validates move legality

**LastPieceStanding.ts** - Alternative ruleset
- Simple survival-based rules (no check/checkmate)

### 8. Win Conditions (`winconditions/`)

**WinCondition.ts** - Win condition interface
- `isGameOver(state): {over, winner}`

**CheckmateCondition.ts** - Checkmate detection
- Checks for checkmate and stalemate

### 9. Controllers (`controllers/`)

**PlayerController.ts** - Controller interface
- `selectMove(state): Move | null` - Returns chosen move or null

**HumanController.ts** - Human player
- Stores pending move submitted externally
- Returns move when `selectMove()` is called

**GreedyAIController.ts** - AI player
- Uses negamax with alpha-beta pruning
- Evaluates positions using `state.evaluate()`
- Uses `Simulation.simulateTurn()` for move evaluation

### 10. Game Modes (`modes/`)

**GameMode.ts** - Mode interface
- `setupBoard(): Board` - Creates initial board
- `getRuleSet(): RuleSet` - Returns ruleset
- `getPiecePlacement(): PiecePlacement` - Returns placement strategy

**StandardChessMode.ts** - Standard chess mode
- 8x8 board with standard piece placement
- Uses `StandardChessRuleSet`

**placement/** - Piece placement strategies
- `PiecePlacement` interface
- `StandardChessPlacement` - Standard starting positions

### 11. Primitives (`primitives/`)

**Move.ts** - Move representation
- `from`, `to`, `piece`, `isCapture`
- Immutable move object

**PlayerColor.ts** - Player enumeration
- `White`, `Black`

**Vector2Int.ts** - 2D integer coordinates
- `x`, `y` with arithmetic operations
- Used for board positions

---

## Key Interfaces and Contracts

### GameEngine Public API

```typescript
class GameEngine {
    // Construction
    constructor(
        initialState: GameState,
        whiteController: PlayerController,
        blackController: PlayerController,
        ruleset: RuleSet
    )
    
    // State Access (Read-Only)
    readonly currentState: GameState
    readonly currentIndex: number
    readonly historyCount: number
    readonly history: ReadonlyArray<{event: GameEvent, state: GameState}>
    
    // Turn Execution
    runTurn(): void  // Process one turn
    
    // Game Status
    isGameOver(): boolean
    getWinner(): PlayerColor | null
    
    // History Navigation
    undo(): void
    redo(): void
    jumpTo(index: number): void
    undoLastMove(): void
    redoLastMove(): void
    
    // Event Subscription
    onEventPublished?: (ev: GameEvent) => void
    
    // Debug/Metrics
    readonly lastTurnMetrics: TurnMetrics | null
    readonly turnMetricsHistory: ReadonlyArray<TurnMetrics>
}
```

### PlayerController Interface

```typescript
interface PlayerController {
    selectMove(state: GameState): Move | null
}
```

### RuleSet Interface

```typescript
interface RuleSet {
    getLegalMoves(state: GameState, piece: Piece): Move[]
    isGameOver(state: GameState): {over: boolean, winner: PlayerColor | null}
}
```

### Interceptor Interface

```typescript
interface Interceptor<TEvent extends GameEvent = GameEvent> {
    readonly priority: number
    intercept(ev: TEvent, state: GameState): EventSequenceLike
}
```

### GameState Structure

```typescript
class GameState {
    readonly board: Board
    readonly currentPlayer: PlayerColor
    readonly turnNumber: number
    readonly moveHistory: readonly Move[]
    readonly movementRestrictions: MovementRestrictions[]
    
    // Methods
    clone(): GameState
    simulate(move: Move, ruleset: RuleSet): GameState | null
    evaluate(): number
    getAllLegalMoves(ruleset: RuleSet): Move[]
}
```

---

## Integration Points with External Systems

### 1. Frontend Integration

**Location:** `src/renderer/chess/engineAdapter.ts`, `EngineContext.tsx`

**Pattern:**
- Frontend creates `GameEngine` instance via `createEngineBundle()`
- React hooks (`useEngineState()`) subscribe to `onEventPublished` for reactive updates
- Frontend calls `submitHumanMove(move)` which triggers `runTurn()`
- Frontend reads `currentState` to render board

**Data Flow:**
```
React Component → submitHumanMove() → HumanController → GameEngine.runTurn() 
→ Events → onEventPublished → React Hook → Re-render
```

### 2. Game Progression System (Future)

**Integration Points:**
- **State Serialization:** `GameState` can be cloned/serialized for save/load
- **Event Hooks:** `onEventPublished` can be used to track game events for progression
- **Win/Loss Detection:** `isGameOver()` and `getWinner()` for progression triggers
- **Custom Rules:** New `RuleSet` implementations can enforce progression rules

**What Engine Provides:**
- ✅ Game state snapshots
- ✅ Event stream for analytics/progression
- ✅ Win/loss detection
- ✅ Turn-based execution

**What Engine Needs:**
- ❌ Nothing - engine is self-contained

### 3. 3D Engine Integration (Future)

**Integration Points:**
- **State Reading:** 3D engine reads `currentState.board` to render pieces/tiles
- **Event Subscription:** 3D engine subscribes to `onEventPublished` for animations
- **Move Submission:** 3D engine calls `submitHumanMove()` when player clicks

**What Engine Provides:**
- ✅ Current board state (pieces, tiles, positions)
- ✅ Event stream for animation triggers
- ✅ Move validation via `RuleSet.getLegalMoves()`

**What Engine Needs:**
- ❌ Nothing - engine has no rendering dependencies

### 4. Map Builder Integration

**Location:** `src/renderer/mapbuilder/`, `src/renderer/maploader/`

**Pattern:**
- Map builder creates `Board` with custom pieces/tiles
- Map is serialized to JSON
- Map loader deserializes and creates `GameState`
- `GameEngine` is initialized with loaded state

**Data Flow:**
```
Map Builder → Board → JSON → Map Loader → GameState → GameEngine
```

---

## Event System Deep Dive

### Event Lifecycle

1. **Event Creation**
   - Events are created by `ProcessMove`, interceptors, or game logic
   - All events are immutable with unique IDs

2. **Event Validation**
   - `isEventValid()` checks that referenced pieces/tiles still exist
   - Invalid events are skipped before interceptor processing

3. **Interceptor Collection**
   - `InterceptorCollector` gathers all interceptors from:
     - All tiles on the board
     - All pieces (including decorator chains)
   - Interceptors are sorted by `priority` (ascending)

4. **Interceptor Processing**
   - Each event is passed through interceptors in priority order
   - First interceptor that returns a replacement sequence wins
   - If `AbortChain` is set, remaining events are cleared

5. **Canonical Application**
   - Events that survive interception are applied to state
   - `applyEventToState()` creates new `GameState` snapshot
   - State is pushed to history
   - `onEventPublished` callback is invoked

### Event Types and Their Uses

| Event Type | Created By | Purpose |
|------------|-----------|---------|
| `MoveEvent` | `ProcessMove`, interceptors | Piece movement |
| `CaptureEvent` | `ProcessMove` | Piece capture |
| `DestroyEvent` | Interceptors | Non-capture piece removal |
| `TurnStartEvent` | `Turns.runTurn()` | Turn initialization |
| `TurnEndEvent` | `Turns.runTurn()` | Turn cleanup |
| `TurnAdvancedEvent` | `Turns.runTurn()` | Player switch, turn increment |
| `TileChangedEvent` | Interceptors | Tile replacement |
| `PieceChangedEvent` | Interceptors | Piece transformation |

### Interceptor Priority Guidelines

- **Priority 0:** Validation, basic effects, early processing
- **Priority 1:** Secondary effects (explosions, bounces)
- **Priority 2+:** Late-stage modifications, final effects

**Example Priority Chain:**
```
MarksmanDecorator (0) → ExplodingDecorator (1) → CustomDecorator (2)
```

---

## Extension Points

### Adding New Pieces

1. Create class extending `PieceBase`
2. Implement `getCandidateMoves()` and `getValue()`
3. Optionally add to `entityRegistry.ts` for map builder

### Adding New Decorators

1. Create class extending `PieceDecoratorBase`
2. Implement `Interceptor<TEvent>` interface(s)
3. Set appropriate `priority`
4. Implement `intercept()` method
5. Add to `entityRegistry.ts`

### Adding New Tiles

1. Create class extending `BaseTile`
2. Optionally implement `Interceptor<TEvent>`
3. Implement `getRestrictedSquares()` if needed
4. Add to `entityRegistry.ts`

### Adding New Rules

1. Create class implementing `RuleSet`
2. Implement `getLegalMoves()` and `isGameOver()`
3. Use in `GameMode.getRuleSet()`

### Adding New Events

1. Create class extending `GameEvent`
2. Implement `getReferencedActors()` for validation
3. Add handling in `GameEngine.applyEventToState()`
4. Update interceptors to handle new event type

---

## Performance Characteristics

### Time Complexity

- **Move Processing:** O(I × E) where I = interceptors, E = events
- **State Cloning:** O(B) where B = board size (pieces + tiles)
- **Legal Move Generation:** O(P × M) where P = pieces, M = moves per piece
- **AI Simulation:** O(D × M^D) where D = depth, M = moves per position

### Memory Characteristics

- **State History:** Linear growth with turn count (can be trimmed)
- **Event Objects:** Short-lived, garbage collected after processing
- **Board Cloning:** Full copy on each state change (immutability cost)

### Optimization Opportunities

1. **History Trimming:** Only keep last N states
2. **Lazy Cloning:** Copy-on-write for board
3. **Interceptor Caching:** Cache interceptor collection per state
4. **Move Caching:** Cache legal moves per state

---

## Testing Strategy

### Unit Testing

- **Events:** Test event creation and `getReferencedActors()`
- **Interceptors:** Test interceptor logic in isolation
- **Rules:** Test rule validation with known positions
- **Pieces:** Test movement patterns

### Integration Testing

- **Turn Execution:** Test full turn flow
- **Decorator Chains:** Test multiple decorators interacting
- **Tile Effects:** Test tile + piece interactions
- **History:** Test undo/redo functionality

### Simulation Testing

- **AI Evaluation:** Test move evaluation without side effects
- **Move Validation:** Test legal move filtering

---

## Dependencies

### Internal Dependencies

The engine has **no external runtime dependencies**. All code is pure TypeScript.

### Type Dependencies

- TypeScript types only (no runtime libraries)

### Import Structure

```
engine/
├── core/          (depends on: events, state, rules, controllers, primitives)
├── events/        (depends on: primitives, pieces, tiles)
├── state/         (depends on: board, primitives, rules, pieces)
├── board/         (depends on: pieces, tiles, primitives)
├── pieces/        (depends on: primitives, state, events)
├── tiles/          (depends on: primitives, state, events)
├── rules/         (depends on: state, pieces, primitives, winconditions)
├── controllers/   (depends on: state, primitives, rules, core)
├── modes/         (depends on: board, rules, pieces, primitives)
├── winconditions/ (depends on: state, primitives, rules)
└── primitives/    (no dependencies)
```

---

## System Diagram Context

### Where Engine Fits

```
┌─────────────────────────────────────────────────────────────┐
│                    ROGUELIKE GAME SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │   Frontend   │    │  Game Engine  │    │  3D Engine  │ │
│  │  (React UI)  │◄───┤  (Chess Logic)├───►│  (Rendering)│ │
│  └──────────────┘    └──────────────┘    └─────────────┘ │
│         │                     │                   │         │
│         │                     │                   │         │
│         ▼                     ▼                   ▼         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Game Progression System                      │  │
│  │  (Shop, Encounters, Boss Battles, Progression)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Engine Boundaries

**Input:**
- Move selections from controllers
- Initial game state (from map loader or game mode)

**Output:**
- Current game state (read-only)
- Event stream (via `onEventPublished`)
- Game status (win/loss, game over)

**No Direct Dependencies On:**
- Frontend framework
- 3D rendering
- Game progression
- Asset loading
- Networking

**Integration Via:**
- `PlayerController` interface (dependency injection)
- `GameState` reading (pull-based)
- `onEventPublished` callback (push-based)
- `RuleSet` interface (strategy pattern)

---

## Summary

The Chess Engine is a **self-contained, pure game logic package** that:

1. **Processes turns** by converting moves into events and applying them through an interceptor pipeline
2. **Maintains state** as immutable snapshots with full history support
3. **Enforces rules** through pluggable `RuleSet` implementations
4. **Supports extensibility** via decorators, tiles, and interceptors
5. **Provides simulation** for AI move evaluation
6. **Exposes minimal interface** for external system integration

The engine is designed to be **agnostic** to rendering, UI, and game progression systems, making it suitable for integration into a larger roguelike game where it handles only the chess game logic.

---

## Appendix: File Structure

```
src/engine/
├── core/
│   ├── GameEngine.ts              # Main orchestrator
│   ├── EventPipeline.ts           # Event processing (prototype extension)
│   ├── ProcessMove.ts             # Move → Event conversion
│   ├── Simulation.ts              # Move evaluation
│   ├── Turns.ts                   # Turn orchestration (prototype extension)
│   └── action-packages.ts         # Event sequence helpers
├── events/
│   ├── GameEvent.ts               # Event base classes
│   ├── EventSequence.ts           # Event grouping
│   ├── EventSequences.ts          # Common sequences
│   └── Interceptor.ts             # Interceptor interface
├── state/
│   └── GameState.ts               # Immutable game state
├── board/
│   └── Board.ts                   # 2D grid container
├── pieces/
│   ├── Piece.ts                   # Piece interface
│   ├── PieceBase.ts               # Base implementation
│   ├── MovementHelper.ts          # Movement utilities
│   ├── PieceValueCalculator.ts    # Value calculation
│   ├── decorators/                # Piece decorators
│   └── standard/                  # Standard chess pieces
├── tiles/
│   ├── Tile.ts                    # Tile interface
│   ├── BaseTile.ts                # Base implementation
│   └── [CustomTiles].ts           # Custom tile types
├── rules/
│   ├── RuleSet.ts                 # Rules interface
│   ├── StandardChess.ts          # Standard chess rules
│   ├── CheckRules.ts              # Check detection
│   └── LastPieceStanding.ts       # Alternative ruleset
├── winconditions/
│   ├── WinCondition.ts            # Win condition interface
│   └── CheckmateCondition.ts     # Checkmate detection
├── controllers/
│   ├── PlayerController.ts        # Controller interface
│   ├── HumanController.ts         # Human player
│   └── GreedyAIController.ts     # AI player
├── modes/
│   ├── GameMode.ts                # Mode interface
│   ├── StandardChessMode.ts       # Standard chess mode
│   └── placement/                 # Piece placement strategies
└── primitives/
    ├── Move.ts                    # Move representation
    ├── PlayerColor.ts             # Player enumeration
    └── Vector2Int.ts              # 2D coordinates
```

---

*Report Generated: 2024*
*Engine Version: Current (as of investigation)*

