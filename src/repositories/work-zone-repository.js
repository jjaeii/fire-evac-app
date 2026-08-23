// L2 자료층 - WorkZoneRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.WorkZoneRepository = (function () {
  function getAll() {
    return window.App.Data.SITE.workZones;
  }
  function getById(workZoneId) {
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === workZoneId) return all[i];
    }
    return null;
  }
  // 등록된 현장 QR 매핑을 먼저 보고, 없으면 기본 QR 문자열로 찾는다.
  function findByQrValue(qrValue) {
    var zoneId = window.App.Repositories.QrMappingRepository.findZoneIdByQrValue(qrValue);
    if (!zoneId) return null;
    return getById(zoneId);
  }
  return { getAll: getAll, getById: getById, findByQrValue: findByQrValue };
})();
