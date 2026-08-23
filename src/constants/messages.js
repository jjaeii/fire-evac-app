// L3 기반층 - 화면 문구 상수
// 이상징후·초기화재 단계에서는 "대피하지 않음" 표현을 쓰지 않는다.
window.App = window.App || {};
window.App.Constants = window.App.Constants || {};

window.App.Constants.MESSAGE = Object.freeze({
  NORMAL: '현재 정상 작업 상태입니다.',
  ANOMALY_CHECKING: '안전관리자 확인 중입니다. 현장 안내를 기다려주세요.',
  INITIAL_FIRE_CONTROL: '안전관리자 통제 중입니다. 현장 안내를 따라주세요.',
  EVACUATE: '대피가 필요합니다. 표시된 대피 방향과 사용 가능한 대피구를 확인하세요.',
  MAJOR_EVACUATE: '즉시 대피하세요. 안전관리자와 현장 지시에 따르세요.',
  RESOLVED_SITUATION: '상황이 해소되었습니다. 안전관리자 안내에 따라 정상 작업을 재개하세요.',
  RESOLVED_FIRE_SUPPRESSED: '진압이 완료되었습니다. 안전관리자 안내에 따라주세요.',
  RESOLVED_NORMAL: '정상 상태로 복구되었습니다.',
  PENDING_ZONE: '현재 작업구역 정보가 없습니다. QR을 다시 스캔해주세요.',
  PENDING_STAGE: '관리자 확인 중입니다.',
  NO_ROUTE: '안전관리자 지시를 따르세요. 앱에서 사용 가능한 대피로를 찾지 못했습니다.',
  INVALID_QR: '이 앱에 등록되지 않은 QR입니다. 관리자에게 문의하거나 다시 스캔해주세요.',
  SAVE_FAILED: '저장하지 못했습니다. 다시 시도해주세요.',
  WORK_ZONE_REQUIRED: '발생 작업구역을 선택해주세요.',

  // 회원가입 / 로그인
  NAME_REQUIRED: '이름을 입력해주세요.',
  NAME_TOO_LONG: '이름은 20자 이내로 입력해주세요.',
  BIRTH_REQUIRED: '생년월일을 입력해주세요.',
  BIRTH_INVALID: '생년월일을 올바르게 입력해주세요.',
  BIRTH_FUTURE: '생년월일이 오늘 이후일 수 없습니다.',
  SIGNUP_PROMPT: '이름과 생년월일만 입력하면 바로 시작합니다.',
  SIGNUP_DUPLICATE: '이미 등록된 이름과 생년월일입니다. 로그인으로 들어갑니다.',
  LOGIN_NOT_FOUND: '등록되지 않은 이름·생년월일입니다. 회원가입을 먼저 해주세요.',
  LOGIN_PROMPT: '가입할 때 쓴 이름과 생년월일을 입력하세요.',
  ENTER_PROMPT: '이름을 입력하고 입장한 뒤, 작업구역 QR을 스캔하세요.',

  // 관리자 알림
  NOTIFICATION_EMPTY: '보낼 내용을 입력해주세요.',
  NOTIFICATION_TOO_LONG: '알림은 200자 이내로 입력해주세요.',
  NOTIFICATION_SENT: '알림을 보냈습니다.',
  NOTIFICATION_NEW: '관리자 알림',

  // QR 스캔
  QR_CAMERA_DENIED: '카메라 권한이 없습니다. 브라우저 설정에서 카메라를 허용하거나 사진 인식을 사용하세요.',
  QR_CAMERA_UNAVAILABLE: '이 기기·브라우저에서 카메라를 열 수 없습니다. 사진 인식이나 직접 입력을 사용하세요.',
  QR_NOT_FOUND_IN_IMAGE: '사진에서 QR을 찾지 못했습니다. 더 가까이·밝게 찍어 다시 시도해주세요.',
  QR_DECODER_MISSING: 'QR 인식 모듈을 불러오지 못했습니다. 직접 입력을 사용하세요.',
  QR_SCANNING: 'QR을 화면 안쪽 사각형에 맞춰주세요.',

  // 카메라 권한
  CAMERA_GATE_TITLE: '카메라를 사용해도 될까요?',
  CAMERA_GATE_BODY: '작업구역 입구의 QR 코드를 찍어 지금 어느 구역에서 일하는지 등록합니다. 화재가 나면 이 위치를 기준으로 대피 안내가 나갑니다.',
  CAMERA_GATE_NOTE: '촬영한 영상은 기기 안에서 QR을 읽는 데만 쓰이고, 저장하거나 외부로 보내지 않습니다.',
  CAMERA_NEEDS_HTTPS: '카메라는 보안 연결(https)에서만 열 수 있습니다. 아래 주소로 다시 접속해주세요.',
  CAMERA_NEEDS_SERVER: 'index.html 파일을 직접 연 상태(file://)에서는 카메라를 쓸 수 없습니다. 서버를 켜고 http://localhost:8123 으로 접속해주세요.',
  CAMERA_BLOCKED_IN_FRAME: '다른 페이지 안에 끼워진 상태(iframe)라 카메라가 막혀 있습니다. 새 탭에서 앱 주소를 직접 열어주세요.',
  CAMERA_BLOCKED_BY_BROWSER: '이 창에서는 카메라가 차단되어 있습니다.',
  CAMERA_BLOCKED_WHY_PREBLOCKED: '권한을 묻지도 않고 막힌 상태입니다. 앱 안에 내장된 미리보기 창(예: 편집기 미리보기)은 카메라를 지원하지 않습니다. 크롬 같은 일반 브라우저에서 아래 주소를 열어주세요.',
  CAMERA_BLOCKED_WHY_DENIED: '이전에 "차단"을 선택했거나 브라우저 설정에서 막혀 있습니다. 주소창 왼쪽 자물쇠 · ⓘ 아이콘 → 사이트 설정 → 카메라를 "허용"으로 바꾸고 새로고침하세요.',
  CAMERA_OPEN_ELSEWHERE: '카메라가 되는 곳에서 열기',
  CAMERA_READY: '카메라를 사용할 수 있습니다.',
  CAMERA_DECLINED: '카메라를 쓰지 않도록 설정했습니다. 사진 인식이나 직접 입력을 사용하세요.',

  // 화재경보
  FIRE_ALERT_TITLE: '화재 발생',
  // 대피 단계에서 누르는 버튼. 실제로 대피를 마쳤다는 뜻이다.
  FIRE_ALERT_EVACUATED: '대피했습니다',
  // 이상징후·초기화재 단계에서 누르는 버튼.
  // 이 단계에서는 대피가 아니라 현장 안내를 따르는 것이 맞으므로 "대피" 표현을 쓰지 않는다.
  FIRE_ALERT_ACK: '확인했습니다',

  // 구역 QR 등록(관리자)
  QR_BIND_ZONE_REQUIRED: '연결할 작업구역을 먼저 선택해주세요.',
  QR_BIND_DONE: '이 QR이 작업구역에 연결되었습니다.'
});
