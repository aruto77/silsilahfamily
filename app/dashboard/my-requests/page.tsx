'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../lib/supabase';
import { useUser } from '../../../hooks/use-user';
import { History, Clock, CheckCircle2, XCircle, Shield } from 'lucide-react';

export default function GlobalHistoryPage() {
  const { profile } = useUser();
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const supabase = getSupabase();
      
      const { data: requestsData } = await supabase
        .from('change_requests')
        .select(`*, users!change_requests_requester_id_fkey(email)`)
        .order('created_at', { ascending: false })
        .limit(50);
        
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select(`*, users!audit_logs_admin_id_fkey(email)`)
        .order('created_at', { ascending: false })
        .limit(50);
        
      const combined: any[] = [];
      
      if (requestsData) {
         requestsData.forEach(r => {
            combined.push({
               type: 'request',
               id: 'req_' + r.id,
               date: new Date(r.created_at),
               status: r.status,
               actor: r.users?.email || 'User',
               target: r.target_table === 'family_members' ? 'Anggota Keluarga' : 'Pernikahan',
               detail: JSON.stringify(r.new_data)
            });
         });
      }
      
      if (logsData) {
         logsData.forEach(l => {
            combined.push({
               type: 'log',
               id: 'log_' + l.id,
               date: new Date(l.created_at),
               status: 'approved',
               actor: l.users?.email || 'Admin',
               target: l.action_type,
               detail: JSON.stringify(l.details)
            });
         });
      }
      
      combined.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setHistoryItems(combined.slice(0, 100));
      setLoading(false);
    }
    
    fetchHistory();
  }, [profile]);

  const getStatusIcon = (status: string, type: string) => {
    if (type === 'log') return <Shield className="w-5 h-5 text-indigo-500" />;
    switch(status) {
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string, type: string) => {
    if (type === 'log') return <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Aktivitas Sistem</span>;
    switch(status) {
      case 'approved': return <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Usulan Disetujui</span>;
      case 'rejected': return <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Usulan Ditolak</span>;
      default: return <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Usulan Menunggu</span>;
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Riwayat Perubahan & Aktivitas</h1>
        <p className="text-slate-500 mt-1">Pantau semua aktivitas penambahan data, penghapusan, dan usulan perubahan dari seluruh anggota.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-5xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Aktor / Pengguna</th>
                <th className="px-6 py-4">Status Transaksi</th>
                <th className="px-6 py-4">Aksi / Target</th>
                <th className="px-6 py-4">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                    Memuat data...
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600">Belum ada riwayat aktivitas</p>
                  </td>
                </tr>
              ) : (
                historyItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {item.date.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">{item.actor}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status, item.type)}
                        {getStatusText(item.status, item.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 capitalize">
                        {item.target}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                        {item.detail}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
