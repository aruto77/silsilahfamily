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
        if (marriage.husband_id === m.id) pids.push(marriage.wife_id);
        if (marriage.wife_id === m.id) pids.push(marriage.husband_id);
      });

      return {
        id: m.id,
        pids: pids.length > 0 ? pids : undefined,
        mid: m.mother_id || undefined,
        fid: m.father_id || undefined,
        name: m.full_name,
        gender: m.gender,
        birthDate: m.birth_date ? new Date(m.birth_date).getFullYear().toString() : ''
      };
    });

    if (!internalTreeRef.current) {
      try {
        internalTreeRef.current = new FamilyTree(treeRef.current, {
            nodeBinding: {
                field_0: "name",
                field_1: "birthDate"
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
      } catch (e) {
        console.error("FamilyTree initialization error", e);
      }
    }

    if (internalTreeRef.current) {
       try {
         internalTreeRef.current.load(nodes);
       } catch (e) {
         console.error("FamilyTree load error", e);
       }
    }

    // Do not call destroy on unmount if it's causing resize bugs during HMR.
    // The DOM node will be cleaned up by React anyway.
  }, [members, marriages]);

  return (
    <div className="w-full h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
      <div id="tree" ref={treeRef} className="w-full h-full"></div>
    </div>
  );
}
