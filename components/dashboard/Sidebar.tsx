'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Grid, History, UsersRound, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserProfile } from '../../hooks/use-user';

interface SidebarProps {
  profile: UserProfile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Silsilah Keluarga', href: '/dashboard/family-tree', icon: UsersRound },
    { name: 'Riwayat Perubahan', href: '/dashboard/my-requests', icon: History },
  ];

  const adminLinks = [
    { name: 'Manajemen Pengguna', href: '/dashboard/admin/users', icon: Users },
    { name: 'Persetujuan Data', href: '/dashboard/admin/approvals', icon: FileText },
    { name: 'Log Audit', href: '/dashboard/admin/audit-logs', icon: Grid },
    { name: 'Pengaturan', href: '/dashboard/admin/settings', icon: Settings },
  ];

  return (
    <aside className={`bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`p-6 flex items-center border-b border-slate-100 shrink-0 ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <div className="w-4 h-4 bg-white rounded-sm"></div>
        </div>
        {!isCollapsed && <span className="font-bold text-lg tracking-tight text-slate-900 truncate">Kinship System</span>}
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 space-y-1">
        <div className="mb-4">
          {!isCollapsed && <p className="px-8 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Menu Utama</p>}
          <div className="px-4 space-y-1">
            {userLinks.map((link) => {
              const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard');
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  title={isCollapsed ? link.name : undefined}
                  className={`flex items-center rounded-xl transition-colors ${
                    isCollapsed ? 'justify-center p-3' : 'px-4 py-3'
                  } ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                      : 'text-slate-500 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {!isCollapsed && <span>{link.name}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {profile?.role === 'admin' && (
          <div className="mt-8">
            {!isCollapsed && <p className="px-8 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Administrasi</p>}
            <div className="px-4 space-y-1">
              {adminLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href);
                return (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    title={isCollapsed ? link.name : undefined}
                    className={`flex items-center rounded-xl transition-colors ${
                      isCollapsed ? 'justify-center p-3' : 'px-4 py-3'
                    } ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                        : 'text-slate-500 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <link.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {!isCollapsed && <span>{link.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>
      
      <div className="p-4 border-t border-slate-100 shrink-0">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 mb-4 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        
        {!isCollapsed && (
          <div className="bg-indigo-50 p-4 rounded-xl">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">Status Akun</p>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${profile?.approval_status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <p className="text-sm font-medium text-slate-700 capitalize">
                {profile?.approval_status === 'approved' ? 'Verified' : profile?.approval_status || 'Pending'}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
