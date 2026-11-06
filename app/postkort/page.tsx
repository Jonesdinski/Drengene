import {requireUser} from '../auth';
import Panel from './panel';
export const dynamic='force-dynamic';
export default async function Page(){await requireUser('/postkort');return <Panel/>;}
