// L2 자료층 - NotificationRepository
// 관리자가 보낸 알림과, 작업자가 그 알림을 확인했는지를 저장한다.
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.NotificationRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'notifications';
  var READ_KEY = 'notification_reads';
  var MAX_KEEP = 100;

  // [{ id, message, level, targetWorkZoneId(null=전체), createdByAdminId, createdAt }]
  function getAll() {
    return Storage.read(KEY, []);
  }

  function add(notification) {
    var all = getAll();
    all.push(notification);
    if (all.length > MAX_KEEP) all = all.slice(all.length - MAX_KEEP);
    var ok = Storage.write(KEY, all);
    return { ok: ok, notification: notification };
  }

  function getRecent(limit) {
    var all = getAll().slice();
    all.reverse();
    return all.slice(0, limit || 20);
  }

  // [{ notificationId, workerId, readAt }]
  function getReads() {
    return Storage.read(READ_KEY, []);
  }

  function markRead(notificationId, workerId) {
    var reads = getReads();
    var already = reads.some(function (r) { return r.notificationId === notificationId && r.workerId === workerId; });
    if (already) return { ok: true };
    reads.push({ notificationId: notificationId, workerId: workerId, readAt: new Date().toISOString() });
    return { ok: Storage.write(READ_KEY, reads) };
  }

  function isReadBy(notificationId, workerId) {
    return getReads().some(function (r) { return r.notificationId === notificationId && r.workerId === workerId; });
  }

  function countReads(notificationId) {
    return getReads().filter(function (r) { return r.notificationId === notificationId; }).length;
  }

  return {
    getAll: getAll,
    add: add,
    getRecent: getRecent,
    getReads: getReads,
    markRead: markRead,
    isReadBy: isReadBy,
    countReads: countReads
  };
})();
