/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { motion } from 'framer-motion';
import { lazy, Suspense } from 'react';

// Pages — lazy-loaded so each route ships in its own chunk and the initial bundle stays small.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const HODDashboard = lazy(() => import('./pages/HODDashboard'));
const CourseView = lazy(() => import('./pages/CourseView'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Landing = lazy(() => import('./pages/Landing'));

// Components
import Navbar from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';
import PageLoader from './components/PageLoader';
import ClickSpark from './components/ClickSpark';
import TopProgressBar from './components/TopProgressBar';

// Heavy decorative components — Three.js shader + animated bg are ~600KB combined.
// Lazy-load so first paint isn't blocked; they fade in once loaded.
const Silk = lazy(() => import('./components/Silk'));
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

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`${theme === 'dark' ? 'dark-bg' : 'light-bg'} min-h-screen font-sans flex flex-col relative`}>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <Suspense fallback={null}>
          <Silk
            speed={5}
            scale={1}
            color={theme === 'dark' ? '#1a2540' : '#7B7481'}
            noiseIntensity={1.5}
            rotation={0}
          />
        </Suspense>
      </div>
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
        <Suspense fallback={<PageLoader />}>
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
