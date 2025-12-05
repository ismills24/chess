# Chess Manager

A match orchestrator that manages a single chess game from start to finish. `ChessManager` maintains game state history, orchestrates turn flow, and provides move execution, undo/redo, and AI integration. It delegates all game logic to `ChessEngine`, acting as a thin orchestration layer around the stateless engine.

## Architecture Overview

`ChessManager` sits between the game engine and higher-level systems (like a roguelike game manager). It provides:

1. **State History Management** - Maintains a linear history of game states and event logs
2. **Turn Orchestration** - Coordinates turn boundaries (TurnStart → Move → TurnEnd → TurnAdvanced)
3. **Move Execution** - Validates and executes moves, tracking timing information
4. **History Navigation** - Provides undo/redo and jump-to functionality
5. **AI Integration** - Executes AI turns by delegating to AI implementations

### Key Design Principles

- **Stateful**: Maintains history and current position (unlike stateless `ChessEngine`)
- **Orchestration Layer**: Delegates all game logic to `ChessEngine`
- **Turn Management**: Handles turn boundaries since `ChessEngine` is turn-agnostic
- **History Preservation**: Stores complete state snapshots and event logs for undo/redo
- **Performance Tracking**: Records timing information for move resolution

## Core Responsibilities

### What ChessManager Does

✅ **Maintains History**
- Stores linear array of `{ state, eventLog, resolveTimeMs }` entries
- Tracks current position in history (`currentIndex`)
- Provides undo/redo navigation

✅ **Orchestrates Turns**
- Coordinates `TurnStartEvent` → `Move` → `TurnEndEvent` → `TurnAdvancedEvent`
- Manages player alternation and turn number increment
- Handles optional turn advancement

✅ **Executes Moves**
- Validates move has a piece
- Delegates to `ChessEngine.resolveMove()` for actual resolution
- Collects and stores event logs
- Tracks resolution timing

✅ **Provides Game Status**
- Delegates to `ChessEngine` for legal moves
- Delegates to `ChessEngine` for game over detection
- Exposes current state and history

✅ **AI Integration**
- Verifies it's the AI's turn
- Gets legal moves and delegates to AI for selection
- Executes AI-selected move

### What ChessManager Does NOT Do

❌ **Game Logic**
- Does not know about listeners (collected internally by `ChessEngine`)
- Does not know about event types (just passes through event logs)
- Does not know about piece types (just uses `Piece` interface)
- Does not validate move legality (delegates to `RuleSet`)

❌ **State Mutation**
- Never mutates state directly
- All state changes go through `ChessEngine`

❌ **Content Definition**
- Does not define pieces, tiles, abilities, or rulesets
- Uses interfaces provided by `ChessEngine` and `Catalog`

## ChessManager API

### Construction

```typescript
const manager = new ChessManager(initialState: GameState, ruleset: RuleSet);
```

- **`initialState`**: Starting game state (board, current player, turn number)
- **`ruleset`**: Rule set implementation for move validation and game over detection

The initial state is automatically added to history at index 0.

### State Access

#### `currentState: GameState`

Returns the current game state (read-only).

```typescript
const state = manager.currentState;
// Access: state.board, state.currentPlayer, state.turnNumber, etc.
```

#### `history: readonly Array<{ state, eventLog, resolveTimeMs? }>`

Returns the full history of states, event logs, and timing information.

```typescript
const history = manager.history;
// history[0] - initial state (no eventLog, no resolveTimeMs)
// history[1] - after first move
// history[2] - after second move
// etc.
```

Each history entry contains:
- **`state`**: GameState snapshot at this point
- **`eventLog`**: Read-only array of events that were applied
- **`resolveTimeMs`**: Optional timing information (milliseconds) for move resolution

#### `currentIndex: number`

Returns the current position in history (0-based).

```typescript
const index = manager.currentIndex;
// 0 = initial state
// 1 = after first move
// etc.
```

### Move Execution

