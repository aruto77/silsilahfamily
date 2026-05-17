'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getSupabase } from '../../../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useUser } from '../../../hooks/use-user';

const BalkanFamilyTree = dynamic(() => import('../../../components/dashboard/BalkanFamilyTree'), { ssr: false });

export default function PohonSilsilahPage() {
  const { profile } = useUser();
  const isAdmin = profile?.role === 'admin';
  
  const [members, setMembers] = useState<any[]>([]);
  const [marriages, setMarriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pohon Silsilah Keluarga (Tampilan Penuh)</h1>
          <p className="text-slate-500 mt-1">Visualisasi pohon keluarga secara menyeluruh.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
               if (treeComponentRef.current) {
                  treeComponentRef.current.exportPdf();
               } else {
                  const bftElement = document.querySelector('.bft-pdf');
                  if (bftElement) {
                    (bftElement as HTMLElement).click();
                  } else {
                     alert('Tampilan silsilah belum siap untuk dicetak.');
                  }
               }
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
          >
            Simpan sebagai PDF
          </button>
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
          </div>
        ) : (
          <div className="flex flex-col h-[600px]">
             <div className="flex-1 relative">
               <BalkanFamilyTree 
                 ref={treeComponentRef}
                 members={members} 
                 marriages={marriages} 
                 onNodeClick={(id) => {
                    setCustomModalMemberId(id);
                 }}
                 enableSearch={true}
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
                  href={`/dashboard/family-tree/${activeMember.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  Lihat Detail
              </Link>

              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      if (confirm('Apakah anda yakin ingin menghapus data anggota keluarga ini?')) {
                        const supabase = getSupabase();
                        await supabase.from('family_members').delete().eq('id', activeMember.id);
                        
                        await supabase.from('audit_logs').insert([{
                             admin_id: profile?.id,
                             target_id: activeMember.id,
                             action_type: 'HAPUS_ANGGOTA',
                             details: { info: `Menghapus data anggota: ${activeMember.full_name}` }
                        }]);
  
                        setMembers(prev => prev.filter(m => m.id !== activeMember.id));
                        setCustomModalMemberId(null);
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors flex items-center justify-center"
                  >
                    Hapus Data Anggota
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
