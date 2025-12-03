# Decorator Value System Tests

This directory contains tests and demonstrations for the decorator value system, which allows decorator values to stack additively on top of base piece values.

## How It Works

Each decorator has a `decoratorValue` property that is added to the inner piece's value. When decorators are stacked, the `getValue()` method recursively calls through all decorator layers:

```
ExplodingDecorator.getValue() 
  → calls inner.getValue() + 3
  → PiercingDecorator.getValue()
    → calls inner.getValue() + 2
    → Pawn.getValue()
      → returns 1
    ← returns 1 + 2 = 3
  ← returns 3 + 3 = 6
```

## Decorator Values

- **PiercingDecorator**: +2 (pierces through targets)
- **ExplodingDecorator**: +3 (explodes when destroyed)
- **MarksmanDecorator**: +2 (ranged attacks)
- **BouncerDecorator**: +2 (bounces enemies backward)
- **CannibalDecorator**: +1 (can capture friendly pieces)
- **ScapegoatDecorator**: +1 (sacrifices for allies)

## Running the Tests

### Option 1: Using npm script (requires tsx)

If you have PowerShell execution policy set up correctly:

```bash
npm run test:decorator-values
```

This will run `DecoratorValue.test.ts` which contains comprehensive tests.

### Option 2: Manual inspection

Simply read the test files to verify the logic:
- `DecoratorValue.test.ts` - Comprehensive test suite
- `DEMO_DecoratorValues.ts` - Demonstration with detailed logging

### Option 3: Import the demonstration

You can import and call the demonstration function in any part of your code:

```typescript
import { demonstrateDecoratorValues } from './engine/pieces/decorators/DEMO_DecoratorValues';

demonstrateDecoratorValues(); // Prints detailed explanation to console
```

## Example Test Cases

### Single Decorator
```typescript
const pawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
const piercingPawn = new PiercingDecorator(pawn);
piercingPawn.getValue(); // 1 + 2 = 3 ✓
```

### Multiple Decorators (Recursion)
```typescript
const pawn = new Pawn(PlayerColor.White, new Vector2Int(0, 0));
const piercing = new PiercingDecorator(pawn);
const exploding = new ExplodingDecorator(piercing);
exploding.getValue(); // 1 + 2 + 3 = 6 ✓
```

### Fully Decorated Piece
```typescript
const queen = new Queen(PlayerColor.White, new Vector2Int(0, 0));
let decorated = new PiercingDecorator(queen);    // 9 + 2 = 11
decorated = new ExplodingDecorator(decorated);   // 11 + 3 = 14
decorated = new MarksmanDecorator(decorated);    // 14 + 2 = 16
decorated = new CannibalDecorator(decorated);    // 16 + 1 = 17
decorated = new BouncerDecorator(decorated);     // 17 + 2 = 19
decorated = new ScapegoatDecorator(decorated);   // 19 + 1 = 20 ✓
```

## Implementation Details

See `PieceDecoratorBase.ts` for the core implementation:

```typescript
protected abstract readonly decoratorValue: number;

getValue(): number {
    return this.inner.getValue() + this.decoratorValue;
}
```

Each concrete decorator simply declares its value:

```typescript
export class PiercingDecorator extends PieceDecoratorBase {
    protected readonly decoratorValue = 2;
    // ...
}
```

