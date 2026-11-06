'use client';
import type {CSSProperties,ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import CharacterArmory,{ProfessionLevels} from './character-armory';
import WowIcon,{roleIcons} from './wow-icon';
import {classPresentation} from './character-class';
import {characterColor} from '../lib/journey';

type Props={entry:any;ownerName:string;expanded:boolean;onToggle:()=>void;children?:ReactNode};
export default function CharacterCard({entry,ownerName,expanded,onToggle,children}:Props){
 const color=entry.data.color||characterColor(entry.id),level=Math.max(1,Math.min(60,entry.data.level||1));
 const {icon,position}=classPresentation(entry.data.class);
 const detailId='character-details-'+entry.id;
 return <article className="character-card" style={{'--character-color':color} as CSSProperties}>
  <button className="character-summary" aria-expanded={expanded} aria-controls={detailId} onClick={onToggle}>
   <span className="character-emblem" aria-hidden="true"><WowIcon name={icon} size={32}/></span>
   <span className="character-identity"><strong>{entry.title}</strong><span>{entry.data.class||'Klasse ikke valgt'} · {entry.data.combatRole&&<WowIcon name={roleIcons[entry.data.combatRole]} size={15}/>} {entry.data.combatRole||'Rolle ikke valgt'}</span></span>
   <span className="character-level"><strong>{level}</strong><span>LEVEL</span></span>
   <ChevronDown className="character-chevron" size={15}/>
  </button>
  <div className="character-progress" aria-hidden="true"><span style={{width:`${level/60*100}%`}}/></div>
  <div className="character-caption"><span>{ownerName}</span><span>{entry.data.role==='alt'?'Alt':'Main'} · <span className="character-detail-hint">{expanded?'Færre detaljer':'Vis detaljer'}</span></span></div>
  <p className="character-sync-status">{entry.data.flockSync?.importedAt?<><span className="sync-status-dot"/>Sidst synkroniseret: <time dateTime={entry.data.flockSync.importedAt}>{new Date(entry.data.flockSync.importedAt).toLocaleString('da-DK',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Copenhagen'})}</time></>:<>Ikke synkroniseret endnu</>}</p>
  <div id={detailId} hidden={!expanded} className="character-details">
   <div className="character-banner" style={{backgroundPosition:position}}>
    <div className="character-banner-content"><span className="character-banner-icon" aria-hidden="true"><WowIcon name={icon} size={50}/></span><span><small>{entry.data.role==='alt'?'DIT ANDET EVENTYR':'KLAR TIL NÆSTE EVENTYR'}</small><strong>{entry.title}</strong><span>{entry.data.class||'Eventyrer'} · {entry.data.combatRole||'Rolle ikke valgt'} · Level {level}</span></span></div>
    <span className="character-banner-owner">{ownerName}</span>
   </div>
   {entry.data.flockSync?.capturedAt&&<p className="small">Seneste scanning i spillet: <time dateTime={new Date(entry.data.flockSync.capturedAt*1000).toISOString()}>{new Date(entry.data.flockSync.capturedAt*1000).toLocaleString('da-DK',{timeZone:'Europe/Copenhagen'})}</time></p>}
   <div className="character-journey-facts">
    {entry.data.goldCopper!==undefined&&<div><small>Guld</small><strong><span className="coin-gold">{Math.floor(entry.data.goldCopper/10000).toLocaleString('da-DK')} g</span> · {Math.floor(entry.data.goldCopper%10000/100)} s · {entry.data.goldCopper%100} k</strong></div>}
    {entry.data.xp!==undefined&&entry.data.xpMax>0&&<div><small>XP til næste level</small><strong>{entry.data.xp.toLocaleString('da-DK')} / {entry.data.xpMax.toLocaleString('da-DK')}</strong><progress aria-label="XP til næste level" max={entry.data.xpMax} value={entry.data.xp}/></div>}
    {entry.data.location&&<div><small>Senest registrerede sted</small><strong>{[entry.data.location.zone,entry.data.location.subZone].filter(Boolean).join(' · ')||'Ukendt zone'}</strong>{entry.data.location.x!==undefined&&<span>{(entry.data.location.x*100).toFixed(1)}, {(entry.data.location.y*100).toFixed(1)}</span>}<time className="small" dateTime={new Date(entry.data.location.updatedAt*1000).toISOString()}>{new Date(entry.data.location.updatedAt*1000).toLocaleString('da-DK',{timeZone:'Europe/Copenhagen'})}</time></div>}
   </div>
   {entry.body&&<p className="body-text">{entry.body}</p>}
   <dl><div><dt>Professions</dt><dd>{entry.data.professions?.length?<ProfessionLevels names={entry.data.professions} skills={entry.data.professionSkills}/>: 'Ikke valgt endnu'}</dd></div><div><dt>Sub-professions</dt><dd>{entry.data.subProfessions?.length?<ProfessionLevels names={entry.data.subProfessions} skills={entry.data.professionSkills}/>: 'Ikke valgt endnu'}</dd></div></dl>
   {expanded&&<CharacterArmory gear={entry.data.gear} name={entry.title} characterClass={entry.data.class||'Eventyrer'}/>}
   {children}
  </div>
 </article>;
}
