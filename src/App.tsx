/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';

// Pages — lazy-loaded so each route ships in its own chunk and the initial
// bundle stays small. The page-chunk imports are also captured as plain
// functions so we can warm them all on idle, making future navigations instant.
const importLogin = () => import('./pages/Login');
const importRegister = () => import('./pages/Register');
const importStudentDashboard = () => import('./pages/StudentDashboard');
const importAdminDashboard = () => import('./pages/AdminDashboard');
const importHODDashboard = () => import('./pages/HODDashboard');
const importCourseView = () => import('./pages/CourseView');
const importProfile = () => import('./pages/Profile');
const importSettings = () => import('./pages/Settings');
const importLanding = () => import('./pages/Landing');

const Login = lazy(importLogin);
const Register = lazy(importRegister);
const StudentDashboard = lazy(importStudentDashboard);
const AdminDashboard = lazy(importAdminDashboard);
const HODDashboard = lazy(importHODDashboard);
const CourseView = lazy(importCourseView);
const Profile = lazy(importProfile);
const Settings = lazy(importSettings);
const Landing = lazy(importLanding);

// Warm all route chunks once the browser is idle. Each chunk lands in the
// browser cache, so the first navigation to a new page never has to wait on a
// network round-trip for its bundle.
const prefetchAllRoutes = () => {
  const chunks = [
    importLogin, importRegister, importLanding, importProfile, importSettings,
    importCourseView, importStudentDashboard, importAdminDashboard, importHODDashboard,
  ];
  for (const c of chunks) c();
};

// Components
import Navbar from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';
import ClickSpark from './components/ClickSpark';
import TopProgressBar from './components/TopProgressBar';
import SkeletonFallback from './components/SkeletonFallback';

// Heavy decorative components — WebGL shader + animated bg.
// Lazy-load so first paint isn't blocked; they fade in once loaded.
const LightRays = lazy(() => import('./components/LightRays'));
const AnimatedBackground = lazy(() => import('./components/AnimatedBackground'));

// Smooth page enter: 220ms opacity + tiny 6px lift, ease-out feels snappy not laggy.
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    style={{ willChange: 'opacity, transform' }}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  // Warm route chunks once the main thread is idle so navigations are instant.
  useEffect(() => {
    const idle =
      (window as any).requestIdleCallback ||
      ((cb: () => void) => setTimeout(cb, 1500));
    const handle = idle(prefetchAllRoutes);
    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel && typeof handle === 'number') cancel(handle);
    };
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  // WebGL rays shader burns GPU while animating. Show it only on the
  // marketing-style routes, not on dashboards where users do real work.
  const showShader = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className={`${theme === 'dark' ? 'dark-bg' : 'light-bg'} min-h-screen font-sans flex flex-col relative`}>
      {showShader && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Suspense fallback={null}>
            <LightRays
              raysOrigin="top-center"
              raysColor={theme === 'dark' ? '#ffffff' : '#0077FF'}
              raysSpeed={1}
              lightSpread={0.5}
              rayLength={3}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0}
              distortion={0}
              pulsating={false}
              fadeDistance={1}
              saturation={1}
            />
          </Suspense>
        </div>
      )}
      <ClickSpark
        sparkColor={theme === 'dark' ? '#ffffff' : '#0077FF'}
        sparkSize={10}
        sparkRadius={18}
        sparkCount={10}
        duration={500}
      />
      <div className="relative z-10 flex flex-col flex-1">
      <TopProgressBar />
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Suspense fallback={<SkeletonFallback />}>
          <Routes location={location}>
            <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
            <Route path="/login" element={!user ? <PageWrapper><Login /></PageWrapper> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <PageWrapper><Register /></PageWrapper> : <Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={
              <PageWrapper>
                {user?.role === 'hod' ? <HODDashboard /> :
                 user?.role === 'staff' ? <AdminDashboard /> :
                 user ? <StudentDashboard /> : <Navigate to="/login" />}
              </PageWrapper>
            } />

            <Route path="/course/:id" element={user ? <PageWrapper><CourseView /></PageWrapper> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <PageWrapper><Profile /></PageWrapper> : <Navigate to="/login" />} />
            <Route path="/settings" element={user ? <PageWrapper><Settings /></PageWrapper> : <Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      </div>
    </div>
  );
};

const Footer = () => {
  const { theme } = useTheme();
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className={`backdrop-blur-2xl border-t py-8 mt-auto ${
        theme === 'dark'
          ? 'bg-[#0a0a1a]/50 border-white/8'
          : 'bg-indigo-50/50 border-indigo-100/40'
      }`}
    >
      <div className={`container mx-auto px-4 text-center text-sm ${
        theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'
      }`}>
        <p>&copy; 2026 Course Code. All rights reserved.</p>
        <p className={`mt-2 italic ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>Empowering the next generation of developers.</p>
      </div>
    </motion.footer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={null}>
            <AnimatedBackground />
          </Suspense>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
