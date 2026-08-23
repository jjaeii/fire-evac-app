// L3 기반층 - 환경 설정
// PPB: 해당 없음 - 외부 Provider 의존 없음. 이 앱은 외부 API 키나 엔드포인트를 사용하지 않는다.
window.App = window.App || {};
window.App.Foundation = window.App.Foundation || {};

window.App.Foundation.EnvConfig = Object.freeze({
  STORAGE_NAMESPACE: 'fire_evac_v2',
  MAX_LOG_DISPLAY: 20,
  APP_MODE: 'on_site',
  // 화면 간(작업자 기기 ↔ 관리자 기기) 상태 반영 주기(ms)
  SYNC_INTERVAL_MS: 1000,
  // 이 단계 이상이면 작업자 화면에 전체 화재경보를 띄운다.
  ALERT_STAGES: ['initial_fire', 'spreading_fire', 'major_fire'],
  // 카메라는 보안 컨텍스트(HTTPS 또는 localhost)에서만 열린다.
  // http로 들어온 사용자에게 안내할 HTTPS 포트.
  HTTPS_PORT: 8443,
  // 여러 기기가 같은 현장 상태를 보도록 서버와 맞춘다.
  // 서버가 없으면 자동으로 기기 안에서만 동작한다.
  SYNC_ENABLED: true,
  SYNC_API_BASE: 'api'
});
