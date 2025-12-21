# Renderer

The **Renderer** directory contains all React UI components for the chess game application. It provides multiple application modes (map builder, play mode), board views (2D and 3D), and reusable components for game state management and visualization.

## Architecture Overview

The renderer is organized into several application modes and shared components:

1. **Main App** (`App.tsx`) - Root application with mode switching (builder/play)
2. **Play Mode** (`play/`) - Game playing interface (3D only)
3. **Map Builder** (`mapbuilder/`) - Visual map editor for creating custom boards
4. **3D Renderer** (`chess3d/`) - React Three Fiber-based 3D board visualization and game state management
6. **Map Loader** (`maploader/`) - Utilities for loading map definitions into game state

### Key Design Principles

- **React Context for State**: `EngineContext` provides reactive game state access
- **Adapter Pattern**: `chessManagerAdapter` bridges `ChessManager` to React components
- **Mode-Based Apps**: Separate apps for different use cases (builder vs. play)
- **Reusable Components**: Shared components can be used across different views
- **Type Safety**: Full TypeScript support with proper type definitions

## Main Application

### `App.tsx`

Root application component that switches between map builder and play modes.

**Props**: None

**State**:
- `mode: "builder" | "play"` - Current application mode
- `loadedMap: MapDefinition | null` - Last saved/loaded map

**Usage**:
```typescript
import { App } from "./App";

// Renders mode switcher and appropriate app
<App />
```

**Features**:
- Mode switching buttons (Map Builder / Play)
- Tracks loaded map for play mode
- Simple header with navigation

## Play Mode

### `play/PlayApp.tsx`

Main play mode application that loads a map and provides game interface.

**Props**:
```typescript
interface PlayAppProps {
    map: MapDefinition; // Map to load and play
}
```

**State**:
- `mode: "hva" | "hvh"` - Human vs AI or Human vs Human
- `viewMode: "2d" | "3d"` - Board view mode
- `gameKey: number` - Key to force game reset
- `debugPanelOpen: boolean` - Debug panel visibility

**Features**:
- Loads map via `loadMap()` and creates `ChessManagerBundle`
- Supports Human vs AI and Human vs Human modes
- Toggle between 2D and 3D views
- New game button (resets game state)
- Undo/Redo controls
- Game over popup
- Debug panel integration

**Usage**:
```typescript
import { PlayApp } from "./play/PlayApp";
import { MapDefinition } from "./mapbuilder/types";

const map: MapDefinition = { /* ... */ };
<PlayApp map={map} />
```

**Components**:
- `UndoRedoButtons` - Undo/redo controls
- `GameOverPopupWrapper` - Game over detection and popup display

## Chess Components

### `chess3d/EngineContext.tsx`

React context provider for game state management. Provides reactive access to `ChessManager` and game state.

**Exports**:
- `EngineProvider` - Context provider component
- `useEngine()` - Hook to access engine bundle
- `useEngineState()` - Hook to access reactive game state

**EngineProvider Props**:
```typescript
interface EngineProviderProps {
    children: React.ReactNode;
    existing?: ChessManagerBundle; // Optional existing bundle (for PlayApp)
}
```

**useEngine() Returns**:
```typescript
{
    engine: null; // Legacy (not used)
    getState: () => GameState;
    rules: RuleSet;
    submitHumanMove: (move: Move) => void;
    manager: ChessManager; // Direct access to manager
}
```

**useEngineState() Returns**:
```typescript
GameState // Reactive state that updates on moves
```

**Usage**:
```typescript
import { EngineProvider, useEngine, useEngineState } from "./chess/EngineContext";

// Wrap app with provider
<EngineProvider>
    <YourComponent />
</EngineProvider>

// In component
function YourComponent() {
    const { submitHumanMove, manager } = useEngine();
    const state = useEngineState(); // Reactive state
    
    // Use state and submit moves
}
```

**Implementation Details**:
- Uses `useSyncExternalStore` for reactive state updates
- Global subscriber system for state change notifications
- Wraps `submitHumanMove`, `undo`, `redo` to notify subscribers

### `chess3d/chessManagerAdapter.ts`

Adapter that creates and manages `ChessManager` instances for React components.

**Exports**:
- `ChessManagerBundle` - Type definition
- `createChessManagerBundle()` - Create standard chess game
- `createChessManagerBundleFromState()` - Create from loaded state
- `notifySubscribers()` - Notify state change subscribers

