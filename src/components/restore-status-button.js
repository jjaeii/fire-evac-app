// L0 화면층 - RestoreStatusButton
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.RestoreStatusButton = (function () {
  function render(container, props) {
    var html = '<div class="panel admin-panel">';
    html += '<h3 class="panel-title">진압 완료 · 정상 복구</h3>';
    html += '<div class="restore-button-row">';
    html += '<button class="btn btn-secondary" data-restore="situation_resolved">상황 해소</button>';
    html += '<button class="btn btn-secondary" data-restore="fire_suppressed">진압 완료</button>';
    html += '<button class="btn btn-secondary" data-restore="normal_restored">정상 복구</button>';
    html += '</div>';
    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + props.feedbackMessage + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-restore]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        props.onRestore(btn.getAttribute('data-restore'));
      });
    });
  }

  return { render: render };
})();
