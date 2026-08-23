// L0 화면층 - WorkerEvacuationTable
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.WorkerEvacuationTable = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;

  function render(container, props) {
    var rows = props.rows;
    var uncomfirmedCount = rows.filter(function (r) { return r.confirmStatus === 'none'; }).length;

    var html = '<div class="panel admin-panel">';
    html += '<h3 class="panel-title">작업자 · 대피 확인 현황</h3>';
    if (rows.length === 0) {
      html += '<p class="panel-sub">현재 입장한 작업자가 없습니다.</p>';
      html += '</div>';
      container.innerHTML = html;
      return;
    }
    if (uncomfirmedCount > 0) {
      html += '<div class="warning-chip warning-danger">미확인 인원 ' + uncomfirmedCount + '명</div>';
    }
    html += '<table class="worker-table"><thead><tr>';
    html += '<th>이름</th><th>생년월일</th><th>작업구역</th><th>확인 상태</th><th>확인 시각</th>';
    html += '</tr></thead><tbody>';
    rows.forEach(function (row) {
      var statusClass = row.confirmStatus === 'none' ? 'status-neutral' : 'status-normal';
      html += '<tr>';
      html += '<td>' + esc(row.workerName) + '</td>';
      html += '<td>' + esc(window.App.Services.WorkerIdentityService.formatBirthDate(row.birthDate)) + '</td>';
      html += '<td>' + esc(row.workZoneName) + '</td>';
      html += '<td><span class="badge ' + statusClass + '">' + esc(row.confirmStatusLabel) + '</span></td>';
      html += '<td>' + (row.confirmedAt ? formatTime(row.confirmedAt) : '-') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
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
