// L1 기능층 - CameraPermissionService
// 책임: 카메라 사용 동의를 받고 그 선택을 기억하는 것만 한다.
//
// 브라우저 자체의 권한 팝업("이 사이트에서 카메라를 사용하도록 허용하시겠습니까?")은
// 앱이 만들 수 없다. 앱은 먼저 무엇을 왜 쓰는지 설명하는 화면을 보여주고,
// 사용자가 허용을 고르면 그때 브라우저 팝업을 띄운다.
//
// 앱이 기억하는 선택:
//   always  - 항상 허용. 다시 묻지 않는다.
//   session - 앱을 사용하는 동안만 허용. 탭을 닫으면 다음에 다시 묻는다.
//   denied  - 거부. 사진 인식과 직접 입력만 쓴다. 나중에 다시 켤 수 있다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.CameraPermissionService = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var EnvConfig = window.App.Foundation.EnvConfig;
  var Logger = window.App.Foundation.Logger;
  var MESSAGE = window.App.Constants.MESSAGE;

  var KEY = 'camera_permission';
  var SESSION_KEY = 'camera_permission_session';

  var CHOICES = { ALWAYS: 'always', SESSION: 'session', DENIED: 'denied' };

  function getStoredChoice() {
    var session = Storage.readSession(SESSION_KEY, null);
    if (session === CHOICES.SESSION) return CHOICES.SESSION;
    var stored = Storage.read(KEY, null);
    if (stored === CHOICES.ALWAYS || stored === CHOICES.DENIED) return stored;
    return null;
  }

  function saveChoice(choice) {
    if (choice === CHOICES.SESSION) {
      // 이번 실행 동안만. 영구 저장소에 남은 이전 선택은 지운다.
      Storage.clear(KEY);
      return Storage.writeSession(SESSION_KEY, CHOICES.SESSION);
    }
    Storage.clearSession(SESSION_KEY);
    return Storage.write(KEY, choice);
  }

  function reset() {
    Storage.clear(KEY);
    Storage.clearSession(SESSION_KEY);
  }

  function isAllowed() {
    var choice = getStoredChoice();
    return choice === CHOICES.ALWAYS || choice === CHOICES.SESSION;
  }

  function needsPrompt() {
    return getStoredChoice() === null;
  }

  // 카메라를 열 수 있는 환경인지. 열 수 없으면 이유와 해결책을 함께 준다.
  function checkEnvironment() {
    // index.html을 파일로 직접 열면(file://) 브라우저가 카메라를 막는다.
    if (location.protocol === 'file:') {
      return { ok: false, code: 'FILE_PROTOCOL', message: MESSAGE.CAMERA_NEEDS_SERVER, httpsUrl: null };
    }
    if (!window.isSecureContext) {
      return {
        ok: false,
        code: 'INSECURE_CONTEXT',
        message: MESSAGE.CAMERA_NEEDS_HTTPS,
        httpsUrl: buildHttpsUrl()
      };
    }
    // iframe 안에 들어가 있으면 부모가 allow="camera"를 줘야 열린다.
    if (window.self !== window.top && !isCameraAllowedInFrame()) {
      return { ok: false, code: 'FRAME_BLOCKED', message: MESSAGE.CAMERA_BLOCKED_IN_FRAME, httpsUrl: null };
    }
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      return { ok: false, code: 'NO_MEDIA_DEVICES', message: MESSAGE.QR_CAMERA_UNAVAILABLE, httpsUrl: null };
    }
    return { ok: true, code: null, message: null, httpsUrl: null };
  }

  // iframe 안에서 카메라 사용이 허용되어 있는지 확인한다.
  // 브라우저가 이 API를 지원하지 않으면 막지 않고 그대로 시도한다.
  function isCameraAllowedInFrame() {
    try {
      if (document.featurePolicy && document.featurePolicy.allowsFeature) {
        return document.featurePolicy.allowsFeature('camera');
      }
      if (document.permissionsPolicy && document.permissionsPolicy.allowsFeature) {
        return document.permissionsPolicy.allowsFeature('camera');
      }
    } catch (e) { /* 판단 불가 */ }
    return true;
  }

  // http로 들어온 경우 같은 기기에서 열어야 할 https 주소를 만들어 준다.
  function buildHttpsUrl() {
    if (location.protocol === 'https:') return null;
    return 'https://' + location.hostname + ':' + EnvConfig.HTTPS_PORT + '/';
  }

  // 브라우저가 이미 기억하고 있는 권한 상태 ('granted' | 'denied' | 'prompt' | null)
  function queryBrowserPermission() {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve(null);
    return navigator.permissions.query({ name: 'camera' })
      .then(function (status) { return status.state; })
      .catch(function () { return null; });
  }

  // 서버가 알려주는 접속 주소. "휴대폰에서는 이 주소로 여세요"를 정확히 띄우기 위함.
  var serverInfo = null;

  function loadServerInfo() {
    if (location.protocol === 'file:') return Promise.resolve(null);
    return fetch('api/info', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        if (json && json.ok) serverInfo = json;
        return serverInfo;
      })
      .catch(function () { return null; });
  }

  function getServerInfo() {
    return serverInfo;
  }

  // 카메라를 열 수 있는 다른 접속 주소들. 지금 주소는 빼고 알려준다.
  function getAlternateUrls() {
    var list = [];
    var here = location.origin;

    if (serverInfo) {
      var phone = 'https://' + serverInfo.lanIp + ':' + serverInfo.httpsPort + '/';
      var pc = 'http://localhost:' + serverInfo.httpPort + '/';
      if (here !== 'https://' + serverInfo.lanIp + ':' + serverInfo.httpsPort) {
        list.push({ label: '휴대폰 (같은 Wi-Fi)', url: phone });
      }
      if (here !== 'http://localhost:' + serverInfo.httpPort) {
        list.push({ label: 'PC 브라우저', url: pc });
      }
      if (list.length === 0) {
        list.push({ label: '휴대폰 (같은 Wi-Fi)', url: phone });
      }
    } else {
      list.push({ label: '현재 주소', url: location.origin + '/' });
    }
    return list;
  }

  // 왜 막혔는지 구분한다.
  //   묻지도 않고 denied  -> 내장 미리보기 창처럼 환경 자체가 카메라를 막은 경우
  //   사용자가 차단        -> 브라우저 사이트 설정에서 풀어야 하는 경우
  function describeBlock(askedBefore) {
    return queryBrowserPermission().then(function (state) {
      var preBlocked = state === 'denied' && !askedBefore;
      return {
        message: MESSAGE.CAMERA_BLOCKED_BY_BROWSER,
        reason: preBlocked ? MESSAGE.CAMERA_BLOCKED_WHY_PREBLOCKED : MESSAGE.CAMERA_BLOCKED_WHY_DENIED,
        preBlocked: preBlocked,
        alternates: getAlternateUrls()
      };
    });
  }

  // 게이트를 띄우기 전에 미리 확인해서, 눌러보고 실패하는 일을 줄인다.
  function precheck() {
    var env = checkEnvironment();
    if (!env.ok) return Promise.resolve({ blocked: true, environment: env, block: null });
    return queryBrowserPermission().then(function (state) {
      if (state !== 'denied') return { blocked: false, environment: env, block: null };
      return describeBlock(false).then(function (block) {
        return { blocked: true, environment: env, block: block };
      });
    });
  }

  // 브라우저가 이미 카메라를 허용해 둔 상태면 앱이 다시 물어볼 이유가 없다.
  // 한 번 "항상 허용"을 누르면 그다음부터는 이 앱 화면이 뜨지 않는다.
  function adoptBrowserGrant() {
    if (getStoredChoice() !== null) return Promise.resolve(false);
    return queryBrowserPermission().then(function (state) {
      if (state === 'granted') {
        saveChoice(CHOICES.ALWAYS);
        return true;
      }
      return false;
    });
  }

  // 실제 브라우저 권한 팝업을 띄운다. 사용자의 조작(버튼 클릭) 안에서 불러야 한다.
  function requestBrowserPermission(traceId) {
    var env = checkEnvironment();
    if (!env.ok) {
      return Promise.resolve({ ok: false, error: { code: env.code, message: env.message, httpsUrl: env.httpsUrl } });
    }

    // 요청 "전" 상태를 기억해둔다. 이미 denied면 브라우저가 묻지도 않고 막는 창이라는 뜻이다.
    // (getUserMedia는 사용자 조작 흐름 안에서 바로 불러야 하므로 await하지 않고 병렬로 확인한다.)
    var stateBefore = 'unknown';
    queryBrowserPermission().then(function (s) { stateBefore = s; });

    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (stream) {
        // 권한 확인용으로만 열었으므로 바로 반납한다. 실제 스캔은 스캐너가 다시 연다.
        stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
        if (traceId) Logger.log('camera.permission.granted', 'worker', null, {}, '카메라 권한 허용', traceId);
        return { ok: true };
      })
      .catch(function (err) {
        var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        if (traceId) {
          Logger.log('camera.permission.rejected', 'worker', null, { name: err && err.name }, '카메라 권한 거절', traceId);
        }
        if (!denied) {
          return { ok: false, error: { code: 'QR_CAMERA_UNAVAILABLE', message: MESSAGE.QR_CAMERA_UNAVAILABLE, httpsUrl: null } };
        }
        // 사용자가 방금 "차단"을 누른 건지, 아니면 애초에 막힌 창인지 구분해서 알려준다.
        var askedBefore = stateBefore !== 'denied';
        return describeBlock(askedBefore).then(function (block) {
          return {
            ok: false,
            error: {
              code: 'QR_CAMERA_DENIED',
              message: block.message,
              reason: block.reason,
              preBlocked: block.preBlocked,
              alternates: block.alternates,
              httpsUrl: null
            }
          };
        });
      });
  }

  // 사용자가 게이트에서 고른 선택을 반영한다.
  function choose(choice, traceId) {
    if (choice === CHOICES.DENIED) {
      saveChoice(CHOICES.DENIED);
      Logger.log('camera.permission.declined', 'worker', null, {}, '카메라 사용 거부 선택', traceId);
      return Promise.resolve({ ok: true, choice: CHOICES.DENIED });
    }

    return requestBrowserPermission(traceId).then(function (result) {
      if (result.ok) {
        saveChoice(choice);
        return { ok: true, choice: choice };
      }
      return { ok: false, error: result.error };
    });
  }

  return {
    CHOICES: CHOICES,
    getStoredChoice: getStoredChoice,
    needsPrompt: needsPrompt,
    isAllowed: isAllowed,
    checkEnvironment: checkEnvironment,
    buildHttpsUrl: buildHttpsUrl,
    queryBrowserPermission: queryBrowserPermission,
    requestBrowserPermission: requestBrowserPermission,
    loadServerInfo: loadServerInfo,
    getServerInfo: getServerInfo,
    getAlternateUrls: getAlternateUrls,
    describeBlock: describeBlock,
    precheck: precheck,
    adoptBrowserGrant: adoptBrowserGrant,
    choose: choose,
    reset: reset
  };
})();
