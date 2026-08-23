// L2 자료층 - BlockedRouteRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.BlockedRouteRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'blocked_routes';

  function getAll() {
    return Storage.read(KEY, []);
  }

  function replaceForEmergency(emergencyId, blockedRouteIds, reason, adminId) {
    var others = getAll().filter(function (b) { return b.emergencyId !== emergencyId; });
    var now = new Date().toISOString();
    var newOnes = blockedRouteIds.map(function (routeId) {
      return {
        id: 'blocked_' + routeId + '_' + Date.now().toString(36),
        emergencyId: emergencyId,
        evacuationRouteId: routeId,
        reason: reason || '',
        createdByAdminId: adminId,
        createdAt: now
      };
    });
    var all = others.concat(newOnes);
    var ok = Storage.write(KEY, all);
    return { ok: ok, blockedRoutes: newOnes };
  }

  function getForEmergency(emergencyId) {
    return getAll().filter(function (b) { return b.emergencyId === emergencyId; });
  }

  function clearForEmergency(emergencyId) {
    var others = getAll().filter(function (b) { return b.emergencyId !== emergencyId; });
    return Storage.write(KEY, others);
  }

  return {
    getAll: getAll,
    replaceForEmergency: replaceForEmergency,
    getForEmergency: getForEmergency,
    clearForEmergency: clearForEmergency
  };
})();
