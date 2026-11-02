import {requireUser} from '../auth';
import ImportPanel from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'Importér karakterer · Lejrbalet'};
export default async function ImportPage(){await requireUser('/import');return <ImportPanel/>;}
