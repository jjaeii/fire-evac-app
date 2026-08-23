// L0 화면층 - BlockedRouteSelector
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.BlockedRouteSelector = (function () {
  function render(container, props) {
    var routes = props.routes;
    var blockedRouteIds = props.blockedRouteIds || [];

    var html = '<div class="panel admin-panel">';
    html += '<h3 class="panel-title">사용 불가 대피로 입력</h3>';
    if (routes.length === 0) {
      html += '<p class="panel-sub">발생 작업구역을 먼저 선택하세요.</p>';
    } else {
      html += '<div class="route-checkbox-list">';
      routes.forEach(function (r) {
        var checked = blockedRouteIds.indexOf(r.id) !== -1 ? ' checked' : '';
        html += '<label class="route-checkbox"><input type="checkbox" value="' + r.id + '"' + checked + ' /> ' + r.routeName + ' (' + r.directionText + ')</label>';
      });
      html += '</div>';
      html += '<input type="text" class="input" id="blocked-reason-input" placeholder="사유 (예: 연기로 인한 통행 불가)" />';
      html += '<button class="btn btn-primary" id="apply-blocked-btn">사용 불가 대피로 저장</button>';
    }
    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + props.feedbackMessage + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    var applyBtn = container.querySelector('#apply-blocked-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        var checked = Array.prototype.slice.call(container.querySelectorAll('.route-checkbox input:checked'));
        var ids = checked.map(function (c) { return c.value; });
        var reason = container.querySelector('#blocked-reason-input').value.trim();
        props.onApply(ids, reason);
      });
    }
  }

  return { render: render };
})();
