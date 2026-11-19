import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const branches = [
  ['kandivali-east', 'Kandivali East'],
  ['kandivali-west', 'Kandivali West'],
  ['borivali-west', 'Borivali West'],
];
// Verified against 26b649eb03be69be1d6f0afe1126d9f77c22982b:index.html
// and the three original branch LocalBusiness offer catalogues.
const expected = [
  ['Daily', '₹199', '1 day'],
  ['Weekly', '₹999', '7 days'],
  ['Fortnightly', '₹1,799', '14 days'],
  ['Monthly', '₹2,999', '30 days'],
  ['Weekend', '₹1,499', 'Sat–Sun, including Saturday overnight'],
  ['Any 30 Days', '₹4,799', '30 selectable days within 180 days'],
  ['Quarterly', '₹7,999', '90 days'],
  ['Half-Yearly', '₹14,999', '180 days'],
  ['Yearly', '₹24,999', '360 days'],
];
function endDiv(html, start) {
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(html));) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return tags.lastIndex;
  }
  throw new Error('Unbalanced catalogue markup');
}
function catalogue(html) {
  const start = html.indexOf('<div class="plans-grid plans-panel branch-membership-grid" data-panel="lib">');
  assert(start >= 0, 'Library catalogue must exist');
  const panel = html.slice(start, endDiv(html, start));
  return [...panel.matchAll(/<div class="plan-card(?: hot)?">/g)].map(match => panel.slice(match.index, endDiv(panel, match.index)));
}
function text(html) { return html.replace(/<[^>]*>/g, '').trim(); }
for (const [slug, branch] of branches) {
  test(`${branch}: exactly nine originally published plans in order`, async t => {
    const html = await readFile(new URL(`branches/${slug}.html`, root), 'utf8');
    const cards = catalogue(html);
    assert.equal(cards.length, 9);
    assert.deepEqual(cards.map(card => card.match(/class="plan-nm">([^<]+)</)[1]), expected.map(plan => plan[0]));
    for (const [index, [name, price, duration]] of expected.entries()) {
      await t.test(`${name}: price, duration, access and enquiry target`, () => {
        const card = cards[index];
        assert.equal(text(card.match(/<div class="plan-pr">([\s\S]*?)<\/div>/)[1]), price);
        assert.equal(text(card.match(/<div class="plan-dur">([\s\S]*?)<\/div>/)[1]).replace('*', ''), duration);
        assert.match(card, /document\.getElementById\('branch-form'\)\.scrollIntoView/);
        if (['Daily', 'Any 30 Days'].includes(name)) assert.match(card, /6:30 AM–11 PM/);
        else if (name !== 'Weekend') assert.match(card, /24×7 study access/);
        if (name === 'Any 30 Days') assert.match(card, /selected branch only/);
        if (['Monthly', 'Half-Yearly'].includes(name)) assert.match(card, /class="plan-card hot"/);
      });
    }
  });
  test(`${branch}: both existing enquiry forms map every library plan and branch`, async () => {
    const html = await readFile(new URL(`branches/${slug}.html`, root), 'utf8');
    for (const id of ['form-branch-quick', 'form-branch']) {
      const form = html.match(new RegExp(`<form[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/form>`))?.[0];
      assert(form, `${id} exists`);
      assert(form.includes(`name="branch" type="hidden" value="${branch}"`));
      for (const [name] of expected) {
        assert(form.includes(id === 'form-branch-quick' ? `<option>${name}</option>` : `data-val="${name}"`), `${id}: ${name}`);
      }
    }
    assert(html.includes('data-panel="cow"'));
    assert(html.includes('<div class="plan-nm">Daily Desk</div>'));
    assert(html.includes('<div class="plan-nm">Monthly Desk</div>'));
  });
}
test('three branch catalogues contain exactly 27 library cards', async () => {
  const counts = await Promise.all(branches.map(async ([slug]) => catalogue(await readFile(new URL(`branches/${slug}.html`, root), 'utf8')).length));
  assert.equal(counts.reduce((a, b) => a + b, 0), 27);
});
test('homepage Fortnightly display follows the verified original 14-day term', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<div class="plan-nm">Fortnightly<\/div>[\s\S]*?<div class="plan-pr">₹1,799 <span>\/2 weeks<\/span><\/div>\s*<div class="plan-days">14 Days<\/div>/);
});
