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
  function prime() {
    var c = getContext();
    if (c && c.state === 'suspended') {
      c.resume().catch(function () { /* 무시: 소리 없이도 화면 경보는 동작한다 */ });
    }
  }

  function start() {
    if (isPlaying || isMuted) return;
    var c = getContext();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(function () {});
    }

    var osc = c.createOscillator();
    var lfo = c.createOscillator();
    var lfoGain = c.createGain();
    var gain = c.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 720;

    // 초당 1회 위아래로 흔들리는 전형적인 경보 사이렌
    lfo.type = 'sine';
    lfo.frequency.value = 1.1;
    lfoGain.gain.value = 240;

    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.14, c.currentTime + 0.25);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    lfo.start();

    nodes = { osc: osc, lfo: lfo, gain: gain };
    isPlaying = true;
  }

  function stop() {
    if (!isPlaying || !nodes) {
      isPlaying = false;
      return;
    }
    try {
      nodes.gain.gain.cancelScheduledValues(ctx.currentTime);
      nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime);
      nodes.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      nodes.osc.stop(ctx.currentTime + 0.2);
      nodes.lfo.stop(ctx.currentTime + 0.2);
    } catch (e) {
      /* 이미 정지한 노드는 무시한다 */
    }
    nodes = null;
    isPlaying = false;
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
    start: start,
    stop: stop,
    chime: chime,
    vibrate: vibrate,
    setMuted: setMuted,
    isMuted: function () { return isMuted; },
    isPlaying: function () { return isPlaying; }
  };
})();
