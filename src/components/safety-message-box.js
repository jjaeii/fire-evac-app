// L0 화면층 - SafetyMessageBox
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.SafetyMessageBox = (function () {
  var FireStageBadge = window.App.Components.FireStageBadge;

  function toneClass(displayType) {
    switch (displayType) {
      case 'normal': return 'status-normal';
      case 'notice':
      case 'control': return 'status-caution';
      case 'evacuation':
      case 'major_evacuation': return 'status-danger';
      case 'pending': return 'status-neutral';
      default: return 'status-neutral';
    }
  }

  function render(container, props) {
    var guidance = props.guidance;
    var html = '<div class="panel message-box ' + toneClass(guidance.displayType) + '-panel">';
    html += '<div class="message-box-header">';
    if (guidance.decisionStatus === 'ready') {
      html += FireStageBadge.renderMarkup(guidance.fireStage);
    } else {
      html += '<span class="badge status-neutral">판단 보류</span>';
    }
    html += '</div>';
    html += '<p class="message-box-text">' + guidance.message + '</p>';
    html += '<p class="message-box-footnote">최종 판단은 사람(안전관리자)이 합니다.</p>';
    html += '</div>';
    container.innerHTML = html;
  }

  return { render: render };
})();