**ChessManagerBundle Type**:
```typescript
interface ChessManagerBundle {
    manager: ChessManager;
    getState: () => GameState;
    rules: RuleSet;
    submitHumanMove: (move: Move) => void;
    undo: () => void;
    redo: () => void;
}
```

**createChessManagerBundle()**:
```typescript
function createChessManagerBundle(): ChessManagerBundle
```
Creates a standard 8x8 chess board with White as human player.

**createChessManagerBundleFromState()**:
```typescript
function createChessManagerBundleFromState(
    initialState: GameState,
    humanPlayer: PlayerColor | null = PlayerColor.White
): ChessManagerBundle
```
Creates bundle from existing state. If `humanPlayer` is `null`, enables Human vs Human mode.

**Features**:
- Automatic AI turn execution (if AI player configured)
- Subscriber notification system
- Undo/redo support
- Human vs AI and Human vs Human modes

**Usage**:
```typescript
import { createChessManagerBundleFromState } from "./chess/chessManagerAdapter";

const bundle = createChessManagerBundleFromState(gameState, PlayerColor.White);
// Use bundle.manager, bundle.submitHumanMove, etc.
```

### `chess3d/Board3DView.tsx`

2D board view component for displaying and interacting with the chess board.

**Props**: None (uses `EngineContext`)

**Features**:
- Click-based piece selection and move execution
- Legal move highlighting
- Piece icons with tooltips (moves made, captures made)
- Tile icons overlay
- Ability/decorator icons overlay
- Turn and move number display

**Usage**:
```typescript
import { BoardView } from "./chess/BoardView";
import { EngineProvider } from "./chess/EngineContext";

<EngineProvider>
    <BoardView />
</EngineProvider>
```

