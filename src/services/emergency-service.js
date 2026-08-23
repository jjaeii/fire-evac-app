// L1 기능층 - EmergencyService
// 책임: 비상상황 상태 변경, 사용 불가 대피로 변경, 비상상황 해제만 담당한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.EmergencyService = (function () {
  var EmergencyRepo = window.App.Repositories.EmergencyRepository;
  var BlockedRouteRepo = window.App.Repositories.BlockedRouteRepository;
  var AdminRepo = window.App.Repositories.AdminRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var EMERGENCY_STATUS = window.App.Constants.EMERGENCY_STATUS;

  var VALID_STAGES = Object.keys(FIRE_STAGES).map(function (k) { return FIRE_STAGES[k]; });

  function createOrUpdateEmergency(input) {
    var traceId = input.traceId;
    var admin = AdminRepo.getById(input.adminId);
    if (!admin) {
      return { ok: false, error: ErrorHandler.handle('ADMIN_NOT_FOUND', traceId, { adminId: input.adminId }) };
    }
    if (VALID_STAGES.indexOf(input.fireStage) === -1) {
      return { ok: false, error: ErrorHandler.handle('INVALID_STAGE', traceId, { fireStage: input.fireStage }) };
    }
    if (input.status === EMERGENCY_STATUS.ACTIVE && !input.affectedWorkZoneId) {
      return { ok: false, error: ErrorHandler.handle('WORK_ZONE_REQUIRED', traceId, {}) };
    }

    var current = EmergencyRepo.get();
    var updated = Object.assign({}, current, {
      status: input.status,
      fireStage: input.fireStage,
      affectedWorkZoneId: input.affectedWorkZoneId || null,
      message: input.message || '',
      isActive: input.status === EMERGENCY_STATUS.ACTIVE,
      createdByAdminId: input.adminId,
      updatedAt: new Date().toISOString()
    });

    var saved = EmergencyRepo.save(updated);
    if (!saved) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    Logger.log(
      'emergency.stage.changed',
      'admin',
      input.adminId,
      { status: input.status, fireStage: input.fireStage, affectedWorkZoneId: input.affectedWorkZoneId },
      '관리자 상태 입력',
      traceId
    );

    if (input.fireStage === FIRE_STAGES.MAJOR_FIRE) {
      Logger.log(
        'admin.signal.call119Needed',
        'system',
        null,
        { emergencyId: updated.id, affectedWorkZoneId: input.affectedWorkZoneId },
        '대형화재 - 119 신고 필요 신호',
        traceId
      );
    }

    return { ok: true, emergency: updated };
  }

  function updateBlockedRoutes(input) {
    var traceId = input.traceId;
    var emergency = EmergencyRepo.get();
    if (!emergency || emergency.id !== input.emergencyId) {
      return { ok: false, error: ErrorHandler.handle('EMERGENCY_NOT_FOUND', traceId, { emergencyId: input.emergencyId }) };
    }
    var admin = AdminRepo.getById(input.adminId);
    if (!admin) {
      return { ok: false, error: ErrorHandler.handle('ADMIN_NOT_FOUND', traceId, { adminId: input.adminId }) };
    }

    var result = BlockedRouteRepo.replaceForEmergency(input.emergencyId, input.blockedRouteIds || [], input.reason, input.adminId);
    if (!result.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    Logger.log(
      'emergency.blockedRoutes.changed',
      'admin',
      input.adminId,
      { emergencyId: input.emergencyId, blockedRouteIds: input.blockedRouteIds || [] },
      '사용 불가 대피로 입력',
      traceId
    );

    return { ok: true, blockedRoutes: result.blockedRoutes };
  }

  function resolveEmergency(input) {
    var traceId = input.traceId;
    var current = EmergencyRepo.get();
    if (!current || current.id !== input.emergencyId) {
      return { ok: false, error: ErrorHandler.handle('EMERGENCY_NOT_FOUND', traceId, { emergencyId: input.emergencyId }) };
    }
    var admin = AdminRepo.getById(input.adminId);
    if (!admin) {
      return { ok: false, error: ErrorHandler.handle('ADMIN_NOT_FOUND', traceId, { adminId: input.adminId }) };
    }

    var MESSAGE = window.App.Constants.MESSAGE;
    var restoreMessageMap = {
      situation_resolved: MESSAGE.RESOLVED_SITUATION,
      fire_suppressed: MESSAGE.RESOLVED_FIRE_SUPPRESSED,
      normal_restored: MESSAGE.RESOLVED_NORMAL
    };
    var restoreMessage = restoreMessageMap[input.restoreType] || MESSAGE.RESOLVED_NORMAL;

    var updated = Object.assign({}, current, {
      status: EMERGENCY_STATUS.NORMAL,
      fireStage: FIRE_STAGES.NONE,
      isActive: false,
      message: restoreMessage,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    var saved = EmergencyRepo.save(updated);
    if (!saved) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    BlockedRouteRepo.clearForEmergency(input.emergencyId);

    Logger.log(
      'emergency.resolved',
      'admin',
      input.adminId,
      { emergencyId: input.emergencyId, restoreType: input.restoreType },
      '진압 완료 또는 정상 복구',
      traceId
    );

    return { ok: true, emergency: updated, restoreMessage: restoreMessage };
  }

  return {
    createOrUpdateEmergency: createOrUpdateEmergency,
    updateBlockedRoutes: updateBlockedRoutes,
    resolveEmergency: resolveEmergency
  };
})();
