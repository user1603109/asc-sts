'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Lock, User, ArrowRight, CheckCircle2, AlertCircle, Smartphone, Eye, EyeOff } from 'lucide-react';

export default function JudgeLoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            full_name: formData.fullName,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to register');

        setSuccess('Registration submitted! Please wait for administrator approval.');
        setIsRegister(false);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid credentials');

        if (data.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/judge/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-card">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex w-10 h-10 rounded-xl bg-yale-50 border border-yale-200 items-center justify-center text-yale-700 mb-2.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              {isRegister ? 'Judge Registration' : 'Judge Portal Login'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRegister
                ? 'Sign up to be accredited as an official judge'
                : 'Sign in to access your digital scoring sheets'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {isRegister && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name & Title
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Maria Santos"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-10 py-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-1 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Submit Accreditation' : 'Sign In as Judge'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="text-xs text-yale-700 hover:underline font-semibold"
            >
              {isRegister
                ? 'Already accredited? Sign In here'
                : 'Need accreditation? Register as New Judge'}
            </button>
          </div>

          <div className="mt-2 text-center">
            <Link href="/admin/login" className="text-[11px] text-slate-400 hover:text-slate-600">
              Administrator Login →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
