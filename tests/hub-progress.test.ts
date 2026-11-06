import {test,expect} from 'vitest';
import {fractionalLevel,postcardWeek} from '../lib/hub-progress';
test('map uses within-level XP and never promotes level 60 or divides by zero',()=>{expect(fractionalLevel({level:24,xp:800,xpMax:1000})).toBe(24.8);expect(fractionalLevel({level:60,xp:500,xpMax:1000})).toBe(60);expect(fractionalLevel({level:20,xp:1,xpMax:0})).toBe(20);expect(fractionalLevel({level:10,xp:-4,xpMax:100})).toBe(10);});
test('weekly idempotency key is stable through Sunday and changes Monday',()=>{expect(postcardWeek(new Date('2026-11-08T23:59:59Z'))).toBe('2026-11-02');expect(postcardWeek(new Date('2026-11-09T00:00:00Z'))).toBe('2026-11-09');});
