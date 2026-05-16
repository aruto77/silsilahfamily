'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
// @ts-ignore
import FamilyTree from '@balkangraph/familytree.js';

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
}

export interface BalkanFamilyTreeRef {
  exportPdf: () => void;
}

const BalkanFamilyTree = forwardRef<BalkanFamilyTreeRef, BalkanFamilyTreeProps>(
  ({ members, marriages, onNodeClick }, ref) => {
    const treeRef = useRef<HTMLDivElement>(null);
    const internalTreeRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      exportPdf: () => {
        if (internalTreeRef.current) {
          internalTreeRef.current.exportPDF({
            format: 'A4',
            orientation: 'Landscape',
            padding: 50
          });
        }
      }
    }));

    useEffect(() => {
      if (!treeRef.current) return;

      const nodes = members.map(m => {
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
            nodeBinding: {
                field_0: "name",
                field_1: "birthDate",
                img_0: "img"
            },
            scaleInitial: FamilyTree.match.boundary,
            mouseScrool: FamilyTree.action.zoom,
            toolbar: {
                zoom: true,
                fit: true
            }
        });

        if (onNodeClick) {
           internalTreeRef.current.on('click', function(sender: any, args: any) {
               onNodeClick(args.node.id);
               return false;
           });
        }
        
        internalTreeRef.current.load(nodes);

        // Timeout to fit again to solve zooming issue where it only shows one family
        setTimeout(() => {
          if (internalTreeRef.current) {
             internalTreeRef.current.fit();
          }
        }, 300);
        
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
    }, [members, marriages, onNodeClick]);

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
      </div>
    );
  }
);

BalkanFamilyTree.displayName = 'BalkanFamilyTree';
export default BalkanFamilyTree;
