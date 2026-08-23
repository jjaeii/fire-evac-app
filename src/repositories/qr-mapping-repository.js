// L2 자료층 - QrMappingRepository
// 현장에 실제로 붙어 있는 QR 스티커의 내용은 미리 알 수 없다.
// 관리자가 각 구역 QR을 한 번 스캔해 등록하면 그 문자열이 구역에 연결된다.
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.QrMappingRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'qr_zone_mappings';

  // [{ qrValue, workZoneId, registeredByAdminId, registeredAt }]
  function getAll() {
    return Storage.read(KEY, []);
  }

  // 스티커를 다시 만들면서 대소문자나 구분자만 달라지는 일이 잦아
  // 비교할 때는 대문자로 올리고 -, _, 공백을 없앤 형태로 맞춘다.
  function normalize(value) {
    return String(value || '').trim().toUpperCase().replace(/[-_\s]/g, '');
  }

  function findZoneIdByQrValue(qrValue) {
    var key = String(qrValue || '').trim();
    if (!key) return null;
    var norm = normalize(key);
    if (!norm) return null;

    var registered = getAll();
    var i;

    // 관리자가 직접 등록한 매핑이 항상 우선한다.
    for (i = 0; i < registered.length; i++) {
      if (registered[i].qrValue === key) return registered[i].workZoneId;
    }
    for (i = 0; i < registered.length; i++) {
      if (normalize(registered[i].qrValue) === norm) return registered[i].workZoneId;
    }

    var defaults = window.App.Data.SITE.defaultQrToWorkZone;
    if (defaults[key]) return defaults[key];
    var codes = Object.keys(defaults);
    for (i = 0; i < codes.length; i++) {
      if (normalize(codes[i]) === norm) return defaults[codes[i]];
    }
    return null;
  }

  function getForWorkZone(workZoneId) {
    return getAll().filter(function (m) { return m.workZoneId === workZoneId; });
  }

  // 같은 QR 문자열은 하나의 구역에만 연결된다. 다시 등록하면 기존 연결을 덮어쓴다.
  function bind(qrValue, workZoneId, adminId) {
    var key = String(qrValue || '').trim();
    if (!key) return { ok: false, mapping: null };

    var others = getAll().filter(function (m) { return m.qrValue !== key; });
    var mapping = {
      qrValue: key,
      workZoneId: workZoneId,
      registeredByAdminId: adminId || null,
      registeredAt: new Date().toISOString()
    };
    var ok = Storage.write(KEY, others.concat([mapping]));
    return { ok: ok, mapping: mapping };
  }

  function unbind(qrValue) {
    var others = getAll().filter(function (m) { return m.qrValue !== qrValue; });
    return Storage.write(KEY, others);
  }

  return {
    getAll: getAll,
    findZoneIdByQrValue: findZoneIdByQrValue,
    getForWorkZone: getForWorkZone,
    bind: bind,
    unbind: unbind
  };
})();
