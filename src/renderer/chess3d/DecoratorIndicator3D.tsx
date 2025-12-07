import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { AbilityId } from "../../catalog/registry/Catalog";
import * as THREE from "three";

interface DecoratorIndicator3DProps {
  decoratorId: AbilityId;
  index: number;
  total: number;
}

const BASE_HEIGHT = 1.35;

export const DecoratorIndicator3D: React.FC<DecoratorIndicator3DProps> = ({
  decoratorId,
  index,
  total,
}) => {
  const config = getDecoratorConfig(decoratorId);
  const groupRef = useRef<THREE.Group>(null);

  const xOffset = total > 1 ? (index - (total - 1) / 2) * 0.28 : 0;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        BASE_HEIGHT + Math.sin(state.clock.elapsedTime * 2 + index) * 0.04;
      if (config.spin) {
        groupRef.current.rotation.y += 0.015;
      }
    }
  });

  return (
    <>
      <group ref={groupRef} position={[xOffset, BASE_HEIGHT, 0]}>
        {config.render()}
      </group>
      <Html
        position={[xOffset, 1.05, 0]}
        center
        style={{
          fontSize: "10px",
          fontWeight: "bold",
          color: config.labelColor,
          textShadow: "0 0 3px #000, 0 0 3px #000",
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {decoratorId}
      </Html>
    </>
  );
};

interface DecoratorConfig {
  render: () => React.ReactNode;
  spin?: boolean;
  labelColor: string;
}

function getDecoratorConfig(id: AbilityId): DecoratorConfig {
  switch (id) {
    case "Marksman":
      return {
        render: () => <MarksmanIndicator />,
        spin: true,
        labelColor: "#ff6666",
      };
    case "Exploding":
      return {
        render: () => <ExplodingIndicator />,
        spin: false,
        labelColor: "#ffaa44",
      };
    case "Scapegoat":
      return {
        render: () => <ScapegoatIndicator />,
        spin: false,
        labelColor: "#bb99ff",
      };
    case "Piercing":
      return {
        render: () => <PiercingIndicator />,
        spin: false,
        labelColor: "#00ffff",
      };
    case "Bouncer":
      return {
        render: () => <BouncerIndicator />,
        spin: false,
        labelColor: "#ff8844",
      };
    case "Cannibal":
      return {
        render: () => <CannibalIndicator />,
        spin: false,
        labelColor: "#ffbb66",
      };
    case "Revenant":
      return {
        render: () => <RevenantIndicator />,
        spin: false,
        labelColor: "#b8a7ff",
      };
    case "Predator":
      return {
        render: () => <PredatorIndicator />,
        spin: true,
        labelColor: "#66ff88",
      };
    default:
      return {
        render: () => <DefaultIndicator />,
        labelColor: "#aaaaaa",
      };
  }
}

const MarksmanIndicator: React.FC = () => (
  <group scale={0.12}>
    <mesh>
      <torusGeometry args={[1, 0.1, 8, 32]} />
      <meshStandardMaterial
        color="#ff2222"
        emissive="#ff0000"
        emissiveIntensity={0.5}
      />
    </mesh>
    <mesh>
      <torusGeometry args={[0.55, 0.07, 8, 32]} />
      <meshStandardMaterial
        color="#ff2222"
        emissive="#ff0000"
        emissiveIntensity={0.5}
      />
    </mesh>
    <mesh>
      <sphereGeometry args={[0.18, 12, 12]} />
      <meshStandardMaterial
        color="#ff4444"
        emissive="#ff0000"
        emissiveIntensity={0.6}
      />
    </mesh>
  </group>
);

const ExplodingIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.12;
      groupRef.current.scale.setScalar(pulse * 0.1);
    }
  });

  return (
    <group ref={groupRef} scale={0.1}>
      <mesh>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color="#ffdd00"
          emissive="#ff8800"
          emissiveIntensity={0.7}
        />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * Math.PI * 2) / 6;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7]}
            rotation={[0, -angle, Math.PI / 2]}
          >
            <coneGeometry args={[0.25, 0.8, 4]} />
            <meshStandardMaterial
              color="#ff6600"
              emissive="#ff4400"
              emissiveIntensity={0.6}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.25, 0.8, 4]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={[0, -0.7, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.25, 0.8, 4]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
};

const ScapegoatIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const innerOrbRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
    if (innerOrbRef.current) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      innerOrbRef.current.scale.setScalar(pulse);
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.x = state.clock.elapsedTime * 1.2;
      ringsRef.current.rotation.z = state.clock.elapsedTime * 0.8;
    }
  });

  return (
    <group ref={groupRef} scale={0.11}>
      <mesh ref={innerOrbRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#7744ff"
          emissive="#5522dd"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#aa88ff"
          emissive="#8866ee"
          emissiveIntensity={0.3}
          transparent
          opacity={0.25}
        />
      </mesh>
      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.85, 0.04, 16, 48]} />
          <meshStandardMaterial
            color="#bb99ff"
            emissive="#9977ff"
            emissiveIntensity={0.6}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[0.75, 0.03, 16, 48]} />
          <meshStandardMaterial
            color="#cc99ff"
            emissive="#aa77ff"
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 4, Math.PI / 3, Math.PI / 6]}>
          <torusGeometry args={[0.65, 0.025, 16, 48]} />
          <meshStandardMaterial
            color="#ddaaff"
            emissive="#bb88ff"
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI * 2) / 4;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9]}
            rotation={[0, -angle + Math.PI / 2, 0]}
          >
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial
              color="#eeddff"
              emissive="#ccaaff"
              emissiveIntensity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const PiercingIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 2;
    }
    if (trailRef.current) {
      const pulse = 0.6 + Math.sin(state.clock.elapsedTime * 8) * 0.4;
      trailRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = pulse * (1 - i * 0.15);
        }
      });
    }
  });

  return (
    <group ref={groupRef} scale={0.1}>
      <mesh position={[0, 0.6, 0]}>
        <coneGeometry args={[0.25, 0.8, 4]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00dddd"
          emissiveIntensity={0.9}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 0.8, 8]} />
        <meshStandardMaterial
          color="#00eeff"
          emissive="#00ccdd"
          emissiveIntensity={0.7}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 8]} />
        <meshStandardMaterial
          color="#00ddff"
          emissive="#00bbcc"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <group ref={trailRef}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, -0.9 - i * 0.18, 0]}>
            <sphereGeometry args={[0.08 - i * 0.015, 8, 8]} />
            <meshStandardMaterial
              color="#00ffff"
              emissive="#00ffff"
              emissiveIntensity={1}
              transparent
              opacity={0.8 - i * 0.15}
            />
          </mesh>
        ))}
      </group>
      {[0, 1, 2].map((i) => {
        const angle = (i * Math.PI * 2) / 3;
        return (
          <mesh
            key={`fin-${i}`}
            position={[Math.cos(angle) * 0.15, -0.3, Math.sin(angle) * 0.15]}
            rotation={[0, -angle, Math.PI / 6]}
          >
            <boxGeometry args={[0.02, 0.35, 0.12]} />
            <meshStandardMaterial
              color="#00ddff"
              emissive="#00bbdd"
              emissiveIntensity={0.5}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const BouncerIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const bounce = Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 0.08;
      groupRef.current.position.y = bounce;
      const squash = 1 - bounce;
      groupRef.current.scale.set(1 + bounce * 0.5, squash, 1 + bounce * 0.5);
    }
  });

  return (
    <group ref={groupRef} scale={1}>
      <mesh scale={0.11}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color="#ff6622"
          emissive="#cc4400"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh scale={0.11}>
        <torusGeometry args={[1.005, 0.025, 6, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh scale={0.11} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.005, 0.025, 6, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      <mesh scale={0.11} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.005, 0.025, 6, 24]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
};

const CannibalIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const wobble = Math.sin(state.clock.elapsedTime * 3) * 0.04;
      groupRef.current.rotation.z = wobble;
    }
  });

  return (
    <group ref={groupRef} scale={0.1}>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#d4a56a"
          emissive="#8b6914"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.1, 32]} />
        <meshStandardMaterial
          color="#d4a56a"
          emissive="#8b6914"
          emissiveIntensity={0.2}
        />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={`sesame-${i}`}
          position={[
            Math.cos((i * Math.PI) / 3 + 0.3) * 0.35,
            0.72,
            Math.sin((i * Math.PI) / 3 + 0.3) * 0.35,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <capsuleGeometry args={[0.03, 0.06, 4, 8]} />
          <meshStandardMaterial color="#f5f5dc" />
        </mesh>
      ))}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.15, 32]} />
        <meshStandardMaterial
          color="#44aa44"
          emissive="#228822"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 0.25, 32]} />
        <meshStandardMaterial
          color="#8b4513"
          emissive="#5a2d0a"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.08, 32]} />
        <meshStandardMaterial
          color="#ff6644"
          emissive="#cc3311"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 0.15, 32]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#cc9900"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#d4a56a"
          emissive="#8b6914"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.1, 32]} />
        <meshStandardMaterial
          color="#d4a56a"
          emissive="#8b6914"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
};

const RevenantIndicator: React.FC = () => {
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + pulse * 0.6;
    }
  });
  return (
    <group scale={0.12}>
      <mesh>
        <cylinderGeometry args={[0.45, 0.5, 0.18, 12]} />
        <meshStandardMaterial color="#5a4b66" />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.16, 0]}>
        <boxGeometry args={[0.14, 0.35, 0.12]} />
        <meshStandardMaterial
          color="#d0c6d8"
          emissive="#a6a1ff"
          emissiveIntensity={1}
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.28, 0.08, 0.12]} />
        <meshStandardMaterial color="#d0c6d8" />
      </mesh>
    </group>
  );
};

const PredatorIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 1.5;
    }
  });
  return (
    <group ref={groupRef} scale={0.11}>
      <mesh position={[0, 0.25, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color="#44ff88"
          emissive="#22cc66"
          emissiveIntensity={0.7}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {[0, 1, 2].map((i) => {
        const angle = (i * Math.PI * 2) / 3;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.4, -0.05, Math.sin(angle) * 0.4]}
            rotation={[0, -angle, Math.PI / 4]}
          >
            <coneGeometry args={[0.12, 0.28, 4]} />
            <meshStandardMaterial
              color="#99ffcc"
              emissive="#55dd99"
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      })}
      <mesh position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial
          color="#33dd77"
          emissive="#22bb66"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
};

const DefaultIndicator: React.FC = () => (
  <mesh scale={0.1}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#888888" />
  </mesh>
);
