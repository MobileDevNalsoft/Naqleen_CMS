import './App.css';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import Lighting from './components/Lighting';
import Controls from './components/Controls';
import LayoutBuilder from './components/LayoutBuilder';
import Fence from './components/Fence';
import EventHandler from './components/EventHandler';

function App() {
  return (
    <div id="canvas-container" style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          position: [200, 150, 200],
          fov: 30,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: true,
          logarithmicDepthBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(Math.max(1, window.devicePixelRatio), 1.5));
          gl.outputColorSpace = 'srgb';
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <Lighting />
          <Controls />

          <EventHandler>
            <LayoutBuilder />
          </EventHandler>

          {/* <Fence yardWidth={yardWidth} yardLength={yardLength} /> */}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
