// L3 기반층 - traceId 생성
// 하나의 함수는 하나의 일만 한다: traceId 생성만 담당.
window.App = window.App || {};
window.App.Foundation = window.App.Foundation || {};

window.App.Foundation.TraceIdFactory = (function () {
  function create() {
    var random = Math.random().toString(36).slice(2, 10);
    var time = Date.now().toString(36);
    return 'trace_' + time + '_' + random;
  }
  return { create: create };
})();
