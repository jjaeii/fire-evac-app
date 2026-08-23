// L0 화면층 - AdminNotifyPanel
// 관리자가 작업자에게 알림을 보내는 화면. 대상은 전체 또는 특정 작업구역이다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.AdminNotifyPanel = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var PRESETS = window.App.Constants.NOTIFICATION_PRESETS;
  var LEVELS = window.App.Constants.NOTIFICATION_LEVELS;
  var LEVEL_LABELS = window.App.Constants.NOTIFICATION_LEVEL_LABELS;
  var TARGET_ALL = window.App.Constants.NOTIFICATION_TARGET_ALL;

  function formatTime(iso) {
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function render(container, props) {
    var draft = props.draft;

    var html = '<div class="panel admin-panel">';
    html += '<h3 class="panel-title">작업자 알림 보내기</h3>';
    html += '<p class="panel-sub">보낸 즉시 대상 작업자 화면에 알림이 뜹니다. 화재 경보와는 별개입니다.</p>';

    html += '<label class="field-label" for="notify-target-select">받는 대상</label>';
    html += '<select class="input" id="notify-target-select">';
    html += '<option value="' + TARGET_ALL + '"' + (draft.target === TARGET_ALL ? ' selected' : '') + '>전체 작업자 (' + props.totalCount + '명)</option>';
    props.workZones.forEach(function (z) {
      var count = props.zoneCounts[z.id] || 0;
      html += '<option value="' + z.id + '"' + (draft.target === z.id ? ' selected' : '') + '>' +
        esc(z.name) + ' (' + count + '명)</option>';
    });
    html += '</select>';

    html += '<label class="field-label">빠른 문구</label>';
    html += '<div class="notify-preset-row">';
    PRESETS.forEach(function (p, i) {
      html += '<button class="btn btn-preset" data-preset-index="' + i + '">' + esc(p.label) + '</button>';
    });
    html += '</div>';

    html += '<label class="field-label" for="notify-message-input">보낼 내용</label>';
    html += '<textarea class="input notify-textarea" id="notify-message-input" maxlength="200" rows="3" ';
    html += 'placeholder="예: A구역 3번 설비 점검 후 보고해주세요.">' + esc(draft.message || '') + '</textarea>';

    html += '<div class="notify-level-row">';
    [LEVELS.NORMAL, LEVELS.IMPORTANT].forEach(function (lv) {
      var active = draft.level === lv ? ' active' : '';
      html += '<button class="btn btn-stage' + active + '" data-level="' + lv + '">' + esc(LEVEL_LABELS[lv]) + '</button>';
    });
    html += '</div>';

    html += '<button class="btn btn-primary" id="notify-send-btn">알림 보내기</button>';

    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + esc(props.feedbackMessage) + '</div>';
    }

    if (props.sent.length > 0) {
      html += '<div class="notify-sent-title">보낸 알림</div>';
      html += '<ul class="notify-sent-list">';
      props.sent.forEach(function (n) {
        html += '<li class="notify-sent-item">';
        html += '<div class="notify-sent-head">';
        html += '<span class="notify-sent-time">' + formatTime(n.createdAt) + '</span>';
        html += '<span class="notify-sent-target">' + esc(n.targetLabel) + '</span>';
        if (n.level === LEVELS.IMPORTANT) html += '<span class="notify-sent-important">중요</span>';
        html += '<span class="notify-sent-read">확인 ' + n.readCount + '/' + n.recipientCount + '</span>';
        html += '</div>';
        html += '<div class="notify-sent-text">' + esc(n.message) + '</div>';
        html += '</li>';
      });
      html += '</ul>';
    }

    html += '</div>';
    container.innerHTML = html;

    var targetSelect = container.querySelector('#notify-target-select');
    var messageInput = container.querySelector('#notify-message-input');

    targetSelect.addEventListener('change', function () { props.onDraftChange('target', targetSelect.value); });
    messageInput.addEventListener('input', function () { props.onDraftChange('message', messageInput.value); });

    container.querySelectorAll('.btn-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = PRESETS[Number(btn.getAttribute('data-preset-index'))];
        props.onPreset(preset);
      });
    });

    container.querySelectorAll('[data-level]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        props.onDraftChange('level', btn.getAttribute('data-level'));
      });
    });

    container.querySelector('#notify-send-btn').addEventListener('click', function () {
      props.onSend({
        target: targetSelect.value,
        message: messageInput.value,
        level: draft.level
      });
    });
  }

  return { render: render };
})();
