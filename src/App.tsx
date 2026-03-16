/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.35,
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || pageLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <AnimatePresence mode="wait">
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
  );
};

const Footer = () => (
  <motion.footer
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.5, duration: 0.6 }}
    className="bg-white border-t border-neutral-200 py-8 mt-auto"
  >
    <div className="container mx-auto px-4 text-center text-neutral-500 text-sm">
      <p>&copy; 2026 Course Code. All rights reserved.</p>
      <p className="mt-2 italic">Empowering the next generation of developers.</p>
    </div>
  </motion.footer>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
