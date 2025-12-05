import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { PieceBase } from "../PieceBase";
import { CandidateMoves, MovementPatterns } from "../../../chess-engine/rules/MovementPatterns";

export class Knight extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("Knight", owner, position);
    }

    getValue(): number {
        return 3;
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        return MovementPatterns.getJumpMoves(
            this,
            state,
            new Vector2Int(2, 1),
            new Vector2Int(2, -1),
            new Vector2Int(-2, 1),
            new Vector2Int(-2, -1),
            new Vector2Int(1, 2),
            new Vector2Int(1, -2),
            new Vector2Int(-1, 2),
            new Vector2Int(-1, -2)
        );
    }
}



