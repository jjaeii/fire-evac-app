param([switch]$Remove)

# 같은 Wi-Fi에 있는 휴대폰이 이 PC의 앱 서버에 접속할 수 있도록
# Windows 방화벽 인바운드를 연다.
#
#  - 포트 8443(https) / 8123(http)
#  - RemoteAddress LocalSubnet : 같은 공유기 안의 기기만 허용. 인터넷에는 열리지 않는다.
#  - 관리자 권한이 필요하므로, 권한이 없으면 스스로 UAC 창을 띄운다.

$ErrorActionPreference = 'Stop'
$ruleName = 'fire-evac-app (LAN)'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host '관리자 권한이 필요합니다. 확인 창이 뜨면 [예]를 눌러주세요.'
  # $args 는 PowerShell 자동 변수라 여기에 대입하면 안 된다.
  $psArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
  if ($Remove) { $psArgs += '-Remove' }
  try {
    Start-Process powershell -Verb RunAs -ArgumentList $psArgs
  } catch {
    Write-Host ''
    Write-Host '관리자 권한 승인이 취소되었습니다. 방화벽 규칙을 추가하지 못했습니다.'
    Read-Host '엔터를 누르면 닫힙니다'
  }
  exit
}

if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
  Remove-NetFirewallRule -DisplayName $ruleName
  Write-Host "기존 규칙을 제거했습니다: $ruleName"
}

if ($Remove) {
  Write-Host ''
  Write-Host '방화벽 규칙을 삭제했습니다. 휴대폰에서 더 이상 접속할 수 없습니다.'
  Write-Host ''
  Read-Host '엔터를 누르면 닫힙니다'
  exit
}

New-NetFirewallRule -DisplayName $ruleName `
  -Direction Inbound -Protocol TCP -LocalPort 8443, 8123 `
  -RemoteAddress LocalSubnet -Action Allow -Profile Any | Out-Null

$ip = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress

Write-Host ''
Write-Host '=============================================='
Write-Host ' 방화벽을 열었습니다.'
Write-Host '=============================================='
Write-Host ''
Write-Host ' 휴대폰 주소창에 입력하세요:'
Write-Host ''
Write-Host "     https://${ip}:8443"
Write-Host ''
Write-Host ' * 휴대폰이 PC와 같은 Wi-Fi에 연결되어 있어야 합니다.'
Write-Host ' * 인증서 경고 -> 고급 -> 계속 을 누르면 들어갑니다.'
Write-Host ''
Write-Host ' 되돌리려면 이 파일을 -Remove 옵션으로 실행하세요.'
Write-Host '=============================================='
Write-Host ''
Read-Host '엔터를 누르면 닫힙니다'
