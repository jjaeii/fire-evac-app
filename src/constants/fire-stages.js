// L3 기반층 - 화재 단계 상수
// 하드코딩 금지 원칙에 따라 화재 단계 문자열은 이 파일에서만 정의한다.
window.App = window.App || {};
window.App.Constants = window.App.Constants || {};

window.App.Constants.FIRE_STAGES = Object.freeze({
  NONE: 'none',
  ANOMALY: 'anomaly',
  INITIAL_FIRE: 'initial_fire',
  SPREADING_FIRE: 'spreading_fire',
  MAJOR_FIRE: 'major_fire'
});

window.App.Constants.FIRE_STAGE_LABELS = Object.freeze({
  none: '정상',
  anomaly: '이상징후',
  initial_fire: '초기화재',
  spreading_fire: '확대화재',
  major_fire: '대형화재'
});

window.App.Constants.EMERGENCY_STATUS = Object.freeze({
  NORMAL: 'normal',
  ACTIVE: 'active',
  RESOLVED: 'resolved'
});
