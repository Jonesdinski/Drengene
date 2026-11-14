import {connection} from '../../../../lib/database';
import {companionData, companionLua, deviceOwner} from '../../../../lib/companion';
import {failure} from '../../../server';

// Read-only data for the in-game addon, fetched by the desktop sync app.
// Accepts only the device's scoped bearer key, never browser cookies.
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    if (!/^Bearer ljbs1_[a-f0-9]{64}$/.test(auth)) throw Error('401');
    const data = await connection().begin(async tx => {
      const owner = await deviceOwner(tx, auth.slice(7));
      return companionData(tx, owner);
    });
    return new Response(companionLua(data), {
      headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'},
    });
  } catch (e) {
    return failure(e);
  }
}
