/**
 * Roguelike Chess Game Frontend
 *
 * Integrates the rogue state machine with React and the 3D chess board view.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
  useMemo,
} from "react";
import {
  createRogueActor,
  RogueActor,
  RogueSnapshot,
} from "../../rogue-manager/rogueMachine";
import { EngineProvider } from "../chess/EngineContext";
import { Board3DView } from "../chess3d";
import { DebugPanel } from "../chess/DebugPanel";
import {
  ChessManagerBundle,
  notifySubscribers,
} from "../chess/chessManagerAdapter";
import { Move } from "../../chess-engine/primitives/Move";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { LastPieceStandingRuleSet } from "../../catalog/rulesets/LastPieceStanding";
import { Piece } from "../../catalog/pieces/Piece";
import {
  iconForPiece,
  iconForAbility,
  abilityIdsForPiece,
  PieceId,
} from "../../catalog/registry/Catalog";
import {
  ShopOffer,
  MAX_ROSTER_SIZE,
  getPieceSellValue,
} from "../../rogue-manager/shop/shop";
import { Button, Text, IconButton } from "../ui";
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

interface RogueAppProps {
  onModeChange?: (mode: "builder" | "play" | "rogue") => void;
}

export const RogueApp: React.FC<RogueAppProps> = ({ onModeChange }) => {
  const [actor] = useState(() => {
    const a = createRogueActor();
    a.start();
    return a;
  });

  const snapshot = useRogueActor(actor);

  useEffect(() => {
    return () => {
      actor.stop();
    };
  }, [actor]);

  const [debugOpen, setDebugOpen] = useState(false);

  const handleGoToShop = useCallback(
    () => actor.send({ type: "GO_TO_SHOP" }),
    [actor]
  );
  const handleGoToEncounter = useCallback(
    () => actor.send({ type: "GO_TO_ENCOUNTER" }),
    [actor]
  );
  const handleBuyPiece = useCallback(
    (pieceIndex: number) => actor.send({ type: "BUY_PIECE", pieceIndex }),
    [actor]
  );
  const handleBuyDecorator = useCallback(
    (decoratorIndex: number, targetPieceId: string) =>
      actor.send({ type: "BUY_DECORATOR", decoratorIndex, targetPieceId }),
    [actor]
  );
  const handleSellPiece = useCallback(
    (pieceId: string) => actor.send({ type: "SELL_PIECE", pieceId }),
    [actor]
  );
  const handleLeaveShop = useCallback(
    () => actor.send({ type: "LEAVE_SHOP" }),
    [actor]
  );
  const handleSurrender = useCallback(
    () => actor.send({ type: "SURRENDER" }),
    [actor]
  );
  const handleRestart = useCallback(
    () => actor.send({ type: "RESTART" }),
    [actor]
  );
  const handlePlayerMove = useCallback(
    (move: Move) => {
      actor.send({ type: "PLAYER_MOVE", move });
    },
    [actor]
  );

  const stateValue = snapshot.value;
  const isMap = stateValue === "map";
  const isShop = stateValue === "shop";
  const isGameOver = stateValue === "gameOver";
  const isEncounter =
    typeof stateValue === "object" && "encounter" in stateValue;

  return (
    <div className="rogue-app">
      <header className="rogue-header">
        <div className="rogue-header__left">
          <Text as="h1" variant="heading" className="rogue-title">
            Roguelike Chess
          </Text>
        </div>
        <div className="rogue-header__right">
          <div className="rogue-stats">
            <div className="rogue-stat rogue-stat--gold">
              <span className="rogue-stat__icon">💰</span>
              <span className="rogue-stat__value">
                ${snapshot.context.money}
              </span>
            </div>
            <div className="rogue-stat">
              <span className="rogue-stat__icon">⚔️</span>
              <span className="rogue-stat__value">
                {snapshot.context.roster.length} pieces
              </span>
            </div>
            <button
              className="rogue-stat rogue-stat--surrender"
              onClick={handleSurrender}
            >
              <span className="rogue-stat__icon">🏳️</span>
              <span className="rogue-stat__value">Surrender</span>
            </button>
          </div>
          {isEncounter && (
            <IconButton
              variant={debugOpen ? "solid" : "ghost"}
              size="sm"
              onClick={() => setDebugOpen(!debugOpen)}
              title="Toggle Debug Panel"
            >
              🐛
            </IconButton>
          )}
          {onModeChange && (
            <div className="rogue-nav">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onModeChange("builder")}
              >
                🗺️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onModeChange("play")}
              >
                ▶️
              </Button>
            </div>
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
            onBuyPiece={handleBuyPiece}
            onBuyDecorator={handleBuyDecorator}
            onSellPiece={handleSellPiece}
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

        {isGameOver && <GameOverView onRestart={handleRestart} />}
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

const MapView: React.FC<MapViewProps> = ({
  roster,
  onGoToShop,
  onGoToEncounter,
}) => {
  return (
    <div className="map-view">
      <div className="map-content">
        <Text as="h2" variant="heading" align="center" className="map-title">
          Choose Your Path
        </Text>

        <div className="roster-section">
          <Text
            as="h3"
            variant="caption"
            color="muted"
            className="roster-label"
          >
            YOUR ARMY
          </Text>
          <div className="roster-grid">
            {roster.map((piece) => (
              <PieceCard key={piece.id} piece={piece} />
            ))}
            {roster.length === 0 && (
              <Text color="muted" className="roster-empty">
                No pieces remaining!
              </Text>
            )}
          </div>
        </div>

        <div className="path-choices">
          <button
            className="path-button path-button--shop"
            onClick={onGoToShop}
          >
            <span className="path-button__icon">🏪</span>
            <span className="path-button__label">Visit Shop</span>
            <span className="path-button__hint">Buy pieces or decorators</span>
          </button>

          <button
            className="path-button path-button--battle"
            onClick={onGoToEncounter}
            disabled={roster.length === 0}
          >
            <span className="path-button__icon">⚔️</span>
            <span className="path-button__label">Battle!</span>
            <span className="path-button__hint">Win to earn $1</span>
          </button>
        </div>
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
  offer: ShopOffer | null;
  onBuyPiece: (pieceIndex: number) => void;
  onBuyDecorator: (decoratorIndex: number, targetPieceId: string) => void;
  onSellPiece: (pieceId: string) => void;
  onLeave: () => void;
}

const ShopView: React.FC<ShopViewProps> = ({
  money,
  roster,
  offer,
  onBuyPiece,
  onBuyDecorator,
  onSellPiece,
  onLeave,
}) => {
  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.name.localeCompare(b.name)),
    [roster]
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(
    () => sortedRoster[0]?.id ?? null
  );

  useEffect(() => {
    if (!selectedTargetId && sortedRoster.length > 0) {
      setSelectedTargetId(sortedRoster[0].id);
    } else if (
      selectedTargetId &&
      !sortedRoster.some((p) => p.id === selectedTargetId)
    ) {
      setSelectedTargetId(sortedRoster[0]?.id ?? null);
    }
  }, [sortedRoster, selectedTargetId]);

  const hasOffers =
    !!offer && (offer.pieces.length > 0 || offer.decorators.length > 0);
  const canBuyPieceOffer = (idx: number) =>
    !!offer &&
    !!offer.pieces[idx] &&
    money >= offer.pieces[idx].cost &&
    roster.length < MAX_ROSTER_SIZE;
  const canBuyDecoratorOffer = (idx: number) =>
    !!offer &&
    !!offer.decorators[idx] &&
    selectedTargetId !== null &&
    roster.length > 0 &&
    money >= offer.decorators[idx].cost;

  return (
    <div className="shop-view">
      <div className="shop-card">
        <div className="shop-header">
          <Text as="h2" variant="heading">
            🏪 Shop
          </Text>
        </div>

        <div className="shop-info">
          <div className="shop-info__item">
            <Text variant="caption" color="muted">
              YOUR MONEY
            </Text>
            <Text variant="subheading" color="success">
              ${money}
            </Text>
          </div>
          <div className="shop-info__item">
            <Text variant="caption" color="muted">
              ROSTER
            </Text>
            <Text variant="subheading">
              {roster.length}/{MAX_ROSTER_SIZE}
            </Text>
          </div>
        </div>

        {hasOffers ? (
          <>
            <div className="shop-section">
              <Text
                variant="caption"
                color="muted"
                className="shop-section__label"
              >
                YOUR ROSTER
              </Text>
              {sortedRoster.length === 0 ? (
                <Text color="muted" className="shop-empty">
                  No pieces to sell.
                </Text>
              ) : (
                <div className="roster-selector">
                  {sortedRoster.map((piece) => {
                    const isSelected = selectedTargetId === piece.id;
                    const sellValue = getPieceSellValue(piece);
                    const isKing = piece.name === "King";
                    return (
                      <div
                        key={piece.id}
                        className={`roster-select-card ${isSelected ? "selected" : ""}`}
                      >
                        <button
                          className={`roster-select ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedTargetId(piece.id)}
                        >
                          <PieceCard piece={piece} />
                        </button>
                        {isSelected && !isKing && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onSellPiece(piece.id)}
                          >
                            Sell (${sellValue})
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shop-section">
              <Text
                variant="caption"
                color="muted"
                className="shop-section__label"
              >
                PIECES FOR SALE
              </Text>
              <div className="shop-offers">
                {offer?.pieces.map((pieceOffer, idx) => (
                  <div className="shop-offer" key={pieceOffer.id}>
                    <PieceCard piece={pieceOffer.piece} showDetails size="lg" />
                    <div className="shop-offer__price">
                      <Text variant="subheading" color="warning">
                        ${pieceOffer.cost}
                      </Text>
                    </div>
                    <Button
                      variant="success"
                      size="md"
                      onClick={() => onBuyPiece(idx)}
                      disabled={!canBuyPieceOffer(idx)}
                    >
                      {canBuyPieceOffer(idx)
                        ? "Buy Piece"
                        : roster.length >= MAX_ROSTER_SIZE
                          ? "Roster Full!"
                          : "Not Enough Money"}
                    </Button>
                  </div>
                ))}
                {offer?.pieces.length === 0 && (
                  <Text color="muted" className="shop-empty">
                    No pieces left to purchase.
                  </Text>
                )}
              </div>
            </div>

            <div className="shop-section">
              <Text
                variant="caption"
                color="muted"
                className="shop-section__label"
              >
                DECORATORS (select a piece above)
              </Text>
              <div className="shop-offers">
                {offer?.decorators.map((decoratorOffer, idx) => {
                  const canBuy = canBuyDecoratorOffer(idx);
                  return (
                    <div className="shop-offer" key={decoratorOffer.id}>
                      <div className="decorator-card">
                        <span className="decorator-card__icon">
                          {iconForAbility(decoratorOffer.abilityId)}
                        </span>
                        <Text variant="body" className="decorator-card__name">
                          {decoratorOffer.abilityId}
                        </Text>
                      </div>
                      <div className="shop-offer__price">
                        <Text variant="subheading" color="warning">
                          ${decoratorOffer.cost}
                        </Text>
                      </div>
                      <Button
                        variant="success"
                        size="md"
                        onClick={() =>
                          selectedTargetId &&
                          onBuyDecorator(idx, selectedTargetId)
                        }
                        disabled={!canBuy}
                      >
                        {selectedTargetId
                          ? canBuy
                            ? "Buy Decorator"
                            : "Not Enough Money"
                          : "Select a Target"}
                      </Button>
                    </div>
                  );
                })}
                {offer?.decorators.length === 0 && (
                  <Text color="muted" className="shop-empty">
                    No decorators left to purchase.
                  </Text>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="shop-empty-state">
            <Text color="muted">You already bought from this shop!</Text>
            <Text variant="caption" color="muted">
              Win an encounter to refresh.
            </Text>
          </div>
        )}

        <Button variant="ghost" onClick={onLeave} className="shop-leave-btn">
          ← Leave Shop
        </Button>
      </div>
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

const EncounterView: React.FC<EncounterViewProps> = ({
  snapshot,
  onPlayerMove,
  debugOpen,
  onDebugToggle,
}) => {
  const { chessManager } = snapshot.context;

  const onPlayerMoveRef = useRef(onPlayerMove);
  onPlayerMoveRef.current = onPlayerMove;

  const bundleManagerRef = useRef<typeof chessManager>(null);
  const [bundle, setBundle] = useState<ChessManagerBundle | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
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
        onPlayerMoveRef.current(move);
        setTimeout(() => {
          notifySubscribers();
          forceUpdate((n) => n + 1);
        }, 100);
      },
      undo: () => {
        /* not supported in rogue mode */
      },
      redo: () => {
        /* not supported in rogue mode */
      },
    };

    setBundle(newBundle);
  }, [chessManager]);

  if (!chessManager || !bundle) {
    return (
      <div className="encounter-loading">
        <Text variant="subheading" color="muted">
          Loading encounter...
        </Text>
      </div>
    );
  }

  const currentPlayer = chessManager.currentState.currentPlayer;
  const isPlayerTurn = currentPlayer === PlayerColor.White;
  const turnNumber = chessManager.currentState.turnNumber;

  return (
    <div className="encounter-view">
      <div className="encounter-hud">
        <div
          className={`turn-indicator ${isPlayerTurn ? "turn-indicator--player" : "turn-indicator--enemy"}`}
        >
          {isPlayerTurn ? "Your Turn" : "Enemy Turn..."}
        </div>
        <div className="turn-counter">Turn {turnNumber}</div>
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
      <div className="gameover-card">
        <div className="gameover-icon">💀</div>
        <Text as="h2" variant="heading" className="gameover-title">
          Game Over
        </Text>
        <Text color="muted" className="gameover-message">
          You lost all your pieces!
        </Text>
        <Button variant="primary" size="lg" onClick={onRestart}>
          Start New Run
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// Piece Card Component
// =============================================================================

interface PieceCardProps {
  piece: Piece;
  showDetails?: boolean;
  size?: "sm" | "lg";
}

const PieceCard: React.FC<PieceCardProps> = ({
  piece,
  showDetails = false,
  size = "sm",
}) => {
  const abilities = abilityIdsForPiece(piece);
  const pieceName = piece.name;
  const pieceIcon = `/assets/${iconForPiece(pieceName as PieceId)}-w.svg`;

  return (
    <div className={`piece-card ${size === "lg" ? "piece-card--lg" : ""}`}>
      <img
        src={pieceIcon}
        alt={pieceName}
        className="piece-card__icon"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="piece-card__info">
        <span className="piece-card__name">{pieceName}</span>
        {abilities.length > 0 && (
          <span className="piece-card__abilities">
            {abilities.map((a) => iconForAbility(a)).join(" ")}
          </span>
        )}
      </div>
      {showDetails && (
        <span className="piece-card__value">Value: {piece.getValue()}</span>
      )}
    </div>
  );
};

export default RogueApp;
