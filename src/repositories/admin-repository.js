// L2 자료층 - AdminRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.AdminRepository = (function () {
  function getAll() {
    return window.App.Data.SITE.admins;
  }
  function getById(adminId) {
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === adminId) return all[i];
    }
    return null;
  }
  return { getAll: getAll, getById: getById };
})();
