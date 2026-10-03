'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Sliders,
  Printer,
  Layers,
  UserCheck,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Universal login: route automatically according to user role
      if (data.user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/judge/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      {/* REDESIGNED HEADER: Gradient of Dark Navy Blue & Yale Blue */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#011F5B] via-[#0A2540] to-[#0A192F] border-b border-navy-800/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & College Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 backdrop-blur-sm group-hover:scale-105 transition-transform">
                <img
                  src="/api/logo?name=astslogo&v=2"
                  alt="ASTS Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/img/astslogo.png';
                  }}
                />
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 backdrop-blur-sm group-hover:scale-105 transition-transform">
                <img
                  src="/api/logo?name=asclogo&v=2"
                  alt="ASC Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/img/asclogo.png';
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 leading-none">
                <span className="font-extrabold text-base tracking-tight text-white">
                  ASC<span className="text-gold-400">-ASTS</span>
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gold-400/20 text-gold-300 border border-gold-400/30">
                  OFFICIAL
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Apayao State College
              </p>
            </div>
          </Link>

          {/* Right Status Badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">ASC-ASTS Institutional Portal</span>
            <span className="sm:hidden">ASTS Active</span>
          </div>
        </div>
      </header>

      {/* HERO & UNIVERSAL LOGIN MAIN SECTION */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Hero Section Labels */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Dual Logos Showcase */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 border border-slate-200 shadow-md flex items-center justify-center hover:scale-105 transition-transform">
                <img
                  src="/api/logo?name=astslogo&v=2"
                  alt="ASTS Emblem"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/img/astslogo.png';
                  }}
                />
              </div>
              <div className="h-10 w-px bg-slate-300" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 border border-slate-200 shadow-md flex items-center justify-center hover:scale-105 transition-transform">
                <img
                  src="/api/logo?name=asclogo&v=2"
                  alt="ASC Emblem"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/img/asclogo.png';
                  }}
                />
              </div>
            </div>

            {/* Institution Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yale-50 border border-yale-200/80 text-yale-800 text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-yale-700" />
              <span>Apayao State College • Official Tabulation Suite</span>
            </div>

            {/* Headline - Removed 'Automated Scoring & Tabulation System' as requested */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              ASC-ASTS{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yale-700 via-yale-800 to-navy-900">
                Institutional Console
              </span>
            </h1>

            {/* Subtitle / Description */}
            <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl font-normal leading-relaxed">
              High-precision digital tabulation engine powered by Google Workspace and deployed on Vercel. Engineered for collegiate pageants, cultural competitions, academic debates, and athletic tournaments.
            </p>

            {/* Feature Highlights Pills - Updated Content */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:border-yale-300 transition-colors">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Live Scorecard &amp; Tabulation Matrix</span>
              </div>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:border-yale-300 transition-colors">
                <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Pageant Multi-Segment Scoring</span>
              </div>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:border-yale-300 transition-colors">
                <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Certified Official Reports &amp; Signatories</span>
              </div>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:border-yale-300 transition-colors">
                <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Google Drive Cloud Storage (ASTS/Profiles)</span>
              </div>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:border-yale-300 transition-colors">
                <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                <span>3-Attempt Security Account Lockout</span>
              </div>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:border-yale-300 transition-colors">
                <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Accredited Judge Real-Time Console</span>
              </div>
            </div>

            {/* System Info Footnote */}
            <div className="mt-8 pt-6 border-t border-slate-200/80 w-full flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-yale-700 shrink-0" />
              <span>
                Authorized for academic, cultural, and sports competitions of Apayao State College.
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: Universal Login Section */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-card relative overflow-hidden">
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yale-700 via-gold-400 to-navy-900" />

              {/* Card Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-yale-700 bg-yale-50 px-2.5 py-1 rounded-md border border-yale-100">
                    Universal Portal Sign In
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
                      <img
                        src="/api/logo?name=astslogo&v=2"
                        alt="ASTS Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/assets/img/astslogo.png';
                        }}
                      />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
                      <img
                        src="/api/logo?name=asclogo&v=2"
                        alt="ASC Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/assets/img/asclogo.png';
                        }}
                      />
                    </div>
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Sign In to Continue
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your credentials. Judges and Administrators will be routed automatically.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Universal Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Username Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username / ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or judge_username"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white focus:ring-2 focus:ring-yale-100 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field with Eye Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white focus:ring-2 focus:ring-yale-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-yale-700 to-navy-900 hover:from-yale-800 hover:to-navy-950 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Register Option */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  New Event Judge?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-yale-700 hover:text-yale-800 hover:underline transition-colors"
                  >
                    Register for Accreditation
                  </Link>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>© 2026 Apayao State College — ASC-ASTS Portal</p>
      </footer>
    </div>
  );
}
