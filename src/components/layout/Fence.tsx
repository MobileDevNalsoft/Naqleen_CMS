import React from 'react';

interface FenceProps {
  yardWidth: number;
  yardLength: number;
}

const Fence: React.FC<FenceProps> = ({
  yardWidth,
  yardLength,
}) => {
  const height = 12;

  return (
    <group>
      {/* Front fence */}
      <mesh position={[0, height / 2, -yardLength / 2]}>
        <planeGeometry args={[yardWidth, height]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>

      {/* Back fence */}
      <mesh position={[0, height / 2, yardLength / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[yardWidth, height]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>

      {/* Left fence */}
      <mesh position={[-yardWidth / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[yardLength, height]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>

      {/* Right fence */}
      <mesh position={[yardWidth / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[yardLength, height]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>
    </group>
  );
};

export default Fence;
