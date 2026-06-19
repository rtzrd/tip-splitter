import { chromium } from 'playwright';

const url = 'file:///D:/Workspaces/tip-splitter/index.html';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

await page.goto(url);

const $ = (id) => page.locator('#' + id).innerText();
let pass = 0, fail = 0;
const check = (name, cond, detail='') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  cond ? pass++ : fail++;
};

// --- Criterion 1: bill=100, tip=20%, people=4 ---
await page.fill('#bill', '100');
await page.click('.tip-btn[data-tip="20"]');
await page.fill('#people', '4');

const tipTotal   = await $('tipTotal');
const grandTotal = await $('grandTotal');
const tipPer     = await $('tipPerPerson');
const amtPer     = await $('perPersonBlock');
const tipPct     = await $('tipPctVal');

check('C1 tip per person = $5.00', tipPer === '$5.00', tipPer);
check('C1 amount per person = $30.00', amtPer === '$30.00', amtPer);
check('C1 tip total = $20.00', tipTotal === '$20.00', tipTotal);
check('C1 grand total = $120.00', grandTotal === '$120.00', grandTotal);
check('C1 tip % = 20%', tipPct === '20%', tipPct);

// --- Criterion 2: change people live updates everything, no reload ---
await page.fill('#people', '2');
const amtPer2 = await $('perPersonBlock');
check('C2 people=2 -> amount per person updates to $60.00', amtPer2 === '$60.00', amtPer2);
const tipPer2 = await $('tipPerPerson');
check('C2 people=2 -> tip per person updates to $10.00', tipPer2 === '$10.00', tipPer2);

// --- Criterion 4: 0 people and empty people -> no NaN, no crash ---
await page.fill('#people', '0');
const amt0 = await $('perPersonBlock'), tip0 = await $('tipPerPerson');
check('C4 people=0 no NaN (amount)', !/NaN/i.test(amt0) && amt0 === '$0.00', amt0);
check('C4 people=0 no NaN (tip)', !/NaN/i.test(tip0), tip0);

await page.fill('#people', '');
const amtE = await $('perPersonBlock');
check('C4 empty people no NaN', !/NaN/i.test(amtE) && amtE === '$0.00', amtE);

// negative bill
await page.fill('#bill', '-50');
const amtNeg = await page.locator('#perPersonBlock').innerText();
check('C4 negative bill no NaN', !/NaN/i.test(amtNeg), amtNeg);

// full page never shows NaN
const body = await page.locator('body').innerText();
check('C4 no "NaN" anywhere on page', !/NaN/.test(body));
check('C4 no JS errors thrown', errors.length === 0, errors.join(' | '));

// --- Criterion 5: all four values visible simultaneously ---
await page.fill('#bill', '100');
await page.click('.tip-btn[data-tip="20"]');
await page.fill('#people', '4');
const vis = async (id) => page.locator('#' + id).isVisible();
check('C5 tip total visible', await vis('tipTotal'));
check('C5 grand total visible', await vis('grandTotal'));
check('C5 amount per person visible', await vis('perPersonBlock'));
check('C5 tip % visible', await vis('tipPctVal'));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
await browser.close();
process.exit(fail ? 1 : 0);
