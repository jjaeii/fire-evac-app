// L0 화면층 - EmergencyStageSelector
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.EmergencyStageSelector = (function () {
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var LABELS = window.App.Constants.FIRE_STAGE_LABELS;
  var EMERGENCY_STATUS = window.App.Constants.EMERGENCY_STATUS;

  function render(container, props) {
    var emergency = props.emergency;
    var workZones = props.workZones;

    var stageOrder = [FIRE_STAGES.NONE, FIRE_STAGES.ANOMALY, FIRE_STAGES.INITIAL_FIRE, FIRE_STAGES.SPREADING_FIRE, FIRE_STAGES.MAJOR_FIRE];

    var html = '<div class="panel admin-panel">';
    html += '<h3 class="panel-title">비상상황 입력</h3>';

    html += '<label class="field-label">화재 단계</label>';
    html += '<div class="stage-button-row">';
    stageOrder.forEach(function (stage) {
      var active = emergency.fireStage === stage ? ' active' : '';
      html += '<button class="btn btn-stage' + active + '" data-stage="' + stage + '">' + LABELS[stage] + '</button>';
    });
    html += '</div>';

    html += '<label class="field-label" for="affected-zone-select">발생 작업구역</label>';
    html += '<select class="input" id="affected-zone-select">';
    html += '<option value="">선택 안 함</option>';
    workZones.forEach(function (z) {
      var selected = emergency.affectedWorkZoneId === z.id ? ' selected' : '';
      html += '<option value="' + z.id + '"' + selected + '>' + z.name + '</option>';
    });
    html += '</select>';

    html += '<button class="btn btn-primary" id="apply-stage-btn">상태 적용</button>';

    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + props.feedbackMessage + '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    var selectedStage = emergency.fireStage;
    container.querySelectorAll('.btn-stage').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedStage = btn.getAttribute('data-stage');
        container.querySelectorAll('.btn-stage').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });

    container.querySelector('#apply-stage-btn').addEventListener('click', function () {
      var affectedWorkZoneId = container.querySelector('#affected-zone-select').value || null;
      var status = selectedStage === FIRE_STAGES.NONE ? EMERGENCY_STATUS.NORMAL : EMERGENCY_STATUS.ACTIVE;
      props.onApply({
        status: status,
        fireStage: selectedStage,
        affectedWorkZoneId: affectedWorkZoneId
      });
    });
  }

  return { render: render };
})();
