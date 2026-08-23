// L2 자료층 - WorkerRepository
// 작업자 명부는 고정 목록이 아니다. 입장할 때 추가되고 퇴장하면 현장 인원에서 빠진다.
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.WorkerRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'workers';

  function getAll() {
    return Storage.read(KEY, window.App.Data.SITE.workers.map(function (w) { return Object.assign({}, w); }));
  }

  function saveAll(workers) {
    return Storage.write(KEY, workers);
  }

  // 현장에 입장해 있는 작업자만
  function getOnSite() {
    return getAll().filter(function (w) { return w.isOnSite; });
  }

  function getById(workerId) {
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === workerId) return all[i];
    }
    return null;
  }

  function findByName(name) {
    var key = String(name || '').trim();
    if (!key) return null;
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name === key) return all[i];
    }
    return null;
  }

  // 계정 식별자는 이름 + 생년월일 조합이다(동명이인 구분).
  function findByNameAndBirth(name, birthDate) {
    var key = String(name || '').trim();
    var birth = String(birthDate || '').trim();
    if (!key || !birth) return null;
    var all = getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name === key && all[i].birthDate === birth) return all[i];
    }
    return null;
  }

  function add(worker) {
    var all = getAll();
    all.push(worker);
    var ok = saveAll(all);
    return { ok: ok, worker: worker };
  }

  function update(workerId, patch) {
    var all = getAll();
    var found = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === workerId) {
        all[i] = Object.assign({}, all[i], patch, { updatedAt: new Date().toISOString() });
        found = all[i];
        break;
      }
    }
    if (!found) return { ok: false, worker: null };
    var ok = saveAll(all);
    return { ok: ok, worker: found };
  }

  function getByWorkZoneId(workZoneId) {
    return getOnSite().filter(function (w) { return w.currentWorkZoneId === workZoneId; });
  }

  return {
    getAll: getAll,
    getOnSite: getOnSite,
    getById: getById,
    findByName: findByName,
    findByNameAndBirth: findByNameAndBirth,
    add: add,
    update: update,
    getByWorkZoneId: getByWorkZoneId
  };
})();
