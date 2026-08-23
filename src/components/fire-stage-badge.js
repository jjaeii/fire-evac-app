// L0 화면층 - FireStageBadge
// 색상만으로 상태를 구분하지 않고 반드시 텍스트 라벨을 함께 표시한다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.FireStageBadge = (function () {
  var LABELS = window.App.Constants.FIRE_STAGE_LABELS;
  var COLOR_KEY = window.App.Constants.FIRE_STAGE_COLOR_KEY;

  function renderMarkup(fireStage) {
    var stage = fireStage || 'none';
    var label = LABELS[stage] || '알 수 없음';
    var colorKey = COLOR_KEY[stage] || 'status-neutral';
    return '<span class="badge ' + colorKey + '">' + label + '</span>';
  }

  function render(container, props) {
    container.innerHTML = renderMarkup(props.fireStage);
  }

  return { render: render, renderMarkup: renderMarkup };
})();
