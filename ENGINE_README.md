# Chess Engine Technical Documentation

## Overview

This is a modular chess engine designed for roguelike gameplay with custom pieces and tiles. The engine uses an **event-driven architecture** with an **interceptor pattern** that allows developers to easily add new behaviors without modifying core game logic.

## Core Architecture

### Event-Driven Pipeline

The engine operates on a **canonical event pipeline** where all game actions are represented as immutable `GameEvent` objects. Events flow through an interceptor system before being applied to the game state.

```
Player Action → Event Sequence → Interceptor Pipeline → Canonical Application → State Update
```

### Key Components

1. **GameEngine** - Central orchestrator managing state history and event dispatch
2. **EventPipeline** - Processes events through interceptors
3. **GameState** - Immutable snapshot of board, player, and turn information
4. **Interceptors** - Modular components that can modify or replace events
5. **Decorators** - Piece wrappers that add abilities via interceptors
6. **Tiles** - Board squares that can intercept events and restrict movement

---

## Event System

### Event Types

All events inherit from `GameEvent` and represent discrete game actions:

- **MoveEvent** - A piece moves from one square to another
- **CaptureEvent** - A piece captures another piece
- **DestroyEvent** - A piece is destroyed (non-capture removal)
- **TurnAdvancedEvent** - Turn counter advances, player switches
- **TurnStartEvent** - Signals the start of a player's turn
- **TurnEndEvent** - Signals the end of a player's turn
- **TileChangedEvent** - A tile is replaced with another tile
- **PieceChangedEvent** - A piece is transformed/replaced

### Event Properties

Every event has:
- `id` - Unique identifier
- `sourceId` - ID of the entity that created the event
- `actor` - PlayerColor of the acting player
- `isPlayerAction` - Whether this was initiated by a player move
- `description` - Human-readable description

### Event Sequences

Events are grouped into `EventSequence` objects with a `FallbackPolicy`:

- **ContinueChain** - Continue processing even if this sequence replaces the original event
- **AbortChain** - Stop processing remaining events in the current sequence

---

## Interceptor Pattern

### How It Works

The interceptor pattern allows any entity (piece decorator or tile) to intercept and modify events before they're applied to the game state.

**Interceptor Interface:**
```typescript
interface Interceptor<TEvent extends GameEvent = GameEvent> {
    readonly priority: number;
    intercept(ev: TEvent, state: GameState): EventSequenceLike;
}
```

### Interceptor Collection

The `InterceptorCollector` gathers all interceptors from:
1. **All tiles** on the board
2. **All pieces** on the board (including decorator chains)

For pieces with decorators, the collector unwraps the decorator chain and includes each layer that implements `Interceptor`.

### Priority System

Interceptors are sorted by `priority` (ascending). Lower priority interceptors run first. This allows:
- Early interceptors to validate or prepare events
- Later interceptors to modify or replace events
- Final interceptors to apply side effects

**Common Priority Values:**
- `0` - Default priority (validation, basic effects)
- `1` - Secondary effects (explosions, bounces)
- Higher values - Late-stage modifications

### Interceptor Response

An interceptor can return:

1. **Continue** (`EventSequences.Continue`) - No change, event proceeds canonically
2. **Abort** (`EventSequences.Abort`) - Suppress the event entirely
3. **Replace** (`EventSequences.Single/Many`) - Replace with one or more new events

### Example: Exploding Decorator

```typescript
export class ExplodingDecorator extends PieceDecoratorBase 
    implements Interceptor<CaptureEvent>, Interceptor<DestroyEvent> {
    readonly priority = 1; // Run after basic captures
    
    intercept(ev: DestroyEvent | CaptureEvent, state: GameState): EventSequence {
        // Only react to events targeting this piece
        if (ev.target?.id !== this.id) {
            return EventSequences.Continue;
        }
        
        // Build explosion events for adjacent pieces
        const explode = this.buildExplosionEvents(ev.actor, state);
        return new EventSequence(explode, FallbackPolicy.ContinueChain);
    }
}
```

---

## Game Lifecycle

### Turn Execution Flow

1. **Turn Start** - `TurnStartEvent` is dispatched
2. **Controller Selection** - Current player's controller selects a move
3. **Move Building** - `ProcessMove.buildMoveSequence()` creates:
   - `CaptureEvent` (if target exists)
   - `MoveEvent` (always)
4. **Event Dispatch** - Sequence flows through interceptor pipeline
5. **Canonical Application** - Surviving events mutate state
6. **Turn End** - `TurnEndEvent` is dispatched
7. **Turn Advance** - `TurnAdvancedEvent` switches players

### Event Pipeline Execution

```typescript
dispatch(sequence: EventSequenceLike, simulation: boolean): boolean
```

1. Events are processed in **reverse order** (stack-based)
2. Each event is passed through all interceptors (sorted by priority)
3. First interceptor that returns a replacement sequence wins
4. If `AbortChain` is set, remaining events are cleared
5. Events that survive interception are applied canonically
6. State is updated and pushed to history

### State Management

