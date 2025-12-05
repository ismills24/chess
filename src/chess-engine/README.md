# Chess Engine

A pure, stateless chess game engine implementing a **listener queue model** for event-driven game mechanics. This engine processes moves and events through a linear queue where listeners can observe and modify events before and after they're applied to state.

## Architecture Overview

The chess engine is built around three core concepts:

1. **Events** - Immutable objects representing game actions (moves, captures, turn changes, etc.)
2. **Listeners** - Objects that can observe and modify events during processing
3. **Event Queue** - Linear processing pipeline that applies events incrementally to state

### Key Design Principles

- **Stateless**: All methods are static - no instance state
- **Incremental State Updates**: State updates immediately after each event (not batched)
- **Live State Access**: Listeners always see the current state, never stale references
- **Linear Processing**: Events processed in a queue (no recursion)
- **Immutability**: GameState is immutable - each event creates a new state

## Event System

### Event Types

All events extend the base `Event` class and are defined in `events/EventRegistry.ts`:

#### Core Game Events

- **`MoveEvent`** - A piece moves from one position to another
  - Properties: `from`, `to`, `piece`, `actor`, `isPlayerAction`
  - Created when a move is executed

- **`CaptureEvent`** - A piece captures another piece
  - Properties: `attacker`, `target`, `actor`, `isPlayerAction`
  - Created when a move targets an enemy piece

- **`DestroyEvent`** - A piece is destroyed (non-capture removal)
  - Properties: `target`, `reason`, `actor`, `sourceId`
  - Created by listeners for chain reactions (explosions, etc.)

#### Turn Management Events

- **`TurnStartEvent`** - Signals the start of a turn
  - Properties: `player`, `turnNumber`
  - Informational event (no state change)

- **`TurnEndEvent`** - Signals the end of a turn
  - Properties: `player`, `turnNumber`
  - Informational event (no state change)

- **`TurnAdvancedEvent`** - Player switch and turn increment
  - Properties: `nextPlayer`, `turnNumber`
  - Updates `currentPlayer` and `turnNumber` in state

#### State Modification Events

- **`TileChangedEvent`** - A tile is replaced at a position
  - Properties: `position`, `newTile`, `actor`
  - Used for tile transformations

- **`PieceChangedEvent`** - A piece is transformed into another piece
  - Properties: `oldPiece`, `newPiece`, `position`, `actor`
  - Used for piece transformations (promotions, etc.)

#### Game Status Events

- **`TimeOutEvent`** - A player's time has expired
  - Properties: `expiredPlayer`
  - Should be converted to `GameOverEvent` by listeners

- **`GameOverEvent`** - The game has ended
  - Properties: `losingPlayer`
  - Informational event (no state change)

### Event Properties

All events have these common properties:

- **`id`** - Unique identifier (UUID)
- **`sourceId`** - ID of the entity that created the event
- **`actor`** - The player who initiated the action
- **`isPlayerAction`** - Whether this was a direct player action (vs. system-generated)
- **`description`** - Human-readable description for debugging

## Listener System

### Listener Interface

Listeners implement the `Listener` interface defined in `listeners/Listener.ts`:

```typescript
interface Listener {
    readonly priority: number;
    
    onBeforeEvent?(ctx: ListenerContext, event: GameEvent): 
        GameEvent | GameEvent[] | null | undefined;
    
    onAfterEvent?(ctx: ListenerContext, event: GameEvent): GameEvent[];
}
```

### Listener Hooks

#### `onBeforeEvent`

Called **before** an event is applied to state. Can:

- **Modify the event**: Return a modified event to replace the original
- **Cancel the event**: Return `null` to prevent the event from being applied
- **Replace with multiple events**: Return an array of events to cancel the original and enqueue all new events
- **Pass through**: Return `undefined` or the same event to allow it through unchanged

**Important**: If an event is cancelled in `onBeforeEvent`, `onAfterEvent` will **not** be called for that event.

#### `onAfterEvent`

Called **after** an event has been applied to state. Can:

