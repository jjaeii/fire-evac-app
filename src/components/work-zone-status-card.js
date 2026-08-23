// L0 화면층 - WorkZoneStatusCard
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.WorkZoneStatusCard = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;

  function render(container, props) {
    var worker = props.worker;
    var workZone = props.workZone;
    var Identity = window.App.Services.WorkerIdentityService;

    var html = '<div class="panel status-card">';
    html += '<h3 class="panel-title">현재 상태</h3>';
    html += '<div class="status-row"><span class="status-label">작업자</span><span class="status-value">' + esc(worker.name) + '</span></div>';
    html += '<div class="status-row"><span class="status-label">생년월일</span><span class="status-value">' +
      esc(Identity.formatBirthDate(worker.birthDate)) + '</span></div>';
    html += '<div class="status-row"><span class="status-label">작업구역</span><span class="status-value' +
      (workZone ? '' : ' status-value-missing') + '">' +
      (workZone ? esc(workZone.name) + ' · ' + esc(workZone.purpose || '') : 'QR 미스캔') + '</span></div>';
    html += '<div class="status-row"><span class="status-label">최근 QR 스캔</span><span class="status-value">' +
      (worker.lastQrScannedAt ? formatTime(worker.lastQrScannedAt) : '-') + '</span></div>';
    html += '<button class="btn btn-ghost btn-leave" id="worker-leave-btn">로그아웃</button>';
    html += '</div>';
    container.innerHTML = html;

    container.querySelector('#worker-leave-btn').addEventListener('click', function () {
      props.onLeave();
    });
  }

  function formatTime(iso) {
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  return { render: render, formatTime: formatTime };
})();
