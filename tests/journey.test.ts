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

import {journeyProgress} from '../lib/journey-progress';
test('records only newly crossed level milestones and keeps original reached timestamps',()=>{
 const a=journeyProgress({level:9},{level:21},'2026-10-29T10:00:00Z');
 expect(a.journeyMilestones).toEqual({level10:'2026-10-29T10:00:00Z',level20:'2026-10-29T10:00:00Z'});
 const b=journeyProgress(a,{...a,level:30},'2026-10-29T11:00:00Z');expect(b.journeyMilestones.level10).toBe(a.journeyMilestones.level10);expect(b.journeyMilestones.level30).toBe('2026-10-29T11:00:00Z');
 expect(journeyProgress({level:40},{level:41},'now').journeyMilestones).toEqual({});
});
