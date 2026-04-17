import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Save, Info, Trash2, Settings } from 'lucide-react';


export default function Profile() {
  const { user, token, login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', bio: '', profile_pic: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">My Profile</h1>
          <p className="text-neutral-500 mt-2">Manage your personal information.</p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className={`p-3 rounded-2xl transition-colors ${
            isDark
              ? 'text-neutral-400 hover:text-white hover:bg-white/10'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-indigo-50'
          }`}
          title="Account Settings"
        >
          <Settings size={22} />
        </button>
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

            <div className="mt-6 pt-6 border-t border-neutral-100">
              <button
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-indigo-50'
                }`}
              >
                <Settings size={16} /> Account Settings
              </button>
            </div>
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
        </div>
      </div>
    </div>
  );
}
