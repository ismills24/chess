/**
 * Roguelike Chess Game Frontend
 * 
 * Integrates the rogue state machine with React and the 3D chess board view.
 */

import React, { useState, useEffect, useCallback, useSyncExternalStore, useRef } from "react";
import { createRogueActor, RogueActor, RogueSnapshot } from "../../rogue-manager/rogueMachine";
import { EngineProvider } from "../chess/EngineContext";
import { Board3DView } from "../chess3d";
import { DebugPanel } from "../chess/DebugPanel";
import { ChessManagerBundle, notifySubscribers } from "../chess/chessManagerAdapter";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { LastPieceStandingRuleSet } from "../../catalog/rulesets/LastPieceStanding";
import { Piece } from "../../catalog/pieces/Piece";
import { iconForPiece, iconForAbility, abilityIdsForPiece, PieceId } from "../../catalog/registry/Catalog";
import "./rogue.css";

// =============================================================================
// Hook to use xState actor in React
// =============================================================================

function useRogueActor(actor: RogueActor): RogueSnapshot {
    const subscribe = useCallback(
        (callback: () => void) => {
            const subscription = actor.subscribe(callback);
            return () => subscription.unsubscribe();
        },
        [actor]
    );

    const getSnapshot = useCallback(() => actor.getSnapshot(), [actor]);

    return useSyncExternalStore(subscribe, getSnapshot);
}

// =============================================================================
// Main App Component
// =============================================================================

export const RogueApp: React.FC = () => {
    // Create actor once on mount
    const [actor] = useState(() => {
        const a = createRogueActor();
        a.start();
        return a;
    });

    const snapshot = useRogueActor(actor);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            actor.stop();
        };
    }, [actor]);

    // Debug panel state (lifted to app level so toggle can be in header)
    const [debugOpen, setDebugOpen] = useState(false);

    // Memoize event handlers to prevent infinite re-renders
    const handleGoToShop = useCallback(() => actor.send({ type: "GO_TO_SHOP" }), [actor]);
    const handleGoToEncounter = useCallback(() => actor.send({ type: "GO_TO_ENCOUNTER" }), [actor]);
    const handleBuy = useCallback(() => actor.send({ type: "BUY_PIECE" }), [actor]);
    const handleLeaveShop = useCallback(() => actor.send({ type: "LEAVE_SHOP" }), [actor]);
    const handleRestart = useCallback(() => actor.send({ type: "RESTART" }), [actor]);
    const handlePlayerMove = useCallback((move: Move) => {
        actor.send({ type: "PLAYER_MOVE", move });
    }, [actor]);

    // Determine current state
    const stateValue = snapshot.value;
    const isMap = stateValue === "map";
    const isShop = stateValue === "shop";
    const isGameOver = stateValue === "gameOver";
    const isEncounter = typeof stateValue === "object" && "encounter" in stateValue;

    return (
        <div className="rogue-app">
            <header className="rogue-header">
                <h1>Roguelike Chess</h1>
                <div className="rogue-stats">
                    <span className="stat">💰 ${snapshot.context.money}</span>
                    <span className="stat">⚔️ {snapshot.context.roster.length} pieces</span>
                    {isEncounter && (
                        <button 
                            className={`stat debug-toggle ${debugOpen ? 'active' : ''}`}
                            onClick={() => setDebugOpen(!debugOpen)}
                        >
                            🐛 Debug
                        </button>
                    )}
                </div>
            </header>

            <main className="rogue-main">
                {isMap && (
                    <MapView
                        roster={snapshot.context.roster}
                        money={snapshot.context.money}
                        onGoToShop={handleGoToShop}
                        onGoToEncounter={handleGoToEncounter}
                    />
                )}

                {isShop && (
                    <ShopView
                        money={snapshot.context.money}
                        roster={snapshot.context.roster}
                        offer={snapshot.context.shopOffer}
                        onBuy={handleBuy}
                        onLeave={handleLeaveShop}
                    />
                )}

                {isEncounter && (
                    <EncounterView
                        snapshot={snapshot}
                        onPlayerMove={handlePlayerMove}
                        debugOpen={debugOpen}
                        onDebugToggle={() => setDebugOpen(!debugOpen)}
                    />
                )}

                {isGameOver && (
                    <GameOverView
                        onRestart={handleRestart}
                    />
                )}
            </main>
        </div>
    );
};

// =============================================================================
// Map View
// =============================================================================

interface MapViewProps {
    roster: Piece[];
    money: number;
    onGoToShop: () => void;
    onGoToEncounter: () => void;
}

const MapView: React.FC<MapViewProps> = ({ roster, money, onGoToShop, onGoToEncounter }) => {
    return (
        <div className="map-view">
            <h2>Choose Your Path</h2>
            
            <div className="roster-preview">
                <h3>Your Army</h3>
                <div className="roster-pieces">
                    {roster.map((piece, i) => (
                        <PieceCard key={piece.id} piece={piece} />
                    ))}
                    {roster.length === 0 && (
                        <p className="empty-roster">No pieces remaining!</p>
                    )}
                </div>
            </div>

            <div className="map-choices">
                <button 
                    className="map-button shop-button"
                    onClick={onGoToShop}
                >
                    <span className="button-icon">🏪</span>
                    <span className="button-text">Visit Shop</span>
                    <span className="button-hint">Buy new pieces ($1 each)</span>
                </button>

                <button 
                    className="map-button encounter-button"
                    onClick={onGoToEncounter}
                    disabled={roster.length === 0}
                >
                    <span className="button-icon">⚔️</span>
                    <span className="button-text">Battle!</span>
                    <span className="button-hint">Win to earn $1</span>
                </button>
            </div>
        </div>
    );
};

