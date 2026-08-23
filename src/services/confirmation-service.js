// L1 기능층 - ConfirmationService
// 책임: 작업자의 안내 확인 또는 대피 확인 기록만 처리한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.ConfirmationService = (function () {
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var ConfirmationRepo = window.App.Repositories.WorkerConfirmationRepository;
  var EmergencyRepo = window.App.Repositories.EmergencyRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;
  var CONFIRM_TYPES = window.App.Constants.CONFIRM_TYPES;

  var VALID_TYPES = Object.keys(CONFIRM_TYPES).map(function (k) { return CONFIRM_TYPES[k]; });

  function confirmWorkerAction(input) {
    var traceId = input.traceId;
    var worker = WorkerRepo.getById(input.workerId);
    if (!worker) {
      return { ok: false, error: ErrorHandler.handle('WORKER_NOT_FOUND', traceId, { workerId: input.workerId }) };
    }
    var emergency = EmergencyRepo.get();
    if (!emergency || emergency.id !== input.emergencyId) {
      return { ok: false, error: ErrorHandler.handle('EMERGENCY_NOT_FOUND', traceId, { emergencyId: input.emergencyId }) };
    }
    if (VALID_TYPES.indexOf(input.confirmType) === -1) {
      return { ok: false, error: ErrorHandler.handle('INVALID_CONFIRM_TYPE', traceId, { confirmType: input.confirmType }) };
    }

    var confirmedAt = new Date().toISOString();
    var confirmation = {
      id: 'confirm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      workerId: input.workerId,
      emergencyId: input.emergencyId,
      confirmType: input.confirmType,
      confirmedAt: confirmedAt,
      workZoneIdAtConfirm: worker.currentWorkZoneId
    };

    var addResult = ConfirmationRepo.add(confirmation);
    if (!addResult.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    WorkerRepo.update(input.workerId, { currentConfirmStatus: input.confirmType });

    Logger.log(
      'worker.confirmation.submitted',
      'worker',
      input.workerId,
      { emergencyId: input.emergencyId, confirmType: input.confirmType },
      '작업자 확인',
      traceId
    );

    return { ok: true, confirmation: confirmation };
  }

  return { confirmWorkerAction: confirmWorkerAction };
})();
