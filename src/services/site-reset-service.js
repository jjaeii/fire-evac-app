// L1 기능층 - SiteResetService
// 책임: 다음 회차를 깨끗한 상태에서 시작할 수 있도록 현장 기록을 비우는 것.
//
// 연습이나 이전 시연에서 남은 인원·알림·확인 기록이 그대로 보이면 혼란스럽다.
// 계정 자체는 지우지 않는다. 같은 이름·생년월일로 다시 로그인할 수 있다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.SiteResetService = (function () {
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var EmergencyRepo = window.App.Repositories.EmergencyRepository;
  var BlockedRouteRepo = window.App.Repositories.BlockedRouteRepository;
  var SiteResetRepo = window.App.Repositories.SiteResetRepository;
  var AdminRepo = window.App.Repositories.AdminRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var EMERGENCY_STATUS = window.App.Constants.EMERGENCY_STATUS;

  // 초기화를 누른 관리자 본인은 로그인 상태를 유지한다. 바로 이어서 진행해야 하기 때문이다.
  function resetSite(input) {
    var traceId = input.traceId;
    var admin = AdminRepo.getById(input.adminId);
    if (!admin) {
      return { ok: false, error: ErrorHandler.handle('ADMIN_NOT_FOUND', traceId, { adminId: input.adminId }) };
    }

    var emergency = EmergencyRepo.get();

    // 1) 화재 상태를 정상으로
    var restored = Object.assign({}, emergency, {
      status: EMERGENCY_STATUS.NORMAL,
      fireStage: FIRE_STAGES.NONE,
      affectedWorkZoneId: null,
      message: '',
      isActive: false,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!EmergencyRepo.save(restored)) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    // 2) 사용 불가 대피로 해제
    BlockedRouteRepo.clearForEmergency(emergency.id);

    // 3) 현장 인원 비우기 (누른 관리자 본인은 유지)
    var cleared = WorkerRepo.clearAllOnSite(input.keepWorkerId || null);

    // 4) 이 시각 이전의 알림·확인 기록은 지난 회차로 표시
    var marked = SiteResetRepo.save(admin.id);
    if (!marked.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    Logger.log(
      'admin.site.reset',
      'admin',
      admin.id,
      { clearedWorkers: cleared.clearedCount, clearedAt: marked.record.clearedAt },
      '현장 초기화',
      traceId
    );

    return { ok: true, clearedCount: cleared.clearedCount, clearedAt: marked.record.clearedAt };
  }

  return { resetSite: resetSite };
})();
