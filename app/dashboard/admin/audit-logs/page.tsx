'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../../lib/supabase';
import { useUser } from '../../../../hooks/use-user';
import { Shield, ListTree } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuditLogsPage() {
  const { profile, loading: profileLoading } = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) return;

    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (profile && profile.role === 'admin') {
      async function fetchLogs() {
        setLoading(true);
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('audit_logs')
          .select(`
            *,
            users ( email )
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) {
          console.error("Error fetching audit logs", error);
        }
        setLogs(data || []);
        setLoading(false);
      }

      fetchLogs();
    }
  }, [profile, profileLoading, router]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
          <Shield className="w-6 h-6 mr-3 text-indigo-600" />
          Log Audit
        </h1>
        <p className="text-slate-500 mt-1">Rekam jejak tindakan perizinan dan administratif sistem.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-6xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4">Detail</th>
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ListTree className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600">Belum ada log aktivitas</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">{log.users?.email || 'System'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                        log.action_type.includes('APPROVE') ? 'bg-emerald-100 text-emerald-700' :
                        log.action_type.includes('REJECT') ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="max-w-md overflow-hidden text-ellipsis whitespace-nowrap text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">
                         {JSON.stringify(log.details)}
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
