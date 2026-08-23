// L1 기능층 - AppStateService
// 책임: 로딩 상태와 현재 화면 뷰(작업자/관리자)를 중앙 관리한다.
// 지금 입장한 작업자가 누구인지는 SessionRepository가 저장한다(새로고침 후에도 유지되어야 하므로).
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.AppStateService = (function () {
  var state = {
    isLoading: false,
    currentView: 'worker', // 'worker' | 'admin'
    listeners: []
  };

  function setLoading(isLoading) {
    state.isLoading = isLoading;
    notify();
  }

  function setView(view) {
    state.currentView = view;
    notify();
  }

  function getCurrentState() {
    return Object.assign({}, state, { listeners: undefined });
  }

  function subscribe(listener) {
    state.listeners.push(listener);
  }

  function notify() {
    state.listeners.forEach(function (fn) { fn(getCurrentState()); });
  }

  return {
    setLoading: setLoading,
    setView: setView,
    getCurrentState: getCurrentState,
    subscribe: subscribe
  };
})();
