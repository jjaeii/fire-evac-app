// L0 화면층 - NotificationBanner
// 관리자가 보낸 알림을 작업자 화면 맨 위에 띄운다. 확인을 누르기 전까지 남아 있는다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.NotificationBanner = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var LEVELS = window.App.Constants.NOTIFICATION_LEVELS;
  var LEVEL_LABELS = window.App.Constants.NOTIFICATION_LEVEL_LABELS;

  function formatTime(iso) {
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function render(container, props) {
    var unread = props.unread || [];
    var history = props.history || [];

    if (unread.length === 0 && history.length === 0) {
      container.innerHTML = '';
      return;
    }

    var html = '';

    if (unread.length > 0) {
      html += '<div class="noti-stack">';
      unread.forEach(function (n) {
        var important = n.level === LEVELS.IMPORTANT;
        html += '<div class="noti-card' + (important ? ' noti-card-important' : '') + '">';
        html += '<div class="noti-head">';
        html += '<span class="noti-badge' + (important ? ' noti-badge-important' : '') + '">' +
          esc(LEVEL_LABELS[n.level] || '일반') + ' 알림</span>';
        html += '<span class="noti-time">' + formatTime(n.createdAt) + '</span>';
        html += '</div>';
        html += '<p class="noti-message">' + esc(n.message) + '</p>';
        html += '<div class="noti-target">보낸 곳: 안전관리자 · 대상 ' + esc(n.targetLabel) + '</div>';
        html += '<button class="btn btn-noti-ack" data-noti-id="' + esc(n.id) + '">확인</button>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (history.length > 0) {
      html += '<details class="panel noti-history">';
      html += '<summary>지난 알림 ' + history.length + '건</summary>';
      html += '<ul class="noti-history-list">';
      history.forEach(function (n) {
        html += '<li class="noti-history-item">';
        html += '<span class="noti-history-time">' + formatTime(n.createdAt) + '</span>';
        html += '<span class="noti-history-text">' + esc(n.message) + '</span>';
        html += '</li>';
      });
      html += '</ul>';
      html += '</details>';
    }

    container.innerHTML = html;

    container.querySelectorAll('.btn-noti-ack').forEach(function (btn) {
      btn.addEventListener('click', function () {
        props.onAcknowledge(btn.getAttribute('data-noti-id'));
      });
    });
  }

  return { render: render };
})();
