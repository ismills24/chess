import { MapDefinition, PlacedPiece } from "../mapbuilder/types";
import { Board } from "../../chess-engine/state/Board";
import { Vector2Int } from "../../chess-engine/primitives/Vector2Int";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { GameState } from "../../chess-engine/state/GameState";
import { createPiece, createTile, applyAbility } from "../../catalog/registry/Catalog";

export function loadMap(def: MapDefinition): GameState {
    // Create board with default tiles
    const board = new Board(def.width, def.height, () => createTile("StandardTile"));

    // Fill board with custom tiles
    // Map builder and game both render from top (y=height-1) to bottom (y=0)
    // and left (x=0) to right (x=width-1), so coordinates should match directly
    // However, if the board appears mirrored horizontally, we need to flip x
    for (const tileDef of def.tiles) {
        // Flip x-axis to fix mirroring: map builder's left becomes game's right
        const x = def.width - 1 - tileDef.x;
        const pos = new Vector2Int(x, tileDef.y);
        const tile = createTile(tileDef.type, pos);
        board.setTile(pos, tile);
    }

    // Place pieces
    for (const pieceDef of def.pieces) {
        // Flip x-axis to fix mirroring: map builder's left becomes game's right
        const x = def.width - 1 - pieceDef.x;
        const pos = new Vector2Int(x, pieceDef.y);
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

    // Wrap in abilities if any (decorators are now called abilities)
    for (const abilityId of def.decorators) {
        piece = applyAbility(abilityId, piece);
    }

    return piece;
}
