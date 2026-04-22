import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, KeyRound, Lock, Eye, EyeOff, Save, ArrowLeft,
  Users as UsersIcon, Trash2, GraduationCap, Briefcase,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'staff';
  created_at: string;
}

export default function Settings() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const isHOD = user?.role === 'hod';

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

  // Manage users (HOD only)
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<ManagedUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersErr('');
    try {
      const res = await fetch('/api/users/manage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsersErr('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isHOD) loadUsers();
  }, [isHOD]);

  const handleDelete = async (target: ManagedUser) => {
    setDeletingId(target.id);
    setDeleteMsg('');
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteMsg(data.error || 'Delete failed');
      } else {
        setUsers(prev => prev.filter(u => u.id !== target.id));
        setDeleteMsg(`Deleted ${target.name}`);
      }
    } catch {
      setDeleteMsg('Delete failed');
    } finally {
      setDeletingId(null);
      setConfirmTarget(null);
    }
  };

  const students = users.filter(u => u.role === 'student');
  const staff = users.filter(u => u.role === 'staff');

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-10">
        <button
          onClick={() => navigate('/profile')}
          className={`flex items-center gap-2 text-sm font-medium mb-6 transition-colors ${
            isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          <SettingsIcon size={28} /> Account Settings
        </h1>
        <p className={`mt-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Manage your account security{isHOD ? ' and users' : ''}.</p>
      </header>

      <div
        className="p-8 rounded-3xl border max-w-xl"
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

      {isHOD && (
        <div
          className="p-8 rounded-3xl border mt-8"
          style={{
            background: isDark ? 'rgba(12, 12, 30, 0.97)' : 'rgba(238, 242, 255, 0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(99, 102, 241, 0.1)',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 4px rgba(99, 102, 241, 0.08), 0 4px 16px rgba(99, 102, 241, 0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              <UsersIcon size={20} /> Manage Users
            </h2>
            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                isDark ? 'bg-white/5 text-neutral-300 hover:bg-white/10' : 'bg-indigo-100/60 text-indigo-700 hover:bg-indigo-200/60'
              } disabled:opacity-50`}
            >
              {usersLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <p className={`text-sm mb-5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Remove students or staff who have left. Staff-created courses will be reassigned to you.
          </p>

          {deleteMsg && (
            <div className={`p-3 rounded-xl text-sm mb-5 font-medium ${
              deleteMsg.startsWith('Deleted')
                ? (isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-700')
                : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600')
            }`}>
              {deleteMsg}
            </div>
          )}

          {usersErr && (
            <div className={`p-3 rounded-xl text-sm mb-5 font-medium ${isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'}`}>
              {usersErr}
            </div>
          )}

          {/* Staff group */}
          <div className="mb-7">
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              <Briefcase size={14} /> Staff ({staff.length})
            </h3>
            {staff.length === 0 ? (
              <p className={`text-sm italic ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>No staff members.</p>
            ) : (
              <div className="space-y-2">
                {staff.map(u => (
                  <UserRow key={u.id} u={u} isDark={isDark} deletingId={deletingId} onDelete={() => setConfirmTarget(u)} />
                ))}
              </div>
            )}
          </div>

          {/* Students group */}
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              <GraduationCap size={14} /> Students ({students.length})
            </h3>
            {students.length === 0 ? (
              <p className={`text-sm italic ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>No students.</p>
            ) : (
              <div className="space-y-2">
                {students.map(u => (
                  <UserRow key={u.id} u={u} isDark={isDark} deletingId={deletingId} onDelete={() => setConfirmTarget(u)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => deletingId === null && setConfirmTarget(null)}
        >
          <div
            className="max-w-md w-full p-6 rounded-2xl border"
            style={{
              background: isDark ? 'rgba(18, 18, 38, 0.98)' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              Delete {confirmTarget.role === 'staff' ? 'staff' : 'student'}?
            </h3>
            <p className={`text-sm mb-5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              <strong>{confirmTarget.name}</strong> ({confirmTarget.email}) will be removed permanently along with all their progress, comments, focus sessions and enrollments.
              {confirmTarget.role === 'staff' && ' Their courses will be reassigned to you.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={deletingId !== null}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isDark ? 'bg-white/5 text-neutral-300 hover:bg-white/10' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmTarget)}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                <Trash2 size={14} />
                {deletingId === confirmTarget.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const UserRow = ({
  u, isDark, deletingId, onDelete,
}: {
  u: ManagedUser;
  isDark: boolean;
  deletingId: string | null;
  onDelete: () => void;
}) => (
  <div
    className={`flex items-center justify-between p-3 rounded-xl border ${
      isDark ? 'bg-white/[0.02] border-white/8' : 'bg-white/60 border-indigo-100/60'
    }`}
  >
    <div className="min-w-0">
      <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{u.name}</div>
      <div className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{u.email}</div>
    </div>
    <button
      onClick={onDelete}
      disabled={deletingId !== null}
      className={`ml-3 shrink-0 p-2 rounded-lg transition-colors ${
        isDark ? 'text-red-400 hover:bg-red-500/15' : 'text-red-600 hover:bg-red-50'
      } disabled:opacity-50`}
      title={`Delete ${u.name}`}
    >
      <Trash2 size={16} />
    </button>
  </div>
);
