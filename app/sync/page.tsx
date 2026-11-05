import {requireUser} from '../auth';
import SyncPanel from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'Windows-sync · Lejrbalet'};
export default async function SyncPage(){await requireUser('/sync');let macReady=false;try{const r=await fetch('https://api.github.com/repos/Jonesdinski/Drengene/releases/tags/mac-sync-v0.2.0',{headers:{Accept:'application/vnd.github+json'},next:{revalidate:300},signal:AbortSignal.timeout(4000)});if(r.ok){const release=await r.json();macReady=!release.draft&&Array.isArray(release.assets)&&release.assets.some((a:{name:string;state:string})=>a.name==='LejrbaletSync-Mac.dmg'&&a.state==='uploaded');}}catch{}return <SyncPanel macReady={macReady}/>;}
