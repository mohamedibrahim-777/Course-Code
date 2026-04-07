import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { LogOut, User, Home, LayoutDashboard, Menu, X, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      className={`backdrop-blur-xl border-b sticky top-0 z-40 ${
        theme === 'dark'
          ? 'bg-[#0a0a2a]/70 border-white/10'
          : 'bg-white/80 border-neutral-200/60'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              theme === 'dark' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'
            }`}
          >
            CC
          </motion.div>
          <span className={`font-bold text-xl tracking-tight group-hover:tracking-wide transition-all duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-neutral-900'
          }`}>Course Code</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-5">
          {user ? (
            <>
              <NavLink to="/" active={isActive('/')} theme={theme}><Home size={17} /> Home</NavLink>
              <NavLink to="/dashboard" active={isActive('/dashboard')} theme={theme}><LayoutDashboard size={17} /> Dashboard</NavLink>
              <NavLink to="/profile" active={isActive('/profile')} theme={theme}><User size={17} /> Profile</NavLink>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'text-yellow-400 hover:bg-white/10'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.button>
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
              <NavLink to="/" active={isActive('/')} theme={theme}>Home</NavLink>
              <NavLink to="/login" active={isActive('/login')} theme={theme}>Login</NavLink>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'text-yellow-400 hover:bg-white/10'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.button>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/register" className="btn-glow bg-[#0077FF] text-white px-5 py-2 rounded-xl text-sm font-medium">
                  Get Started
                </Link>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'text-yellow-400 hover:bg-white/10'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'text-neutral-300 hover:bg-white/10'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
            style={{ boxShadow: 'none' }}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`md:hidden backdrop-blur-xl border-t overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0a0a2a]/90 border-white/10'
                : 'bg-white/95 border-neutral-100'
            }`}
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

function NavLink({ to, active, children, theme }: { to: string; active: boolean; children: React.ReactNode; theme: string }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-300 relative py-1 ${
        theme === 'dark'
          ? (active ? 'text-white' : 'text-neutral-400 hover:text-white')
          : (active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900')
      }`}
    >
      {children}
      {active && (
        <motion.div
          layoutId="nav-underline"
          className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
          style={{ background: theme === 'dark' ? '#ffffff' : '#171717' }}
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
