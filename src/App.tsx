import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { MapControls, Environment as DreiEnvironment } from '@react-three/drei';
import { useRef, useState, useEffect, useCallback } from 'react';
import LayoutEnvironment from './components/scene/core/Environment';
import LoadingScreen from './components/ui/feedback/scene/SceneLoader';
import ContainerDetailsPanel from './features/yard-planning/components/ContainerDetailsPanel';
import BlockDetailsPanel from './features/yard-planning/components/BlockDetailsPanel';
import CFSDetailsPanel from './features/yard-planning/components/CFSContainersPanel';
import InvalidContainersPanel from './features/yard-planning/components/InvalidContainersPanel';
import CustomerDetailsPanel from './features/yard-planning/components/CustomerDetailsPanel';
import ModernHeader from './components/layout/ModernHeader';
import HoverInfoPanel from './components/layout/HoverInfoPanel';
import { CameraTransition } from './components/scene/core/CameraTransition';
import { KeyboardNavigation } from './components/scene/core/KeyboardNavigation';
import { CameraBounds } from './components/scene/core/CameraBounds';
import DynamicLayoutEngine from './components/scene/infrastructure/dynamic/DynamicLayoutEngine';
import Fencing from './components/scene/infrastructure/Fencing';
import QuickActionsButton from './features/shared/components/QuickActionsButton';
import { useUIStore } from './store/uiStore';
import { useStore } from './store/store';
import GateInPanel from './features/operations/components/GateInPanel';
import GateOutPanel from './features/operations/components/GateOutPanel';
import StuffingPanel from './features/operations/components/StuffingPanel';
import DestuffingPanel from './features/operations/components/DestuffingPanel';
import PlugInOutPanel from './features/operations/components/PlugInOutPanel';
import CFSTaskAssignmentPanel from './features/operations/components/CFSTaskAssignmentPanel';
import PositionContainerPanel from './features/yard-planning/components/PositionContainerPanel';
import RestackContainersPanel from './features/yard-planning/components/RestackContainersPanel';
import Dashboard from './features/dashboard/Dashboard';
import { DashboardDrilldownModal } from './features/dashboard/components/fleet-intelligence/drilldowns/DashboardDrilldownModal';
import Containers from './components/scene/objects/Containers';
import { ReserveContainersPanelNew } from './features/yard-planning/components/ReserveContainersPanelNew';
import ReleaseContainerPanel from './features/yard-planning/components/ReleaseContainerPanel';
import SettingsPanel from './features/settings/components/SettingsPanel';
import GhostContainer from './components/scene/objects/GhostContainer';
import ToastContainer from './components/ui/feedback/common/Toast';
import { EffectsWrapper } from './components/scene/effects/EffectsWrapper';
import { Lighting } from './components/scene/core/Lighting';
import ViewNavigationPanel from './features/yard-planning/components/ViewNavigationPanel';

import { useScreenAccess } from './hooks/useScreenAccess';
import LoginScreen from './features/auth/components/LoginScreen';
import IcdMarkings from './components/scene/infrastructure/IcdMarkings';
import Gates from './components/scene/infrastructure/Gates';
import RestackConnectionLine from './components/scene/effects/RestackConnectionLine';
import SubscriptionExpiredScreen from './features/auth/components/SubscriptionExpiredScreen';
import { InactivityManager } from './features/auth/components/InactivityManager';
import CustomerInventoryPanel from './features/yard-planning/components/CustomerInventoryPanel';
import { useLayoutQuery } from './components/scene/infrastructure/apis/layoutApi';
import { useContainersQuery } from './features/yard-planning/apis/containerApi';
import { useAuthStore } from './features/auth/store/authStore';

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

  // [NEW] Reset loading state on logout
  // This ensures that when the user logs back in, they see the loading screen
  // instead of a black/empty 3D scene while it initializes.
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoadingScreen(true);
      setSceneReady(false);
    }
  }, [isAuthenticated]);

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
            isUIVisible={true}
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
      <InactivityManager />

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


          {/* Sync Overlay - Premium Slate & Gold */}
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
              background: 'rgba(17, 24, 39, 0.6)', // Darker slate overlay with transparency
              backdropFilter: 'blur(8px)', // Glass effect
              pointerEvents: 'all', // Block interactions
              animation: 'fadeIn 0.3s ease-out'
            }}>
              {/* Premium Gold Spinner */}
              <div style={{ position: 'relative', width: '64px', height: '64px', marginBottom: '24px' }}>
                <svg style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  animation: 'spin 2s linear infinite',
                }} viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="syncRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F7CF9B" />
                      <stop offset="100%" stopColor="#E5B070" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#syncRingGrad)" strokeWidth="3" strokeDasharray="70 220" strokeLinecap="round" />
                </svg>

                {/* Inner Logo Icon */}
                <div style={{
                  position: 'absolute',
                  inset: '16px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#F7CF9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17L12 22L22 17" stroke="#F7CF9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                    <path d="M2 12L12 17L22 12" stroke="#F7CF9B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                  </svg>
                </div>
              </div>

              <span style={{
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                fontFamily: "'Inter', sans-serif",
              }}>
                Syncing New Data...
              </span>

              {/* Shimmer Line */}
              <div style={{
                marginTop: '12px',
                height: '2px',
                width: '120px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '1px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, #F7CF9B, transparent)',
                  animation: 'shimmer 1.5s infinite linear'
                }} />
              </div>

              <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
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
            visibility: activeNav === 'Dashboard' ? 'visible' : 'hidden', // HIDE from keyboard focus
            transition: activeNav === 'Dashboard' ? 'visibility 0s' : 'visibility 0s linear 0.8s', // Delay hide to allow slide animation
          }}
        >

          <Dashboard />
        </section>
      </div>

      {/* View Navigation Panel - Always Mounted (Hidden by CSS if needed, but we want it ready) */}
      {activeNav === '3D View' && activePanel !== 'accessControl' && <ViewNavigationPanel />}

      {/* Quick Actions Button - Always Mounted */}
      {activeNav === '3D View' && activePanel !== 'accessControl' && <QuickActionsButton />}

      {/* Global Drilldown Modal - Portal powered */}
      <DashboardDrilldownModal />

      {/* Action Panels Overlay Layer (PROPER ROOT POSITION) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <ContainerDetailsPanel />
            <BlockDetailsPanel />
            <CustomerDetailsPanel />
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

      {/* Loading Screen - ROOT LEVEL (Highest Z-Index) */}
      {showLoadingScreen && (
        <LoadingScreen
          isLoading={isDataLoading}
          onComplete={() => setShowLoadingScreen(false)}
        />
      )}
    </div>
  );
}

export default App;
