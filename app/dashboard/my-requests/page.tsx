'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../lib/supabase';
import { useUser } from '../../../hooks/use-user';
import { History, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function MyRequestsPage() {
  const { profile } = useUser();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      if (!profile?.id) return;
      
      const supabase = getSupabase();
      const { data } = await supabase
        .from('change_requests')
        .select('*')
        .eq('requester_id', profile.id)
        .order('created_at', { ascending: false });
      
      setRequests(data || []);
      setLoading(false);
    }
    
    fetchRequests();
  }, [profile]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'approved': return <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Disetujui</span>;
      case 'rejected': return <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Ditolak</span>;
      default: return <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Menunggu</span>;
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Riwayat Usulan Perubahan</h1>
        <p className="text-slate-500 mt-1">Pantau status permintaan perubahan data silsilah yang Anda ajukan.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-5xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tipe Data</th>
                <th className="px-6 py-4">Detail Perubahan</th>
                <th className="px-6 py-4 text-right">Tanggal Diajukan</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                    Memuat data...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600">Belum ada usulan</p>
                    <p className="text-xs mt-1">Anda belum pernah mengajukan usulan perubahan data silsilah.</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(req.status)}
                        {getStatusText(req.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 capitalize">
                        {req.target_table === 'family_members' ? 'Anggota Keluarga' : req.target_table === 'marriages' ? 'Pernikahan' : req.target_table}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                        {JSON.stringify(req.new_data)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
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
