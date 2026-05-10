'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getSupabase } from '../../../lib/supabase';
import { Plus, Users, GitBranch, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUser } from '../../../hooks/use-user';

const BalkanFamilyTree = dynamic(() => import('../../../components/dashboard/BalkanFamilyTree'), { ssr: false });

interface NuclearFamily {
  id: string;
  name: string;
  parents: any[];
  children: any[];
  marriage?: any;
}

export default function FamilyTreePage() {
  const { profile } = useUser();
  const isAdmin = profile?.role === 'admin';
  
  const [members, setMembers] = useState<any[]>([]);
  const [marriages, setMarriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [overrideViewMode, setOverrideViewMode] = useState<'full' | 'grouped' | null>(null);
  const viewMode = overrideViewMode || (isAdmin ? 'full' : 'grouped');
  const [selectedFamily, setSelectedFamily] = useState<NuclearFamily | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabase();
      
      const [membersResponse, marriagesResponse] = await Promise.all([
        supabase.from('family_members').select('*'),
        supabase.from('marriages').select('*')
      ]);

      setMembers(membersResponse.data || []);
      setMarriages(marriagesResponse.data || []);
      setLoading(false);
    }
    
    fetchData();
  }, []);

  const families = useMemo(() => {
    const fams: NuclearFamily[] = [];
    const processedParentIds = new Set<string>();

    for (const match of marriages) {
      const husband = members.find(m => m.id === match.husband_id);
      const wife = members.find(m => m.id === match.wife_id);
      
      if (!husband && !wife) continue;

      if (husband) processedParentIds.add(husband.id);
      if (wife) processedParentIds.add(wife.id);

      const children = members.filter(m => m.father_id === match.husband_id || m.mother_id === match.wife_id);

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
        children,
        marriage: match
      });
    }

    const singleParents = members.filter(m => 
      !processedParentIds.has(m.id) && 
      members.some(child => child.father_id === m.id || child.mother_id === m.id)
    );

    for (const parent of singleParents) {
      const children = members.filter(m => m.father_id === parent.id || m.mother_id === parent.id);
      fams.push({
        id: parent.id,
        name: `Keluarga ${parent.full_name} (Single Parent)`,
        parents: [parent],
        children,
      });
    }

    return fams;
  }, [members, marriages]);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pohon Silsilah Keluarga</h1>
          <p className="text-slate-500 mt-1">
            {viewMode === 'full' ? 'Visualisasi pohon keluarga secara menyeluruh.' : 'Visualisasi silsilah berdasarkan keluarga inti.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && !selectedFamily && (
            <div className="flex p-1 bg-slate-200 rounded-lg">
              <button
                onClick={() => setOverrideViewMode('grouped')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'grouped' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Keluarga Inti
              </button>
              <button
                onClick={() => setOverrideViewMode('full')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'full' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Penuh
              </button>
            </div>
          )}
          <Link 
            href="/dashboard/family-tree/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Anggota
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px] relative">
        {loading ? (
           <div className="flex items-center justify-center h-full absolute inset-0 text-slate-400">
             <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3"></div>
             Memuat data silsilah...
           </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full absolute inset-0 text-slate-500">
              <p className="font-medium text-slate-600">Tidak ada data ditemukan</p>
              <p className="text-xs mt-1 mb-4">Tambahkan anggota keluarga pertama Anda.</p>
              <Link 
                href="/dashboard/family-tree/new"
                className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Tambah Anggota
              </Link>
          </div>
        ) : viewMode === 'grouped' && !selectedFamily ? (
          <div className="p-6 h-full overflow-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Pilih Keluarga Inti</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {families.map(fam => (
                <button
                  key={fam.id}
                  onClick={() => setSelectedFamily(fam)}
                  className="bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl p-5 text-left transition-all group flex flex-col h-full"
                >
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm text-indigo-600 mb-4 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-700">{fam.name}</h3>
                  <div className="flex items-center text-xs text-slate-500 space-x-4 mt-auto pt-4 border-t border-slate-200/60">
                     <span className="flex items-center">
                       <Users className="w-3.5 h-3.5 mr-1.5" />
                       {fam.parents.length} Orang Tua
                     </span>
                     <span className="flex items-center">
                       <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                       {fam.children.length} Anak
                     </span>
                  </div>
                </button>
              ))}
              {families.length === 0 && (
                 <div className="col-span-full py-12 text-center text-slate-500">
                    Belum ada data keluarga inti yang lengkap. Pastikan menambah anggota dengan data Ayah/Ibu atau Pernikahan.
                 </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[600px]">
            {selectedFamily && (
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between z-10 relative">
                <div className="flex items-center">
                  <button 
                    onClick={() => setSelectedFamily(null)}
                    className="mr-4 p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <div>
                    <h2 className="font-bold text-slate-800">{selectedFamily.name}</h2>
                    <p className="text-xs text-slate-500">{selectedFamily.parents.length} Orang Tua, {selectedFamily.children.length} Anak</p>
                  </div>
                </div>
                
                <div className="flex gap-2 text-xs flex-wrap">
                   {selectedFamily.parents.map(parent => {
                      const parentFamily = families.find(f => f.children.some(c => c.id === parent.id));
                      return parentFamily ? (
                        <button 
                          key={`up-${parent.id}`} 
                          onClick={() => setSelectedFamily(parentFamily)}
                          className="bg-white text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 hover:border-indigo-300 hover:text-indigo-700"
                          title={`Lihat orang tua dari ${parent.full_name}`}
                        >
                          <ArrowLeft className="w-3 h-3 text-slate-400" />
                          <span>Asal {parent.full_name.split(' ')[0]}</span>
                        </button>
                      ) : null;
                   })}
                   {selectedFamily.children.map(child => {
                      const childFamily = families.find(f => f.parents.some(p => p.id === child.id));
                      return childFamily ? (
                        <button 
                          key={`down-${child.id}`} 
                          onClick={() => setSelectedFamily(childFamily)}
                          className="bg-white text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 hover:border-indigo-300 hover:text-indigo-700"
                          title={`Lihat keluarga dari ${child.full_name}`}
                        >
                          <span>Keluarga {child.full_name.split(' ')[0]}</span>
                          <ArrowLeft className="w-3 h-3 rotate-180 text-slate-400" />
                        </button>
                      ) : null;
                   })}
                </div>
              </div>
            )}
            <div className="flex-1 relative">
              <BalkanFamilyTree 
                members={selectedFamily ? [...selectedFamily.parents, ...selectedFamily.children] : members} 
                marriages={selectedFamily ? (selectedFamily.marriage ? [selectedFamily.marriage] : []) : marriages} 
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
