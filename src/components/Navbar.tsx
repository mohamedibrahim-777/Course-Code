import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogOut, User, Home, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 sticky top-0 z-40"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white font-bold text-xs"
          >
            CC
          </motion.div>
          <span className="font-bold text-xl tracking-tight text-neutral-900 group-hover:tracking-wide transition-all duration-300">Course Code</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-5">
          {user ? (
            <>
              <NavLink to="/" active={isActive('/')}><Home size={17} /> Home</NavLink>
              <NavLink to="/dashboard" active={isActive('/dashboard')}><LayoutDashboard size={17} /> Dashboard</NavLink>
              <NavLink to="/profile" active={isActive('/profile')}><User size={17} /> Profile</NavLink>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                className="bg-[#DC143C] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#B01030] transition-colors shadow-sm"
              >
                <LogOut size={15} /> Logout
              </motion.button>
            </>
          ) : (
            <>
              <NavLink to="/" active={isActive('/')}>Home</NavLink>
              <NavLink to="/login" active={isActive('/login')}>Login</NavLink>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/register" className="btn-glow bg-[#0077FF] text-white px-5 py-2 rounded-xl text-sm font-medium">
                  Get Started
                </Link>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="md:hidden text-neutral-600"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </motion.button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-t border-neutral-100 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-3">
              <MobileLink to="/" onClick={() => setIsOpen(false)}>Home</MobileLink>
              {user ? (
                <>
                  <MobileLink to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</MobileLink>
                  <MobileLink to="/profile" onClick={() => setIsOpen(false)}>Profile</MobileLink>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLogout}
                    className="text-left text-white bg-[#DC143C] py-3 px-4 rounded-xl font-medium hover:bg-[#B01030] transition-colors"
                  >
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <MobileLink to="/login" onClick={() => setIsOpen(false)}>Login</MobileLink>
                  <Link to="/register" onClick={() => setIsOpen(false)} className="btn-glow bg-[#0077FF] text-white px-4 py-3 rounded-xl text-center font-medium">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-300 relative py-1 ${
        active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
      }`}
    >
      {children}
      {active && (
        <motion.div
          layoutId="nav-underline"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#ffffff] rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link to={to} onClick={onClick} className="block text-neutral-700 py-3 px-4 rounded-xl hover:bg-neutral-50 font-medium transition-colors duration-300">
        {children}
      </Link>
    </motion.div>
  );
}
