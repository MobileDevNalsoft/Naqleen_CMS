export default function Fencing() {
    return (
        <group>
            {/* North Fence */}
            <mesh position={[0, 1.5, -92.5]}>
                <boxGeometry args={[400, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>
            {/* South Fence */}
            <mesh position={[0, 1.5, 92.5]}>
                <boxGeometry args={[400, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>
            {/* East Fence */}
            <mesh position={[200, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[185, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>
            {/* West Fence */}
            <mesh position={[-200, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[185, 3, 0.2]} />
                <meshStandardMaterial color="#555" transparent opacity={0.5} />
            </mesh>

            {/* Posts every 10m */}
            {Array.from({ length: 41 }).map((_, i) => (
                <mesh key={`n-${i}`} position={[-200 + i * 10, 1.5, -92.5]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}
            {Array.from({ length: 41 }).map((_, i) => (
                <mesh key={`s-${i}`} position={[-200 + i * 10, 1.5, 92.5]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}
            {Array.from({ length: 19 }).map((_, i) => (
                <mesh key={`e-${i}`} position={[200, 1.5, -92.5 + i * 10]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}
            {Array.from({ length: 19 }).map((_, i) => (
                <mesh key={`w-${i}`} position={[-200, 1.5, -92.5 + i * 10]}>
                    <boxGeometry args={[0.5, 3.5, 0.5]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            ))}
        </group>
    );
}
