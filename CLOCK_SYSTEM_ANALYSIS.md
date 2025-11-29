# Clock System Analysis

## Overview
The clock system tracks time for human players during chess games, automatically starting/pausing based on turn events, and can trigger game end when time expires.

## Architecture

### 1. Core Component: `GameClock` (`src/engine/core/GameClock.ts`)

**Purpose**: Tracks elapsed time for a single player and manages start/pause/expiry logic.

**Key Features**:
- **Time Budget**: Fixed time budget in milliseconds (`timeBudgetMs`)
- **State Management**: Tracks `elapsedMs`, `isTicking`, `isExpired`
- **Event-Driven**: Subscribes to game events (`TurnStartEvent`, `TurnEndEvent`, `TurnAdvancedEvent`) to automatically start/pause
- **Expiry Detection**: Uses a recursive `setTimeout` to check for expiry every 100ms (or remaining time, whichever is smaller)
- **Callback on Expiry**: Calls `onExpire` callback when time runs out

**Key Methods**:
- `start(nowMs)`: Starts the clock (if not expired/already ticking)
- `pause(nowMs)`: Pauses the clock and accumulates elapsed time
- `getRemaining(nowMs)`: Calculates remaining time (accounts for current tick if running)
- `handleEvent(ev)`: Processes game events to start/pause automatically
- `reset(startTimeMs)`: Resets the clock to zero
- `destroy()`: Cleans up timers

**Event Handling Logic**:
```typescript
- TurnStartEvent: Starts clock if event.player matches this.playerColor
- TurnEndEvent: Pauses clock if event.player matches this.playerColor  
- TurnAdvancedEvent: Starts if nextPlayer matches, pauses otherwise
```

### 2. Integration: `GameEngine` (`src/engine/core/GameEngine.ts`)

**Clock Creation** (Constructor):
```typescript
constructor(
    initialState: GameState,
    whiteController: PlayerController,
    blackController: PlayerController,
    ruleset: RuleSet,
    timeBudgetMs?: number,  // Optional time budget
    startTimeMs?: number    // Optional start timestamp
)
```

**Key Integration Points**:

1. **Conditional Creation** (lines 52-68):
   - Clock is only created if `timeBudgetMs` is provided and > 0
   - Only tracks time for the **human player** (detected via `detectHumanPlayer()`)
   - Uses `detectHumanPlayer()` which checks if controllers are `HumanController` instances

2. **Initial Event Notification** (lines 76-85):
   - After construction, notifies clock of the seed `TurnAdvancedEvent`
   - This ensures clock starts immediately if it's the human player's turn

3. **Event Forwarding** (lines 190-195):
   - In `applyCanonical()`, every non-simulation event is forwarded to the clock
   - Clock receives events **before** external subscribers (`onEventPublished`)
   - This ensures clock state is updated before UI renders

