param(
  [int]$Port = 8443,
  [int]$HttpPort = 8123
)

# 휴대폰 브라우저는 HTTPS(또는 localhost)가 아니면 카메라를 열어주지 않는다.
# 그래서 자체 서명 인증서를 만들어 HTTPS로 정적 파일을 서빙한다.
#
# HttpListener는 localhost 외의 주소를 받으려면 관리자 권한(netsh urlacl)이 필요해서
# HTTP/HTTPS 둘 다 TcpListener 위에 직접 올린다.
#
#  https://<LAN IP>:8443  -> 파일 서빙 (휴대폰 카메라 O)
#  http://localhost:8123  -> 파일 서빙 (PC 개발용, localhost는 보안 컨텍스트라 카메라 O)
#  http://<LAN IP>:8123   -> https 주소로 리디렉션

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pfxPath = Join-Path $PSScriptRoot 'devcert.pfx'
$pfxPassword = 'fire-evac-local'

function Get-LanIPv4 {
  $ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { return '127.0.0.1' }
  return $ip
}

$lanIp = Get-LanIPv4

function New-DevCertificate {
  param([string]$Ip, [string]$Path, [string]$Password)

  $san = "2.5.29.17={text}DNS=localhost&IPAddress=127.0.0.1&IPAddress=$Ip"
  $cert = New-SelfSignedCertificate `
    -Subject 'CN=fire-evac-app local' `
    -Type SSLServerAuthentication `
    -TextExtension @($san) `
    -KeyAlgorithm RSA -KeyLength 2048 `
    -NotAfter (Get-Date).AddYears(2) `
    -CertStoreLocation 'Cert:\CurrentUser\My'

  $securePw = ConvertTo-SecureString -String $Password -Force -AsPlainText
  Export-PfxCertificate -Cert $cert -FilePath $Path -Password $securePw | Out-Null
  Remove-Item -Path ("Cert:\CurrentUser\My\" + $cert.Thumbprint) -Force -ErrorAction SilentlyContinue
}

# 인증서가 없거나 지금 IP를 담고 있지 않으면 다시 만든다.
$needNewCert = $true
if (Test-Path -LiteralPath $pfxPath) {
  try {
    $existing = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
      $pfxPath, $pfxPassword,
      [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
    $sanText = ($existing.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' } | ForEach-Object { $_.Format($false) }) -join ' '
    if ($existing.NotAfter -gt (Get-Date) -and $sanText -match [regex]::Escape($lanIp)) {
      $needNewCert = $false
    }
  } catch {
    $needNewCert = $true
  }
}

if ($needNewCert) {
  Write-Host "Creating self-signed certificate for localhost + $lanIp ..."
  Remove-Item -LiteralPath $pfxPath -Force -ErrorAction SilentlyContinue
  New-DevCertificate -Ip $lanIp -Path $pfxPath -Password $pfxPassword
}

$serverCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
  $pfxPath, $pfxPassword,
  [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)

$httpsUrl = "https://${lanIp}:$Port"

# ------------------------------------------------------------------
# 기기 간 공유 상태 저장소
#
# 서버는 JSON을 해석하지 않는다. 키마다 "원문 JSON 문자열 + 버전"만 들고 있고,
# 합치는 규칙은 브라우저(SyncService)가 판단한다. 서버는 버전이 맞을 때만
# 덮어쓰기를 허용해서(compare-and-swap) 두 기기가 동시에 쓰는 걸 막는다.
# ------------------------------------------------------------------
$stateDir = Join-Path $PSScriptRoot 'state'
if (-not (Test-Path -LiteralPath $stateDir)) {
  New-Item -ItemType Directory -Path $stateDir | Out-Null
}

$allowedKeys = @(
  'emergency', 'workers', 'blocked_routes', 'worker_confirmations',
  'notifications', 'notification_reads', 'qr_zone_mappings'
)

$sharedState = [hashtable]::Synchronized(@{})
foreach ($k in $allowedKeys) {
  $file = Join-Path $stateDir ($k + '.json')
  $raw = 'null'
  if (Test-Path -LiteralPath $file) {
    try { $raw = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8) } catch { $raw = 'null' }
  }
  if ([string]::IsNullOrWhiteSpace($raw)) { $raw = 'null' }
  $sharedState[$k] = @{ v = 1; d = $raw }
}

$handler = {
  param($client, $cert, $rootPath, $useSsl, $redirectBase, $state, $keys, $stateDirPath,
        $serverLanIp, $serverHttpsPort, $serverHttpPort)

  $mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.webp' = 'image/webp'
  }

  # 헤더는 ASCII지만 본문에는 한글이 들어온다. Content-Length는 '바이트' 수라서
  # StreamReader(문자 단위)로는 정확히 끊을 수 없다. 그래서 바이트 단위로 직접 읽는다.
  function Read-AsciiLine($s) {
    $sb = New-Object System.Text.StringBuilder
    while ($true) {
      $b = $s.ReadByte()
      if ($b -lt 0) { if ($sb.Length -eq 0) { return $null } else { break } }
      if ($b -eq 10) { break }
      if ($b -ne 13) { [void]$sb.Append([char]$b) }
    }
    return $sb.ToString()
  }

  function Read-Body($s, $length) {
    if ($length -le 0) { return '' }
    $buf = New-Object byte[] $length
    $got = 0
    while ($got -lt $length) {
      $n = $s.Read($buf, $got, $length - $got)
      if ($n -le 0) { break }
      $got += $n
    }
    return [System.Text.Encoding]::UTF8.GetString($buf, 0, $got)
  }

  $stream = $null
  try {
    $client.ReceiveTimeout = 20000
    $client.SendTimeout = 20000

    if ($useSsl) {
      $ssl = New-Object System.Net.Security.SslStream($client.GetStream(), $false)
      $protocols = [System.Security.Authentication.SslProtocols]::Tls12 -bor [System.Security.Authentication.SslProtocols]::Tls11
      $ssl.AuthenticateAsServer($cert, $false, $protocols, $false)
      $stream = $ssl
    } else {
      $stream = $client.GetStream()
    }

    $reader = New-Object System.IO.BufferedStream($stream, 8192)

    # keep-alive: 같은 연결로 들어오는 요청을 계속 처리한다(TLS 핸드셰이크 절약).
    for ($n = 0; $n -lt 400; $n++) {
      $requestLine = Read-AsciiLine $reader
      if ([string]::IsNullOrEmpty($requestLine)) { break }

      $hostHeader = ''
      $contentLength = 0
      while ($true) {
        $header = Read-AsciiLine $reader
        if ($null -eq $header -or $header -eq '') { break }
        if ($header -match '^(?i)Host:\s*(.+)$') { $hostHeader = $Matches[1].Trim() }
        if ($header -match '^(?i)Content-Length:\s*(\d+)\s*$') { $contentLength = [int]$Matches[1] }
      }

      $parts = $requestLine -split ' '
      if ($parts.Count -lt 2) { break }
      $method = $parts[0].ToUpper()
      $rawPath = $parts[1]
      $pathAndQuery = $rawPath -split '\?'
      $rel = [System.Uri]::UnescapeDataString($pathAndQuery[0])
      $query = if ($pathAndQuery.Count -gt 1) { $pathAndQuery[1] } else { '' }
      $requestBody = Read-Body $reader $contentLength
      if ($rel -eq '/' -or $rel -eq '') { $rel = '/index.html' }

      $hostName = ($hostHeader -split ':')[0]
      $isLocal = ($hostName -eq 'localhost' -or $hostName -eq '127.0.0.1' -or $hostName -eq '[::1]')

      $status = '200 OK'
      $contentType = 'application/octet-stream'
      $extraHeaders = ''
      $body = $null

      # ---------------- 공유 상태 API ----------------
      if ($rel -like '/api/*') {
        $contentType = 'application/json; charset=utf-8'
        $json = ''

        if ($method -eq 'OPTIONS') {
          $status = '204 No Content'
          $extraHeaders = "Access-Control-Allow-Methods: GET, PUT, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`n"
          $json = ''
        }
        elseif ($rel -eq '/api/state' -and $method -eq 'GET') {
          $sb = New-Object System.Text.StringBuilder
          [void]$sb.Append('{"ok":true,"keys":{')
          $first = $true
          foreach ($k in $keys) {
            $entry = $state[$k]
            if (-not $first) { [void]$sb.Append(',') }
            $first = $false
            [void]$sb.Append('"' + $k + '":{"v":' + $entry.v + ',"d":' + $entry.d + '}')
          }
          [void]$sb.Append('}}')
          $json = $sb.ToString()
        }
        elseif ($rel -like '/api/state/*' -and $method -eq 'PUT') {
          $key = $rel.Substring('/api/state/'.Length)
          $base = -1
          if ($query -match 'base=(\d+)') { $base = [int]$Matches[1] }

          if ($keys -notcontains $key) {
            $status = '404 Not Found'
            $json = '{"ok":false,"error":"unknown key"}'
          }
          elseif ([string]::IsNullOrWhiteSpace($requestBody)) {
            $status = '400 Bad Request'
            $json = '{"ok":false,"error":"empty body"}'
          }
          else {
            [System.Threading.Monitor]::Enter($state.SyncRoot)
            try {
              $entry = $state[$key]
              if ($base -ne -1 -and $base -ne $entry.v) {
                $status = '409 Conflict'
                $json = '{"ok":false,"conflict":true,"v":' + $entry.v + '}'
              } else {
                $newV = $entry.v + 1
                $state[$key] = @{ v = $newV; d = $requestBody }
                try {
                  [System.IO.File]::WriteAllText(
                    (Join-Path $stateDirPath ($key + '.json')), $requestBody,
                    (New-Object System.Text.UTF8Encoding($false)))
                } catch {}
                $json = '{"ok":true,"v":' + $newV + '}'
              }
            } finally {
              [System.Threading.Monitor]::Exit($state.SyncRoot)
            }
          }
        }
        elseif ($rel -eq '/api/ping') {
          $json = '{"ok":true}'
        }
        elseif ($rel -eq '/api/info' -and $method -eq 'GET') {
          # 앱이 "휴대폰에서는 이 주소로 여세요"를 정확히 안내할 수 있도록 알려준다.
          $json = '{"ok":true,"lanIp":"' + $serverLanIp + '","httpsPort":' + $serverHttpsPort +
                  ',"httpPort":' + $serverHttpPort + ',"httpsUrl":"' + $redirectBase + '"}'
        }
        else {
          $status = '404 Not Found'
          $json = '{"ok":false,"error":"unknown endpoint"}'
        }

        $body = [System.Text.Encoding]::UTF8.GetBytes($json)
      }
      elseif ((-not $useSsl) -and (-not $isLocal)) {
        # 평문 HTTP + LAN 접속: 카메라가 막히므로 HTTPS로 보낸다.
        $target = $redirectBase + $rawPath
        $status = '307 Temporary Redirect'
        $contentType = 'text/html; charset=utf-8'
        $extraHeaders = "Location: $target`r`n"
        $html = "<meta charset='utf-8'><meta http-equiv='refresh' content='0;url=$target'>" +
                "<p style='font-family:sans-serif'>카메라를 쓰려면 보안 연결(https)이 필요합니다. 이동 중...<br>" +
                "<a href='$target'>$target</a></p>"
        $body = [System.Text.Encoding]::UTF8.GetBytes($html)
      }
      else {
        $candidate = Join-Path $rootPath ($rel.TrimStart('/') -replace '/', '\')
        $full = $null
        try { $full = [System.IO.Path]::GetFullPath($candidate) } catch { $full = $null }
        $rootFull = [System.IO.Path]::GetFullPath($rootPath)

        if ($null -eq $full -or -not $full.StartsWith($rootFull)) {
          $status = '403 Forbidden'
          $contentType = 'text/plain; charset=utf-8'
          $body = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
        }
        elseif (Test-Path -LiteralPath $full -PathType Leaf) {
          $ext = [System.IO.Path]::GetExtension($full).ToLower()
          if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }
          $body = [System.IO.File]::ReadAllBytes($full)
        }
        else {
          $status = '404 Not Found'
          $contentType = 'text/plain; charset=utf-8'
          $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
        }
      }

      $head = "HTTP/1.1 $status`r`n"
      $head += "Content-Type: $contentType`r`n"
      $head += "Content-Length: $($body.Length)`r`n"
      $head += "Cache-Control: no-store`r`n"
      # 이 앱은 외부로 요청을 보내지 않지만, 다른 도구에서 불러다 쓸 때
      # CORS로 막히지 않도록 열어둔다(로컬 정적 파일 서버라 위험 요소가 없다).
      $head += "Access-Control-Allow-Origin: *`r`n"
      $head += "Cross-Origin-Resource-Policy: cross-origin`r`n"
      # iframe 안에서도 카메라를 쓸 수 있게 허용한다.
      $head += "Permissions-Policy: camera=*`r`n"
      $head += $extraHeaders
      $head += "Connection: keep-alive`r`n`r`n"
      $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)

      $stream.Write($headBytes, 0, $headBytes.Length)
      $stream.Write($body, 0, $body.Length)
      $stream.Flush()
    }
  }
  catch {
    # 연결 하나가 끊겨도 서버 전체는 계속 돈다.
  }
  finally {
    if ($stream) { try { $stream.Dispose() } catch {} }
    try { $client.Close() } catch {}
  }
}

