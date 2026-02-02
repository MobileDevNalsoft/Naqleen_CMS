import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment as DreiEnvironment, ContactShadows } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import LayoutEnvironment from './components/layout/Environment';
import LoadingScreen from './components/ui/animations/LoadingScreen';
import LoginScreen from './components/ui/LoginScreen';
import SubscriptionExpiredScreen from './components/ui/SubscriptionExpiredScreen';
import ContainerDetailsPanel from './components/panels/details/ContainerDetailsPanel';
import BlockDetailsPanel from './components/panels/details/BlockDetailsPanel';
import CFSDetailsPanel from './components/panels/details/CFSDetailsPanel';
import InvalidContainersPanel from './components/panels/details/InvalidContainersPanel';
import ModernHeader from './components/ui/ModernHeader';
import HoverInfoPanel from './components/ui/HoverInfoPanel';
import { CameraTransition } from './components/camera/CameraTransition';
import { useLayoutQuery, useContainersQuery } from './api';
import { KeyboardNavigation } from './components/camera/KeyboardNavigation';
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
import RestackContainersPanel from './components/panels/actions/RestackContainersPanel';
import Dashboard from './components/ui/Dashboard';
import { DashboardDrilldownModal } from './components/ui/DashboardDrilldownModal';
import Containers from './components/layout/Containers';
import CustomerInventoryPanel from './components/panels/actions/CustomerInventoryPanel';
import ReserveContainersPanel from './components/panels/actions/ReserveContainersPanel';
import ReleaseContainerPanel from './components/panels/actions/ReleaseContainerPanel';
import SettingsPanel from './components/panels/settings/SettingsPanel'; // [NEW] Import
import SwapConnectionLines from './components/layout/SwapConnectionLines';
import RestackConnectionLine from './components/layout/RestackConnectionLine';
import GhostContainer from './components/layout/GhostContainer';
import ToastContainer from './components/ui/custom-components/Toast';
import { EffectsWrapper } from './components/effects/EffectsWrapper';
import ViewNavigationPanel from './components/ui/ViewNavigationPanel';

import { useAuthStore } from './store/authStore';
import { useScreenAccess } from './hooks/useScreenAccess';

