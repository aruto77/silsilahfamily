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
    photo_url: '',
    is_adopted: false
  });

  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [familyRole, setFamilyRole] = useState<'anak' | 'ayah' | 'ibu'>('anak');
  const [dataLoading, setDataLoading] = useState(true);

  React.useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase();
      
      const { data: membersRes } = await supabase.from('family_members').select('*');
      const { data: marriagesRes } = await supabase.from('marriages').select('*').eq('status', 'active');
      
      const members = membersRes || [];
      const marriages = marriagesRes || [];

      const fams: any[] = [];
      const processedParentIds = new Set<string>();

      for (const match of marriages) {
        const husband = members.find(m => m.id === match.husband_id);
        const wife = members.find(m => m.id === match.wife_id);
        if (!husband && !wife) continue;

        if (husband) processedParentIds.add(husband.id);
        if (wife) processedParentIds.add(wife.id);

        let name = "Keluarga ";
        if (husband && wife) {
          name += `${husband.full_name} & ${wife.full_name}`;
        } else if (husband) {
          name += husband.full_name;
        } else if (wife) {
          name += wife.full_name;
        }

        fams.push({
          id: match.id,
          name,
          parents: [husband, wife].filter(Boolean),
          type: 'marriage'
        });
      }

      const singleParents = members.filter(m => 
        !processedParentIds.has(m.id) && 
        members.some(child => child.father_id === m.id || child.mother_id === m.id)
      );

      for (const parent of singleParents) {
        fams.push({
          id: parent.id,
          name: `Keluarga ${parent.full_name} (Single Parent)`,
          parents: [parent],
          type: 'single'
        });
      }

      setFamilies(fams);
      setDataLoading(false);
    }
    fetchData();
  }, []);

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
      
      // Clean up empty strings for dates
      let payload: any = {
        ...formData,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
      };

      if (selectedFamilyId) {
        const family = families.find(f => f.id === selectedFamilyId);
        if (family) {
          if (familyRole === 'anak') {
            const ayah = family.parents.find((p: any) => p.gender === 'male');
            const ibu = family.parents.find((p: any) => p.gender === 'female');
            payload.father_id = ayah ? ayah.id : null;
            payload.mother_id = ibu ? ibu.id : null;
          } else if (familyRole === 'ayah' || familyRole === 'ibu') {
            const isAyah = familyRole === 'ayah';
            const existingSpouse = family.parents.find((p: any) => p.gender === (isAyah ? 'female' : 'male'));

            if (existingSpouse) {
              payload._marriage_request = {
                husband_id: isAyah ? 'NEW_MEMBER' : existingSpouse.id,
                wife_id: isAyah ? existingSpouse.id : 'NEW_MEMBER',
              };
            }
          }
        }
      }

      const { _marriage_request, ...realData } = payload;

      if (profile?.role === 'admin') {
        // Admins can insert directly
        const { data, error: insertError } = await supabase
          .from('family_members')
          .insert([realData])
          .select()
          .single();

        if (insertError) throw insertError;

        if (_marriage_request && data) {
           const marriagePayload = {
               husband_id: _marriage_request.husband_id === 'NEW_MEMBER' ? data.id : _marriage_request.husband_id,
               wife_id: _marriage_request.wife_id === 'NEW_MEMBER' ? data.id : _marriage_request.wife_id,
               status: 'active'
           };
           await supabase.from('marriages').insert([marriagePayload]);
        }

        router.push(`/dashboard/family-tree/${data.id}`);
      } else {
        // Members must create a change request
        const { error: requestError } = await supabase
          .from('change_requests')
          .insert([{
            requester_id: profile?.id,
            target_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for new records
            target_table: 'family_members',
            new_data: payload, // note: payload includes _marriage_request, handled in approval!
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

          {!dataLoading && families.length > 0 && (
            <div className="space-y-4 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Hubungan Keluarga</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="selectedFamilyId">
                    Berkeluarga dengan (Pilih Keluarga)
                  </label>
                  <select
                    id="selectedFamilyId"
                    value={selectedFamilyId}
                    onChange={(e) => setSelectedFamilyId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700"
                  >
                    <option value="">-- Tidak ditambahkan ke keluarga manapun --</option>
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Anda bisa mengetik untuk mencari nama keluarga.</p>
                </div>

                {selectedFamilyId && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="familyRole">
                      Status di Keluarga Tersebut
                    </label>
                    <select
                      id="familyRole"
                      value={familyRole}
                      onChange={(e) => setFamilyRole(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700"
                    >
                      <option value="anak">Anak</option>
                      {formData.gender === 'male' && <option value="ayah">Ayah/Suami</option>}
                      {formData.gender === 'female' && <option value="ibu">Ibu/Istri</option>}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

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
