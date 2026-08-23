// L2 자료층 - WorkerConfirmationRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.WorkerConfirmationRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'worker_confirmations';

  function getAll() {
    return Storage.read(KEY, []);
  }

  function add(confirmation) {
    var all = getAll();
    all.push(confirmation);
    var ok = Storage.write(KEY, all);
    return { ok: ok, confirmation: confirmation };
  }

  function getForEmergency(emergencyId) {
    return getAll().filter(function (c) { return c.emergencyId === emergencyId; });
  }

  function getLatestForWorker(workerId, emergencyId) {
    var all = getAll().filter(function (c) { return c.workerId === workerId && c.emergencyId === emergencyId; });
    if (all.length === 0) return null;
    return all[all.length - 1];
  }

  return { getAll: getAll, add: add, getForEmergency: getForEmergency, getLatestForWorker: getLatestForWorker };
})();
