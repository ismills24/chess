# Chess Engine Architecture Migration Plan

## Overview

This plan outlines the step-by-step migration from the current **Interceptor Pipeline** architecture to the new **Listener Queue** architecture, organized into three new modules: **ChessEngine**, **Catalog**, and **ChessManager**.

## Architecture Summary

### Current Architecture (Old)
- **Event-driven** with recursive interceptor pipeline
- **Frozen state** during event processing
- **GameEngine** owns history, state, controllers, turn management
- **Interceptors** can recursively emit new events
- State updates only after entire pipeline completes

### Target Architecture (New)
- **Effect-driven** with linear listener queue
- **Live state** updates incrementally after each event
- **ChessEngine**: Stateless, pure logic kernel
- **Catalog**: Content definitions (pieces, tiles, abilities, rulesets)
- **ChessManager**: Single match orchestrator (history, turns, AI)
- **Listeners**: Observe/modify events before/after application

---

## Phase 1: ChessEngine (Core Logic Kernel)

### 1.1 Directory Structure
```
src/chess-engine/
├── events/
│   ├── Event.ts                    # Base Event class (rename from GameEvent)
│   ├── EventRegistry.ts            # All event type definitions
│   ├── EventTypes.ts               # Union type of all events
│   └── index.ts
├── listeners/
│   ├── Listener.ts                 # Listener interface
│   ├── ListenerContext.ts         # Context passed to listeners
│   └── index.ts
├── state/
│   ├── GameState.ts                # Immutable game state
│   ├── Board.ts                    # Board container
│   └── index.ts
├── primitives/
│   ├── Move.ts
│   ├── PlayerColor.ts
│   ├── Vector2Int.ts
│   └── index.ts
├── rules/
│   ├── RuleSet.ts                  # Interface only
│   ├── MovementPatterns.ts        # Movement utilities (sliding, jumping)
│   └── index.ts
├── core/
│   ├── ChessEngine.ts              # Main engine class (stateless)
│   ├── EventQueue.ts               # Linear event queue processor
│   ├── EventApplier.ts             # Applies events to state incrementally
│   └── index.ts
└── index.ts                        # Public API
```

### 1.2 Key Interfaces

#### Listener Interface
```typescript
interface Listener {
    readonly priority: number;  // Lower = earlier execution
    
    onBeforeEvent?(ctx: ListenerContext, event: GameEvent): GameEvent | null;
    // Returns: 
    //   - Modified event (to replace original)
    //   - null (to cancel event - onAfterEvent will NOT run)
    //   - Same event (to pass through unchanged)
    
    onAfterEvent?(ctx: ListenerContext, event: GameEvent): GameEvent[];
    // Returns: array of new events to enqueue (empty = no new events)
    // Only called if event was not cancelled in onBeforeEvent
}
```

#### ListenerContext
```typescript
interface ListenerContext {
    readonly state: GameState;        // Current live state (includes turnNumber, currentPlayer, etc.)
    readonly eventLog: readonly GameEvent[];  // Events applied so far in this resolution
}
```

#### ChessEngine API
```typescript
class ChessEngine {
    /**
     * Resolve a move and return the resulting state + event log.
     * Pure function - no internal state.
     * Assumes move is valid (validation done via getLegalMoves).
     */
    static resolveMove(
        initialState: GameState,
        move: Move,
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    };
    
    /**
     * Resolve a single event (for TurnStart, TurnEnd, TurnAdvanced, etc.).
     * Useful for turn boundary events.
     */
    static resolveEvent(
        initialState: GameState,
        event: GameEvent,
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    };
    
    /**
     * Resolve a full turn: TurnStart → Move → TurnEnd → TurnAdvanced.
     * Convenience method that orchestrates turn events.
     */
    static resolveTurn(
        initialState: GameState,
        move: Move,
        listeners: Listener[]
    ): {
        finalState: GameState;
        eventLog: readonly GameEvent[];
    };
    
    /**
     * Get legal moves for a piece.
     */
    static getLegalMoves(
        state: GameState,
        piece: Piece,
        ruleset: RuleSet
    ): Move[];
    
    /**
     * Check if game is over.
     */
    static isGameOver(
        state: GameState,
        ruleset: RuleSet
    ): { over: boolean; winner: PlayerColor | null };
}
```

### 1.3 Event Queue Processing

