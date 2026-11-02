import {requireUser} from '../auth';
import SyncPanel from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'Windows-sync · Lejrbalet'};
export default async function SyncPage(){await requireUser('/sync');return <SyncPanel/>;}
