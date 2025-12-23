import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import Environment from './components/layout/Environment';
import LoadingScreen from './components/ui/LoadingScreen';
import LoginScreen from './components/ui/LoginScreen';
import ContainerDetailsPanel from './components/panels/details/ContainerDetailsPanel';
import BlockDetailsPanel from './components/panels/details/BlockDetailsPanel';
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
import GateInPanel from './components/panels/actions/GateInPanel';
import GateOutPanel from './components/panels/actions/GateOutPanel';
import StuffingPanel from './components/panels/actions/StuffingPanel';
import DestuffingPanel from './components/panels/actions/DestuffingPanel';
import PlugInOutPanel from './components/panels/actions/PlugInOutPanel';
import CFSTaskAssignmentPanel from './components/panels/actions/CFSTaskAssignmentPanel';
import PositionContainerPanel from './components/panels/actions/PositionContainerPanel';
import Dashboard from './components/ui/Dashboard';
import Containers from './components/layout/Containers';
import CustomerInventoryPanel from './components/panels/actions/CustomerInventoryPanel';
import ReserveContainersPanel from './components/panels/actions/ReserveContainersPanel';
import ReleaseContainerPanel from './components/panels/actions/ReleaseContainerPanel';
import SwapConnectionLines from './components/layout/SwapConnectionLines';
import ToastContainer from './components/ui/Toast';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedIcdId, setSelectedIcdId] = useState('naqleen-jeddah');
  const { data: layout, isLoading: layoutLoading } = useLayoutQuery(selectedIcdId);
  const { isLoading: containersLoading } = useContainersQuery(layout || null);
  const [sceneReady, setSceneReady] = useState(false);
  const [activeNav, setActiveNav] = useState('3D View');

  const canvasSectionRef = useRef<HTMLElement>(null);
  const dashboardSectionRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<any>(null);
  // Scroll Handling & Snap Logic - REMOVED


  const handleNavChange = (nav: string) => {
    setActiveNav(nav);
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        position: 'relative',
        background: '#111'
      }}
    >

      {/* Modern Branding Header - Fixed Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, height: 0 }}>
        <ModernHeader
          activeNav={activeNav}
          onNavChange={handleNavChange}
          isSearchVisible={true}
          isUIVisible={!showLoadingScreen}
          selectedIcdId={selectedIcdId}
          onIcdChange={setSelectedIcdId}
          onLogout={() => {
            setIsAuthenticated(false);
            setShowLoadingScreen(true);
            setActiveNav('3D View');
          }}
        />
        <HoverInfoPanel />
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Sliding Viewport Container */}
      <div
        style={{
          width: '100%',
          height: '200%', // Space for two full-screen sections
          transform: activeNav === 'Dashboard' ? 'translateY(-50%)' : 'translateY(0)',
          transition: 'transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)', // Premium ease-in-out-expo feel
        }}
      >
        {/* 3D View Section */}
        <section
          ref={canvasSectionRef}
          style={{
            width: '100%',
            height: '50%', // 50% of 200% = 100vh
            position: 'relative',
          }}
        >
          {/* Loading Screen */}
          {showLoadingScreen &&
            (
              <LoadingScreen
                isLoading={isDataLoading}
                onComplete={() => setShowLoadingScreen(false)}
              />
            )}

          <Canvas
            style={{ width: '100%', height: '100%', display: 'block' }}
            camera={{ position: [0, 150, 300], fov: 45, near: 1.0 }}
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
            <SwapConnectionLines />

            <CameraTransition isLoading={showLoadingScreen} controlsRef={controlsRef} />

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.05}
              minPolarAngle={0}                    // Prevent looking straight down
              maxPolarAngle={Math.PI / 2 - 0.05}     // Prevent going below horizontal
              minDistance={0}                       // Minimum zoom distance (Prevents clipping/going inside)
              maxDistance={600}                       // Maximum zoom distance (Restricted)
              enablePan={true}                        // Allow panning
              panSpeed={1}                            // Pan speed
              rotateSpeed={0.8}                       // Rotation speed
              onChange={handleControlsChange}         // Clamp target position
              enableZoom={true}
              zoomSpeed={3}
              zoomToCursor={true}
            />
          </Canvas>

          {/* Panels */}
          <ContainerDetailsPanel />
          <BlockDetailsPanel />
          <PositionContainerPanel isOpen={activePanel === 'position'} onClose={closePanel} />
          <GateInPanel isOpen={activePanel === 'gateIn'} onClose={closePanel} />
          <GateOutPanel isOpen={activePanel === 'gateOut'} onClose={closePanel} />
          <StuffingPanel isOpen={activePanel === 'stuffing'} onClose={closePanel} />
          <DestuffingPanel isOpen={activePanel === 'destuffing'} onClose={closePanel} />
          <PlugInOutPanel isOpen={activePanel === 'plugInOut'} onClose={closePanel} />
          <CFSTaskAssignmentPanel isOpen={activePanel === 'cfsTask'} onClose={closePanel} />
          <ReserveContainersPanel isOpen={activePanel === 'reserveContainers'} onClose={closePanel} />
          <ReleaseContainerPanel isOpen={activePanel === 'releaseContainer'} onClose={closePanel} />
          <CustomerInventoryPanel isOpen={activePanel === 'customerInventory'} onClose={closePanel} />
        </section>

        {/* Dashboard Section */}
        <section
          ref={dashboardSectionRef}
          style={{
            width: '100%',
            height: '50%', // 50% of 200% = 100vh
            position: 'relative',
            background: '#F5F7F7',
            zIndex: 10,
            overflowY: 'auto', // Enable scrolling within the dashboard
            overflowX: 'hidden'
          }}
        >
          <Dashboard />
        </section>
      </div>

      {/* Quick Actions Button - Fixed position relative to viewport */}
      {activeNav === '3D View' && !showLoadingScreen && <QuickActionsButton />}
    </div>
  );
}

export default App;
