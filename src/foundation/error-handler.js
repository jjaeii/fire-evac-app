// L3 기반층 - ErrorHandler
// 에러 처리는 여기서만 한다. 컴포넌트는 에러 코드를 문구로 바꾸지 않는다.
window.App = window.App || {};
window.App.Foundation = window.App.Foundation || {};

window.App.Foundation.ErrorHandler = (function () {
  var MESSAGE = window.App.Constants.MESSAGE;

  var CODE_TO_MESSAGE = {
    INVALID_QR: MESSAGE.INVALID_QR,
    WORK_ZONE_NOT_FOUND: MESSAGE.INVALID_QR,
    WORKER_NOT_FOUND: MESSAGE.INVALID_QR,
    WORKER_ZONE_MISSING: MESSAGE.PENDING_ZONE,
    EMERGENCY_STAGE_MISSING: MESSAGE.PENDING_STAGE,
    NO_AVAILABLE_ROUTE: MESSAGE.NO_ROUTE,
    STORAGE_WRITE_FAILED: MESSAGE.SAVE_FAILED,
    WORK_ZONE_REQUIRED: MESSAGE.WORK_ZONE_REQUIRED,
    EMERGENCY_NOT_FOUND: '비상상황 정보를 찾을 수 없습니다.',
    ADMIN_NOT_FOUND: '관리자 정보를 찾을 수 없습니다.',
    ROUTE_NOT_FOUND: '대피로 정보를 찾을 수 없습니다.',
    INVALID_CONFIRM_TYPE: '허용되지 않은 확인 유형입니다.'
  };

  function toUserMessage(code) {
    return CODE_TO_MESSAGE[code] || '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
  }

  function handle(code, traceId, context) {
    window.App.Foundation.Logger.log(
      'error.' + code.toLowerCase(),
      'system',
      null,
      context || {},
      code,
      traceId
    );
    return { code: code, message: toUserMessage(code) };
  }

  return { handle: handle, toUserMessage: toUserMessage };
})();
