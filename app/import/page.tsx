import {requireUser} from '../auth';
import ImportPanel from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'Importér karakterer · Lejrbalet'};
export default async function ImportPage({searchParams}:{searchParams:Promise<{source?:string}>}){await requireUser('/import');const q=await searchParams;return <ImportPanel fromApp={q.source==='app'}/>;}
