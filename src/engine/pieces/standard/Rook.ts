import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { PieceBase } from "../PieceBase";
import { MovementHelper } from "../MovementHelper";

export class Rook extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Rook", owner, position);
    }

    getValue(): number {
        return 5;
    }

    getPseudoLegalMoves(state: GameState): Move[] {
        return MovementHelper.getSlidingMoves(
            this,
            state,
            new Vector2Int(1, 0),
            new Vector2Int(-1, 0),
            new Vector2Int(0, 1),
            new Vector2Int(0, -1)
        );
    }
}
