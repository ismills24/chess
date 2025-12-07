/**
 * 3D Board Editor for Map Builder
 * 
 * A Three.js canvas for visually editing maps with click-to-place and drag-and-drop support.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MapDefinition, PlacedPiece, PlacedTile } from "./types";
import { Tool, DRAG_DATA_TYPE, deserializeTool } from "./Palette";
import { GeometryProvider } from "../chess3d/pieces/GeometryStore";
import { getProceduralPieceComponent } from "../chess3d/pieces/ProceduralPieces";
import { DecoratorIndicator3D } from "../chess3d/DecoratorIndicator3D";
import { getCameraPosition, BoardDimensions, gridToWorld, worldToGrid } from "../chess3d/coordinates";
import { PlayerColor } from "../../chess-engine/primitives/PlayerColor";
import { AbilityId } from "../../catalog/registry/Catalog";

// =============================================================================
// Constants
// =============================================================================

const BOARD_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);

// =============================================================================
// Tile Indicator Component
// =============================================================================

const TILE_INDICATOR_COLORS: Record<string, string> = {
    SlipperyTile: "#00bfff",
    GuardianTile: "#ffd700",
    FogTile: "#666666",
};

interface TileIndicatorProps {
    position: [number, number, number];
    tileType: string;
}

const TileIndicator: React.FC<TileIndicatorProps> = React.memo(({ position, tileType }) => {
    const color = TILE_INDICATOR_COLORS[tileType];
    if (!color) return null;

    if (tileType === "GuardianTile") {
        return (
            <group position={position}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.35, 0.44, 32]} />
                    <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                    <ringGeometry args={[0.28, 0.32, 4]} />
                    <meshBasicMaterial color="#ffee55" transparent opacity={0.9} />
                </mesh>
                <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.12, 16]} />
                    <meshBasicMaterial color="#ffcc00" transparent opacity={0.7} />
                </mesh>
            </group>
        );
    }

    if (tileType === "FogTile") {
        return (
            <group position={position}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.38, 0.45, 6]} />
                    <meshBasicMaterial color={color} transparent opacity={0.6} />
                </mesh>
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.25, 16]} />
                    <meshBasicMaterial color="#444444" transparent opacity={0.4} />
                </mesh>
            </group>
        );
    }

    if (tileType === "SlipperyTile") {
        return (
            <group position={position}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.38, 0.45, 4]} />
                    <meshBasicMaterial color={color} transparent opacity={0.7} />
                </mesh>
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                    <ringGeometry args={[0.2, 0.28, 4]} />
                    <meshBasicMaterial color="#66ddff" transparent opacity={0.5} />
                </mesh>
            </group>
        );
    }

    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.38, 0.45, 4]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
    );
});

// =============================================================================
// Board Mesh Component
// =============================================================================

interface SquareData {
    x: number;
    y: number;
    worldX: number;
    worldZ: number;
    isDark: boolean;
    tileType: string | null;
}

const EditorBoardMesh: React.FC<{
    width: number;
    height: number;
    tiles: PlacedTile[];
    hoveredSquare: { x: number; y: number } | null;
}> = ({ width, height, tiles, hoveredSquare }) => {
    const boardGeometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(width, 0.2, height);
        geo.translate(0, -0.1, 0);
        return geo;
    }, [width, height]);

    const tileSet = useMemo(() => {
        const set = new Map<string, string>();
        tiles.forEach(t => set.set(`${t.x},${t.y}`, t.type));
        return set;
    }, [tiles]);

    const squareData = useMemo<SquareData[]>(() => {
        const data: SquareData[] = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const worldX = x - width / 2 + 0.5;
                const worldZ = y - height / 2 + 0.5;
                data.push({
                    x,
                    y,
                    worldX,
                    worldZ,
                    isDark: (x + y) % 2 === 1,
                    tileType: tileSet.get(`${x},${y}`) ?? null,
                });
            }
        }
        return data;
    }, [width, height, tileSet]);

    const squareMeshes = useMemo(() => {
        return squareData.map(sq => {
            const isHovered = hoveredSquare?.x === sq.x && hoveredSquare?.y === sq.y;
            let color = sq.isDark ? "#b08968" : "#e8d4b8";
            if (sq.tileType) {
                if (sq.tileType === "FogTile") color = "#555555";
                else if (sq.tileType === "GuardianTile") color = "#8b7355";
                else if (sq.tileType === "SlipperyTile") color = "#7ab8d4";
            }
            if (isHovered) {
                color = "#ff4d6a";
            }
            return (
                <mesh
                    key={`${sq.x}-${sq.y}`}
                    position={[sq.worldX, 0.001, sq.worldZ]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                >
                    <planeGeometry args={[0.98, 0.98]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            );
        });
    }, [squareData, hoveredSquare]);

    const tileIndicators = useMemo(() => {
        return squareData
            .filter(sq => sq.tileType && sq.tileType !== "StandardTile")
            .map(sq => (
                <TileIndicator
                    key={`tile-${sq.x}-${sq.y}`}
                    position={[sq.worldX, 0.101, sq.worldZ]}
                    tileType={sq.tileType!}
                />
            ));
    }, [squareData]);

    return (
        <group>
            <mesh receiveShadow castShadow geometry={boardGeometry}>
                <meshStandardMaterial color="#5d4e37" />
            </mesh>
            {squareMeshes}
            {tileIndicators}
        </group>
    );
};

// =============================================================================
// Piece Mesh Component
// =============================================================================

const EditorPiece3D: React.FC<{
    piece: PlacedPiece;
    dimensions: BoardDimensions;
}> = ({ piece, dimensions }) => {
    const PieceComponent = getProceduralPieceComponent(piece.type);
    const position = gridToWorld({ x: piece.x, y: piece.y }, dimensions);
    const owner = piece.color === "White" ? PlayerColor.White : PlayerColor.Black;

    if (!PieceComponent) return null;

    return (
        <group position={[position.x, 0.05, position.z]}>
            <PieceComponent owner={owner} />
            {piece.decorators.map((decoratorId, index) => (
                <DecoratorIndicator3D
                    key={decoratorId}
                    decoratorId={decoratorId as AbilityId}
                    index={index}
                    total={piece.decorators.length}
                />
            ))}
        </group>
    );
};

// =============================================================================
// Interaction Handler
// =============================================================================

const EditorClickHandler: React.FC<{
    dimensions: BoardDimensions;
    onSquareClick: (x: number, y: number) => void;
    onSquareHover: (pos: { x: number; y: number } | null) => void;
}> = ({ dimensions, onSquareClick, onSquareHover }) => {
    const { camera, gl } = useThree();
    const raycaster = useMemo(() => new THREE.Raycaster(), []);

    const getGridPosition = useCallback((event: MouseEvent | PointerEvent) => {
        const canvas = gl.domElement;
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const intersection = new THREE.Vector3();
        const hit = raycaster.ray.intersectPlane(BOARD_PLANE, intersection);

        if (hit) {
            const gridPos = worldToGrid(intersection.x, intersection.z, dimensions);
            if (gridPos.x >= 0 && gridPos.x < dimensions.width && 
                gridPos.y >= 0 && gridPos.y < dimensions.height) {
                return gridPos;
            }
        }
        return null;
    }, [camera, gl, raycaster, dimensions]);

    useEffect(() => {
        const canvas = gl.domElement;

        const handleClick = (event: MouseEvent) => {
            const gridPos = getGridPosition(event);
            if (gridPos) {
                onSquareClick(gridPos.x, gridPos.y);
            }
        };

        const handleMove = (event: PointerEvent) => {
            const gridPos = getGridPosition(event);
            onSquareHover(gridPos);
        };

        const handleLeave = () => {
            onSquareHover(null);
        };

        canvas.addEventListener("click", handleClick);
        canvas.addEventListener("pointermove", handleMove);
        canvas.addEventListener("pointerleave", handleLeave);
        
        return () => {
            canvas.removeEventListener("click", handleClick);
            canvas.removeEventListener("pointermove", handleMove);
            canvas.removeEventListener("pointerleave", handleLeave);
        };
    }, [gl, getGridPosition, onSquareClick, onSquareHover]);

    return null;
};

// =============================================================================
// Camera Setup
// =============================================================================

const CameraSetup: React.FC<{
    position: [number, number, number];
    enabled: boolean;
    cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}> = ({ position, enabled, cameraRef }) => {
    const { camera } = useThree();

    useEffect(() => {
        cameraRef.current = camera as THREE.PerspectiveCamera;
    }, [camera, cameraRef]);

    useEffect(() => {
        if (enabled) {
            camera.position.set(...position);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
        }
    }, [camera, position, enabled]);

    return null;
};

// =============================================================================
// Main Board 3D Editor Component
// =============================================================================

interface Board3DEditorProps {
    map: MapDefinition;
    onCellClick: (x: number, y: number) => void;
    onDropTool: (x: number, y: number, tool: Tool) => void;
    tool: Tool;
    mode: "white" | "black" | "tiles";
}

const EDITOR_MOUSE_BUTTONS = {
    LEFT: -1 as THREE.MOUSE,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.ROTATE,
};

const EDITOR_TOUCHES = {
    ONE: -1 as THREE.TOUCH,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
};

export const Board3DEditor: React.FC<Board3DEditorProps> = ({
    map,
    onCellClick,
    onDropTool,
    tool,
    mode,
}) => {
    const [hoveredSquare, setHoveredSquare] = useState<{ x: number; y: number } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const controlsRef = useRef<any>(null);

    const dimensions: BoardDimensions = useMemo(
        () => ({ width: map.width, height: map.height }),
        [map.width, map.height]
    );

    const cameraPosition = useMemo(
        () => getCameraPosition(dimensions),
        [dimensions]
    );

    const resetCamera = useCallback(() => {
        if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(...cameraPosition);
            cameraRef.current.lookAt(0, 0, 0);
            cameraRef.current.updateProjectionMatrix();
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }, [cameraPosition]);

    const getGridPositionFromEvent = useCallback((e: React.DragEvent) => {
        const canvas = containerRef.current?.querySelector("canvas");
        if (!canvas || !cameraRef.current) return null;

        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        const intersection = new THREE.Vector3();
        const hit = raycasterRef.current.ray.intersectPlane(BOARD_PLANE, intersection);

        if (hit) {
            const gridPos = worldToGrid(intersection.x, intersection.z, dimensions);
            if (gridPos.x >= 0 && gridPos.x < dimensions.width && 
                gridPos.y >= 0 && gridPos.y < dimensions.height) {
                return gridPos;
            }
        }
        return null;
    }, [dimensions]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes(DRAG_DATA_TYPE)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setIsDragOver(true);

            const gridPos = getGridPositionFromEvent(e);
            setHoveredSquare(gridPos);
        }
    }, [getGridPositionFromEvent]);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
        setHoveredSquare(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const data = e.dataTransfer.getData(DRAG_DATA_TYPE);
        const droppedTool = deserializeTool(data);
        const gridPos = getGridPositionFromEvent(e);
        
        if (droppedTool && gridPos) {
            onDropTool(gridPos.x, gridPos.y, droppedTool);
        }
        setHoveredSquare(null);
    }, [getGridPositionFromEvent, onDropTool]);

    const toolInfo = useMemo(() => {
        if (tool.kind === "piece") {
            return `Place ${tool.color} ${tool.piece}`;
        } else if (tool.kind === "decorator") {
            return `Add ${tool.decorator} ability`;
        } else if (tool.kind === "tile") {
            return `Place ${tool.tile} tile`;
        } else {
            return "Erase";
        }
    }, [tool]);

    const modeLabel = mode === "tiles" ? "🔲 Tiles Mode" : mode === "white" ? "⚪ White Mode" : "⚫ Black Mode";

    return (
        <div 
            ref={containerRef}
            className={`board3d-editor ${isDragOver ? "board3d-editor--drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="board3d-editor__tool-indicator">
                <span className="board3d-editor__mode">{modeLabel}</span>
                <span className="board3d-editor__tool">{toolInfo}</span>
            </div>

            {isDragOver && (
                <div className="board3d-editor__drop-hint">
                    Drop to place
                </div>
            )}

            <div className="board3d-editor__controls">
                <button onClick={resetCamera} className="board3d-editor__btn">
                    ⟲ Reset View
                </button>
                <span className="board3d-editor__hint">
                    Right-click or two-finger drag to rotate
                </span>
            </div>

            <Canvas
                camera={{
                    position: cameraPosition,
                    fov: 50,
                    near: 0.1,
                    far: 100,
                }}
                shadows
                gl={{
                    antialias: true,
                    powerPreference: "high-performance",
                    stencil: false,
                    depth: true,
                    alpha: false,
                }}
                onCreated={({ camera }) => {
                    cameraRef.current = camera as THREE.PerspectiveCamera;
                }}
            >
                <color attach="background" args={["#0c0c12"]} />
                <CameraSetup position={cameraPosition} enabled={true} cameraRef={cameraRef} />

                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[5, 10, 8]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-far={50}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                />
                <directionalLight position={[-5, 8, -3]} intensity={0.3} />

                <EditorClickHandler
                    dimensions={dimensions}
                    onSquareClick={onCellClick}
                    onSquareHover={setHoveredSquare}
                />

                <GeometryProvider>
                    <EditorBoardMesh
                        width={map.width}
                        height={map.height}
                        tiles={map.tiles}
                        hoveredSquare={hoveredSquare}
                    />

                    {map.pieces.map((piece, idx) => (
                        <EditorPiece3D
                            key={`${piece.x}-${piece.y}-${piece.type}-${idx}`}
                            piece={piece}
                            dimensions={dimensions}
                        />
                    ))}
                </GeometryProvider>

                <OrbitControls
                    ref={controlsRef}
                    enableRotate={true}
                    enableZoom={true}
                    enablePan={false}
                    mouseButtons={EDITOR_MOUSE_BUTTONS}
                    touches={EDITOR_TOUCHES}
                    minPolarAngle={Math.PI / 6}
                    maxPolarAngle={Math.PI / 2.2}
                    minDistance={4}
                    maxDistance={25}
                    target={[0, 0, 0]}
                    zoomSpeed={0.8}
                    rotateSpeed={0.8}
                />
            </Canvas>
        </div>
    );
};
