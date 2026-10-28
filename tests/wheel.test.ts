import {expect,test} from 'vitest';
import {landingRotation} from '../lib/wheel';
test('every winner lands at the fixed top pointer, always moving forward across repeated spins',()=>{
 let current=0;
 for(let count=2;count<=12;count++)for(let index=0;index<count;index++){
  const next=landingRotation(current,index,count);
  expect(next-current).toBeGreaterThanOrEqual(1800);
  expect(next-current).toBeLessThan(2160);
  const atPointer=((360-next%360)%360)/(360/count);
  expect(atPointer).toBeCloseTo(index+.5,8);
  current=next;
 }
});
