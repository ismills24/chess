# Rogue Manager

The **Rogue Manager** orchestrates a full roguelike game run from start to finish. It uses an xState state machine to manage game flow, delegating combat to `ChessManager` and exposing a reactive API for frontend integration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                                                                 │
│  ┌─────────────────┐    subscribe    ┌───────────────────────┐ │
│  │   RogueApp      │◄───────────────►│   RogueActor          │ │
│  │   (UI Layer)    │     send()      │   (State Machine)     │ │
│  └────────┬────────┘                 └───────────┬───────────┘ │
│           │                                      │              │
│           │ EngineProvider                       │ context      │
│           ▼                                      ▼              │
│  ┌─────────────────┐                 ┌───────────────────────┐ │
│  │  Board3DView    │◄───────────────►│   ChessManager        │ │
│  │  (Chess UI)     │                 │   (Combat Instance)   │ │
│  └─────────────────┘                 └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

- **State Machine Driven**: All game flow is controlled by an xState state machine
- **Separation of Concerns**: Rogue Manager handles meta-game, ChessManager handles combat
- **Reactive Updates**: Frontend subscribes to state changes via xState actor
- **Immutable Context**: State machine context is updated via actions, not direct mutation

## State Machine

### States

The state machine defines the following states:

```
┌─────────┐     GO_TO_SHOP      ┌─────────┐
│   map   │────────────────────►│  shop   │
│         │◄────────────────────│         │
└────┬────┘     LEAVE_SHOP      └─────────┘
     │
     │ GO_TO_ENCOUNTER
     ▼
┌─────────────────────────────────────────┐
│              encounter                   │
│  ┌───────────────────────────────────┐  │
│  │      waitingForPlayerTurn         │  │
│  │              │                    │  │
│  │              │ PLAYER_MOVE        │  │
│  │              ▼                    │  │
│  │      waitingForAIMove             │  │
│  │              │                    │  │
│  │              │ (after delay)      │  │
│  │              ▼                    │  │
│  │      [game over check]────────────┼──┼──► resolved ──► map
│  │              │                    │  │
│  │              └────────────────────┘  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
     │
     │ (roster empty after loss)
     ▼
┌──────────┐
│ gameOver │───── RESTART ────► map
└──────────┘
```

### Context

The state machine maintains the following context:

```typescript
interface RogueContext {
    /** Player's persistent roster of pieces */
    roster: Piece[];
    
    /** Player's currency */
    money: number;
    
    /** Current shop offer (if any) */
    shopOffer: ShopOffer | null;
    
    /** ChessManager instance for active encounter */
    chessManager: ChessManager | null;
    
    /** IDs of roster pieces at encounter start (for tracking survivors) */
    encounterRosterIds: string[];
    
    /** Winner of the last encounter */
    lastEncounterWinner: PlayerColor | null;
}
```

### Events

```typescript
type RogueEvent =
    | { type: "GO_TO_SHOP" }
    | { type: "GO_TO_ENCOUNTER" }
    | { type: "BUY_PIECE"; pieceIndex: number }
    | { type: "BUY_DECORATOR"; decoratorIndex: number; targetPieceId: string }
    | { type: "LEAVE_SHOP" }
    | { type: "PLAYER_MOVE"; move: Move }
    | { type: "RESTART" };
```

## Integration with ChessManager

### Encounter Lifecycle

1. **Start**: When entering `encounter` state, a new `ChessManager` is created with:
   - Player's roster pieces (cloned) placed on their half of the board
   - Enemy pieces generated and placed on the opposite half
   - `LastPieceStandingRuleSet` for win condition

2. **Combat**: The state machine alternates between:
   - `waitingForPlayerTurn`: Waits for `PLAYER_MOVE` event from frontend
   - `waitingForAIMove`: Executes AI move via `ChessManager.playAITurn()`

3. **Resolution**: When `ChessManager.isGameOver()` returns true:
   - Surviving player pieces are identified by comparing board state to `encounterRosterIds`
   - Roster is updated with only surviving pieces
   - Rewards are applied (if player won)

### ChessManager Access

The frontend accesses the `ChessManager` via the state machine context:

```typescript
const snapshot = actor.getSnapshot();
const { chessManager } = snapshot.context;

// Get legal moves
const moves = chessManager.getLegalMoves();

// Check game state
const isOver = chessManager.isGameOver();
const winner = chessManager.getWinner();
```

## Frontend Integration

### Creating the Actor

