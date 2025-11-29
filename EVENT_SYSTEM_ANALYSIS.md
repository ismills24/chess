# Event System & Shared Utilities Analysis

## Main Event System Architecture

### Core Components

#### 1. **GameEngine** (`src/engine/core/GameEngine.ts`)
- Central orchestrator managing game state history
- Maintains a history array of `{ event: GameEvent, state: GameState }` pairs
- Provides undo/redo functionality via history navigation
- Applies canonical events to state through `applyEventToState()`
- Exposes `_applyCanonical()` for the EventPipeline to use

#### 2. **EventPipeline** (`src/engine/core/GameEngine.EventPipeline.ts`)
- **Main dispatch mechanism**: `GameEngine.prototype.dispatch()`
- Processes `EventSequenceLike` objects through an interceptor pipeline
- **Flow**:
  1. Takes an `EventSequence` (array of events + fallback policy)
  2. Processes events in reverse order (stack-based)
  3. For each event, runs through interceptors (tiles, pieces, decorators)
  4. If an interceptor returns replacements, pushes them onto the stack
  5. If no interceptor modifies the event, applies it canonically to state
  6. Supports `AbortChain` to stop processing remaining events

#### 3. **GameEvent** (`src/engine/events/GameEvent.ts`)
- Base abstract class for all events
- Immutable events with: `id`, `sourceId`, `actor`, `isPlayerAction`, `description`
- Concrete event types:
  - `MoveEvent`: Piece movement
  - `CaptureEvent`: Piece captures another
  - `DestroyEvent`: Piece is destroyed
  - `TurnAdvancedEvent`: Turn progression
  - `TurnStartEvent` / `TurnEndEvent`: Turn lifecycle
  - `TileChangedEvent`: Tile replacement
  - `PieceChangedEvent`: Piece transformation

#### 4. **EventSequence** (`src/engine/events/EventSequence.ts`)
- Wraps arrays of events with a `FallbackPolicy`
- `FallbackPolicy.ContinueChain`: Continue processing even if empty
- `FallbackPolicy.AbortChain`: Stop processing remaining events

#### 5. **Interceptor** (`src/engine/events/Interceptor.ts`)
- Interface: `intercept(ev: GameEvent, state: GameState): EventSequenceLike`
- Objects implementing this can modify/replace events
- Priority-based ordering (lower priority runs first)
- **InterceptorGuards** utility:
  - `isTarget(self, ev)`: Check if event targets this piece
  - `isSource(self, ev)`: Check if event originated from this piece
  - `isAttacker(self, ev)`: Check if this piece is the attacker

### Event Flow Example

```
1. Player selects move → ProcessMove.buildMoveSequence()
2. Creates EventSequence: [CaptureEvent, MoveEvent]
3. GameEngine.dispatch(sequence)
4. EventPipeline processes each event:
   - Collects all interceptors (tiles + pieces + decorators)
   - Sorts by priority
   - Calls intercept() on each
   - If replacement returned → push to stack
   - If no replacement → apply canonically
5. State updated, history appended
```

---

## Shared Utilities Used by Decorators, Pieces, and Tiles

### 1. **EventSequences** (`src/engine/events/EventSequences.ts`)
**Purpose**: Convenience factory for common interceptor return values

**Used by**:
- ✅ **Decorators**: ExplodingDecorator, PiercingDecorator, MarksmanDecorator, ScapegoatDecorator, CannibalDecorator
- ✅ **Tiles**: GuardianTile, FogTile

**API**:
- `EventSequences.Continue`: No-op, let event proceed
- `EventSequences.Abort`: Suppress event entirely
- `EventSequences.Single(ev)`: Wrap one event with Continue
- `EventSequences.Many(evs)`: Wrap multiple events with Continue

**Example Usage**:
```typescript
// In ExplodingDecorator
if (!isTargetSelf) {
    return EventSequences.Continue as EventSequence;
}
```

### 2. **ActionPackages** (`src/engine/core/action-packages.ts`)
**Purpose**: Factory for creating EventSequences (action packages)

**Used by**:
- ✅ **Core**: ProcessMove.ts, Turns.ts

**API**:
- `ActionPackages.pack(events, fallback)`: Create EventSequence
- `ActionPackages.single(ev, fallback)`: Single event wrapper
- `ActionPackages.emptyContinue`: Empty sequence with Continue
- `ActionPackages.emptyAbort`: Empty sequence with Abort

**Example Usage**:
```typescript
// In ProcessMove.buildMoveSequence()
return ActionPackages.pack(events, FallbackPolicy.AbortChain);
```

### 3. **InterceptorGuards** (`src/engine/events/Interceptor.ts`)
**Purpose**: Helper functions for checking event relationships

**Used by**:
- ⚠️ **Currently defined but NOT actively used** (decorators implement checks manually)

