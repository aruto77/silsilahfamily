'use client';

import React, { useEffect, useRef } from 'react';
// @ts-ignore
import FamilyTree from '@balkangraph/familytree.js';

interface Member {
  id: string;
  full_name: string;
  father_id: string | null;
  mother_id: string | null;
  gender: string;
  birth_date: string | null;
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

export default function BalkanFamilyTree({ members, marriages, onNodeClick }: BalkanFamilyTreeProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const internalTreeRef = useRef<any>(null);

  useEffect(() => {
    if (!treeRef.current) return;

    // Build the nodes array according to Balkan FamilyTree JS expectations
    const nodes = members.map(m => {
      const pids: string[] = [];
      // Find all marriages involving this member to get their partners
      marriages.forEach(marriage => {
        // Only add partner to pids if the partner is ALSO in the current members array!
        if (marriage.husband_id === m.id && members.some(x => x.id === marriage.wife_id)) pids.push(marriage.wife_id);
        if (marriage.wife_id === m.id && members.some(x => x.id === marriage.husband_id)) pids.push(marriage.husband_id);
      });

      return {
        id: m.id,
        pids: pids.length > 0 ? pids : undefined,
        // Only include fid/mid if the parent is ALSO in the current members array!
        mid: m.mother_id && members.some(x => x.id === m.mother_id) ? m.mother_id : undefined,
        fid: m.father_id && members.some(x => x.id === m.father_id) ? m.father_id : undefined,
        name: m.full_name,
        gender: m.gender,
        birthDate: m.birth_date ? new Date(m.birth_date).getFullYear().toString() : '',
        img: m.photo_url || ''
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
             // Ensure we don't trigger default FamilyTree profile modal
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
  }, [members, marriages, onNodeClick]);

  return (
    <div className="w-full h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
      <div id="tree" ref={treeRef} className="w-full h-full"></div>
    </div>
  );
}
