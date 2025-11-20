import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import InstancedContainers from './components/InstancedContainers';
import Fencing from './components/Fencing';
import Environment from './components/Environment';
import TerminalMarkings from './components/TerminalMarkings';
import { useLayoutQuery, useContainersQuery } from './api';

function App() {
  const { data: layout } = useLayoutQuery();
  useContainersQuery(layout || null);

  const controlsRef = useRef<any>(null);

  // Prevent panning outside environment boundaries
  const handleControlsChange = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;

      // Clamp target Y position to stay above ground (y = -1 is the yard base)
      if (target.y < -1) {
        target.y = -1;
      }

      // Clamp target X and Z positions to stay within environment radius (1200)
      // We limit to 1000 to keep the camera safely inside
      const maxPanRadius = 150;
      const distance = Math.sqrt(target.x * target.x + target.z * target.z);

      if (distance > maxPanRadius) {
        const ratio = maxPanRadius / distance;
        target.x *= ratio;
        target.z *= ratio;
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <Canvas
        style={{ width: '100%', height: '100%', display: 'block' }}
        camera={{ position: [0, 100, 200], fov: 45 }}
        shadows
      >
        <color attach="background" args={['#87CEEB']} />

        <Environment />
        <TerminalMarkings />
        <Fencing />
        <InstancedContainers count={2000} controlsRef={controlsRef} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={0.1}                    // Prevent looking straight down
          maxPolarAngle={Math.PI / 2 - 0.05}     // Prevent going below horizontal
          minDistance={50}                        // Minimum zoom distance
          maxDistance={500}                       // Maximum zoom distance
          enablePan={true}                        // Allow panning
          panSpeed={1}                            // Pan speed
          rotateSpeed={0.8}                       // Rotation speed
          onChange={handleControlsChange}         // Clamp target position
        />
      </Canvas>
    </div>
  );
}

export default App;
