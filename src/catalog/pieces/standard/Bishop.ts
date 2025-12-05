import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { PieceBase } from "../PieceBase";
import { CandidateMoves, MovementPatterns } from "../../../chess-engine/rules/MovementPatterns";

export class Bishop extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Bishop", owner, position);
    }

    getValue(): number {
        return 3;
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        return MovementPatterns.getSlidingMoves(
            this,
            state,
            new Vector2Int(1, 1),
            new Vector2Int(1, -1),
            new Vector2Int(-1, 1),
            new Vector2Int(-1, -1)
        );
    }
}


