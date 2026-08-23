// L0 화면층 - ZoneQrBindingPanel (관리자)
// 현장에 붙일 QR 사진을 A → B → C 순서대로 올려 각 작업구역에 연결한다.
// 여기서 한 번 등록해두면 작업자가 그 QR을 찍었을 때 해당 구역으로 인식된다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.ZoneQrBindingPanel = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var QrDecode = window.App.Services.QrDecodeService;
  var ScannerOverlay = window.App.Components.QrScannerOverlay;

  function shorten(value) {
    return value.length > 36 ? value.slice(0, 34) + '…' : value;
  }

  function renderSlot(zone, index, mappings, defaults) {
    var bound = mappings.filter(function (m) { return m.workZoneId === zone.id; });
    var defaultCodes = Object.keys(defaults).filter(function (code) { return defaults[code] === zone.id; });

    var recognizable = bound.length > 0 || defaultCodes.length > 0;
    var html = '<div class="qr-slot' + (recognizable ? ' qr-slot-done' : '') + '">';
    html += '<div class="qr-slot-head">';
    html += '<span class="qr-slot-order">' + (index + 1) + '번째 사진</span>';
    html += '<span class="qr-slot-zone">' + esc(zone.name) + ' · ' + esc(zone.purpose || '') + '</span>';
    html += '</div>';

    html += '<div class="qr-slot-actions">';
    html += '<label class="btn btn-secondary qr-slot-upload" for="qr-slot-file-' + zone.id + '">' +
      (bound.length > 0 ? 'QR 사진 다시 올리기' : 'QR 사진 올리기') +
      '<input type="file" accept="image/*" id="qr-slot-file-' + zone.id + '" data-zone-id="' + zone.id + '" hidden /></label>';
    html += '<button class="btn btn-secondary qr-slot-scan" data-zone-id="' + zone.id + '">카메라로 스캔</button>';
    html += '</div>';

    html += '<div class="qr-bind-codes">';
    defaultCodes.forEach(function (code) {
      html += '<span class="qr-code-chip qr-code-default" title="앱 기본 코드">' + esc(code) + ' <span class="qr-code-tag">기본</span></span>';
    });
    if (bound.length === 0) {
      html += '<span class="qr-bind-none">현장 QR 미등록</span>';
    } else {
      bound.forEach(function (m) {
        html += '<span class="qr-code-chip qr-code-bound" title="' + esc(m.qrValue) + '">' + esc(shorten(m.qrValue));
        html += ' <button class="qr-code-remove" data-qr="' + esc(m.qrValue) + '" aria-label="연결 해제">×</button></span>';
      });
    }
    html += '</div>';
    html += '</div>';
    return html;
  }

  function render(container, props) {
    var zones = props.workZones;
    var mappings = props.mappings;
    var defaults = window.App.Data.SITE.defaultQrToWorkZone;
    // 기본 코드(SECTOR-A/B/C)만으로도 인식은 된다. 진행률은 "인식 가능한 구역" 기준으로 센다.
    var readyCount = zones.filter(function (z) {
      var hasCustom = mappings.some(function (m) { return m.workZoneId === z.id; });
      var hasDefault = Object.keys(defaults).some(function (code) { return defaults[code] === z.id; });
      return hasCustom || hasDefault;
    }).length;

    var html = '<div class="panel admin-panel">';
    html += '<h3 class="panel-title">구역 QR 코드 등록</h3>';
    html += '<p class="panel-sub">SECTOR-A / SECTOR-B / SECTOR-C QR은 이미 연결되어 있습니다. 다른 QR을 쓰려면 사진을 올리거나 스캔해 바꾸세요.</p>';
    html += '<div class="qr-bind-progress">QR 인식 가능 구역 ' + readyCount + ' / ' + zones.length + '</div>';

    html += '<div class="qr-slot-list">';
    zones.forEach(function (z, i) { html += renderSlot(z, i, mappings, defaults); });
    html += '</div>';

    if (props.feedbackMessage) {
      html += '<div class="feedback ' + (props.feedbackOk ? 'feedback-ok' : 'feedback-error') + '">' + esc(props.feedbackMessage) + '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.qr-slot-actions input[type="file"]').forEach(function (input) {
      input.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var zoneId = input.getAttribute('data-zone-id');
        QrDecode.decodeFromFile(file).then(function (result) {
          if (result.ok) props.onBind(result.value, zoneId);
          else props.onDecodeError(result.error.message);
        });
      });
    });

    container.querySelectorAll('.qr-slot-scan').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var zoneId = btn.getAttribute('data-zone-id');
        var zone = zones.filter(function (z) { return z.id === zoneId; })[0];
        ScannerOverlay.open({
          title: (zone ? zone.name : '') + ' QR 등록 스캔',
          onResult: function (value) { props.onBind(value, zoneId); }
        });
      });
    });

    container.querySelectorAll('.qr-code-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        props.onUnbind(btn.getAttribute('data-qr'));
      });
    });
  }

  return { render: render };
})();