**API**:
- `InterceptorGuards.isTarget(self, ev)`: Is this piece the target?
- `InterceptorGuards.isSource(self, ev)`: Did this piece originate the event?
- `InterceptorGuards.isAttacker(self, ev)`: Is this piece the attacker?

**Note**: While defined, decorators like ExplodingDecorator and ScapegoatDecorator implement similar logic manually instead of using these helpers.

### 4. **MovementHelper** (`src/engine/pieces/MovementHelper.ts`)
**Purpose**: Common movement pattern utilities

**Used by**:
- ✅ **Pieces**: Standard chess pieces (Bishop, Rook, Queen, etc.)
- ✅ **Decorators**: MarksmanDecorator (extends candidate moves)

**API**:
- `MovementHelper.getSlidingMoves()`: Generate sliding moves (rook, bishop, queen)
- `MovementHelper.getJumpMoves()`: Generate jump moves (knight)
- `CandidateMoves`: Class holding moves categorized by target type
- `MovementRestrictions`: Interface for restricting squares

**Example Usage**:
```typescript
// In Bishop
getCandidateMoves(state: GameState): CandidateMoves {
    return MovementHelper.getSlidingMoves(
        this, state,
        new Vector2Int(1, 1), new Vector2Int(1, -1),
        new Vector2Int(-1, 1), new Vector2Int(-1, -1)
    );
}
```

### 5. **Interceptor Interface** (`src/engine/events/Interceptor.ts`)
**Purpose**: Contract for event interception

**Used by**:
- ✅ **Decorators**: All decorators that modify events (Exploding, Piercing, Marksman, Scapegoat, etc.)
- ✅ **Tiles**: GuardianTile, FogTile (and potentially others)

**Implementation Pattern**:
```typescript
class MyDecorator extends PieceDecoratorBase implements Interceptor<CaptureEvent> {
    readonly priority = 0; // Lower = runs first
    
    intercept(ev: CaptureEvent, state: GameState): EventSequence {
        // Check if this interceptor should handle the event
        if (!shouldHandle(ev)) {
            return EventSequences.Continue;
        }
        
        // Return replacement events or abort
        return new EventSequence([...newEvents], FallbackPolicy.AbortChain);
    }
}
```

---

## Files Using Shared Utilities

### EventSequences Usage:
- `src/engine/pieces/decorators/ExplodingDecorator.ts`
- `src/engine/pieces/decorators/PiercingDecorator.ts`
- `src/engine/pieces/decorators/MarksmanDecorator.ts`
- `src/engine/pieces/decorators/ScapegoatDecorator.ts`
- `src/engine/pieces/decorators/CannibalDecorator.ts`
- `src/engine/tiles/GuardianTile.ts`
- `src/engine/tiles/FogTile.ts`

### ActionPackages Usage:
- `src/engine/core/ProcessMove.ts`
- `src/engine/core/Turns.ts`

### MovementHelper Usage:
- `src/engine/pieces/standard/Bishop.ts`
- `src/engine/pieces/standard/Rook.ts`
- `src/engine/pieces/standard/Queen.ts`
- `src/engine/pieces/standard/Knight.ts`
- `src/engine/pieces/decorators/MarksmanDecorator.ts`

### InterceptorGuards Usage:
- ⚠️ **Currently unused** - defined but decorators implement checks manually

---

## Key Design Patterns

### 1. **Decorator Pattern**
- `PieceDecoratorBase` wraps inner pieces
- Decorators can intercept events and modify behavior
- Decorator chains are unwrapped by `InterceptorCollector`

### 2. **Interceptor Pipeline**
- Priority-based execution
- Can replace events with new sequences
- Can abort entire event chains
- Works across tiles, pieces, and decorators

### 3. **Event-Driven State Management**
- All state changes go through events
- Events are immutable
- History allows undo/redo
- Simulation mode for AI evaluation

### 4. **Shared Utility Pattern**
- `EventSequences`: Common interceptor return values
- `ActionPackages`: EventSequence factory
- `MovementHelper`: Movement pattern utilities
- All designed to reduce boilerplate in decorators/pieces/tiles

---

## Summary

The event system is **centralized** around:
- **GameEngine**: State management and history
- **EventPipeline**: Interceptor-based event processing
- **GameEvent**: Immutable event types
- **EventSequence**: Event packaging with fallback policies

**Shared utilities** provide:
- **EventSequences**: Common interceptor responses (used by 7+ files)
- **ActionPackages**: EventSequence factories (used by core files)
- **MovementHelper**: Movement patterns (used by standard pieces)
- **InterceptorGuards**: Event relationship checks (defined but unused)

The system enables **composable behavior** through decorators and tiles that can intercept and modify events, creating a flexible, event-driven architecture.





