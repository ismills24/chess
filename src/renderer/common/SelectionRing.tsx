import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const SelectionRing: React.FC = React.memo(() => {
	const ringRef = useRef<THREE.Mesh>(null);

	useFrame((state) => {
		if (ringRef.current) {
			const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
			(ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
		}
	});

	return (
		<mesh ref={ringRef} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
			<ringGeometry args={[0.34, 0.42, 64]} />
			<meshBasicMaterial color="#ffcc00" transparent opacity={1} />
		</mesh>
	);
});

