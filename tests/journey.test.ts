import {expect,test} from 'vitest';
import {characterColor,characterPath,levelPoint,route} from '../lib/journey';
test('journey clamps levels, reaches exact endpoints and interpolates intermediate progress',()=>{
 expect(levelPoint(1)).toEqual({x:route[0].x,y:route[0].y});
 expect(levelPoint(60)).toEqual({x:route.at(-1)!.x,y:route.at(-1)!.y});
 expect(levelPoint(100)).toEqual(levelPoint(60));expect(levelPoint(-5)).toEqual(levelPoint(1));
 for(let l=1;l<=60;l++){const p=levelPoint(l);expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(100);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(100);expect(characterPath(l)).not.toContain('NaN');}
 expect(characterPath(30)).toContain(' C ');expect(characterPath(1)).not.toContain(' C ');
 expect(levelPoint(2)).not.toEqual(levelPoint(1));
});
test('character colours are stable across refreshes',()=>{expect(characterColor('character-a')).toBe(characterColor('character-a'));expect(characterColor('character-a')).not.toBe(characterColor('character-b'));});
