// L2 자료층 - SessionRepository
// 이 기기에서 지금 앱을 쓰고 있는 작업자가 누구인지만 저장한다.
// 화면 새로고침이나 앱 재실행 후에도 입장 상태가 유지되도록 한다.
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.SessionRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'session';

  function get() {
    return Storage.read(KEY, { currentWorkerId: null, enteredAt: null });
  }

  function setCurrentWorker(workerId) {
    return Storage.write(KEY, { currentWorkerId: workerId, enteredAt: new Date().toISOString() });
  }

  function clear() {
    return Storage.write(KEY, { currentWorkerId: null, enteredAt: null });
  }

  return { get: get, setCurrentWorker: setCurrentWorker, clear: clear };
})();