**Algorithm:**
```
1. Start with initial events (from move or single event)
2. Create event queue: Queue<GameEvent>
3. While queue not empty:
   a. Pop next event
   b. Collect all listeners, sort by priority (lower = earlier)
   c. Run onBeforeEvent listeners (priority order, ascending)
      - If any returns null → cancel event, skip to next (no onAfterEvent)
      - If any modifies event → use modified version for subsequent listeners
   d. If event not cancelled:
      - Apply event to current state → new state
      - Run onAfterEvent listeners (priority order, ascending)
      - Collect all new events from listeners
      - Enqueue new events
      - Update current state
4. Return final state + event log
```

**Note on Turn Events:**
- `TurnStartEvent` and `TurnEndEvent` are processed like any other event
- `resolveTurn()` orchestrates: TurnStart → Move → TurnEnd → TurnAdvanced
- Abilities can listen to turn events to trigger at turn boundaries

### 1.4 Event Types (Keep Existing)
- `MoveEvent`
- `CaptureEvent`
- `DestroyEvent`
- `TurnAdvancedEvent`
- `TurnStartEvent`
- `TurnEndEvent`
- `TileChangedEvent`
- `PieceChangedEvent`
- `GameOverEvent`
- `TimeOutEvent`

### 1.5 Implementation Tasks

1. **Create directory structure** (`src/chess-engine/`)
2. **Port primitives** (Move, PlayerColor, Vector2Int) - copy from old engine
3. **Port Event system** (rename GameEvent → Event, keep all event types)
4. **Create Listener interface** and ListenerContext
5. **Port GameState and Board** (minimal changes, ensure immutability)
6. **Port RuleSet interface** (move implementations to Catalog later)
7. **Port MovementPatterns** (from MovementHelper)
8. **Implement EventApplier** (incremental state updates)
9. **Implement EventQueue** (linear queue processor)
10. **Implement ChessEngine.resolveMove()** (main entry point)
11. **Implement ChessEngine.resolveEvent()** (for single events like TurnStart/TurnEnd)
12. **Implement ChessEngine.resolveTurn()** (orchestrates full turn)
13. **Implement ChessEngine.getLegalMoves()**
14. **Implement ChessEngine.isGameOver()**
13. **Write unit tests** for:
    - Event queue processing
    - Listener before/after hooks
    - State updates
    - Move resolution
    - Chain reactions (explosions, etc.)

### 1.6 Testing Strategy

- **Unit tests** for each component in isolation
- **Integration tests** for full move resolution
- **Chain reaction tests** (exploding pieces, cascading effects)
- **State immutability tests** (verify no mutations)
- **Performance tests** (compare to old interceptor system)

---

## Phase 2: Catalog (Content Definitions)

### 2.1 Directory Structure
```
src/catalog/
├── pieces/
│   ├── Piece.ts                    # Piece interface (from ChessEngine)
│   ├── PieceBase.ts                # Base implementation
│   ├── standard/
│   │   ├── Pawn.ts
│   │   ├── Knight.ts
│   │   ├── Bishop.ts
│   │   ├── Rook.ts
│   │   ├── Queen.ts
│   │   └── King.ts
│   └── index.ts
├── abilities/
│   ├── Ability.ts                  # Ability interface (replaces decorator)
│   ├── AbilityBase.ts              # Base decorator class
│   ├── MarksmanAbility.ts
│   ├── ExplodingAbility.ts
│   ├── ScapegoatAbility.ts
│   ├── PiercingAbility.ts
│   ├── BouncerAbility.ts
│   ├── CannibalAbility.ts
│   └── index.ts
├── tiles/
│   ├── Tile.ts                     # Tile interface (from ChessEngine)
│   ├── BaseTile.ts                 # Base implementation
│   ├── StandardTile.ts
│   ├── GuardianTile.ts
│   ├── SlipperyTile.ts
│   ├── FogTile.ts
│   └── index.ts
├── rulesets/
│   ├── StandardChess.ts
│   ├── LastPieceStanding.ts
│   └── index.ts
├── registry/
│   ├── PieceRegistry.ts            # Factory functions for pieces
│   ├── AbilityRegistry.ts          # Factory functions for abilities
│   ├── TileRegistry.ts             # Factory functions for tiles
│   ├── RuleSetRegistry.ts          # Factory functions for rulesets
│   └── index.ts
└── index.ts
```

### 2.2 Ability Pattern (Replaces Decorator)

