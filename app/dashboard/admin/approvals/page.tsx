'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../../lib/supabase';
import { useUser } from '../../../../hooks/use-user';
import { FileText, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminApprovalsPage() {
  const { profile, loading: profileLoading } = useUser();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) return;

    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    let isMounted = true;
    async function loadRequests() {
      const supabase = getSupabase();
      // fetch pending requests and their requesters
      const { data } = await supabase
        .from('change_requests')
        .select(`
          *,
          users ( email )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (isMounted) {
        setRequests(data || []);
        setLoading(false);
      }
    }

    // Call after any synchronous rendering to avoid set-state-in-effect issues if any
    setTimeout(() => {
      if (isMounted && profile && profile.role === 'admin') {
        if (requests.length === 0) setLoading(true);
        loadRequests();
      }
    }, 0);

    return () => {
      isMounted = false;
    };
  }, [profile, profileLoading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (id: string, action: 'approved' | 'rejected', targetTable: string, newData: any, oldData: any, targetId: string) => {
    const supabase = getSupabase();
    
    try {
      // If approved, we need to apply the changes to the target table
      if (action === 'approved') {
        const { _marriage_request, _update_child_request, _new_spouse_request, ...realData } = newData;
        let newTargetId = targetId;

        if (targetId && targetId !== '00000000-0000-0000-0000-000000000000') {
           // It's an update
           await supabase.from(targetTable).update(realData).eq('id', targetId);
        } else {
           // It's an insert
           const { data } = await supabase.from(targetTable).insert([realData]).select().single();
           if (data) newTargetId = data.id;
        }

        let newSpouseId = null;
        if (_new_spouse_request) {
           const { data: spouseData } = await supabase.from('family_members').insert([_new_spouse_request]).select().single();
           if (spouseData) newSpouseId = spouseData.id;
        }

        if (_marriage_request && newTargetId) {
            const marriagePayload = {
               husband_id: _marriage_request.husband_id === 'NEW_MEMBER' ? newTargetId : (_marriage_request.husband_id === 'NEW_SPOUSE' ? newSpouseId : _marriage_request.husband_id),
               wife_id: _marriage_request.wife_id === 'NEW_MEMBER' ? newTargetId : (_marriage_request.wife_id === 'NEW_SPOUSE' ? newSpouseId : _marriage_request.wife_id),
               status: 'active'
            };
            await supabase.from('marriages').insert([marriagePayload]);
        }

        if (_update_child_request && newTargetId) {
            const childUpdatePayload: any = {
               [_update_child_request.parent_type]: newTargetId
            };
            if (_update_child_request.spouse_parent_type && newSpouseId) {
                childUpdatePayload[_update_child_request.spouse_parent_type] = newSpouseId;
            }
            await supabase.from('family_members').update(childUpdatePayload).eq('id', _update_child_request.child_id);
        }
      }

      // Update the request status
      await supabase.from('change_requests').update({ status: action }).eq('id', id);

      // Log the audit
      const { error: logError } = await supabase.from('audit_logs').insert([{
         admin_id: profile?.id,
         target_id: id,
         action_type: action === 'approved' ? 'APPROVE_CHANGE' : 'REJECT_CHANGE',
         details: { action, targetTable, targetId, newData }
      }]);
      if (logError) {
         console.warn("Gagal memasukkan log audit:", logError);
      }

      // Refresh list
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error("Error processing approval", e);
      alert('Terjadi kesalahan saat memproses permintaan.');
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Persetujuan Data</h1>
        <p className="text-slate-500 mt-1">Tinjau dan setujui usulan perubahan dari anggota keluarga.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-6xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4">Pengusul</th>
                <th className="px-6 py-4">Tipe Data</th>
                <th className="px-6 py-4">Isi Usulan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
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
                      <FileText className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600">Tidak ada usulan tertunda</p>
                    <p className="text-xs mt-1">Semua usulan telah diproses.</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{req.users?.email}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(req.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 capitalize bg-slate-100 px-2 py-1 rounded-md text-xs">
                        {req.target_table === 'family_members' ? 'Anggota Keluarga' : req.target_table}
                      </span>
                      {(!req.target_id || req.target_id === '00000000-0000-0000-0000-000000000000') && (
                        <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">BARU</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <div className="max-w-md overflow-auto max-h-24 text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap text-slate-600">
                         {Object.entries(req.new_data).map(([k, v]) => `${k}: ${v}`).join('\n')}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => handleAction(req.id, 'approved', req.target_table, req.new_data, req.old_data, req.target_id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors mr-2"
                        title="Setujui"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, 'rejected', req.target_table, req.new_data, req.old_data, req.target_id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-colors"
                        title="Tolak"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
