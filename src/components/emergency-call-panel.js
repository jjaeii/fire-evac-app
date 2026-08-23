// L0 화면층 - EmergencyCallPanel (관리자)
// 대형화재 단계에서 신고 전화 버튼을 띄운다.
//
// 이 앱은 전화를 자동으로 걸지 않는다(NOT.03). 눌렀을 때 기기의 전화 앱이 열릴 뿐이고,
// 실제 발신 여부는 사람이 결정한다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.EmergencyCallPanel = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var FIRE_STAGE_LABELS = window.App.Constants.FIRE_STAGE_LABELS;

  // 이 단계 이상에서 신고 버튼을 보여준다.
  function shouldShow(emergency) {
    return emergency.fireStage === FIRE_STAGES.SPREADING_FIRE ||
           emergency.fireStage === FIRE_STAGES.MAJOR_FIRE;
  }

  function render(container, props) {
    var emergency = props.emergency;
    var contact = window.App.Data.SITE.emergencyContact;

    if (!shouldShow(emergency) || !contact || !contact.phone) {
      container.innerHTML = '';
      return;
    }

    var isMajor = emergency.fireStage === FIRE_STAGES.MAJOR_FIRE;
    var digits = contact.phone.replace(/[^0-9+]/g, '');

    var html = '<div class="panel admin-panel call-panel' + (isMajor ? ' call-panel-major' : '') + '">';
    html += '<h3 class="panel-title">신고</h3>';
    html += '<div class="call-stage">' + esc(FIRE_STAGE_LABELS[emergency.fireStage] || '') +
      ' 단계 · ' + esc(props.affectedZoneName || '구역 미지정') + '</div>';

    if (isMajor) {
      html += '<div class="call-urgent">대형화재입니다. 즉시 신고하세요.</div>';
    }

    html += '<a class="btn call-button" href="tel:' + esc(digits) + '">';
    html += '<span class="call-icon" aria-hidden="true">📞</span>';
    html += esc(contact.label) + ' ' + esc(contact.phone);
    html += '</a>';

    html += '<p class="call-note">' + esc(contact.note) + '</p>';
    html += '<p class="call-note call-note-dim">이 앱은 전화를 자동으로 걸지 않습니다. 버튼을 누르면 기기의 전화 앱이 열립니다.</p>';

    if (props.logged) {
      html += '<div class="feedback feedback-ok">신고 시도를 기록했습니다.</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // 신고 시도 자체를 로그로 남긴다(실제 통화 여부는 앱이 알 수 없다).
    container.querySelector('.call-button').addEventListener('click', function () {
      props.onCallAttempt(contact.phone);
    });
  }

  return { render: render, shouldShow: shouldShow };
})();
