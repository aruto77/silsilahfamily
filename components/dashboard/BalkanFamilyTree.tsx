'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
// @ts-ignore
import FamilyTree from '@balkangraph/familytree.js';
import { X } from 'lucide-react';

interface Member {
  id: string;
  full_name: string;
  father_id: string | null;
  mother_id: string | null;
  gender: string;
  birth_date: string | null;
  death_date: string | null;
  photo_url: string | null;
}

interface Marriage {
  husband_id: string;
  wife_id: string;
}

interface BalkanFamilyTreeProps {
  members: Member[];
  marriages: Marriage[];
  onNodeClick?: (id: string) => void;
  enableSearch?: boolean;
}

export interface BalkanFamilyTreeRef {
  exportPdf: () => void;
}

const BalkanFamilyTree = forwardRef<BalkanFamilyTreeRef, BalkanFamilyTreeProps>(
  ({ members, marriages, onNodeClick, enableSearch = true }, ref) => {
    const treeRef = useRef<HTMLDivElement>(null);
    const internalTreeRef = useRef<any>(null);
    
    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState('A4');
    const [exportOrientation, setExportOrientation] = useState('landscape');
    const [exportColorMode, setExportColorMode] = useState<'color' | 'grayscale'>('color');

    useImperativeHandle(ref, () => ({
      exportPdf: () => {
         setIsExportModalOpen(true);
      }
    }));

    const handleDownloadPdf = () => {
        if (!internalTreeRef.current) return;
        
        try {
            const svg = treeRef.current?.querySelector('svg');
            let grayscaleStyle: SVGStyleElement | null = null;
            
            if (exportColorMode === 'grayscale' && svg) {
               grayscaleStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');
               grayscaleStyle.id = 'grayscale-export-style';
               grayscaleStyle.innerHTML = `
                 .node rect { fill: #e2e8f0 !important; stroke: #94a3b8 !important; }
                 .node text { fill: #334155 !important; }
                 .node image { filter: grayscale(100%); }
                 .female rect { fill: #e2e8f0 !important; stroke: #94a3b8 !important; }
                 .female text { fill: #334155 !important; }
               `;
               svg.insertBefore(grayscaleStyle, svg.firstChild);
            }

            internalTreeRef.current.exportPDF({
                format: exportFormat,
                orientation: exportOrientation,
                margin: [20, 20, 20, 20]
            });

            // Cleanup
            if (grayscaleStyle && svg) {
                setTimeout(() => {
                    if (grayscaleStyle && svg.contains(grayscaleStyle)) {
                        svg.removeChild(grayscaleStyle);
                    }
                }, 2000);
            }
            
            setIsExportModalOpen(false);
        } catch(e) {
            console.error("FamilyTree export failed:", e);
            alert("Gagal menyimpan PDF. Coba kembali.");
        }
    };

    useEffect(() => {
      if (!treeRef.current) return;

      const getDescendantCount = (memberId: string): number => {
         let count = 0;
         const children = members.filter(m => m.father_id === memberId || m.mother_id === memberId);
         count += children.length;
         children.forEach(c => {
             count += getDescendantCount(c.id);
         });
         return count;
      };

      // Sort members so those without parents come first
      const sortedMembers = [...members].sort((a, b) => {
        const aHasParents = a.father_id || a.mother_id;
        const bHasParents = b.father_id || b.mother_id;
        if (!aHasParents && bHasParents) return -1;
        if (aHasParents && !bHasParents) return 1;
        
        // If both have no parents, sort by number of descendants (descending)
        if (!aHasParents && !bHasParents) {
            const countA = getDescendantCount(a.id);
            const countB = getDescendantCount(b.id);
            if (countA !== countB) {
                return countB - countA;
            }
            // Fallback to name alphabetically
            return a.full_name.localeCompare(b.full_name);
        }

        // If both have parents, sort by birth date (oldest first)
        if (aHasParents && bHasParents) {
          if (a.birth_date && b.birth_date) {
            return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
          }
          if (a.birth_date) return -1;
          if (b.birth_date) return 1;
        }
        
        return 0; // maintain relative order
      });

      const nodes = sortedMembers.map(m => {
        const pids: string[] = [];
        marriages.forEach(marriage => {
          if (marriage.husband_id === m.id && members.some(x => x.id === marriage.wife_id)) pids.push(marriage.wife_id);
          if (marriage.wife_id === m.id && members.some(x => x.id === marriage.husband_id)) pids.push(marriage.husband_id);
        });

        let displayName = m.full_name;
        if (m.death_date) {
          displayName = m.gender === 'female' ? `Almh. ${displayName}` : `Alm. ${displayName}`;
        }

        return {
          id: m.id,
          pids: pids.length > 0 ? pids : undefined,
          mid: m.mother_id && members.some(x => x.id === m.mother_id) ? m.mother_id : undefined,
          fid: m.father_id && members.some(x => x.id === m.father_id) ? m.father_id : undefined,
          name: displayName,
          gender: m.gender,
          birthDate: m.birth_date ? new Date(m.birth_date).getFullYear().toString() : '',
          orderId: m.birth_date ? new Date(m.birth_date).getTime() : 9999999999999, // Sort fallback
          img: m.photo_url || '',
          tags: [m.gender]
        };
      });

      if (internalTreeRef.current) {
        try {
          internalTreeRef.current.destroy();
        } catch (e) {
          console.error("Error destroying previous tree", e);
        }
        internalTreeRef.current = null;
      }

      try {
        internalTreeRef.current = new FamilyTree(treeRef.current, {
            orderBy: "orderId",
            nodeBinding: {
                field_0: "name",
                field_1: "birthDate",
                img_0: "img"
            },
            ...(enableSearch ? { searchFields: ["name"] } : {}),
            scaleInitial: FamilyTree.match.boundary,
            mouseScrool: FamilyTree.action.zoom,
            exportPDF: {
                format: "A2",
                orientation: "landscape",
                margin: [20, 20, 20, 20]
            },
            toolbar: {
                zoom: true,
                fit: true,
                pdf: true,
                fullScreen: true
            }
        } as any);

        if (onNodeClick) {
           internalTreeRef.current.on('click', function(sender: any, args: any) {
               onNodeClick(args.node.id);
               return false;
           });
        }
        
        internalTreeRef.current.load(nodes);
        
        // Inject styles directly into SVG so export picks them up
        setTimeout(() => {
          const svg = treeRef.current?.querySelector('svg');
          if (svg && !svg.querySelector('#export-styles')) {
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.id = 'export-styles';
            style.innerHTML = `
              .female rect { fill: #FF0090 !important; stroke: #FF0090 !important; stroke-width: 2px !important; }
              .female text { fill: #ffffff !important; }
            `;
            svg.insertBefore(style, svg.firstChild);
          }
        }, 500);
        
      } catch (e) {
        console.error("FamilyTree initialization error", e);
      }

      return () => {
        if (internalTreeRef.current) {
          try {
            internalTreeRef.current.destroy();
          } catch (e) {}
          internalTreeRef.current = null;
        }
      };
    }, [members, marriages, onNodeClick, enableSearch]);

    return (
      <div className="w-full h-full border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative min-h-[600px]">
        <style>{`
          .female rect {
            fill: #FF0090 !important;
            stroke: #FF0090 !important;
            stroke-width: 2px !important;
          }
          .female text {
            fill: #ffffff !important;
          }
        `}</style>
        <div id="tree" ref={treeRef} className="w-full h-full"></div>

        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animation-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                 <h3 className="text-lg font-semibold text-slate-800">Pengaturan Ekspor PDF</h3>
                 <button onClick={() => setIsExportModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-6 text-left">
                 <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Ukuran Kertas</label>
                    <div className="grid grid-cols-3 gap-3">
                       {['A4', 'A3', 'A2', 'A1', 'A0'].map(fmt => (
                          <button 
                             key={fmt}
                             onClick={() => setExportFormat(fmt)}
                             className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${exportFormat === fmt ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                             {fmt}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Orientasi</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                          onClick={() => setExportOrientation('landscape')}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${exportOrientation === 'landscape' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          Landscape
                       </button>
                       <button 
                          onClick={() => setExportOrientation('portrait')}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${exportOrientation === 'portrait' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          Portrait
                       </button>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Warna</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                          onClick={() => setExportColorMode('color')}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${exportColorMode === 'color' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          Full Color
                       </button>
                       <button 
                          onClick={() => setExportColorMode('grayscale')}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${exportColorMode === 'grayscale' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                       >
                          Grayscale
                       </button>
                    </div>
                 </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                 <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                 >
                    Batal
                 </button>
                 <button 
                    onClick={handleDownloadPdf}
                    className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                 >
                    Unduh PDF
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

BalkanFamilyTree.displayName = 'BalkanFamilyTree';
export default BalkanFamilyTree;
