// L2 자료층 - 현장 기준 데이터 (1층 공장 도면 기준)
// 작업자 명부는 고정 데이터가 아니다. 작업자가 이름을 입력하고 입장할 때 생성된다.
window.App = window.App || {};
window.App.Data = window.App.Data || {};

window.App.Data.SITE = {
  building: { name: '제조공장 1층', floorLabel: '1층' },

  // 1층 도면 배치: A구역(좌상단) · B구역(우상단) · C구역(중앙 하단)
  // 나머지는 통로이고, 남측에 화장실 / 휴게실 / 정문 / 사무실 / 안전관리실이 있다.
  workZones: [
    { id: 'zone_a', name: 'A구역', purpose: '생산라인', floorLabel: '1층', defaultEvacuationDirection: '서측 비상구 2로 이동', defaultExitId: 'exit_2' },
    { id: 'zone_b', name: 'B구역', purpose: '조립라인', floorLabel: '1층', defaultEvacuationDirection: '동측 비상구 3으로 이동', defaultExitId: 'exit_3' },
    { id: 'zone_c', name: 'C구역', purpose: '자재·창고', floorLabel: '1층', defaultEvacuationDirection: '남측 비상구 4로 이동', defaultExitId: 'exit_4' }
  ],

  exits: [
    { id: 'exit_1', name: '비상구 1', locationLabel: '북측 중앙 외벽', isDefaultAvailable: true },
    { id: 'exit_2', name: '비상구 2', locationLabel: '서측 외벽 · A구역 옆', isDefaultAvailable: true },
    { id: 'exit_3', name: '비상구 3', locationLabel: '동측 외벽 · B구역 옆', isDefaultAvailable: true },
    { id: 'exit_4', name: '비상구 4', locationLabel: '남측 · C구역 아래', isDefaultAvailable: true },
    { id: 'exit_main', name: '정문', locationLabel: '남측 중앙', isDefaultAvailable: true }
  ],

  evacuationRoutes: [
    { id: 'route_a_2', workZoneId: 'zone_a', exitId: 'exit_2', routeName: 'A-서측 대피로', directionText: 'A구역 생산라인에서 서쪽 통로로 나와 비상구 2로 나간다', priorityOrder: 1 },
    { id: 'route_a_1', workZoneId: 'zone_a', exitId: 'exit_1', routeName: 'A-북측 대피로', directionText: 'A구역 동쪽 문으로 나와 북측 통로 → 비상구 1로 나간다', priorityOrder: 2 },
    { id: 'route_a_main', workZoneId: 'zone_a', exitId: 'exit_main', routeName: 'A-정문 대피로', directionText: 'A구역에서 남쪽 통로로 내려와 정문으로 나간다', priorityOrder: 3 },

    { id: 'route_b_3', workZoneId: 'zone_b', exitId: 'exit_3', routeName: 'B-동측 대피로', directionText: 'B구역 조립라인에서 동쪽 통로로 나와 비상구 3으로 나간다', priorityOrder: 1 },
    { id: 'route_b_1', workZoneId: 'zone_b', exitId: 'exit_1', routeName: 'B-북측 대피로', directionText: 'B구역 서쪽 문으로 나와 북측 통로 → 비상구 1로 나간다', priorityOrder: 2 },
    { id: 'route_b_main', workZoneId: 'zone_b', exitId: 'exit_main', routeName: 'B-정문 대피로', directionText: 'B구역에서 남쪽 통로로 내려와 정문으로 나간다', priorityOrder: 3 },

    { id: 'route_c_4', workZoneId: 'zone_c', exitId: 'exit_4', routeName: 'C-남측 대피로', directionText: 'C구역 자재·창고 남쪽 문으로 나와 비상구 4로 나간다', priorityOrder: 1 },
    { id: 'route_c_main', workZoneId: 'zone_c', exitId: 'exit_main', routeName: 'C-정문 대피로', directionText: 'C구역 남쪽 문 → 정문으로 나간다', priorityOrder: 2 },
    { id: 'route_c_2', workZoneId: 'zone_c', exitId: 'exit_2', routeName: 'C-서측 대피로', directionText: 'C구역에서 서쪽 통로를 따라 이동 → 비상구 2로 나간다', priorityOrder: 3 }
  ],

  // 작업자는 입장 시 이름 입력으로 등록된다. 사전 등록된 인물은 두지 않는다.
  workers: [],

  admins: [
    { id: 'admin_1', name: '안전관리자', role: 'safety_manager', canAccessAdminPanel: true }
  ],

  // 대형화재 단계에서 화면에 뜨는 신고 전화 버튼.
  // 이 앱은 전화를 자동으로 걸지 않는다. 사람이 눌러야 전화 앱이 열린다.
  // 실제 운영 시에는 119 또는 현장 방재실 번호로 바꿔 쓴다.
  emergencyContact: {
    label: '신고 전화',
    phone: '010-3198-0768',
    note: '시연용 번호입니다. 실제 화재 시에는 119로 신고하세요.'
  },

  // 기본 QR 문자열 → 작업구역.
  //
  // 현장에서 쓰는 스티커 3종은 실제 이미지를 디코딩해 확인한 값이다
  // (assets/images/qr-a.png, qr-b.png, qr-c.png):
  //   A: SECTOR-A          B: FACTORY-ZONE-B      C: FACTORY-ZONE-C
  // 세 장이 서로 다른 형식으로 만들어져 있어 형식을 통일해 추측할 수 없다.
  //
  // 대소문자와 -, _, 공백 차이는 QrMappingRepository가 흡수한다.
  // 여기 없는 QR을 찍으면 화면에서 구역을 골라 바로 연결할 수 있다.
  defaultQrToWorkZone: {
    // 현장 스티커 (디코딩 확인됨)
    'SECTOR-A': 'zone_a',
    'FACTORY-ZONE-B': 'zone_b',
    'FACTORY-ZONE-C': 'zone_c',

    // 같은 계열의 다른 표기도 함께 받아둔다
    'SECTOR-B': 'zone_b',
    'SECTOR-C': 'zone_c',
    'FACTORY-ZONE-A': 'zone_a',
    'QR-A': 'zone_a',
    'QR-B': 'zone_b',
    'QR-C': 'zone_c',
    'QR-ZONE-A': 'zone_a',
    'QR-ZONE-B': 'zone_b',
    'QR-ZONE-C': 'zone_c'
  }
};
