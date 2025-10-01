import { PlayerColor } from "../../primitives/PlayerColor";
import { Vector2Int } from "../../primitives/Vector2Int";
import { Move } from "../../primitives/Move";
import { GameState } from "../../state/GameState";
import { PieceBase } from "../PieceBase";
import { CandidateMoves, MovementHelper } from "../MovementHelper";

export class Bishop extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Bishop", owner, position);
    }

    getValue(): number {
        return 3;
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        return MovementHelper.getSlidingMoves(
            this,
            state,
            new Vector2Int(1, 1),
            new Vector2Int(1, -1),
            new Vector2Int(-1, 1),
            new Vector2Int(-1, -1)
        );
    }
}
