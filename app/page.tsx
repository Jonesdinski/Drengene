import Hub from './hub';
import {getUser,signInPath,signOutPath} from './auth';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getUser();return <Hub signedIn={!!u} signIn={signInPath('/')} signOut={signOutPath()}/>;}
