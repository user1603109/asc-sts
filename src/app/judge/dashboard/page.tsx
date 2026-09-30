'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Award, Calendar, CheckCircle2, Clock, PlayCircle, RefreshCw, Smartphone } from 'lucide-react';

export default function JudgeDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((userData) => {
        if (userData.authenticated) {
          setUser(userData.user);
          return fetch(`/api/events?judgeId=${userData.user.userId}`);
        }
        return null;
      })
      .then((res) => (res ? res.json() : []))
      .then((eventList) => {
        if (Array.isArray(eventList)) {
          setEvents(eventList);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Welcome Banner with Quick Shortcuts */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-yale-700 bg-yale-50 px-2 py-0.5 rounded border border-yale-200">
              Official Judge Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Welcome, {user?.fullName || 'Judge'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an assigned event below to open your real-time touchscreen scoring sheet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/judge/history"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Event History
            </Link>
            <Link
              href="/judge/profile"
              className="px-3 py-1.5 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg transition-colors"
            >
              My Profile
            </Link>
          </div>
        </div>

        {/* Assigned Events Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yale-700" />
              <span>Assigned Event Competitions</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700 mb-2" />
              <p className="text-xs font-semibold">Loading assigned events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-card">
              <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">No Events Assigned Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                The event administrator has not assigned you to any competitions yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white border border-slate-200 hover:border-yale-400 rounded-xl p-5 flex flex-col justify-between shadow-card transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yale-50 text-yale-700 border border-yale-200">
                        {evt.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          evt.status === 'Ongoing'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : evt.status === 'Completed'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-gold-50 text-gold-700 border border-gold-200'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 mt-1">{evt.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {evt.description || 'Competition event'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>Contestants: <strong className="text-slate-800">{evt.candidatesCount || 0}</strong></span>
                      <span>Portions: <strong className="text-slate-800">{evt.portionsCount || 0}</strong></span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <Link
                      href={`/judge/score/${evt.id}`}
                      className="w-full py-2 px-3 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Open Scoring Sheet</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
