// L1 기능층 - WorkerIdentityService
// 책임: 작업자의 회원가입 / 로그인 / 로그아웃만 처리한다. 대피 판단은 하지 않는다.
// 가입 항목은 이름과 생년월일뿐이다. 이 둘의 조합을 계정 식별자로 쓴다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.WorkerIdentityService = (function () {
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var SessionRepo = window.App.Repositories.SessionRepository;
  var Logger = window.App.Foundation.Logger;
  var ErrorHandler = window.App.Foundation.ErrorHandler;
  var MESSAGE = window.App.Constants.MESSAGE;

  var MAX_NAME_LENGTH = 20;
  var MIN_BIRTH_YEAR = 1930;

  function newWorkerId() {
    return 'worker_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  // 'YYYY-MM-DD' 형태만 받는다(<input type="date">가 주는 형식).
  function validateBirthDate(birthDate) {
    var value = String(birthDate || '').trim();
    if (!value) return { ok: false, message: MESSAGE.BIRTH_REQUIRED };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, message: MESSAGE.BIRTH_INVALID };

    var parts = value.split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    var d = new Date(year, month - 1, day);
    var isRealDate = d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    if (!isRealDate || year < MIN_BIRTH_YEAR) return { ok: false, message: MESSAGE.BIRTH_INVALID };

    var today = new Date();
    today.setHours(23, 59, 59, 999);
    if (d.getTime() > today.getTime()) return { ok: false, message: MESSAGE.BIRTH_FUTURE };

    return { ok: true, value: value };
  }

  function validateCredentials(name, birthDate) {
    var cleanName = normalizeName(name);
    if (!cleanName) return { ok: false, error: { code: 'NAME_REQUIRED', message: MESSAGE.NAME_REQUIRED } };
    if (cleanName.length > MAX_NAME_LENGTH) return { ok: false, error: { code: 'NAME_TOO_LONG', message: MESSAGE.NAME_TOO_LONG } };

    var birth = validateBirthDate(birthDate);
    if (!birth.ok) return { ok: false, error: { code: 'BIRTH_INVALID', message: birth.message } };

    return { ok: true, name: cleanName, birthDate: birth.value };
  }

  function startSession(worker, traceId, eventName, logMessage) {
    var result = WorkerRepo.update(worker.id, {
      isOnSite: true,
      lastLoginAt: new Date().toISOString(),
      loggedOutAt: null,
      currentWorkZoneId: null,
      lastQrScannedAt: null,
      currentConfirmStatus: 'none'
    });
    if (!result.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, { workerId: worker.id }) };
    }
    SessionRepo.setCurrentWorker(worker.id);
    Logger.log(eventName, 'worker', worker.id, { name: worker.name }, logMessage, traceId);
    return { ok: true, worker: result.worker };
  }

  // 회원가입. 성공하면 그대로 로그인된 상태가 된다(자동 로그인).
  function signUp(input) {
    var traceId = input.traceId;
    var check = validateCredentials(input.name, input.birthDate);
    if (!check.ok) return check;

    var existing = WorkerRepo.findByNameAndBirth(check.name, check.birthDate);
    if (existing) {
      // 같은 사람이 다시 가입을 누른 경우. 새 계정을 만들지 않고 그 계정으로 들어간다.
      var reentry = startSession(existing, traceId, 'worker.loggedIn', '작업자 로그인');
      if (!reentry.ok) return reentry;
      return { ok: true, worker: reentry.worker, wasExisting: true, notice: MESSAGE.SIGNUP_DUPLICATE };
    }

    var now = new Date().toISOString();
    var created = WorkerRepo.add({
      id: newWorkerId(),
      name: check.name,
      birthDate: check.birthDate,
      isOnSite: true,
      currentWorkZoneId: null,
      lastQrScannedAt: null,
      currentConfirmStatus: 'none',
      registeredAt: now,
      lastLoginAt: now,
      loggedOutAt: null,
      createdAt: now
    });
    if (!created.ok) {
      return { ok: false, error: ErrorHandler.handle('STORAGE_WRITE_FAILED', traceId, { name: check.name }) };
    }

    SessionRepo.setCurrentWorker(created.worker.id);
    Logger.log(
      'worker.signedUp',
      'worker',
      created.worker.id,
      { name: check.name, birthDate: check.birthDate },
      '작업자 회원가입',
      traceId
    );

    return { ok: true, worker: created.worker, wasExisting: false };
  }

  // 이미 가입한 사람이 다른 기기나 로그아웃 이후에 다시 들어올 때.
  function logIn(input) {
    var traceId = input.traceId;
    var check = validateCredentials(input.name, input.birthDate);
    if (!check.ok) return check;

    var worker = WorkerRepo.findByNameAndBirth(check.name, check.birthDate);
    if (!worker) {
      return { ok: false, error: { code: 'LOGIN_NOT_FOUND', message: MESSAGE.LOGIN_NOT_FOUND } };
    }
    return startSession(worker, traceId, 'worker.loggedIn', '작업자 로그인');
  }

  function logOut(input) {
    var traceId = input.traceId;
    var worker = WorkerRepo.getById(input.workerId);
    if (!worker) {
      SessionRepo.clear();
      return { ok: true, worker: null };
    }

    var result = WorkerRepo.update(worker.id, {
      isOnSite: false,
      loggedOutAt: new Date().toISOString(),
      currentWorkZoneId: null
    });
    SessionRepo.clear();

    Logger.log('worker.loggedOut', 'worker', worker.id, { name: worker.name }, '작업자 로그아웃', traceId);
    return { ok: result.ok, worker: result.worker };
  }

  // 새로고침·앱 재실행 후에도 로그인 상태를 잇는다(자동 로그인).
  function getCurrentWorker() {
    var session = SessionRepo.get();
    if (!session.currentWorkerId) return null;
    var worker = WorkerRepo.getById(session.currentWorkerId);
    if (!worker || !worker.isOnSite) {
      SessionRepo.clear();
      return null;
    }
    return worker;
  }

  function hasAnyAccount() {
    return WorkerRepo.getAll().length > 0;
  }

  function formatBirthDate(birthDate) {
    if (!birthDate) return '-';
    return String(birthDate).replace(/-/g, '.');
  }

  return {
    signUp: signUp,
    logIn: logIn,
    logOut: logOut,
    getCurrentWorker: getCurrentWorker,
    hasAnyAccount: hasAnyAccount,
    formatBirthDate: formatBirthDate,
    MAX_NAME_LENGTH: MAX_NAME_LENGTH
  };
})();
