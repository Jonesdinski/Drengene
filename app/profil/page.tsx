import Hub from '../hub';
import {requireUser,signInPath,signOutPath} from '../auth';
export const dynamic='force-dynamic';
export default async function Profile(){await requireUser('/profil');return <Hub signedIn={true} signIn={signInPath('/profil')} signOut={signOutPath()} initialTab="Min profil"/>;}