- **Immutable States** - Each `GameState` is a snapshot
- **History** - `GameEngine` maintains a linear history of `{event, state}` pairs
- **Undo/Redo** - History navigation via `undo()`, `redo()`, `jumpTo()`
- **Simulation** - `Simulation.simulateTurn()` creates temporary engine for move evaluation

---

## Adding New Decorators

### Step 1: Create Decorator Class

```typescript
import { PieceDecoratorBase } from "./PieceDecoratorBase";
import { Interceptor } from "../../events/Interceptor";
import { GameEvent } from "../../events/GameEvent";
import { EventSequence, FallbackPolicy } from "../../events/EventSequence";
import { EventSequences } from "../../events/EventSequences";

export class MyDecorator extends PieceDecoratorBase 
    implements Interceptor<MoveEvent> {
    readonly priority = 0; // Choose appropriate priority
    
    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }
    
    intercept(ev: MoveEvent, state: GameState): EventSequence {
        // Check if this event is relevant
        if (ev.piece.id !== this.id) {
            return EventSequences.Continue;
        }
        
        // Modify or replace the event
        const newEvent = /* ... */;
        return new EventSequence([newEvent], FallbackPolicy.ContinueChain);
    }
    
    protected createDecoratorClone(inner: Piece): Piece {
        return new MyDecorator(inner, this.id);
    }
}
```

### Step 2: Implement Interceptor Logic

- Check if the event is relevant (use `InterceptorGuards` helpers)
- Return `EventSequences.Continue` if not applicable
- Return replacement events if modifying behavior
- Use `FallbackPolicy.AbortChain` to prevent original event

### Step 3: Optional Movement Modifications

Override `getCandidateMoves()` to add new movement options:

```typescript
getCandidateMoves(state: GameState): CandidateMoves {
    const baseMoves = this.inner.getCandidateMoves(state);
    // Add custom moves
    return new CandidateMoves([...baseMoves.moves, ...customMoves]);
}
```

### Decorator Chaining

Decorators can wrap other decorators. The interceptor collector unwraps the entire chain:

```typescript
const piece = new ExplodingDecorator(
    new MarksmanDecorator(
        new Pawn(PlayerColor.White, position)
    )
);
```

Each decorator layer can intercept events independently.

---

## Adding New Tiles

### Step 1: Create Tile Class

```typescript
import { BaseTile } from "./BaseTile";
import { Interceptor } from "../events/Interceptor";
import { MoveEvent } from "../events/GameEvent";
import { EventSequence } from "../events/EventSequence";
import { EventSequences } from "../events/EventSequences";

export class MyTile extends BaseTile implements Interceptor<MoveEvent> {
    readonly priority = 0;
    
    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }
    
    intercept(ev: MoveEvent, state: GameState): EventSequence {
        // Check if event affects this tile
        if (!ev.to.equals(this.position)) {
            return EventSequences.Continue;
        }
        
        // Modify behavior
        return new EventSequence([/* ... */], FallbackPolicy.ContinueChain);
    }
    
    clone(): Tile {
        return new MyTile(this.position, this.id);
    }
    
    // Optional: Restrict movement to this square
    getRestrictedSquares(state: GameState): MovementRestrictions {
        return {
            restrictedSquares: [this.position],
            sourceId: this.id
        };
    }
}
```

### Step 2: Implement Tile Behavior

- Intercept relevant events (MoveEvent, CaptureEvent, etc.)
- Use `this.position` to check if events affect this tile
- Return replacement events or `EventSequences.Continue`

### Step 3: Optional Movement Restrictions

Return `MovementRestrictions` from `getRestrictedSquares()` to prevent pieces from moving to this tile.

---

## Key Patterns

### 1. Event Replacement

Instead of modifying events, interceptors **replace** them with new events:

```typescript
// Bad: Modifying event (events are immutable)
ev.to = newPosition; // ❌

// Good: Replacing with new event
const newEvent = new MoveEvent(ev.from, newPosition, ev.piece, ...);
return EventSequences.Single(newEvent); // ✅
```

### 2. Self-Loop Prevention

Prevent interceptors from reacting to their own events:

```typescript
if (ev.sourceId === this.id) {
    return EventSequences.Continue; // Don't react to own events
}
```

### 3. Player Action Detection

Some behaviors should only trigger on player actions:

```typescript
if (!ev.isPlayerAction) {
    return EventSequences.Continue; // Only react to player moves
}
```

### 4. Position-Based Filtering

Check if events affect the interceptor's position:

```typescript
// For pieces
if (ev.piece.id !== this.id && ev.target?.id !== this.id) {
    return EventSequences.Continue;
}

// For tiles
if (!ev.to.equals(this.position)) {
    return EventSequences.Continue;
}
```

### 5. Building Event Sequences

Create multiple events for complex behaviors:

```typescript
const events: GameEvent[] = [];
events.push(new DestroyEvent(target, "Reason", actor, this.id));
events.push(new MoveEvent(from, to, piece, actor, false, this.id));
return new EventSequence(events, FallbackPolicy.ContinueChain);
```