```typescript
abstract class AbilityBase implements Piece, Listener {
    protected readonly inner: Piece;
    readonly priority: number;
    
    // Piece interface delegation
    get name(): string { return this.inner.name; }
    get owner(): PlayerColor { return this.inner.owner; }
    // ... etc
    
    // Listener interface
    onBeforeEvent?(ctx: ListenerContext, event: GameEvent): GameEvent | null;
    onAfterEvent?(ctx: ListenerContext, event: GameEvent): GameEvent[];
    
    abstract clone(): Piece;
}
```

### 2.3 Implementation Tasks

1. **Create directory structure** (`src/catalog/`)
2. **Port Piece system** (copy from old engine, adapt to new interfaces)
3. **Port Tile system** (copy from old engine, adapt to new interfaces)
4. **Convert decorators to abilities**:
   - Rename `PieceDecoratorBase` → `AbilityBase`
   - Replace `intercept()` with `onBeforeEvent()` / `onAfterEvent()`
   - Update each decorator:
     - `MarksmanDecorator` → `MarksmanAbility`
     - `ExplodingDecorator` → `ExplodingAbility`
     - etc.
5. **Port RuleSet implementations** (StandardChess, LastPieceStanding)
6. **Create registry system** (factory functions for all content)
7. **Write unit tests** for each ability:
   - Marksman: ranged kills
   - Exploding: chain explosions
   - Scapegoat: damage redirection
   - Piercing: multi-target
   - Bouncer: deflection
   - Cannibal: stat gain on kill
8. **Write unit tests** for tiles:
   - Guardian: protection
   - Slippery: sliding movement
   - Fog: concealment
9. **Write integration tests** for ability combinations

### 2.4 Migration Notes

- **Decorator → Ability**: Same wrapping pattern, different interface
- **Interceptor → Listener**: Replace `intercept()` with `onBeforeEvent()` / `onAfterEvent()`
- **State access**: Listeners receive live state in context (no stale references)
- **Event generation**: Use `onAfterEvent()` to enqueue new events (no recursion)

---

## Phase 3: ChessManager (Match Orchestrator)

### 3.1 Directory Structure
```
src/chess-manager/
├── ChessManager.ts                 # Main manager class
├── History.ts                      # History management
├── types.ts                        # Type definitions
└── index.ts
```

### 3.2 ChessManager API

```typescript
class ChessManager {
    constructor(
        initialState: GameState,
        ruleset: RuleSet,
        listeners: Listener[]  // From Catalog (abilities + tiles)
    );
    
    // State access
    readonly currentState: GameState;
    readonly history: readonly { state: GameState; eventLog: GameEvent[] }[];
    readonly currentIndex: number;
    
    // Move execution
    playMove(move: Move): {
        success: boolean;
        newState: GameState;
        eventLog: GameEvent[];
    };
    
    // History navigation
    undo(): void;
    redo(): void;
    jumpTo(index: number): void;
    undoLastMove(): void;
    
    // Game status
    isGameOver(): boolean;
    getWinner(): PlayerColor | null;
    
    // Legal moves
    getLegalMoves(): Move[];
    getLegalMovesForPiece(piece: Piece): Move[];
}
```

### 3.3 Implementation Tasks

1. **Create directory structure** (`src/chess-manager/`)
2. **Implement History management** (state snapshots + event logs)
3. **Implement ChessManager class**:
   - Maintain history array
   - Delegate to ChessEngine.resolveMove()
   - Handle undo/redo
   - Expose current state
4. **Implement move validation** (delegate to ChessEngine.getLegalMoves())
5. **Implement game over detection** (delegate to ChessEngine.isGameOver())
6. **Write unit tests** for:
   - Move execution
   - History management
   - Undo/redo
   - State snapshots
7. **Write integration tests** with Catalog abilities

### 3.4 Integration Points

- **ChessEngine**: Pure function calls
- **Catalog**: Provides listeners (abilities + tiles) and ruleset
- **Future GameManager**: Will instantiate ChessManager per encounter

---

## Migration Strategy

### Step-by-Step Implementation

1. **Phase 1: ChessEngine** (Week 1)
   - Build core engine with listener queue
   - Port primitives and events
   - Implement event processing
   - Write comprehensive tests
   - **Validation**: Can resolve moves with basic listeners

2. **Phase 2: Catalog** (Week 2)
   - Port pieces and tiles
   - Convert decorators to abilities
   - Port rulesets
   - Create registry system
   - Write tests for each ability
   - **Validation**: All old decorators work in new system

