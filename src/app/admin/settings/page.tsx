'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Database, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet, Lock, Save } from 'lucide-react';
import { SHEET_SCHEMAS } from '@/lib/schemas';

export default function AdminSettingsPage() {
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // General Settings state
  const [generalSettings, setGeneralSettings] = useState({
    system_name: 'Automated Scoring & Tabulation System',
    organization: 'Apayao State College',
    academic_year: '2025-2026',
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState('');

  // Admin Profile state
  const [adminProfile, setAdminProfile] = useState({
    full_name: 'ASC Administrator',
    username: 'admin',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    fetch('/api/setup-sheets')
      .then((res) => res.json())
      .then((data) => setGoogleStatus(data));

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setGeneralSettings((prev) => ({ ...prev, ...data }));
        }
      });
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/setup-sheets', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
    } catch (e: any) {
      setSyncResult({ success: false, error: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setGeneralMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalSettings),
      });
      const data = await res.json();
      if (data.success) {
        setGeneralMessage('General settings updated successfully!');
        setTimeout(() => setGeneralMessage(''), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');

    if (adminProfile.new_password && adminProfile.new_password !== adminProfile.confirm_password) {
      setProfileMessage('Error: New passwords do not match');
      setSavingProfile(false);
      return;
    }

    try {
      if (adminProfile.new_password) {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change_password',
            currentPassword: adminProfile.current_password,
            newPassword: adminProfile.new_password,
          }),
        });
      }

      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          fullName: adminProfile.full_name,
        }),
      });

      setProfileMessage('Admin security credentials updated successfully!');
      setTimeout(() => setProfileMessage(''), 3000);
      setAdminProfile({ ...adminProfile, current_password: '', new_password: '', confirm_password: '' });
    } catch (e: any) {
      setProfileMessage(`Error: ${e.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AppLayout
      pageTitle="System Settings & Infrastructure"
      pageSubtitle="Configure institutional identity, academic period, admin credentials, and Google Sheets database sync"
    >
      <div className="space-y-6 max-w-4xl">
        {/* 1. GENERAL SYSTEM SETTINGS MATCHING ASTS/admin/settings.php */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yale-50 text-yale-700 flex items-center justify-center border border-yale-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">General System Settings</h2>
              <p className="text-xs text-slate-500">Configure institutional headers and academic school year</p>
            </div>
          </div>

          {generalMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{generalMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">System Title</label>
              <input
                type="text"
                value={generalSettings.system_name}
                onChange={(e) => setGeneralSettings({ ...generalSettings, system_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / College</label>
                <input
                  type="text"
                  value={generalSettings.organization}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, organization: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={generalSettings.academic_year}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, academic_year: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingGeneral}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingGeneral ? 'Saving...' : 'Save General Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. ADMIN PROFILE & SECURITY MATCHING ASTS/admin/settings.php */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Administrator Security Profile</h2>
              <p className="text-xs text-slate-500">Manage administrator account name and update master password</p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                profileMessage.startsWith('Error')
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              {profileMessage.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{profileMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminProfile.full_name}
                  onChange={(e) => setAdminProfile({ ...adminProfile, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  disabled
                  value={adminProfile.username}
                  className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={adminProfile.new_password}
                  onChange={(e) => setAdminProfile({ ...adminProfile, new_password: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={adminProfile.confirm_password}
                  onChange={(e) => setAdminProfile({ ...adminProfile, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Saving...' : 'Update Security Profile'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* 3. GOOGLE SHEETS CLOUD DATABASE CONNECTION */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Google Sheets Database Connection</h2>
                <p className="text-xs text-slate-500">
                  {googleStatus?.googleConfigured
                    ? 'Connected and synchronized with Google Cloud Service Account.'
                    : 'Currently in local in-memory demo mode. Add environment variables for cloud sync.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Verifying...' : 'Verify & Sync All Tables'}</span>
            </button>
          </div>

          {syncResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                syncResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{syncResult.message || syncResult.error}</p>
                {syncResult.createdTabs && syncResult.createdTabs.length > 0 && (
                  <p className="text-[11px] mt-1 text-emerald-700">
                    Created tabs: {syncResult.createdTabs.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Table Schemas Summary */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Relational Tables Mapped to Google Sheets (13 Tabs)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.keys(SHEET_SCHEMAS).map((name) => (
                <div
                  key={name}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs font-mono text-slate-700"
                >
                  <Database className="w-3.5 h-3.5 text-yale-600 shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