const App = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout = useAuthStore(state => state.logout);
  const { hasOnlyDashboard } = useScreenAccess();
  const isSubscriptionValid = useAuthStore(state => state.user?.isSubscriptionValid);

  const [selectedIcdId, setSelectedIcdId] = useState('naqleen-jeddah');
  const { data: layout, isLoading: layoutLoading } = useLayoutQuery(selectedIcdId);
  const { isLoading: containersLoading } = useContainersQuery(layout || null);
  const [sceneReady, setSceneReady] = useState(false);

  // Dynamic default view based on user's screen access
  const defaultView = hasOnlyDashboard ? 'Dashboard' : '3D View';
  const [activeNav, setActiveNav] = useState(defaultView);

  // Force navigation to Dashboard if user is restricted (handles initial load delay)
  useEffect(() => {
    if (hasOnlyDashboard) {
      setActiveNav('Dashboard');
    }
  }, [hasOnlyDashboard]);

  // [NEW] Validate subscription on mount/app resume
  const validateSubscription = useAuthStore(state => state.validateSubscription);
  useEffect(() => {
    if (isAuthenticated) {
      validateSubscription();
    }
  }, [isAuthenticated, validateSubscription]);

  const canvasSectionRef = useRef<HTMLElement>(null);
  const dashboardSectionRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<any>(null);

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

      // Clamp target X and Z positions to stay within expanded yard bounds
      // Much larger bounds to allow free navigation across entire ICD
      const minX = -900;
      const maxX = 900;
      const minZ = -900;
      const maxZ = 900;

      target.x = Math.max(minX, Math.min(maxX, target.x));
      target.z = Math.max(minZ, Math.min(maxZ, target.z));
    }

    // Dispatch event to notify about camera controls change
    window.dispatchEvent(new CustomEvent('controlsChanged'));
  };

  const isDataLoading = layoutLoading || containersLoading || !sceneReady;
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  const activePanel = useUIStore((state) => state.activePanel);
  const panelData = useUIStore((state) => state.panelData);
  const closePanel = useUIStore((state) => state.closePanel);

  const selectId = useStore((state) => state.selectId);
  const selectedBlock = useStore((state) => state.selectedBlock);
  const setSelectId = useStore((state) => state.setSelectId);
  const setSelectedBlock = useStore((state) => state.setSelectedBlock);

  // Exclusive panel logic
  useEffect(() => {
    if (activePanel) {
      if (activePanel !== 'restack' && activePanel !== 'plugInOut') {
        setSelectId(null);
      }
      // Don't clear selectedBlock for cfsPosition to allow CFS panel to reopen
      if (activePanel !== 'cfsPosition') {
        setSelectedBlock(null);
      }
    }
  }, [activePanel, setSelectId, setSelectedBlock]);

  useEffect(() => {
    if (selectId || selectedBlock) {
      closePanel();
    }
  }, [selectId, selectedBlock, closePanel]);

  if (!isAuthenticated) {
    // Authentication state is handled solely by the store
    return <LoginScreen />;
  }

  // [NEW] Subscription Freeze Logic
  // Check explicit false (undefined should pass until validated)
  // Check explicit false (undefined should pass until validated)
  if (isSubscriptionValid === false) {
    return <SubscriptionExpiredScreen />;
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
      {activePanel !== 'accessControl' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, height: 0 }}>
          <ModernHeader
            activeNav={activeNav}
            onNavChange={handleNavChange}
            isSearchVisible={true}
            isUIVisible={!showLoadingScreen}
            selectedIcdId={selectedIcdId}
            onIcdChange={setSelectedIcdId}
            onLogout={() => {
              closePanel(); // Close Settings or any open panel
              logout();
              setShowLoadingScreen(true);
              setActiveNav('3D View');
            }}
          />
          <HoverInfoPanel />
        </div>
      )}

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
            camera={{ position: [0, 150, 300], fov: 45, near: 0.1, far: 5000 }} // Increased far clip
            shadows
            dpr={[1, 1.25]} // Reduced max DPR to save render buffer memory
            gl={{
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.6,
              antialias: true,
              powerPreference: 'high-performance'
            }}
          >
            <color attach="background" args={['#BCE6FF']} />
            <fog attach="fog" args={['#BCE6FF', 800, 4000]} /> {/* Clean yard, far horizon fog */}

            {/* Professional Lighting Rig - High Key, Warm & Bright */}
            <ambientLight intensity={1.0} color="#fffaf0" /> {/* Warm white, full fill */}
            <hemisphereLight
              intensity={0.9}
              color="#b0e0e6" // Powder Blue sky
              groundColor="#c3ebc3" // Light Green ground reflection
              position={[0, 50, 0]}
            />
            <directionalLight
              position={[100, 150, 50]} // Higher sun position for softer shadows
              intensity={0.8} // Reduced for softer contrast
              castShadow
              shadow-mapSize={[1024, 1024]} // Optimized Shadow Map (1024)
              shadow-camera-near={0.5}
              shadow-camera-far={500}
              shadow-camera-left={-200}
              shadow-camera-right={200}
              shadow-camera-top={200}
              shadow-camera-bottom={-200}
              shadow-bias={-0.0001}
            />

            {/* Cinematic Environment */}
            <DreiEnvironment preset="city" blur={0.8} background={false} />

            <ContactShadows
              position={[0, -0.01, 0]}
              opacity={0.45}
              scale={2000}
              blur={2.0}
              far={10}
              resolution={512} // Optimized Contact Shadow Resolution
              color="#000000"
            />

            <EffectsWrapper>
              <LayoutEnvironment />
              <DynamicLayoutEngine />
              <IcdMarkings />
              <Fencing />
              <Gates />
              <Containers
                controlsRef={controlsRef}
                onReady={() => setSceneReady(true)}
              />
              <SwapConnectionLines />
              <GhostContainer />
              <RestackConnectionLine />
            </EffectsWrapper>

            <CameraTransition isLoading={showLoadingScreen} controlsRef={controlsRef} />
            <KeyboardNavigation controlsRef={controlsRef} />

            {/* MapControls for better large-scale navigation */}
            <MapControls
              ref={controlsRef}
              makeDefault
              enabled={true}
              enableDamping={false}
              screenSpacePanning={false}
              minDistance={1}
              maxDistance={1000}
              maxPolarAngle={Math.PI / 2 - 0.05}
              rotateSpeed={0.5}
              panSpeed={1}
              zoomSpeed={3}
              zoomToCursor={true}
              onChange={handleControlsChange}
            />
          </Canvas>

          {/* Panels */}
          <ContainerDetailsPanel />
          <BlockDetailsPanel />
          <CFSDetailsPanel />
          <InvalidContainersPanel />
          <PositionContainerPanel isOpen={activePanel === 'position'} onClose={closePanel} />
          <PositionContainerPanel
            isOpen={activePanel === 'cfsPosition'}
            onClose={closePanel}
            mode="cfs_container"
            cfsContainer={panelData as any}
            categoryLabel={(panelData as any)?.categoryLabel}
          />
          <RestackContainersPanel isOpen={activePanel === 'restack'} onClose={closePanel} />
          <GateInPanel isOpen={activePanel === 'gateIn'} onClose={closePanel} />
          <GateOutPanel isOpen={activePanel === 'gateOut'} onClose={closePanel} />
          <StuffingPanel isOpen={activePanel === 'stuffing'} onClose={closePanel} />
          <DestuffingPanel isOpen={activePanel === 'destuffing'} onClose={closePanel} />
          <PlugInOutPanel isOpen={activePanel === 'plugInOut'} onClose={closePanel} />
          <CFSTaskAssignmentPanel isOpen={activePanel === 'cfsTask'} onClose={closePanel} />
          <ReserveContainersPanel isOpen={activePanel === 'reserveContainers'} onClose={closePanel} />
          <ReleaseContainerPanel isOpen={activePanel === 'releaseContainer'} onClose={closePanel} />
          <CustomerInventoryPanel isOpen={activePanel === 'customerInventory'} onClose={closePanel} />

          {/* Settings Panel (Centralized Configuration) */}
          <SettingsPanel />

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
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          <Dashboard />
        </section>
      </div>

      {/* View Navigation Panel */}
      {activeNav === '3D View' && !showLoadingScreen && activePanel !== 'accessControl' && <ViewNavigationPanel />}

      {/* Quick Actions Button */}
      {activeNav === '3D View' && !showLoadingScreen && activePanel !== 'accessControl' && <QuickActionsButton />}

      {/* Global Drilldown Modal - Portal powered */}
      <DashboardDrilldownModal />
    </div>
  );
}

export default App;
