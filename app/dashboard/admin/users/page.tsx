'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../../lib/supabase';
import { useUser } from '../../../../hooks/use-user';
import { Users, ShieldAlert, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const { profile, loading: profileLoading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function fetchUsers() {
    // Only set loading to true if we don't have users yet to prevent flicker during fast navigation
    if (users.length === 0) setLoading(true);
    const supabase = getSupabase();
    
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (profileLoading) return;

    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [profile, profileLoading, router]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.from('users').update({ approval_status: newStatus }).eq('id', id);
      if (updateError) throw updateError;
      
      const { error: logError } = await supabase.from('audit_logs').insert([{
         admin_id: profile?.id,
         target_id: id,
         action_type: newStatus === 'approved' ? 'APPROVE_USER' : (newStatus === 'rejected' ? 'REJECT_USER' : 'UPDATE_USER_STATUS'),
         details: { action: newStatus, targetTable: 'users', targetId: id, newData: { approval_status: newStatus } }
      }]);
      if (logError) throw logError;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, approval_status: newStatus } : u));
    } catch (e: any) {
      console.error(e);
      alert('Gagal mengupdate status: ' + (e.message || JSON.stringify(e)));
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.from('users').update({ role: newRole }).eq('id', id);
      if (updateError) throw updateError;
      
      const { error: logError } = await supabase.from('audit_logs').insert([{
         admin_id: profile?.id,
         target_id: id,
         action_type: 'UPDATE_USER_ROLE',
         details: { action: newRole, targetTable: 'users', targetId: id, newData: { role: newRole } }
      }]);
      if (logError) throw logError;

      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (e: any) {
      console.error(e);
      alert('Gagal mengupdate rol: ' + (e.message || JSON.stringify(e)));
    }
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const supabase = getSupabase();
      
      // Call the securely executed RPC to delete the user from auth.users (cascades to public.users)
      const { error: deleteError } = await supabase.rpc('delete_auth_user', { target_user_id: userToDelete.id });
      if (deleteError) throw deleteError;
      
      const { error: logError } = await supabase.from('audit_logs').insert([{
         admin_id: profile?.id,
         target_id: userToDelete.id,
         action_type: 'DELETE_USER',
         details: { action: 'delete', targetTable: 'users', targetId: userToDelete.id }
      }]);
      if (logError) console.error("Audit log error on delete user", logError);

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (e: any) {
      console.error(e);
      alert('Gagal menghapus pengguna: ' + (e.message || JSON.stringify(e)));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Pengguna</h1>
        <p className="text-slate-500 mt-1">Kelola akses, peran, dan persetujuan akun pengguna.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-6xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Status & Role</th>
                <th className="px-6 py-4">Tanggal Daftar</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600">Belum ada pengguna</p>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mr-3">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{u.email}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.id.substring(0,8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 mb-2">
                        {u.approval_status === 'approved' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                          </span>
                        ) : u.approval_status === 'pending' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Rejected
                          </span>
                        )}

                        {u.role === 'admin' ? (
                           <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                             <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                           </span>
                        ) : (
                           <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                             Member
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.id === profile?.id ? (
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-semibold">
                          Akun Anda
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {u.approval_status !== 'approved' && (
                            <button 
                              onClick={() => handleUpdateStatus(u.id, 'approved')}
                              className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Setujui
                            </button>
                          )}
                          {u.approval_status !== 'rejected' && (
                            <button 
                              onClick={() => handleUpdateStatus(u.id, 'rejected')}
                              className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Tolak
                            </button>
                          )}
                          {u.role !== 'admin' ? (
                             <button 
                               onClick={() => handleUpdateRole(u.id, 'admin')}
                               className="px-3 py-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
                             >
                               Jadikan Admin
                             </button>
                          ) : (
                             <button 
                               onClick={() => handleUpdateRole(u.id, 'member')}
                               className="px-3 py-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                               title="Cabut Admin"
                             >
                               Cabut Admin
                             </button>
                          )}
                          <button 
                            onClick={() => handleDeleteUser(u)}
                            className="px-3 py-1 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg text-xs font-semibold transition-colors"
                            title="Hapus Pengguna"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Pengguna</h3>
              <p className="text-slate-600 mb-2">
                Apakah Anda yakin ingin menghapus akun <strong>{userToDelete?.email}</strong> secara permanen?
              </p>
              <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-sm mb-6 flex items-start">
                <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <p><strong>Peringatan keras:</strong> Tindakan ini tidak dapat dibatalkan. Pengguna tidak akan dapat login kembali dan semua data terkait akun ini akan terhapus secara permanen (melalui sistem Cascade database).</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="px-4 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Menghapus...
                    </>
                  ) : (
                    'Ya, Hapus Permanen'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
