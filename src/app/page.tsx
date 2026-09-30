import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Award, ArrowRight, FileSpreadsheet, HardDrive, Smartphone, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const googleConfigured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      <Navbar googleConfigured={googleConfigured} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 lg:py-24 max-w-5xl mx-auto w-full text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yale-50 border border-yale-200 text-yale-700 text-xs font-bold uppercase tracking-wider mb-6">
          <Award className="w-3.5 h-3.5 text-yale-700" />
          Apayao State College • Tabulation Studio
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl">
          Automated Scoring & <span className="text-yale-700">Tabulation System</span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-2xl font-normal leading-relaxed">
          High-precision digital tabulation powered by <strong className="text-slate-800">Google Sheets</strong> and deployed on <strong className="text-slate-800">Vercel</strong>. Designed for collegiate pageants, cultural competitions, academic debates, and sports tournaments.
        </p>

        {/* 2 Main Action Cards (Judge Portal vs Admin Control) */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl text-left">
          {/* Judge Card */}
          <Link
            href="/login"
            className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-yale-600 rounded-xl p-6 transition-all shadow-card hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-yale-50 border border-yale-200 flex items-center justify-center text-yale-700 mb-4 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-yale-700 transition-colors">
                Official Judge Portal
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Touchscreen scoring sheets for accredited judges. Real-time criteria sliders, validation, and submission locking.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-yale-700">
              <span>Enter Judge Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin Card */}
          <Link
            href="/admin/login"
            className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-yale-600 rounded-xl p-6 transition-all shadow-card hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-yale-700 transition-colors">
                Admin & Tabulation Studio
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Live scoreboard, multi-criteria weight distributions, judge accreditations, and official printable certificate sheets.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-yale-700">
              <span>Access Admin Console</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* 3 Metric Value Pillars */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center gap-2 mb-1.5 text-yale-700 font-bold text-xs">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Google Sheets Database</span>
            </div>
            <p className="text-[11px] text-slate-500">
              All 13 relational tables stored securely in your Google account.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center gap-2 mb-1.5 text-gold-700 font-bold text-xs">
              <HardDrive className="w-4 h-4" />
              <span>5TB Google Drive Storage</span>
            </div>
            <p className="text-[11px] text-slate-500">
              High-resolution contestant portraits hosted directly on Google Drive.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center gap-2 mb-1.5 text-emerald-700 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Vercel Edge Ready</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Fast, zero-maintenance serverless deployment for reliable tabulation.
            </p>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>© 2026 Apayao State College — Automated Scoring & Tabulation System</p>
      </footer>
    </div>
  );
}
