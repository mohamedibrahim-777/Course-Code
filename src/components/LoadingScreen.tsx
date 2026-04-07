import { motion } from 'framer-motion';
import { useTheme } from '../ThemeContext';

export default function LoadingScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: isDark ? 'rgba(6, 6, 17, 0.5)' : 'rgba(248, 250, 252, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div className="relative w-24 h-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="absolute inset-0 border-[3px] rounded-full"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 119, 255, 0.15)',
            borderTopColor: '#0077FF',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="absolute inset-2 border-[2px] rounded-full"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 119, 255, 0.08)',
            borderBottomColor: '#89CFF0',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className={`font-black text-xl ${isDark ? 'text-white' : 'text-neutral-900'}`}
            style={{
              textShadow: isDark ? 'none' : '0 0 20px rgba(0, 119, 255, 0.3)',
            }}
          >
            CC
          </motion.span>
        </div>
      </div>
      <motion.p
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className={`mt-6 font-medium tracking-widest uppercase text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}
      >
        Loading...
      </motion.p>
    </motion.div>
  );
}