// =============================================================================
// Shop View
// =============================================================================

interface ShopViewProps {
    money: number;
    roster: Piece[];
    offer: { piece: Piece; cost: number } | null;
    onBuy: () => void;
    onLeave: () => void;
}

const ShopView: React.FC<ShopViewProps> = ({ money, roster, offer, onBuy, onLeave }) => {
    const canBuy = money >= 1 && roster.length < 6 && offer !== null;

    return (
        <div className="shop-view">
            <h2>🏪 Shop</h2>
            
            <div className="shop-info">
                <p>Your Money: <strong>${money}</strong></p>
                <p>Roster Size: <strong>{roster.length}/6</strong></p>
            </div>

            {offer ? (
                <div className="shop-offer">
                    <h3>Today's Offer</h3>
                    <PieceCard piece={offer.piece} showDetails />
                    <p className="offer-cost">Cost: ${offer.cost}</p>
                    
                    <button 
                        className="buy-button"
                        onClick={onBuy}
                        disabled={!canBuy}
                    >
                        {canBuy 
                            ? "Buy Piece" 
                            : roster.length >= 6 
                                ? "Roster Full!" 
                                : "Not Enough Money"}
                    </button>
                </div>
            ) : (
                <div className="shop-empty">
                    <p>You already bought from this shop!</p>
                    <p>Win an encounter to refresh the shop.</p>
                </div>
            )}

            <button className="leave-button" onClick={onLeave}>
                Leave Shop
            </button>
        </div>
    );
};

// =============================================================================
// Encounter View
// =============================================================================

interface EncounterViewProps {
    snapshot: RogueSnapshot;
    onPlayerMove: (move: Move) => void;
    debugOpen: boolean;
    onDebugToggle: () => void;
}

const EncounterView: React.FC<EncounterViewProps> = ({ snapshot, onPlayerMove, debugOpen, onDebugToggle }) => {
    const { chessManager } = snapshot.context;
    
    // Use ref to store the callback without triggering re-renders
    const onPlayerMoveRef = useRef(onPlayerMove);
    onPlayerMoveRef.current = onPlayerMove;

    // Track which chessManager instance we've created a bundle for
    const bundleManagerRef = useRef<typeof chessManager>(null);
    const [bundle, setBundle] = useState<ChessManagerBundle | null>(null);
    const [, forceUpdate] = useState(0);

    // Create bundle only when chessManager instance changes (new encounter)
    useEffect(() => {
        // If same manager reference, don't recreate
        if (chessManager === bundleManagerRef.current && bundle !== null) {
            return;
        }

        if (!chessManager) {
            setBundle(null);
            bundleManagerRef.current = null;
            return;
        }

        bundleManagerRef.current = chessManager;
        const rules = new LastPieceStandingRuleSet();

        const newBundle: ChessManagerBundle = {
            manager: chessManager,
            getState: () => chessManager.currentState,
            rules,
            submitHumanMove: (move: Move) => {
                // Send the move to the state machine
                onPlayerMoveRef.current(move);
                // Notify subscribers and force re-render after a delay
                setTimeout(() => {
                    notifySubscribers();
                    forceUpdate(n => n + 1);
                }, 100);
            },
            undo: () => {},
            redo: () => {},
        };

        setBundle(newBundle);
    }, [chessManager]);

    if (!chessManager || !bundle) {
        return <div className="encounter-loading">Loading encounter...</div>;
    }

    const currentPlayer = chessManager.currentState.currentPlayer;
    const isPlayerTurn = currentPlayer === PlayerColor.White;
    const turnNumber = chessManager.currentState.turnNumber;

    return (
        <div className="encounter-view">
            <div className="encounter-info">
                <span className={`turn-indicator ${isPlayerTurn ? "player-turn" : "ai-turn"}`}>
                    {isPlayerTurn ? "Your Turn" : "Enemy Turn..."}
                </span>
                <span className="turn-number">Turn {turnNumber}</span>
            </div>

            <div className="encounter-board">
                <EngineProvider existing={bundle}>
                    <Board3DView />
                    <DebugPanel isOpen={debugOpen} onToggle={onDebugToggle} />
                </EngineProvider>
            </div>
        </div>
    );
};

// =============================================================================
// Game Over View
// =============================================================================

interface GameOverViewProps {
    onRestart: () => void;
}

const GameOverView: React.FC<GameOverViewProps> = ({ onRestart }) => {
    return (
        <div className="gameover-view">
            <h2>💀 Game Over</h2>
            <p>You lost all your pieces!</p>
            <button className="restart-button" onClick={onRestart}>
                Start New Run
            </button>
        </div>
    );
};

// =============================================================================
// Piece Card Component
// =============================================================================

interface PieceCardProps {
    piece: Piece;
    showDetails?: boolean;
}

const PieceCard: React.FC<PieceCardProps> = ({ piece, showDetails = false }) => {
    const abilities = abilityIdsForPiece(piece);
    const pieceName = piece.name;
    const pieceIcon = `/assets/${iconForPiece(pieceName as PieceId)}-w.svg`;

    return (
        <div className="piece-card">
            <img 
                src={pieceIcon} 
                alt={pieceName}
                className="piece-icon"
                onError={(e) => {
                    // Fallback if image doesn't load
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <div className="piece-info">
                <span className="piece-name">{pieceName}</span>
                {abilities.length > 0 && (
                    <span className="piece-abilities">
                        {abilities.map(a => iconForAbility(a)).join(" ")}
                    </span>
                )}
            </div>
            {showDetails && (
                <div className="piece-details">
                    <span>Value: {piece.getValue()}</span>
                </div>
            )}
        </div>
    );
};

export default RogueApp;

