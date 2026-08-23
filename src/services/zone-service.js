// L1 기능층 - ZoneService
// 책임: 작업자의 QR 스캔을 작업구역 등록으로 변환하는 것만 한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.ZoneService = (function () {
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var WorkZoneRepo = window.App.Repositories.WorkZoneRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;

  function registerWorkerZone(input) {
    var workerId = input.workerId;
    var qrValue = input.qrValue;
    var traceId = input.traceId;

    Logger.log('worker.qr.scanned', 'worker', workerId, { qrValue: qrValue }, 'QR 스캔', traceId);

    var worker = WorkerRepo.getById(workerId);
    if (!worker) {
      return { ok: false, error: ErrorHandler.handle('WORKER_NOT_FOUND', traceId, { workerId: workerId }) };
    }

    var workZone = WorkZoneRepo.findByQrValue(qrValue);
    if (!workZone) {
      return { ok: false, error: ErrorHandler.handle('INVALID_QR', traceId, { qrValue: qrValue }) };
    }

    var previousWorkZoneId = worker.currentWorkZoneId;
    var registeredAt = new Date().toISOString();
    var updateResult = WorkerRepo.update(workerId, {
      currentWorkZoneId: workZone.id,
      lastQrScannedAt: registeredAt
    });

    if (!updateResult.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, { workerId: workerId }) };
    }

    Logger.log(
      'worker.zone.registered',
      'worker',
      workerId,
      { workZoneId: workZone.id, previousWorkZoneId: previousWorkZoneId, registeredAt: registeredAt },
      '작업구역 등록',
      traceId
    );

    return {
      ok: true,
      worker: updateResult.worker,
      workZone: workZone,
      registeredAt: registeredAt
    };
  }

  return { registerWorkerZone: registerWorkerZone };
})();
