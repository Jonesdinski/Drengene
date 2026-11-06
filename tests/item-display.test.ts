import {test,expect} from 'vitest';
import {tooltipText} from '../lib/item-display';
import {linkName,linkColor} from '../lib/armory';
test('item details are plain text and quality/name come from the captured link',()=>{expect(tooltipText('<b>Sword &amp; Shield</b><br>+5 Strength<script>alert(1)</script>')).toBe('Sword & Shield\n+5 Strength');const link='|cffa335ee|Hitem:123:0|h[Min økse]|h|r';expect(linkName(link)).toBe('Min økse');expect(linkColor(link)).toBe('#a335ee');});
