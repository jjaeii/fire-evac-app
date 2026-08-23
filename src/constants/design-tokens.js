// L3 기반층 - 디자인 토큰 키
// 실제 색상 값은 styles.css의 CSS 변수에서만 관리한다 (색상 HEX 직접 반복 금지).
window.App = window.App || {};
window.App.Constants = window.App.Constants || {};

window.App.Constants.COLORS = Object.freeze({
  STATUS_NORMAL: 'status-normal',
  STATUS_CAUTION: 'status-caution',
  STATUS_DANGER: 'status-danger',
  STATUS_NEUTRAL: 'status-neutral'
});

// 화재 단계별 상태 색상 매핑 (색상만으로 구분하지 않고 텍스트 라벨을 항상 함께 표시)
window.App.Constants.FIRE_STAGE_COLOR_KEY = Object.freeze({
  none: window.App.Constants.COLORS.STATUS_NORMAL,
  anomaly: window.App.Constants.COLORS.STATUS_CAUTION,
  initial_fire: window.App.Constants.COLORS.STATUS_CAUTION,
  spreading_fire: window.App.Constants.COLORS.STATUS_DANGER,
  major_fire: window.App.Constants.COLORS.STATUS_DANGER
});
