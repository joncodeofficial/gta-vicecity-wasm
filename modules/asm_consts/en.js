var ASM_CONSTS = {
  979812: ($0) => {
    document.body.dataset.stateCutscene = $0;
  },
  979858: ($0) => {
    document.body.dataset.stateCutscene = $0;
  },
  979904: ($0) => {
    if (UTF8ToString($0) === "mobring") {
      document.body.dataset.stateMobring = 1;
      setTimeout(function () {
        document.body.dataset.stateMobring = 0;
      }, 2200);
    }
  },
  980063: ($0) => {
    document.body.dataset.stateCutscene = $0;
  },
  980109: ($0) => {
    document.body.dataset.stateCutscene = $0;
  },
  980155: () => {
    Module.hotelMission();
  },
  980182: ($0, $1) => 1,
  980393: () => {
    Module.syncdone = 0;
    FS.syncfs(function (err) {
      if (err) {
        console.log("FS.syncfs error:", err);
      }
      Module.syncdone = 1;
    });
  },
  980516: ($0) => {
    document.body.dataset.stateMenu = $0;
  },
  980558: ($0) => {
    document.body.dataset.stateMenu = $0;
  },
  980600: ($0) => {
    document.body.dataset.stateMenu = $0;
  },
  980642: ($0) => {
    document.body.dataset.stateDownload = $0;
  },
  980688: ($0, $1, $2, $3, $4, $5, $6, $7, $8) => {
    document.body.dataset.stateCar = $0;
    document.body.dataset.stateJob = $1;
    document.body.dataset.statePanzer = $2;
    document.body.dataset.stateHunter = $3;
    document.body.dataset.stateBike = $4;
    document.body.dataset.stateScopeMode = $5;
    document.body.dataset.stateGun = $6;
    document.body.dataset.stateScopeGun = $7;
    document.body.dataset.stateCarWithWeapon = $8;
  },
  981053: () => {
    Module.syncRevcIni();
  },
  981079: ($0) => {
    document.body.dataset.stateCarGun = $0;
  },
  981123: ($0) => {
    document.body.dataset.stateCarGun = $0;
  },
  981167: () => {
    Module.syncdone = 0;
    FS.syncfs(function (err) {
      if (err) {
        console.log("FS.syncfs error:", err);
      }
      Module.syncdone = 1;
    });
  },
  981290: ($0) => {
    const dir = UTF8ToString($0);
    FS.mkdir(dir);
    FS.mount(IDBFS, {}, dir);
    Module.syncdone = 0;
    FS.syncfs(true, function (err) {
      if (err) {
        console.log("FS.syncfs error:", err);
      }
      Module.syncdone = 1;
    });
  },
  981494: () => {
    Module.mainCalled();
  },
  981519: () => {
    var canvas = Module?.canvas || document.getElementById("canvas");
    if (!canvas) return 0;
    var plElement =
      document.pointerLockElement ||
      document.mozPointerLockElement ||
      document.webkitPointerLockElement;
    return plElement === canvas ? 1 : 0;
  },
  981767: ($0) => {
    const url = UTF8ToString($0);
    if (!Module.fetchedUrls) {
      Module.fetchedUrls = {};
      Module.printFetchedUrls = () => {
        let payload = "";
        for (const key of Object.keys(Module.fetchedUrls)) {
          payload += key + "\n";
        }
        console.log(payload);
      };
    }
    if (!url.endsWith(".mp3") && !url.endsWith(".wav")) {
      Module.fetchedUrls[url] = 1;
    }
  },
  982095: () => {
    if (typeof AudioContext !== "undefined") {
      return true;
    } else if (typeof webkitAudioContext !== "undefined") {
      return true;
    }
    return false;
  },
  982242: () => {
    if (
      typeof navigator.mediaDevices !== "undefined" &&
      typeof navigator.mediaDevices.getUserMedia !== "undefined"
    ) {
      return true;
    } else if (typeof navigator.webkitGetUserMedia !== "undefined") {
      return true;
    }
    return false;
  },
  982476: ($0) => {
    if (typeof Module["SDL2"] === "undefined") {
      Module["SDL2"] = {};
    }
    var SDL2 = Module["SDL2"];
    if (!$0) {
      SDL2.audio = {};
    } else {
      SDL2.capture = {};
    }
    if (!SDL2.audioContext) {
      if (typeof AudioContext !== "undefined") {
        SDL2.audioContext = new AudioContext();
      } else if (typeof webkitAudioContext !== "undefined") {
        SDL2.audioContext = new webkitAudioContext();
      }
      if (SDL2.audioContext) {
        autoResumeAudioContext(SDL2.audioContext);
      }
    }
    return SDL2.audioContext === undefined ? -1 : 0;
  },
  983028: () => {
    var SDL2 = Module["SDL2"];
    return SDL2.audioContext.sampleRate;
  },
  983096: ($0, $1, $2, $3) => {
    var SDL2 = Module["SDL2"];
    var have_microphone = function (stream) {
      if (SDL2.capture.silenceTimer !== undefined) {
        clearInterval(SDL2.capture.silenceTimer);
        SDL2.capture.silenceTimer = undefined;
        SDL2.capture.silenceBuffer = undefined;
      }
      SDL2.capture.mediaStreamNode =
        SDL2.audioContext.createMediaStreamSource(stream);
      SDL2.capture.scriptProcessorNode =
        SDL2.audioContext.createScriptProcessor($1, $0, 1);
      SDL2.capture.scriptProcessorNode.onaudioprocess = function (
        audioProcessingEvent,
      ) {
        if (SDL2 === undefined || SDL2.capture === undefined) {
          return;
        }
        audioProcessingEvent.outputBuffer.getChannelData(0).fill(0);
        SDL2.capture.currentCaptureBuffer = audioProcessingEvent.inputBuffer;
        dynCall("vp", $2, [$3]);
      };
      SDL2.capture.mediaStreamNode.connect(SDL2.capture.scriptProcessorNode);
      SDL2.capture.scriptProcessorNode.connect(SDL2.audioContext.destination);
      SDL2.capture.stream = stream;
    };
    var no_microphone = function (error) {};
    SDL2.capture.silenceBuffer = SDL2.audioContext.createBuffer(
      $0,
      $1,
      SDL2.audioContext.sampleRate,
    );
    SDL2.capture.silenceBuffer.getChannelData(0).fill(0);
    var silence_callback = function () {
      SDL2.capture.currentCaptureBuffer = SDL2.capture.silenceBuffer;
      dynCall("vp", $2, [$3]);
    };
    SDL2.capture.silenceTimer = setInterval(
      silence_callback,
      ($1 / SDL2.audioContext.sampleRate) * 1e3,
    );
    if (
      navigator.mediaDevices !== undefined &&
      navigator.mediaDevices.getUserMedia !== undefined
    ) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(have_microphone)
        .catch(no_microphone);
    } else if (navigator.webkitGetUserMedia !== undefined) {
      navigator.webkitGetUserMedia(
        { audio: true, video: false },
        have_microphone,
        no_microphone,
      );
    }
  },
  984789: ($0, $1, $2, $3) => {
    var SDL2 = Module["SDL2"];
    SDL2.audio.scriptProcessorNode = SDL2.audioContext["createScriptProcessor"](
      $1,
      0,
      $0,
    );
    SDL2.audio.scriptProcessorNode["onaudioprocess"] = function (e) {
      if (SDL2 === undefined || SDL2.audio === undefined) {
        return;
      }
      if (SDL2.audio.silenceTimer !== undefined) {
        clearInterval(SDL2.audio.silenceTimer);
        SDL2.audio.silenceTimer = undefined;
        SDL2.audio.silenceBuffer = undefined;
      }
      SDL2.audio.currentOutputBuffer = e["outputBuffer"];
      dynCall("vp", $2, [$3]);
    };
    SDL2.audio.scriptProcessorNode["connect"](SDL2.audioContext["destination"]);
    if (SDL2.audioContext.state === "suspended") {
      SDL2.audio.silenceBuffer = SDL2.audioContext.createBuffer(
        $0,
        $1,
        SDL2.audioContext.sampleRate,
      );
      SDL2.audio.silenceBuffer.getChannelData(0).fill(0);
      var silence_callback = function () {
        if (typeof navigator.userActivation !== "undefined") {
          if (navigator.userActivation.hasBeenActive) {
            SDL2.audioContext.resume();
          }
        }
        SDL2.audio.currentOutputBuffer = SDL2.audio.silenceBuffer;
        dynCall("vp", $2, [$3]);
        SDL2.audio.currentOutputBuffer = undefined;
      };
      SDL2.audio.silenceTimer = setInterval(
        silence_callback,
        ($1 / SDL2.audioContext.sampleRate) * 1e3,
      );
    }
  },
  985964: ($0, $1) => {
    var SDL2 = Module["SDL2"];
    var numChannels = SDL2.capture.currentCaptureBuffer.numberOfChannels;
    for (var c = 0; c < numChannels; ++c) {
      var channelData = SDL2.capture.currentCaptureBuffer.getChannelData(c);
      if (channelData.length != $1) {
        throw (
          "Web Audio capture buffer length mismatch! Destination size: " +
          channelData.length +
          " samples vs expected " +
          $1 +
          " samples!"
        );
      }
      if (numChannels == 1) {
        for (var j = 0; j < $1; ++j) {
          setValue($0 + j * 4, channelData[j], "float");
        }
      } else {
        for (var j = 0; j < $1; ++j) {
          setValue($0 + (j * numChannels + c) * 4, channelData[j], "float");
        }
      }
    }
  },
  986569: ($0, $1) => {
    var SDL2 = Module["SDL2"];
    var buf = $0 >>> 2;
    var numChannels = SDL2.audio.currentOutputBuffer["numberOfChannels"];
    for (var c = 0; c < numChannels; ++c) {
      var channelData = SDL2.audio.currentOutputBuffer["getChannelData"](c);
      if (channelData.length != $1) {
        throw (
          "Web Audio output buffer length mismatch! Destination size: " +
          channelData.length +
          " samples vs expected " +
          $1 +
          " samples!"
        );
      }
      for (var j = 0; j < $1; ++j) {
        channelData[j] = HEAPF32[buf + (j * numChannels + c)];
      }
    }
  },
  987058: ($0) => {
    var SDL2 = Module["SDL2"];
    if ($0) {
      if (SDL2.capture.silenceTimer !== undefined) {
        clearInterval(SDL2.capture.silenceTimer);
      }
      if (SDL2.capture.stream !== undefined) {
        var tracks = SDL2.capture.stream.getAudioTracks();
        for (var i = 0; i < tracks.length; i++) {
          SDL2.capture.stream.removeTrack(tracks[i]);
        }
      }
      if (SDL2.capture.scriptProcessorNode !== undefined) {
        SDL2.capture.scriptProcessorNode.onaudioprocess = function (
          audioProcessingEvent,
        ) {};
        SDL2.capture.scriptProcessorNode.disconnect();
      }
      if (SDL2.capture.mediaStreamNode !== undefined) {
        SDL2.capture.mediaStreamNode.disconnect();
      }
      SDL2.capture = undefined;
    } else {
      if (SDL2.audio.scriptProcessorNode != undefined) {
        SDL2.audio.scriptProcessorNode.disconnect();
      }
      if (SDL2.audio.silenceTimer !== undefined) {
        clearInterval(SDL2.audio.silenceTimer);
      }
      SDL2.audio = undefined;
    }
    if (
      SDL2.audioContext !== undefined &&
      SDL2.audio === undefined &&
      SDL2.capture === undefined
    ) {
      SDL2.audioContext.close();
      SDL2.audioContext = undefined;
    }
  },
  988064: ($0, $1, $2) => {
    var w = $0;
    var h = $1;
    var pixels = $2;
    if (!Module["SDL2"]) Module["SDL2"] = {};
    var SDL2 = Module["SDL2"];
    if (SDL2.ctxCanvas !== Module["canvas"]) {
      SDL2.ctx = Browser.createContext(Module["canvas"], false, true);
      SDL2.ctxCanvas = Module["canvas"];
    }
    if (SDL2.w !== w || SDL2.h !== h || SDL2.imageCtx !== SDL2.ctx) {
      SDL2.image = SDL2.ctx.createImageData(w, h);
      SDL2.w = w;
      SDL2.h = h;
      SDL2.imageCtx = SDL2.ctx;
    }
    var data = SDL2.image.data;
    var src = pixels / 4;
    var dst = 0;
    var num;
    if (
      typeof CanvasPixelArray !== "undefined" &&
      data instanceof CanvasPixelArray
    ) {
      num = data.length;
      while (dst < num) {
        var val = HEAP32[src];
        data[dst] = val & 255;
        data[dst + 1] = (val >> 8) & 255;
        data[dst + 2] = (val >> 16) & 255;
        data[dst + 3] = 255;
        src++;
        dst += 4;
      }
    } else {
      if (SDL2.data32Data !== data) {
        SDL2.data32 = new Int32Array(data.buffer);
        SDL2.data8 = new Uint8Array(data.buffer);
        SDL2.data32Data = data;
      }
      var data32 = SDL2.data32;
      num = data32.length;
      data32.set(HEAP32.subarray(src, src + num));
      var data8 = SDL2.data8;
      var i = 3;
      var j = i + 4 * num;
      if (num % 8 == 0) {
        while (i < j) {
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
          data8[i] = 255;
          i = (i + 4) | 0;
        }
      } else {
        while (i < j) {
          data8[i] = 255;
          i = (i + 4) | 0;
        }
      }
    }
    SDL2.ctx.putImageData(SDL2.image, 0, 0);
  },
  989530: ($0, $1, $2, $3, $4) => {
    var w = $0;
    var h = $1;
    var hot_x = $2;
    var hot_y = $3;
    var pixels = $4;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var image = ctx.createImageData(w, h);
    var data = image.data;
    var src = pixels / 4;
    var dst = 0;
    var num;
    if (
      typeof CanvasPixelArray !== "undefined" &&
      data instanceof CanvasPixelArray
    ) {
      num = data.length;
      while (dst < num) {
        var val = HEAP32[src];
        data[dst] = val & 255;
        data[dst + 1] = (val >> 8) & 255;
        data[dst + 2] = (val >> 16) & 255;
        data[dst + 3] = (val >> 24) & 255;
        src++;
        dst += 4;
      }
    } else {
      var data32 = new Int32Array(data.buffer);
      num = data32.length;
      data32.set(HEAP32.subarray(src, src + num));
    }
    ctx.putImageData(image, 0, 0);
    var url =
      hot_x === 0 && hot_y === 0
        ? "url(" + canvas.toDataURL() + "), auto"
        : "url(" + canvas.toDataURL() + ") " + hot_x + " " + hot_y + ", auto";
    var urlBuf = _malloc(url.length + 1);
    stringToUTF8(url, urlBuf, url.length + 1);
    return urlBuf;
  },
  990518: ($0) => {
    if (Module["canvas"]) {
      Module["canvas"].style["cursor"] = UTF8ToString($0);
    }
  },
  990601: () => {
    if (Module["canvas"]) {
      Module["canvas"].style["cursor"] = "none";
    }
  },
  990670: () => window.innerWidth,
  990700: () => window.innerHeight,
  990731: ($0) => {
    if (!$0) {
      AL.alcErr = 40964;
      return 1;
    }
  },
  990779: ($0) => {
    if (!AL.currentCtx) {
      err("alGetProcAddress() called without a valid context");
      return 1;
    }
    if (!$0) {
      AL.currentCtx.err = 40963;
      return 1;
    }
  }
};
