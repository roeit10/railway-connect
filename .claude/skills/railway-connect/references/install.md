# התקנת ה-CLI — מטריצת מערכות

**מזהים את המערכת ולא שואלים את המשתמש.** `uname -s` ובדיקה של `$OS` נותנים
את התשובה, ובעל עסק לא אמור לדעת מה זה WSL.

---

## הזיהוי

```bash
case "$(uname -s 2>/dev/null)" in
  Darwin) OS=mac ;;
  Linux)  grep -qi microsoft /proc/version 2>/dev/null && OS=wsl || OS=linux ;;
  *)      OS=windows ;;
esac
```

## הפקודות

| OS | פקודה | הערה |
|---|---|---|
| `mac` | `curl -fsSL agents.railway.com \| sh` | אם `brew` קיים, `brew install railway` נקי יותר ומתעדכן עם `brew upgrade` |
| `linux` · `wsl` | `curl -fsSL agents.railway.com \| sh` | |
| `windows` | `npm i -g @railway/cli` | דורש Node. אין Node → מפנים ל-nodejs.org, זו התקנה שהמשתמש עושה |

> **למה לא scoop/winget בווינדוס:** הם דורשים התקנה מקדימה של מנהל החבילות
> עצמו. `npm` קיים כבר אצל רוב מי שהתקין Claude Code, ולכן הוא הנתיב הקצר.

---

## שער הגרסה — 5.44.0

```bash
railway --version   # "railway 5.49.6"
```

הפקודות `railway mcp install` ו-`railway setup agent` **לא קיימות לפני 5.44.0**.
בגרסה ישנה זה נראה כמו `error: unrecognized subcommand`, וזה מבלבל.

**משדרגים באותה דרך שבה הותקן:**

| הותקן דרך | שדרוג |
|---|---|
| הסקריפט | להריץ אותו שוב — הוא דורס |
| brew | `brew upgrade railway` |
| npm | `npm i -g @railway/cli@latest` |

---

## אחרי ההתקנה — ה-PATH

**התקלה הנפוצה ביותר:** ההתקנה הצליחה, ו-`railway` עדיין
`command not found` באותו טרמינל, כי ה-PATH נטען בפתיחת ה-shell.

מה עושים, בסדר הזה:

1. לנסות את הנתיבים המוכרים ישירות:
   `/opt/homebrew/bin/railway` · `/usr/local/bin/railway` · `~/.railway/bin/railway`
2. עבד? **ממשיכים איתו** לאורך הריצה ואומרים למשתמש שיפתח טרמינל חדש
   בהמשך. לא עוצרים בגלל PATH
3. לא עבד בשום נתיב → אומרים למשתמש לפתוח טרמינל חדש ולהריץ `railway --version`

> ⛔ **לא נוגעים ב-`.zshrc` / `.bashrc` של המשתמש.** לא מוסיפים export, לא
> מסדרים לו את ה-PATH. זו קונפיגורציה אישית שלו, והסקיל הזה לא הבעלים שלה.
