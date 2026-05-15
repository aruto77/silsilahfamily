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

  const [addSpouse, setAddSpouse] = useState(false);
  const [spouseData, setSpouseData] = useState({
    full_name: '',
    gender: 'female',
    birth_date: '',
    death_date: '',
    photo_url: '',
    is_adopted: false
  });

  const [members, setMembers] = useState<any[]>([]);
  const [relatedMemberId, setRelatedMemberId] = useState<string>('');
  const [relationType, setRelationType] = useState<'anak_dari' | 'orang_tua_dari' | 'pasangan_dari'>('anak_dari');
  const [dataLoading, setDataLoading] = useState(true);

  const [childCountStr, setChildCountStr] = useState("1");
  const [customChildCount, setCustomChildCount] = useState<number>(0);
  const childCount = childCountStr === 'custom' ? customChildCount : (parseInt(childCountStr) || 1);
  const [additionalChildren, setAdditionalChildren] = useState<any[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase();
      
      const { data: membersRes } = await supabase.from('family_members').select('*').order('full_name');
      
      setMembers(membersRes || []);
      setDataLoading(false);
    }
    fetchData();
  }, []);

  React.useEffect(() => {
    if (relationType !== 'anak_dari') return;
    const extraCount = Math.max(0, childCount - 1);
    // eslint-disable-next-line
    setAdditionalChildren(prev => {
       if (prev.length === extraCount) return prev;
       if (prev.length < extraCount) {
          const toAdd = extraCount - prev.length;
          return [...prev, ...Array.from({ length: toAdd }).map(() => ({
              full_name: '',
              gender: 'male',
              birth_date: '',
              death_date: '',
              photo_url: '',
              is_adopted: false
          }))];
       }
       return prev.slice(0, extraCount);
    });
  }, [childCount, relationType]);

  const handleAdditionalChildChange = (index: number, e: React.ChangeEvent<any>) => {
    const { name, value, type } = e.target;
    setAdditionalChildren(prev => {
       const newArr = [...prev];
       newArr[index] = {
         ...newArr[index],
         [name]: type === 'checkbox' ? e.target.checked : value
       };
       return newArr;
    });
  };

  const handleAdditionalFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
       setAdditionalChildren(prev => {
          const newArr = [...prev];
          newArr[index] = { ...newArr[index], photo_url: reader.result as string };
          return newArr;
       });
    };
    reader.readAsDataURL(file);
  };

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
    if (name === 'gender') {
       setSpouseData(prev => ({ ...prev, gender: value === 'male' ? 'female' : 'male' }));
    }
  };

  const handleSpouseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setSpouseData(prev => ({
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

      if (addSpouse) {
        payload._new_spouse_request = {
          ...spouseData,
          birth_date: spouseData.birth_date || null,
          death_date: spouseData.death_date || null,
        };
        // Setup marriage request linking the two new members
        payload._marriage_request = {
          husband_id: formData.gender === 'male' ? 'NEW_MEMBER' : 'NEW_SPOUSE',
          wife_id: formData.gender === 'female' ? 'NEW_MEMBER' : 'NEW_SPOUSE',
        };
      }

      let relatedParentUpdate: any = {};

      if (relatedMemberId && relationType) {
        const related = members.find(m => m.id === relatedMemberId);
        if (related) {
          if (relationType === 'anak_dari') {
            if (related.gender === 'male') {
               payload.father_id = related.id;
               relatedParentUpdate.father_id = related.id;
            }
            if (related.gender === 'female') {
               payload.mother_id = related.id;
               relatedParentUpdate.mother_id = related.id;
            }
            
            // If they are a child of 'related' and they chose to also add a spouse, the spouse doesn't get related.id as parent.
          } else if (relationType === 'orang_tua_dari') {
            payload._update_child_request = {
              child_id: related.id,
              parent_type: formData.gender === 'male' ? 'father_id' : 'mother_id'
            };
            // If they also chose addSpouse, the other parent is the spouse
            if (addSpouse) {
              payload._update_child_request.spouse_parent_type = formData.gender === 'male' ? 'mother_id' : 'father_id';
            }
          } else if (relationType === 'pasangan_dari') {
            // Can't choose "add spouse" AND "pasangan dari" from existing
            if (!addSpouse) {
              payload._marriage_request = {
                husband_id: formData.gender === 'male' ? 'NEW_MEMBER' : related.id,
                wife_id: formData.gender === 'female' ? 'NEW_MEMBER' : related.id,
              };
            }
          }
        }
      }

      const extraPayloads = relationType === 'anak_dari' && childCount > 1 
         ? additionalChildren.map(child => ({
             ...child,
             birth_date: child.birth_date || null,
             death_date: child.death_date || null,
             ...relatedParentUpdate
           }))
         : [];

      const { _marriage_request, _update_child_request, _new_spouse_request, ...realData } = payload;

      if (profile?.role === 'admin') {
        // Admins can insert directly
        const { data, error: insertError } = await supabase
          .from('family_members')
          .insert([realData])
          .select()
          .single();

        if (insertError) throw insertError;
        
        let newSpouseId = null;
        if (_new_spouse_request) {
           const { data: spouseRes } = await supabase.from('family_members').insert([_new_spouse_request]).select().single();
           if (spouseRes) newSpouseId = spouseRes.id;
        }

        if (_marriage_request && data) {
           const marriagePayload = {
               husband_id: _marriage_request.husband_id === 'NEW_MEMBER' ? data.id : (_marriage_request.husband_id === 'NEW_SPOUSE' ? newSpouseId : _marriage_request.husband_id),
               wife_id: _marriage_request.wife_id === 'NEW_MEMBER' ? data.id : (_marriage_request.wife_id === 'NEW_SPOUSE' ? newSpouseId : _marriage_request.wife_id),
               status: 'active'
           };
           await supabase.from('marriages').insert([marriagePayload]);
        }

        if (_update_child_request && data) {
           const childUpdatePayload: any = {
               [_update_child_request.parent_type]: data.id
           };
           if (_update_child_request.spouse_parent_type && newSpouseId) {
               childUpdatePayload[_update_child_request.spouse_parent_type] = newSpouseId;
           }
           await supabase.from('family_members').update(childUpdatePayload).eq('id', _update_child_request.child_id);
        }

        if (extraPayloads.length > 0) {
           const { error: extraErr } = await supabase.from('family_members').insert(extraPayloads);
           if (extraErr) console.error("Error inserting extra children", extraErr);
        }

        // --- AUDIT LOG ---
        await supabase.from('audit_logs').insert([{
           admin_id: profile?.id,
           target_id: data.id,
           action_type: 'TAMBAH_ANGGOTA',
           details: { info: `Menambahkan anggota keluarga baru: ${data.full_name}`, relatedTo: relatedMemberId }
        }]);

        router.push(`/dashboard/family-tree/${data.id}`);
      } else {
        // Members must create a change request
        const requestsToInsert = [
          {
            requester_id: profile?.id,
            target_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for new records
            target_table: 'family_members',
            new_data: payload, // note: payload includes _marriage_request, handled in approval!
            status: 'pending'
          },
          ...extraPayloads.map(ex => ({
            requester_id: profile?.id,
            target_id: '00000000-0000-0000-0000-000000000000',
            target_table: 'family_members',
            new_data: ex,
            status: 'pending'
          }))
        ];

        const { error: requestError } = await supabase
          .from('change_requests')
          .insert(requestsToInsert);

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

          {!dataLoading && members.length > 0 && (
            <div className="space-y-4 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Relasi Keluarga (Opsional)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="relatedMemberId">
                    Pilih Anggota Keluarga Spesifik
                  </label>
                  <select
                    id="relatedMemberId"
                    value={relatedMemberId}
                    onChange={(e) => setRelatedMemberId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700"
                  >
                    <option value="">-- Tidak dikaitkan dengan siapa-siapa --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name} ({m.gender === 'male' ? 'L' : 'P'})</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Anda bisa mengetik untuk mencari nama anggota keluarga.</p>
                </div>

                {relatedMemberId && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="relationType">
                      Status Anggota Baru Ini Sebagai:
                    </label>
                    <select
                      id="relationType"
                      value={relationType}
                      onChange={(e) => {
                        setRelationType(e.target.value as any);
                        setChildCountStr("1");
                        setCustomChildCount(0);
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700"
                    >
                      <option value="anak_dari">Anaknya</option>
                      <option value="orang_tua_dari">Ayah/Ibunya</option>
                      <option value="pasangan_dari">Suami/Istrinya</option>
                    </select>
                  </div>
                )}
                
                {relatedMemberId && relationType === 'anak_dari' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="childCount">
                      Jumlah Anak yang Ditambahkan
                    </label>
                    <select
                      id="childCount"
                      value={childCountStr}
                      onChange={(e) => setChildCountStr(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700"
                    >
                      <option value="1">1 Anak</option>
                      <option value="2">2 Anak</option>
                      <option value="3">3 Anak</option>
                      <option value="4">4 Anak</option>
                      <option value="5">5 Anak</option>
                      <option value="custom">Isi jumlah anak...</option>
                    </select>
                    {childCountStr === 'custom' && (
                       <input 
                         type="number"
                         min="6"
                         placeholder="Masukkan jumlah anak"
                         value={customChildCount || ''}
                         onChange={(e) => setCustomChildCount(parseInt(e.target.value) || 0)}
                         className="w-full px-4 py-2.5 mt-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700"
                       />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="font-bold text-slate-800 text-lg mb-4">
              {childCount > 1 ? 'Data Anak Ke-1' : 'Data Pribadi'}
            </h3>
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
          </div>

          <div className="mb-8">
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
              <input 
                type="checkbox" 
                id="add_spouse" 
                name="add_spouse"
                checked={addSpouse}
                onChange={(e) => setAddSpouse(e.target.checked)}
                disabled={relatedMemberId !== '' && relationType === 'pasangan_dari'}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <label htmlFor="add_spouse" className={`text-sm font-medium text-slate-700 cursor-pointer ${relatedMemberId !== '' && relationType === 'pasangan_dari' ? 'opacity-50' : ''}`}>
                Tambahkan Sekalian Pasangan (Opsional)
              </label>
            </div>
            
            {addSpouse && (
              <div className="p-6 border border-indigo-200 bg-indigo-50/50 rounded-2xl mb-8 space-y-6">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Data Pasangan</h3>
                
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="spouse_full_name">
                    Nama Lengkap Pasangan <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="spouse_full_name" 
                    name="full_name" 
                    required={addSpouse}
                    value={spouseData.full_name}
                    onChange={handleSpouseChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all placeholder:text-slate-400" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="spouse_gender">
                      Jenis Kelamin
                    </label>
                    <select 
                      id="spouse_gender" 
                      name="gender" 
                      value={spouseData.gender}
                      onChange={handleSpouseChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700 disabled:opacity-70"
                    >
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="spouse_birth_date">
                      Tanggal Lahir
                    </label>
                    <input 
                      type="date" 
                      id="spouse_birth_date" 
                      name="birth_date" 
                      value={spouseData.birth_date}
                      onChange={handleSpouseChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor="spouse_death_date">
                      Tanggal Meninggal (Opsional)
                    </label>
                    <input 
                      type="date" 
                      id="spouse_death_date" 
                      name="death_date" 
                      value={spouseData.death_date}
                      onChange={handleSpouseChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {additionalChildren.map((child, index) => (
             <div key={index} className="mb-8 pt-8 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 text-lg mb-4">Data Anak Ke-{index + 2}</h3>
                
                <div className="mb-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor={`child_name_${index}`}>
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      id={`child_name_${index}`}
                      name="full_name"
                      required
                      value={child.full_name}
                      onChange={(e) => handleAdditionalChildChange(index, e)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor={`child_gender_${index}`}>
                      Jenis Kelamin <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id={`child_gender_${index}`}
                      name="gender"
                      required
                      value={child.gender}
                      onChange={(e) => handleAdditionalChildChange(index, e)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    >
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor={`child_birth_${index}`}>
                      Tanggal Lahir
                    </label>
                    <input 
                      type="date" 
                      id={`child_birth_${index}`} 
                      name="birth_date" 
                      value={child.birth_date} 
                      onChange={(e) => handleAdditionalChildChange(index, e)} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor={`child_death_${index}`}>
                      Tanggal Wafat
                    </label>
                    <input 
                      type="date" 
                      id={`child_death_${index}`} 
                      name="death_date" 
                      value={child.death_date} 
                      onChange={(e) => handleAdditionalChildChange(index, e)} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider" htmlFor={`child_photo_${index}`}>Foto</label>
                  <input type="file" id={`child_photo_${index}`} accept=".jpg,.jpeg,.png" onChange={(e) => handleAdditionalFileChange(index, e)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                  {child.photo_url && <img src={child.photo_url} alt="Preview" className="w-24 h-24 object-cover mt-2 rounded-lg border border-slate-200" />}
                </div>

                <div className="flex items-center space-x-3 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <input type="checkbox" id={`child_adopted_${index}`} name="is_adopted" checked={child.is_adopted} onChange={(e) => handleAdditionalChildChange(index, e)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" />
                  <label htmlFor={`child_adopted_${index}`} className="text-sm font-medium text-slate-700 cursor-pointer">Anak Angkat/Tiri (Ya)</label>
                </div>
             </div>
          ))}

          <div className="flex justify-end pt-4 border-t border-slate-100 items-center space-x-4">
            <Link 
              href="/dashboard/family-tree"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Batalkan
            </Link>
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
