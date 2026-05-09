'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../../../lib/supabase';
import { useUser } from '../../../../hooks/use-user';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewMemberPage() {
  const router = useRouter();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'male',
    birth_date: '',
    death_date: '',
    bio: '',
    is_adopted: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      
      // Clean up empty strings for dates
      const payload = {
        ...formData,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
      };

      if (profile?.role === 'admin') {
        // Admins can insert directly
        const { data, error: insertError } = await supabase
          .from('family_members')
          .insert([payload])
          .select()
          .single();

        if (insertError) throw insertError;
        router.push(`/dashboard/family-tree/${data.id}`);
      } else {
        // Members must create a change request
        const { error: requestError } = await supabase
          .from('change_requests')
          .insert([{
            requester_id: profile?.id,
            target_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for new records
            target_table: 'family_members',
            new_data: payload,
            status: 'pending'
          }]);

        if (requestError) throw requestError;
        router.push('/dashboard/my-requests');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <Link 
          href="/dashboard/family-tree" 
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali ke Daftar
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tambah Anggota Keluarga</h1>
        <p className="text-slate-500 mt-1">
          {profile?.role === 'admin' 
            ? 'Data yang Anda masukkan akan langsung tersimpan di sistem.' 
            : 'Data yang Anda masukkan akan dikirim sebagai usulan untuk ditinjau oleh admin.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-3xl">
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-xl">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="full_name">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                id="full_name" 
                name="full_name" 
                required
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all placeholder:text-slate-400" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="gender">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </label>
              <select 
                id="gender" 
                name="gender" 
                required
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="birth_date">
                Tanggal Lahir
              </label>
              <input 
                type="date" 
                id="birth_date" 
                name="birth_date" 
                value={formData.birth_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="death_date">
                Tanggal Wafat (Kosongkan jika masih hidup)
              </label>
              <input 
                type="date" 
                id="death_date" 
                name="death_date" 
                value={formData.death_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700" 
              />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="bio">
              Biografi Singkat
            </label>
            <textarea 
              id="bio" 
              name="bio" 
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tambahkan informasi tambahan..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all placeholder:text-slate-400 resize-y" 
            />
          </div>

          <div className="flex items-center space-x-3 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <input 
              type="checkbox" 
              id="is_adopted" 
              name="is_adopted"
              checked={formData.is_adopted}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="is_adopted" className="text-sm font-medium text-slate-700 cursor-pointer">
              Anggota keluarga angkat/adopsi
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {profile?.role === 'admin' ? 'Simpan Data' : 'Kirim Usulan'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
