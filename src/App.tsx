/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HODDashboard from './pages/HODDashboard';
import CourseView from './pages/CourseView';
import Profile from './pages/Profile';
import Landing from './pages/Landing';

// Components
import Navbar from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';
import PageLoader from './components/PageLoader';
import AnimatedBackground from './components/AnimatedBackground';
import ClickSpark from './components/ClickSpark';
import Silk from './components/Silk';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ type: 'tween', ease: [0.25, 0.1, 0.25, 1], duration: 0.3 }}
    style={{ willChange: 'opacity, transform' }}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const location = useLocation();
  const isFirstLoad = useRef(true);

  // Initial app load
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Show page loader on every route change (except first load)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    setPageLoading(true);
    const timer = setTimeout(() => setPageLoading(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (authLoading || initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`${theme === 'dark' ? 'dark-bg' : 'light-bg'} min-h-screen font-sans flex flex-col relative`}>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <Silk
          speed={5}
          scale={1}
          color={theme === 'dark' ? '#1a2540' : '#7B7481'}
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      <ClickSpark
        sparkColor={theme === 'dark' ? '#ffffff' : '#0077FF'}
        sparkSize={10}
        sparkRadius={18}
        sparkCount={10}
        duration={500}
      />
      <div className="relative z-10 flex flex-col flex-1">
      <Navbar />
      <AnimatePresence>{pageLoading && <PageLoader />}</AnimatePresence>
      <main className="container mx-auto px-4 py-8 flex-1">
        <AnimatePresence mode="popLayout">
          <Routes location={location} key={location.pathname}>
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
          </Routes>
        </AnimatePresence>
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
          : 'bg-white/60 border-neutral-200'
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
          <AnimatedBackground />
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
