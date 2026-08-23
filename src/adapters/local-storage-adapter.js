// L2 자료층 - LocalStorageAdapter
// 브라우저 저장소 접근은 이 파일에서만 한다.
window.App = window.App || {};
window.App.Adapters = window.App.Adapters || {};

window.App.Adapters.LocalStorageAdapter = (function () {
  var NAMESPACE = window.App.Foundation.EnvConfig.STORAGE_NAMESPACE;

  function buildKey(key) {
    return NAMESPACE + ':' + key;
  }

  function read(key, fallbackValue) {
    try {
      var raw = window.localStorage.getItem(buildKey(key));
      if (raw === null) return fallbackValue;
      return JSON.parse(raw);
    } catch (e) {
      return fallbackValue;
    }
  }

  // 여러 기기가 함께 보는 값이 바뀌면 SyncService가 서버로 올린다.
  // 서버에서 받아온 값을 쓸 때는 다시 올리지 않도록 잠깐 꺼둔다.
  var syncSuppressed = false;

  function setSyncSuppressed(value) {
    syncSuppressed = !!value;
  }

  function notifyChanged(key) {
    if (syncSuppressed) return;
    var Sync = window.App.Services && window.App.Services.SyncService;
    if (Sync) Sync.markDirty(key);
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(buildKey(key), JSON.stringify(value));
      notifyChanged(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 변경 감지용. JSON 파싱 없이 원본 문자열만 본다.
  function readRaw(key) {
    try {
      return window.localStorage.getItem(buildKey(key));
    } catch (e) {
      return null;
    }
  }

  function clear(key) {
    try {
      window.localStorage.removeItem(buildKey(key));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 이번 실행 동안만 유지되는 값(예: "앱을 사용하는 동안만 카메라 허용").
  // 탭을 닫으면 사라진다.
  function readSession(key, fallbackValue) {
    try {
      var raw = window.sessionStorage.getItem(buildKey(key));
      if (raw === null) return fallbackValue;
      return JSON.parse(raw);
    } catch (e) {
      return fallbackValue;
    }
  }

  function writeSession(key, value) {
    try {
      window.sessionStorage.setItem(buildKey(key), JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSession(key) {
    try {
      window.sessionStorage.removeItem(buildKey(key));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    read: read,
    write: write,
    readRaw: readRaw,
    clear: clear,
    readSession: readSession,
    writeSession: writeSession,
    clearSession: clearSession,
    setSyncSuppressed: setSyncSuppressed
  };
})();
