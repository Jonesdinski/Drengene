import {test,expect} from 'vitest';
import {tooltipText} from '../lib/item-display';
import {linkName,linkColor,itemQuality,qualityNames} from '../lib/armory';
test('item details are plain text and quality/name come from the captured link',()=>{expect(tooltipText('<b>Sword &amp; Shield</b><br>+5 Strength<script>alert(1)</script>')).toBe('Sword & Shield\n+5 Strength');const link='|cffa335ee|Hitem:123:0|h[Min økse]|h|r';expect(linkName(link)).toBe('Min økse');expect(linkColor(link)).toBe('#a335ee');});

test('uncommon green wins over external quality; uncoloured links use lookup quality',()=>{const green='|cff1eff00|Hitem:123:0|h[Grønne bukser]|h|r';expect(linkColor(green,4)).toBe('#1eff00');expect(itemQuality(green,4)).toBe(2);expect(qualityNames[itemQuality(green)!]).toBe('Uncommon');expect(linkColor('item:123',2)).toBe('#1eff00');expect(itemQuality('item:123',2)).toBe(2);expect(linkColor('item:123',99)).toBe('#d3c6b1');expect(linkColor(' |cFF0070DD|Hitem:1|h[Test]|h|r')).toBe('#0070DD');});
