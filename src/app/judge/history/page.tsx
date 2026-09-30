'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { History, Calendar, Trophy, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Event } from '@/lib/types';

export default function JudgeHistoryPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((res) => res.json()),
      fetch('/api/events').then((res) => res.json()),
    ]).then(([userData, eventsData]) => {
      if (userData.user) setCurrentUser(userData.user);
      if (Array.isArray(eventsData)) {
        // Filter events that are completed or tabulating
        setEvents(eventsData.filter((e) => e.status === 'Completed' || e.status === 'Tabulating'));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link
            href="/judge/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-yale-700 hover:text-yale-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Judge Tabulation History</h1>
          <p className="text-xs text-slate-500 mt-1">Review completed competitions and previously recorded scoring sheets</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading historical competitions...</div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-card">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No Past Events Concluded Yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Events will be archived here once officially marked as Completed by the Tabulation Committee.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-card hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {evt.type || 'Competition'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {evt.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">{evt.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{evt.description || 'No description'}</p>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Academic Year {evt.academic_year || '2025-2026'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/judge/score/${evt.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-yale-700 hover:text-yale-800 transition-colors"
                  >
                    <span>View Score Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
