# Capture Animation Fix

## Problem
When moving a piece to capture an opponent's piece, the movement animation would fail to render and the captured piece would disappear instantly instead of showing a smooth capture sequence.

### Root Cause
The capturing piece's movement animation and the captured piece's removal were not synchronized:
1. The game engine would immediately remove captured pieces from the board state
2. The 3D renderer only renders pieces in `state.board.getAllPieces()`
3. The captured piece would vanish before the attacking piece's animation could complete
4. This resulted in a jarring visual experience with instant piece disappearance

## Solution
Implemented a **fade-out animation system** that keeps captured pieces visible during a smooth fade-out effect while movement animations complete.

### Implementation Details

#### Changes to `Board3DView.tsx`
- Added `prevPiecesRef`: Tracks all pieces from the previous frame
- Added `fadingOutPieces` state: Stores pieces that were just captured
- Added capture detection logic in a `useEffect` hook:
  - Compares current pieces with previous frame pieces
  - Detects when pieces disappear (captured)
  - Stores the captured piece object with the capture timestamp
  - Cleans up fading pieces after 300ms (configurable via `FADE_OUT_DURATION`)
- Updated piece rendering to include both active and fading-out pieces

#### Changes to `Piece3D.tsx`
- Added new props:
  - `isFadingOut`: Boolean flag indicating if piece is fading
  - `fadeStartTime`: Timestamp when fade started (in ms)
  - `fadeDuration`: Duration of fade animation in ms
- Added `opacityRef`: Tracks the current opacity during fade
- Updated `useFrame` hook:
  - Calculates fade progress based on elapsed time
  - Applies opacity to all materials in the piece group via `traverse()`
  - Handles both single and multi-material pieces
  - Sets `transparent = true` on materials for proper rendering
- Updated memo comparison to include fade props

### Behavior
When a piece is captured:
1. ✓ The capturing piece animates to the target square
2. ✓ The captured piece fades out smoothly over 300ms
3. ✓ After fade completes, the piece is removed from the render list
4. ✓ All animations are synchronized and smooth

### Configuration
The fade-out duration can be adjusted by changing `FADE_OUT_DURATION` in `Board3DView.tsx`:
```tsx
const FADE_OUT_DURATION = 300; // milliseconds
```

### Performance
- Uses ref-based state to avoid unnecessary React re-renders
- Opacity updates happen in `useFrame` (Three.js render loop)
- Only affects pieces being faded out (minimal performance impact)
