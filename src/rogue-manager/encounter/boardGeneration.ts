// roguelike/encounter/boardGeneration.ts

import { Piece } from "../../catalog/pieces/Piece";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Board } from "../../chess-engine/state/Board";
import { StandardTile } from "../../catalog/tiles/StandardTile";

function getRandomPosition(
  width: number,
  heightRange: [number, number],
  occupied: Set<string>
): Vector2Int {
  while (true) {
    const x = Math.floor(Math.random() * width);
    const y =
      heightRange[0] +
      Math.floor(Math.random() * (heightRange[1] - heightRange[0] + 1));

    const key = `${x},${y}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      return new Vector2Int(x, y);
    }
  }
}

export function generateCombatBoard(
  playerRoster: Piece[],
  enemyRoster: Piece[]
): Board {
  const width = 6;
  const height = 6;

  const board = new Board(width, height, () => new StandardTile());
  const occupied = new Set<string>();

  // Place player pieces (rows 0–2)
  for (const piece of playerRoster) {
    const pos = getRandomPosition(width, [0, 2], occupied);
    piece.position = pos;
    board.placePiece(piece, pos);
  }

  // Place enemy pieces (rows 3–5)
  for (const piece of enemyRoster) {
    const pos = getRandomPosition(width, [3, 5], occupied);
    piece.position = pos;
    board.placePiece(piece, pos);
  }

  return board;
}