---

## Simulation and AI

### Move Simulation

The `Simulation` class allows evaluating moves without mutating the main game state:

```typescript
const resultState = Simulation.simulateTurn(
    currentState, 
    move, 
    ruleset
);
```

This creates a temporary `GameEngine`, dispatches events with `simulation: true`, and returns the resulting state.

### AI Integration

Controllers implement `PlayerController`:

```typescript
interface PlayerController {
    selectMove(state: GameState): Move | null;
}
```

AI controllers can use `Simulation.simulateTurn()` to evaluate moves and `state.evaluate()` for position scoring.

---

## Rules and Validation

### RuleSet Interface

```typescript
interface RuleSet {
    getLegalMoves(state: GameState, piece: Piece): Move[];
    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null };
}
```

Rules filter pseudo-legal moves (from `getCandidateMoves()`) into legal moves based on:
- King safety (check/checkmate)
- Turn restrictions
- Custom game mode rules

### Win Conditions

Win conditions are checked via `RuleSet.isGameOver()`. Common conditions:
- Checkmate
- Last piece standing
- Custom victory conditions

---

## Best Practices

### 1. Immutability

- Events are immutable
- GameState is immutable
- Always clone when modifying state

### 2. Interceptor Priority

- Use priority `0` for validation/early effects
- Use priority `1+` for modifications/transformations
- Document priority choices in comments

### 3. Event Filtering

- Always check if events are relevant before processing
- Use `InterceptorGuards` helpers when available
- Return `EventSequences.Continue` early if not applicable

### 4. Testing Interactions

- Test decorator combinations
- Test tile + decorator interactions
- Verify priority ordering
- Check self-loop prevention

### 5. Debugging

The engine includes console logging for:
- Interceptor collection
- Event processing
- Pipeline dispatch

Enable/disable via commented `console.log` statements in `EventPipeline.ts`.

---

## Common Pitfalls

### 1. Forgetting to Clone

```typescript
// ❌ Bad: Mutating state
state.board.movePiece(from, to);

// ✅ Good: Events mutate state
const event = new MoveEvent(from, to, piece, ...);
// Event is applied by engine
```

### 2. Infinite Loops

Always check `sourceId` to prevent reacting to your own events:

```typescript
if (ev.sourceId === this.id) {
    return EventSequences.Continue;
}
```

### 3. Wrong Priority

Lower priority interceptors run first. If you need to run after another interceptor, use a higher priority.

### 4. Not Handling All Event Types

If implementing multiple `Interceptor<T>` interfaces, ensure all are handled:

```typescript
intercept(ev: MoveEvent | CaptureEvent, state: GameState): EventSequence {
    if (ev instanceof MoveEvent) {
        // Handle move
    } else if (ev instanceof CaptureEvent) {
        // Handle capture
    }
    return EventSequences.Continue;
}
```

---

## Architecture Benefits

### Modularity

- New decorators/tiles don't require core changes
- Behaviors are isolated and testable
- Easy to enable/disable features

### Extensibility

- Add new event types for new game mechanics
- Chain decorators for complex behaviors
- Tiles and pieces interact via events

### Testability

- Events are pure data structures
- Interceptors are pure functions (given state)
- Simulation allows move evaluation without side effects

### Maintainability

- Clear separation of concerns
- Event-driven flow is easy to trace
- History system enables debugging

---

## File Structure

```
src/engine/
├── core/
│   ├── GameEngine.ts          # Main orchestrator
│   ├── EventPipeline.ts        # Interceptor processing
│   ├── ProcessMove.ts          # Move → Event conversion
│   ├── Simulation.ts           # Move evaluation
│   ├── Turns.ts                # Turn execution
│   └── action-packages.ts      # Event sequence helpers
├── events/
│   ├── GameEvent.ts            # Event base classes
│   ├── EventSequence.ts        # Event grouping
│   ├── EventSequences.ts       # Common sequences
│   └── Interceptor.ts          # Interceptor interface
├── pieces/
│   ├── Piece.ts                # Piece interface
│   ├── PieceBase.ts            # Base implementation
│   ├── decorators/             # Piece decorators
│   └── standard/               # Standard chess pieces
├── tiles/
│   ├── Tile.ts                 # Tile interface
│   ├── BaseTile.ts             # Base implementation
│   └── [CustomTiles].ts        # Custom tile types
├── state/
│   └── GameState.ts            # Immutable state
├── board/
│   └── Board.ts                # Board grid
└── rules/
    └── RuleSet.ts              # Rules interface
```

---

## Summary

The engine's power comes from its **event-driven, interceptor-based architecture**:

1. **Events** represent all game actions
2. **Interceptors** modify events before application
3. **Decorators** add abilities to pieces via interceptors
4. **Tiles** add board effects via interceptors
5. **Priority** controls interceptor execution order
6. **Immutable states** enable history and simulation

This design allows developers to add new mechanics by:
- Creating decorators that intercept events
- Creating tiles that intercept events
- Using priority to control interaction order
- Returning replacement events to modify behavior

No core engine changes required!

