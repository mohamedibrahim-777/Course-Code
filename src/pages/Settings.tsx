import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, KeyRound, Lock, Eye, EyeOff, Save, ArrowLeft } from 'lucide-react';

export default function Settings() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Password change
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 4) {
      setPasswordMsg('Password must be at least 4 characters');
      return;
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMsg(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordMsg('Failed to change password');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-10">
        <button
          onClick={() => navigate('/profile')}
          className={`flex items-center gap-2 text-sm font-medium mb-6 transition-colors ${
            isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>
        <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-3">
          <SettingsIcon size={28} /> Account Settings
        </h1>
        <p className="text-neutral-500 mt-2">Manage your account security.</p>
      </header>

      <div
        className="p-8 rounded-3xl border"
        style={{
          background: isDark ? 'rgba(12, 12, 30, 0.97)' : 'rgba(238, 242, 255, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(99, 102, 241, 0.1)',
          boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(99, 102, 241, 0.08), 0 4px 16px rgba(99, 102, 241, 0.04)',
        }}
      >
        <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          <KeyRound size={20} /> Change Password
        </h2>

        {passwordMsg && (
          <div className={`p-4 rounded-xl text-sm mb-6 font-medium ${passwordMsg.includes('success') ? (isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-700') : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600')}`}>
            {passwordMsg}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-5">
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input type={showCurrent ? 'text' : 'password'} required value={passwordData.currentPassword}
                onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input type={showNew ? 'text' : 'password'} required value={passwordData.newPassword}
                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input type="password" required value={passwordData.confirmPassword}
                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800" />
            </div>
          </div>
          <button type="submit"
            className="btn-glow w-full bg-[#0077FF] text-white py-3 rounded-xl font-bold hover:bg-[#0066DD] transition-all flex items-center justify-center gap-2 mt-2">
            <Save size={18} /> Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
