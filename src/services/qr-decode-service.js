// L1 기능층 - QrDecodeService
// 책임: 카메라 영상 프레임이나 사진 파일에서 QR 문자열을 읽어내는 것만 한다.
// 읽어낸 문자열이 어떤 작업구역인지 판단하는 일은 ZoneService가 한다.
window.App = window.App || {};
window.App.Services = window.App.Services || {};

window.App.Services.QrDecodeService = (function () {
  var MESSAGE = window.App.Constants.MESSAGE;

  // 사진 인식 시 원본이 너무 크면 느려지므로 이 크기로 줄여서 본다.
  var MAX_IMAGE_EDGE = 1400;

  function hasDecoder() {
    return typeof window.jsQR === 'function';
  }

  function cameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function decodeImageData(imageData) {
    if (!hasDecoder()) return null;
    var result = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });
    return result && result.data ? result.data.trim() : null;
  }

  // 카메라 프레임 1장에서 QR을 찾는다. 못 찾으면 null.
  function decodeFromVideo(video, canvas) {
    if (!video.videoWidth || !video.videoHeight) return null;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeImageData(imageData);
  }

  // 한 장의 사진에서 여러 방식으로 시도한다.
  // 휴대폰으로 찍은 QR은 흔들림·기울기·화면 반사 때문에 한 번에 안 읽히는 일이 많아서,
  // 크기를 바꿔가며 보고 가운데만 잘라서도 본다.
  function buildAttempts(img) {
    var longEdge = Math.max(img.width, img.height);
    var attempts = [];

    // 1) 여러 해상도로 전체 이미지
    [1400, 900, 2000, 600].forEach(function (edge) {
      var scale = Math.min(1, edge / longEdge);
      attempts.push({ scale: scale, crop: 1 });
    });

    // 2) 가운데만 잘라서 (배경이 넓게 찍힌 사진에 효과적)
    [0.7, 0.5].forEach(function (crop) {
      attempts.push({ scale: Math.min(1, 1200 / longEdge), crop: crop });
    });

    return attempts;
  }

  function tryDecode(img, attempt) {
    var srcW = Math.round(img.width * attempt.crop);
    var srcH = Math.round(img.height * attempt.crop);
    var srcX = Math.round((img.width - srcW) / 2);
    var srcY = Math.round((img.height - srcH) / 2);

    var width = Math.max(1, Math.round(srcW * attempt.scale / attempt.crop));
    var height = Math.max(1, Math.round(srcH * attempt.scale / attempt.crop));

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

    try {
      return decodeImageData(ctx.getImageData(0, 0, width, height));
    } catch (e) {
      return null;
    }
  }

  // 사진 파일에서 QR을 찾는다. Promise<{ok, value|error}>
  function decodeFromFile(file) {
    return new Promise(function (resolve) {
      if (!hasDecoder()) {
        resolve({ ok: false, error: { code: 'QR_DECODER_MISSING', message: MESSAGE.QR_DECODER_MISSING } });
        return;
      }

      var objectUrl = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () {
        URL.revokeObjectURL(objectUrl);

        var attempts = buildAttempts(img);
        var value = null;
        for (var i = 0; i < attempts.length && !value; i++) {
          value = tryDecode(img, attempts[i]);
        }

        if (value) {
          resolve({ ok: true, value: value, attempts: attempts.length });
        } else {
          resolve({
            ok: false,
            error: {
              code: 'QR_NOT_FOUND_IN_IMAGE',
              message: MESSAGE.QR_NOT_FOUND_IN_IMAGE,
              imageSize: img.width + '×' + img.height
            }
          });
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve({ ok: false, error: { code: 'QR_NOT_FOUND_IN_IMAGE', message: MESSAGE.QR_NOT_FOUND_IN_IMAGE } });
      };

      img.src = objectUrl;
    });
  }

  // 후면 카메라 우선으로 스트림을 연다. Promise<{ok, stream|error}>
  // 카메라가 안 열리는 이유는 대부분 http 접속이다. 그 경우를 따로 구분해 알려준다.
  function openCamera() {
    var CameraPermission = window.App.Services.CameraPermissionService;
    var env = CameraPermission.checkEnvironment();
    if (!env.ok) {
      return Promise.resolve({ ok: false, error: { code: env.code, message: env.message, httpsUrl: env.httpsUrl } });
    }

    // 후면 카메라를 강하게 요청하되, 없는 기기(노트북 등)에서는 아무 카메라나 연다.
    var preferred = { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };

    function toError(err) {
      var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      return {
        ok: false,
        error: denied
          ? { code: 'QR_CAMERA_DENIED', message: MESSAGE.CAMERA_BLOCKED_BY_BROWSER, httpsUrl: null }
          : { code: 'QR_CAMERA_UNAVAILABLE', message: MESSAGE.QR_CAMERA_UNAVAILABLE, httpsUrl: null }
      };
    }

    return navigator.mediaDevices.getUserMedia(preferred)
      .then(function (stream) { return { ok: true, stream: stream }; })
      .catch(function (err) {
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) return toError(err);
        // OverconstrainedError 등: 조건을 풀고 한 번 더 시도한다.
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(function (stream) { return { ok: true, stream: stream }; })
          .catch(toError);
      });
  }

  function closeCamera(stream) {
    if (!stream) return;
    stream.getTracks().forEach(function (track) {
      try { track.stop(); } catch (e) {}
    });
  }

  return {
    hasDecoder: hasDecoder,
    cameraSupported: cameraSupported,
    decodeFromVideo: decodeFromVideo,
    decodeFromFile: decodeFromFile,
    openCamera: openCamera,
    closeCamera: closeCamera
  };
})();
