import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { PieceBase } from "../PieceBase";
import { MovementHelper } from "../MovementHelper";

export class Queen extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Queen", owner, position);
    }

    getValue(): number {
        return 9;
    }

    getPseudoLegalMoves(state: GameState): Move[] {
        return MovementHelper.getSlidingMoves(
            this,
            state,
            // rook-like
            new Vector2Int(1, 0),
            new Vector2Int(-1, 0),
            new Vector2Int(0, 1),
            new Vector2Int(0, -1),
            // bishop-like
            new Vector2Int(1, 1),
            new Vector2Int(1, -1),
            new Vector2Int(-1, 1),
            new Vector2Int(-1, -1)
        );
    }
}
