'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Sliders, UserCheck, Trophy, Printer, Settings, ClipboardList, Award } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Enlistment Studio', href: '/admin/enlistment', icon: Calendar },
  { label: 'Live Tabulation', href: '/admin/tabulation', icon: Trophy },
  { label: 'Scores Matrix', href: '/admin/scores', icon: ClipboardList },
  { label: 'Official Rankings', href: '/admin/rankings', icon: Award },
  { label: 'Criteria', href: '/admin/criteria', icon: Sliders },
  { label: 'Judges', href: '/admin/judges', icon: UserCheck },
  { label: 'Official Reports', href: '/admin/reports', icon: Printer },
  { label: 'System & Sheets', href: '/admin/settings', icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="no-print bg-[#081324] border-b border-slate-800 px-4 lg:px-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center space-x-1 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-400 text-navy-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#112240]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
