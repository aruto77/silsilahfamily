'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../lib/supabase';
import { useUser } from '../../hooks/use-user';
import { UsersRound, GitBranch, Crown, CalendarClock, History, FileText } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { profile } = useUser();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMarriages: 0,
    pendingRequests: 0,
    recentAdditions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = getSupabase();
      
      const { count: membersCount } = await supabase.from('family_members').select('*', { count: 'exact', head: true });
      const { count: marriagesCount } = await supabase.from('marriages').select('*', { count: 'exact', head: true });
      const { count: requestsCount } = await supabase.from('change_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      
      // Recent additions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: recentCount } = await supabase.from('family_members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalMembers: membersCount || 0,
        totalMarriages: marriagesCount || 0,
        pendingRequests: requestsCount || 0,
        recentAdditions: recentCount || 0
      });
      setLoading(false);
    }
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex animate-pulse space-x-6">
        <div className="w-1/4 h-32 bg-slate-200 rounded-2xl"></div>
        <div className="w-1/4 h-32 bg-slate-200 rounded-2xl"></div>
        <div className="w-1/4 h-32 bg-slate-200 rounded-2xl"></div>
        <div className="w-1/4 h-32 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Selamat Datang, {profile?.email?.split('@')[0]}</h1>
        <p className="text-slate-500 mt-1">Berikut ringkasan data silsilah keluarga saat ini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <UsersRound className="w-16 h-16 text-indigo-600" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest relative z-10">Total Anggota</p>
          <p className="text-3xl font-bold text-slate-800 mt-2 relative z-10">{stats.totalMembers}</p>
          <p className="text-xs text-emerald-500 font-semibold mt-3 relative z-10">+{stats.recentAdditions} bulan ini</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <GitBranch className="w-16 h-16 text-indigo-600" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest relative z-10">Pernikahan</p>
          <p className="text-3xl font-bold text-slate-800 mt-2 relative z-10">{stats.totalMarriages}</p>
          <p className="text-xs text-slate-500 font-medium mt-3 relative z-10">Koneksi tercatat</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <CalendarClock className="w-16 h-16 text-amber-600" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest relative z-10">Usulan Perubahan</p>
          <p className="text-3xl font-bold text-slate-800 mt-2 relative z-10">{stats.pendingRequests}</p>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-4 overflow-hidden relative z-10">
             <div className={`h-full ${stats.pendingRequests > 0 ? 'bg-amber-500 w-1/3' : 'bg-slate-300 w-0'} transition-all`}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Crown className="w-16 h-16 text-indigo-600" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest relative z-10">Akses Anda</p>
          <p className="text-2xl font-bold text-slate-800 mt-2 relative z-10 capitalize">{profile?.role}</p>
          <p className="text-xs text-indigo-600 font-semibold mt-3 relative z-10">Telah Terverifikasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Aktivitas Terbaru</h2>
            <Link href="/dashboard/family-tree" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Lihat Silsilah</Link>
          </div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-slate-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium text-slate-600">Belum ada aktivitas</p>
            <p className="text-sm mt-1">Data yang diubah atau ditambahkan akan muncul di sini.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
          <h2 className="font-bold text-slate-800 mb-6">Aksi Cepat</h2>
          <div className="space-y-4">
            <Link href="/dashboard/family-tree/new" className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50 transition-all text-left">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mr-4 shrink-0">
                <UsersRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Tambah Anggota</p>
                <p className="text-[11px] text-slate-500">Daftarkan individu baru</p>
              </div>
            </Link>
            {profile?.role === 'admin' && (
              <Link href="/dashboard/admin/approvals" className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:border-amber-100 hover:bg-amber-50 transition-all text-left">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mr-4 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Review Usulan</p>
                  <p className="text-[11px] text-slate-500">Tinjau permintaan perubahan</p>
                </div>
              </Link>
            )}
            <Link href="/dashboard/my-requests" className="w-full flex items-center p-3 rounded-xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50 transition-all text-left">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mr-4 shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Status Permintaan</p>
                <p className="text-[11px] text-slate-500">Cek status usulan Anda</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
