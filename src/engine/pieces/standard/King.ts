import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { PieceBase } from "../PieceBase";
import { MovementHelper } from "../MovementHelper";

export class King extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("King", owner, position);
    }

    getValue(): number {
        return 100000; // very high value
    }

    getPseudoLegalMoves(state: GameState): Move[] {
        return MovementHelper.getJumpMoves(
            this,
            state,
            new Vector2Int(1, 1),
            new Vector2Int(1, 0),
            new Vector2Int(1, -1),
            new Vector2Int(0, 1),
            new Vector2Int(0, -1),
            new Vector2Int(-1, 1),
            new Vector2Int(-1, 0),
            new Vector2Int(-1, -1)
        );
    }
}
