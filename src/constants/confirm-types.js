// L3 기반층 - 작업자 확인 타입 상수
window.App = window.App || {};
window.App.Constants = window.App.Constants || {};

window.App.Constants.CONFIRM_TYPES = Object.freeze({
  NOTICE_ACKNOWLEDGED: 'notice_acknowledged',
  EVACUATION_CONFIRMED: 'evacuation_confirmed',
  RESTORE_ACKNOWLEDGED: 'restore_acknowledged'
});

window.App.Constants.CONFIRM_TYPE_LABELS = Object.freeze({
  none: '미확인',
  notice_acknowledged: '안내 확인함',
  evacuation_confirmed: '대피 확인함',
  restore_acknowledged: '복구 확인함'
});
