'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Database, Download, FileJson, CheckCircle2 } from 'lucide-react';
import { SHEET_SCHEMAS } from '@/lib/schemas';

export default function AdminBackupsPage() {
  const [downloading, setDownloading] = useState(false);
  const tables = Object.keys(SHEET_SCHEMAS);

  const handleDownloadBackup = () => {
    setDownloading(true);
    window.location.href = '/api/backup';
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <AppLayout
      pageTitle="Database Backups & Snapshot Management"
      pageSubtitle="Export full multi-table relational backups and snapshots matching original ASTS standards"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Main Backup Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-yale-50 border border-yale-200 flex items-center justify-center text-yale-700 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-900">
                Institutional Database Export
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Generate an immediate snapshot containing all 13 relational worksheets (Events, Candidates, Criteria, Scores, Judges, Departments, Courses, Organizers, Portions, and System Settings).
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadBackup}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Preparing Snapshot...' : 'Download Full JSON Backup'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Included Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
            <FileJson className="w-4 h-4 text-yale-700" />
            <span>Worksheet Tables Included in Backup ({tables.length})</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {tables.map((tbl) => (
              <div
                key={tbl}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs font-mono text-slate-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{tbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