#### `playMove(move: Move, advanceTurn: boolean = true)`

Executes a move and advances the game state.

```typescript
const result = manager.playMove(move, true);
// result.success - whether move was executed successfully
// result.newState - new state after move
// result.eventLog - all events that were applied
// result.resolveTimeMs - time taken to resolve (milliseconds)
```

**Process**:
1. Validates move has a piece
2. Starts timing
3. Orchestrates turn events:
   - `TurnStartEvent` for current player/turn
   - `ChessEngine.resolveMove()` for the move
   - `TurnEndEvent` for current player/turn
   - `TurnAdvancedEvent` (if `advanceTurn` is true)
4. Collects all event logs
5. Adds new state to history
6. Returns result with timing information

**Turn Orchestration**:
- `ChessEngine` is turn-agnostic, so `ChessManager` handles turn boundaries
- Each turn event goes through the listener queue independently
- State updates incrementally after each event

**Return Value**:
- `success: false` if move has no piece
- `success: true` with new state, event log, and timing if move executed

#### `playAITurn(playerColor: PlayerColor, ai: AI)`

Executes an AI turn for the specified player.

```typescript
const result = manager.playAITurn(PlayerColor.Black, greedyAI);
// Same return type as playMove()
```

**Process**:
1. Verifies it's the AI's turn (`state.currentPlayer === playerColor`)
2. Gets legal moves for current player
3. Delegates to AI to select a move
4. Executes the selected move with `playMove(move, true)`

**Return Value**:
- `success: false` if not AI's turn or AI returns null
- `success: true` with move result if AI turn executed

**Note**: AI selection time is not included in `resolveTimeMs` - only move resolution time is tracked.

### Legal Moves

#### `getLegalMoves(): Move[]`

Gets all legal moves for the current player.

```typescript
const moves = manager.getLegalMoves();
// Returns array of Move objects for all pieces of currentPlayer
```

**Process**:
1. Gets all pieces of `currentPlayer` from board
2. For each piece, calls `ChessEngine.getLegalMoves(state, piece, ruleset)`
3. Collects and returns all moves

#### `getLegalMovesForPiece(piece: Piece): Move[]`

Gets legal moves for a specific piece.

```typescript
const moves = manager.getLegalMovesForPiece(piece);
// Returns array of Move objects for this piece
```

### Game Status

#### `isGameOver(): boolean`

Checks if the game is over.

```typescript
const over = manager.isGameOver();
// Returns true if game is over, false otherwise
```

Delegates to `ChessEngine.isGameOver(state, ruleset)`.

#### `getWinner(): PlayerColor | null`

Gets the winner of the game, if any.

```typescript
const winner = manager.getWinner();
// Returns PlayerColor if game over with winner, null otherwise
```

Delegates to `ChessEngine.isGameOver(state, ruleset)`.

### History Navigation

#### `undo(): void`

Goes back one step in history.

```typescript
manager.undo();
// Moves currentIndex back by 1 (minimum: 0)
```

**Behavior**:
- Decrements `currentIndex` if `currentIndex > 0`
- Does nothing if already at initial state

#### `redo(): void`

Goes forward one step in history.

```typescript
manager.redo();
// Moves currentIndex forward by 1 (maximum: history.length - 1)
```

**Behavior**:
- Increments `currentIndex` if not at end of history
- Does nothing if already at latest state

#### `jumpTo(index: number): void`

Jumps to a specific point in history.

```typescript
manager.jumpTo(5);
// Sets currentIndex to 5 (if valid)
```

**Behavior**:
- Sets `currentIndex` to `index` if `0 <= index < history.length`
- Does nothing if index is out of bounds

#### `undoLastMove(): void`

Convenience method that calls `undo()`.

```typescript
manager.undoLastMove();
// Same as manager.undo()
```

## Usage Examples

### Basic Game Flow

