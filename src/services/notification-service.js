// L1 기능층 - NotificationService
// 책임: 관리자가 보낸 알림을 저장하고, 특정 작업자가 받아야 할 알림만 골라주는 것.
// 대피 판단과는 별개다. 화재 경보는 EvacuationService/FireAlertOverlay가 담당한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.NotificationService = (function () {
  var NotificationRepo = window.App.Repositories.NotificationRepository;
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var WorkZoneRepo = window.App.Repositories.WorkZoneRepository;
  var AdminRepo = window.App.Repositories.AdminRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;
  var LEVELS = window.App.Constants.NOTIFICATION_LEVELS;
  var MESSAGE = window.App.Constants.MESSAGE;

  var MAX_MESSAGE_LENGTH = 200;

  function send(input) {
    var traceId = input.traceId;
    var admin = AdminRepo.getById(input.adminId);
    if (!admin) {
      return { ok: false, error: ErrorHandler.handle('ADMIN_NOT_FOUND', traceId, { adminId: input.adminId }) };
    }

    var message = String(input.message || '').trim();
    if (!message) {
      return { ok: false, error: { code: 'NOTIFICATION_EMPTY', message: MESSAGE.NOTIFICATION_EMPTY } };
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: { code: 'NOTIFICATION_TOO_LONG', message: MESSAGE.NOTIFICATION_TOO_LONG } };
    }

    var targetWorkZoneId = input.targetWorkZoneId || null;
    if (targetWorkZoneId && !WorkZoneRepo.getById(targetWorkZoneId)) {
      return { ok: false, error: ErrorHandler.handle('WORK_ZONE_NOT_FOUND', traceId, { workZoneId: targetWorkZoneId }) };
    }

    var level = input.level === LEVELS.IMPORTANT ? LEVELS.IMPORTANT : LEVELS.NORMAL;
    var notification = {
      id: 'noti_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      message: message,
      level: level,
      targetWorkZoneId: targetWorkZoneId,
      createdByAdminId: admin.id,
      createdAt: new Date().toISOString()
    };

    var result = NotificationRepo.add(notification);
    if (!result.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }

    Logger.log(
      'admin.notification.sent',
      'admin',
      admin.id,
      { notificationId: notification.id, targetWorkZoneId: targetWorkZoneId, level: level },
      '작업자 알림 발송',
      traceId
    );

    return { ok: true, notification: notification, recipientCount: countRecipients(targetWorkZoneId) };
  }

  function countRecipients(targetWorkZoneId) {
    var onSite = WorkerRepo.getOnSite();
    if (!targetWorkZoneId) return onSite.length;
    return onSite.filter(function (w) { return w.currentWorkZoneId === targetWorkZoneId; }).length;
  }

  // 이 작업자가 받아야 할 알림. 전체 대상이거나 지금 있는 구역 대상인 것만.
  function getForWorker(workerId) {
    var worker = WorkerRepo.getById(workerId);
    if (!worker) return [];
    return NotificationRepo.getAll().filter(function (n) {
      if (!n.targetWorkZoneId) return true;
      return n.targetWorkZoneId === worker.currentWorkZoneId;
    });
  }

  function getUnreadForWorker(workerId) {
    return getForWorker(workerId).filter(function (n) {
      return !NotificationRepo.isReadBy(n.id, workerId);
    });
  }

  function acknowledge(input) {
    var traceId = input.traceId;
    var result = NotificationRepo.markRead(input.notificationId, input.workerId);
    if (!result.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, {}) };
    }
    Logger.log(
      'worker.notification.read',
      'worker',
      input.workerId,
      { notificationId: input.notificationId },
      '작업자 알림 확인',
      traceId
    );
    return { ok: true };
  }

  // 관리자 화면용: 최근 알림 + 확인 인원 수
  function getRecentWithReadCount(limit) {
    return NotificationRepo.getRecent(limit).map(function (n) {
      var zone = n.targetWorkZoneId ? WorkZoneRepo.getById(n.targetWorkZoneId) : null;
      return {
        id: n.id,
        message: n.message,
        level: n.level,
        targetLabel: zone ? zone.name : '전체',
        createdAt: n.createdAt,
        readCount: NotificationRepo.countReads(n.id),
        recipientCount: countRecipients(n.targetWorkZoneId)
      };
    });
  }

  return {
    send: send,
    getForWorker: getForWorker,
    getUnreadForWorker: getUnreadForWorker,
    acknowledge: acknowledge,
    getRecentWithReadCount: getRecentWithReadCount,
    MAX_MESSAGE_LENGTH: MAX_MESSAGE_LENGTH
  };
})();
