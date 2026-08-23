// L1 기능층 - AdminStatusService
// 책임: 작업구역별 작업자와 대피 확인 현황을 조회하는 것만 한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.AdminStatusService = (function () {
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var WorkZoneRepo = window.App.Repositories.WorkZoneRepository;
  var ConfirmationRepo = window.App.Repositories.WorkerConfirmationRepository;
  var EmergencyRepo = window.App.Repositories.EmergencyRepository;
  var SiteResetRepo = window.App.Repositories.SiteResetRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;
  var CONFIRM_TYPE_LABELS = window.App.Constants.CONFIRM_TYPE_LABELS;

  function getWorkerEvacuationStatus(input) {
    var traceId = input.traceId;
    var emergency = EmergencyRepo.get();
    if (!emergency || emergency.id !== input.emergencyId) {
      return { ok: false, error: ErrorHandler.handle('EMERGENCY_NOT_FOUND', traceId, { emergencyId: input.emergencyId }) };
    }

    // 도면·현황판은 현장에 입장해 있는 작업자만 다룬다.
    var workers = WorkerRepo.getOnSite();
    if (input.workZoneId) {
      workers = workers.filter(function (w) { return w.currentWorkZoneId === input.workZoneId; });
    }

    var rows = workers.map(function (w) {
      var zone = w.currentWorkZoneId ? WorkZoneRepo.getById(w.currentWorkZoneId) : null;
      var latestConfirmation = ConfirmationRepo.getLatestForWorker(w.id, emergency.id);
      // 지난 회차(초기화 이전)의 확인 기록은 이번 현황에 넣지 않는다.
      if (latestConfirmation && SiteResetRepo.isBeforeReset(latestConfirmation.confirmedAt)) {
        latestConfirmation = null;
      }
      var status = latestConfirmation ? latestConfirmation.confirmType : 'none';
      return {
        workerId: w.id,
        workerName: w.name,
        department: w.department || '',
        birthDate: w.birthDate || null,
        workZoneId: w.currentWorkZoneId || null,
        workZoneName: zone ? zone.name : '미등록',
        lastQrScannedAt: w.lastQrScannedAt || null,
        confirmStatus: status,
        confirmStatusLabel: CONFIRM_TYPE_LABELS[status] || '미확인',
        confirmedAt: latestConfirmation ? latestConfirmation.confirmedAt : null
      };
    });

    Logger.log(
      'admin.status.viewed',
      'admin',
      input.adminId || null,
      { emergencyId: input.emergencyId, workZoneId: input.workZoneId || null },
      '관리자 현황 조회',
      traceId
    );

    return { ok: true, rows: rows };
  }

  return { getWorkerEvacuationStatus: getWorkerEvacuationStatus };
})();
