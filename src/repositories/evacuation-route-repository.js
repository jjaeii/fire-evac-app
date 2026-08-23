// L2 자료층 - EvacuationRouteRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.EvacuationRouteRepository = (function () {
  function getAll() {
    return window.App.Data.SITE.evacuationRoutes;
  }
  function getByWorkZoneId(workZoneId) {
    return getAll().filter(function (r) { return r.workZoneId === workZoneId; });
  }
  function getById(routeId) {
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === routeId) return all[i];
    }
    return null;
  }
  return { getAll: getAll, getByWorkZoneId: getByWorkZoneId, getById: getById };
})();
