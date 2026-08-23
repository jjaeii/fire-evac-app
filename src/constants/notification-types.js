// L3 기반층 - 관리자 → 작업자 알림 상수
window.App = window.App || {};
window.App.Constants = window.App.Constants || {};

window.App.Constants.NOTIFICATION_LEVELS = Object.freeze({
  NORMAL: 'normal',
  IMPORTANT: 'important'
});

window.App.Constants.NOTIFICATION_LEVEL_LABELS = Object.freeze({
  normal: '일반',
  important: '중요'
});

// 관리자가 자주 보내는 문구. 매번 타이핑하지 않도록 버튼으로 제공한다.
window.App.Constants.NOTIFICATION_PRESETS = Object.freeze([
  { label: '점검 요청', text: '해당 구역 설비 점검 후 결과를 보고해주세요.', level: 'normal' },
  { label: '작업 중지', text: '작업을 중지하고 현재 위치에서 대기해주세요.', level: 'important' },
  { label: '정문 집합', text: '작업을 정리하고 정문 앞으로 집합해주세요.', level: 'important' },
  { label: '안전점검 실시', text: '안전점검을 실시합니다. 보호구 착용 상태를 확인해주세요.', level: 'normal' }
]);

window.App.Constants.NOTIFICATION_TARGET_ALL = 'all';
