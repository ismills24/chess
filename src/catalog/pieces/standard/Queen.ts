import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { PieceBase } from "../PieceBase";
import { CandidateMoves, MovementPatterns } from "../../../chess-engine/rules/MovementPatterns";

export class Queen extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Queen", owner, position);
    }

    getValue(): number {
        return 9;
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        return MovementPatterns.getSlidingMoves(
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



