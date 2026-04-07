import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code, Download, Shield, Users, Zap } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

export default function Landing() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 text-center max-w-4xl mx-auto">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.span variants={fadeUp} className="inline-block px-4 py-1.5 bg-neutral-100 text-neutral-900 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            The Future of Learning
          </motion.span>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black text-neutral-900 leading-tight mb-8">
            Master Programming <br />
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
              isDark
                ? 'from-[#0077FF] via-[#89CFF0] to-white'
                : 'from-[#0055CC] via-[#0077FF] to-[#89CFF0]'
            }`}>From Zero to Hero</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl text-neutral-500 mb-10 leading-relaxed max-w-2xl mx-auto">
            A structured, department-led platform designed to take you from beginner basics to advanced professional engineering.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="btn-glow w-full sm:w-auto bg-[#0077FF] text-white px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2">
                Get Started <ArrowRight size={20} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/login" className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-lg flex items-center justify-center backdrop-blur-sm transition-all border ${
                isDark
                  ? 'bg-[rgba(137,207,240,0.12)] text-[#89CFF0] border-[rgba(137,207,240,0.3)] hover:bg-[rgba(137,207,240,0.2)]'
                  : 'bg-[rgba(0,119,255,0.08)] text-[#0055CC] border-[rgba(0,119,255,0.2)] hover:bg-[rgba(0,119,255,0.15)]'
              }`}>
                Student Login
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="absolute -top-10 -left-10 w-40 h-40 bg-[#0077FF] rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay: 1 }}
          className="absolute top-40 -right-10 w-60 h-60 bg-[#89CFF0] rounded-full blur-3xl"
        />
      </section>

      {/* Features Grid */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <FeatureCard icon={<Code size={32} />} title="18+ Languages" desc="From C and Python to Rust and Go. We cover the entire modern stack." delay={0} />
        <FeatureCard icon={<Zap size={32} />} title="Interactive Lessons" desc="Structured modules with video tutorials and practice exercises." delay={0.1} />
        <FeatureCard icon={<Download size={32} />} title="Resource Library" desc="Downloadable PDFs, Excel sheets, and documents for offline study." delay={0.2} />
      </motion.section>

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="bg-neutral-900 rounded-[3rem] p-12 md:p-20 text-white overflow-hidden relative"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <h2 className="text-4xl font-bold mb-6">Department-Led Excellence</h2>
            <p className="text-neutral-400 text-lg mb-8">
              Our platform is managed by the Head of Department and experienced staff members to ensure the highest quality of educational content.
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-4xl font-black text-white">100%</p>
                <p className="text-sm text-neutral-500 uppercase font-bold tracking-widest mt-2">Verified Content</p>
              </div>
              <div>
                <p className="text-4xl font-black text-white">24/7</p>
                <p className="text-sm text-neutral-500 uppercase font-bold tracking-widest mt-2">Access</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -4 }} className="bg-neutral-800 p-6 rounded-3xl border border-neutral-700 transition-all duration-300">
              <Shield className="text-neutral-400 mb-4" size={32} />
              <h4 className="font-bold">Secure Auth</h4>
              <p className="text-xs text-neutral-500 mt-2">OTP-based secure login system.</p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="bg-white text-neutral-900 p-6 rounded-3xl translate-y-8 transition-all duration-300">
              <Users className="text-neutral-900 mb-4" size={32} />
              <h4 className="font-bold">Staff Panel</h4>
              <p className="text-xs text-neutral-500 mt-2">Direct monitoring of student progress.</p>
            </motion.div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
      </motion.section>

      {/* Course Preview */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className="text-center"
      >
        <motion.h2 variants={fadeUp} className="text-3xl font-bold text-neutral-900 mb-12">Popular Learning Paths</motion.h2>
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
          {['Python', 'Java', 'JavaScript', 'C++', 'SQL', 'Go', 'Rust'].map((lang, i) => (
            <motion.div
              key={lang}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="px-6 py-3 bg-white border border-neutral-200 rounded-2xl font-bold text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 hover:shadow-lg transition-all duration-300 cursor-default"
            >
              {lang}
            </motion.div>
          ))}
        </motion.div>
        <motion.div variants={fadeUp} className="mt-12">
          <Link to="/register" className="text-neutral-900 font-bold inline-flex items-center gap-2 hover:gap-3 transition-all duration-300 group">
            Explore all 18 languages <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </motion.div>
      </motion.section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: any) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="card-hover bg-white p-10 rounded-[2.5rem] shadow-sm border border-neutral-100 text-center"
    >
      <div className="w-16 h-16 bg-neutral-100 text-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-neutral-900 mb-4">{title}</h3>
      <p className="text-neutral-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
