import React from 'react';

const Lighting: React.FC = () => {
  return (
    <>
      {/* Ambient light for overall illumination - MAXIMUM */}
      <ambientLight intensity={3} color={0xffffff} />

      {/* Hemisphere light for natural outdoor lighting - INCREASED */}
      <hemisphereLight
        args={[0xffffff, 0xffffff, 1.5]}
        position={[0, 50, 0]}
      />

      {/* Main sun light (directional) - INCREASED */}
      <directionalLight
        position={[50, 100, 50]}
        intensity={2.5}
        castShadow={false}
      />

      {/* Enhanced directional lights for even, bright yard illumination - MAXIMUM */}
      <directionalLight
        position={[-200, 80, 0]}
        intensity={2.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[200, 80, 0]}
        intensity={2.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[0, 80, -200]}
        intensity={2.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[0, 80, 200]}
        intensity={2.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />

      {/* Diagonal lights for better coverage - INCREASED */}
      <directionalLight
        position={[-150, 70, -150]}
        intensity={2.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[150, 70, -150]}
        intensity={2.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[-150, 70, 150]}
        intensity={2.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[150, 70, 150]}
        intensity={2.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />

      {/* Additional top-down light for uniform coverage */}
      <directionalLight
        position={[0, 200, 0]}
        intensity={2.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
    </>
  );
};

export default Lighting;
