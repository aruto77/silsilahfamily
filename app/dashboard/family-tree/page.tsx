'use client';

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../lib/supabase';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BalkanFamilyTree = dynamic(() => import('../../../components/dashboard/BalkanFamilyTree'), { ssr: false });

export default function FamilyTreePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [marriages, setMarriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pohon Silsilah Keluarga</h1>
          <p className="text-slate-500 mt-1">Visualisasi pohon keluarga secara interaktif.</p>
        </div>
        <Link 
          href="/dashboard/family-tree/new"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Anggota
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {loading ? (
           <div className="flex items-center justify-center h-[600px] text-slate-400">
             <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3"></div>
             Memuat pohon keluarga...
           </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[600px] text-slate-500">
              <p className="font-medium text-slate-600">Tidak ada data ditemukan</p>
              <p className="text-xs mt-1 mb-4">Tambahkan anggota keluarga pertama Anda.</p>
              <Link 
                href="/dashboard/family-tree/new"
                className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Tambah Anggota
              </Link>
          </div>
        ) : (
          <BalkanFamilyTree members={members} marriages={marriages} />
        )}
      </div>
    </>
  );
}