4. **Time Expiry Handling** (lines 251-262):
   - `handleTimeExpired()` is called by the clock when time runs out
   - Sets `timeExpiredFor` flag
   - Publishes `TimeExpiredEvent` to subscribers
   - **Note**: The event is published but not dispatched through the pipeline (it's a notification)

5. **Game Over Logic** (lines 101-117):
   - `isGameOver()` checks time expiry first (takes precedence over rule-based game over)
   - `getWinner()` returns opponent of expired player

6. **Public Accessor** (lines 267-269):
   - `get gameClock()` exposes the clock instance (or null) for UI access

### 3. UI Component: `ClockView` (`src/renderer/chess/ClockView.tsx`)

**Purpose**: React component that displays the remaining time.

**Key Features**:
- Accesses clock via `(engine as any).gameClock` (uses type assertion)
- **Dual Update Mechanism**:
  1. **Event-based**: Subscribes to engine's `_subs` set to update on game events
  2. **Interval-based**: Runs 100ms interval while `ticking` is true for smooth countdown
- **Visual Feedback**: Shows red background/border when remaining time ≤ 10 seconds
- **Formatting**: Displays time as `MM:SS` format

**Update Strategy**:
- Initial state read on mount
- Subscribes to engine's internal `_subs` notification system
- Runs interval only when `ticking === true` (efficient)
- Updates both `remainingMs` and `ticking` state

### 4. Initialization: `PlayApp` (`src/renderer/play/PlayApp.tsx`)

**Clock Configuration** (line 17):
```typescript
const timeBudgetMs = 5 * 60 * 1000; // 5 minutes
```

**Engine Creation** (lines 20-34):
- Creates `GameEngine` with `timeBudgetMs` and `Date.now()` as `startTimeMs`
- Works for both "Human vs AI" and "Human vs Human" modes
- Clock is automatically created for human players by the engine

**UI Integration** (line 69):
- Renders `<ClockView />` in the header
- ClockView accesses engine via `EngineContext`

## Data Flow

```
1. PlayApp creates GameEngine with timeBudgetMs
   ↓
2. GameEngine.detectHumanPlayer() identifies human player
   ↓
3. GameEngine creates GameClock for human player
   ↓
4. GameEngine notifies clock of seed TurnAdvancedEvent
   ↓
5. Clock starts if it's human player's turn
   ↓
6. Game events flow: applyCanonical() → clock.handleEvent() → onEventPublished
   ↓
7. ClockView subscribes to engine._subs and reads clock.getRemaining()
   ↓
8. When time expires: clock.onExpire() → engine.handleTimeExpired() → TimeExpiredEvent
   ↓
9. GameEngine.isGameOver() returns true, getWinner() returns opponent
```

## Event Sequence Example

**Turn Start**:
1. `TurnStartEvent` published
2. `GameEngine.applyCanonical()` receives it
3. `clock.handleEvent(TurnStartEvent)` called
4. If event.player === clock.playerColor → `clock.start()`
5. `onEventPublished` notifies subscribers
6. `ClockView` receives notification, updates UI

**Turn End**:
1. `TurnEndEvent` published
2. `clock.handleEvent(TurnEndEvent)` called
3. If event.player === clock.playerColor → `clock.pause()`
4. Elapsed time accumulated
5. UI updates to show paused state

## Design Decisions & Observations

### Strengths:
1. **Event-Driven**: Clock automatically syncs with game state via events
2. **Human-Only**: Only tracks time for human players (AI doesn't need clock)
3. **Precedence**: Time expiry takes precedence over rule-based game over
4. **Efficient Updates**: Interval only runs when clock is ticking
5. **Clean Separation**: Clock logic isolated from game rules

### Potential Issues/Improvements:

1. **Type Safety**: `ClockView` uses `(engine as any).gameClock` - should expose via EngineBundle type
2. **Human Detection**: `detectHumanPlayer()` uses constructor name check - could be more robust
3. **Single Clock**: Only one clock per engine (for one human player). In HvH mode, only tracks first detected human
4. **No Pause on Game Over**: Clock continues ticking even after game ends (should pause)
5. **Undo/Redo**: Clock state not synchronized with history navigation
6. **Timer Cleanup**: Uses `globalThis.setTimeout` - should verify cleanup on unmount
7. **Expiry Precision**: 100ms check interval means expiry can be up to 100ms late

### Missing Features:
- No increment/delay (Fischer/Bronstein time controls)
- No per-move time tracking
- No time history/statistics
- Clock doesn't pause when game is paused/stopped
- No visual countdown animation

## Recommendations

1. **Type Safety**: Add `gameClock` to `EngineBundle` interface
2. **Multiple Clocks**: Support two clocks for HvH mode
3. **History Sync**: Pause/reset clock when navigating history
4. **Game Over Handling**: Pause clock when `isGameOver()` returns true
5. **Cleanup**: Ensure clock.destroy() called when engine is destroyed
6. **Testing**: Add unit tests for clock expiry, event handling, edge cases





