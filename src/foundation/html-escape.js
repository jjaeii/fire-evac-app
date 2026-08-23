// L3 기반층 - HtmlEscape
// 작업자 이름·소속처럼 사람이 입력한 값을 innerHTML로 넣기 전에 반드시 통과시킨다.
window.App = window.App || {};
window.App.Foundation = window.App.Foundation || {};

window.App.Foundation.HtmlEscape = (function () {
  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escape(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function (ch) { return MAP[ch]; });
  }

  return { escape: escape };
})();
