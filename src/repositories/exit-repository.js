// L2 자료층 - ExitRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.ExitRepository = (function () {
  function getAll() {
    return window.App.Data.SITE.exits;
  }
  function getById(exitId) {
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === exitId) return all[i];
    }
    return null;
  }
  return { getAll: getAll, getById: getById };
})();
