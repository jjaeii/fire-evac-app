// main.js - 라우터와 초기 연결 역할만 한다. 판단 로직과 저장 로직을 여기 두지 않는다.
(function () {
  var TraceIdFactory = window.App.Foundation.TraceIdFactory;
  var EnvConfig = window.App.Foundation.EnvConfig;
  var Alarm = window.App.Foundation.AlarmSound;
  var esc = window.App.Foundation.HtmlEscape.escape;
  var AppState = window.App.Services.AppStateService;
  var Storage = window.App.Adapters.LocalStorageAdapter;

  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var WorkZoneRepo = window.App.Repositories.WorkZoneRepository;
  var RouteRepo = window.App.Repositories.EvacuationRouteRepository;
  var EmergencyRepo = window.App.Repositories.EmergencyRepository;
  var BlockedRouteRepo = window.App.Repositories.BlockedRouteRepository;
  var AdminRepo = window.App.Repositories.AdminRepository;
  var LogRepo = window.App.Repositories.LogRepository;
  var QrMappingRepo = window.App.Repositories.QrMappingRepository;

  var ZoneService = window.App.Services.ZoneService;
  var EmergencyService = window.App.Services.EmergencyService;
  var EvacuationService = window.App.Services.EvacuationService;
  var ConfirmationService = window.App.Services.ConfirmationService;
  var AdminStatusService = window.App.Services.AdminStatusService;
  var WorkerIdentity = window.App.Services.WorkerIdentityService;
  var NotificationService = window.App.Services.NotificationService;
  var CameraPermission = window.App.Services.CameraPermissionService;
  var SyncService = window.App.Services.SyncService;

  var CameraPermissionGate = window.App.Components.CameraPermissionGate;
  var AuthGate = window.App.Components.AuthGate;
  var NotificationBanner = window.App.Components.NotificationBanner;
  var QRScanPanel = window.App.Components.QRScanPanel;
  var QrScannerOverlay = window.App.Components.QrScannerOverlay;
  var WorkZoneStatusCard = window.App.Components.WorkZoneStatusCard;
  var SafetyMessageBox = window.App.Components.SafetyMessageBox;
  var EvacuationInfoPanel = window.App.Components.EvacuationInfoPanel;
  var WorkerConfirmButton = window.App.Components.WorkerConfirmButton;
  var FireAlertOverlay = window.App.Components.FireAlertOverlay;
  var EmergencyStageSelector = window.App.Components.EmergencyStageSelector;
  var FloorPlanPanel = window.App.Components.FloorPlanPanel;
  var EmergencyCallPanel = window.App.Components.EmergencyCallPanel;
  var AdminNotifyPanel = window.App.Components.AdminNotifyPanel;
  var BlockedRouteSelector = window.App.Components.BlockedRouteSelector;
  var WorkerEvacuationTable = window.App.Components.WorkerEvacuationTable;
  var ZoneQrBindingPanel = window.App.Components.ZoneQrBindingPanel;
  var RestoreStatusButton = window.App.Components.RestoreStatusButton;
  var LogPanel = window.App.Components.LogPanel;

  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var MESSAGE = window.App.Constants.MESSAGE;
  var NOTIFICATION_LEVELS = window.App.Constants.NOTIFICATION_LEVELS;
  var TARGET_ALL = window.App.Constants.NOTIFICATION_TARGET_ALL;

  var transientFeedback = { auth: null, qr: null, confirm: null, stage: null, blocked: null, restore: null, qrBind: null, notify: null };
  var authUi = { mode: 'signup', draftName: '', draftBirthDate: '', draftRole: 'worker' };
  var unknownQrValue = null;   // 읽었지만 구역을 모르는 QR
  var callLogged = false;
  var notifyDraft = { target: TARGET_ALL, message: '', level: NOTIFICATION_LEVELS.NORMAL };
  var seenNotificationIds = {}; // workerId -> 마지막으로 소리를 낸 알림 id 집합

  function clearFeedback() {
    transientFeedback = { auth: null, qr: null, confirm: null, stage: null, blocked: null, restore: null, qrBind: null, notify: null };
  }

  // ---------------------------------------------------------------- 카메라 권한 게이트

  var cameraGateFeedback = null;
  var cameraGateBlock = null; // 카메라가 막힌 이유 + 대신 열 수 있는 주소

  function showCameraGate() {
    CameraPermissionGate.show({
      environment: CameraPermission.checkEnvironment(),
      block: cameraGateBlock,
      feedbackMessage: cameraGateFeedback ? cameraGateFeedback.message : null,
      feedbackOk: cameraGateFeedback ? cameraGateFeedback.ok : false,
      onChoose: function (choice) {
        // 사용자의 조작 안에서 브라우저 권한 팝업과 오디오를 함께 열어둔다.
        Alarm.prime();
        var traceId = TraceIdFactory.create();
        CameraPermission.choose(choice, traceId).then(function (result) {
          if (result.ok) {
            cameraGateFeedback = null;
            cameraGateBlock = null;
            CameraPermissionGate.hide();
            renderAll(true);
          } else if (result.error && result.error.code === 'QR_CAMERA_DENIED') {
            cameraGateFeedback = null;
            cameraGateBlock = {
              message: result.error.message,
              reason: result.error.reason,
              alternates: result.error.alternates
            };
            showCameraGate();
          } else {
            cameraGateBlock = null;
            cameraGateFeedback = { ok: false, message: result.error.message };
            showCameraGate();
          }
        });
      },
      onRetry: function () {
        cameraGateBlock = null;
        cameraGateFeedback = null;
        showCameraGate();
      }
    });
  }

  function maybeShowCameraGate() {
    if (!CameraPermission.needsPrompt() || CameraPermissionGate.isShowing()) return;

    // 브라우저가 이미 카메라를 허용해 뒀으면 아무것도 묻지 않는다.
    CameraPermission.adoptBrowserGrant().then(function (adopted) {
      if (adopted) {
        renderAll(true);
        return;
      }
      // 눌러보고 실패하는 대신, 이미 막힌 창이면 처음부터 이유를 보여준다.
      // 대신 열 주소를 정확히 쓰려면 서버 정보를 먼저 받아야 한다.
      CameraPermission.loadServerInfo()
        .then(CameraPermission.precheck)
        .then(function (result) {
          cameraGateBlock = result.block;
          showCameraGate();
        });
    });
  }

  function reopenCameraGate() {
    CameraPermission.reset();
    cameraGateFeedback = null;
    cameraGateBlock = null;
    CameraPermission.loadServerInfo()
      .then(CameraPermission.precheck)
      .then(function (result) {
        cameraGateBlock = result.block;
        showCameraGate();
      });
  }

  function todayIso() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // ---------------------------------------------------------------- 공통 헤더

  // 다른 기기와 현장 상태를 맞추고 있는지 보여준다.
  function renderSyncChip() {
    var s = SyncService.getStatus();
    if (!s.enabled || s.noApi) {
      return '<span class="sync-chip sync-chip-off" title="이 기기 안에서만 저장됩니다">기기 저장</span>';
    }
    if (s.online) {
      var label = s.remote ? '전체 연결됨' : '현장 연결됨';
      return '<span class="sync-chip sync-chip-on" title="다른 기기와 상태를 공유하고 있습니다">' + label + '</span>';
    }
    return '<span class="sync-chip sync-chip-down" title="서버에 연결하지 못했습니다. 이 기기 안에서는 계속 동작합니다">연결 끊김</span>';
  }

  function renderTabs(root) {
    var state = AppState.getCurrentState();
    var currentWorker = WorkerIdentity.getCurrentWorker();

    // 관리자로 가입한 사람만 관리자 화면에 들어간다.
    var canSeeAdmin = WorkerIdentity.isAdmin(currentWorker);

    var html = '<div class="view-tabs">';
    html += '<button class="view-tab' + (state.currentView === 'worker' ? ' active' : '') + '" id="tab-worker">작업자 화면</button>';
    if (canSeeAdmin) {
      html += '<button class="view-tab' + (state.currentView === 'admin' ? ' active' : '') + '" id="tab-admin">관리자 화면</button>';
    }
    html += '</div>';

    html += '<div class="worker-identity-row">';
    if (currentWorker) {
      html += '<span class="worker-identity-chip">' + esc(currentWorker.name) + ' · ' +
        esc(WorkerIdentity.roleLabel(currentWorker)) + '</span>';
    }
    html += renderSyncChip();
    html += '</div>';

    root.innerHTML = html;

    root.querySelector('#tab-worker').addEventListener('click', function () {
      clearFeedback();
      AppState.setView('worker');
      renderAll(true);
    });
    var adminTab = root.querySelector('#tab-admin');
    if (adminTab) {
      adminTab.addEventListener('click', function () {
        clearFeedback();
        AppState.setView('admin');
        renderAll(true);
      });
    }
  }

  // ---------------------------------------------------------------- 회원가입 / 로그인

  function renderAuthGate(root) {
    var emergency = EmergencyRepo.get();

    root.innerHTML = '';

    // 로그인 전이라도 진행 중인 화재는 알려야 한다.
    if (FireAlertOverlay.shouldAlert(emergency)) {
      var zone = emergency.affectedWorkZoneId ? WorkZoneRepo.getById(emergency.affectedWorkZoneId) : null;
      var strip = document.createElement('div');
      strip.className = 'entry-fire-strip';
      strip.innerHTML = '화재 발생 중 · ' + esc(zone ? zone.name : '구역 확인 중') + ' · 안전관리자 지시에 따르세요';
      root.appendChild(strip);
    }

    var gateContainer = document.createElement('div');
    root.appendChild(gateContainer);

    AuthGate.render(gateContainer, {
      mode: authUi.mode,
      draftName: authUi.draftName,
      draftBirthDate: authUi.draftBirthDate,
      today: todayIso(),
      feedbackMessage: transientFeedback.auth ? transientFeedback.auth.message : null,
      feedbackOk: transientFeedback.auth ? transientFeedback.auth.ok : null,
      onModeChange: function (mode) {
        authUi.mode = mode;
        transientFeedback.auth = null;
        renderAll(true);
      },
      draftRole: authUi.draftRole,
      onDraftChange: function (field, value) {
        if (field === 'name') authUi.draftName = value;
        else if (field === 'birthDate') authUi.draftBirthDate = value;
        else if (field === 'role') { authUi.draftRole = value; renderAll(true); }
      },
      onSubmit: function (input) {
        authUi.draftName = input.name;
        authUi.draftBirthDate = input.birthDate;

        // 사용자의 조작 시점에 소리·알림 권한을 미리 열어둔다.
        Alarm.prime();
        requestNotificationPermission();

        var traceId = TraceIdFactory.create();
        var result = input.mode === 'signup'
          ? WorkerIdentity.signUp({ name: input.name, birthDate: input.birthDate, role: input.role, traceId: traceId })
          : WorkerIdentity.logIn({ name: input.name, birthDate: input.birthDate, traceId: traceId });

        if (result.ok) {
          authUi.draftName = '';
          authUi.draftBirthDate = '';
          transientFeedback.auth = result.notice ? { ok: true, message: result.notice } : null;
          // 로그인 직후에는 이미 와 있던 알림으로 소리를 내지 않는다.
          markAllNotificationsSeen(result.worker.id);
          // 관리자는 관리자 화면으로 바로 들어간다.
          AppState.setView(WorkerIdentity.isAdmin(result.worker) ? 'admin' : 'worker');
        } else {
          transientFeedback.auth = { ok: false, message: result.error.message };
        }
        renderAll(true);
      }
    });
  }

  // ---------------------------------------------------------------- 알림 도착 처리

  function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) { /* 권한 요청 실패해도 앱 내 알림은 뜬다 */ }
    }
  }

  function markAllNotificationsSeen(workerId) {
    var seen = seenNotificationIds[workerId] || {};
    NotificationService.getForWorker(workerId).forEach(function (n) { seen[n.id] = true; });
    seenNotificationIds[workerId] = seen;
  }

  // 새로 도착한 알림에만 소리·진동·기기 알림을 낸다(이미 본 것은 조용히 표시만).
  function handleIncomingNotifications(workerId, unread) {
    var seen = seenNotificationIds[workerId] || {};
    var fresh = unread.filter(function (n) { return !seen[n.id]; });
    fresh.forEach(function (n) { seen[n.id] = true; });
    seenNotificationIds[workerId] = seen;

    if (fresh.length === 0) return;

    Alarm.chime();
    Alarm.vibrate();

    if ('Notification' in window && Notification.permission === 'granted') {
      fresh.forEach(function (n) {
        try {
          new Notification(MESSAGE.NOTIFICATION_NEW, { body: n.message, tag: n.id });
        } catch (e) { /* 기기 알림이 막혀 있어도 앱 안에서는 보인다 */ }
      });
    }
  }

  // ---------------------------------------------------------------- 작업자 화면

  function renderWorkerView(root) {
    var worker = WorkerIdentity.getCurrentWorker();
    if (!worker) {
      FireAlertOverlay.hide();
      renderAuthGate(root);
      return;
    }

    var requestedWorkZoneId = worker.currentWorkZoneId;
    var workZone = worker.currentWorkZoneId ? WorkZoneRepo.getById(worker.currentWorkZoneId) : null;
    var emergency = EmergencyRepo.get();

    root.innerHTML = '';

    // 관리자 알림 (화재 경보와 별개)
    var unread = NotificationService.getUnreadForWorker(worker.id);
    handleIncomingNotifications(worker.id, unread);

    var notiContainer = document.createElement('div');
    root.appendChild(notiContainer);
    var unreadIds = {};
    unread.forEach(function (n) { unreadIds[n.id] = true; });
    NotificationBanner.render(notiContainer, {
      unread: unread.map(function (n) {
        var z = n.targetWorkZoneId ? WorkZoneRepo.getById(n.targetWorkZoneId) : null;
        return { id: n.id, message: n.message, level: n.level, createdAt: n.createdAt, targetLabel: z ? z.name : '전체' };
      }).reverse(),
      history: NotificationService.getForWorker(worker.id)
        .filter(function (n) { return !unreadIds[n.id]; })
        .slice()
        .reverse()
        .slice(0, 10),
      onAcknowledge: function (notificationId) {
        var traceId = TraceIdFactory.create();
        NotificationService.acknowledge({ notificationId: notificationId, workerId: worker.id, traceId: traceId });
        renderAll(true);
      }
    });

    var statusContainer = document.createElement('div');
    root.appendChild(statusContainer);
    WorkZoneStatusCard.render(statusContainer, {
      worker: worker,
      workZone: workZone,
      onLeave: function () {
        var traceId = TraceIdFactory.create();
        WorkerIdentity.logOut({ workerId: worker.id, traceId: traceId });
        FireAlertOverlay.hide();
        clearFeedback();
        authUi.mode = 'login';
        renderAll(true);
      }
    });

    var qrContainer = document.createElement('div');
    root.appendChild(qrContainer);
    QRScanPanel.render(qrContainer, {
      currentZoneName: workZone ? workZone.name : null,
      workZones: WorkZoneRepo.getAll(),
      unknownQrValue: unknownQrValue,
      feedbackMessage: transientFeedback.qr ? transientFeedback.qr.message : null,
      feedbackOk: transientFeedback.qr ? transientFeedback.qr.ok : null,
      feedbackCode: transientFeedback.qr ? transientFeedback.qr.code : null,
      onScan: function (qrValue) {
        var traceId = TraceIdFactory.create();
        var result = ZoneService.registerWorkerZone({ workerId: worker.id, qrValue: qrValue, traceId: traceId });
        if (result.ok) {
          unknownQrValue = null;
          // 어떤 코드로 인식됐는지 같이 보여준다. 현장 QR을 확인·점검할 때 필요하다.
          transientFeedback.qr = {
            ok: true,
            message: result.workZone.name + '에서 작업 중으로 등록되었습니다.',
            code: String(qrValue || '').trim()
          };
        } else {
          // 읽기는 됐는데 어느 구역인지 모르는 경우 → 화면에서 바로 연결할 수 있게 값을 넘긴다.
          unknownQrValue = result.unknownQrValue || null;
          transientFeedback.qr = { ok: false, message: result.error.message };
        }
        renderAll(true);
      },
      onBindUnknownQr: function (qrValue, zoneId) {
        var traceId = TraceIdFactory.create();
        var zone = WorkZoneRepo.getById(zoneId);
        var bind = QrMappingRepo.bind(qrValue, zoneId, worker.id);
        if (!bind.ok || !zone) {
          transientFeedback.qr = { ok: false, message: MESSAGE.SAVE_FAILED };
          renderAll(true);
          return;
        }
        window.App.Foundation.Logger.log(
          'zoneQr.bound', 'worker', worker.id,
          { qrValue: qrValue, workZoneId: zoneId }, '구역 QR 연결', traceId
        );
        unknownQrValue = null;
        // 연결한 뒤 곧바로 그 구역으로 등록까지 마친다.
        var reg = ZoneService.registerWorkerZone({ workerId: worker.id, qrValue: qrValue, traceId: TraceIdFactory.create() });
        transientFeedback.qr = reg.ok
          ? { ok: true, message: zone.name + ' QR로 등록했습니다. 이제 이 QR은 자동 인식됩니다.' }
          : { ok: false, message: reg.error.message };
        renderAll(true);
      },
      onDecodeError: function (message) {
        unknownQrValue = null;
        transientFeedback.qr = { ok: false, message: message };
        renderAll(true);
      },
      onRequestCameraPermission: reopenCameraGate
    });

    var traceId = TraceIdFactory.create();
    var guidance = EvacuationService.decideWorkerGuidance({ workerId: worker.id, emergencyId: emergency.id, traceId: traceId });

    // 역전 방지: 응답 시점에 작업구역이 바뀌었으면 폐기하고 최신 상태로 다시 계산한다.
    if (EvacuationService.isStaleResponse(worker.id, requestedWorkZoneId)) {
      EvacuationService.discardStaleResponse(worker.id, requestedWorkZoneId, WorkerRepo.getById(worker.id).currentWorkZoneId, traceId);
      var freshTraceId = TraceIdFactory.create();
      guidance = EvacuationService.decideWorkerGuidance({ workerId: worker.id, emergencyId: emergency.id, traceId: freshTraceId });
    }

    var messageContainer = document.createElement('div');
    root.appendChild(messageContainer);
    SafetyMessageBox.render(messageContainer, { guidance: guidance });

    var evacContainer = document.createElement('div');
    root.appendChild(evacContainer);
    EvacuationInfoPanel.render(evacContainer, { guidance: guidance });

    function submitConfirm(confirmType) {
      var cTraceId = TraceIdFactory.create();
      var result = ConfirmationService.confirmWorkerAction({
        workerId: worker.id,
        emergencyId: emergency.id,
        confirmType: confirmType,
        traceId: cTraceId
      });
      if (result.ok) {
        transientFeedback.confirm = { ok: true, message: '확인이 저장되었습니다.' };
      } else {
        transientFeedback.confirm = { ok: false, message: result.error.message };
      }
      renderAll(true);
    }

    if (guidance.decisionStatus === 'ready' && guidance.displayType !== 'normal') {
      var confirmContainer = document.createElement('div');
      root.appendChild(confirmContainer);
      WorkerConfirmButton.render(confirmContainer, {
        guidance: guidance,
        worker: WorkerRepo.getById(worker.id),
        feedbackMessage: transientFeedback.confirm ? transientFeedback.confirm.message : null,
        feedbackOk: transientFeedback.confirm ? transientFeedback.confirm.ok : null,
        onConfirm: submitConfirm
      });
    }

    // 전체 화면 화재경보 (관리자가 화재 단계를 올렸을 때)
    var affectedZone = emergency.affectedWorkZoneId ? WorkZoneRepo.getById(emergency.affectedWorkZoneId) : null;
    FireAlertOverlay.sync({
      emergency: emergency,
      guidance: guidance,
      affectedZoneName: affectedZone ? affectedZone.name : null,
      onAcknowledge: function () {
        var CONFIRM_TYPES = window.App.Constants.CONFIRM_TYPES;
        var type = guidance.displayType === 'control'
          ? CONFIRM_TYPES.NOTICE_ACKNOWLEDGED
          : CONFIRM_TYPES.EVACUATION_CONFIRMED;
        submitConfirm(type);
      }
    });
  }

  // ---------------------------------------------------------------- 관리자 화면

  function computeNoRouteWarningCount(emergency) {
    if (emergency.fireStage !== FIRE_STAGES.SPREADING_FIRE && emergency.fireStage !== FIRE_STAGES.MAJOR_FIRE) {
      return 0;
    }
    if (!emergency.affectedWorkZoneId) return 0;
    var allRoutes = RouteRepo.getByWorkZoneId(emergency.affectedWorkZoneId);
    var blockedIds = BlockedRouteRepo.getForEmergency(emergency.id).map(function (b) { return b.evacuationRouteId; });
    var available = allRoutes.filter(function (r) { return blockedIds.indexOf(r.id) === -1; });
    return available.length === 0 && allRoutes.length > 0 ? 1 : 0;
  }

  function renderAdminView(root) {
    // 로그인한 관리자가 상태 변경·알림 발송의 주체가 된다.
    var currentWorker = WorkerIdentity.getCurrentWorker();
    var admin = (currentWorker && AdminRepo.getById(currentWorker.id)) || AdminRepo.getAll()[0];
    var emergency = EmergencyRepo.get();
    var workZones = WorkZoneRepo.getAll();

    root.innerHTML = '';

    var stageContainer = document.createElement('div');
    root.appendChild(stageContainer);
    EmergencyStageSelector.render(stageContainer, {
      emergency: emergency,
      workZones: workZones,
      feedbackMessage: transientFeedback.stage ? transientFeedback.stage.message : null,
      feedbackOk: transientFeedback.stage ? transientFeedback.stage.ok : null,
      onApply: function (input) {
        var traceId = TraceIdFactory.create();
        var result = EmergencyService.createOrUpdateEmergency({
          adminId: admin.id,
          status: input.status,
          fireStage: input.fireStage,
          affectedWorkZoneId: input.affectedWorkZoneId,
          message: '',
          traceId: traceId
        });
        if (result.ok) {
          transientFeedback.stage = { ok: true, message: '상태가 적용되었습니다. 작업자 화면에 경보가 표시됩니다.' };
        } else {
          transientFeedback.stage = { ok: false, message: result.error.message };
        }
        renderAll(true);
      }
    });

    var statusTraceId = TraceIdFactory.create();
    var statusResult = AdminStatusService.getWorkerEvacuationStatus({ emergencyId: emergency.id, adminId: admin.id, traceId: statusTraceId });
    var rows = statusResult.ok ? statusResult.rows : [];

    // 사용 불가로 등록된 대피로가 향하는 비상구는 도면에서도 "차단"으로 보여준다.
    var blockedIdsForPlan = BlockedRouteRepo.getForEmergency(emergency.id).map(function (b) { return b.evacuationRouteId; });
    var blockedExitIds = RouteRepo.getAll()
      .filter(function (r) { return blockedIdsForPlan.indexOf(r.id) !== -1; })
      .map(function (r) { return r.exitId; })
      .filter(function (id, i, arr) { return arr.indexOf(id) === i; });

    var planContainer = document.createElement('div');
    root.appendChild(planContainer);
    FloorPlanPanel.render(planContainer, {
      workZones: workZones,
      rows: rows,
      emergency: emergency,
      blockedExitIds: blockedExitIds
    });

    // 신고 전화 (확대화재 이상)
    var affectedZoneForCall = emergency.affectedWorkZoneId ? WorkZoneRepo.getById(emergency.affectedWorkZoneId) : null;
    var callContainer = document.createElement('div');
    root.appendChild(callContainer);
    EmergencyCallPanel.render(callContainer, {
      emergency: emergency,
      affectedZoneName: affectedZoneForCall ? affectedZoneForCall.name : null,
      logged: callLogged,
      onCallAttempt: function (phone) {
        var traceId = TraceIdFactory.create();
        window.App.Foundation.Logger.log(
          'admin.emergencyCall.attempted', 'admin', admin.id,
          { phone: phone, fireStage: emergency.fireStage, affectedWorkZoneId: emergency.affectedWorkZoneId },
          '신고 전화 시도', traceId
        );
        callLogged = true;
      }
    });

    // 작업자 알림 보내기
    var zoneCounts = {};
    workZones.forEach(function (z) {
      zoneCounts[z.id] = rows.filter(function (r) { return r.workZoneId === z.id; }).length;
    });

    var notifyContainer = document.createElement('div');
    root.appendChild(notifyContainer);
    AdminNotifyPanel.render(notifyContainer, {
      workZones: workZones,
      zoneCounts: zoneCounts,
      totalCount: rows.length,
      draft: notifyDraft,
      sent: NotificationService.getRecentWithReadCount(5),
      feedbackMessage: transientFeedback.notify ? transientFeedback.notify.message : null,
      feedbackOk: transientFeedback.notify ? transientFeedback.notify.ok : null,
      onDraftChange: function (field, value) {
        notifyDraft[field] = value;
        if (field === 'level') renderAll(true);
      },
      onPreset: function (preset) {
        notifyDraft.message = preset.text;
        notifyDraft.level = preset.level;
        renderAll(true);
      },
      onSend: function (input) {
        var traceId = TraceIdFactory.create();
        var result = NotificationService.send({
          adminId: admin.id,
          message: input.message,
          level: input.level,
          targetWorkZoneId: input.target === TARGET_ALL ? null : input.target,
          traceId: traceId
        });
        if (result.ok) {
          notifyDraft.message = '';
          transientFeedback.notify = {
            ok: true,
            message: MESSAGE.NOTIFICATION_SENT + ' (대상 ' + result.recipientCount + '명)'
          };
        } else {
          transientFeedback.notify = { ok: false, message: result.error.message };
        }
        renderAll(true);
      }
    });

    var routesForZone = emergency.affectedWorkZoneId ? RouteRepo.getByWorkZoneId(emergency.affectedWorkZoneId) : [];
    var blockedRouteIds = BlockedRouteRepo.getForEmergency(emergency.id).map(function (b) { return b.evacuationRouteId; });

    var blockedContainer = document.createElement('div');
    root.appendChild(blockedContainer);
    BlockedRouteSelector.render(blockedContainer, {
      routes: routesForZone,
      blockedRouteIds: blockedRouteIds,
      feedbackMessage: transientFeedback.blocked ? transientFeedback.blocked.message : null,
      feedbackOk: transientFeedback.blocked ? transientFeedback.blocked.ok : null,
      onApply: function (ids, reason) {
        var traceId = TraceIdFactory.create();
        var result = EmergencyService.updateBlockedRoutes({
          emergencyId: emergency.id,
          blockedRouteIds: ids,
          reason: reason,
          adminId: admin.id,
          traceId: traceId
        });
        if (result.ok) {
          transientFeedback.blocked = { ok: true, message: '사용 불가 대피로가 저장되었습니다.' };
        } else {
          transientFeedback.blocked = { ok: false, message: result.error.message };
        }
        renderAll(true);
      }
    });

    var tableContainer = document.createElement('div');
    root.appendChild(tableContainer);
    WorkerEvacuationTable.render(tableContainer, { rows: rows });

    var restoreContainer = document.createElement('div');
    root.appendChild(restoreContainer);
    RestoreStatusButton.render(restoreContainer, {
      feedbackMessage: transientFeedback.restore ? transientFeedback.restore.message : null,
      feedbackOk: transientFeedback.restore ? transientFeedback.restore.ok : null,
      onRestore: function (restoreType) {
        var traceId = TraceIdFactory.create();
        var result = EmergencyService.resolveEmergency({
          emergencyId: emergency.id,
          adminId: admin.id,
          restoreType: restoreType,
          traceId: traceId
        });
        if (result.ok) {
          transientFeedback.restore = { ok: true, message: result.restoreMessage };
        } else {
          transientFeedback.restore = { ok: false, message: result.error.message };
        }
        renderAll(true);
      }
    });

    var bindContainer = document.createElement('div');
    root.appendChild(bindContainer);
    ZoneQrBindingPanel.render(bindContainer, {
      workZones: workZones,
      mappings: QrMappingRepo.getAll(),
      feedbackMessage: transientFeedback.qrBind ? transientFeedback.qrBind.message : null,
      feedbackOk: transientFeedback.qrBind ? transientFeedback.qrBind.ok : null,
      onBind: function (qrValue, zoneId) {
        var zone = WorkZoneRepo.getById(zoneId);
        if (!zone) {
          transientFeedback.qrBind = { ok: false, message: MESSAGE.QR_BIND_ZONE_REQUIRED };
          renderAll(true);
          return;
        }
        var result = QrMappingRepo.bind(qrValue, zoneId, admin.id);
        if (result.ok) {
          var traceId = TraceIdFactory.create();
          window.App.Foundation.Logger.log(
            'admin.zoneQr.bound', 'admin', admin.id,
            { qrValue: qrValue, workZoneId: zoneId }, '구역 QR 등록', traceId
          );
          transientFeedback.qrBind = { ok: true, message: zone.name + ' QR 등록 완료 · 이 QR을 찍으면 ' + zone.name + '으로 인식됩니다.' };
        } else {
          transientFeedback.qrBind = { ok: false, message: MESSAGE.SAVE_FAILED };
        }
        renderAll(true);
      },
      onUnbind: function (qrValue) {
        QrMappingRepo.unbind(qrValue);
        transientFeedback.qrBind = { ok: true, message: '연결을 해제했습니다.' };
        renderAll(true);
      },
      onDecodeError: function (message) {
        transientFeedback.qrBind = { ok: false, message: message };
        renderAll(true);
      }
    });

    var logContainer = document.createElement('div');
    root.appendChild(logContainer);
    LogPanel.render(logContainer, {
      logs: LogRepo.getRecent(EnvConfig.MAX_LOG_DISPLAY),
      errorFlags: { noAvailableRouteCount: computeNoRouteWarningCount(emergency) }
    });
  }

  // ---------------------------------------------------------------- 렌더 / 동기화

  // 다른 기기·다른 탭에서 저장소가 바뀌었는지 판별하는 값.
  var WATCHED_KEYS = [
    'emergency', 'workers', 'blocked_routes', 'worker_confirmations',
    'qr_zone_mappings', 'session', 'notifications', 'notification_reads'
  ];

  function storageFingerprint() {
    return WATCHED_KEYS.map(function (k) { return Storage.readRaw(k) || ''; }).join('|');
  }

  var lastFingerprint = null;

  // 사용자가 입력 중이거나 스캐너가 떠 있으면 자동 갱신으로 화면을 갈아엎지 않는다.
  function isUserBusy() {
    if (QrScannerOverlay.isOpen()) return true;
    var el = document.activeElement;
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function renderAll(force) {
    if (!force && isUserBusy()) return;

    var tabsRoot = document.getElementById('tabs-root');
    var mainRoot = document.getElementById('main-root');
    renderTabs(tabsRoot);

    var state = AppState.getCurrentState();
    if (state.currentView === 'worker') {
      renderWorkerView(mainRoot);
    } else {
      FireAlertOverlay.hide(); // 관리자 화면에서는 전체 경보를 띄우지 않는다
      renderAdminView(mainRoot);
    }
    lastFingerprint = storageFingerprint();

    // 사용자가 방금 바꾼 내용은 바로 다른 기기로 보낸다.
    if (force) SyncService.flush();
  }

  function startSync() {
    window.setInterval(function () {
      var current = storageFingerprint();
      if (current !== lastFingerprint) {
        lastFingerprint = current;
        renderAll(false);
      }
    }, EnvConfig.SYNC_INTERVAL_MS);

    // 같은 브라우저의 다른 탭에서 바뀐 경우 즉시 반영
    window.addEventListener('storage', function () {
      lastFingerprint = storageFingerprint();
      renderAll(false);
    });
  }

  window.App.Main = { renderAll: renderAll };

  document.addEventListener('DOMContentLoaded', function () {
    // 이미 로그인된 상태로 앱을 다시 켠 경우, 그동안 쌓인 알림으로 소리를 내지 않는다.
    // 휴대폰은 화면을 만지기 전에는 소리를 내주지 않는다.
    // 어떤 터치에서든 오디오를 열어둬서, 경보가 울려야 할 때 이미 준비된 상태가 되게 한다.
    Alarm.installUnlockHandlers();

    // 다른 기기와 현장 상태를 맞춘다(서버가 없으면 조용히 기기 저장으로만 동작).
    SyncService.start();
    // 카메라가 막혔을 때 "이 주소로 여세요"를 정확히 안내하려면 서버 주소를 알아야 한다.
    CameraPermission.loadServerInfo();

    var current = WorkerIdentity.getCurrentWorker();
    if (current) markAllNotificationsSeen(current.id);
    renderAll(true);
    startSync();
    // 앱을 처음 켠 경우 카메라 사용 동의를 먼저 받는다.
    maybeShowCameraGate();
  });
})();
