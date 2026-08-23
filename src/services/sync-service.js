// L1 기능층 - SyncService
// 책임: 여러 기기(관리자 폰 · 작업자 폰)가 같은 현장 상태를 보도록 맞추는 것.
//
// 구조상 원칙:
//   - 저장소(Repository)와 서비스는 그대로 localStorage를 동기적으로 읽고 쓴다.
//   - 이 서비스만 서버와 통신하면서 localStorage를 최신으로 유지한다.
//   - 서버는 JSON을 해석하지 않는다. 합치는 규칙은 전부 여기(브라우저)에 있다.
//
// 합치는 방식 두 가지:
//   union - 기록이 쌓이기만 하는 것(확인 기록, 알림 등). id로 합집합을 만든다.
//   lww   - 통째로 바뀌는 것(비상상황, 사용 불가 대피로, QR 매핑). 마지막에 쓴 쪽이 이긴다.
//
// 서버가 없거나 끊겨도 앱은 기기 안에서 그대로 동작한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.SyncService = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var EnvConfig = window.App.Foundation.EnvConfig;

  var UNION_KEYS = {
    workers: { by: function (w) { return w.id; }, newer: function (a, b) { return stamp(b) > stamp(a) ? b : a; } },
    worker_confirmations: { by: function (c) { return c.id; }, newer: null },
    notifications: { by: function (n) { return n.id; }, newer: null },
    notification_reads: { by: function (r) { return r.notificationId + '|' + r.workerId; }, newer: null }
  };

  var LWW_KEYS = ['emergency', 'blocked_routes', 'qr_zone_mappings'];

  var ALL_KEYS = Object.keys(UNION_KEYS).concat(LWW_KEYS);

  var serverVersions = {};   // key -> 서버에서 마지막으로 본 버전
  var dirty = {};            // key -> 이 기기에서 바뀌어 아직 못 올린 것
  var status = { enabled: false, online: false, lastSyncAt: null, lastError: null };
  var timer = null;
  var inFlight = false;

  function stamp(record) {
    return Date.parse(record && (record.updatedAt || record.createdAt || record.registeredAt) || '') || 0;
  }

  function isSharedKey(key) {
    return ALL_KEYS.indexOf(key) !== -1;
  }

  // 저장소 어댑터가 공유 키를 쓸 때마다 불러준다.
  function markDirty(key) {
    if (isSharedKey(key)) dirty[key] = true;
  }

  function apiUrl(path) {
    return EnvConfig.SYNC_API_BASE + path;
  }

  // ----------------------------------------------------------------
  // 저장 위치는 두 가지다.
  //   1) 로컬 서버 (/api/state)      - 같은 Wi-Fi 안에서만 연동
  //   2) Firebase Realtime Database - 인터넷 어디서나 연동 (여러 사람 폰)
  // EnvConfig.SYNC_REMOTE_BASE가 채워져 있으면 2번을 쓴다.
  // ----------------------------------------------------------------
  // ----------------------------------------------------------------
  // ntfy.sh 경로 (계정 없이 여러 기기 연동)
  //
  // 받기: 주제를 SSE로 구독한다. 관리자가 화재를 걸면 즉시 밀려온다.
  // 보내기: 바뀐 것만 한 건씩 올린다. 메시지 크기 제한(4KB)이 있어서
  //         union 키는 전체 배열이 아니라 달라진 항목만 보낸다.
  // ----------------------------------------------------------------
  var ntfy = { cache: {}, source: null, primed: false };

  function ntfyTopic() {
    return String(EnvConfig.SYNC_NTFY_TOPIC || '').trim();
  }

  // 같은 Wi-Fi에서 PC 서버로 열었으면 그쪽이 빠르고 데이터도 밖으로 나가지 않는다.
  // 정적 호스팅(GitHub Pages)이라 /api가 없을 때만 ntfy로 넘어간다.
  var ntfyFallback = false;

  function usingNtfy() {
    return !usingRemote() && ntfyTopic() !== '' && ntfyFallback;
  }

  function ntfyUrl(suffix) {
    return String(EnvConfig.SYNC_NTFY_HOST || '').replace(/\/+$/, '') + '/' + ntfyTopic() + (suffix || '');
  }

  function ntfyApply(payload) {
    if (!payload || !payload.key || ALL_KEYS.indexOf(payload.key) === -1) return;
    var key = payload.key;
    var incoming = payload.d === undefined ? null : payload.d;
    var version = typeof payload.v === 'number' ? payload.v : 1;
    var prev = ntfy.cache[key];

    if (UNION_KEYS[key]) {
      // 항목 단위로 합친다. 누가 먼저 보냈는지와 무관하게 결과가 같다.
      var merged = unionMerge(key, prev ? prev.d : [], incoming);
      ntfy.cache[key] = { v: Math.max(version, prev ? prev.v : 1), d: merged };
      return;
    }

    if (!prev || version >= prev.v) {
      ntfy.cache[key] = { v: version, d: incoming };
    }
  }

  function ntfyPrime() {
    // 이미 올라와 있는 기록을 먼저 받아 현재 상태를 만든다.
    return fetch(ntfyUrl('/json?poll=1&since=all'), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('ntfy ' + res.status);
        return res.text();
      })
      .then(function (text) {
        text.split('\n').forEach(function (line) {
          if (!line.trim()) return;
          try {
            var m = JSON.parse(line);
            if (m.event === 'message' && m.message) ntfyApply(JSON.parse(m.message));
          } catch (e) { /* 못 읽는 메시지는 건너뛴다 */ }
        });
        ntfy.primed = true;
      });
  }

  function ntfySubscribe() {
    if (ntfy.source || typeof EventSource === 'undefined') return;
    try {
      ntfy.source = new EventSource(ntfyUrl('/sse'));
    } catch (e) {
      ntfy.source = null;
      return;
    }
    ntfy.source.onmessage = function (evt) {
      try {
        var m = JSON.parse(evt.data);
        if (m.event !== 'message' || !m.message) return;
        ntfyApply(JSON.parse(m.message));
      } catch (e) { return; }
      // 밀려온 변화를 곧바로 화면에 반영한다.
      syncOnce(false);
    };
    ntfy.source.onerror = function () {
      // EventSource가 알아서 다시 연결한다. 끊긴 동안은 주기 폴링이 받쳐준다.
    };
  }

  function ntfyKeys() {
    var keys = {};
    ALL_KEYS.forEach(function (k) {
      var entry = ntfy.cache[k];
      keys[k] = { v: entry ? entry.v : 1, d: entry ? entry.d : null };
    });
    return keys;
  }

  // union 키에서 서버 쪽에 없거나 달라진 항목만 골라낸다.
  function unionDelta(key, merged) {
    var rule = UNION_KEYS[key];
    var cached = ntfy.cache[key] && Array.isArray(ntfy.cache[key].d) ? ntfy.cache[key].d : [];
    var known = {};
    cached.forEach(function (item) { known[rule.by(item)] = canonical(item); });
    return (merged || []).filter(function (item) {
      return known[rule.by(item)] !== canonical(item);
    });
  }

  function remoteBase() {
    var base = String(EnvConfig.SYNC_REMOTE_BASE || '').trim();
    return base ? base.replace(/\/+$/, '') : '';
  }

  function usingRemote() {
    return remoteBase() !== '';
  }

  function remoteRoot() {
    return remoteBase() + '/fireEvac/state';
  }

  // 서버에서 전체 상태를 받아 {keys: {key: {v, d}}} 형태로 맞춘다.
  function backendGet() {
    if (usingNtfy()) {
      var ready = ntfy.primed ? Promise.resolve() : ntfyPrime();
      return ready.then(function () {
        ntfySubscribe();
        return { keys: ntfyKeys() };
      });
    }

    if (usingRemote()) {
      return fetch(remoteRoot() + '.json', { method: 'GET', cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('state ' + res.status);
          return res.json();
        })
        .then(function (json) {
          var keys = {};
          ALL_KEYS.forEach(function (k) {
            var entry = json && json[k];
            keys[k] = {
              v: entry && typeof entry.v === 'number' ? entry.v : 1,
              // Firebase는 빈 배열을 저장하지 않고 없는 값으로 돌려준다.
              d: entry && entry.d !== undefined ? entry.d : null
            };
          });
          return { keys: keys };
        });
    }

    return fetch(apiUrl('/state'), { method: 'GET', cache: 'no-store' })
      .then(function (res) {
        // 404/405 = 정적 호스팅에 올린 경우. 서버가 응답은 하지만 공유 API가 없다.
        // ntfy 주제가 설정돼 있으면 그쪽으로 넘어가고, 없으면 기기 저장으로 간다.
        if (res.status === 404 || res.status === 405 || res.status === 501) {
          if (ntfyTopic() !== '') {
            ntfyFallback = true;
            throw new Error('switch to ntfy');
          }
          noApiHere = true;
          stop();
          throw new Error('no sync api');
        }
        if (!res.ok) throw new Error('state ' + res.status);
        return res.json();
      });
  }

  function backendPut(key, value, baseVersion) {
    if (usingNtfy()) {
      var version = baseVersion + 1;
      // union 키는 달라진 항목만 보낸다(메시지 크기 제한).
      var body = UNION_KEYS[key] ? unionDelta(key, value) : value;
      if (UNION_KEYS[key] && body.length === 0) return Promise.resolve(true);

      return fetch(ntfyUrl(''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, v: version, d: body })
      }).then(function (res) {
        if (res.ok) {
          // 우리가 보낸 것도 캐시에 반영해 다음 비교의 기준으로 삼는다.
          ntfyApply({ key: key, v: version, d: body });
          serverVersions[key] = version;
        }
        return res.ok;
      });
    }

    if (usingRemote()) {
      return fetch(remoteRoot() + '/' + key + '.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: baseVersion + 1, d: value })
      }).then(function (res) {
        if (res.ok) serverVersions[key] = baseVersion + 1;
        return res.ok;
      });
    }

    return fetch(apiUrl('/state/' + key + '?base=' + baseVersion), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    }).then(function (res) {
      return res.json().then(function (json) { return { httpOk: res.ok, json: json }; });
    }).then(function (result) {
      if (result.json && typeof result.json.v === 'number') {
        serverVersions[key] = result.json.v;
      }
      // 충돌이면 이번 판은 넘기고 다음 주기에 서버 값을 다시 받아 합친다.
      return result.json && result.json.ok === true;
    });
  }

  // 같은 내용인지 비교할 때 쓰는 정규화된 문자열.
  function canonical(value) {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) {
      return '[' + value.map(canonical).join(',') + ']';
    }
    if (typeof value === 'object') {
      var keys = Object.keys(value).sort();
      return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + canonical(value[k]); }).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  function unionMerge(key, localValue, serverValue) {
    var rule = UNION_KEYS[key];
    var local = Array.isArray(localValue) ? localValue : [];
    var remote = Array.isArray(serverValue) ? serverValue : [];

    var map = {};
    var order = [];
    function put(item) {
      if (!item) return;
      var id = rule.by(item);
      if (id === undefined || id === null) return;
      if (!(id in map)) {
        map[id] = item;
        order.push(id);
      } else if (rule.newer) {
        map[id] = rule.newer(map[id], item);
      }
    }
    remote.forEach(put);
    local.forEach(put);

    return order.map(function (id) { return map[id]; });
  }

  function readLocal(key) {
    return Storage.read(key, key === 'emergency' ? null : []);
  }

  function writeLocalFromRemote(key, value) {
    // 서버가 아직 아무 값도 못 받은 키는 null로 온다.
    // 그 null을 그대로 저장하면 저장소들이 기본값 대신 null을 읽게 되므로 쓰지 않는다.
    if (value === null || value === undefined) return;

    // 원격에서 받은 값을 쓸 때는 dirty로 표시하지 않는다(되돌아 올라가는 것 방지).
    Storage.setSyncSuppressed(true);
    try {
      Storage.write(key, value);
    } finally {
      Storage.setSyncSuppressed(false);
    }
  }

  function hasContent(value) {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  function put(key, value, baseVersion) {
    return backendPut(key, value, baseVersion);
  }

  // 서버가 꺼져 있으면 매초 두드려봐야 콘솔만 지저분해진다. 실패할수록 간격을 늘린다.
  var backoffTicks = 0;
  // 정적 호스팅처럼 공유 API 자체가 없는 곳인지 (한 번 확인하면 다시 시도하지 않는다)
  var noApiHere = false;

  function syncOnce(isTick) {
    if (inFlight) return Promise.resolve();
    if (isTick && backoffTicks > 0) {
      backoffTicks -= 1;
      return Promise.resolve();
    }
    inFlight = true;

    return backendGet()
      .then(function (payload) {
        status.online = true;
        status.lastError = null;
        status.lastSyncAt = new Date().toISOString();
        backoffTicks = 0;

        var pushes = [];

        ALL_KEYS.forEach(function (key) {
          var entry = payload.keys && payload.keys[key];
          if (!entry) return;
          var serverVersion = entry.v;
          var serverValue = entry.d;
          var localValue = readLocal(key);

          if (UNION_KEYS[key]) {
            var merged = unionMerge(key, localValue, serverValue);
            if (canonical(merged) !== canonical(localValue)) {
              writeLocalFromRemote(key, merged);
            }
            if (canonical(merged) !== canonical(serverValue)) {
              pushes.push(put(key, merged, serverVersion));
            }
            serverVersions[key] = serverVersion;
            dirty[key] = false;
            return;
          }

          // lww: 이 기기에서 바뀐 게 있으면 올리고, 없으면 서버 값을 따른다.
          if (dirty[key]) {
            dirty[key] = false;
            pushes.push(put(key, localValue, serverVersion));
          } else if (!hasContent(serverValue)) {
            // 서버에 아직 아무것도 없으면 이 기기 값을 올려서 시작점을 만든다.
            if (hasContent(localValue)) pushes.push(put(key, localValue, serverVersion));
            serverVersions[key] = serverVersion;
          } else if (serverVersions[key] !== serverVersion) {
            if (canonical(serverValue) !== canonical(localValue)) {
              writeLocalFromRemote(key, serverValue);
            }
            serverVersions[key] = serverVersion;
          } else {
            serverVersions[key] = serverVersion;
          }
        });

        return Promise.all(pushes);
      })
      .catch(function (err) {
        // 서버가 없거나 끊긴 상태. 앱은 기기 안에서 계속 동작한다.
        status.online = false;
        status.lastError = err && err.message ? err.message : String(err);
        backoffTicks = Math.min(backoffTicks === 0 ? 4 : backoffTicks * 2, 30);
      })
      .then(function () {
        inFlight = false;
      });
  }

  function start() {
    if (!EnvConfig.SYNC_ENABLED || noApiHere) return;
    if (location.protocol === 'file:') return; // 파일로 직접 연 경우 서버가 없다
    if (timer) return;
    status.enabled = true;

    // 처음 한 번은 바로 맞춘 뒤 주기적으로 돈다.
    syncOnce(false);
    timer = window.setInterval(function () { syncOnce(true); }, EnvConfig.SYNC_INTERVAL_MS);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
    if (ntfy.source) {
      try { ntfy.source.close(); } catch (e) {}
      ntfy.source = null;
    }
    status.enabled = false;
  }

  function getStatus() {
    return {
      enabled: status.enabled,
      online: status.online,
      noApi: noApiHere,
      remote: usingRemote() || usingNtfy(),
      lastSyncAt: status.lastSyncAt,
      lastError: status.lastError
    };
  }

  // 화면에서 무언가 바꾼 직후 상대 기기에 빨리 전달되도록 즉시 한 번 더 돈다.
  function flush() {
    if (!status.enabled) return;
    syncOnce(false);
  }

  return {
    start: start,
    stop: stop,
    flush: flush,
    markDirty: markDirty,
    isSharedKey: isSharedKey,
    getStatus: getStatus,
    SHARED_KEYS: ALL_KEYS
  };
})();
