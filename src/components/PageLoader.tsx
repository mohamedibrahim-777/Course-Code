import { motion } from 'framer-motion';
import { useTheme } from '../ThemeContext';

export default function PageLoader() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ pointerEvents: 'all' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark ? 'rgba(6, 6, 17, 0.4)' : 'rgba(248, 250, 252, 0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />

      {/* Center spinner only */}
      <div className="relative z-10">
        <div className="relative w-14 h-14">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            className="absolute inset-0 border-[2.5px] rounded-full"
            style={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 119, 255, 0.15)',
              borderTopColor: '#0077FF',
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="absolute inset-2 border-[2px] rounded-full"
            style={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 119, 255, 0.08)',
              borderBottomColor: '#89CFF0',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-[#0077FF]"
              style={{ boxShadow: '0 0 8px rgba(0, 119, 255, 0.6)' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
