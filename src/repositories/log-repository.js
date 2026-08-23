// L2 자료층 - LogRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.LogRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'app_logs';
  var MAX_KEEP = 500;

  function getAll() {
    return Storage.read(KEY, []);
  }

  function append(entry) {
    var all = getAll();
    all.push(entry);
    if (all.length > MAX_KEEP) {
      all = all.slice(all.length - MAX_KEEP);
    }
    return Storage.write(KEY, all);
  }

  function getRecentByEvents(eventNames, limit) {
    var all = getAll();
    var filtered = all.filter(function (l) { return eventNames.indexOf(l.eventName) !== -1; });
    filtered.reverse();
    return filtered.slice(0, limit || 20);
  }

  function getRecent(limit) {
    var all = getAll().slice();
    all.reverse();
    return all.slice(0, limit || 20);
  }

  return { getAll: getAll, append: append, getRecentByEvents: getRecentByEvents, getRecent: getRecent };
})();
