// L0 화면층 - WorkerConfirmButton
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.WorkerConfirmButton = (function () {
  var CONFIRM_TYPE_LABELS = window.App.Constants.CONFIRM_TYPE_LABELS;

  function render(container, props) {
    var guidance = props.guidance;
    var worker = props.worker;
    var html = '<div class="panel confirm-panel">';

    var confirmType = null;
    var buttonLabel = null;
    // 경보 화면의 버튼과 같은 문구를 쓴다.
    var MESSAGE = window.App.Constants.MESSAGE;
    if (guidance.displayType === 'evacuation' || guidance.displayType === 'major_evacuation') {
      confirmType = 'evacuation_confirmed';
      buttonLabel = MESSAGE.FIRE_ALERT_EVACUATED;
    } else if (guidance.displayType === 'notice' || guidance.displayType === 'control') {
      confirmType = 'notice_acknowledged';
      buttonLabel = MESSAGE.FIRE_ALERT_ACK;
    }

    if (confirmType) {
      html += '<button class="btn btn-confirm" id="worker-confirm-btn" data-confirm-type="' + confirmType + '">' + buttonLabel + '</button>';
    }

    html += '<p class="confirm-current">현재 확인 상태: ' + (CONFIRM_TYPE_LABELS[worker.currentConfirmStatus] || CONFIRM_TYPE_LABELS.none) + '</p>';
    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + props.feedbackMessage + '</div>';
    }
    html += '</div>';

    container.innerHTML = html;

    var btn = container.querySelector('#worker-confirm-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        props.onConfirm(btn.getAttribute('data-confirm-type'));
      });
    }
  }

  return { render: render };
})();
