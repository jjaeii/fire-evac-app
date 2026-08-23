// L0 화면층 - SiteResetPanel (관리자)
// 다음 회차를 깨끗하게 시작하기 위해 현장 기록을 비운다.
// 잘못 눌리면 곤란하므로 두 번 눌러야 실행된다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.SiteResetPanel = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;

  function formatWhen(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function render(container, props) {
    var lastCleared = formatWhen(props.lastClearedAt);

    // 확인 중이거나 방금 결과가 나온 경우에는 접히지 않게 열어둔다.
    var keepOpen = props.armed || !!props.feedbackMessage;
    var html = '<details class="panel admin-panel reset-panel"' + (keepOpen ? ' open' : '') + '>';
    html += '<summary class="reset-summary">현장 초기화</summary>';

    html += '<p class="panel-sub reset-sub">연습이나 지난 시연에서 남은 기록을 비우고 새로 시작합니다. ' +
      '계정은 지워지지 않아서 같은 이름·생년월일로 다시 로그인할 수 있습니다.</p>';

    html += '<ul class="reset-list">';
    html += '<li>현장 인원 전원 퇴장 (' + props.onSiteCount + '명) — 도면과 명단이 비워집니다</li>';
    html += '<li>화재 상태를 정상으로</li>';
    html += '<li>사용 불가 대피로 해제</li>';
    html += '<li>지난 알림과 대피 확인 기록 숨김</li>';
    html += '</ul>';
    html += '<p class="reset-keep">초기화를 누른 본인(' + esc(props.adminName) + ')은 로그인 상태로 남습니다.</p>';

    if (lastCleared) {
      html += '<div class="reset-last">마지막 초기화 · ' + esc(lastCleared) + '</div>';
    }

    if (props.armed) {
      html += '<div class="reset-confirm">정말 초기화할까요? 다른 기기에도 즉시 적용됩니다.</div>';
      html += '<div class="reset-actions">';
      html += '<button class="btn btn-reset-go" id="reset-go-btn">네, 초기화합니다</button>';
      html += '<button class="btn btn-secondary" id="reset-cancel-btn">취소</button>';
      html += '</div>';
    } else {
      html += '<button class="btn btn-secondary btn-reset-arm" id="reset-arm-btn">현장 초기화하기</button>';
    }

    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' +
        esc(props.feedbackMessage) + '</div>';
    }

    html += '</details>';
    container.innerHTML = html;

    var arm = container.querySelector('#reset-arm-btn');
    if (arm) arm.addEventListener('click', function () { props.onArm(); });

    var cancel = container.querySelector('#reset-cancel-btn');
    if (cancel) cancel.addEventListener('click', function () { props.onCancel(); });

    var go = container.querySelector('#reset-go-btn');
    if (go) go.addEventListener('click', function () { props.onReset(); });
  }

  return { render: render };
})();
