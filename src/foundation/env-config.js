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
  // 같은 Wi-Fi 안에서 PC 서버를 쓸 때의 주소
  SYNC_API_BASE: 'api',
  // 인터넷 어디서나 여러 기기가 연동되게 하려면 여기에 Firebase Realtime Database
  // 주소를 넣는다. 예: 'https://내프로젝트-default-rtdb.firebaseio.com'
  // 계정이 있는 비공개 저장소를 쓰고 싶을 때 이 쪽을 채운다.
  SYNC_REMOTE_BASE: '',

  // 계정 없이 여러 기기를 연동하는 경로 (ntfy.sh 공개 푸시 서비스).
  // 주제 이름을 아는 사람은 이 데이터를 볼 수 있으므로, 데모용으로만 쓴다.
  // 비우면 이 경로를 쓰지 않는다.
  SYNC_NTFY_HOST: 'https://ntfy.sh',
  SYNC_NTFY_TOPIC: 'fireevac-939b1d0dc389548aa4df667d'
});
