import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment as DreiEnvironment } from '@react-three/drei';
import { useRef, useState, useEffect, useCallback } from 'react';
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
import { CameraBounds } from './components/camera/CameraBounds';
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
import { ReserveContainersPanelNew } from './components/panels/actions/ReserveContainersPanelNew';
import ReleaseContainerPanel from './components/panels/actions/ReleaseContainerPanel';
import SettingsPanel from './components/panels/settings/SettingsPanel'; // [NEW] Import
import SwapConnectionLines from './components/layout/SwapConnectionLines';
import RestackConnectionLine from './components/layout/RestackConnectionLine';
import GhostContainer from './components/layout/GhostContainer';
import ToastContainer from './components/ui/custom-components/Toast';
import { EffectsWrapper } from './components/effects/EffectsWrapper';
import { Lighting } from './components/layout/Lighting';
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

  // Stable callback for Containers to preventing re-renders
  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleNavChange = (nav: string) => {
    setActiveNav(nav);
  };

  // Force enable controls when returning to 3D View (Fix for freeze issue)
  useEffect(() => {
    if (activeNav === '3D View' && controlsRef.current) {
      console.log('[App] Force allowing controls');
      controlsRef.current.enabled = true;
    }
  }, [activeNav]);





  const isDataLoading = layoutLoading || containersLoading || !sceneReady;
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  const activePanel = useUIStore((state) => state.activePanel);
  const panelData = useUIStore((state) => state.panelData);
  const closePanel = useUIStore((state) => state.closePanel);
  const isSyncing = useUIStore((state) => state.isSyncing); // [NEW] Sync State

  const selectId = useStore((state) => state.selectId);
  const selectedBlock = useStore((state) => state.selectedBlock);
  const setSelectId = useStore((state) => state.setSelectId);
  const setSelectedBlock = useStore((state) => state.setSelectedBlock);

  // REMOVED: Post-Sync Control Reset
  // This was causing a "fake" interaction start event because controls.update()
  // fires 'change' events which might be interpreted as start of interaction.
  // Since user hand't moved mouse, 'end' never fired.
  // Removing this allows camera to stay where it is (better UX anyway).

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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: activePanel === 'settings' ? 10005 : 1000, height: 0 }}>
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
            pointerEvents: isSyncing ? 'none' : 'auto', // CSS-BASED LOCKING (Safer than disabling controls)
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

          {/* Sync Overlay - Transparent Loader */}
          {isSyncing && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(2px)',
              pointerEvents: 'all', // Block interactions
            }}>
              {/* Modern Spinner */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#64B5F6',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <span style={{
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                letterSpacing: '0.5px'
              }}>
                Syncing Data...
              </span>
              <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                 `}</style>
            </div>
          )}

          <Canvas
            frameloop="always"
            style={{ width: '100%', height: '100%', display: 'block' }}
            camera={{ position: [0, 150, 300], fov: 45, near: 0.1, far: 5000 }} // Increased far clip
            shadows
            dpr={[1, 1.25]} // Reduced max DPR to save render buffer memory
            gl={{
              toneMapping: THREE.ACESFilmicToneMapping, // Cinenmatic Tone Mapping
              toneMappingExposure: 1.2, // Slightly increased exposure for brightness
              antialias: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true
            }}
          >
            <color attach="background" args={['#BCE6FF']} />
            <fog attach="fog" args={['#BCE6FF', 800, 4000]} /> {/* Match fog to background */}

            {/* Centralized Studio Lighting */}
            <Lighting />

            {/* Cinematic Environment Map */}
            <DreiEnvironment preset="city" blur={0.8} background={false} />

            <EffectsWrapper>
              <LayoutEnvironment />
              <DynamicLayoutEngine />
              <IcdMarkings />
              <Fencing />
              <Gates />
              <Containers
                controlsRef={controlsRef}
                onReady={handleSceneReady}
              />
              <SwapConnectionLines />
              <GhostContainer />
              <RestackConnectionLine />
            </EffectsWrapper>

            <CameraTransition isLoading={showLoadingScreen} controlsRef={controlsRef} />
            <KeyboardNavigation controlsRef={controlsRef} />
            <CameraBounds controlsRef={controlsRef} />

            {/* MapControls for better large-scale navigation */}
            <MapControls
              ref={controlsRef}
              makeDefault
              // enabled={!isSyncing} <--- REMOVED: Caused state desync. Using pointer-events on wrapper instead.
              enableDamping={false}
              screenSpacePanning={true} // Revert to screen space panning for "normal" feel
              minDistance={0.1}
              maxDistance={1000}
              maxPolarAngle={Math.PI / 2 - 0.05}
              rotateSpeed={0.5}
              panSpeed={1}
              zoomSpeed={3}
              zoomToCursor={true}
              mouseButtons={{
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
              }}
            />
          </Canvas>




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
            overflowX: 'hidden',
            pointerEvents: activeNav === 'Dashboard' ? 'auto' : 'none', // DISABLE interactions when hidden
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

      {/* Action Panels Overlay Layer (PROPER ROOT POSITION) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
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
            <ReserveContainersPanelNew isOpen={activePanel === 'reserveContainers'} onClose={closePanel} />
            <ReleaseContainerPanel isOpen={activePanel === 'releaseContainer'} onClose={closePanel} />
            <CustomerInventoryPanel isOpen={activePanel === 'customerInventory'} onClose={closePanel} />
            <SettingsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
