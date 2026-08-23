#!/usr/bin/env bash
# index.html의 모든 CSS/JS 주소에 ?v=<버전>을 붙인다.
#
# GitHub Pages는 정적 파일에 캐시 헤더를 붙여 내려주기 때문에, 배포해도
# 브라우저가 예전 파일을 계속 쓰는 일이 생긴다. 주소가 바뀌면 새로 받는다.
# 배포 전에 이 스크립트를 돌린다.
set -e
cd "$(dirname "$0")/.."

VERSION="${1:-$(date +%Y%m%d%H%M)}"

# 기존 ?v=... 를 떼고 새로 붙인다 (중복 방지)
perl -pi -e 's{(href="src/[^"?]+\.css)(\?v=[^"]*)?"}{$1?v='"$VERSION"'"}g' index.html
perl -pi -e 's{(src="src/[^"?]+\.js)(\?v=[^"]*)?"}{$1?v='"$VERSION"'"}g' index.html

echo "version = $VERSION"
grep -c '?v=' index.html
