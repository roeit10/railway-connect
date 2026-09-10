#!/usr/bin/env node
/**
 * בדיקות חוצות-מערכות ל-railway-connect.
 *
 * מה שנבדק כאן רץ **בלי שום מפתח ובלי חשבון** — ולכן הוא יכול לרוץ ב-CI
 * על windows/macos/ubuntu ולתפוס את מה שנשבר בשקט:
 *
 *   1. ה-CLI מותקן והגרסה עוברת את שער 5.44.0
 *   2. `railway mcp install` קיים כפקודה
 *   3. ⭐ הפלט של `railway login --browserless` עדיין מכיל לינק שהרג'קס תופס
 *   4. doctor.sh רץ, ומחזיר NEXT: STEP 2 כשלא מחוברים
 *
 * בדיקה 3 היא הסיבה שהקובץ הזה קיים. אם Railway ישנו את פורמט הפלט,
 * הסקיל יפסיק להגיש לינק — והמשתמש יראה סוכן שנתקע בלי שגיאה.
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCTOR = join(ROOT, '.claude/skills/railway-connect/scripts/doctor.sh');
const MIN = [5, 44, 0];

let failed = 0;
const pass = (m) => console.log(`  ok   ${m}`);
const fail = (m, e) => { failed++; console.log(`  FAIL ${m}${e ? `\n       ${e}` : ''}`); };
const section = (m) => console.log(`\n${m}`);

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

// ---------- 1. ה-CLI והגרסה ----------
section('1. ה-CLI');
let version = null;
try {
  const out = sh('railway', ['--version']);
  const m = out.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`לא הצלחתי לקרוא גרסה מתוך: ${out.trim()}`);
  version = [+m[1], +m[2], +m[3]];
  pass(`railway ${version.join('.')}`);
} catch (e) {
  fail('ה-CLI לא זמין', e.message);
}

if (version) {
  const ge = version[0] > MIN[0] ||
    (version[0] === MIN[0] && (version[1] > MIN[1] ||
      (version[1] === MIN[1] && version[2] >= MIN[2])));
  ge ? pass(`גרסה >= ${MIN.join('.')}`)
     : fail(`גרסה ${version.join('.')} מתחת ל-${MIN.join('.')} — אין 'mcp install'`);
}

// ---------- 2. הפקודות שהסקיל נשען עליהן ----------
section('2. הפקודות קיימות');
for (const [args, label] of [
  [['mcp', 'install', '--help'], 'railway mcp install'],
  [['whoami', '--help'], 'railway whoami'],
  [['login', '--help'], 'railway login'],
]) {
  try { sh('railway', args); pass(label); }
  catch (e) { fail(`${label} לא קיימת`, (e.stderr || e.message).split('\n')[0]); }
}

try {
  const h = sh('railway', ['login', '--help']);
  h.includes('--browserless')
    ? pass('railway login תומך ב---browserless')
    : fail('הדגל --browserless נעלם — זרימת הלינק בסקיל תישבר');
} catch { /* נתפס למעלה */ }

// ---------- 3. ⭐ פרסור הלינק ----------
section('3. הלינק של ההתחברות');
const LINK_RE = /https:\/\/railway\.com\/activate\?user_code=[A-Za-z0-9-]+/;

const linkFound = await new Promise((resolve) => {
  let buf = '';
  let done = false;
  const p = spawn('railway', ['login', '--browserless'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const finish = (v) => { if (!done) { done = true; try { p.kill(); } catch {} resolve(v); } };
  const onData = (d) => { buf += d.toString(); if (LINK_RE.test(buf)) finish(buf.match(LINK_RE)[0]); };
  p.stdout.on('data', onData);
  p.stderr.on('data', onData);
  p.on('error', () => finish(null));
  setTimeout(() => finish(null), 25000);
});

if (linkFound) {
  pass(`הלינק נתפס ע"י הרג'קס: ${linkFound.replace(/user_code=.*/, 'user_code=…')}`);
  linkFound.includes('user_code=')
    ? pass('הקוד מוטמע בלינק — קליק אחד, בלי הקלדה')
    : fail('הלינק בלי user_code — המשתמש ייאלץ להקליד קוד');
} else {
  fail('לא נמצא לינק בפלט של `railway login --browserless`',
       'הפורמט השתנה, או שהפקודה לא הדפיסה כלום. references/auth.md צריך עדכון');
}

// ---------- 4. doctor.sh ----------
section('4. doctor.sh');
try {
  let out = '', code = 0;
  try { out = sh('bash', [DOCTOR]); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); code = e.status ?? 1; }

  out.includes('NEXT:')
    ? pass('מדפיס שורת NEXT')
    : fail('אין שורת NEXT — הסוכן לא ידע באיזה שלב הוא');

  // ב-CI אף פעם לא מחוברים, ולכן זו התוצאה הנכונה
  if (process.env.CI) {
    out.includes('NEXT: STEP 2')
      ? pass('בלי התחברות → NEXT: STEP 2')
      : fail('בלי התחברות ה-doctor לא הצביע על STEP 2', out.trim().split('\n').slice(-3).join(' | '));
    code === 1 ? pass('יוצא עם 1 כשחסר משהו') : fail(`יצא עם ${code}, ציפינו 1`);
  } else {
    pass(`רץ מקומית (NEXT: ${(out.match(/NEXT: (.+)/) || [, '?'])[1].trim()})`);
  }
} catch (e) {
  fail('doctor.sh לא רץ', e.message);
}

// ---------- סיכום ----------
console.log('\n' + '─'.repeat(58));
if (failed) { console.log(`${failed} בדיקות נכשלו`); process.exit(1); }
console.log('הכל עבר'); process.exit(0);
