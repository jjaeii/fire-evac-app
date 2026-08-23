// L2 자료층 - AdminRepository
// 관리자도 회원가입으로 등록된다. 기본 안전관리자 한 명은 SITE 데이터에 들어 있고,
// 가입한 관리자는 여기에 추가된다.
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.AdminRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'admins';

  function getAll() {
    var seeded = window.App.Data.SITE.admins.map(function (a) { return Object.assign({}, a); });
    var stored = Storage.read(KEY, []);
    if (!Array.isArray(stored) || stored.length === 0) return seeded;

    // 저장된 관리자를 앞에 두되, 기본 안전관리자 기록도 남긴다(기존 로그 참조용).
    var byId = {};
    var merged = [];
    stored.concat(seeded).forEach(function (a) {
      if (!a || byId[a.id]) return;
      byId[a.id] = true;
      merged.push(a);
    });
    return merged;
  }

  function getById(adminId) {
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === adminId) return all[i];
    }
    return null;
  }

  function add(admin) {
    var stored = Storage.read(KEY, []);
    if (!Array.isArray(stored)) stored = [];
    stored.push(admin);
    var ok = Storage.write(KEY, stored);
    return { ok: ok, admin: admin };
  }

  return { getAll: getAll, getById: getById, add: add };
})();
