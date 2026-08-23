// L1 기능층 - EvacuationService
// 책임: 화재 단계·작업구역·사용 불가 대피로를 기준으로 작업자 안내를 판단하는 것만 한다.
// 정보가 부족하면 추측하지 않고 decisionStatus: "pending"을 반환한다 (21번 판단 규칙).
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.EvacuationService = (function () {
  var WorkerRepo = window.App.Repositories.WorkerRepository;
  var WorkZoneRepo = window.App.Repositories.WorkZoneRepository;
  var RouteRepo = window.App.Repositories.EvacuationRouteRepository;
  var ExitRepo = window.App.Repositories.ExitRepository;
  var EmergencyRepo = window.App.Repositories.EmergencyRepository;
  var BlockedRouteRepo = window.App.Repositories.BlockedRouteRepository;
  var Logger = window.App.Foundation.Logger;
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var EMERGENCY_STATUS = window.App.Constants.EMERGENCY_STATUS;
  var MESSAGE = window.App.Constants.MESSAGE;

  // 보류 사유에 맞는 안내를 쓴다. 작업구역을 모르는 것과 단계를 모르는 것은 다른 상황이다.
  var PENDING_MESSAGE = {
    WORKER_ZONE_MISSING: MESSAGE.PENDING_ZONE,
    WORKER_NOT_FOUND: MESSAGE.PENDING_ZONE
  };

  function pendingResult(reason, workerId, emergencyId, traceId) {
    Logger.log('evacuation.guidance.pending', 'system', workerId, { reason: reason, emergencyId: emergencyId }, reason, traceId);
    return {
      decisionStatus: 'pending',
      fireStage: null,
      displayType: 'pending',
      message: PENDING_MESSAGE[reason] || MESSAGE.PENDING_STAGE,
      workZone: null,
      availableRoutes: [],
      availableExits: [],
      blockedRoutes: [],
      requires119Signal: false
    };
  }

  function decideWorkerGuidance(input) {
    var workerId = input.workerId;
    var traceId = input.traceId;

    Logger.log('evacuation.guidance.requested', 'worker', workerId, { emergencyId: input.emergencyId }, '안내 요청', traceId);

    var worker = WorkerRepo.getById(workerId);
    if (!worker) {
      return pendingResult('WORKER_NOT_FOUND', workerId, input.emergencyId, traceId);
    }
    if (!worker.currentWorkZoneId) {
      return pendingResult('WORKER_ZONE_MISSING', workerId, input.emergencyId, traceId);
    }

    var emergency = EmergencyRepo.get();
    var workZone = WorkZoneRepo.getById(worker.currentWorkZoneId);

    // 정상 상태
    if (emergency.status === EMERGENCY_STATUS.NORMAL || emergency.fireStage === FIRE_STAGES.NONE) {
      return {
        decisionStatus: 'ready',
        fireStage: FIRE_STAGES.NONE,
        displayType: 'normal',
        message: MESSAGE.NORMAL,
        workZone: workZone,
        availableRoutes: [],
        availableExits: [],
        blockedRoutes: [],
        requires119Signal: false
      };
    }

    // active 상태인데 화재 단계가 없으면 판단 보류
    if (emergency.status === EMERGENCY_STATUS.ACTIVE && !emergency.fireStage) {
      return pendingResult('EMERGENCY_STAGE_MISSING', workerId, input.emergencyId, traceId);
    }

    var isAffectedZone = emergency.affectedWorkZoneId === worker.currentWorkZoneId;

    if (emergency.fireStage === FIRE_STAGES.ANOMALY) {
      Logger.log('worker.notice.anomalyShown', 'system', workerId, {}, MESSAGE.ANOMALY_CHECKING, traceId);
      return {
        decisionStatus: 'ready',
        fireStage: FIRE_STAGES.ANOMALY,
        displayType: 'notice',
        message: MESSAGE.ANOMALY_CHECKING,
        workZone: workZone,
        availableRoutes: [],
        availableExits: [],
        blockedRoutes: [],
        requires119Signal: false
      };
    }

    if (emergency.fireStage === FIRE_STAGES.INITIAL_FIRE) {
      Logger.log('worker.notice.initialFireShown', 'system', workerId, {}, MESSAGE.INITIAL_FIRE_CONTROL, traceId);
      return {
        decisionStatus: 'ready',
        fireStage: FIRE_STAGES.INITIAL_FIRE,
        displayType: 'control',
        message: MESSAGE.INITIAL_FIRE_CONTROL,
        workZone: workZone,
        availableRoutes: [],
        availableExits: [],
        blockedRoutes: [],
        requires119Signal: false
      };
    }

    if (emergency.fireStage === FIRE_STAGES.SPREADING_FIRE || emergency.fireStage === FIRE_STAGES.MAJOR_FIRE) {
      var allRoutes = RouteRepo.getByWorkZoneId(worker.currentWorkZoneId);
      var blockedRecords = BlockedRouteRepo.getForEmergency(emergency.id);
      var blockedRouteIds = blockedRecords.map(function (b) { return b.evacuationRouteId; });

      var availableRoutes = allRoutes.filter(function (r) { return blockedRouteIds.indexOf(r.id) === -1; });
      var blockedRoutesForZone = allRoutes.filter(function (r) { return blockedRouteIds.indexOf(r.id) !== -1; });

      if (availableRoutes.length === 0) {
        Logger.log('error.no_available_route', 'system', workerId, { workZoneId: worker.currentWorkZoneId }, 'NO_AVAILABLE_ROUTE', traceId);
        return {
          decisionStatus: 'ready',
          fireStage: emergency.fireStage,
          displayType: emergency.fireStage === FIRE_STAGES.MAJOR_FIRE ? 'major_evacuation' : 'evacuation',
          message: MESSAGE.NO_ROUTE,
          workZone: workZone,
          availableRoutes: [],
          availableExits: [],
          blockedRoutes: blockedRoutesForZone,
          requires119Signal: emergency.fireStage === FIRE_STAGES.MAJOR_FIRE
        };
      }

      var availableExits = availableRoutes
        .map(function (r) { return ExitRepo.getById(r.exitId); })
        .filter(function (e, idx, arr) { return e && arr.findIndex(function (x) { return x && x.id === e.id; }) === idx; });

      Logger.log(
        'worker.evacuationInfo.shown',
        'system',
        workerId,
        { availableRouteIds: availableRoutes.map(function (r) { return r.id; }), availableExitIds: availableExits.map(function (e) { return e.id; }) },
        '대피정보 표시',
        traceId
      );

      var isMajor = emergency.fireStage === FIRE_STAGES.MAJOR_FIRE;
      return {
        decisionStatus: 'ready',
        fireStage: emergency.fireStage,
        displayType: isMajor ? 'major_evacuation' : 'evacuation',
        message: isMajor ? MESSAGE.MAJOR_EVACUATE : MESSAGE.EVACUATE,
        workZone: workZone,
        availableRoutes: availableRoutes,
        availableExits: availableExits,
        blockedRoutes: blockedRoutesForZone,
        requires119Signal: isMajor
      };
    }

    // 알 수 없는 단계 - 추측하지 않고 보류
    return pendingResult('EMERGENCY_STAGE_MISSING', workerId, input.emergencyId, traceId);
  }

  // 역전 방지: 요청 당시 작업구역과 현재 작업구역이 다르면 응답을 버린다.
  function isStaleResponse(workerId, requestedWorkZoneId) {
    var worker = WorkerRepo.getById(workerId);
    if (!worker) return true;
    return worker.currentWorkZoneId !== requestedWorkZoneId;
  }

  function discardStaleResponse(workerId, previousWorkZoneId, currentWorkZoneId, traceId) {
    Logger.log(
      'evacuation.guidance.discarded',
      'system',
      workerId,
      { previousWorkZoneId: previousWorkZoneId, currentWorkZoneId: currentWorkZoneId },
      '오래된 안내 폐기',
      traceId
    );
  }

  return {
    decideWorkerGuidance: decideWorkerGuidance,
    isStaleResponse: isStaleResponse,
    discardStaleResponse: discardStaleResponse
  };
})();