```typescript
import { createRogueActor } from "./rogue-manager";

// Create and start the actor
const actor = createRogueActor();
actor.start();

// Subscribe to state changes
actor.subscribe((snapshot) => {
    console.log("State:", snapshot.value);
    console.log("Context:", snapshot.context);
});
```

### React Integration

```typescript
import { useSyncExternalStore, useCallback } from "react";

function useRogueActor(actor: RogueActor): RogueSnapshot {
    const subscribe = useCallback(
        (callback: () => void) => {
            const subscription = actor.subscribe(callback);
            return () => subscription.unsubscribe();
        },
        [actor]
    );
    
    const getSnapshot = useCallback(() => actor.getSnapshot(), [actor]);
    
    return useSyncExternalStore(subscribe, getSnapshot);
}
```

### Sending Events

```typescript
// Navigation
actor.send({ type: "GO_TO_SHOP" });
actor.send({ type: "GO_TO_ENCOUNTER" });
actor.send({ type: "LEAVE_SHOP" });

// Shop actions
actor.send({ type: "BUY_PIECE", pieceIndex: 0 });
actor.send({ type: "BUY_DECORATOR", decoratorIndex: 0, targetPieceId: "piece-id" });

// Combat actions
actor.send({ type: "PLAYER_MOVE", move: selectedMove });

// Game over
actor.send({ type: "RESTART" });
```

### Connecting to Board View

During encounters, wrap the chess board view with `EngineProvider` using a bundle created from the context's `ChessManager`:

```typescript
const { chessManager } = snapshot.context;

const bundle: ChessManagerBundle = {
    manager: chessManager,
    getState: () => chessManager.currentState,
    rules: new LastPieceStandingRuleSet(),
    submitHumanMove: (move) => {
        actor.send({ type: "PLAYER_MOVE", move });
    },
    undo: () => {},
    redo: () => {},
};

// In JSX
<EngineProvider existing={bundle}>
    <Board3DView />
</EngineProvider>
```

## File Structure

```
rogue-manager/
├── rogueMachine.ts      # State machine definition and actor factory
├── index.ts             # Public exports
├── encounter/
│   ├── encounter.ts     # Enemy roster generation
│   └── boardGeneration.ts # Combat board setup
├── shop/
│   └── shop.ts          # Shop offer generation and purchase logic
├── util/
│   ├── random.ts        # Random selection utilities
│   └── roster.ts        # Player roster piece generation
└── __tests__/
    └── rogueMachine.test.ts
```

## State Machine Actions

### Key Actions

| Action | Description |
|--------|-------------|
| `startEncounterAction` | Creates ChessManager, places pieces, stores roster IDs |
| `playPlayerMove` | Executes player's move via ChessManager |
| `playAIMove` | Executes AI turn via ChessManager.playAITurn() |
| `resolveEncounter` | Updates roster with survivors, applies rewards |
| `buyPieceAction` | Adds shop offer piece to roster, deducts cost |
| `resetGame` | Resets context to initial state |

### Key Guards

| Guard | Description |
|-------|-------------|
| `isEncounterOver` | Checks ChessManager.isGameOver() |
| `isGameOver` | Checks if roster is empty after a loss |
| `canBuyPiece` | Validates purchase (money, roster size, offer exists) |
| `hasRoster` | Checks if player has pieces to fight with |

## Extending the State Machine

### Adding New States

```typescript
// In rogueMachine.ts, add to states object:
states: {
    // ... existing states ...
    
    newState: {
        entry: "newStateEntryAction",
        on: {
            SOME_EVENT: {
                target: "anotherState",
                actions: "someAction",
            },
        },
    },
}
```

### Adding New Context

```typescript
// Update RogueContext interface
interface RogueContext {
    // ... existing fields ...
    newField: SomeType;
}

// Update createInitialContext()
function createInitialContext(): RogueContext {
    return {
        // ... existing fields ...
        newField: initialValue,
    };
}
```

### Adding New Events

```typescript
// Update RogueEvent type
type RogueEvent =
    | { type: "EXISTING_EVENT" }
    | { type: "NEW_EVENT"; payload: SomeType };

// Handle in state machine
on: {
    NEW_EVENT: {
        actions: assign(({ event }) => ({
            someField: event.payload,
        })),
    },
}
```

## Notes

- **AI Timing**: The `waitingForAIMove` state uses a delayed transition (`after: { 100 }`) to allow React to re-render between turns
- **Piece Identity**: Roster pieces are cloned for encounters; survivors are matched by ID to preserve the original roster references
- **State Persistence**: The actor runs in the renderer process; state is not persisted across app restarts
- **Event Validation**: Guards prevent invalid state transitions (e.g., buying without money)

