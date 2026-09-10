#!/usr/bin/env bash
# בדיקת מוכנות לחיבור Railway.
#
# מקור אמת אחד. כל שלב ב-SKILL.md נסגר בהרצה של הסקריפט הזה ולא בהצהרה
# של המשתמש. הסקריפט מסתיים בשורת NEXT שאומרת באיזה STEP להתחיל, כדי
# שההחלטה לא תהיה של הסוכן.
#
#   bash scripts/doctor.sh
#
# יציאה 0 = הכל מחובר. יציאה 1 = חסר משהו, ושורת NEXT אומרת מה.

set -uo pipefail

MIN_VERSION="5.44.0"
missing=()

g() { printf '\033[32m✅\033[0m %s\n' "$1"; }
r() { printf '\033[31m❌\033[0m %s\n' "$1"; }
y() { printf '\033[33m⚠️ \033[0m %s\n' "$1"; }
s() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# ---------- 1. ה-CLI ----------
s "1. ה-CLI"

RAILWAY=""
for c in railway /opt/homebrew/bin/railway /usr/local/bin/railway "$HOME/.railway/bin/railway"; do
  if command -v "$c" >/dev/null 2>&1; then RAILWAY="$c"; break; fi
done

if [ -z "$RAILWAY" ]; then
  r "ה-CLI לא מותקן"
  missing+=("cli-install")
else
  VER="$($RAILWAY --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
  if [ -z "$VER" ]; then
    y "ה-CLI מותקן אבל לא הצלחתי לקרוא גרסה"
    missing+=("cli-version")
  elif [ "$(printf '%s\n%s\n' "$MIN_VERSION" "$VER" | sort -V | head -1)" != "$MIN_VERSION" ]; then
    r "גרסה $VER — נדרש $MIN_VERSION ומעלה (בלעדיה אין 'railway mcp install')"
    missing+=("cli-version")
  else
    g "ה-CLI — $VER"
    [ "$VER" = "$MIN_VERSION" ] && y "זו גרסת המינימום. שווה לשדרג"
  fi
fi

# ---------- 2. התחברות ----------
s "2. התחברות"

if [ -z "$RAILWAY" ]; then
  printf '⏭️  מדלג — אין CLI\n'
else
  if WHO="$($RAILWAY whoami --json 2>/dev/null)"; then
    EMAIL="$(printf '%s' "$WHO" | grep -oE '"email"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
    g "מחובר — ${EMAIL:-חשבון מזוהה}"
  else
    r "לא מחובר"
    missing+=("login")
  fi
fi

# ---------- 3. ה-MCP ב-Claude Code ----------
s "3. ה-MCP ב-Claude Code"

MCP_FOUND=0
if command -v claude >/dev/null 2>&1; then
  if claude mcp list 2>/dev/null | grep -qiE '^railway:'; then
    MCP_FOUND=1
    if claude mcp list 2>/dev/null | grep -iE '^railway:' | grep -q '✔'; then
      g "רשום ומחובר"
    else
      y "רשום אבל לא מחובר — בדרך כלל צריך להפעיל מחדש את Claude Code"
    fi
  fi
else
  # אין CLI של claude — נופלים לחיפוש בקונפיג
  for f in "$HOME/.claude.json" ".mcp.json"; do
    [ -f "$f" ] && grep -q '"railway"' "$f" 2>/dev/null && MCP_FOUND=1
  done
  [ "$MCP_FOUND" = 1 ] && g "רשום (נמצא בקונפיג)"
fi

if [ "$MCP_FOUND" = 0 ]; then
  r "ה-MCP לא רשום"
  missing+=("mcp")
fi

# ---------- 4. התיקייה הזאת ----------
s "4. התיקייה הזאת"

if [ -z "$RAILWAY" ] || [ ${#missing[@]} -gt 0 ]; then
  printf '⏭️  מדלג — קודם מסיימים את החיבור\n'
elif $RAILWAY status >/dev/null 2>&1; then
  g "מקושרת לפרויקט"
  if $RAILWAY service status 2>/dev/null | grep -qiE 'source|repo'; then
    g "לשירות מחובר ריפו — git push יפרוס"
  else
    y "לשירות אין ריפו מחובר. 'git push' לא יפרוס כלום — ראה references/deploy.md מלכודת 1"
  fi
else
  printf '⏭️  לא מקושרת לפרויקט — תקין לפני הפריסה הראשונה\n'
fi

# ---------- סיכום ----------
printf '\n%s\n' "──────────────────────────────────────────────────────────"

if [ ${#missing[@]} -eq 0 ]; then
  printf '\033[32m\033[1mRailway מחובר. אפשר לפרוס.\033[0m\n'
  echo "NEXT: READY"
  exit 0
fi

case " ${missing[*]} " in
  *" cli-install "*|*" cli-version "*) STEP="STEP 1" ;;
  *" login "*)                         STEP="STEP 2" ;;
  *" mcp "*)                           STEP="STEP 3" ;;
  *)                                   STEP="STEP 3" ;;
esac

if [ ${#missing[@]} -eq 1 ]; then
  printf '\033[33mחסר דבר אחד:\033[0m %s\n' "${missing[*]}"
else
  printf '\033[33mחסרים %d דברים:\033[0m %s\n' "${#missing[@]}" "${missing[*]}"
fi
echo "NEXT: $STEP  (ראה SKILL.md)"
exit 1
