// L0 화면층 - QRScanPanel
// 작업구역 QR을 카메라 또는 사진으로 읽는 화면.
// 화면은 판단하지 않는다. 읽어낸 QR 문자열을 그대로 서비스에 전달하고 결과만 표시한다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.QRScanPanel = (function () {
  var QrDecode = window.App.Services.QrDecodeService;
  var CameraPermission = window.App.Services.CameraPermissionService;
  var ScannerOverlay = window.App.Components.QrScannerOverlay;
  var esc = window.App.Foundation.HtmlEscape.escape;
  var MESSAGE = window.App.Constants.MESSAGE;

  function renderCameraStatus(env, choice) {
    // 카메라를 못 쓰는 이유가 있으면 무엇을 하면 되는지까지 같이 보여준다.
    if (!env.ok && env.code === 'INSECURE_CONTEXT') {
      var html = '<div class="qr-env-warn">';
      html += '<div class="qr-env-title">카메라를 쓰려면 보안 연결이 필요합니다</div>';
      html += '<p class="qr-env-text">' + MESSAGE.CAMERA_NEEDS_HTTPS + '</p>';
      if (env.httpsUrl) {
        html += '<a class="qr-env-link" href="' + esc(env.httpsUrl) + '">' + esc(env.httpsUrl) + '</a>';
        html += '<p class="qr-env-sub">인증서 경고가 뜨면 <b>고급 → 계속</b>을 누르세요.</p>';
      }
      html += '</div>';
      return html;
    }
    if (!env.ok) {
      return '<div class="feedback feedback-warn">' + esc(env.message) + '</div>';
    }
    if (choice === CameraPermission.CHOICES.DENIED) {
      return '<div class="feedback feedback-warn">' + MESSAGE.CAMERA_DECLINED + '</div>';
    }
    return '';
  }

  function render(container, props) {
    var registered = !!props.currentZoneName;
    var env = CameraPermission.checkEnvironment();
    var choice = CameraPermission.getStoredChoice();
    var cameraUsable = env.ok && choice !== CameraPermission.CHOICES.DENIED;

    var html = '<div class="panel qr-panel">';
    html += '<h3 class="panel-title">작업구역 QR 스캔</h3>';
    html += '<p class="panel-sub">' + (registered
      ? '구역을 옮겼다면 그 구역의 QR을 다시 스캔하세요.'
      : '작업구역 입구에 붙은 QR 코드를 스캔해 현재 위치를 등록하세요.') + '</p>';

    html += renderCameraStatus(env, choice);

    // 실시간 스캔이 막혀 있어도 촬영은 된다.
    // capture="environment"는 휴대폰의 카메라 앱을 바로 여는 표준 방식이라
    // 실시간 영상 권한(getUserMedia)과 달리 대부분의 환경에서 동작한다.
    var photoClass = cameraUsable ? 'btn btn-secondary btn-photo' : 'btn btn-primary btn-photo';
    var photoLabel = cameraUsable ? '사진으로 QR 인식' : '카메라로 QR 촬영';

    if (cameraUsable) {
      html += '<button class="btn btn-primary btn-scan" id="qr-camera-btn">카메라로 QR 스캔</button>';
    }

    html += '<label class="' + photoClass + '" for="qr-photo-input">' + photoLabel;
    html += '<input type="file" accept="image/*" capture="environment" id="qr-photo-input" hidden />';
    html += '</label>';

    if (!cameraUsable) {
      html += '<p class="qr-photo-hint">버튼을 누르면 휴대폰 카메라가 열립니다. 구역 QR을 찍으면 바로 인식됩니다.</p>';
      if (env.ok) {
        html += '<button class="btn btn-ghost btn-retry-permission" id="qr-permission-btn">실시간 스캔 권한 다시 요청</button>';
      }
    }

    if (!QrDecode.hasDecoder()) {
      html += '<div class="feedback feedback-error">' + MESSAGE.QR_DECODER_MISSING + '</div>';
    }

    html += '<details class="qr-manual-details"' + (props.manualOpen ? ' open' : '') + '>';
    html += '<summary>QR을 읽을 수 없을 때 · 코드 직접 입력</summary>';
    html += '<div class="qr-manual-row">';
    html += '<input type="text" class="input" id="qr-manual-input" placeholder="QR 문자열 (예: SECTOR-A)" />';
    html += '<button class="btn btn-secondary" id="qr-manual-submit">등록</button>';
    html += '</div>';
    html += '</details>';

    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + esc(props.feedbackMessage) + '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    var cameraBtn = container.querySelector('#qr-camera-btn');
    if (cameraBtn) {
      cameraBtn.addEventListener('click', function () {
        ScannerOverlay.open({
          title: '작업구역 QR 스캔',
          onResult: function (value) { props.onScan(value); }
        });
      });
    }

    var permissionBtn = container.querySelector('#qr-permission-btn');
    if (permissionBtn) {
      permissionBtn.addEventListener('click', function () {
        props.onRequestCameraPermission();
      });
    }

    container.querySelector('#qr-photo-input').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      QrDecode.decodeFromFile(file).then(function (result) {
        if (result.ok) props.onScan(result.value);
        else props.onDecodeError(result.error.message);
      });
    });

    container.querySelector('#qr-manual-submit').addEventListener('click', function () {
      var value = container.querySelector('#qr-manual-input').value.trim();
      if (value) props.onScan(value);
    });
    container.querySelector('#qr-manual-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var value = e.target.value.trim();
        if (value) props.onScan(value);
      }
    });
  }

  return { render: render };
})();
