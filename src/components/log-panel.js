// L0 화면층 - LogPanel (모니터링, 18.7 요구사항 반영)
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.LogPanel = (function () {
  var EVENT_LABELS = {
    'worker.qr.scanned': 'QR 스캔',
    'worker.zone.registered': '작업구역 등록',
    'emergency.stage.changed': '관리자 상태 입력',
    'emergency.blockedRoutes.changed': '사용 불가 대피로 입력',
    'emergency.resolved': '진압 완료 / 정상 복구',
    'evacuation.guidance.pending': '판단 보류',
    'evacuation.guidance.discarded': '오래된 안내 폐기',
    'worker.confirmation.submitted': '작업자 확인',
    'admin.signal.call119Needed': '119 신고 필요 신호',
    'evacuation.guidance.requested': '대피 안내 요청',
    'admin.status.viewed': '관리자 현황 조회',
    'error.no_available_route': '사용 가능한 대피로 없음',
    'worker.notice.anomalyShown': '이상징후 안내 표시',
    'worker.notice.initialFireShown': '초기화재 안내 표시',
    'worker.evacuationInfo.shown': '대피정보 표시'
  };

  function render(container, props) {
    var logs = props.logs;
    var pendingCount = logs.filter(function (l) { return l.eventName === 'evacuation.guidance.pending'; }).length;
    var noRouteCount = props.errorFlags ? props.errorFlags.noAvailableRouteCount : 0;

    var html = '<div class="panel log-panel">';
    html += '<h3 class="panel-title">로그 · 경고</h3>';

    if (pendingCount > 0) {
      html += '<div class="warning-chip warning-caution">판단 보류 있음 (' + pendingCount + '건)</div>';
    }
    if (noRouteCount > 0) {
      html += '<div class="warning-chip warning-danger">대피로 확인 필요 (' + noRouteCount + '건)</div>';
    }

    html += '<ul class="log-list">';
    logs.slice(0, 20).forEach(function (log) {
      var label = EVENT_LABELS[log.eventName] || log.eventName;
      html += '<li class="log-item"><span class="log-time">' + formatTime(log.createdAt) + '</span><span class="log-label">' + label + '</span><span class="log-trace">' + log.traceId + '</span></li>';
    });
    html += '</ul>';
    html += '</div>';
    container.innerHTML = html;
  }

  function formatTime(iso) {
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  return { render: render };
})();