**Interaction**:
1. Click piece to select (must be current player's piece)
2. Click legal destination to move
3. Click another own piece to change selection
4. Click empty space to deselect

**Dependencies**:
- `EngineContext` for state and move submission
- Catalog registry for icons (`iconForAbility`, `iconForTile`, `abilityIdsForPiece`)
- Piece SVG assets in `/public/assets/`

### `chess3d/DebugPanel.tsx`

Debug panel for inspecting game history and events.

**Props**:
```typescript
interface DebugPanelProps {
    isOpen: boolean;
    onToggle: () => void;
}
```

**Features**:
- Collapsible panel (toggle button when closed)
- Move history with event counts
- Resolution time display (ms/μs/s)
- Expandable move entries showing:
  - Event type counts
  - Full event list with details
  - Player action indicators
- Event details for each event type

**Usage**:
```typescript
import { DebugPanel } from "./chess/DebugPanel";

const [open, setOpen] = useState(false);
<DebugPanel isOpen={open} onToggle={() => setOpen(!open)} />
```

**Event Display**:
- `MoveEvent`: Piece name and move coordinates
- `CaptureEvent`: Attacker, target, position
- `DestroyEvent`: Target and position
- `TurnStartEvent` / `TurnEndEvent`: Turn number and player
- `TurnAdvancedEvent`: Next turn and player
- `TileChangedEvent` / `PieceChangedEvent`: Position

### `chess3d/ClockView.tsx`

Clock display component for timed games (legacy support).

**Props**: None (uses `EngineContext`)

**Features**:
- Time remaining display (MM:SS format)
- Danger styling when < 10 seconds remaining
- Subscribes to engine clock updates
- Local interval for smooth updates while ticking

**Usage**:
```typescript
import { ClockView } from "./chess/ClockView";
import { EngineProvider } from "./chess/EngineContext";

<EngineProvider>
    <ClockView />
</EngineProvider>
```

**Note**: Currently requires legacy engine with `gameClock` property. May not work with new `ChessManager` architecture.

### `chess3d/Board3DView.tsx`

Legacy chess app component (simple wrapper around `BoardView` and `DebugPanel`).

**Props**: None

**Usage**:
```typescript
import { App } from "./chess/App";

<App />
```

**Note**: Prefer using `PlayApp` for new implementations.

## Map Builder

### `mapbuilder/MapBuilderApp.tsx`

Main map builder application for creating custom chess maps.

**Props**:
```typescript
interface MapBuilderAppProps {
    onMapChanged?: (map: MapDefinition) => void;
}
```

**State**:
- `mode: "white" | "black" | "tiles"` - Current editing mode
- `map: MapDefinition` - Current map being edited
- `tool: Tool` - Selected tool (piece, decorator, tile, erase)

**Features**:
- Mode switching (White pieces, Black pieces, Tiles)
- Board size configuration (width/height)
- Starting player selection
- Save/Load JSON files (via Electron IPC)
- Tool palette for placing pieces, decorators, and tiles
- Board editor canvas

**Usage**:
```typescript
import { MapBuilderApp } from "./mapbuilder/MapBuilderApp";

<MapBuilderApp 
    onMapChanged={(map) => {
        // Handle map changes (e.g., track for play mode)
    }}
/>
```

**File Operations**:
- `window.maps.saveJSON(map)` - Save map to file
- `window.maps.openJSON<MapDefinition>()` - Load map from file

### `mapbuilder/BoardEditor.tsx`

Board editor component for placing/removing pieces and tiles.

**Props**:
```typescript
interface BoardEditorProps {
    map: MapDefinition;
    setMap: (m: MapDefinition) => void;
    tool: Tool;
    mode: "white" | "black" | "tiles";
}
```

**Features**:
- Click cells to place/remove pieces/tiles
- Tool-based interaction:
  - `erase` - Remove piece/tile
  - `piece` - Place piece
  - `decorator` - Add decorator to existing piece
  - `tile` - Place tile
- Visual display of pieces, decorators, and tiles
- Coordinate system: top-left (0, height-1) to bottom-right (width-1, 0)

**Usage**:
```typescript
import { BoardEditor } from "./mapbuilder/BoardEditor";

<BoardEditor 
    map={map}
    setMap={setMap}
    tool={tool}
    mode={mode}
/>
```

### `mapbuilder/Palette.tsx`

Tool palette component for selecting pieces, decorators, and tiles.

**Props**:
```typescript
interface PaletteProps {
    mode: "white" | "black" | "tiles";
    tool: Tool;
    setTool: (tool: Tool) => void;
}
```

**Tool Type**:
```typescript
type Tool = 
    | { kind: "erase" }
    | { kind: "piece"; piece: PieceId; color: Color }
    | { kind: "decorator"; decorator: AbilityId }
    | { kind: "tile"; tile: TileId };
```

**Features**:
- Mode-specific tool selection
- Piece selection (when in white/black mode)
- Decorator selection (when in white/black mode)
- Tile selection (when in tiles mode)
- Erase tool

**Usage**:
```typescript
import { Palette } from "./mapbuilder/Palette";

<Palette 
    mode={mode}
    tool={tool}
    setTool={setTool}
/>
```

### `mapbuilder/serializer.ts`

Serialization utilities for map definitions.

**Exports**:
- `emptyMap(width, height)` - Create empty map
- `addOrReplacePiece(map, piece)` - Add/update piece
- `removePieceAt(map, x, y)` - Remove piece
- `addDecoratorAt(map, x, y, decorator)` - Add decorator to piece
- `addOrReplaceTile(map, tile)` - Add/update tile
- `removeTileAt(map, x, y)` - Remove tile
- `getPieceAt(map, x, y)` - Get piece at position
- `getTileAt(map, x, y)` - Get tile at position

**Usage**:
```typescript
import { emptyMap, addOrReplacePiece } from "./mapbuilder/serializer";

const map = emptyMap(8, 8);
addOrReplacePiece(map, { type: "Pawn", color: "White", x: 0, y: 0, decorators: [] });
```

### `mapbuilder/types.ts`

Type definitions for map builder.

**Exports**:
- `MapDefinition` - Complete map structure
- `PlacedPiece` - Piece placement data
- `PlacedTile` - Tile placement data
- `Color` - Player color type
- `DecoratorId` - Legacy alias for `AbilityId`

**MapDefinition**:
```typescript
interface MapDefinition {
    width: number;
    height: number;
    startingPlayer: Color;
    pieces: PlacedPiece[];
    tiles: PlacedTile[];
}
```

**PlacedPiece**:
```typescript
interface PlacedPiece {
    type: PieceId;
    color: Color;
    x: number;
    y: number;
    decorators: DecoratorId[]; // Array of ability IDs
}
```

**PlacedTile**:
```typescript
interface PlacedTile {
    type: TileId;
    x: number;
    y: number;
}
```

### `mapbuilder/paletteData.ts`

Icon and display data for palette items.

**Exports**:
- `iconForPiece(pieceId)` - Get piece icon filename
- `iconForDecorator(abilityId)` - Get decorator icon (emoji)
- `iconForTile(tileId)` - Get tile icon (emoji)

**Usage**:
```typescript
import { iconForPiece, iconForDecorator } from "./mapbuilder/paletteData";

const icon = iconForPiece("Pawn"); // "pawn"
const emoji = iconForDecorator("Marksman"); // "🎯"
```

## Map Loader

### `maploader/maploader.ts`

Utilities for loading map definitions into game state.

**Exports**:
- `loadMap(def: MapDefinition): GameState` - Convert map definition to game state

**loadMap()**:
```typescript
function loadMap(def: MapDefinition): GameState
```

**Process**:
1. Creates board with default tiles
2. Places custom tiles (with x-axis flip for coordinate system)
3. Places pieces with decorators (abilities)
4. Creates initial `GameState` with starting player

**Coordinate System**:
- Map builder uses (0,0) at top-left
- Game uses (0,0) at bottom-left
- X-axis is flipped during loading to match game coordinate system

**Usage**:
```typescript
import { loadMap } from "./maploader/maploader";
import { MapDefinition } from "./mapbuilder/types";

const map: MapDefinition = { /* ... */ };
const gameState = loadMap(map);
```

## 3D Renderer

See `chess3d/README.md` for detailed 3D renderer documentation.

**Key Components**:
- `Board3DView` - Root 3D scene component
- `BoardMesh` - Instanced board squares rendering
- `Piece3D` - Individual piece rendering with decorators
- `ProceduralPieces` - Procedural geometry for pieces
- `GeometryStore` - Cached geometry context provider

**Usage**:
```typescript
import { Board3DView } from "./chess3d";
import { EngineProvider } from "./chess/EngineContext";

<EngineProvider>
    <Board3DView />
</EngineProvider>
```

## Reusable Patterns

### State Management Pattern

Use `EngineContext` for reactive game state:

```typescript
import { EngineProvider, useEngine, useEngineState } from "./chess/EngineContext";

function MyComponent() {
    const { submitHumanMove, manager } = useEngine();
    const state = useEngineState(); // Reactive - updates on moves
    
    const handleMove = (move: Move) => {
        submitHumanMove(move);
        // State will automatically update via useEngineState()
    };
    
    return <div>{/* Use state */}</div>;
}

// Wrap with provider
<EngineProvider>
    <MyComponent />
</EngineProvider>
```

### Creating Game Bundles

Use adapter to create game instances:

```typescript
import { createChessManagerBundleFromState } from "./chess/chessManagerAdapter";
import { loadMap } from "./maploader/maploader";

// From map
const map: MapDefinition = { /* ... */ };
const state = loadMap(map);
const bundle = createChessManagerBundleFromState(state, PlayerColor.White);

// Standard game
import { createChessManagerBundle } from "./chess/chessManagerAdapter";
const bundle = createChessManagerBundle();
```

### Board Rendering Pattern

Both 2D and 3D views follow similar patterns:

1. Get state from `useEngineState()`
2. Get legal moves from `rules.getLegalMoves(state, piece)`
3. Handle selection state
4. Submit moves via `submitHumanMove(move)`

### Icon Display Pattern

Use Catalog registry for icons:

```typescript
import { 
    iconForPiece, 
    iconForAbility, 
    iconForTile,
    abilityIdsForPiece,
    tileIdForInstance 
} from "../../catalog/registry/Catalog";

// Piece icons
const icon = iconForPiece("Pawn"); // "pawn" → use with `/assets/pawn-w.svg`

// Ability icons
const abilities = abilityIdsForPiece(piece); // ["Marksman", "Exploding"]
abilities.forEach(id => iconForAbility(id)); // "🎯", "💥"

// Tile icons
const tileId = tileIdForInstance(tile); // "GuardianTile"
const icon = iconForTile(tileId); // "🛡️"
```

## File Structure

```
renderer/
├── App.tsx                    # Root app with mode switching
├── renderer.tsx              # React DOM entry point
├── chess3d/                   # 3D chess components and game state management
│   ├── App.tsx               # Legacy chess app
│   ├── BoardView.tsx         # 2D board view
│   ├── EngineContext.tsx     # React context for game state
│   ├── chessManagerAdapter.ts # ChessManager adapter
│   ├── DebugPanel.tsx        # Debug panel component
│   ├── ClockView.tsx         # Clock display (legacy)
│   ├── board.css             # Board styles
│   └── debugPanel.css        # Debug panel styles
├── play/                      # Play mode
│   └── PlayApp.tsx           # Main play application
├── mapbuilder/                # Map builder
│   ├── MapBuilderApp.tsx     # Main builder app
│   ├── BoardEditor.tsx        # Board editor component
│   ├── Palette.tsx           # Tool palette
│   ├── serializer.ts         # Map serialization utilities
│   ├── types.ts              # Map type definitions
│   ├── paletteData.ts        # Palette icon data
│   └── styles.css            # Builder styles
├── maploader/                 # Map loading
│   └── maploader.ts          # Map → GameState converter
├── chess3d/                   # 3D renderer
│   ├── Board3DView.tsx       # Root 3D component
│   ├── BoardMesh.tsx         # Board rendering
│   ├── Piece3D.tsx           # Piece rendering
│   ├── ProceduralPieces.tsx  # Piece geometry
│   ├── GeometryStore.tsx     # Geometry caching
│   ├── coordinates.ts       # Coordinate conversion
│   └── README.md             # 3D renderer docs
└── types/                     # Type definitions
    └── global.d.ts           # Global type augmentations
```

## Integration Points

### With ChessManager

- `chessManagerAdapter` creates and wraps `ChessManager`
- `EngineContext` provides reactive access to manager state
- Components use `submitHumanMove()` to execute moves

### With Catalog

- Uses registry functions for icons (`iconForPiece`, `iconForAbility`, `iconForTile`)
- Uses factory functions for creating pieces/tiles (`createPiece`, `createTile`, `applyAbility`)
- Uses type definitions (`PieceId`, `AbilityId`, `TileId`)

### With Chess Engine

- Uses primitives (`Move`, `Vector2Int`, `PlayerColor`)
- Uses state types (`GameState`, `Board`)
- Uses event types for debug panel (`GameEvent`, `MoveEvent`, etc.)

## Best Practices

### State Management

- Always use `useEngineState()` for reactive state access
- Use `useEngine()` for actions (submit moves, undo, redo)
- Wrap components with `EngineProvider` when using engine hooks

### Component Composition

- Keep board views separate from game logic
- Use `EngineContext` for state, not prop drilling
- Create reusable components for common patterns (piece icons, move highlighting)

### Performance

- Use `React.memo` for expensive components (like `BoardMesh`, `Piece3D`)
- Memoize legal moves calculations with `useMemo`
- Use `useSyncExternalStore` for efficient state subscriptions

### Type Safety

- Use Catalog type definitions (`PieceId`, `AbilityId`, `TileId`)
- Use engine primitives (`Move`, `Vector2Int`, `PlayerColor`)
- Define proper prop types for all components

## Common Tasks

### Adding a New View Mode

1. Create new component (e.g., `MyView.tsx`)
2. Use `useEngineState()` and `useEngine()` hooks
3. Wrap with `EngineProvider` in parent
4. Add to `PlayApp` view mode switcher

### Adding a New UI Component

1. Create component file
2. Import from `EngineContext` if needed
3. Use Catalog registry for icons/data
4. Add to appropriate app (PlayApp, MapBuilderApp, etc.)

### Creating a Custom Game Mode UI

1. Create new app component
2. Use `createChessManagerBundleFromState()` with custom state
3. Wrap with `EngineProvider`
4. Use `BoardView` or `Board3DView` for board display
5. Add custom UI controls as needed

## Notes

- **Coordinate Systems**: Map builder and game use different coordinate systems (x-axis flipped during loading)
- **Legacy Support**: Some components (like `ClockView`) may not work with new `ChessManager` architecture
- **State Updates**: State updates are reactive via `useEngineState()` - no manual refresh needed
- **AI Integration**: AI turns are automatically handled in `chessManagerAdapter` when configured
- **File I/O**: Map save/load uses Electron IPC (`window.maps.saveJSON`, `window.maps.openJSON`)