- **Generate new events**: Return an array of new events to enqueue
- **No action**: Return an empty array or `undefined`

**Important**: Only called if the event was not cancelled in `onBeforeEvent`.

### Listener Priority

Listeners are executed in **priority order** (lower priority = earlier execution):

- **Priority 0**: Early processing, validation, basic effects
- **Priority 1**: Secondary effects (explosions, bounces)
- **Priority 2+**: Late-stage modifications, final effects

When multiple listeners have the same priority, execution order is undefined (but deterministic based on collection order).

### Listener Context

Listeners receive a `ListenerContext` object with:

- **`state`**: Current live state (includes `board`, `currentPlayer`, `turnNumber`, etc.)
- **`eventLog`**: Read-only array of events applied so far in this resolution

**Key Point**: The state in the context is **always up-to-date** - listeners see the board exactly as it is right now, not a frozen snapshot.

### Listener Collection

Listeners are automatically collected from:

1. **Tiles** - All tiles on the board that implement `Listener`
2. **Pieces** - All pieces (including unwrapping ability chains) that implement `Listener`

The `ChessEngine.collectListeners()` method handles this collection, unwrapping ability decorator chains to collect listeners from each layer.

## Event Queue Processing

The `EventQueue` class (`core/EventQueue.ts`) implements the linear event processing pipeline.

### Processing Algorithm

```
1. Start with initial events (from move or single event)
2. Create event queue: Queue<GameEvent>
3. While queue not empty:
   a. Pop next event
   b. Collect all listeners, sort by priority (lower = earlier)
   c. Run onBeforeEvent listeners (priority order, ascending)
      - If any returns null → cancel event, skip to next (no onAfterEvent)
      - If any modifies event → use modified version for subsequent listeners
      - If any returns array → cancel original, enqueue all new events at front
   d. If event not cancelled:
      - Apply event to current state → new state
      - Run onAfterEvent listeners (priority order, ascending)
      - Collect all new events from listeners
      - Enqueue new events
      - Update current state
4. Return final state + event log
```

### Key Features

- **Incremental Updates**: State updates immediately after each event
- **Live State**: Listeners always see the current state, not a frozen snapshot
- **Linear Processing**: Events processed one at a time in queue order
- **Chain Reactions**: `onAfterEvent` can generate new events that are processed next
- **Event Cancellation**: Events can be cancelled in `onBeforeEvent`
- **Event Replacement**: Events can be replaced with different events or multiple events

### Special Handling

#### MoveEvent/CaptureEvent Coupling

