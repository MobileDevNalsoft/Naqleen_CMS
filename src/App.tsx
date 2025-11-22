import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import { Containers } from './components/Containers';
import Fencing from './components/Fencing';
import Environment from './components/Environment';
import TerminalMarkings from './components/TerminalMarkings';
import LayoutBuilder from './components/LayoutBuilder';
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import Gates from './components/Gates';
import ContainerDetailsPanel from './components/ContainerDetailsPanel';
import BlockDetailsPanel from './components/BlockDetailsPanel';
import { CameraTransition } from './components/CameraTransition';
import { useLayoutQuery, useContainersQuery } from './api';

function App() {
  const { data: layout, isLoading: layoutLoading } = useLayoutQuery();
  const { isLoading: containersLoading } = useContainersQuery(layout || null);
  const [sceneReady, setSceneReady] = useState(false);
  const [viewMode, setViewMode] = useState<'main' | 'top'>('main');

  const controlsRef = useRef<any>(null);

  // Prevent panning outside environment boundaries
  const handleControlsChange = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;

      // Clamp target Y position to stay above ground (y = -1 is the yard base)
      if (target.y < -1) {
        target.y = -1;
      }

      // Clamp target X and Z positions to stay within environment radius
      // We limit to 180 to keep the camera safely inside the terminal area
      const maxPanRadius = 180;
      const distance = Math.sqrt(target.x * target.x + target.z * target.z);

      if (distance > maxPanRadius) {
        const ratio = maxPanRadius / distance;
        target.x *= ratio;
        target.z *= ratio;
      }
    }
  };

  const isDataLoading = layoutLoading || containersLoading || !sceneReady;
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0, position: 'relative' }}>
      {/* Header */}
      <Header
        currentViewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Side Panels */}
      <ContainerDetailsPanel />
      <BlockDetailsPanel />

      {/* Loading Screen */}
      {showLoadingScreen && (
        <LoadingScreen
          isLoading={isDataLoading}
          onComplete={() => setShowLoadingScreen(false)}
        />
      )}

      <Canvas
        style={{ width: '100%', height: '100%', display: 'block', marginTop: '64px' }}
        camera={{ position: [0, 150, 300], fov: 45 }}
        shadows
      >
        <color attach="background" args={['#E6F4F1']} />

        <Environment />
        <LayoutBuilder />
        <TerminalMarkings />
        <Fencing />
        <Gates />
        <Containers
          count={2000}
          controlsRef={controlsRef}
          onReady={() => setSceneReady(true)}
        />

        <CameraTransition isLoading={isDataLoading} controlsRef={controlsRef} />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={0}                    // Prevent looking straight down
          maxPolarAngle={Math.PI / 2 - 0.05}     // Prevent going below horizontal
          minDistance={50}                        // Minimum zoom distance
          maxDistance={600}                       // Maximum zoom distance (Restricted)
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
