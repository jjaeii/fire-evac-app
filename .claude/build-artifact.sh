#!/usr/bin/env bash
# Artifact 배포용 변형: 문서 뼈대(<!DOCTYPE>/<html>/<head>/<body>) 없이
# 제목 + 스타일 + 본문 + 스크립트만 낸다. 배포 시 바깥 뼈대가 씌워지기 때문이다.
set -e
cd "$(dirname "$0")/.."
OUT="dist/fire-evac-artifact.html"
mkdir -p dist

# index.html의 주소에는 캐시 무효화용 ?v=... 이 붙어 있다. 파일 경로만 뽑는다.
CSS=$(grep -oE 'href="src/[^"]+\.css(\?v=[^"]*)?"' index.html | sed -E 's/^href="//; s/"$//; s/\?v=.*$//')
JS=$(grep -oE 'src="src/[^"]+\.js(\?v=[^"]*)?"' index.html | sed -E 's/^src="//; s/"$//; s/\?v=.*$//')

{
  echo '<title>제조공장 화재 대피 안내</title>'
  echo '<style>'
  for f in $CSS; do echo "/* ===== $f ===== */"; cat "$f"; echo; done
  echo '</style>'

  # <body> 시작부터 스크립트 블록 직전까지가 화면 마크업이다.
  awk '/<body>/{flag=1;next} /외부 라이브러리/{flag=0} flag' index.html

  for f in $JS; do
    echo "<script>"
    echo "/* ===== $f ===== */"
    if [ "$f" = "src/foundation/env-config.js" ]; then
      # 이 버전에는 서버가 없다. 동기화를 꺼서 헛된 네트워크 요청을 막는다.
      sed 's/SYNC_ENABLED: true/SYNC_ENABLED: false/' "$f"
    else
      cat "$f"
    fi
    echo "</script>"
  done
} > "$OUT"

echo "built: $OUT"
wc -c < "$OUT"
