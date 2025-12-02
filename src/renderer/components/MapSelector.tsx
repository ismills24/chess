import React, { useState, useEffect } from "react";
import type { MapDefinition } from "../mapbuilder/types";

interface AssetEntry {
    name: string;
    filename: string;
}

interface MapSelectorProps {
    onSelect: (map: MapDefinition, filename: string) => void;
    selectedFilename?: string;
}

export const MapSelector: React.FC<MapSelectorProps> = ({ onSelect, selectedFilename }) => {
    const [maps, setMaps] = useState<AssetEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await window.assets.list("maps");
                setMaps(result.assets);
                setError(null);
            } catch (err) {
                setError("Failed to load maps");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const filename = e.target.value;
        if (!filename) return;

        try {
            const mapData = await window.assets.readJson<MapDefinition>("maps", filename);
            onSelect(mapData, filename);
        } catch (err) {
            console.error("Failed to load map:", err);
        }
    };

    if (loading) {
        return <span style={{ color: "#888" }}>Loading maps...</span>;
    }

    if (error) {
        return <span style={{ color: "#c44" }}>{error}</span>;
    }

    return (
        <select
            value={selectedFilename ?? ""}
            onChange={handleChange}
            style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #bbb",
                background: "#fff",
                fontSize: 14,
                minWidth: 180,
            }}
        >
            <option value="">Select a map...</option>
            {maps.map((m) => (
                <option key={m.filename} value={m.filename}>
                    {m.name}
                </option>
            ))}
        </select>
    );
};

