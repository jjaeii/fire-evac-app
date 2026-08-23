// L0 화면층 - EvacuationInfoPanel
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.EvacuationInfoPanel = (function () {
  function render(container, props) {
    var guidance = props.guidance;
    if (guidance.displayType !== 'evacuation' && guidance.displayType !== 'major_evacuation') {
      container.innerHTML = '';
      return;
    }

    var html = '<div class="panel evac-panel">';
    html += '<h3 class="panel-title">대피 정보</h3>';

    if (guidance.availableRoutes.length === 0) {
      html += '<p class="evac-empty">사용 가능한 대피로가 없습니다. 안전관리자 지시를 따르세요.</p>';
    } else {
      html += '<ul class="route-list">';
      guidance.availableRoutes.forEach(function (route) {
        html += '<li class="route-item"><span class="route-name">' + route.routeName + '</span><span class="route-direction">' + route.directionText + '</span></li>';
      });
      html += '</ul>';

      html += '<div class="exit-row">';
      guidance.availableExits.forEach(function (exit) {
        html += '<span class="exit-chip">' + exit.name + ' · ' + exit.locationLabel + '</span>';
      });
      html += '</div>';
    }

    if (guidance.blockedRoutes && guidance.blockedRoutes.length > 0) {
      html += '<div class="blocked-warning">사용 불가: ';
      html += guidance.blockedRoutes.map(function (r) { return r.routeName; }).join(', ');
      html += '</div>';
    }

    if (guidance.requires119Signal) {
      html += '<div class="major-warning">대형화재 단계입니다. 안전관리자가 119 신고 여부를 확인 중입니다.</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  return { render: render };
})();
