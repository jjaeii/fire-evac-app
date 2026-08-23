# GitHub 저장소로 첫 푸시를 올린다.
# 이 창에서 실행해야 Git Credential Manager가 로그인 창을 띄울 수 있다.
# (에이전트의 비대화형 셸에서는 로그인 창을 띄우지 못한다.)

Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ' GitHub 푸시' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host ' 잠시 후 GitHub 로그인 창이 뜹니다.'
Write-Host '   - "Sign in with your browser" 를 고르는 게 가장 쉽습니다.'
Write-Host '   - 브라우저에서 로그인 후 Authorize 를 누르세요.'
Write-Host ''
Write-Host ' 원격 저장소: ' -NoNewline
Write-Host (git remote get-url origin) -ForegroundColor Yellow
Write-Host ''

# 터미널 프롬프트를 확실히 허용한다(부모 환경에서 꺼져 있을 수 있다).
$env:GIT_TERMINAL_PROMPT = '1'
Remove-Item Env:\GCM_INTERACTIVE -ErrorAction SilentlyContinue

Write-Host '푸시를 시작합니다...' -ForegroundColor Cyan
Write-Host ''

git push -u origin main
$code = $LASTEXITCODE

Write-Host ''
if ($code -eq 0) {
  Write-Host '==============================================' -ForegroundColor Green
  Write-Host ' 푸시 완료' -ForegroundColor Green
  Write-Host '==============================================' -ForegroundColor Green
  Write-Host ''
  Write-Host ' 다음 단계 - GitHub Pages 켜기:'
  Write-Host '   저장소 -> Settings -> Pages'
  Write-Host '   Source: Deploy from a branch'
  Write-Host '   Branch: main  /  (root)  -> Save'
  Write-Host ''
  Write-Host ' 1~2분 뒤 열리는 주소:'
  Write-Host '   https://jjaeii.github.io/fire-evac-app/' -ForegroundColor Yellow
} else {
  Write-Host '==============================================' -ForegroundColor Red
  Write-Host " 푸시 실패 (종료 코드 $code)" -ForegroundColor Red
  Write-Host '==============================================' -ForegroundColor Red
  Write-Host ''
  Write-Host ' 위에 찍힌 오류 메시지를 그대로 알려주세요.'
}

Write-Host ''
Read-Host '엔터를 누르면 이 창이 닫힙니다'