```typescript
import { ChessManager } from './chess-manager';
import { GameState } from './chess-engine/state';
import { Board } from './chess-engine/state';
import { StandardChessRuleSet } from './catalog/rulesets';
import { Move } from './chess-engine/primitives';
import { PlayerColor } from './chess-engine/primitives';

// Create initial state
const board = new Board(8, 8, () => new StandardTile());
// ... place pieces on board ...
const initialState = new GameState(board, PlayerColor.White, 1, []);

// Create manager
const ruleset = new StandardChessRuleSet();
const manager = new ChessManager(initialState, ruleset);

// Execute a move
const move = new Move(from, to, piece);
const result = manager.playMove(move);

if (result.success) {
    console.log('Move executed!');
    console.log('New state:', result.newState);
    console.log('Events:', result.eventLog);
    console.log('Resolution time:', result.resolveTimeMs, 'ms');
}

// Check game status
if (manager.isGameOver()) {
    const winner = manager.getWinner();
    console.log('Game over! Winner:', winner);
}
```

### Undo/Redo

```typescript
// Execute a move
manager.playMove(move1);

// Execute another move
manager.playMove(move2);

// Undo last move
manager.undo();
// Now at state after move1

// Redo
manager.redo();
// Now at state after move2

// Jump to specific point
manager.jumpTo(0);
// Now at initial state
```

### AI Turn

```typescript
import { GreedyAI } from './catalog/ai';

const ai = new GreedyAI();
const result = manager.playAITurn(PlayerColor.Black, ai);

if (result.success) {
    console.log('AI move executed!');
    console.log('New state:', result.newState);
}
```

### History Inspection

```typescript
// Get full history
const history = manager.history;

// Iterate through history
for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    console.log(`State ${i}:`);
    console.log('  Turn:', entry.state.turnNumber);
    console.log('  Player:', entry.state.currentPlayer);
    console.log('  Events:', entry.eventLog.length);
    if (entry.resolveTimeMs) {
        console.log('  Resolution time:', entry.resolveTimeMs, 'ms');
    }
}

// Get current position
console.log('Current index:', manager.currentIndex);
console.log('Current state:', manager.currentState);
```

### Legal Moves

```typescript
// Get all legal moves for current player
const allMoves = manager.getLegalMoves();
console.log('Legal moves:', allMoves.length);

// Get legal moves for specific piece
const piece = manager.currentState.board.getPieceAt(position);
if (piece) {
    const pieceMoves = manager.getLegalMovesForPiece(piece);
    console.log('Moves for piece:', pieceMoves.length);
}
```

## Turn Orchestration

`ChessManager` orchestrates turn boundaries because `ChessEngine` is turn-agnostic. The turn flow is:

```
TurnStartEvent (current player, current turn)
    ↓
Move (via ChessEngine.resolveMove)
    ↓
TurnEndEvent (current player, current turn)
    ↓
TurnAdvancedEvent (next player, next turn) [if advanceTurn = true]
```

Each event goes through the listener queue independently, allowing abilities to react to turn boundaries.

### Turn Events

- **`TurnStartEvent`**: Signals start of turn
  - Allows abilities to trigger at turn start
  - No state change (informational)

- **`TurnEndEvent`**: Signals end of turn
  - Allows abilities to trigger at turn end
  - No state change (informational)

- **`TurnAdvancedEvent`**: Advances to next player/turn
  - Updates `currentPlayer` and `turnNumber` in state
  - Only applied if `advanceTurn` is true

### Disabling Turn Advancement

You can execute a move without advancing the turn:

```typescript
const result = manager.playMove(move, false);
// TurnStart → Move → TurnEnd (no TurnAdvanced)
```

This is useful for:
- Multi-move abilities
- Special game modes
- Testing scenarios

## History Management

### History Structure

History is a linear array of state snapshots:

```typescript
[
    { state: initialState, eventLog: [], resolveTimeMs: undefined },
    { state: afterMove1, eventLog: [...], resolveTimeMs: 5.2 },
    { state: afterMove2, eventLog: [...], resolveTimeMs: 3.8 },
    // ...
]
```

