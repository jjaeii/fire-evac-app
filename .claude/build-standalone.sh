#!/usr/bin/env bash
# index.html의 로드 순서를 그대로 지켜서 CSS/JS를 한 파일로 합친다.
# 서버가 없는 환경(정적 호스팅)에서 쓰는 발표용 단일 파일.
set -e
cd "$(dirname "$0")/.."
OUT="dist/fire-evac-standalone.html"
mkdir -p dist

# index.html의 주소에는 캐시 무효화용 ?v=... 이 붙어 있다. 파일 경로만 뽑는다.
CSS=$(grep -oE 'href="src/[^"]+\.css(\?v=[^"]*)?"' index.html | sed -E 's/^href="//; s/"$//; s/\?v=.*$//')
JS=$(grep -oE 'src="src/[^"]+\.js(\?v=[^"]*)?"' index.html | sed -E 's/^src="//; s/"$//; s/\?v=.*$//')

{
  # <head> 앞부분: 원본에서 link/script 줄만 뺀 뼈대를 직접 쓴다
  sed -n '1,/<link rel="stylesheet"/p' index.html | sed '$d'
  echo '  <style>'
  for f in $CSS; do echo "/* ===== $f ===== */"; cat "$f"; echo; done
  echo '  </style>'
  sed -n '/<\/head>/,/<!-- 외부 라이브러리/p' index.html | sed '$d'
  for f in $JS; do
    echo "<script>"
    echo "/* ===== $f ===== */"
    if [ "$f" = "src/foundation/env-config.js" ]; then
      # 단일 파일 버전에는 서버가 없다. 동기화를 꺼서 헛된 요청을 막는다.
      sed 's/SYNC_ENABLED: true/SYNC_ENABLED: false/' "$f"
    else
      cat "$f"
    fi
    echo "</script>"
  done
  echo '</body>'
  echo '</html>'
} > "$OUT"

echo "built: $OUT"
wc -c < "$OUT"
