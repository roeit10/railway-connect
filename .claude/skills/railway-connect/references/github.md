# גיטהאב — מתי צריך, ואיך

**גיטהאב הוא לא תנאי לחיבור ל-Railway.** אפשר לפרוס תיקייה מקומית בלעדיו.
הוא נדרש לדבר אחד: **פריסה אוטומטית מריפו** — כלומר `git push` שפורס.

לכן הסקיל **מציע** אותו ולא **דורש** אותו, ו-`NEXT: READY` נסגר גם בלעדיו.

---

## מתי זה הופך לחובה

| מה המשתמש רוצה | צריך גיטהאב? |
|---|---|
| "תפרוס לי את התיקייה הזאת" | ❌ `railway up` מעלה את התוכן ישירות |
| **"שכל `git push` יפרוס"** | ✅ חיבור ריפו לשירות |
| שימוש בתבנית (`Use this template`) | ✅ |

**מלכודת 1 ב-`deploy.md` לא ניתנת לפתרון בלי גיטהאב.** אם המשתמש מגיע לשם
ו-`gh` לא מחובר — עוצרים ומריצים את מה שלמטה, ורק אז ממשיכים.

---

## ההתקנה

| מערכת | פקודה |
|---|---|
| macOS | `brew install gh` |
| Windows | `winget install --id GitHub.cli` |
| Linux / WSL | לפי ההוראות ב-`cli.github.com` (משתנה בין הפצות) |

---

## ההתחברות

```bash
gh auth login --hostname github.com --git-protocol https --web --scopes "repo,workflow" > "$OUT" 2>&1 &
```

**ברקע**, כמו ב-Railway. הפקודה ממתינה לאישור ולא חוזרת.

### הפלט בפועל — אומת 10.9.2026, פלט לצינור

```
! First copy your one-time code: F1A3-97DA
Open this URL to continue in your web browser: https://github.com/login/device
```

### ⚠️ ההבדל מ-Railway — שני צעדים, לא אחד

ב-Railway הקוד מוטמע בלינק, ולכן זה קליק אחד.
**בגיטהאב הקוד נפרד מה-URL**, והמשתמש חייב להעתיק אותו ולהדביק בדף.

**אל תגיש את זה כמו את הלינק של Railway.** ההגשה הנכונה:

```
🔢 העתק את הקוד:   F1A3-97DA
🔗 ואז פתח:        https://github.com/login/device

תדביק שם את הקוד ותאשר. אני בודק לבד מתי זה נסגר.
```

**הקוד ראשון והלינק שני** — זה סדר הפעולות בפועל, ומי שפותח את הדף לפני
שהעתיק את הקוד יצטרך לחזור.

### הפרסור

```bash
grep -o 'one-time code: [A-Z0-9-]*' "$OUT" | sed 's/.*: //'
grep -o 'https://github.com/login/device' "$OUT"
```

לא נמצא קוד → **אל תמציא.** אומרים למשתמש להריץ `gh auth login --web`
בטרמינל שלו.

### ההמתנה

```bash
for i in $(seq 1 40); do
  gh auth status >/dev/null 2>&1 && break
  sleep 3
done
gh auth status
```

---

## למה `--scopes "repo,workflow"`

`repo` לבד מספיק כדי לחבר ריפו ל-Railway. **`workflow` נדרש כדי לדחוף קבצים
תחת `.github/workflows/`** — ובלעדיו `git push` נדחה בהודעה
`refusing to allow an OAuth App to create or update workflow ... without workflow scope`.

זו שגיאה שנראית כמו בעיית הרשאות בריפו ואינה. **מבקשים את שני ה-scopes
מראש**, כי הוספה בדיעבד דורשת התחברות נוספת.

משתמש שכבר מחובר בלי `workflow`:
```bash
gh auth refresh -h github.com -s workflow
```

---

## ⛔ מה לא עושים

1. **לא מריצים `gh auth logout`.** אותו היגיון כמו ב-Railway — המשתמש מריץ
   בעצמו אם הוא רוצה להחליף חשבון.
2. **לא מבקשים טוקן בצ'אט**, ולא קוראים את `~/.config/gh/hosts.yml`.
3. **לא בוחרים חשבון במקום המשתמש.** יש כמה חשבונות `gh`? מציגים
   `gh auth status`, שואלים איזה, ולא מניחים.
