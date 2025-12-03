import { PlayerColor } from "../../../chess-engine/primitives/PlayerColor";
import { Vector2Int } from "../../../chess-engine/primitives/Vector2Int";
import { GameState } from "../../../chess-engine/state/GameState";
import { PieceBase } from "../PieceBase";
import { CandidateMoves, MovementPatterns } from "../../../chess-engine/rules/MovementPatterns";

export class King extends PieceBase {
    constructor(owner: PlayerColor, position: Vector2Int) {
        super("King", owner, position);
    }

    getValue(): number {
        return 100000; // very high value
    }

    getCandidateMoves(state: GameState): CandidateMoves {
        return MovementPatterns.getJumpMoves(
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

