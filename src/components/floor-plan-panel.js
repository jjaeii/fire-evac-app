// L0 화면층 - FloorPlanPanel
// 1층 공장 도면을 그리고, 그 위에 "지금 어느 구역에 누가 있는지"와
// "어느 구역에 불이 났는지"를 표시한다.
//
// 배치는 현장 도면과 같다:
//   A구역(좌상단) · B구역(우상단) · C구역(중앙 하단) · 남측 부속실 · 정문
//
// 화면은 판단하지 않는다. AdminStatusService가 만든 행(rows)과
// 넘겨받은 emergency 상태를 배치만 한다.
window.App = window.App || {};
window.App.Components = window.App.Components || {};

window.App.Components.FloorPlanPanel = (function () {
  var esc = window.App.Foundation.HtmlEscape.escape;
  var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
  var FIRE_STAGE_LABELS = window.App.Constants.FIRE_STAGE_LABELS;

  // 도면상 벽에 붙는 설비 표시. left/top은 건물 박스 기준 백분율.
  var WALL_MARKERS = [
    { kind: 'exit', exitId: 'exit_1', label: '비상구 1', left: 42, top: 0 },
    { kind: 'exit', exitId: 'exit_2', label: '비상구 2', left: 0, top: 42 },
    { kind: 'exit', exitId: 'exit_3', label: '비상구 3', left: 100, top: 42 },
    { kind: 'exit', exitId: 'exit_4', label: '비상구 4', left: 50, top: 72 },
    { kind: 'fire', label: '소화기', left: 0, top: 20 },
    { kind: 'fire', label: '소화기', left: 0, top: 64 },
    { kind: 'fire', label: '소화기', left: 62, top: 0 },
    { kind: 'fire', label: '소화기', left: 100, top: 20 },
    { kind: 'fire', label: '소화기', left: 100, top: 64 }
  ];

  var ZONE_CCTV = { zone_a: 'CAM-A', zone_b: 'CAM-B', zone_c: 'CAM-C' };

  function confirmClass(row, isEmergency) {
    if (!isEmergency) return 'occupant-idle';
    return row.confirmStatus === 'none' ? 'occupant-unconfirmed' : 'occupant-confirmed';
  }

  function renderOccupant(row, isEmergency) {
    var birth = window.App.Services.WorkerIdentityService.formatBirthDate(row.birthDate);
    var title = row.workerName + ' (' + birth + ')';
    return '<span class="occupant ' + confirmClass(row, isEmergency) + '" title="' + esc(title) + '">' +
      '<span class="occupant-dot"></span>' + esc(row.workerName) + '</span>';
  }

  function renderZone(zone, rows, props) {
    var isEmergency = props.isEmergency;
    // 복구 후에도 발생 구역 기록은 남으므로, 진행 중일 때만 화재 구역으로 표시한다.
    var onFire = isEmergency && props.affectedWorkZoneId === zone.id;
    var unconfirmed = rows.filter(function (r) { return r.confirmStatus === 'none'; }).length;

    var classes = ['fp2-zone', 'fp2-' + zone.id];
    if (onFire) classes.push('fp2-zone-fire');
    if (rows.length === 0) classes.push('fp2-zone-empty');

    var html = '<div class="' + classes.join(' ') + '" data-zone-id="' + zone.id + '">';

    if (ZONE_CCTV[zone.id]) {
      html += '<span class="fp2-cctv" title="AI 화재·연기·사람 감지 CCTV">CCTV ' + esc(ZONE_CCTV[zone.id]) + '</span>';
    }

    html += '<div class="fp2-zone-head">';
    html += '<span class="fp2-zone-tag">' + esc(zone.name) + '</span>';
    html += '<span class="fp2-zone-count">' + rows.length + '명</span>';
    html += '</div>';
    html += '<div class="fp2-zone-purpose">' + esc(zone.purpose || '') + '</div>';

    if (onFire) {
      html += '<div class="fp2-fire-flag">';
      html += '<span class="fp2-fire-icon" aria-hidden="true">🔥</span>';
      html += '<span class="fp2-fire-text">화재 발생<span class="fp2-fire-stage">' +
        esc(FIRE_STAGE_LABELS[props.fireStage] || '') + '</span></span>';
      html += '</div>';
    }

    html += '<div class="fp-occupants">';
    if (rows.length === 0) {
      html += '<span class="fp-empty-text">현재 인원 없음</span>';
    } else {
      rows.forEach(function (r) { html += renderOccupant(r, isEmergency); });
    }
    html += '</div>';

    if (isEmergency && unconfirmed > 0) {
      html += '<div class="fp2-zone-alert">대피 미확인 ' + unconfirmed + '명</div>';
    }

    html += '</div>';
    return html;
  }

  function renderWallMarkers(blockedExitIds) {
    var html = '';
    WALL_MARKERS.forEach(function (m) {
      var blocked = m.kind === 'exit' && m.exitId && blockedExitIds.indexOf(m.exitId) !== -1;
      var cls = 'fp2-marker fp2-marker-' + m.kind + (blocked ? ' fp2-marker-blocked' : '');
      var label = blocked ? m.label + ' 차단' : m.label;
      html += '<span class="' + cls + '" style="left:' + m.left + '%;top:' + m.top + '%" title="' + esc(label) + '">';
      html += m.kind === 'exit' ? '🚪' : '🧯';
      html += '<span class="fp2-marker-label">' + esc(label) + '</span>';
      html += '</span>';
    });
    return html;
  }

  function render(container, props) {
    var zones = props.workZones;
    var rows = props.rows || [];
    var emergency = props.emergency;
    var isEmergency = emergency.fireStage !== FIRE_STAGES.NONE;
    var blockedExitIds = props.blockedExitIds || [];

    var byZone = {};
    zones.forEach(function (z) { byZone[z.id] = []; });
    var unassigned = [];
    rows.forEach(function (r) {
      if (r.workZoneId && byZone[r.workZoneId]) byZone[r.workZoneId].push(r);
      else unassigned.push(r);
    });

    var zoneProps = {
      affectedWorkZoneId: emergency.affectedWorkZoneId,
      isEmergency: isEmergency,
      fireStage: emergency.fireStage
    };

    var affectedZone = emergency.affectedWorkZoneId
      ? zones.filter(function (z) { return z.id === emergency.affectedWorkZoneId; })[0]
      : null;

    var html = '<div class="panel admin-panel floor-plan-panel' + (isEmergency ? ' floor-plan-fire' : '') + '">';
    html += '<h3 class="panel-title">1층 공장 도면</h3>';

    if (isEmergency && affectedZone) {
      var unconfirmedTotal = byZone[affectedZone.id].filter(function (r) { return r.confirmStatus === 'none'; }).length;
      html += '<div class="fp2-alarm-strip">';
      html += '<span class="fp2-alarm-icon" aria-hidden="true">🔥</span>';
      html += '<span class="fp2-alarm-text">' + esc(affectedZone.name) + ' ' + esc(affectedZone.purpose || '') +
        ' · ' + esc(FIRE_STAGE_LABELS[emergency.fireStage] || '') + '</span>';
      html += '<span class="fp2-alarm-count">해당 구역 ' + byZone[affectedZone.id].length + '명 / 미확인 ' + unconfirmedTotal + '명</span>';
      html += '</div>';
    } else if (isEmergency) {
      html += '<div class="fp2-alarm-strip fp2-alarm-strip-unknown">발생 구역이 지정되지 않았습니다. 비상상황 입력에서 구역을 선택하세요.</div>';
    } else {
      html += '<p class="panel-sub">QR로 등록된 현재 위치 기준입니다. 실제 인원은 현장 점검으로 확인하세요.</p>';
    }

    html += '<div class="fp2-legend">';
    html += '<span class="fp2-legend-item"><span class="fp2-legend-swatch">🚪</span>비상구</span>';
    html += '<span class="fp2-legend-item"><span class="fp2-legend-swatch">🧯</span>소화기</span>';
    html += '<span class="fp2-legend-item"><span class="occupant-dot legend-idle"></span>작업 중</span>';
    html += '<span class="fp2-legend-item"><span class="occupant-dot legend-unconfirmed"></span>대피 미확인</span>';
    html += '<span class="fp2-legend-item"><span class="occupant-dot legend-confirmed"></span>확인 완료</span>';
    html += '</div>';

    html += '<div class="fp2-building">';
    html += renderWallMarkers(blockedExitIds);

    // 상단: A구역(좌) · B구역(우)
    html += '<div class="fp2-row fp2-row-upper">';
    html += renderZone(zones[0], byZone[zones[0].id], zoneProps);
    html += '<div class="fp2-gap" aria-hidden="true"></div>';
    html += renderZone(zones[1], byZone[zones[1].id], zoneProps);
    html += '</div>';

    // 중단: C구역(중앙)
    html += '<div class="fp2-row fp2-row-middle">';
    html += renderZone(zones[2], byZone[zones[2].id], zoneProps);
    html += '</div>';

    // 남측 부속실
    html += '<div class="fp2-service">';
    html += '<div class="fp2-room">화장실</div>';
    html += '<div class="fp2-room">휴게실</div>';
    html += '<div class="fp2-room fp2-room-gate">정문</div>';
    html += '<div class="fp2-room">사무실</div>';
    html += '<div class="fp2-room">안전관리실</div>';
    html += '</div>';

    html += '</div>'; // fp2-building

    if (blockedExitIds.length > 0) {
      html += '<div class="fp2-blocked-note">차단 표시된 비상구는 사용 불가 대피로로 등록된 출구입니다.</div>';
    }

    if (unassigned.length > 0) {
      html += '<div class="fp-unassigned">';
      html += '<div class="fp-unassigned-title">구역 미등록 ' + unassigned.length +
        '명 <span class="fp-unassigned-note">(로그인했지만 QR 미스캔)</span></div>';
      html += '<div class="fp-occupants">';
      unassigned.forEach(function (r) { html += renderOccupant(r, isEmergency); });
      html += '</div>';
      html += '</div>';
    }

    if (rows.length === 0) {
      html += '<div class="fp-none">현재 로그인한 작업자가 없습니다.</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  return { render: render };
})();
