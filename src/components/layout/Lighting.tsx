import React from 'react';

const Lighting: React.FC = () => {
  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={1} color={0xffffff} />

      {/* Hemisphere light for natural outdoor lighting */}
      <hemisphereLight
        args={[0xffffff, 0xB8B8B8, 0.6]}
        position={[0, 50, 0]}
      />

      {/* Main sun light (directional) */}
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        castShadow={false}
      />

      {/* Enhanced directional lights for even, bright yard illumination */}
      <directionalLight
        position={[-200, 80, 0]}
        intensity={1.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[200, 80, 0]}
        intensity={1.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[0, 80, -200]}
        intensity={1.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[0, 80, 200]}
        intensity={1.5}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />

      {/* Diagonal lights for better coverage */}
      <directionalLight
        position={[-150, 70, -150]}
        intensity={1.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[150, 70, -150]}
        intensity={1.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[-150, 70, 150]}
        intensity={1.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
      <directionalLight
        position={[150, 70, 150]}
        intensity={1.0}
        color={0xffffff}
        lookAt={[0, 0, 0]}
      />
    </>
  );
};

export default Lighting;
