// L0 화면층 - CameraPermissionGate
// 앱을 처음 켰을 때 나오는 카메라 사용 동의 화면.
// 여기서 "허용"을 고르면 그 다음에 브라우저 자체의 카메라 권한 팝업이 뜬다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.CameraPermissionGate = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var MESSAGE = window.App.Constants.MESSAGE;
  var CameraPermission = window.App.Services.CameraPermissionService;
  var CHOICES = CameraPermission.CHOICES;

  var root = null;

  // 카메라가 막혔을 때, 왜 막혔고 어디서 열면 되는지 같이 보여준다.
  function renderBlockHelp(block) {
    var html = '<div class="cpg-block">';
    html += '<div class="cpg-block-title">' + esc(block.message) + '</div>';
    html += '<p class="cpg-block-reason">' + esc(block.reason) + '</p>';

    if (block.alternates && block.alternates.length > 0) {
      html += '<div class="cpg-block-label">' + MESSAGE.CAMERA_OPEN_ELSEWHERE + '</div>';
      block.alternates.forEach(function (alt) {
        html += '<a class="cpg-https-link" href="' + esc(alt.url) + '" target="_blank" rel="noopener">';
        html += '<span class="cpg-alt-label">' + esc(alt.label) + '</span>' + esc(alt.url) + '</a>';
      });
      html += '<p class="cpg-warn-sub">휴대폰 주소는 인증서 경고가 뜹니다. <b>고급 → 계속</b>을 누르세요.</p>';
    }

    html += '<button class="cpg-btn cpg-btn-ghost cpg-retry" id="cpg-retry-btn">다시 시도</button>';
    html += '</div>';
    return html;
  }

  function buildHtml(props) {
    var env = props.environment;

    var html = '<div class="cpg-inner">';
    html += '<div class="cpg-icon" aria-hidden="true">📷</div>';
    html += '<h2 class="cpg-title">' + MESSAGE.CAMERA_GATE_TITLE + '</h2>';
    html += '<p class="cpg-body">' + MESSAGE.CAMERA_GATE_BODY + '</p>';

    if (!env.ok && env.code === 'INSECURE_CONTEXT') {
      html += '<div class="cpg-warn">';
      html += '<div class="cpg-warn-title">지금 주소로는 카메라를 열 수 없습니다</div>';
      html += '<p class="cpg-warn-text">' + MESSAGE.CAMERA_NEEDS_HTTPS + '</p>';
      if (env.httpsUrl) {
        html += '<a class="cpg-https-link" href="' + esc(env.httpsUrl) + '">' + esc(env.httpsUrl) + '</a>';
        html += '<p class="cpg-warn-sub">처음 열면 인증서 경고가 뜹니다. <b>고급 → 계속</b>을 누르면 들어가집니다.</p>';
      }
      html += '</div>';
    } else if (!env.ok) {
      html += '<div class="cpg-warn"><p class="cpg-warn-text">' + esc(env.message) + '</p></div>';
    }

    html += '<div class="cpg-actions">';
    html += '<button class="cpg-btn cpg-btn-primary" id="cpg-session-btn"' + (env.ok ? '' : ' disabled') + '>' +
      '앱을 사용하는 동안 허용<span class="cpg-btn-sub">권장 · 앱을 닫으면 다시 물어봅니다</span></button>';
    html += '<button class="cpg-btn cpg-btn-strong" id="cpg-always-btn"' + (env.ok ? '' : ' disabled') + '>' +
      '항상 허용<span class="cpg-btn-sub">다시 묻지 않습니다</span></button>';
    html += '<button class="cpg-btn cpg-btn-ghost" id="cpg-deny-btn">' +
      '거부<span class="cpg-btn-sub">사진 인식·직접 입력만 사용</span></button>';
    html += '</div>';

    if (props.block) {
      html += renderBlockHelp(props.block);
    } else if (props.feedbackMessage) {
      html += '<div class="cpg-feedback' + (props.feedbackOk ? ' cpg-feedback-ok' : '') + '">' + esc(props.feedbackMessage) + '</div>';
    }

    html += '<p class="cpg-note">' + MESSAGE.CAMERA_GATE_NOTE + '</p>';
    html += '</div>';
    return html;
  }

  function show(props) {
    if (!root) {
      root = document.createElement('div');
      root.className = 'camera-gate';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      document.body.appendChild(root);
    }
    root.innerHTML = buildHtml(props);
    document.body.classList.add('modal-open');

    function pick(choice) {
      props.onChoose(choice);
    }

    root.querySelector('#cpg-session-btn').addEventListener('click', function () { pick(CHOICES.SESSION); });
    root.querySelector('#cpg-always-btn').addEventListener('click', function () { pick(CHOICES.ALWAYS); });
    root.querySelector('#cpg-deny-btn').addEventListener('click', function () { pick(CHOICES.DENIED); });

    var retryBtn = root.querySelector('#cpg-retry-btn');
    if (retryBtn && props.onRetry) {
      retryBtn.addEventListener('click', function () { props.onRetry(); });
    }
  }

  function hide() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    document.body.classList.remove('modal-open');
  }

  function isShowing() {
    return root !== null;
  }

  return { show: show, hide: hide, isShowing: isShowing };
})();
