'use client';

import { useEffect, useState, type FormEvent } from 'react';
import JudgeLayout from '@/components/JudgeLayout';
import {
  User,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Key,
  BadgeCheck,
} from 'lucide-react';

export default function JudgeProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setFullName(data.user.fullName || '');
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setMessage({ type: 'success', text: data.message || 'Profile updated successfully!' });
      setCurrentUser((prev: any) => ({ ...prev, fullName }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setMessage({ type: 'success', text: data.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <JudgeLayout
      user={currentUser}
      pageTitle="Judge Profile & Accreditation"
      pageSubtitle="Official judge credentials, personal identity, and security access management"
    >
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Status Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <BadgeCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Accredited Official Judge Status</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized to evaluate institutional and academic competitions across Apayao State College.
            </p>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Profile Info Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-[#0F4C81]" />
            <span>Personal Information</span>
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Judge Username / Portal ID</label>
              <input
                type="text"
                disabled
                value={currentUser?.username || ''}
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Assigned by the Tabulation Committee. Cannot be altered.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Full Legal Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Juan Dela Cruz"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-[#0F4C81] focus:bg-white rounded-xl text-slate-900 focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                This name will appear on official certified tabulation sheets and print reports.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3258] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0F4C81]" />
            <span>Change Security Password / PIN</span>
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-[#0F4C81] focus:bg-white rounded-xl text-slate-900 focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-[#0F4C81] focus:bg-white rounded-xl text-slate-900 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-[#0F4C81] focus:bg-white rounded-xl text-slate-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{savingPassword ? 'Updating Password...' : 'Update Security Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </JudgeLayout>
  );
}
