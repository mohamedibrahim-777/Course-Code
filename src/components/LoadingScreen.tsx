import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060611]"
    >
      <div className="relative w-24 h-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="absolute inset-0 border-[3px] border-white/10 border-t-[#0077FF] rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="absolute inset-2 border-[2px] border-white/5 border-b-[#89CFF0] rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="text-white font-black text-xl"
          >
            CC
          </motion.span>
        </div>
      </div>
      <motion.p
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="mt-6 text-neutral-400 font-medium tracking-widest uppercase text-[10px]"
      >
        Loading...
      </motion.p>
    </motion.div>
  );
}
