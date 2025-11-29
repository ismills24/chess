import React, { useState } from "react";
import { useEngine, useEngineState } from "./EngineContext";
import { GameEvent, MoveEvent, CaptureEvent, DestroyEvent, TurnStartEvent, TurnEndEvent, TurnAdvancedEvent, TileChangedEvent, PieceChangedEvent } from "../../engine/events/GameEvent";
import { TurnMetrics } from "../../engine/core/GameEngine";

export const DebugPanel: React.FC = () => {
    const { engine } = useEngine();
    // Subscribe to state changes to trigger re-render when turns complete
    useEngineState();
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null);
    
    const turnHistory = (engine as any).turnMetricsHistory || [];
    const lastMetrics = (engine as any).lastTurnMetrics;
    
    // Default to showing the last turn, or allow selection
    const metrics = selectedTurnIndex !== null && turnHistory[selectedTurnIndex]
        ? turnHistory[selectedTurnIndex]
        : lastMetrics;
    
    if (!metrics) {
        return (
            <div style={{
                position: "fixed",
                bottom: 0,
                right: 0,
                width: "300px",
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
                border: "1px solid #3e3e3e",
                fontSize: "12px",
                zIndex: 1000,
            }}>
                <div
                    style={{
                        padding: "8px",
                        cursor: "pointer",
                        backgroundColor: "#252526",
                        borderBottom: "1px solid #3e3e3e",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <strong>Debug Panel</strong>
                    <span>{isExpanded ? "▼" : "▶"}</span>
                </div>
                {isExpanded && (
                    <div style={{ padding: "8px" }}>
                        <div style={{ color: "#858585" }}>No turn data yet</div>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            width: "400px",
            maxHeight: "60vh",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            border: "1px solid #3e3e3e",
            fontSize: "12px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
        }}>
            <div
                style={{
                    padding: "8px",
                    cursor: "pointer",
                    backgroundColor: "#252526",
                    borderBottom: "1px solid #3e3e3e",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <strong>Debug Panel</strong>
                <span>{isExpanded ? "▼" : "▶"}</span>
            </div>
            
            {isExpanded && (
                <div style={{
                    padding: "8px",
                    overflowY: "auto",
                    flex: 1,
                }}>
                    {/* Turn Selection */}
                    {turnHistory.length > 1 && (
                        <div style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #3e3e3e" }}>
                            <div style={{ marginBottom: "6px", fontSize: "11px", color: "#858585" }}>
                                View Turn:
                            </div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                {turnHistory.map((tm: TurnMetrics, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedTurnIndex(selectedTurnIndex === idx ? null : idx)}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                            backgroundColor: selectedTurnIndex === idx ? "#007acc" : "#252526",
                                            color: "#d4d4d4",
                                            border: "1px solid #3e3e3e",
                                            borderRadius: "3px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        T{tm.turnNumber} {tm.player[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Turn Summary */}
                    {metrics && (
                        <>
                            <div style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #3e3e3e" }}>
                                <div style={{ marginBottom: "4px" }}>
                                    <strong style={{ color: "#4ec9b0" }}>Turn {metrics.turnNumber}</strong>
                                    <span style={{ marginLeft: "8px", color: "#858585" }}>
                                        ({metrics.player})
                                    </span>
                                </div>
                                {metrics.playerMoveIntent && (
                                    <div style={{ 
                                        marginBottom: "8px", 
                                        padding: "6px", 
                                        backgroundColor: "#252526", 
                                        borderRadius: "4px",
                                        borderLeft: "3px solid #4ec9b0",
                                    }}>
                                        <div style={{ fontSize: "10px", color: "#858585", marginBottom: "2px" }}>
                                            Player Intent:
                                        </div>
                                        <div style={{ color: "#4ec9b0", fontWeight: "bold" }}>
                                            {metrics.playerMoveIntent.piece.name} {metrics.playerMoveIntent.from.toString()} → {metrics.playerMoveIntent.to.toString()}
                                            {metrics.playerMoveIntent.isCapture && (
                                                <span style={{ color: "#f48771", marginLeft: "4px" }}>(Capture)</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div style={{ color: "#ce9178" }}>
                                    Processing Time: <strong>{metrics.processingTimeMs.toFixed(2)}ms</strong>
                                </div>
                                <div style={{ color: "#858585", marginTop: "4px" }}>
                                    {metrics.canonicalEvents.length} canonical event(s)
                                </div>
                            </div>
                    
                            {/* Canonical Events List */}
                            <div style={{ marginBottom: "12px" }}>
                                <strong style={{ color: "#4ec9b0", display: "block", marginBottom: "6px" }}>
                                    Canonical Events (in order):
                                </strong>
                                <div style={{
                                    backgroundColor: "#252526",
                                    borderRadius: "4px",
                                    padding: "8px",
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                }}>
                                    {metrics.canonicalEvents.length === 0 ? (
                                        <div style={{ color: "#858585", fontStyle: "italic" }}>
                                            No events applied
                                        </div>
                                    ) : (
                                        metrics.canonicalEvents.map((ev: GameEvent, idx: number) => (
                                            <EventItem key={`${ev.id}-${idx}`} event={ev} index={idx} />
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            {/* Final State Summary */}
                            <div>
                                <strong style={{ color: "#4ec9b0", display: "block", marginBottom: "6px" }}>
                                    Final State:
                                </strong>
                                <div style={{
                                    backgroundColor: "#252526",
                                    borderRadius: "4px",
                                    padding: "8px",
                                    fontSize: "11px",
                                }}>
                                    <div>Player: {metrics.finalState.currentPlayer}</div>
                                    <div>Turn: {metrics.finalState.turnNumber}</div>
                                    <div>
                                        Pieces: {metrics.finalState.board.getAllPieces().length}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const EventItem: React.FC<{ event: GameEvent; index: number }> = ({ event, index }) => {
    const getEventColor = (ev: GameEvent): string => {
        if (ev instanceof MoveEvent) return "#4ec9b0";
        if (ev instanceof CaptureEvent) return "#f48771";
        if (ev instanceof DestroyEvent) return "#ce9178";
        if (ev instanceof TurnStartEvent || ev instanceof TurnEndEvent) return "#569cd6";
        if (ev instanceof TurnAdvancedEvent) return "#c586c0";
        if (ev instanceof TileChangedEvent) return "#dcdcaa";
        if (ev instanceof PieceChangedEvent) return "#9cdcfe";
        return "#d4d4d4";
    };
    
    const getEventDetails = (ev: GameEvent): string => {
        if (ev instanceof MoveEvent) {
            return `${ev.piece.name} ${ev.from.toString()} → ${ev.to.toString()}`;
        }
        if (ev instanceof CaptureEvent) {
            return `${ev.attacker.name} captures ${ev.target.name}`;
        }
        if (ev instanceof DestroyEvent) {
            return `Destroy ${ev.target.name}: ${ev.description.split(": ")[1] || "unknown"}`;
        }
        if (ev instanceof TurnStartEvent) {
            return `Turn ${ev.turnNumber} start (${ev.player})`;
        }
        if (ev instanceof TurnEndEvent) {
            return `Turn ${ev.turnNumber} end (${ev.player})`;
        }
        if (ev instanceof TurnAdvancedEvent) {
            return `Turn ${ev.turnNumber} → ${ev.nextPlayer}`;
        }
        if (ev instanceof TileChangedEvent) {
            return `Tile at ${ev.position.toString()} → ${ev.newTile.constructor.name}`;
        }
        if (ev instanceof PieceChangedEvent) {
            return `${ev.oldPiece.name} → ${ev.newPiece.name} at ${ev.position.toString()}`;
        }
        return ev.description;
    };
    
    // Determine if this is a chain reaction (not the initial player move)
    const isChainReaction = (ev: GameEvent): boolean => {
        if (!(ev instanceof MoveEvent)) return false;
        if (!ev.isPlayerAction) return false;
        // If sourceId is empty, it's the initial player move
        if (!ev.sourceId || ev.sourceId === "") return false;
        // If sourceId matches the piece ID, it's the initial move
        if (ev.sourceId === ev.piece.id) return false;
        // If sourceId contains tile/decorator identifiers, it's a chain reaction
        const sourceLower = ev.sourceId.toLowerCase();
        return sourceLower.includes("slippery") || 
               sourceLower.includes("exploding") || 
               sourceLower.includes("bouncer") ||
               sourceLower.includes("marksman") ||
               sourceLower.includes("tile") ||
               sourceLower.includes("decorator");
    };
    
    const eventType = event.constructor.name;
    const color = getEventColor(event);
    const details = getEventDetails(event);
    const isChain = isChainReaction(event);
    
    return (
        <div style={{
            marginBottom: "6px",
            padding: "6px",
            backgroundColor: "#1e1e1e",
            borderRadius: "3px",
            borderLeft: `3px solid ${color}`,
            opacity: isChain ? 0.85 : 1,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", alignItems: "center" }}>
                <span style={{ color, fontWeight: "bold" }}>
                    [{index}] {eventType}
                </span>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {isChain && (
                        <span style={{ 
                            color: "#dcdcaa", 
                            fontSize: "9px",
                            backgroundColor: "#3e3e3e",
                            padding: "2px 4px",
                            borderRadius: "2px",
                        }}>
                            CHAIN
                        </span>
                    )}
                    {event.isPlayerAction && !isChain && (
                        <span style={{ color: "#4ec9b0", fontSize: "10px", fontWeight: "bold" }}>
                            PLAYER
                        </span>
                    )}
                </div>
            </div>
            <div style={{ color: "#d4d4d4", fontSize: "11px", marginLeft: "8px" }}>
                {details}
            </div>
            {event.sourceId && (
                <div style={{ color: "#858585", fontSize: "10px", marginLeft: "8px", marginTop: "2px" }}>
                    source: {isChain ? (
                        <span style={{ color: "#dcdcaa" }}>
                            {event.sourceId.includes("slippery") ? "SlipperyTile" :
                             event.sourceId.includes("exploding") ? "ExplodingDecorator" :
                             event.sourceId.includes("bouncer") ? "BouncerDecorator" :
                             event.sourceId.substring(0, 16)}...
                        </span>
                    ) : (
                        event.sourceId.substring(0, 16) + "..."
                    )}
                </div>
            )}
        </div>
    );
};

