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
  enableSearch?: boolean;
}

export interface BalkanFamilyTreeRef {
  exportPdf: () => void;
}

const BalkanFamilyTree = forwardRef<BalkanFamilyTreeRef, BalkanFamilyTreeProps>(
  ({ members, marriages, onNodeClick, enableSearch = true }, ref) => {
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
      </div>
    );
  }
);

BalkanFamilyTree.displayName = 'BalkanFamilyTree';
export default BalkanFamilyTree;
