// L0 화면층 - FireAlertOverlay
// 관리자가 화재 단계를 올리면 작업자 화면 전체를 덮는 빨간 경보를 띄우고 경보음을 낸다.
// 화면은 판단하지 않는다. 표시 여부는 EnvConfig.ALERT_STAGES와 넘겨받은 guidance로만 정한다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.FireAlertOverlay = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var Alarm = window.App.Foundation.AlarmSound;
  var EnvConfig = window.App.Foundation.EnvConfig;
  var FIRE_STAGE_LABELS = window.App.Constants.FIRE_STAGE_LABELS;
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var MESSAGE = window.App.Constants.MESSAGE;

  var root = null;
  var shownKey = null;        // 지금 화면에 떠 있는 경보의 키
  var acknowledgedKey = null; // 작업자가 "확인했습니다"를 누른 경보의 키

  function alertKey(emergency) {
    return emergency.id + ':' + emergency.fireStage + ':' + (emergency.affectedWorkZoneId || 'none');
  }

  function shouldAlert(emergency) {
    return EnvConfig.ALERT_STAGES.indexOf(emergency.fireStage) !== -1;
  }

  function buildHtml(props) {
    var emergency = props.emergency;
    var guidance = props.guidance;
    var isMajor = emergency.fireStage === FIRE_STAGES.MAJOR_FIRE;
    var myZone = guidance.workZone;
    var isMyZone = myZone && emergency.affectedWorkZoneId === myZone.id;

    var html = '<div class="fa-inner">';

    html += '<div class="fa-siren" aria-hidden="true"></div>';
    html += '<div class="fa-stage">' + esc(FIRE_STAGE_LABELS[emergency.fireStage] || '') + '</div>';
    html += '<h2 class="fa-title">' + MESSAGE.FIRE_ALERT_TITLE + '</h2>';

    html += '<div class="fa-where">';
    html += '<div class="fa-where-line"><span class="fa-where-label">발생 구역</span><span class="fa-where-value">' +
      esc(props.affectedZoneName || '확인 중') + '</span></div>';
    html += '<div class="fa-where-line"><span class="fa-where-label">내 작업구역</span><span class="fa-where-value">' +
      esc(myZone ? myZone.name : '미등록') + '</span></div>';
    html += '</div>';

    if (isMyZone) {
      html += '<div class="fa-banner fa-banner-danger">지금 있는 구역에서 화재가 발생했습니다</div>';
    }

    html += '<p class="fa-message">' + esc(guidance.message) + '</p>';

    if (guidance.availableRoutes && guidance.availableRoutes.length > 0) {
      html += '<div class="fa-routes">';
      html += '<div class="fa-routes-title">대피 방향</div>';
      guidance.availableRoutes.slice(0, 2).forEach(function (r) {
        html += '<div class="fa-route">';
        html += '<div class="fa-route-name">' + esc(r.routeName) + '</div>';
        html += '<div class="fa-route-dir">' + esc(r.directionText) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (guidance.availableExits && guidance.availableExits.length > 0) {
      html += '<div class="fa-exits">';
      guidance.availableExits.forEach(function (x) {
        html += '<span class="fa-exit-chip">' + esc(x.name) + '</span>';
      });
      html += '</div>';
    }

    if (guidance.blockedRoutes && guidance.blockedRoutes.length > 0) {
      html += '<div class="fa-banner fa-banner-blocked">사용 불가: ' +
        esc(guidance.blockedRoutes.map(function (r) { return r.routeName; }).join(', ')) + '</div>';
    }

    if (isMajor) {
      html += '<div class="fa-banner fa-banner-major">대형화재 · 안전관리자와 현장 지시에 따라 즉시 대피하세요</div>';

      // 대형화재에서만 신고 전화 버튼을 띄운다. 앱이 자동으로 걸지 않고, 눌러야 전화 앱이 열린다.
      var contact = window.App.Data.SITE.emergencyContact;
      if (contact && contact.phone) {
        html += '<a class="fa-call" href="tel:' + esc(contact.phone.replace(/[^0-9+]/g, '')) + '">';
        html += '<span class="fa-call-icon" aria-hidden="true">📞</span>';
        html += '<span class="fa-call-text">' + esc(contact.label) + '<span class="fa-call-num">' + esc(contact.phone) + '</span></span>';
        html += '</a>';
        html += '<p class="fa-call-note">' + esc(contact.note) + '</p>';
      }
    }

    html += '<div class="fa-actions">';
    html += '<button class="fa-ack" id="fa-ack-btn">' + MESSAGE.FIRE_ALERT_ACK + '</button>';
    html += '<button class="fa-mute" id="fa-mute-btn">' + (Alarm.isMuted() ? '소리 켜기' : '소리 끄기') + '</button>';
    html += '</div>';

    html += '<p class="fa-foot">최종 대피 판단과 통제는 안전관리자가 합니다.</p>';
    html += '</div>';
    return html;
  }

  function show(props) {
    if (!root) {
      root = document.createElement('div');
      root.className = 'fire-alert';
      root.setAttribute('role', 'alertdialog');
      root.setAttribute('aria-live', 'assertive');
      document.body.appendChild(root);
    }
    root.innerHTML = buildHtml(props);
    document.body.classList.add('modal-open');

    root.querySelector('#fa-ack-btn').addEventListener('click', function () {
      acknowledgedKey = shownKey;
      hide();
      if (props.onAcknowledge) props.onAcknowledge();
    });
    root.querySelector('#fa-mute-btn').addEventListener('click', function () {
      Alarm.setMuted(!Alarm.isMuted());
      if (!Alarm.isMuted()) Alarm.start();
      root.querySelector('#fa-mute-btn').textContent = Alarm.isMuted() ? '소리 켜기' : '소리 끄기';
    });

    Alarm.start();
    Alarm.vibrate();
  }

  function hide() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    shownKey = null;
    document.body.classList.remove('modal-open');
    Alarm.stop();
  }

  // 매 렌더마다 호출한다. 떠야 하면 띄우고, 아니면 내린다.
  function sync(props) {
    var emergency = props.emergency;

    if (!shouldAlert(emergency)) {
      acknowledgedKey = null;
      if (root) hide();
      return;
    }

    var key = alertKey(emergency);

    // 이미 확인을 누른 경보면 다시 띄우지 않는다. 단계가 바뀌면 키가 바뀌어 다시 뜬다.
    if (acknowledgedKey === key) {
      if (root) hide();
      return;
    }

    if (shownKey === key) return; // 같은 경보가 이미 떠 있으면 다시 그리지 않는다
    shownKey = key;
    show(props);
  }

  function isShowing() {
    return root !== null;
  }

  return { sync: sync, hide: hide, isShowing: isShowing, shouldAlert: shouldAlert };
})();
