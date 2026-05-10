'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSupabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../hooks/use-user';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditMemberPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'male',
    birth_date: '',
    death_date: '',
    photo_url: '',
    is_adopted: false
  });

  useEffect(() => {
    async function fetchMember() {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setFormData({
          full_name: data.full_name || '',
          gender: data.gender || 'male',
          birth_date: data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : '',
          death_date: data.death_date ? new Date(data.death_date).toISOString().split('T')[0] : '',
          photo_url: data.photo_url || '',
          is_adopted: data.is_adopted || false
        });
      }
      setInitialFetchLoading(false);
    }
    
    if (id) fetchMember();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal 2 MB');
      e.target.value = '';
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Format file harus JPG, JPEG, atau PNG');
      e.target.value = '';
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        photo_url: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

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
      
      const payload = {
        ...formData,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
      };

      if (profile?.role === 'admin') {
        // Admins can update directly
        const { error: updateError } = await supabase
          .from('family_members')
          .update(payload)
          .eq('id', id);

        if (updateError) throw updateError;
        router.replace(`/dashboard/family-tree/${id}`);
      } else {
        // Fetch old data for diff
        const { data: oldData } = await supabase.from('family_members').select('*').eq('id', id).single();
        
        // Members must create a change request
        const { error: requestError } = await supabase
          .from('change_requests')
          .insert([{
            requester_id: profile?.id,
            target_id: id,
            target_table: 'family_members',
            old_data: oldData,
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

  if (initialFetchLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link 
          href={`/dashboard/family-tree/${id}`} 
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Batal
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Edit Data Anggota Keluarga</h1>
        <p className="text-slate-500 mt-1">
          {profile?.role === 'admin' 
            ? 'Perubahan ini akan langsung diperbarui dalam database.' 
            : 'Perubahan ini akan dikirim sebagai usulan untuk ditinjau oleh admin.'}
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
                Tanggal Wafat (Opsional)
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
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="photo">
              Foto (JPG/JPEG/PNG, Maks. 2MB)
            </label>
            <input 
              type="file" 
              id="photo" 
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
            />
            {formData.photo_url && (
              <div className="mt-2">
                <img src={formData.photo_url} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
              </div>
            )}
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
              Anak Angkat/Tiri (Ya)
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
              {profile?.role === 'admin' ? 'Simpan Perubahan' : 'Kirim Usulan'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