3. **Phase 3: ChessManager** (Week 3)
   - Implement manager with history
   - Integrate with ChessEngine and Catalog
   - Write tests
   - **Validation**: Can play full games with undo/redo

### Parallel Development

- **Old code remains intact** in `src/engine/`
- **New code in separate folders**: `src/chess-engine/`, `src/catalog/`, `src/chess-manager/`
- **No breaking changes** to existing code
- **Gradual migration** of tests and features

### Testing Strategy

- **Unit tests** for each module
- **Integration tests** for cross-module interactions
- **Regression tests** comparing old vs new behavior
- **Performance benchmarks** (listener queue vs interceptor pipeline)

---

## Key Design Decisions

### 1. ChessEngine as Static Class
- **Decision**: Static class with no instance state
- **Rationale**: Truly stateless, easier to test, no lifecycle management
- **Alternative considered**: Instance class with empty constructor (rejected - unnecessary complexity)

### 2. Listener Registration
- **Decision**: Listeners passed as parameter to `resolveMove()` / `resolveEvent()`
- **Rationale**: Explicit, no global state, easy to test
- **Source**: Collected from pieces (abilities) and tiles in GameState
- **Collection**: ChessManager collects listeners from current state before calling ChessEngine

### 3. Event Log
- **Decision**: Return event log alongside final state
- **Rationale**: Needed for history, animation, debugging
- **Format**: Array of events in application order

### 4. State Immutability
- **Decision**: GameState remains immutable
- **Rationale**: Enables history, undo, safe simulation
- **Implementation**: Clone on each event application

### 5. Ability Wrapping
- **Decision**: Keep decorator wrapping pattern
- **Rationale**: Modular, composable, familiar pattern
- **Change**: Interface changes from Interceptor to Listener

### 6. Turn Event Handling
- **Decision**: ChessEngine provides `resolveTurn()` that orchestrates turn events
- **Rationale**: Abilities need to react to turn boundaries (e.g., "promote after 3 turns")
- **Flow**: TurnStart → Move → TurnEnd → TurnAdvanced (each goes through listener queue)
- **Alternative**: ChessManager could orchestrate, but keeping it in ChessEngine is cleaner

---

## Design Decisions (Finalized)

1. **ListenerContext**: 
   - ✅ Contains: `{ state: GameState, eventLog: GameEvent[] }`
   - GameState includes `turnNumber`, `currentPlayer`, `board` - no need for separate fields

2. **Event cancellation**: 
   - ✅ When `onBeforeEvent` returns `null`, skip event entirely
   - ✅ Do NOT run `onAfterEvent` listeners for cancelled events

3. **Priority ordering**: 
   - ✅ Lower priority = earlier execution (standard behavior)
   - Sort listeners by priority ascending before processing

4. **Turn events**: 
   - ✅ **Decision**: ChessEngine handles turn events via `resolveTurn()` method
   - `resolveTurn()` orchestrates: TurnStart → Move → TurnEnd → TurnAdvanced
   - Each event goes through the listener queue normally
   - Abilities can listen to turn events (e.g., "auto-promote after 3 turns")
   - ChessManager can call `resolveTurn()` for convenience, or call individual methods

5. **Move validation**: 
   - ✅ `resolveMove()` assumes move is valid
   - Validation happens in `getLegalMoves()` (called by ChessManager before resolveMove)

6. **ChessEngine class design**:
   - ✅ Static class (all methods static)
   - No instance state, truly stateless

---

## Success Criteria

### Phase 1 (ChessEngine)
- ✅ Can resolve a move with listeners
- ✅ State updates incrementally
- ✅ Chain reactions work (explosions, etc.)
- ✅ All unit tests pass
- ✅ Performance comparable to old system

### Phase 2 (Catalog)
- ✅ All old decorators ported to abilities
- ✅ All old tiles ported
- ✅ All old rulesets ported
- ✅ Registry system works
- ✅ All unit tests pass

### Phase 3 (ChessManager)
- ✅ Can play full games
- ✅ History management works
- ✅ Undo/redo works
- ✅ Integration tests pass
- ✅ Can replace old GameEngine in existing code

---

## Next Steps

1. **Review and approve this plan**
2. **Clarify open questions**
3. **Begin Phase 1: ChessEngine implementation**
4. **Iterate based on learnings**

---

*Plan created: 2024*
*Last updated: 2024*
*Status: Approved - Ready for implementation*