$pool = [runspacefactory]::CreateRunspacePool(1, 16)
$pool.Open()
$pending = New-Object System.Collections.ArrayList

$tlsListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
$tlsListener.Start()

$plainListener = $null
try {
  $plainListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $HttpPort)
  $plainListener.Start()
} catch {
  Write-Host "HTTP port $HttpPort is busy - skipping the plain-HTTP listener."
  $plainListener = $null
}

Write-Host ""
Write-Host "=============================================="
Write-Host " Fire Evacuation App - local server"
Write-Host "=============================================="
Write-Host " PC     : http://localhost:$HttpPort"
Write-Host " Phone  : $httpsUrl"
Write-Host ""
Write-Host " * Phone must be on the same Wi-Fi as this PC."
Write-Host " * First visit shows a certificate warning."
Write-Host "   Tap 'Advanced' -> 'Proceed' (self-signed certificate)."
Write-Host " * After that the camera permission prompt works normally."
Write-Host "=============================================="
Write-Host ""

function Start-Client {
  param($client, $useSsl)
  $ps = [powershell]::Create()
  $ps.RunspacePool = $pool
  [void]$ps.AddScript($handler).
    AddArgument($client).AddArgument($serverCert).AddArgument($root).
    AddArgument($useSsl).AddArgument($httpsUrl).
    AddArgument($sharedState).AddArgument($allowedKeys).AddArgument($stateDir).
    AddArgument($lanIp).AddArgument($Port).AddArgument($HttpPort)
  [void]$pending.Add(@{ ps = $ps; handle = $ps.BeginInvoke() })
}

while ($true) {
  if ($tlsListener.Pending()) {
    Start-Client -client $tlsListener.AcceptTcpClient() -useSsl $true
  }
  if ($plainListener -and $plainListener.Pending()) {
    Start-Client -client $plainListener.AcceptTcpClient() -useSsl $false
  }

  for ($i = $pending.Count - 1; $i -ge 0; $i--) {
    $item = $pending[$i]
    if ($item.handle.IsCompleted) {
      try { $item.ps.EndInvoke($item.handle) } catch {}
      try { $item.ps.Dispose() } catch {}
      $pending.RemoveAt($i)
    }
  }

  Start-Sleep -Milliseconds 5
}
