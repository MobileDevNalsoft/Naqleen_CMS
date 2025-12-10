import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import Environment from './components/layout/Environment';
import LoadingScreen from './components/ui/LoadingScreen';
import ContainerDetailsPanel from './components/panels/ContainerDetailsPanel';
import BlockDetailsPanel from './components/panels/BlockDetailsPanel';
import ModernHeader from './components/ui/ModernHeader';
import HoverInfoPanel from './components/ui/HoverInfoPanel';
import { CameraTransition } from './components/camera/CameraTransition';
import { useLayoutQuery, useContainersQuery } from './api';
import DynamicLayoutEngine from './components/layout/dynamic/DynamicLayoutEngine';
import Fencing from './components/layout/Fencing';
import Gates from './components/layout/Gates';
import QuickActionsButton from './components/ui/QuickActionsButton';
import IcdMarkings from './components/layout/IcdMarkings';
import { useUIStore } from './store/uiStore';
import { useStore } from './store/store';
import GateInPanel from './components/panels/GateInPanel';
import GateOutPanel from './components/panels/GateOutPanel';
import StuffingPanel from './components/panels/StuffingPanel';
import DestuffingPanel from './components/panels/DestuffingPanel';
import PlugInOutPanel from './components/panels/PlugInOutPanel';
import CFSTaskAssignmentPanel from './components/panels/CFSTaskAssignmentPanel';
import PositionContainerPanel from './components/panels/PositionContainerPanel';
import ReservedContainersPanel from './components/panels/ReservedContainersPanel';
import Dashboard from './components/ui/Dashboard';
import Containers from './components/layout/Containers';

function App() {
  const { data: layout, isLoading: layoutLoading } = useLayoutQuery();
  const { isLoading: containersLoading } = useContainersQuery(layout || null);
  const [sceneReady, setSceneReady] = useState(false);
  const [activeNav, setActiveNav] = useState('3D View');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSectionRef = useRef<HTMLElement>(null);
  const dashboardSectionRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<any>(null);
  // Scroll Handling & Snap Logic - REMOVED


  const handleNavChange = (nav: string) => {
    setActiveNav(nav);
    if (!containerRef.current) return;

    const height = containerRef.current.clientHeight;
    if (nav === 'Dashboard') {
      containerRef.current.scrollTo({ top: height, behavior: 'smooth' });
    } else {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Wheel Event to pass scroll from Canvas to Page when zoomed out
  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (!controlsRef.current || !containerRef.current) return;
    const controls = controlsRef.current;

    const distance = controls.object.position.distanceTo(controls.target);
    const output = e.deltaY;

    // If zooming out (deltaY > 0) and at max distance
    // Using 599 as threshold (max is 600)
    if (output > 0 && distance >= controls.maxDistance - 1) {
      containerRef.current.scrollBy({ top: output, behavior: 'auto' });
    }
  };

  // Prevent panning outside environment boundaries
  const handleControlsChange = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;

      // Clamp target Y position to stay above ground (y = -1 is the yard base)
      if (target.y < -1) {
        target.y = -1;
      }

      // Clamp target X and Z positions to stay within environment radius
      // We limit to 180 to keep the camera safely inside the icd area
      const maxPanRadius = 180;
      const distance = Math.sqrt(target.x * target.x + target.z * target.z);

      if (distance > maxPanRadius) {
        const ratio = maxPanRadius / distance;
        target.x *= ratio;
        target.z *= ratio;
      }
    }

    // Dispatch event to notify about camera controls change
    window.dispatchEvent(new CustomEvent('controlsChanged'));
  };

  const isDataLoading = layoutLoading || containersLoading || !sceneReady;
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  const activePanel = useUIStore((state) => state.activePanel);
  const closePanel = useUIStore((state) => state.closePanel);

  const selectId = useStore((state) => state.selectId);
  const selectedBlock = useStore((state) => state.selectedBlock);
  const setSelectId = useStore((state) => state.setSelectId);
  const setSelectedBlock = useStore((state) => state.setSelectedBlock);

  // Exclusive panel logic
  useEffect(() => {
    if (activePanel) {
      // When a panel opens, clear selection
      setSelectId(null);
      setSelectedBlock(null);
    }
  }, [activePanel, setSelectId, setSelectedBlock]);

  useEffect(() => {
    if (selectId || selectedBlock) {
      // When selection happens, close panels
      closePanel();
    }
  }, [selectId, selectedBlock, closePanel]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        margin: 0,
        padding: 0,
        position: 'relative',
        scrollBehavior: 'smooth'
      }}
    >

      {/* Modern Branding Header - Fixed on top of container */}
      <div style={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1000, height: 0 }}>
        <ModernHeader activeNav={activeNav} onNavChange={handleNavChange} />
        <HoverInfoPanel />
      </div>

      {/* 3D View Section */}
      <section
        ref={canvasSectionRef}
        onWheel={handleCanvasWheel}
        style={{
          width: '100%',
          height: '100vh',
          position: 'relative',
          // Ensure overlays work
        }}
      >
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
          style={{ width: '100%', height: '100%', display: 'block' }}
          camera={{ position: [0, 150, 300], fov: 45 }}
          shadows
        >
          <color attach="background" args={['#E6F4F1']} />

          <Environment />
          <DynamicLayoutEngine />
          <IcdMarkings />
          <Fencing />
          <Gates />
          <Containers
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
            minDistance={0}                        // Minimum zoom distance
            maxDistance={600}                       // Maximum zoom distance (Restricted)
            enablePan={true}                        // Allow panning
            panSpeed={1}                            // Pan speed
            rotateSpeed={0.8}                       // Rotation speed
            onChange={handleControlsChange}         // Clamp target position
            enableZoom={true}
          />
        </Canvas>

        {/* Quick Actions Button */}
        <QuickActionsButton />

        {/* Action Panels */}
        <PositionContainerPanel isOpen={activePanel === 'position'} onClose={closePanel} />
        <GateInPanel isOpen={activePanel === 'gateIn'} onClose={closePanel} />
        <GateOutPanel isOpen={activePanel === 'gateOut'} onClose={closePanel} />
        <StuffingPanel isOpen={activePanel === 'stuffing'} onClose={closePanel} />
        <DestuffingPanel isOpen={activePanel === 'destuffing'} onClose={closePanel} />
        <PlugInOutPanel isOpen={activePanel === 'plugInOut'} onClose={closePanel} />
        <CFSTaskAssignmentPanel isOpen={activePanel === 'cfsTask'} onClose={closePanel} />
        <ReservedContainersPanel isOpen={activePanel === 'reservedContainers'} onClose={closePanel} />
      </section>

      {/* Dashboard Section */}
      <section
        ref={dashboardSectionRef}
        style={{
          width: '100%',
          minHeight: '100vh',
          position: 'relative',
          background: '#F5F7F7',
          zIndex: 10
        }}
      >
        <Dashboard />
      </section>
    </div>
  );
}

export default App;
