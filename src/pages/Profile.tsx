import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Save, Shield, Info, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';

export default function Profile() {
  const { user, token, login } = useAuth();
  const [formData, setFormData] = useState({ name: '', bio: '', profile_pic: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', bio: user.bio || '', profile_pic: user.profile_pic || '' });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setMessage('Profile updated successfully!');
        if (user) login(token!, { ...user, ...formData });
      }
    } catch (err) {
      setMessage('Update failed');
    } finally {
      setLoading(false);
    }
  };

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
        setShowPasswordForm(false);
      } else {
        setPasswordMsg(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordMsg('Failed to change password');
    }
  };

  const avatarUrl = formData.profile_pic || '';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, profile_pic: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-neutral-900">My Profile</h1>
        <p className="text-neutral-500 mt-2">Manage your personal information and account settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-neutral-100 rounded-full overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-neutral-300" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-[#0077FF] text-white rounded-full shadow-lg hover:bg-[#0066DD] transition-colors"
                title="Set image"
              >
                <Camera size={18} />
              </button>
              {avatarUrl && (
                <button
                  onClick={() => setFormData({ ...formData, profile_pic: '' })}
                  className="absolute bottom-0 left-0 p-2 bg-[#DC143C] text-white rounded-full shadow-lg hover:bg-[#B01030] transition-colors"
                  title="Remove image"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            <h3 className="text-xl font-bold text-neutral-900">{user?.name}</h3>
            <p className="text-sm text-neutral-400 uppercase tracking-widest font-bold mt-1">{user?.role}</p>
            <p className="text-xs text-neutral-500 mt-2">{user?.email}</p>
          </div>

          <div className="bg-neutral-100 p-6 rounded-3xl border border-neutral-200">
            <h4 className="font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <Shield size={18} /> Account Security
            </h4>
            <p className="text-xs text-neutral-700 leading-relaxed mb-3">
              Your account is protected. You can change your password below.
            </p>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="btn-glow w-full bg-[#0077FF] text-white py-2 rounded-xl text-sm font-bold hover:bg-[#0066DD] transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={14} /> {showPasswordForm ? 'Hide' : 'Change Password'}
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100"
          >
            {message && (
              <div className={`p-4 rounded-xl text-sm mb-8 font-medium ${message.includes('success') ? 'bg-neutral-100 text-neutral-900' : 'bg-red-50 text-red-600'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input type="email" disabled value={user?.email}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-500 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Bio</label>
                <div className="relative">
                  <Info className="absolute left-3 top-4 text-neutral-400" size={18} />
                  <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800 h-32"
                    placeholder="Tell us about yourself..." />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={loading}
                  className="btn-glow bg-[#0077FF] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0066DD] transition-all flex items-center gap-2 disabled:opacity-50">
                  <Save size={20} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Password Change Form */}
          {showPasswordForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100"
            >
              <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                <Lock className="text-neutral-900" size={20} /> Change Password
              </h3>

              {passwordMsg && (
                <div className={`p-4 rounded-xl text-sm mb-6 font-medium ${passwordMsg.includes('success') ? 'bg-neutral-100 text-neutral-900' : 'bg-red-50 text-red-600'}`}>
                  {passwordMsg}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Current Password</label>
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
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">New Password</label>
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
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input type="password" required value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-800" />
                  </div>
                </div>
                <button type="submit"
                  className="btn-glow bg-[#0077FF] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0066DD] transition-all flex items-center gap-2">
                  <Save size={18} /> Update Password
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
