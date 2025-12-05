// roguelike/encounter/boardGeneration.ts

import { Piece } from "../../catalog/pieces/Piece";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { Board } from "../../chess-engine/state/Board";
import { StandardTile } from "../../catalog/tiles/StandardTile";

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function placePiecesStrategically(
  pieces: Piece[],
  board: Board,
  rows: number[],
  width: number,
  isPlayerSide: boolean
): void {
  const occupied = new Set<string>();
  const backRow = isPlayerSide ? rows[0] : rows[rows.length - 1];
  
  // Map to track pawn positions by column
  const pawnPositions = new Map<number, number>();
  
  // Separate pieces by type
  const king = pieces.find(p => p.name === "King");
  const pawns = pieces.filter(p => p.name === "Pawn");
  const otherPieces = pieces.filter(p => p.name !== "King" && p.name !== "Pawn");
  
  // 1. Place King in back row, middle column
  if (king) {
    const middleCol1 = Math.floor((width - 1) / 2);
    const middleCol2 = Math.ceil((width - 1) / 2);
    const kingCol = middleCol1 === middleCol2 ? middleCol1 : 
                    (Math.random() < 0.5 ? middleCol1 : middleCol2);
    const kingPos = new Vector2Int(kingCol, backRow);
    king.position = kingPos;
    board.placePiece(king, kingPos);
    occupied.add(`${kingCol},${backRow}`);
  }
  
  // 2. Place Pawns
  const availableColumns = shuffle(Array.from({ length: width }, (_, i) => i));
  const nonBackRows = rows.filter(r => r !== backRow);
  
  for (let i = 0; i < pawns.length && i < availableColumns.length; i++) {
    const col = availableColumns[i];
    
    // Find available row in this column (not back row)
    let placedPawn = false;
    for (const row of shuffle([...nonBackRows])) {
      const key = `${col},${row}`;
      if (!occupied.has(key)) {
        const pawnPos = new Vector2Int(col, row);
        pawns[i].position = pawnPos;
        board.placePiece(pawns[i], pawnPos);
        occupied.add(key);
        pawnPositions.set(col, row);
        placedPawn = true;
        break;
      }
    }
    
    // If all non-back rows are occupied, try back row
    if (!placedPawn) {
      const key = `${col},${backRow}`;
      if (!occupied.has(key)) {
        const pawnPos = new Vector2Int(col, backRow);
        pawns[i].position = pawnPos;
        board.placePiece(pawns[i], pawnPos);
        occupied.add(key);
        pawnPositions.set(col, backRow);
      }
    }
  }
  
  // 3. Place other pieces
  const shuffledColumns = shuffle(Array.from({ length: width }, (_, i) => i));
  let colIndex = 0;
  
  for (const piece of shuffle([...otherPieces])) {
    let placed = false;
    
    // Try columns in shuffled order
    for (let attempt = 0; attempt < width && !placed; attempt++) {
      const col = shuffledColumns[(colIndex + attempt) % width];
      
      const pawnRow = pawnPositions.get(col);
      let availableRows: number[];
      
      if (pawnRow !== undefined) {
        // Column has a pawn - place between back row and pawn (exclusive)
        if (isPlayerSide) {
          // Player side: back row is lowest, pawn is forward
          availableRows = rows.filter(r => r >= backRow && r < pawnRow);
        } else {
          // Enemy side: back row is highest, pawn is forward
          availableRows = rows.filter(r => r <= backRow && r > pawnRow);
        }
      } else {
        // No pawn in this column - can use any row
        availableRows = [...rows];
      }
      
      // Try to place in an available row
      for (const row of shuffle([...availableRows])) {
        const key = `${col},${row}`;
        if (!occupied.has(key)) {
          const piecePos = new Vector2Int(col, row);
          piece.position = piecePos;
          board.placePiece(piece, piecePos);
          occupied.add(key);
          placed = true;
          break;
        }
      }
    }
    
    colIndex++;
  }
}

export function generateCombatBoard(
  playerRoster: Piece[],
  enemyRoster: Piece[],
  width: number,
  height: number
): Board {
  const board = new Board(width, height, () => new StandardTile());
  
  // Calculate player and enemy rows
  const playerRows: number[] = [];
  const enemyRows: number[] = [];
  
  for (let i = 0; i < height; i++) {
    if (i <= Math.floor((height - 1) / 2)) {
      playerRows.push(i);
    }
    if (i >= Math.ceil(height / 2)) {
      enemyRows.push(i);
    }
  }
  
  // Place pieces strategically for both sides
  placePiecesStrategically(playerRoster, board, playerRows, width, true);
  placePiecesStrategically(enemyRoster, board, enemyRows, width, false);
  
  return board;
}
