import { MapDefinition, PlacedPiece } from "../mapbuilder/types";
import { Board } from "../../engine/board/Board";
import { Vector2Int } from "../../engine/primitives/Vector2Int";
import { PlayerColor } from "../../engine/primitives/PlayerColor";
import { GameState } from "../../engine/state/GameState";
import { applyDecorator, createPiece, createTile } from "../../shared/entityRegistry";

export function loadMap(def: MapDefinition): GameState {
    console.log(`[MapLoader] ===== LOADING MAP =====`);
    console.log(`[MapLoader] Map definition:`, JSON.stringify(def, null, 2));

    
    const board = new Board(def.width, def.height);

    // Fill board with tiles
    for (let y = 0; y < def.height; y++) {
        for (let x = 0; x < def.width; x++) {
            const pos = new Vector2Int(x, y);
            const tileDef = def.tiles.find((t) => t.x === x && t.y === y);
            const tile = tileDef
                ? createTile(tileDef.type, pos)
                : createTile("StandardTile", pos);
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

    let piece = createPiece(def.type, color, pos);

    // Wrap in decorators if any
    console.log(`[MapLoader] Applying decorators to ${piece.name}:`, def.decorators);
    for (const deco of def.decorators) {
        piece = applyDecorator(deco, piece);
    }

    return piece;
}
