import React from 'react';

interface GateProps {
    position: [number, number, number];
}

const Gate: React.FC<GateProps> = ({ position }) => {
    const [x, y, z] = position;
    const width = 15; // Gate width
    const height = 6;
    const pillarWidth = 1.5;

    return (
        <group position={[x, y, z]}>
            {/* Left Pillar */}
            <mesh position={[0, height / 2, -width / 2]} castShadow receiveShadow>
                <boxGeometry args={[pillarWidth, height, pillarWidth]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Right Pillar */}
            <mesh position={[0, height / 2, width / 2]} castShadow receiveShadow>
                <boxGeometry args={[pillarWidth, height, pillarWidth]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Road marking under the gate */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[12, width]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Striped marking */}
            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[2, width - 2]} />
                <meshStandardMaterial color="#FEF200" />
            </mesh>
        </group>
    );
};

export default function Gates() {
    // Gate In: Opposite Row C of Block B (Approx z = -12)
    // Moved to x = -200 to align with fencing
    const gateInPos: [number, number, number] = [-200, 0, -5];

    // Gate Out: Opposite Gap between Block A and Block B (z = -35.405)
    // Moved to x = -200 to align with fencing
    const gateOutPos: [number, number, number] = [-200, 0, -35.405];

    return (
        <group>
            <Gate position={gateInPos} />
            <Gate position={gateOutPos} />
        </group>
    );
}