When a `CaptureEvent` is cancelled or replaced, the associated `MoveEvent` is automatically cancelled to prevent invalid state (piece moving to a position where capture didn't happen).

#### Replacement Events

When `onBeforeEvent` returns an array of events, they are enqueued at the **front** of the queue (processed first) to ensure replacement events are handled before any remaining events.

## Event Application

The `EventApplier` class (`core/EventApplier.ts`) handles the actual state mutation for each event type:

- **`MoveEvent`**: Moves a piece on the board, increments `movesMade` counter
- **`CaptureEvent`**: Removes the target piece from the board
- **`DestroyEvent`**: Removes a piece from the board (non-capture)
- **`TurnAdvancedEvent`**: Updates `currentPlayer` and `turnNumber`
- **`TileChangedEvent`**: Replaces a tile at a position
- **`PieceChangedEvent`**: Replaces a piece with a new piece
- **`TurnStartEvent`**, **`TurnEndEvent`**, **`TimeOutEvent`**, **`GameOverEvent`**: Informational events (no state change)

**Important**: `EventApplier` creates a **new immutable GameState** - it never mutates the existing state.

## ChessEngine API

The `ChessEngine` class (`core/ChessEngine.ts`) provides the main entry points:

### `resolveMove(initialState, move)`

Resolves a move and returns the resulting state + event log.

```typescript
const result = ChessEngine.resolveMove(state, move);
// result.finalState - new state after move
// result.eventLog - array of all events that were applied
```

**Process**:
1. Collects listeners from current state
2. Converts move to initial events (`CaptureEvent` + `MoveEvent` if applicable)
3. Processes through `EventQueue`
4. Returns final state and event log

### `resolveEvent(initialState, event)`

Resolves a single event (useful for turn boundary events).

```typescript
const result = ChessEngine.resolveEvent(state, new TurnStartEvent(...));
// result.finalState - new state after event
// result.eventLog - array of all events that were applied
```

### `getLegalMoves(state, piece, ruleset)`

Gets legal moves for a piece according to the ruleset.

```typescript
const moves = ChessEngine.getLegalMoves(state, piece, ruleset);
// Returns array of Move objects
```

### `isGameOver(state, ruleset)`

Checks if the game is over according to the ruleset.

```typescript
const status = ChessEngine.isGameOver(state, ruleset);
// status.over - boolean
// status.winner - PlayerColor | null
```

## Usage Example

```typescript
import { ChessEngine } from './chess-engine';
import { GameState } from './chess-engine/state';
import { Move } from './chess-engine/primitives';

// Create initial state
const initialState = new GameState(board, PlayerColor.White, 1, []);

// Create a move
const move = new Move(from, to, piece);

// Resolve the move
const result = ChessEngine.resolveMove(initialState, move);

// Use the result
console.log('Final state:', result.finalState);
console.log('Events applied:', result.eventLog);
```

## Creating Custom Listeners

To create a custom listener (e.g., for an ability or tile):

```typescript
import { Listener, ListenerContext } from './chess-engine/listeners';
import { GameEvent, CaptureEvent } from './chess-engine/events/EventRegistry';

class MyAbility implements Listener {
    readonly priority = 1; // Execute after priority 0 listeners
    
    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
        // Example: Cancel captures of friendly pieces
        if (event instanceof CaptureEvent) {
            if (event.attacker.owner === event.target.owner) {
                return null; // Cancel the capture
            }
        }
        return event; // Pass through unchanged
    }
    
    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        // Example: Generate explosion after capture
        if (event instanceof CaptureEvent) {
            return [
                new DestroyEvent(
                    event.attacker,
                    "exploded",
                    event.actor,
                    event.attacker.id
                )
            ];
        }
        return []; // No new events
    }
}
```

## File Structure

```
chess-engine/
├── core/
│   ├── ChessEngine.ts      # Main entry point (static methods)
│   ├── EventQueue.ts        # Linear event queue processor
│   └── EventApplier.ts      # Applies events to state
├── events/
│   ├── Event.ts             # Base Event class and concrete types
│   ├── EventRegistry.ts     # Union type of all events
│   └── types.ts             # Event-related types
├── listeners/
│   ├── Listener.ts          # Listener interface
│   └── ListenerContext.ts   # Context passed to listeners
├── state/
│   ├── GameState.ts         # Immutable game state
│   ├── Board.ts             # Board container
│   └── types.ts             # State-related types
├── primitives/
│   ├── Move.ts              # Move representation
│   ├── PlayerColor.ts      # Player enumeration
│   └── Vector2Int.ts       # 2D coordinates
└── rules/
    ├── RuleSet.ts           # Rules interface
    └── MovementPatterns.ts  # Movement utilities
```

## Testing

The engine includes comprehensive tests in `core/__tests__/`:

- `EventQueue.test.ts` - Event queue processing
- `EventQueue.edge-cases.test.ts` - Edge cases and special scenarios
- `EventApplier.test.ts` - Event application logic
- `StateImmutability.test.ts` - Immutability guarantees
- `ChessEngine.test.ts` - Main engine functionality

## Design Notes

- **Stateless Design**: All methods are static - no instance state. This makes the engine easier to test and reason about.
- **Immutability**: GameState is immutable - each event creates a new state. This enables history, undo/redo, and safe simulation.
- **Content Agnostic**: The engine doesn't know about specific piece types or abilities - it only knows about the `Listener` interface and event types.
- **Deterministic**: Given the same inputs (state, move, listeners), the engine always produces the same output.

