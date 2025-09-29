import { MapDefinition, PlacedPiece } from "../mapbuilder/types";
import { Board } from "../../engine/board/Board";
import { StandardTile } from "../../engine/tiles/StandardTile";
import { GuardianTile } from "../../engine/tiles/GuardianTile";
import { SlipperyTile } from "../../engine/tiles/SlipperyTile";
import { Pawn } from "../../engine/pieces/standard/Pawn";
import { Knight } from "../../engine/pieces/standard/Knight";
import { Bishop } from "../../engine/pieces/standard/Bishop";
import { Rook } from "../../engine/pieces/standard/Rook";
import { Queen } from "../../engine/pieces/standard/Queen";
import { King } from "../../engine/pieces/standard/King";
import { MarksmanDecorator } from "../../engine/pieces/decorators/MarksmanDecorator";
import { ExplodingDecorator } from "../../engine/pieces/decorators/ExplodingDecorator";
import { ScapegoatDecorator } from "../../engine/pieces/decorators/ScapegoatDecorator";
import { PiercingDecorator } from "../../engine/pieces/decorators/PiercingDecorator";
import { Vector2Int } from "../../engine/primitives/Vector2Int";
import { PlayerColor } from "../../engine/primitives/PlayerColor";
import { GameState } from "../../engine/state/GameState";

export function loadMap(def: MapDefinition): GameState {
    console.log(`[MapLoader] ===== LOADING MAP =====`);
    console.log(`[MapLoader] Map definition:`, JSON.stringify(def, null, 2));
    
    // Test if PiercingDecorator is available
    console.log(`[MapLoader] Testing PiercingDecorator availability:`, typeof PiercingDecorator);
    
    const board = new Board(def.width, def.height);

    // Fill board with tiles
    for (let y = 0; y < def.height; y++) {
        for (let x = 0; x < def.width; x++) {
            const pos = new Vector2Int(x, y);
            const tileDef = def.tiles.find((t) => t.x === x && t.y === y);
            let tile;
            if (!tileDef || tileDef.type === "StandardTile") tile = new StandardTile(pos);
            else if (tileDef.type === "GuardianTile") tile = new GuardianTile(pos);
            else if (tileDef.type === "SlipperyTile") tile = new SlipperyTile(pos);
            board.setTile(pos, tile);
        }
    }

    // Place pieces
    for (const pieceDef of def.pieces) {
        const pos = new Vector2Int(pieceDef.x, pieceDef.y);
        const piece = makePiece(pieceDef, pos);
        board.placePiece(piece, pos);
    }

    return GameState.createInitial(
        board,
        def.startingPlayer === "White" ? PlayerColor.White : PlayerColor.Black
    );
}

function makePiece(def: PlacedPiece, pos: Vector2Int) {
    const color = def.color === "White" ? PlayerColor.White : PlayerColor.Black;

    let piece: any;
    switch (def.type) {
        case "Pawn":
            piece = new Pawn(color, pos);
            break;
        case "Knight":
            piece = new Knight(color, pos);
            break;
        case "Bishop":
            piece = new Bishop(color, pos);
            break;
        case "Rook":
            piece = new Rook(color, pos);
            break;
        case "Queen":
            piece = new Queen(color, pos);
            break;
        case "King":
            piece = new King(color, pos);
            break;
        default:
            throw new Error(`Unknown piece type: ${def.type}`);
    }

    // Wrap in decorators if any
    console.log(`[MapLoader] Applying decorators to ${piece.name}:`, def.decorators);
    for (const deco of def.decorators) {
        if (deco === "Marksman") piece = new MarksmanDecorator(piece);
        if (deco === "Exploding") piece = new ExplodingDecorator(piece);
        if (deco === "Scapegoat") piece = new ScapegoatDecorator(piece);
        if (deco === "Piercing") {
            console.log(`[MapLoader] Applying Piercing decorator to ${piece.name}`);
            piece = new PiercingDecorator(piece);
            // Test if decorator is working
            if ((piece as any).testDecorator) {
                console.log(`[MapLoader] Decorator test:`, (piece as any).testDecorator());
            }
        }
    }

    return piece;
}
