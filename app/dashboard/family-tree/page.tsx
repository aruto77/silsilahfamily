'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getSupabase } from '../../../lib/supabase';
import { Plus, Users, GitBranch, ArrowLeft, Search } from 'lucide-react';
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
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  const [customModalMemberId, setCustomModalMemberId] = useState<string | null>(null);
  const activeMember = useMemo(() => members.find(m => m.id === customModalMemberId), [members, customModalMemberId]);

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

  useEffect(() => {
    if (!initializedFromUrl && families.length > 0 && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlView = searchParams.get('view');
      const urlFamily = searchParams.get('family');
      
      if (urlView === 'grouped' || urlView === 'full') {
        setOverrideViewMode(urlView);
      }
      
      if (urlView === 'grouped' && urlFamily) {
        const found = families.find(f => f.id === urlFamily);
        if (found) {
          setSelectedFamily(found);
        }
      }
      
      setInitializedFromUrl(true);
    }
  }, [families, initializedFromUrl]);

// Add formatName locally 
  const formatName = (m: any) => {
    if (!m) return '';
    if (m.death_date) {
      return m.gender === 'female' ? `Almh. ${m.full_name}` : `Alm. ${m.full_name}`;
    }
    return m.full_name;
  };

  const treeComponentRef = React.useRef<any>(null);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pohon Silsilah Keluarga</h1>
          <p className="text-slate-500 mt-1">
            {viewMode === 'full' ? 'Visualisasi pohon keluarga secara menyeluruh.' : 'Visualisasi silsilah berdasarkan keluarga inti.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && !selectedFamily && (
            <div className="flex p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setOverrideViewMode('grouped')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'grouped' ? 'bg-white shadow border border-slate-200 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Keluarga Inti
              </button>
              <button
                onClick={() => setOverrideViewMode('full')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'full' ? 'bg-white shadow border border-slate-200 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Penuh
              </button>
            </div>
          )}
          
          <button 
            onClick={() => {
               if (treeComponentRef.current) {
                  treeComponentRef.current.exportPdf();
               } else {
                  // Fallback
                  const bftElement = document.querySelector('.bft-pdf');
                  if (bftElement) {
                    (bftElement as HTMLElement).click();
                  } else {
                     alert('Tampilan silsilah belum siap untuk dicetak.');
                  }
               }
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 shrink-0"
          >
            Simpan sebagai PDF
          </button>

          <Link 
            href="/dashboard/family-tree/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
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
          <div className="p-6 h-full overflow-auto flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
               <h2 className="text-lg font-bold text-slate-800 shrink-0">Pilih Keluarga Inti</h2>
               <div className="relative w-full md:w-96">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                   <Search className="w-4 h-4" />
                 </span>
                 <input 
                   type="text" 
                   value={familySearchQuery}
                   onChange={(e) => setFamilySearchQuery(e.target.value)}
                   placeholder="Cari keluarga (mis. nama ayah/ibu)..." 
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700" 
                 />
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {families.filter(fam => fam.name.toLowerCase().includes(familySearchQuery.toLowerCase())).map(fam => (
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
              </div>
            )}
            <div className="flex-1 relative">
              <BalkanFamilyTree 
                ref={treeComponentRef}
                members={selectedFamily ? [...selectedFamily.parents, ...selectedFamily.children] : members} 
                marriages={selectedFamily ? (selectedFamily.marriage ? [selectedFamily.marriage] : []) : marriages} 
                onNodeClick={(id) => {
                   setCustomModalMemberId(id);
                }}
                enableSearch={viewMode === 'full'}
                initialZoom={viewMode === 'grouped' ? 0.75 : undefined}
              />
            </div>
          </div>
        )}
      </div>

      {activeMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <div>
                  <h3 className="font-bold text-slate-800 text-lg">{formatName(activeMember)}</h3>
                  <p className="text-xs text-slate-500">
                    {activeMember.birth_date ? new Date(activeMember.birth_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) : 'Tanggal lahir belum dicatat'}
                  </p>
               </div>
               <button onClick={() => setCustomModalMemberId(null)} className="p-2 text-2xl leading-none bg-white rounded-lg hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <Link
                  href={`/dashboard/family-tree/${activeMember.id}${selectedFamily ? `?view=grouped&family=${selectedFamily.id}` : ''}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  Lihat Detail
              </Link>
              
              <div className="h-px bg-slate-100 my-4" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Navigasi Silsilah</p>
                
                {(() => {
                  const parentFamily = families.find(f => f.children.some(c => c.id === activeMember.id));
                  if (parentFamily) {
                    return (
                       <button
                         onClick={() => {
                           setOverrideViewMode('grouped');
                           setSelectedFamily(parentFamily);
                           setCustomModalMemberId(null);
                         }}
                         className="w-full text-left px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:bg-white hover:border-indigo-300 transition-colors flex items-center"
                       >
                          <ArrowLeft className="w-4 h-4 mr-2 text-slate-500" />
                          Lihat Sebagai Anak (Keluarga {parentFamily.parents[0]?.full_name})
                       </button>
                    )
                  }
                  return null;
                })()}

                {(() => {
                  const memberFamilies = families.filter(f => f.parents.some(p => p.id === activeMember.id));
                  if (memberFamilies.length > 0) {
                    return memberFamilies.map((fam, idx) => {
                      const pasangan = fam.parents.find(p => p.id !== activeMember.id);
                      const text = pasangan ? `Lihat Unit Keluarga dengan ${pasangan.full_name}` : `Lihat Unit Keluarga (Single Parent)`;
                      return (
                       <button
                         key={fam.id}
                         onClick={() => {
                           setOverrideViewMode('grouped');
                           setSelectedFamily(fam);
                           setCustomModalMemberId(null);
                         }}
                         className="w-full text-left px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:bg-white hover:border-indigo-300 transition-colors flex items-center mt-2"
                       >
                          <Users className="w-4 h-4 mr-2 text-slate-500" />
                          {text}
                       </button>
                      );
                    });
                  }
                  return null;
                })()}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={async () => {
                    if (confirm('Apakah anda yakin ingin menghapus data anggota keluarga ini?')) {
                      const supabase = getSupabase();
                      await supabase.from('family_members').delete().eq('id', activeMember.id);
                      
                      if (isAdmin) {
                        await supabase.from('audit_logs').insert([{
                           admin_id: profile?.id,
                           target_id: activeMember.id,
                           action_type: 'HAPUS_ANGGOTA',
                           details: { info: `Menghapus data anggota: ${activeMember.full_name}` }
                        }]);
                      }

                      setMembers(prev => prev.filter(m => m.id !== activeMember.id));
                      setCustomModalMemberId(null);
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors flex items-center justify-center"
                >
                  Hapus Data Anggota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
