'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../../lib/supabase';
import { useUser } from '../../../../hooks/use-user';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Heart, FileEdit } from 'lucide-react';
import Link from 'next/link';

export default function MemberProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { profile } = useUser();
  const [member, setMember] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMember() {
      const supabase = getSupabase();
      
      const { data: allMembers, error: allMembersError } = await supabase
        .from('family_members')
        .select('*');
        
      if (!allMembersError && allMembers) {
        setMembers(allMembers);
      }

      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(error);
      } else {
        setMember(data);
      }
      setLoading(false);
    }
    
    if (id) fetchMember();
  }, [id]);

  const handleMarkAsDeceased = async () => {
    if (confirm('Ubah status hidup menjadi meninggal dunia? (Tanggal wafat akan diisi dengan hari ini. Anda bisa mengubahnya nanti melalui form Edit.)')) {
        const supabase = getSupabase();
        const today = new Date().toISOString().split('T')[0];
        
        if (profile?.role === 'admin') {
            await supabase.from('family_members').update({ death_date: today }).eq('id', id);
            setMember({ ...member, death_date: today });
        } else {
            const { error: requestError } = await supabase
              .from('change_requests')
              .insert([{
                requester_id: profile?.id,
                target_id: id,
                target_table: 'family_members',
                old_data: member,
                new_data: { ...member, death_date: today },
                status: 'pending'
              }]);
            if (!requestError) {
              alert('Usulan perubahan telah dikirim ke admin.');
            }
        }
    }
  };

  const formatName = (m: any) => {
    if (!m) return '';
    if (m.death_date) {
      return m.gender === 'female' ? `Almh. ${m.full_name}` : `Alm. ${m.full_name}`;
    }
    return m.full_name;
  };

  const renderParentExplanation = () => {
    if (!member.father_id && !member.mother_id) {
       return "Belum/Tidak Diketahui";
    }
    
    const father = members.find(m => m.id === member.father_id);
    const mother = members.find(m => m.id === member.mother_id);
    const statusText = member.is_adopted ? 'anak angkat/tiri' : 'anak kandung';
    
    if (father && mother) {
       return `sebagai ${statusText} dari pasangan ${formatName(father)} dan ${formatName(mother)}`;
    } else if (father) {
       return `sebagai ${statusText} dari ${formatName(father)}`;
    } else if (mother) {
       return `sebagai ${statusText} dari ${formatName(mother)}`;
    }
    return "Belum/Tidak Diketahui";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center p-12">
        <h2 className="text-xl font-bold text-slate-800">Profil Tidak Ditemukan</h2>
        <Link href="/dashboard/family-tree" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium">Kembali</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link 
          href="/dashboard/family-tree"
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali ke Pohon Silsilah
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center">
            {member.photo_url ? (
               <img src={member.photo_url} alt={member.full_name} className="w-32 h-32 rounded-full object-cover mb-6 border border-slate-200 shadow-sm" />
            ) : (
              <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-sm ${member.gender === 'male' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                <UserIcon className="w-16 h-16 opacity-50" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">
              {formatName(member)}
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              {member.birth_date ? new Date(member.birth_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) : 'Tanggal lahir belum dicatat'}
              {member.death_date && ` - ${new Date(member.death_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'})}`}
            </p>

            <div className="w-full h-px bg-slate-100 my-6"></div>

            <div className="w-full flex gap-3">
              <Link 
                href={`/dashboard/family-tree/${member.id}/edit`}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors"
                title={profile?.role !== 'admin' ? "Ajukan perubahan untuk profil ini" : "Edit profil ini"}
              >
                <FileEdit className="w-4 h-4 mr-2" />
                {profile?.role === 'admin' ? 'Edit Data' : 'Usulkan Ubah'}
              </Link>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
             <h3 className="font-bold text-slate-800 mb-6 flex items-center">
               <UserIcon className="w-5 h-5 mr-2 text-slate-400" />
               Informasi Pribadi
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                 <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Status Kehidupan</p>
                 <div className="font-medium text-slate-700">
                    {member.death_date ? <span className="text-rose-600 font-semibold">Almarhum/ah</span> : (
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold">Hidup</span>
                        <button 
                          onClick={handleMarkAsDeceased}
                          className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors font-semibold"
                        >
                          Ubah
                        </button>
                      </span>
                    )}
                 </div>
               </div>
               <div>
                 <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Jenis Kelamin</p>
                 <p className="font-medium text-slate-700 capitalize">
                    {member.gender === 'male' ? 'Laki-laki' : member.gender === 'female' ? 'Perempuan' : member.gender}
                 </p>
               </div>
               <div>
                 <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Status Anak</p>
                 <div className="font-medium text-slate-700">
                    {member.is_adopted ? 'Diadopsi' : 'Anak Kandung'}
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                       {renderParentExplanation()}
                    </div>
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
             <h3 className="font-bold text-slate-800 mb-6 flex items-center">
               <Heart className="w-5 h-5 mr-2 text-rose-400" />
               Keluarga Inti
             </h3>
             <div className="space-y-4">
                <p className="text-slate-500 text-sm text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                  Visualisasi keluarga (Pasangan & Anak) akan dimuat di sini...
                </p>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