### History Properties

- **Linear**: Each entry represents one move execution
- **Immutable**: History entries are read-only
- **Complete**: Each entry has full state snapshot and event log
- **Timed**: Entries after initial state include resolution timing

### History Navigation

- **`undo()`**: Go back one step
- **`redo()`**: Go forward one step
- **`jumpTo(index)`**: Jump to specific point
- **`currentIndex`**: Current position in history

### History Use Cases

- **Undo/Redo**: User can undo mistakes
- **Replay**: Animate game from history
- **Debugging**: Inspect state at any point
- **Analysis**: Review game progression
- **Save/Load**: Serialize history for persistence

## Integration with ChessEngine

`ChessManager` is a thin orchestration layer around `ChessEngine`:

### Delegation Pattern

```typescript
// ChessManager delegates to ChessEngine
const result = ChessEngine.resolveMove(state, move);
// ChessManager collects result and adds to history
this._history.push({ state: result.finalState, eventLog: result.eventLog });
```

### Separation of Concerns

- **ChessEngine**: Pure game logic (stateless, deterministic)
- **ChessManager**: Match orchestration (stateful, history management)

### What ChessManager Doesn't Know

- **Listeners**: Collected internally by `ChessEngine.collectListeners()`
- **Event Types**: Just passes through event logs
- **Piece Types**: Just uses `Piece` interface
- **Move Validation**: Delegates to `RuleSet.getLegalMoves()`

## Performance Tracking

`ChessManager` tracks timing information for move resolution:

```typescript
const startTime = performance.now();
// ... resolve move ...
const resolveTimeMs = performance.now() - startTime;
```

**Timing Includes**:
- TurnStart event resolution
- Move resolution (including all chain reactions)
- TurnEnd event resolution
- TurnAdvanced event resolution (if applicable)

**Timing Excludes**:
- AI move selection time (in `playAITurn`)
- Move validation time
- History storage time

**Use Cases**:
- Performance monitoring
- Debugging slow moves
- Profiling listener performance
- Identifying bottlenecks

## File Structure

```
chess-manager/
├── ChessManager.ts          # Main manager class
├── index.ts                 # Public exports
└── __tests__/
    └── ChessManager.test.ts # Comprehensive tests
```

## Testing

The manager includes comprehensive tests in `__tests__/ChessManager.test.ts`:

- **Initialization**: State setup and history seeding
- **Move Execution**: Basic moves, event logs, turn advancement
- **History Management**: Undo, redo, jumpTo
- **AI Integration**: AI turn execution
- **Game Status**: Legal moves, game over detection
- **Edge Cases**: Invalid moves, boundary conditions

## Design Notes

- **Stateful Orchestration**: Unlike `ChessEngine`, `ChessManager` maintains state (history)
- **Thin Layer**: Minimal logic - mostly delegates to `ChessEngine`
- **Turn Management**: Handles turn boundaries since `ChessEngine` is turn-agnostic
- **History Preservation**: Complete state snapshots enable undo/redo and replay
- **Performance Aware**: Tracks timing for monitoring and debugging
- **Interface-Based**: Uses interfaces (`RuleSet`, `AI`, `Piece`) for flexibility

## Integration Points

### With ChessEngine

- **Move Resolution**: `ChessEngine.resolveMove()`
- **Event Resolution**: `ChessEngine.resolveEvent()`
- **Legal Moves**: `ChessEngine.getLegalMoves()`
- **Game Over**: `ChessEngine.isGameOver()`

### With Catalog

- **Rule Sets**: Uses `RuleSet` implementations from catalog
- **AI**: Uses `AI` implementations from catalog
- **Pieces/Tiles**: Uses `Piece` and `Tile` interfaces (content-agnostic)

### With Higher-Level Systems

- **Game Manager**: Future roguelike system will create `ChessManager` per encounter
- **Frontend**: React components use `ChessManager` for game state
- **Save/Load**: History can be serialized for persistence

