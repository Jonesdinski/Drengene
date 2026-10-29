'use client';
import type {CSSProperties,ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {classPresentation} from './character-class';
import {characterColor} from '../lib/journey';

type Props={entry:any;ownerName:string;expanded:boolean;onToggle:()=>void;children?:ReactNode};
export default function CharacterCard({entry,ownerName,expanded,onToggle,children}:Props){
 const color=entry.data.color||characterColor(entry.id),level=Math.max(1,Math.min(60,entry.data.level||1));
 const {Icon,position}=classPresentation(entry.data.class);
 const detailId='character-details-'+entry.id;
 return <article className="character-card" style={{'--character-color':color} as CSSProperties}>
  <button className="character-summary" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}>
   <span className="character-emblem" aria-hidden="true"><Icon size={18}/></span>
   <span className="character-identity"><strong>{entry.title}</strong><span>{entry.data.class||'Klasse ikke valgt'} · {entry.data.combatRole||'Rolle ikke valgt'}</span></span>
   <span className="character-level"><strong>{level}</strong><span>LEVEL</span></span>
   <ChevronDown className="character-chevron" size={15}/>
  </button>
  <div className="character-progress" aria-hidden="true"><span style={{width:`${level/60*100}%`}}/></div>
  <div className="character-caption"><span>{ownerName}</span><span>{entry.data.role==='alt'?'Alt':'Main'} · <span className="character-detail-hint">{expanded?'Færre detaljer':'Vis detaljer'}</span></span></div>
  <div id={detailId} hidden={!expanded} className="character-details">
   <div className="character-banner" style={{backgroundPosition:position}}>
    <div className="character-banner-content"><span className="character-banner-icon" aria-hidden="true"><Icon size={31}/></span><span><small>{entry.data.role==='alt'?'DIT ANDET EVENTYR':'KLAR TIL NÆSTE EVENTYR'}</small><strong>{entry.title}</strong><span>{entry.data.class||'Eventyrer'} · {entry.data.combatRole||'Rolle ikke valgt'} · Level {level}</span></span></div>
    <span className="character-banner-owner">{ownerName}</span>
   </div>
   {entry.body&&<p className="body-text">{entry.body}</p>}
   <dl><div><dt>Professions</dt><dd>{entry.data.professions?.join(' · ')||'Ikke valgt endnu'}</dd></div><div><dt>Sub-professions</dt><dd>{entry.data.subProfessions?.join(' · ')||'Ikke valgt endnu'}</dd></div></dl>
   {children}
  </div>
 </article>;
}
