# Catalog

The **Catalog** defines all game content (pieces, tiles, abilities, rulesets, AI) that conform to the interfaces provided by `ChessEngine`. It's a content library that provides the "what exists" without knowing "how the game runs" - that's handled by `ChessManager` and `ChessEngine`.

## Architecture Overview

The Catalog is organized into several categories:

1. **Pieces** - Base piece types (Pawn, Knight, Bishop, Rook, Queen, King)
2. **Abilities** - Wrapper abilities that modify piece behavior (Marksman, Exploding, Scapegoat, etc.)
3. **Tiles** - Board tiles that can affect gameplay (Standard, Guardian, Fog, Slippery)
4. **Rulesets** - Rule implementations (StandardChess, LastPieceStanding)
5. **AI** - AI implementations (GreedyAI, etc.)
6. **Registry** - Factory functions and metadata for all content

### Key Design Principles

- **Interface Conformance**: All content implements interfaces defined by `ChessEngine`
- **Listener Pattern**: Abilities and tiles implement `Listener` to intercept/modify events
- **Composability**: Abilities wrap pieces, allowing multiple abilities per piece
- **Content Agnostic**: `ChessEngine` doesn't know about specific content types
- **Registry System**: Centralized factory functions for creating content

## Pieces

### Piece Interface

All pieces implement the `Piece` interface defined in `pieces/Piece.ts`:

```typescript
interface Piece {
    readonly id: string;
    readonly name: string;
    readonly owner: PlayerColor;
    position: Vector2Int;
    movesMade: number;
    capturesMade: number;
    
    getCandidateMoves(state: GameState): CandidateMoves;
    getRestrictedSquares(state: GameState): MovementRestrictions | null;
    getValue(): number;
    clone(): Piece;
}
```

### PieceBase

`PieceBase` provides a base implementation with common functionality:

- ID generation
- Position tracking
- Move/capture counters
- Default `getRestrictedSquares()` (returns null)
- Default `clone()` (shallow copy)

Concrete pieces extend `PieceBase` and implement:
- `getCandidateMoves()` - Movement pattern logic
- `getValue()` - Piece value for AI evaluation

### Standard Pieces

Located in `pieces/standard/`:

- **`Pawn`** - Standard chess pawn with auto-promotion (implements `Listener`)
- **`Knight`** - Knight movement (L-shaped jumps)
- **`Bishop`** - Diagonal sliding movement
- **`Rook`** - Horizontal/vertical sliding movement
- **`Queen`** - Combines Bishop + Rook movement
- **`King`** - One square in any direction

### Piece as Listener

Pieces can optionally implement `Listener` to react to events. Example: `Pawn` implements `Listener` to auto-promote when reaching the last rank:

```typescript
export class Pawn extends PieceBase implements Listener {
    readonly priority = 0;
    
    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        if (event instanceof MoveEvent) {
            const movedPiece = ctx.state.board.getPieceAt(event.to);
            if (movedPiece?.id === this.id && this.isOnLastRank(event.to)) {
                return [new PieceChangedEvent(this, newQueen, event.to, ...)];
            }
        }
        return [];
    }
}
```

## Abilities

### Ability Pattern

Abilities wrap pieces using the **Decorator Pattern** to add new behaviors. They extend `AbilityBase` which implements `Piece` and delegates to the inner piece.

### AbilityBase

`AbilityBase` provides the wrapping infrastructure:

```typescript
export abstract class AbilityBase implements Piece {
    protected inner: Piece;
    protected abstract readonly abilityValue: number;
    
    // Delegates all Piece methods to inner
    get name(): string { return this.inner.name; }
    get owner(): PlayerColor { return this.inner.owner; }
    get position(): Vector2Int { return this.inner.position; }
    // ... etc
    
    // Adds ability value to piece value
    getValue(): number {
        return this.inner.getValue() + this.abilityValue;
    }
    
    // Exposes inner piece for unwrapping
    get innerPiece(): Piece { return this.inner; }
}
```

### Ability as Listener

Abilities implement `Listener` to intercept and modify events. The `ChessEngine` automatically collects listeners from ability chains during event processing.

