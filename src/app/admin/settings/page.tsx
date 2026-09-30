'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Database, RefreshCw, CheckCircle2, AlertCircle, HardDrive, FileSpreadsheet } from 'lucide-react';
import { SHEET_SCHEMAS } from '@/lib/schemas';

export default function AdminSettingsPage() {
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/setup-sheets')
      .then((res) => res.json())
      .then((data) => setGoogleStatus(data));
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

  return (
    <AppLayout
      pageTitle="System Settings & Google Sheets Studio"
      pageSubtitle="Manage your Google Sheets database connections, cloud photo storage, and table schemas"
    >
      <div className="space-y-6">
        {/* Google Sheets Status Card */}
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Verifying...' : 'Initialize / Verify Sheets'}</span>
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
              {syncResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
              <div>
                <p className="font-bold">{syncResult.message || syncResult.error}</p>
                {syncResult.createdTabs && syncResult.createdTabs.length > 0 && (
                  <p className="mt-1 text-[11px]">Created sheets: {syncResult.createdTabs.join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5TB Google Drive Storage Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yale-50 text-yale-700 flex items-center justify-center border border-yale-100">
              <HardDrive className="w-5 h-5 text-yale-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">5TB Google Drive Cloud Storage</h2>
              <p className="text-xs text-slate-500">
                Connected with your Google Account storage subscription for zero-cost media hosting.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            Contestant portraits, event badges, and background banners can be stored in your Google Drive. Files are served directly to the web app without consuming server compute bandwidth.
          </p>
        </div>

        {/* 13 Relational Tables Schema */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Database className="w-4 h-4 text-yale-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Transferred Schemas (13 Google Sheets Relational Worksheets)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {Object.entries(SHEET_SCHEMAS).map(([tab, cols]) => (
              <div key={tab} className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <span className="font-bold text-yale-700 block mb-1">📄 {tab}</span>
                <span className="text-[10px] text-slate-500 font-mono break-words">
                  {cols.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
