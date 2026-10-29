'use client';
import {useState} from 'react';
import {Flame,TrendingUp,Image as ImageIcon,Swords,CalendarDays,MessageCircle,ScrollText,ArrowUpRight} from 'lucide-react';
import {activityItems} from '../lib/activity';
export default function ActivityFeed({journal,entries,onJournal}:{journal:any[];entries:any[];onJournal:()=>void}){
 const [filter,setFilter]=useState('all');
 const items=activityItems(journal,entries).filter(j=>filter==='all'||j.category===filter).slice(0,6);
 return <section className="panel activity-panel" aria-labelledby="activity-title"><div className="panel-head"><div><span className="eyebrow">PARTYETS SENESTE ØJEBLIKKE</span><h3 id="activity-title"><Flame size={17}/>Sidst ved bålet</h3></div><button className="text-btn" onClick={onJournal}>Hele journalen <ArrowUpRight size={14}/></button></div>
 <div className="activity-filters" aria-label="Filtrér aktivitet">{[['all','Alt'],['level','Levelstigninger'],['shared','Delte opslag']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
 <div className="activity-list" aria-live="polite">{items.length?items.map(item=>{const Icon=item.category==='level'?TrendingUp:item.kind==='screenshot'?ImageIcon:item.kind==='wanted'?Swords:item.kind==='event'?CalendarDays:item.kind==='message'?MessageCircle:ScrollText;return <article className={'activity-item activity-'+item.category} key={item.id}><span className="activity-icon" aria-hidden="true"><Icon size={18}/></span><div className="activity-copy"><span className="activity-actor">{item.name}</span><p>{item.message}</p><time dateTime={item.created}>{new Date(item.created).toLocaleString('da-DK',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Copenhagen'})}</time></div>{item.image&&<a className="activity-thumbnail" href={'/api/media/'+item.image} target="_blank" rel="noreferrer"><img src={'/api/media/'+item.image} alt={'Screenshot: '+item.message.slice(9)} loading="lazy"/></a>}</article>}):<p className="activity-empty">{filter==='all'?'Her samler vi jeres næste levelstigninger og historier.':'Ingen registrerede hændelser i denne kategori endnu.'}</p>}</div>
 </section>;
}
