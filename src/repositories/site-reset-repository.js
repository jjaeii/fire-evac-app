// L2 자료층 - SiteResetRepository
// 현장을 초기화한 시각을 기록한다.
//
// 알림과 대피 확인 기록은 쌓이기만 하는 자료라 지울 수 없다(여러 기기가 합쳐 쓰는 값이다).
// 대신 "이 시각 이전 것은 지난 회차"로 보고 화면에서 제외한다.
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.SiteResetRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'site_reset';

  function get() {
    return Storage.read(KEY, { clearedAt: null, byAdminId: null });
  }

  function getClearedAt() {
    var record = get();
    return record && record.clearedAt ? Date.parse(record.clearedAt) || 0 : 0;
  }

  // 기록된 초기화 시각보다 이전에 만들어진 자료인지
  function isBeforeReset(iso) {
    var cleared = getClearedAt();
    if (!cleared) return false;
    var t = Date.parse(iso || '') || 0;
    return t > 0 && t <= cleared;
  }

  function save(adminId) {
    var record = { clearedAt: new Date().toISOString(), byAdminId: adminId || null };
    var ok = Storage.write(KEY, record);
    return { ok: ok, record: record };
  }

  return { get: get, getClearedAt: getClearedAt, isBeforeReset: isBeforeReset, save: save };
})();
