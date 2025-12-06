// rogue-manager/index.ts

// State machine
export {
    rogueMachine,
    createRogueActor,
    type RogueContext,
    type RogueEvent,
    type RogueActor,
    type RogueSnapshot,
} from "./rogueMachine";

// Shop utilities
export {
    type ShopOffer,
    type ShopPieceOffer,
    type ShopDecoratorOffer,
    MAX_ROSTER_SIZE,
    createShopOffer,
    canBuyPiece,
    buyPiece,
    canBuyDecorator,
    buyDecorator,
    getPieceSellValue,
    canSellPiece,
    sellPiece,
} from "./shop/shop";

// Encounter utilities
export { generateEnemyRoster } from "./encounter/encounter";
export { generateCombatBoard } from "./encounter/boardGeneration";

// Roster utilities
export { createRandomRosterPiece } from "./util/roster";

// Random utilities
export {
    randomFrom,
    getRandomPieceId,
    getRandomAbilityId,
} from "./util/random";

