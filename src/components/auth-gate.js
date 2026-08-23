// L0 화면층 - AuthGate
// 앱을 처음 켜면 나오는 화면. 회원가입(이름 + 생년월일)과 로그인 두 가지 모드를 가진다.
// 화면은 판단하지 않는다. 입력값을 그대로 WorkerIdentityService에 넘기고 결과만 보여준다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.AuthGate = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var MESSAGE = window.App.Constants.MESSAGE;

  function render(container, props) {
    var isSignup = props.mode !== 'login';

    var html = '<div class="panel auth-gate">';

    html += '<div class="auth-tabs">';
    html += '<button class="auth-tab' + (isSignup ? ' active' : '') + '" id="auth-tab-signup">회원가입</button>';
    html += '<button class="auth-tab' + (!isSignup ? ' active' : '') + '" id="auth-tab-login">로그인</button>';
    html += '</div>';

    html += '<p class="panel-sub auth-sub">' + (isSignup ? MESSAGE.SIGNUP_PROMPT : MESSAGE.LOGIN_PROMPT) + '</p>';

    if (isSignup) {
      html += '<label class="field-label">구분 <span class="required-mark">*</span></label>';
      html += '<div class="auth-role-row">';
      [
        { value: 'worker', label: '작업자', sub: 'QR로 작업구역 등록 · 대피 안내 수신' },
        { value: 'admin', label: '안전관리자', sub: '화재 단계 입력 · 도면 현황 · 알림 발송' }
      ].forEach(function (r) {
        var active = props.draftRole === r.value ? ' active' : '';
        html += '<button class="auth-role' + active + '" data-role="' + r.value + '">';
        html += '<span class="auth-role-name">' + r.label + '</span>';
        html += '<span class="auth-role-sub">' + r.sub + '</span>';
        html += '</button>';
      });
      html += '</div>';
    }

    html += '<label class="field-label" for="auth-name-input">이름 <span class="required-mark">*</span></label>';
    html += '<input type="text" class="input" id="auth-name-input" maxlength="20" autocomplete="name" ';
    html += 'placeholder="이름" value="' + esc(props.draftName || '') + '" />';

    html += '<label class="field-label" for="auth-birth-input">생년월일 <span class="required-mark">*</span></label>';
    html += '<input type="date" class="input" id="auth-birth-input" min="1930-01-01" max="' + esc(props.today) + '" ';
    html += 'value="' + esc(props.draftBirthDate || '') + '" />';

    html += '<button class="btn btn-primary btn-enter" id="auth-submit-btn">' +
      (isSignup ? '가입하고 시작하기' : '로그인') + '</button>';

    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + esc(props.feedbackMessage) + '</div>';
    }

    html += '<p class="entry-note">' + (isSignup
      ? '가입하면 바로 로그인됩니다. 비밀번호는 없습니다.<br />입력한 이름·생년월일은 이 기기와 현장 대피 확인 명단에만 저장되고 외부로 전송되지 않습니다.'
      : '가입한 기록이 이 기기에 있어야 로그인됩니다.') + '</p>';

    html += '</div>';
    container.innerHTML = html;

    var nameInput = container.querySelector('#auth-name-input');
    var birthInput = container.querySelector('#auth-birth-input');

    function submit() {
      props.onSubmit({
        mode: isSignup ? 'signup' : 'login',
        name: nameInput.value,
        birthDate: birthInput.value,
        role: props.draftRole
      });
    }

    container.querySelectorAll('[data-role]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        props.onDraftChange('role', btn.getAttribute('data-role'));
      });
    });

    container.querySelector('#auth-submit-btn').addEventListener('click', submit);
    [nameInput, birthInput].forEach(function (el) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submit();
      });
    });

    container.querySelector('#auth-tab-signup').addEventListener('click', function () { props.onModeChange('signup'); });
    container.querySelector('#auth-tab-login').addEventListener('click', function () { props.onModeChange('login'); });

    nameInput.addEventListener('input', function () { props.onDraftChange('name', nameInput.value); });
    birthInput.addEventListener('input', function () { props.onDraftChange('birthDate', birthInput.value); });
  }

  return { render: render };
})();
