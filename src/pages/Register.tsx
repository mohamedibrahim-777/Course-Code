import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, GraduationCap, Briefcase } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Form, 2: OTP
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegisterRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, otp, role }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="bg-white p-8 rounded-2xl shadow-xl border border-neutral-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-neutral-900">
            {step === 1 ? 'Create Account' : 'Verify Email'}
          </h2>
          <p className="text-neutral-500 mt-2">
            {step === 1
              ? 'Join our learning community today'
              : 'Enter the 6-digit OTP sent to your email'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>1</div>
          <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>2</div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRegisterRequest} className="space-y-5">
            <div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                    role === 'student'
                      ? 'border-[#0077FF] bg-[#0077FF]/10 text-[#0077FF]'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  <GraduationCap size={18} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                    role === 'staff'
                      ? 'border-[#0077FF] bg-[#0077FF]/10 text-[#0077FF]'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-300'
                  }`}
                >
                  <Briefcase size={18} />
                  Staff
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text" required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-800 outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="email" required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-800 outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-800 outline-none"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-glow w-full bg-[#0077FF] text-white py-3 rounded-xl font-bold hover:bg-[#0066DD] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Continue'} <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="bg-neutral-100 border border-neutral-200 p-4 rounded-xl text-sm text-neutral-700">
              We've sent a verification code to <strong>{email}</strong>.
              Check the <strong>server console</strong> for the OTP (demo mode).
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Enter 6-Digit OTP</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-800 focus:border-transparent transition-all outline-none tracking-[0.5em] font-mono text-center text-lg"
                  placeholder="000000"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-glow w-full bg-[#0077FF] text-white py-3 rounded-xl font-bold hover:bg-[#0066DD] transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); setOtp(''); }}
              className="w-full text-neutral-500 text-sm font-medium hover:text-neutral-700"
            >
              Back to Registration
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <p className="text-neutral-500 text-sm">
            Already have an account? <Link to="/login" className="text-neutral-900 font-bold hover:underline">Login here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
