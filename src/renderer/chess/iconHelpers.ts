import { Piece } from "../../engine/pieces/Piece";
import { Tile } from "../../engine/tiles/Tile";
import { PieceDecoratorBase } from "../../engine/pieces/decorators/PieceDecoratorBase";
import { MarksmanDecorator } from "../../engine/pieces/decorators/MarksmanDecorator";
import { ExplodingDecorator } from "../../engine/pieces/decorators/ExplodingDecorator";
import { ScapegoatDecorator } from "../../engine/pieces/decorators/ScapegoatDecorator";
import { PiercingDecorator } from "../../engine/pieces/decorators/PiercingDecorator";
import { BouncerDecorator } from "../../engine/pieces/decorators/BouncerDecorator";
import { GuardianTile } from "../../engine/tiles/GuardianTile";
import { SlipperyTile } from "../../engine/tiles/SlipperyTile";
import { StandardTile } from "../../engine/tiles/StandardTile";
import { DecoratorId, TileId } from "../mapbuilder/types";

export function getDecoratorIds(piece: Piece): DecoratorId[] {
    const ids: DecoratorId[] = [];
    let current: any = piece;
    while (true) {
        if (current instanceof MarksmanDecorator) ids.push("Marksman");
        if (current instanceof ExplodingDecorator) ids.push("Exploding");
        if (current instanceof ScapegoatDecorator) ids.push("Scapegoat");
        if (current instanceof PiercingDecorator) ids.push("Piercing");
        if (current instanceof BouncerDecorator) ids.push("Bouncer");

        if (current instanceof PieceDecoratorBase) {
            current = current.innerPiece;
            continue;
        }
        break;
    }
    return ids;
}

export function getTileId(tile: Tile): TileId {
    if (tile instanceof GuardianTile) return "GuardianTile";
    if (tile instanceof SlipperyTile) return "SlipperyTile";
    return "StandardTile";
}


