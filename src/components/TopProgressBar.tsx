import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeFetching } from '../services/dataCache';

// Thin animated bar at the top of the viewport that appears whenever a
// background data fetch is in flight. Same idea as YouTube/GitHub's loader —
// signals "something is happening" without blocking the page.
export default function TopProgressBar() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    return subscribeFetching((n) => setActive(n > 0));
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="topbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.15 }}
          className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none overflow-hidden"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
