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
    createShopOffer,
    canBuyPiece,
    buyPiece,
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

