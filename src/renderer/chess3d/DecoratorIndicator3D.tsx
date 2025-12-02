import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DecoratorId } from "../../shared/entityRegistry";
import * as THREE from "three";

interface DecoratorIndicator3DProps {
  decoratorId: DecoratorId;
  index: number;
  total: number;
}

export const DecoratorIndicator3D: React.FC<DecoratorIndicator3DProps> = ({
  decoratorId,
  index,
  total,
}) => {
  const config = getDecoratorConfig(decoratorId);
  const groupRef = useRef<THREE.Group>(null);

  // Center-align multiple decorators: offset = (index - midpoint) * spacing
  const xOffset = total > 1 ? (index - (total - 1) / 2) * 0.25 : 0;

  useFrame((state) => {
    if (groupRef.current) {
      // Sine wave float: base height + sin(time * speed + phase) * amplitude
      groupRef.current.position.y =
        1.1 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.05;
      if (config.spin) {
        // Constant angular velocity: increment rotation each frame
        groupRef.current.rotation.y += 0.02;
      }
    }
  });

  return (
    <group ref={groupRef} position={[xOffset, 1.1, 0]}>
      {config.render()}
    </group>
  );
};

interface DecoratorConfig {
  render: () => React.ReactNode;
  spin?: boolean;
}

function getDecoratorConfig(id: DecoratorId): DecoratorConfig {
  switch (id) {
    case "Marksman":
      return {
        render: () => <MarksmanIndicator />,
        spin: true,
      };
    case "Exploding":
      return {
        render: () => <ExplodingIndicator />,
        spin: false,
      };
    case "Scapegoat":
      return {
        render: () => <ScapegoatIndicator />,
        spin: false,
      };
    case "Piercing":
      return {
        render: () => <PiercingIndicator />,
        spin: false,
      };
    case "Bouncer":
      return {
        render: () => <BouncerIndicator />,
        spin: true,
      };
    case "Cannibal":
      return {
        render: () => <CannibalIndicator />,
        spin: false,
      };
    default:
      return {
        render: () => <DefaultIndicator />,
      };
  }
}

const MarksmanIndicator: React.FC = () => (
  <group scale={0.15}>
    <mesh>
      <torusGeometry args={[1, 0.15, 8, 24]} />
      <meshStandardMaterial
        color="#ff4444"
        emissive="#ff0000"
        emissiveIntensity={0.3}
      />
    </mesh>
    {/* Rotate 90° around X to orient crosshair vertical bar along Z axis */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.08, 0.08, 2, 8]} />
      <meshStandardMaterial
        color="#ff4444"
        emissive="#ff0000"
        emissiveIntensity={0.3}
      />
    </mesh>
    {/* Rotate 90° around X, then 90° around Z for perpendicular crosshair bar */}
    <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.08, 0.08, 2, 8]} />
      <meshStandardMaterial
        color="#ff4444"
        emissive="#ff0000"
        emissiveIntensity={0.3}
      />
    </mesh>
  </group>
);

const ExplodingIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Pulsing scale: base + sin(time * speed) * amplitude
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      groupRef.current.scale.setScalar(scale * 0.12);
    }
  });

  return (
    <group ref={groupRef} scale={0.12}>
      {/* Hexagonal distribution: 6 points at angles i * 60° (π/3 radians) */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            // Polar to cartesian: x = radius * cos(angle)
            Math.cos((i * Math.PI) / 3) * 0.8,
            0,
            // Polar to cartesian: z = radius * sin(angle)
            Math.sin((i * Math.PI) / 3) * 0.8,
          ]}
        >
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial
            color="#ff8800"
            emissive="#ff4400"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ff8800"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
};

const ScapegoatIndicator: React.FC = () => (
  <group scale={0.13}>
    <mesh>
      <cylinderGeometry args={[0.8, 1.2, 0.3, 6]} />
      <meshStandardMaterial
        color="#4488ff"
        emissive="#2266cc"
        emissiveIntensity={0.3}
      />
    </mesh>
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        color="#66aaff"
        emissive="#4488ff"
        emissiveIntensity={0.3}
      />
    </mesh>
  </group>
);

const PiercingIndicator: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Wobble rotation: sin wave oscillates between -0.3 and +0.3 radians
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={0.12}>
      {/* Rotate 45° around Z for diagonal arrowhead orientation */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.4, 1.5, 4]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffcc00"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Secondary arrow point at 45° rotation matching the main arrow */}
      <mesh position={[0, -0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.3, 0.6, 4]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffcc00"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

const BouncerIndicator: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Bounce height: |sin(time)| creates always-positive bounce curve
      const bounce = Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 0.1;
      meshRef.current.position.y = bounce;
      // Squash-and-stretch: height shrinks as width/depth expand (volume preservation illusion)
      const squash = 1 - bounce * 2;
      meshRef.current.scale.set(1 + bounce, squash, 1 + bounce);
    }
  });

  return (
    <mesh ref={meshRef} scale={0.12}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#ff8844"
        emissive="#ff6622"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

const CannibalIndicator: React.FC = () => {
  const topRef = useRef<THREE.Mesh>(null);
  const bottomRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    // Chomping motion: jaws rotate in opposite directions via sin wave
    const chomp = Math.sin(state.clock.elapsedTime * 3) * 0.15;
    if (topRef.current) topRef.current.rotation.x = -chomp;
    if (bottomRef.current) bottomRef.current.rotation.x = chomp;
  });

  return (
    <group scale={0.12}>
      <mesh ref={topRef} position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#cc44cc"
          emissive="#aa22aa"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Bottom jaw: rotate 180° around X to flip hemisphere upside down */}
      <mesh ref={bottomRef} position={[0, -0.3, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#cc44cc"
          emissive="#aa22aa"
          emissiveIntensity={0.3}
        />
      </mesh>
      {[-0.3, 0, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.4]}>
          <coneGeometry args={[0.1, 0.25, 4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
};

const DefaultIndicator: React.FC = () => (
  <mesh scale={0.1}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#888888" />
  </mesh>
);
