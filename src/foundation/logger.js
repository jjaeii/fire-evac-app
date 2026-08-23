// L3 기반층 - Logger
// 로그는 여기서만 기록한다. L0 컴포넌트는 직접 로그를 남기지 않는다.
window.App = window.App || {};
window.App.Foundation = window.App.Foundation || {};

window.App.Foundation.Logger = (function () {
  function log(eventName, actorType, actorId, payload, message, traceId) {
    if (!traceId) {
      // traceId 없는 로그는 남기지 않는다 (구현 원칙: 모든 LOG에는 반드시 traceId 포함).
      // eslint-disable-next-line no-console
      console.warn('[Logger] traceId 누락으로 로그가 기록되지 않았습니다:', eventName);
      return null;
    }
    var entry = {
      id: 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      traceId: traceId,
      eventName: eventName,
      actorType: actorType || 'system',
      actorId: actorId || null,
      payload: payload ? JSON.stringify(payload) : null,
      message: message || '',
      createdAt: new Date().toISOString()
    };
    window.App.Repositories.LogRepository.append(entry);
    return entry;
  }
  return { log: log };
})();
