import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/store';

interface GateProps {
    position: [number, number, number];
    type: 'IN' | 'OUT';
    label?: string; // Optional custom label (defaults to 'GATE IN' or 'GATE OUT')
}

const Gate: React.FC<GateProps> = ({ position, type, label }) => {
    const [x, y, z] = position;
    const width = 20; // Wider gate
    const height = 6;
    const pillarWidth = 1.2;

    // Materials - Realistic Industrial Colors
    const concreteMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#95a5a6', roughness: 0.9 }), []); // Concrete Grey
    const metalMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#34495e', metalness: 0.7, roughness: 0.2 }), []); // Industrial Metal (Dark Blue-Grey)
    const glassMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#aeb6bf', transparent: true, opacity: 0.3, metalness: 0.9, roughness: 0.1 }), []); // Tinted Glass
    const barrierMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.2 }), []); // Safety Red
    const stripeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ecf0f1', roughness: 0.2 }), []); // Reflective White
    const lightHousingMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c3e50' }), []);

    return (
        <group position={[x, y, z]}>
            {/* --- STRUCTURE --- */}

            {/* Left Pillar (Concrete Base + Metal Column) */}
            <group position={[0, 0, -width / 2]}>
                <mesh position={[0, 1, 0]} castShadow receiveShadow material={concreteMaterial}>
                    <boxGeometry args={[2, 2, 2]} />
                </mesh>
                <mesh position={[0, height / 2 + 1, 0]} castShadow receiveShadow material={metalMaterial}>
                    <boxGeometry args={[pillarWidth, height, pillarWidth]} />
                </mesh>
            </group>

            {/* Right Pillar */}
            <group position={[0, 0, width / 2]}>
                <mesh position={[0, 1, 0]} castShadow receiveShadow material={concreteMaterial}>
                    <boxGeometry args={[2, 2, 2]} />
                </mesh>
                <mesh position={[0, height / 2 + 1, 0]} castShadow receiveShadow material={metalMaterial}>
                    <boxGeometry args={[pillarWidth, height, pillarWidth]} />
                </mesh>
            </group>

            {/* --- SECURITY BOOTH --- */}
            <group position={[0, 1.5, 0]} visible={false}>
                {/* Floor */}
                <mesh position={[0, -1.4, 0]} receiveShadow material={concreteMaterial}>
                    <boxGeometry args={[4, 0.2, 6]} />
                </mesh>
                {/* Walls/Glass */}
                <mesh position={[0, 0, 0]} castShadow receiveShadow material={glassMaterial}>
                    <boxGeometry args={[3.5, 3, 5]} />
                </mesh>
                {/* Roof */}
                <mesh position={[0, 1.6, 0]} castShadow receiveShadow material={metalMaterial}>
                    <boxGeometry args={[3.8, 0.2, 5.4]} />
                </mesh>
                {/* Frames */}
                <mesh position={[1.7, 0, 1.7]} material={metalMaterial}><boxGeometry args={[0.1, 3, 0.1]} /></mesh>
                <mesh position={[1.7, 0, -1.7]} material={metalMaterial}><boxGeometry args={[0.1, 3, 0.1]} /></mesh>
                <mesh position={[-1.7, 0, 1.7]} material={metalMaterial}><boxGeometry args={[0.1, 3, 0.1]} /></mesh>
                <mesh position={[-1.7, 0, -1.7]} material={metalMaterial}><boxGeometry args={[0.1, 3, 0.1]} /></mesh>
            </group>

            {/* --- BOOM BARRIERS --- */}
            {/* Left Barrier */}
            <group position={[0, 1, -6]} visible={false}>
                <mesh position={[0, 0.5, 0]} material={metalMaterial}>
                    <cylinderGeometry args={[0.3, 0.4, 1.2]} />
                </mesh>
                {/* Arm */}
                <group rotation={[0, 0, type === 'IN' ? -Math.PI / 4 : 0]}> {/* Open for IN, Closed for OUT demo */}
                    <mesh position={[0, 1, 3.5]} material={barrierMaterial}>
                        <boxGeometry args={[0.15, 0.3, 7]} />
                    </mesh>
                    {/* Stripes */}
                    <mesh position={[0.08, 1, 1]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, 2]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, 3]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, 4]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, 5]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, 6]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                </group>
            </group>

            {/* Right Barrier */}
            <group position={[0, 1, 6]} visible={false}>
                <mesh position={[0, 0.5, 0]} material={metalMaterial}>
                    <cylinderGeometry args={[0.3, 0.4, 1.2]} />
                </mesh>
                {/* Arm */}
                <group rotation={[0, 0, type === 'IN' ? -Math.PI / 4 : 0]}>
                    <mesh position={[0, 1, -3.5]} material={barrierMaterial}>
                        <boxGeometry args={[0.15, 0.3, 7]} />
                    </mesh>
                    {/* Stripes */}
                    <mesh position={[0.08, 1, -1]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, -2]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, -3]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, -4]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, -5]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                    <mesh position={[0.08, 1, -6]} material={stripeMaterial}><planeGeometry args={[0.05, 0.2]} /></mesh>
                </group>
            </group>

            {/* --- TRAFFIC LIGHTS --- */}
            <group position={[0.6, height - 1, -width / 2 + 1.5]}>
                <mesh material={lightHousingMaterial}>
                    <boxGeometry args={[0.5, 1.5, 0.5]} />
                </mesh>
                {/* Red Light */}
                <mesh position={[0.26, 0.4, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color={type === 'OUT' ? '#FF0000' : '#330000'} />
                </mesh>
                {/* Green Light */}
                <mesh position={[0.26, -0.4, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color={type === 'IN' ? '#00FF00' : '#003300'} />
                </mesh>
            </group>

            <group position={[0.6, height - 1, width / 2 - 1.5]}>
                <mesh material={lightHousingMaterial}>
                    <boxGeometry args={[0.5, 1.5, 0.5]} />
                </mesh>
                {/* Red Light */}
                <mesh position={[0.26, 0.4, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color={type === 'OUT' ? '#FF0000' : '#330000'} />
                </mesh>
                {/* Green Light */}
                <mesh position={[0.26, -0.4, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color={type === 'IN' ? '#00FF00' : '#003300'} />
                </mesh>
            </group>

            {/* --- SIGNAGE --- */}
            {/* Ground marking just inside the icd, flat on the base */}
            <Text
                position={[8, 0.02, 0]} // Slightly inside icd (+X) and just above ground to avoid z-fighting
                rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Lays flat on ground
                fontSize={3}
                color='#FFFFFF'
                anchorX="center"
                anchorY="bottom"
                fontWeight="bold"
                letterSpacing={0.2}
            >
                {label || `GATE ${type}`}
            </Text>

        </group>
    );
};

export default function Gates() {
    const layout = useStore((state) => state.layout);

    // Calculate gate X position from layout (at padded west fence)
    const YARD_PADDING = 20;
    const gateX = useMemo(() => {
        if (layout?.total_dimensions) {
            return -layout.total_dimensions.width / 2 - YARD_PADDING + 6;
        }
        return -380 - YARD_PADDING; // Default
    }, [layout]);

    // Outer Gates at the west fence edge - positions match fence gaps
    // ENTRY gate: fence gap z: -40 to -24 (center: -32)
    // EXIT gate: fence gap z: -60 to -44 (center: -52)
    const outerGateInPos: [number, number, number] = [gateX, 0, -22];
    const outerGateOutPos: [number, number, number] = [gateX, 0, -42];

    return (
        <group>
            {/* Outer Gates - labeled as ENTRY/EXIT */}
            <Gate position={outerGateInPos} type="IN" label="ENTRY" />
            <Gate position={outerGateOutPos} type="OUT" label="EXIT" />
        </group>
    );
}
