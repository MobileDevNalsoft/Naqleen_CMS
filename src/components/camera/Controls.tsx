import React from 'react';
import { OrbitControls } from '@react-three/drei';

interface ControlsProps {
  enableDamping?: boolean;
  dampingFactor?: number;
  rotateSpeed?: number;
  zoomSpeed?: number;
  panSpeed?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minDistance?: number;
  maxDistance?: number;
}

const Controls: React.FC<ControlsProps> = ({
  enableDamping = true,
  dampingFactor = 0.05,
  rotateSpeed = 0.5,
  zoomSpeed = 1.0,
  panSpeed = 1.0,
  minPolarAngle = Math.PI * 0.1,
  maxPolarAngle = Math.PI,
  minDistance = 0,
  maxDistance = 1000,
}) => {
  return (
    <OrbitControls
      enableDamping={enableDamping}
      dampingFactor={dampingFactor}
      rotateSpeed={rotateSpeed}
      zoomSpeed={zoomSpeed}
      panSpeed={panSpeed}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      minDistance={minDistance}
      maxDistance={maxDistance}
      screenSpacePanning={true}
      zoomToCursor={true}
    />
  );
};

export default Controls;