### Available Abilities

#### MarksmanAbility
- **Priority**: 0
- **Value**: +4
- **Behavior**: Allows ranged captures without moving
- **Implementation**: Converts `CaptureEvent` to `DestroyEvent` in `onBeforeEvent`, cancels associated `MoveEvent`

#### ExplodingAbility
- **Priority**: 1
- **Value**: +2
- **Behavior**: Destroys all adjacent pieces when destroyed
- **Implementation**: In `onAfterEvent`, generates `DestroyEvent` for adjacent pieces when self is destroyed

#### ScapegoatAbility
- **Priority**: 0
- **Value**: +0 (not set, defaults to 0)
- **Behavior**: Sacrifices itself to protect adjacent friendly pieces from capture
- **Implementation**: In `onBeforeEvent`, cancels capture and generates self-destruction

#### PiercingAbility
- **Priority**: 1
- **Value**: +3
- **Behavior**: Jumps over target and captures piece behind it
- **Implementation**: In `onBeforeEvent`, replaces `CaptureEvent` with modified move sequence

#### BouncerAbility
- **Priority**: 1
- **Value**: +1
- **Behavior**: Bounces captured enemy backward
- **Implementation**: In `onBeforeEvent`, replaces `CaptureEvent` with modified move sequence

#### CannibalAbility
- **Priority**: N/A (doesn't implement `Listener`)
- **Value**: +1
- **Behavior**: Can only capture friendly pieces
- **Implementation**: Overrides `getCandidateMoves()` to filter/enhance moves

### Ability Chaining

Abilities can wrap other abilities, creating chains:

```typescript
const piece = new Pawn(PlayerColor.White, position);
const withMarksman = new MarksmanAbility(piece);
const withExploding = new ExplodingAbility(withMarksman);
// Result: ExplodingAbility(MarksmanAbility(Pawn))
```

**Listener Collection**: `ChessEngine` unwraps ability chains and collects listeners from each layer:

```typescript
// ChessEngine.collectListeners() unwraps:
let current = piece;
while (current) {
    if (isListener(current)) {
        listeners.push(current);
    }
    if (current.innerPiece) {
        current = current.innerPiece;
    } else {
        break;
    }
}
```

This means each ability layer can independently intercept events.

## Tiles

### Tile Interface

All tiles implement the `Tile` interface defined in `tiles/Tile.ts`:

```typescript
interface Tile {
    id: string;
    position: Vector2Int;
    clone(): Tile;
    getRestrictedSquares(state: GameState): MovementRestrictions | null;
}
```

### BaseTile

`BaseTile` provides a base implementation with:
- ID generation
- Position tracking
- Default `getRestrictedSquares()` (returns null)

Concrete tiles extend `BaseTile` and implement:
- `clone()` - Deep copy for immutability
- `getRestrictedSquares()` - Optional movement restrictions

### Tile as Listener

Tiles can implement `Listener` to intercept events affecting their position. The `ChessEngine` automatically collects listeners from all tiles on the board.

### Available Tiles

#### StandardTile
- **Behavior**: Default empty tile (no special effects)
- **Listener**: No

#### GuardianTile
- **Priority**: 0
- **Behavior**: Protects piece once, then becomes `StandardTile`
- **Implementation**: In `onBeforeEvent`, cancels captures/moves targeting occupant, replaces self with `StandardTile`

#### FogTile
- **Priority**: 0
- **Behavior**: Conceals occupying piece from captures
- **Implementation**: 
  - In `onBeforeEvent`, cancels `CaptureEvent` targeting occupant
  - In `getRestrictedSquares()`, restricts movement to occupied tile

#### SlipperyTile
- **Behavior**: Causes sliding movement (piece continues moving until obstacle)
- **Implementation**: Overrides movement pattern (not via listener)

### Tile Position Awareness

Tiles check their position in event handlers:

```typescript
onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
    if (event instanceof CaptureEvent) {
        if (event.target.position.equals(this.position)) {
            // This tile is affected
        }
    }
    return event;
}
```

## Rulesets

### RuleSet Interface

Rulesets implement the `RuleSet` interface defined by `ChessEngine`:

```typescript
interface RuleSet {
    getLegalMoves(state: GameState, piece: Piece): Move[];
    isGameOver(state: GameState): { over: boolean; winner: PlayerColor | null };
}
```

### Available Rulesets

#### StandardChess
- **Move Validation**: Filters moves that would put king in check
- **Movement Restrictions**: Respects restrictions from pieces and tiles
- **Game Over**: Checkmate/stalemate detection

#### LastPieceStanding
- **Move Validation**: No check restrictions
- **Game Over**: Last piece remaining wins

### Movement Restrictions

Rulesets collect movement restrictions from pieces and tiles:

```typescript
// Collect from pieces
for (const piece of state.board.getAllPieces()) {
    const restriction = piece.getRestrictedSquares?.(state);
    if (restriction) {
        restrictedSquares.add(...restriction.restrictedSquares);
    }
}

// Collect from tiles
for (const tile of state.board.getAllTiles()) {
    const restriction = tile.getRestrictedSquares?.(state);
    if (restriction) {
        restrictedSquares.add(...restriction.restrictedSquares);
    }
}
```

## Registry System

The `Catalog` registry (`registry/Catalog.ts`) provides factory functions and metadata for all content.

### Piece Registry

```typescript
// Factory function
const piece = createPiece("Pawn", PlayerColor.White, position);

// Get definition
const definition = getPieceDefinition("Pawn");
// { id: "Pawn", icon: "pawn", create: ..., klass: ... }

// Get icon
const icon = iconForPiece("Pawn"); // "pawn"
```

### Ability Registry

```typescript
// Apply ability to piece
const enhanced = applyAbility("Marksman", piece, charges);

// Get definition
const definition = getAbilityDefinition("Marksman");
// { id: "Marksman", icon: "🎯", apply: ..., klass: ... }

// Get icon
const icon = iconForAbility("Marksman"); // "🎯"

// Get ability IDs from piece (unwraps chain)
const ids = abilityIdsForPiece(piece); // ["Marksman", "Exploding"]
```

### Tile Registry

```typescript
// Create tile
const tile = createTile("GuardianTile", position, id);

// Get definition
const definition = getTileDefinition("GuardianTile");
// { id: "GuardianTile", icon: "🛡️", create: ..., klass: ... }

// Get icon
const icon = iconForTile("GuardianTile"); // "🛡️"

// Get tile ID from instance
const id = tileIdForInstance(tile); // "GuardianTile"
```

### Type Safety

The registry provides type-safe IDs:

```typescript
export type PieceId = "Pawn" | "Knight" | "Bishop" | "Rook" | "Queen" | "King";
export type AbilityId = "Marksman" | "Exploding" | "Scapegoat" | "Piercing" | "Bouncer" | "Cannibal";
export type TileId = "StandardTile" | "GuardianTile" | "SlipperyTile" | "FogTile";

export const PIECE_IDS: ReadonlyArray<PieceId>;
export const ABILITY_IDS: ReadonlyArray<AbilityId>;
export const TILE_IDS: ReadonlyArray<TileId>;
```

## Integration with ChessEngine

### Listener Collection

`ChessEngine.collectListeners()` automatically collects listeners from:

1. **All tiles on the board** that implement `Listener`
2. **All pieces on the board** (unwrapping ability chains) that implement `Listener`

```typescript
// From ChessEngine.ts
private static collectListeners(state: GameState): Listener[] {
    const listeners: Listener[] = [];
    
    // Collect from tiles
    for (const tile of state.board.getAllTiles()) {
        if (this.isListener(tile)) {
            listeners.push(tile);
        }
    }
    
    // Collect from pieces (unwrapping ability chains)
    for (const piece of state.board.getAllPieces()) {
        let current: any = piece;
        while (current) {
            if (this.isListener(current)) {
                listeners.push(current);
            }
            if (current.innerPiece) {
                current = current.innerPiece;
            } else {
                break;
            }
        }
    }
    
    return listeners;
}
```

### Event Processing

During event processing, listeners are called in priority order:

1. **onBeforeEvent**: Can modify, cancel, or replace events
2. **Event Applied**: State updates immediately
3. **onAfterEvent**: Can generate new events for chain reactions

### Example: Exploding Chain Reaction

```typescript
// 1. CaptureEvent created
// 2. ExplodingAbility.onBeforeEvent: passes through
// 3. CaptureEvent applied: piece destroyed
// 4. ExplodingAbility.onAfterEvent: generates DestroyEvent for adjacent pieces
// 5. New DestroyEvents processed, potentially triggering more explosions
```

### Example: Scapegoat Protection

```typescript
// 1. CaptureEvent targeting friendly piece
// 2. ScapegoatAbility.onBeforeEvent: cancels capture, generates self-destruction
// 3. Original CaptureEvent cancelled (never applied)
// 4. DestroyEvent for scapegoat applied
// 5. Friendly piece saved
```

## Creating Custom Content

### Creating a Custom Ability

```typescript
import { AbilityBase } from "./AbilityBase";
import { Piece } from "../pieces/Piece";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, CaptureEvent } from "../../chess-engine/events/EventRegistry";

export class MyCustomAbility extends AbilityBase implements Listener {
    readonly priority = 1; // Execute after priority 0
    protected readonly abilityValue = 2;
    
    constructor(inner: Piece, id?: string) {
        super(inner, id);
    }
    
    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
        // Example: Double damage on capture
        if (event instanceof CaptureEvent && event.attacker.id === this.id) {
            // Could modify event or generate additional events
            return event; // Pass through for now
        }
        return event;
    }
    
    onAfterEvent(ctx: ListenerContext, event: GameEvent): GameEvent[] {
        // Example: Generate bonus effect after capture
        if (event instanceof CaptureEvent && event.attacker.id === this.id) {
            // Generate new events for chain reactions
            return [/* new events */];
        }
        return [];
    }
    
    protected createAbilityClone(inner: Piece): Piece {
        return new MyCustomAbility(inner, this.id);
    }
}
```

### Creating a Custom Tile

```typescript
import { BaseTile } from "./BaseTile";
import { Tile } from "./Tile";
import { Listener, ListenerContext } from "../../chess-engine/listeners";
import { GameEvent, MoveEvent } from "../../chess-engine/events/EventRegistry";

export class MyCustomTile extends BaseTile implements Listener {
    readonly priority = 0;
    
    constructor(position?: Vector2Int, id?: string) {
        super(position, id);
    }
    
    clone(): Tile {
        return new MyCustomTile(this.position, this.id);
    }
    
    onBeforeEvent(ctx: ListenerContext, event: GameEvent): GameEvent | null {
        // Example: Slow movement on this tile
        if (event instanceof MoveEvent && event.to.equals(this.position)) {
            // Could cancel move, modify it, or generate effects
            return event;
        }
        return event;
    }
    
    getRestrictedSquares(state: GameState): MovementRestrictions | null {
        // Optional: Restrict movement to/from this tile
        return null;
    }
}
```

### Creating a Custom Piece

```typescript
import { PieceBase } from "../PieceBase";
import { GameState } from "../../chess-engine/state/GameState";
import { CandidateMoves } from "../../chess-engine/rules/MovementPatterns";
import { Move } from "../../chess-engine/primitives/Move";

export class MyCustomPiece extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("MyCustomPiece", owner, position);
    }
    
    getValue(): number {
        return 5; // Piece value for AI
    }
    
    getCandidateMoves(state: GameState): CandidateMoves {
        const moves: Move[] = [];
        // Implement movement pattern
        // ...
        return new CandidateMoves(moves);
    }
}
```

### Registering Custom Content

Add to `registry/Catalog.ts`:

```typescript
// Add to pieceDefinitions
{
    id: "MyCustomPiece",
    icon: "custom",
    create: (owner: PlayerColor, position: Vector2Int) => new MyCustomPiece(owner, position),
    klass: MyCustomPiece as PieceConstructor,
},

// Add to abilityDefinitions
{
    id: "MyCustomAbility",
    icon: "✨",
    apply: (piece: Piece) => new MyCustomAbility(piece),
    klass: MyCustomAbility as AbilityConstructor,
},

// Add to tileDefinitions
{
    id: "MyCustomTile",
    icon: "🔷",
    create: (position?: Vector2Int, id?: string) => new MyCustomTile(position, id),
    klass: MyCustomTile as TileConstructor,
},
```

## Best Practices

### Priority Guidelines

- **Priority 0**: Early processing, validation, basic effects (Marksman, Scapegoat, Guardian)
- **Priority 1**: Secondary effects, modifications (Exploding, Piercing, Bouncer)
- **Priority 2+**: Late-stage modifications, final effects

### Listener Implementation

- **Check event type**: Use `instanceof` to filter relevant events
- **Check position/identity**: Verify the event affects this entity
- **Avoid self-loops**: Check `event.sourceId` to avoid processing own events
- **Use live state**: Access `ctx.state` for current board state (not stale references)
- **Return appropriately**: 
  - `null` to cancel
  - Modified event to replace
  - Array to replace with multiple events
  - Same event or `undefined` to pass through

### Ability Design

- **Delegation**: Always delegate to `inner` for base behavior
- **Cloning**: Implement `createAbilityClone()` to preserve ability state
- **Value**: Set `abilityValue` for AI evaluation
- **Unwrapping**: Expose `innerPiece` for listener collection

### Tile Design

- **Position awareness**: Check `this.position` in event handlers
- **Cloning**: Implement `clone()` for immutability
- **Restrictions**: Use `getRestrictedSquares()` for movement restrictions (not listeners)

## File Structure

```
catalog/
├── abilities/
│   ├── AbilityBase.ts          # Base class for abilities
│   ├── MarksmanAbility.ts      # Ranged capture ability
│   ├── ExplodingAbility.ts     # Chain explosion ability
│   ├── ScapegoatAbility.ts     # Protection ability
│   ├── PiercingAbility.ts      # Jump-over ability
│   ├── BouncerAbility.ts       # Bounce-back ability
│   ├── CannibalAbility.ts      # Friendly-capture ability
│   └── index.ts
├── pieces/
│   ├── Piece.ts                # Piece interface
│   ├── PieceBase.ts            # Base piece implementation
│   ├── standard/               # Standard chess pieces
│   │   ├── Pawn.ts
│   │   ├── Knight.ts
│   │   ├── Bishop.ts
│   │   ├── Rook.ts
│   │   ├── Queen.ts
│   │   └── King.ts
│   └── index.ts
├── tiles/
│   ├── Tile.ts                 # Tile interface
│   ├── BaseTile.ts             # Base tile implementation
│   ├── StandardTile.ts         # Default tile
│   ├── GuardianTile.ts         # Protection tile
│   ├── FogTile.ts              # Concealment tile
│   ├── SlipperyTile.ts         # Sliding movement tile
│   └── index.ts
├── rulesets/
│   ├── StandardChess.ts         # Standard chess rules
│   ├── LastPieceStanding.ts    # Survival rules
│   ├── CheckRules.ts           # Check detection
│   ├── CheckmateCondition.ts   # Checkmate detection
│   └── index.ts
├── ai/
│   ├── AI.ts                   # AI interface
│   ├── GreedyAI.ts             # Greedy AI implementation
│   └── index.ts
├── registry/
│   ├── Catalog.ts              # Registry and factory functions
│   └── index.ts
└── index.ts
```

## Testing

Each content type includes comprehensive tests:

- **Abilities**: `abilities/__tests__/` - Test each ability's behavior
- **Pieces**: `pieces/standard/__tests__/` - Test movement patterns
- **Tiles**: `tiles/__tests__/` - Test tile effects

Tests verify:
- Listener behavior (event interception/modification)
- Movement patterns
- Chain reactions
- Edge cases

## Design Notes

- **Content Library**: Catalog is a library of content, not game logic
- **Interface Conformance**: All content conforms to `ChessEngine` interfaces
- **Composability**: Abilities can be combined, tiles can be placed anywhere
- **Listener Pattern**: Primary mechanism for extending behavior
- **Registry System**: Centralized factory functions for content creation
- **Type Safety**: Registry provides type-safe IDs and factory functions

