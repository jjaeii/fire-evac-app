// L0 화면층 - QrScannerOverlay
// 카메라 QR 스캔 화면. 화면 전체를 덮는 모달로 document.body에 직접 붙는다.
// (다른 패널이 다시 그려져도 카메라가 끊기지 않도록 렌더 트리 바깥에 둔다.)
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.QrScannerOverlay = (function () {
  var QrDecode = window.App.Services.QrDecodeService;
  var esc = window.App.Foundation.HtmlEscape.escape;
  var MESSAGE = window.App.Constants.MESSAGE;

  var session = null; // { root, video, canvas, stream, rafId, onResult }

  function isOpen() {
    return session !== null;
  }

  function buildDom(title) {
    var root = document.createElement('div');
    root.className = 'scanner-overlay';
    root.innerHTML =
      '<div class="scanner-head">' +
        '<span class="scanner-title">' + esc(title) + '</span>' +
        '<button class="scanner-close" id="scanner-close-btn" aria-label="닫기">닫기</button>' +
      '</div>' +
      '<div class="scanner-stage">' +
        '<video class="scanner-video" id="scanner-video" playsinline muted autoplay></video>' +
        '<div class="scanner-frame"></div>' +
      '</div>' +
      '<p class="scanner-hint" id="scanner-hint">' + MESSAGE.QR_SCANNING + '</p>' +
      '<div class="scanner-actions">' +
        '<label class="btn btn-secondary scanner-file-btn">사진에서 찾기' +
          '<input type="file" accept="image/*" id="scanner-file-input" hidden />' +
        '</label>' +
      '</div>';
    return root;
  }

  function setHint(text, isError, httpsUrl) {
    if (!session) return;
    var hint = session.root.querySelector('#scanner-hint');
    if (httpsUrl) {
      hint.innerHTML = esc(text) + '<br /><a class="scanner-https-link" href="' + esc(httpsUrl) + '">' + esc(httpsUrl) + '</a>';
    } else {
      hint.textContent = text;
    }
    hint.classList.toggle('scanner-hint-error', !!isError);
  }

  function finish(value) {
    var onResult = session ? session.onResult : null;
    close();
    if (onResult && value) onResult(value);
  }

  function tick() {
    if (!session) return;
    var value = null;
    try {
      value = QrDecode.decodeFromVideo(session.video, session.canvas);
    } catch (e) {
      value = null;
    }
    if (value) {
      finish(value);
      return;
    }
    session.rafId = window.requestAnimationFrame(tick);
  }

  function open(props) {
    if (session) close();

    var root = buildDom(props.title || 'QR 스캔');
    document.body.appendChild(root);
    document.body.classList.add('modal-open');

    session = {
      root: root,
      video: root.querySelector('#scanner-video'),
      canvas: document.createElement('canvas'),
      stream: null,
      rafId: null,
      onResult: props.onResult
    };

    root.querySelector('#scanner-close-btn').addEventListener('click', function () {
      close();
      if (props.onCancel) props.onCancel();
    });

    // 카메라가 막혀 있어도 사진 파일로는 인식할 수 있게 항상 열어둔다.
    root.querySelector('#scanner-file-input').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      setHint('사진에서 QR을 찾는 중...', false);
      QrDecode.decodeFromFile(file).then(function (result) {
        if (result.ok) {
          finish(result.value);
        } else {
          setHint(result.error.message, true);
        }
      });
    });

    if (!QrDecode.hasDecoder()) {
      setHint(MESSAGE.QR_DECODER_MISSING, true);
      return;
    }

    QrDecode.openCamera().then(function (result) {
      if (!session) {
        // 응답이 오기 전에 사용자가 닫은 경우 스트림을 그대로 반납한다.
        if (result.ok) QrDecode.closeCamera(result.stream);
        return;
      }
      if (!result.ok) {
        session.root.querySelector('.scanner-stage').classList.add('scanner-stage-off');
        setHint(result.error.message, true, result.error.httpsUrl);
        return;
      }
      session.stream = result.stream;
      session.video.srcObject = result.stream;
      session.video.play().catch(function () {});
      session.rafId = window.requestAnimationFrame(tick);
    });
  }

  function close() {
    if (!session) return;
    if (session.rafId) window.cancelAnimationFrame(session.rafId);
    QrDecode.closeCamera(session.stream);
    if (session.video) session.video.srcObject = null;
    if (session.root.parentNode) session.root.parentNode.removeChild(session.root);
    document.body.classList.remove('modal-open');
    session = null;
  }

  return { open: open, close: close, isOpen: isOpen };
})();
