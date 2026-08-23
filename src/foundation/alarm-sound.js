// L3 기반층 - AlarmSound
// 화재경보음은 여기서만 만든다. 외부 음원 파일 없이 WebAudio로 사이렌을 합성한다.
// 브라우저 정책상 사용자의 조작(입장 버튼 등) 이후에만 소리가 난다. prime()으로 미리 열어둔다.
window.App = window.App || {};
window.App.Foundation = window.App.Foundation || {};

window.App.Foundation.AlarmSound = (function () {
  var ctx = null;
  var nodes = null;
  var isPlaying = false;
  var isMuted = false;

  function getContext() {
    if (ctx) return ctx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  // 사용자 조작 시점에 호출해 오디오 컨텍스트를 미리 깨워둔다.
  //
  // 휴대폰은 사용자가 화면을 만지기 전에는 소리를 내주지 않는다. 게다가 iOS는
  // 무음 길이가 0인 소리라도 한 번 재생해줘야 오디오가 실제로 열린다.
  // 그래서 아무 터치에서나 이 함수가 불리도록 아래 installUnlockHandlers를 쓴다.
  function prime() {
    var c = getContext();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(function () { /* 무시: 소리 없이도 화면 경보는 동작한다 */ });
    }
    try {
      // 아주 짧은 무음을 재생해 오디오 경로를 실제로 연다.
      var buf = c.createBuffer(1, 1, 22050);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch (e) { /* 무시 */ }
  }

  // 첫 터치·클릭·키입력에서 오디오를 열어둔다. 경보가 울려야 할 때 이미 준비된 상태가 된다.
  var unlockInstalled = false;
  function installUnlockHandlers() {
    if (unlockInstalled) return;
    unlockInstalled = true;
    ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, prime, { passive: true, capture: true });
    });
  }

  // 화재 사이렌.
  // 실제 경보기처럼 들리도록 두 겹으로 쌓는다:
  //   1) 위아래로 크게 훑는 wail 음 (톱니파 - 배음이 많아 멀리서도 들린다)
  //   2) 그 위에 얹는 사각파 - 휴대폰 스피커에서 소리가 야무지게 들리게 한다
  // 마지막에 컴프레서를 물려 최대 음량까지 밀어붙인다.
  function start() {
    if (isPlaying || isMuted) return;
    var c = getContext();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(function () {});
    }

    var now = c.currentTime;

    // 휴대폰 스피커에서 찌그러지지 않으면서 최대한 크게
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 6;
    comp.ratio.value = 12;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;

    var master = c.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.95, now + 0.15);

    // 사이렌 진동(초당 약 1.4회 위아래)
    var lfo = c.createOscillator();
    var lfoGain = c.createGain();
    lfo.type = 'triangle';
    lfo.frequency.value = 1.4;
    lfoGain.gain.value = 480;

    var wail = c.createOscillator();
    wail.type = 'sawtooth';
    wail.frequency.value = 860;

    var edge = c.createOscillator();
    edge.type = 'square';
    edge.frequency.value = 1290;

    var wailGain = c.createGain();
    wailGain.gain.value = 0.6;
    var edgeGain = c.createGain();
    edgeGain.gain.value = 0.25;

    lfo.connect(lfoGain);
    lfoGain.connect(wail.frequency);
    lfoGain.connect(edge.frequency);

    wail.connect(wailGain);
    edge.connect(edgeGain);
    wailGain.connect(master);
    edgeGain.connect(master);
    master.connect(comp);
    comp.connect(c.destination);

    wail.start();
    edge.start();
    lfo.start();

    nodes = { osc: wail, edge: edge, lfo: lfo, gain: master, comp: comp };
    isPlaying = true;

    // 진동도 계속 이어지게 반복한다(지원하는 기기에서만).
    startVibrationLoop();
  }

  var vibrateTimer = null;
  function startVibrationLoop() {
    stopVibrationLoop();
    if (!navigator.vibrate) return;
    var pulse = function () {
      try { navigator.vibrate([500, 250, 500, 250]); } catch (e) {}
    };
    pulse();
    vibrateTimer = window.setInterval(pulse, 1600);
  }

  function stopVibrationLoop() {
    if (vibrateTimer) window.clearInterval(vibrateTimer);
    vibrateTimer = null;
    if (navigator.vibrate) {
      try { navigator.vibrate(0); } catch (e) {}
    }
  }

  function stop() {
    stopVibrationLoop();
    if (!isPlaying || !nodes) {
      isPlaying = false;
      return;
    }
    try {
      var t = ctx.currentTime;
      nodes.gain.gain.cancelScheduledValues(t);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, t);
      nodes.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      nodes.osc.stop(t + 0.2);
      if (nodes.edge) nodes.edge.stop(t + 0.2);
      nodes.lfo.stop(t + 0.2);
    } catch (e) {
      /* 이미 정지한 노드는 무시한다 */
    }
    nodes = null;
    isPlaying = false;
  }

  // 발표·점검 전에 소리가 실제로 나는지 확인하는 용도. 2초만 울린다.
  function test() {
    prime();
    var wasMuted = isMuted;
    isMuted = false;
    start();
    window.setTimeout(function () {
      stop();
      isMuted = wasMuted;
    }, 2000);
  }

  // 관리자 알림용 짧은 2음 차임. 화재 사이렌과 확실히 구분되는 소리로 낸다.
  function chime() {
    if (isMuted) return;
    var c = getContext();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(function () {});

    [
      { freq: 880, at: 0 },
      { freq: 1320, at: 0.18 }
    ].forEach(function (note) {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      var start = c.currentTime + note.at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  function vibrate() {
    if (navigator.vibrate) {
      try { navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) {}
    }
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (isMuted) stop();
  }

  return {
    prime: prime,
    installUnlockHandlers: installUnlockHandlers,
    start: start,
    stop: stop,
    test: test,
    chime: chime,
    vibrate: vibrate,
    setMuted: setMuted,
    isMuted: function () { return isMuted; },
    isPlaying: function () { return isPlaying; }
  };
})();
