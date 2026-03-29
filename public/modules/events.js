var Browser = {
    useWebGL: false,
    isFullscreen: false,
    pointerLock: false,
    moduleContextCreatedCallbacks: [],
    workers: [],
    preloadedImages: {},
    preloadedAudios: {},
    getCanvas: () => Module["canvas"],
    init() {
        if (Browser.initted) return;
        Browser.initted = true;
        var imagePlugin = {};
        imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
            return !Module["noImageDecoding"] && /\.(jpg|jpeg|png|bmp|webp)$/i.test(name)
        };
        imagePlugin["handle"] = async function imagePlugin_handle(byteArray, name) {
            var b = new Blob([byteArray], {
                type: Browser.getMimetype(name)
            });
            if (b.size !== byteArray.length) {
                b = new Blob([new Uint8Array(byteArray).buffer], {
                    type: Browser.getMimetype(name)
                })
            }
            var url = URL.createObjectURL(b);
            return new Promise((resolve, reject) => {
                var img = new Image;
                img.onload = () => {
                    var canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    Browser.preloadedImages[name] = canvas;
                    URL.revokeObjectURL(url);
                    resolve(byteArray)
                };
                img.onerror = event => {
                    err(`Image ${url} could not be decoded`);
                    reject()
                };
                img.src = url
            })
        };
        preloadPlugins.push(imagePlugin);
        var audioPlugin = {};
        audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
            return !Module["noAudioDecoding"] && name.slice(-4) in {
                ".ogg": 1,
                ".wav": 1,
                ".mp3": 1
            }
        };
        audioPlugin["handle"] = async function audioPlugin_handle(byteArray, name) {
            return new Promise((resolve, reject) => {
                var done = false;

                function finish(audio) {
                    if (done) return;
                    done = true;
                    Browser.preloadedAudios[name] = audio;
                    resolve(byteArray)
                }
                var b = new Blob([byteArray], {
                    type: Browser.getMimetype(name)
                });
                var url = URL.createObjectURL(b);
                var audio = new Audio;
                audio.addEventListener("canplaythrough", () => finish(audio), false);
                audio.onerror = function audio_onerror(event) {
                    if (done) return;
                    err(`warning: browser could not fully decode audio ${name}, trying slower base64 approach`);

                    function encode64(data) {
                        var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                        var PAD = "=";
                        var ret = "";
                        var leftchar = 0;
                        var leftbits = 0;
                        for (var i = 0; i < data.length; i++) {
                            leftchar = leftchar << 8 | data[i];
                            leftbits += 8;
                            while (leftbits >= 6) {
                                var curr = leftchar >> leftbits - 6 & 63;
                                leftbits -= 6;
                                ret += BASE[curr]
                            }
                        }
                        if (leftbits == 2) {
                            ret += BASE[(leftchar & 3) << 4];
                            ret += PAD + PAD
                        } else if (leftbits == 4) {
                            ret += BASE[(leftchar & 15) << 2];
                            ret += PAD
                        }
                        return ret
                    }
                    audio.src = "data:audio/x-" + name.slice(-3) + ";base64," + encode64(byteArray);
                    finish(audio)
                };
                audio.src = url;
                safeSetTimeout(() => {
                    finish(audio)
                }, 1e4)
            })
        };
        preloadPlugins.push(audioPlugin);

        function pointerLockChange() {
            var canvas = Browser.getCanvas();
            Browser.pointerLock = document.pointerLockElement === canvas
        }
        var canvas = Browser.getCanvas();
        if (canvas) {
            document.addEventListener("pointerlockchange", pointerLockChange, false);
            if (Module["elementPointerLock"]) {
                canvas.addEventListener("click", ev => {
                    if (!Browser.pointerLock && Browser.getCanvas().requestPointerLock) {
                        Browser.getCanvas().requestPointerLock();
                        ev.preventDefault()
                    }
                }, false)
            }
        }
    },
    createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module["ctx"] && canvas == Browser.getCanvas()) return Module["ctx"];
        var ctx;
        var contextHandle;
        if (useWebGL) {
            var contextAttributes = {
                antialias: false,
                alpha: false,
                majorVersion: typeof WebGL2RenderingContext != "undefined" ? 2 : 1
            };
            if (webGLContextAttributes) {
                for (var attribute in webGLContextAttributes) {
                    contextAttributes[attribute] = webGLContextAttributes[attribute]
                }
            }
            if (typeof GL != "undefined") {
                contextHandle = GL.createContext(canvas, contextAttributes);
                if (contextHandle) {
                    ctx = GL.getContext(contextHandle).GLctx
                }
            }
        } else {
            ctx = canvas.getContext("2d")
        }
        if (!ctx) return null;
        if (setInModule) {
            Module["ctx"] = ctx;
            if (useWebGL) GL.makeContextCurrent(contextHandle);
            Browser.useWebGL = useWebGL;
            Browser.moduleContextCreatedCallbacks.forEach(callback => callback());
            Browser.init()
        }
        return ctx
    },
    fullscreenHandlersInstalled: false,
    lockPointer: undefined,
    resizeCanvas: undefined,
    requestFullscreen(lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer == "undefined") Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas == "undefined") Browser.resizeCanvas = false;
        var canvas = Browser.getCanvas();

        function fullscreenChange() {
            Browser.isFullscreen = false;
            var canvasContainer = canvas.parentNode;
            if (getFullscreenElement() === canvasContainer) {
                canvas.exitFullscreen = Browser.exitFullscreen;
                if (Browser.lockPointer) canvas.requestPointerLock();
                Browser.isFullscreen = true;
                if (Browser.resizeCanvas) {
                    Browser.setFullscreenCanvasSize()
                } else {
                    Browser.updateCanvasDimensions(canvas)
                }
            } else {
                canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
                canvasContainer.parentNode.removeChild(canvasContainer);
                if (Browser.resizeCanvas) {
                    Browser.setWindowedCanvasSize()
                } else {
                    Browser.updateCanvasDimensions(canvas)
                }
            }
            Module["onFullScreen"]?.(Browser.isFullscreen);
            Module["onFullscreen"]?.(Browser.isFullscreen)
        }
        if (!Browser.fullscreenHandlersInstalled) {
            Browser.fullscreenHandlersInstalled = true;
            document.addEventListener("fullscreenchange", fullscreenChange, false);
            document.addEventListener("mozfullscreenchange", fullscreenChange, false);
            document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
            document.addEventListener("MSFullscreenChange", fullscreenChange, false)
        }
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? () => canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null) || (canvasContainer["webkitRequestFullScreen"] ? () => canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null);
        canvasContainer.requestFullscreen()
    },
    exitFullscreen() {
        if (!Browser.isFullscreen) {
            return false
        }
        var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || (() => {});
        CFS.apply(document, []);
        return true
    },
    safeSetTimeout(func, timeout) {
        return safeSetTimeout(func, timeout)
    },
    getMimetype(name) {
        return {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            bmp: "image/bmp",
            ogg: "audio/ogg",
            wav: "audio/wav",
            mp3: "audio/mpeg"
        } [name.slice(name.lastIndexOf(".") + 1)]
    },
    getUserMedia(func) {
        window.getUserMedia ||= navigator["getUserMedia"] || navigator["mozGetUserMedia"];
        window.getUserMedia(func)
    },
    getMovementX(event) {
        return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0
    },
    getMovementY(event) {
        return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0
    },
    getMouseWheelDelta(event) {
        var delta = 0;
        switch (event.type) {
            case "DOMMouseScroll":
                delta = event.detail / 3;
                break;
            case "mousewheel":
                delta = event.wheelDelta / 120;
                break;
            case "wheel":
                delta = event.deltaY;
                switch (event.deltaMode) {
                    case 0:
                        delta /= 100;
                        break;
                    case 1:
                        delta /= 3;
                        break;
                    case 2:
                        delta *= 80;
                        break;
                    default:
                        abort("unrecognized mouse wheel delta mode: " + event.deltaMode)
                }
                break;
            default:
                abort("unrecognized mouse wheel event: " + event.type)
        }
        return delta
    },
    mouseX: 0,
    mouseY: 0,
    mouseMovementX: 0,
    mouseMovementY: 0,
    touches: {},
    lastTouches: {},
    calculateMouseCoords(pageX, pageY) {
        var canvas = Browser.getCanvas();
        var rect = canvas.getBoundingClientRect();
        var scrollX = typeof window.scrollX != "undefined" ? window.scrollX : window.pageXOffset;
        var scrollY = typeof window.scrollY != "undefined" ? window.scrollY : window.pageYOffset;
        var adjustedX = pageX - (scrollX + rect.left);
        var adjustedY = pageY - (scrollY + rect.top);
        adjustedX = adjustedX * (canvas.width / rect.width);
        adjustedY = adjustedY * (canvas.height / rect.height);
        return {
            x: adjustedX,
            y: adjustedY
        }
    },
    setMouseCoords(pageX, pageY) {
        const {
            x,
            y
        } = Browser.calculateMouseCoords(pageX, pageY);
        Browser.mouseMovementX = x - Browser.mouseX;
        Browser.mouseMovementY = y - Browser.mouseY;
        Browser.mouseX = x;
        Browser.mouseY = y
    },
    calculateMouseEvent(event) {
        if (Browser.pointerLock) {
            if (event.type != "mousemove" && "mozMovementX" in event) {
                Browser.mouseMovementX = Browser.mouseMovementY = 0
            } else {
                Browser.mouseMovementX = Browser.getMovementX(event);
                Browser.mouseMovementY = Browser.getMovementY(event)
            }
            Browser.mouseX += Browser.mouseMovementX;
            Browser.mouseY += Browser.mouseMovementY
        } else {
            if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
                var touch = event.touch;
                if (touch === undefined) {
                    return
                }
                var coords = Browser.calculateMouseCoords(touch.pageX, touch.pageY);
                if (event.type === "touchstart") {
                    Browser.lastTouches[touch.identifier] = coords;
                    Browser.touches[touch.identifier] = coords
                } else if (event.type === "touchend" || event.type === "touchmove") {
                    var last = Browser.touches[touch.identifier];
                    last ||= coords;
                    Browser.lastTouches[touch.identifier] = last;
                    Browser.touches[touch.identifier] = coords
                }
                return
            }
            Browser.setMouseCoords(event.pageX, event.pageY)
        }
    },
    resizeListeners: [],
    updateResizeListeners() {
        var canvas = Browser.getCanvas();
        Browser.resizeListeners.forEach(listener => listener(canvas.width, canvas.height))
    },
    setCanvasSize(width, height, noUpdates) {
        var canvas = Browser.getCanvas();
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners()
    },
    windowedWidth: 0,
    windowedHeight: 0,
    setFullscreenCanvasSize() {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen >> 2];
            flags = flags | 8388608;
            HEAP32[SDL.screen >> 2] = flags
        }
        Browser.updateCanvasDimensions(Browser.getCanvas());
        Browser.updateResizeListeners()
    },
    setWindowedCanvasSize() {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen >> 2];
            flags = flags & ~8388608;
            HEAP32[SDL.screen >> 2] = flags
        }
        Browser.updateCanvasDimensions(Browser.getCanvas());
        Browser.updateResizeListeners()
    },
    updateCanvasDimensions(canvas, wNative, hNative) {
        if (wNative && hNative) {
            canvas.widthNative = wNative;
            canvas.heightNative = hNative
        } else {
            wNative = canvas.widthNative;
            hNative = canvas.heightNative
        }
        var w = wNative;
        var h = hNative;
        if (Module["forcedAspectRatio"] > 0) {
            if (w / h < Module["forcedAspectRatio"]) {
                w = Math.round(h * Module["forcedAspectRatio"])
            } else {
                h = Math.round(w / Module["forcedAspectRatio"])
            }
        }
        if (getFullscreenElement() === canvas.parentNode && typeof screen != "undefined") {
            var factor = Math.min(screen.width / w, screen.height / h);
            w = Math.round(w * factor);
            h = Math.round(h * factor)
        }
        if (Browser.resizeCanvas) {
            if (canvas.width != w) canvas.width = w;
            if (canvas.height != h) canvas.height = h;
            if (typeof canvas.style != "undefined") {
                canvas.style.removeProperty("width");
                canvas.style.removeProperty("height")
            }
        } else {
            if (canvas.width != wNative) canvas.width = wNative;
            if (canvas.height != hNative) canvas.height = hNative;
            if (typeof canvas.style != "undefined") {
                if (w != wNative || h != hNative) {
                    canvas.style.setProperty("width", w + "px", "important");
                    canvas.style.setProperty("height", h + "px", "important")
                } else {
                    canvas.style.removeProperty("width");
                    canvas.style.removeProperty("height")
                }
            }
        }
    }
};
var JSEvents = {
    removeAllEventListeners() {
        while (JSEvents.eventHandlers.length) {
            JSEvents._removeHandler(JSEvents.eventHandlers.length - 1)
        }
        JSEvents.deferredCalls = []
    },
    inEventHandler: 0,
    deferredCalls: [],
    deferCall(targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
            if (arrA.length != arrB.length) return false;
            for (var i in arrA) {
                if (arrA[i] != arrB[i]) return false
            }
            return true
        }
        for (var call of JSEvents.deferredCalls) {
            if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
                return
            }
        }
        JSEvents.deferredCalls.push({
            targetFunction,
            precedence,
            argsList
        });
        JSEvents.deferredCalls.sort((x, y) => x.precedence < y.precedence)
    },
    removeDeferredCalls(targetFunction) {
        JSEvents.deferredCalls = JSEvents.deferredCalls.filter(call => call.targetFunction != targetFunction)
    },
    canPerformEventHandlerRequests() {
        if (navigator.userActivation) {
            return navigator.userActivation.isActive
        }
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls
    },
    runDeferredCalls() {
        if (!JSEvents.canPerformEventHandlerRequests()) {
            return
        }
        var deferredCalls = JSEvents.deferredCalls;
        JSEvents.deferredCalls = [];
        for (var call of deferredCalls) {
            call.targetFunction(...call.argsList)
        }
    },
    eventHandlers: [],
    removeAllHandlersOnTarget: (target, eventTypeString) => {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
                JSEvents._removeHandler(i--)
            }
        }
    },
    _removeHandler(i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1)
    },
    registerOrRemoveHandler(eventHandler) {
        if (!eventHandler.target) {
            return -4
        }
        if (eventHandler.callbackfunc) {
            eventHandler.eventListenerFunc = function(event) {
                ++JSEvents.inEventHandler;
                JSEvents.currentEventHandler = eventHandler;
                JSEvents.runDeferredCalls();
                eventHandler.handlerFunc(event);
                JSEvents.runDeferredCalls();
                --JSEvents.inEventHandler
            };
            eventHandler.target.addEventListener(eventHandler.eventTypeString, eventHandler.eventListenerFunc, eventHandler.useCapture);
            JSEvents.eventHandlers.push(eventHandler)
        } else {
            for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
                if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
                    JSEvents._removeHandler(i--)
                }
            }
        }
        return 0
    },
    removeSingleHandler(eventHandler) {
        let success = false;
        for (let i = 0; i < JSEvents.eventHandlers.length; ++i) {
            const handler = JSEvents.eventHandlers[i];
            if (handler.target === eventHandler.target && handler.eventTypeId === eventHandler.eventTypeId && handler.callbackfunc === eventHandler.callbackfunc && handler.userData === eventHandler.userData) {
                JSEvents._removeHandler(i--);
                success = true
            }
        }
        return success ? 0 : -5
    },
    getNodeNameForTarget(target) {
        if (!target) return "";
        if (target == window) return "#window";
        if (target == screen) return "#screen";
        return target?.nodeName || ""
    },
    fullscreenEnabled() {
        return document.fullscreenEnabled || document.webkitFullscreenEnabled
    }
};
var specialHTMLTargets = [0, globalThis.document ?? 0, globalThis.window ?? 0];
var maybeCStringToJsString = cString => cString > 2 ? UTF8ToString(cString) : cString;
var findEventTarget = target => {
    target = maybeCStringToJsString(target);
    var domElement = specialHTMLTargets[target] || globalThis.document?.querySelector(target);
    return domElement
};
var findCanvasEventTarget = findEventTarget;
var _emscripten_get_canvas_element_size = (target, width, height) => {
    var canvas = findCanvasEventTarget(target);
    if (!canvas) return -4;
    HEAP32[width >> 2] = canvas.width;
    HEAP32[height >> 2] = canvas.height
};
var stackAlloc = sz => __emscripten_stack_alloc(sz);
var stringToUTF8OnStack = str => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8(str, ret, size);
    return ret
};
var getCanvasElementSize = target => {
    var sp = stackSave();
    var w = stackAlloc(8);
    var h = w + 4;
    var targetInt = stringToUTF8OnStack(target.id);
    var ret = _emscripten_get_canvas_element_size(targetInt, w, h);
    var size = [HEAP32[w >> 2], HEAP32[h >> 2]];
    stackRestore(sp);
    return size
};
var _emscripten_set_canvas_element_size = (target, width, height) => {
    var canvas = findCanvasEventTarget(target);
    if (!canvas) return -4;
    canvas.width = width;
    canvas.height = height;
    return 0
};
var setCanvasElementSize = (target, width, height) => {
    if (!target.controlTransferredOffscreen) {
        target.width = width;
        target.height = height
    } else {
        var sp = stackSave();
        var targetInt = stringToUTF8OnStack(target.id);
        _emscripten_set_canvas_element_size(targetInt, width, height);
        stackRestore(sp)
    }
};
var currentFullscreenStrategy = {};
// getWasmTableEntry moved to runtime.js
var registerRestoreOldStyle = canvas => {
    var canvasSize = getCanvasElementSize(canvas);
    var oldWidth = canvasSize[0];
    var oldHeight = canvasSize[1];
    var oldCssWidth = canvas.style.width;
    var oldCssHeight = canvas.style.height;
    var oldBackgroundColor = canvas.style.backgroundColor;
    var oldDocumentBackgroundColor = document.body.style.backgroundColor;
    var oldPaddingLeft = canvas.style.paddingLeft;
    var oldPaddingRight = canvas.style.paddingRight;
    var oldPaddingTop = canvas.style.paddingTop;
    var oldPaddingBottom = canvas.style.paddingBottom;
    var oldMarginLeft = canvas.style.marginLeft;
    var oldMarginRight = canvas.style.marginRight;
    var oldMarginTop = canvas.style.marginTop;
    var oldMarginBottom = canvas.style.marginBottom;
    var oldDocumentBodyMargin = document.body.style.margin;
    var oldDocumentOverflow = document.documentElement.style.overflow;
    var oldDocumentScroll = document.body.scroll;
    var oldImageRendering = canvas.style.imageRendering;

    function restoreOldStyle() {
        if (!getFullscreenElement()) {
            document.removeEventListener("fullscreenchange", restoreOldStyle);
            document.removeEventListener("webkitfullscreenchange", restoreOldStyle);
            setCanvasElementSize(canvas, oldWidth, oldHeight);
            canvas.style.width = oldCssWidth;
            canvas.style.height = oldCssHeight;
            canvas.style.backgroundColor = oldBackgroundColor;
            if (!oldDocumentBackgroundColor) document.body.style.backgroundColor = "white";
            document.body.style.backgroundColor = oldDocumentBackgroundColor;
            canvas.style.paddingLeft = oldPaddingLeft;
            canvas.style.paddingRight = oldPaddingRight;
            canvas.style.paddingTop = oldPaddingTop;
            canvas.style.paddingBottom = oldPaddingBottom;
            canvas.style.marginLeft = oldMarginLeft;
            canvas.style.marginRight = oldMarginRight;
            canvas.style.marginTop = oldMarginTop;
            canvas.style.marginBottom = oldMarginBottom;
            document.body.style.margin = oldDocumentBodyMargin;
            document.documentElement.style.overflow = oldDocumentOverflow;
            document.body.scroll = oldDocumentScroll;
            canvas.style.imageRendering = oldImageRendering;
            if (canvas.GLctxObject) canvas.GLctxObject.GLctx.viewport(0, 0, oldWidth, oldHeight);
            if (currentFullscreenStrategy.canvasResizedCallback) {
                getWasmTableEntry(currentFullscreenStrategy.canvasResizedCallback)(37, 0, currentFullscreenStrategy.canvasResizedCallbackUserData)
            }
        }
    }
    document.addEventListener("fullscreenchange", restoreOldStyle);
    document.addEventListener("webkitfullscreenchange", restoreOldStyle);
    return restoreOldStyle
};
var setLetterbox = (element, topBottom, leftRight) => {
    element.style.paddingLeft = element.style.paddingRight = leftRight + "px";
    element.style.paddingTop = element.style.paddingBottom = topBottom + "px"
};
var getBoundingClientRect = e => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
    left: 0,
    top: 0
};
var JSEvents_resizeCanvasForFullscreen = (target, strategy) => {
    var restoreOldStyle = registerRestoreOldStyle(target);
    var cssWidth = strategy.softFullscreen ? innerWidth : screen.width;
    var cssHeight = strategy.softFullscreen ? innerHeight : screen.height;
    var rect = getBoundingClientRect(target);
    var windowedCssWidth = rect.width;
    var windowedCssHeight = rect.height;
    var canvasSize = getCanvasElementSize(target);
    var windowedRttWidth = canvasSize[0];
    var windowedRttHeight = canvasSize[1];
    if (strategy.scaleMode == 3) {
        setLetterbox(target, (cssHeight - windowedCssHeight) / 2, (cssWidth - windowedCssWidth) / 2);
        cssWidth = windowedCssWidth;
        cssHeight = windowedCssHeight
    } else if (strategy.scaleMode == 2) {
        if (cssWidth * windowedRttHeight < windowedRttWidth * cssHeight) {
            var desiredCssHeight = windowedRttHeight * cssWidth / windowedRttWidth;
            setLetterbox(target, (cssHeight - desiredCssHeight) / 2, 0);
            cssHeight = desiredCssHeight
        } else {
            var desiredCssWidth = windowedRttWidth * cssHeight / windowedRttHeight;
            setLetterbox(target, 0, (cssWidth - desiredCssWidth) / 2);
            cssWidth = desiredCssWidth
        }
    }
    target.style.backgroundColor ||= "black";
    document.body.style.backgroundColor ||= "black";
    target.style.width = cssWidth + "px";
    target.style.height = cssHeight + "px";
    if (strategy.filteringMode == 1) {
        target.style.imageRendering = "optimizeSpeed";
        target.style.imageRendering = "-moz-crisp-edges";
        target.style.imageRendering = "-o-crisp-edges";
        target.style.imageRendering = "-webkit-optimize-contrast";
        target.style.imageRendering = "optimize-contrast";
        target.style.imageRendering = "crisp-edges";
        target.style.imageRendering = "pixelated"
    }
    var dpiScale = strategy.canvasResolutionScaleMode == 2 ? devicePixelRatio : 1;
    if (strategy.canvasResolutionScaleMode != 0) {
        var newWidth = cssWidth * dpiScale | 0;
        var newHeight = cssHeight * dpiScale | 0;
        setCanvasElementSize(target, newWidth, newHeight);
        if (target.GLctxObject) target.GLctxObject.GLctx.viewport(0, 0, newWidth, newHeight)
    }
    return restoreOldStyle
};
var JSEvents_requestFullscreen = (target, strategy) => {
    if (strategy.scaleMode != 0 || strategy.canvasResolutionScaleMode != 0) {
        JSEvents_resizeCanvasForFullscreen(target, strategy)
    }
    if (target.requestFullscreen) {
        target.requestFullscreen()
    } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
    } else {
        return JSEvents.fullscreenEnabled() ? -3 : -1
    }
    currentFullscreenStrategy = strategy;
    if (strategy.canvasResizedCallback) {
        getWasmTableEntry(strategy.canvasResizedCallback)(37, 0, strategy.canvasResizedCallbackUserData)
    }
    return 0
};
var _emscripten_exit_fullscreen = () => {
    if (!JSEvents.fullscreenEnabled()) return -1;
    JSEvents.removeDeferredCalls(JSEvents_requestFullscreen);
    var d = specialHTMLTargets[1];
    if (d.exitFullscreen) {
        d.fullscreenElement && d.exitFullscreen()
    } else if (d.webkitExitFullscreen) {
        d.webkitFullscreenElement && d.webkitExitFullscreen()
    } else {
        return -1
    }
    return 0
};
var requestPointerLock = target => {
    if (target.requestPointerLock) {
        target.requestPointerLock()
    } else {
        if (document.body.requestPointerLock) {
            return -3
        }
        return -1
    }
    return 0
};
var _emscripten_exit_pointerlock = () => {
    JSEvents.removeDeferredCalls(requestPointerLock);
    if (!document.exitPointerLock) return -1;
    document.exitPointerLock();
    return 0
};

function _emscripten_fetch_free(id) {
    if (Fetch.xhrs.has(id)) {
        var xhr = Fetch.xhrs.get(id);
        Fetch.xhrs.free(id);
        if (xhr.readyState > 0 && xhr.readyState < 4) {
            xhr.abort()
        }
    }
}
var _emscripten_get_device_pixel_ratio = () => globalThis.devicePixelRatio ?? 1;
var _emscripten_get_element_css_size = (target, width, height) => {
    target = findEventTarget(target);
    if (!target) return -4;
    var rect = getBoundingClientRect(target);
    HEAPF64[width >> 3] = rect.width;
    HEAPF64[height >> 3] = rect.height;
    return 0
};
var fillGamepadEventData = (eventStruct, e) => {
    HEAPF64[eventStruct >> 3] = e.timestamp;
    for (var i = 0; i < e.axes.length; ++i) {
        HEAPF64[eventStruct + i * 8 + 16 >> 3] = e.axes[i]
    }
    for (var i = 0; i < e.buttons.length; ++i) {
        if (typeof e.buttons[i] == "object") {
            HEAPF64[eventStruct + i * 8 + 528 >> 3] = e.buttons[i].value
        } else {
            HEAPF64[eventStruct + i * 8 + 528 >> 3] = e.buttons[i]
        }
    }
    for (var i = 0; i < e.buttons.length; ++i) {
        if (typeof e.buttons[i] == "object") {
            HEAP8[eventStruct + i + 1040] = e.buttons[i].pressed
        } else {
            HEAP8[eventStruct + i + 1040] = e.buttons[i] == 1
        }
    }
    HEAP8[eventStruct + 1104] = e.connected;
    HEAP32[eventStruct + 1108 >> 2] = e.index;
    HEAP32[eventStruct + 8 >> 2] = e.axes.length;
    HEAP32[eventStruct + 12 >> 2] = e.buttons.length;
    stringToUTF8(e.id, eventStruct + 1112, 64);
    stringToUTF8(e.mapping, eventStruct + 1176, 64)
};
var _emscripten_get_gamepad_status = (index, gamepadState) => {
    if (index < 0 || index >= JSEvents.lastGamepadState.length) return -5;
    if (!JSEvents.lastGamepadState[index]) return -7;
    fillGamepadEventData(gamepadState, JSEvents.lastGamepadState[index]);
    return 0
};
var _emscripten_get_num_gamepads = () => JSEvents.lastGamepadState.length;
var _emscripten_get_screen_size = (width, height) => {
    HEAP32[width >> 2] = screen.width;
    HEAP32[height >> 2] = screen.height
};
var _emscripten_has_asyncify = () => 0;
var _emscripten_is_main_browser_thread = () => !ENVIRONMENT_IS_WORKER;
var doRequestFullscreen = (target, strategy) => {
    if (!JSEvents.fullscreenEnabled()) return -1;
    target = findEventTarget(target);
    if (!target) return -4;
    if (!target.requestFullscreen && !target.webkitRequestFullscreen) {
        return -3
    }
    if (!JSEvents.canPerformEventHandlerRequests()) {
        if (strategy.deferUntilInEventHandler) {
            JSEvents.deferCall(JSEvents_requestFullscreen, 1, [target, strategy]);
            return 1
        }
        return -2
    }
    return JSEvents_requestFullscreen(target, strategy)
};
var _emscripten_request_fullscreen_strategy = (target, deferUntilInEventHandler, fullscreenStrategy) => {
    var strategy = {
        scaleMode: HEAP32[fullscreenStrategy >> 2],
        canvasResolutionScaleMode: HEAP32[fullscreenStrategy + 4 >> 2],
        filteringMode: HEAP32[fullscreenStrategy + 8 >> 2],
        deferUntilInEventHandler,
        canvasResizedCallback: HEAP32[fullscreenStrategy + 12 >> 2],
        canvasResizedCallbackUserData: HEAP32[fullscreenStrategy + 16 >> 2]
    };
    return doRequestFullscreen(target, strategy)
};
var _emscripten_request_pointerlock = (target, deferUntilInEventHandler) => {
    target = findEventTarget(target);
    if (!target) return -4;
    if (!target.requestPointerLock) {
        return -1
    }
    if (!JSEvents.canPerformEventHandlerRequests()) {
        if (deferUntilInEventHandler) {
            JSEvents.deferCall(requestPointerLock, 2, [target]);
            return 1
        }
        return -2
    }
    return requestPointerLock(target)
};
var getHeapMax = () => 2147483648;
var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
var growMemory = size => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1
    } catch (e) {}
};
var _emscripten_resize_heap = requestedSize => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
        return false
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
            return true
        }
    }
    return false
};
var _emscripten_run_script_int = ptr => eval(UTF8ToString(ptr)) | 0;
var _emscripten_sample_gamepad_data = () => {
    try {
        if (navigator.getGamepads) return (JSEvents.lastGamepadState = navigator.getGamepads()) ? 0 : -1
    } catch (e) {
        navigator.getGamepads = null
    }
    return -1
};
var registerBeforeUnloadEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString) => {
    var beforeUnloadEventHandlerFunc = e => {
        var confirmationMessage = getWasmTableEntry(callbackfunc)(eventTypeId, 0, userData);
        if (confirmationMessage) {
            confirmationMessage = UTF8ToString(confirmationMessage)
        }
        if (confirmationMessage) {
            e.preventDefault();
            e.returnValue = confirmationMessage;
            return confirmationMessage
        }
    };
    var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: beforeUnloadEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_beforeunload_callback_on_thread = (userData, callbackfunc, targetThread) => {
    if (typeof onbeforeunload == "undefined") return -1;
    if (targetThread !== 1) return -5;
    return registerBeforeUnloadEventCallback(2, userData, true, callbackfunc, 28, "beforeunload")
};
var registerFocusEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 256;
    JSEvents.focusEvent ||= _malloc(eventSize);
    var focusEventHandlerFunc = e => {
        var nodeName = JSEvents.getNodeNameForTarget(e.target);
        var id = e.target.id ? e.target.id : "";
        var focusEvent = JSEvents.focusEvent;
        stringToUTF8(nodeName, focusEvent + 0, 128);
        stringToUTF8(id, focusEvent + 128, 128);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, focusEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: focusEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_blur_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerFocusEventCallback(target, userData, useCapture, callbackfunc, 12, "blur", targetThread);
var _emscripten_set_element_css_size = (target, width, height) => {
    target = findEventTarget(target);
    if (!target) return -4;
    target.style.width = width + "px";
    target.style.height = height + "px";
    return 0
};
var _emscripten_set_focus_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerFocusEventCallback(target, userData, useCapture, callbackfunc, 13, "focus", targetThread);
var fillFullscreenChangeEventData = eventStruct => {
    var fullscreenElement = getFullscreenElement();
    var isFullscreen = !!fullscreenElement;
    HEAP8[eventStruct] = isFullscreen;
    HEAP8[eventStruct + 1] = JSEvents.fullscreenEnabled();
    var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
    var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
    var id = reportedElement?.id || "";
    stringToUTF8(nodeName, eventStruct + 2, 128);
    stringToUTF8(id, eventStruct + 130, 128);
    HEAP32[eventStruct + 260 >> 2] = reportedElement ? reportedElement.clientWidth : 0;
    HEAP32[eventStruct + 264 >> 2] = reportedElement ? reportedElement.clientHeight : 0;
    HEAP32[eventStruct + 268 >> 2] = screen.width;
    HEAP32[eventStruct + 272 >> 2] = screen.height;
    if (isFullscreen) {
        JSEvents.previousFullscreenElement = fullscreenElement
    }
};
var registerFullscreenChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 276;
    JSEvents.fullscreenChangeEvent ||= _malloc(eventSize);
    var fullscreenChangeEventhandlerFunc = e => {
        var fullscreenChangeEvent = JSEvents.fullscreenChangeEvent;
        fillFullscreenChangeEventData(fullscreenChangeEvent);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, fullscreenChangeEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: fullscreenChangeEventhandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_fullscreenchange_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
    if (!JSEvents.fullscreenEnabled()) return -1;
    target = findEventTarget(target);
    if (!target) return -4;
    registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "webkitfullscreenchange", targetThread);
    return registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "fullscreenchange", targetThread)
};
var registerGamepadEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 1240;
    JSEvents.gamepadEvent ||= _malloc(eventSize);
    var gamepadEventHandlerFunc = e => {
        var gamepadEvent = JSEvents.gamepadEvent;
        fillGamepadEventData(gamepadEvent, e["gamepad"]);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, gamepadEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        allowsDeferredCalls: true,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: gamepadEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_gamepadconnected_callback_on_thread = (userData, useCapture, callbackfunc, targetThread) => {
    if (_emscripten_sample_gamepad_data()) return -1;
    return registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 26, "gamepadconnected", targetThread)
};
var _emscripten_set_gamepaddisconnected_callback_on_thread = (userData, useCapture, callbackfunc, targetThread) => {
    if (_emscripten_sample_gamepad_data()) return -1;
    return registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 27, "gamepaddisconnected", targetThread)
};
var registerKeyEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 160;
    JSEvents.keyEvent ||= _malloc(eventSize);
    var keyEventHandlerFunc = e => {
        var keyEventData = JSEvents.keyEvent;
        HEAPF64[keyEventData >> 3] = e.timeStamp;
        var idx = keyEventData >> 2;
        HEAP32[idx + 2] = e.location;
        HEAP8[keyEventData + 12] = e.ctrlKey;
        HEAP8[keyEventData + 13] = e.shiftKey;
        HEAP8[keyEventData + 14] = e.altKey;
        HEAP8[keyEventData + 15] = e.metaKey;
        HEAP8[keyEventData + 16] = e.repeat;
        HEAP32[idx + 5] = e.charCode;
        HEAP32[idx + 6] = e.keyCode;
        HEAP32[idx + 7] = e.which;
        stringToUTF8(e.key || "", keyEventData + 32, 32);
        stringToUTF8(e.code || "", keyEventData + 64, 32);
        stringToUTF8(e.char || "", keyEventData + 96, 32);
        stringToUTF8(e.locale || "", keyEventData + 128, 32);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, keyEventData, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: keyEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_keydown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, "keydown", targetThread);
var _emscripten_set_keypress_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerKeyEventCallback(target, userData, useCapture, callbackfunc, 1, "keypress", targetThread);
var _emscripten_set_keyup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, "keyup", targetThread);
var _emscripten_set_main_loop = (func, fps, simulateInfiniteLoop) => {
    var iterFunc = getWasmTableEntry(func);
    setMainLoop(iterFunc, fps, simulateInfiniteLoop)
};
var fillMouseEventData = (eventStruct, e, target) => {
    HEAPF64[eventStruct >> 3] = e.timeStamp;
    var idx = eventStruct >> 2;
    HEAP32[idx + 2] = e.screenX;
    HEAP32[idx + 3] = e.screenY;
    HEAP32[idx + 4] = e.clientX;
    HEAP32[idx + 5] = e.clientY;
    HEAP8[eventStruct + 24] = e.ctrlKey;
    HEAP8[eventStruct + 25] = e.shiftKey;
    HEAP8[eventStruct + 26] = e.altKey;
    HEAP8[eventStruct + 27] = e.metaKey;
    HEAP16[idx * 2 + 14] = e.button;
    HEAP16[idx * 2 + 15] = e.buttons;
    HEAP32[idx + 8] = e["movementX"];
    HEAP32[idx + 9] = e["movementY"];
    var rect = getBoundingClientRect(target);
    HEAP32[idx + 10] = e.clientX - (rect.left | 0);
    HEAP32[idx + 11] = e.clientY - (rect.top | 0)
};
var registerMouseEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 64;
    JSEvents.mouseEvent ||= _malloc(eventSize);
    target = findEventTarget(target);
    var mouseEventHandlerFunc = e => {
        fillMouseEventData(JSEvents.mouseEvent, e, target);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString != "mousemove" && eventTypeString != "mouseenter" && eventTypeString != "mouseleave",
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: mouseEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_mousedown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, "mousedown", targetThread);
var _emscripten_set_mouseenter_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 33, "mouseenter", targetThread);
var _emscripten_set_mouseleave_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, "mouseleave", targetThread);
var _emscripten_set_mousemove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, "mousemove", targetThread);
var _emscripten_set_mouseup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, "mouseup", targetThread);
var fillPointerlockChangeEventData = eventStruct => {
    var pointerLockElement = document.pointerLockElement;
    var isPointerlocked = !!pointerLockElement;
    HEAP8[eventStruct] = isPointerlocked;
    var nodeName = JSEvents.getNodeNameForTarget(pointerLockElement);
    var id = pointerLockElement?.id || "";
    stringToUTF8(nodeName, eventStruct + 1, 128);
    stringToUTF8(id, eventStruct + 129, 128)
};
var registerPointerlockChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 257;
    JSEvents.pointerlockChangeEvent ||= _malloc(eventSize);
    var pointerlockChangeEventHandlerFunc = e => {
        var pointerlockChangeEvent = JSEvents.pointerlockChangeEvent;
        fillPointerlockChangeEventData(pointerlockChangeEvent);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, pointerlockChangeEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: pointerlockChangeEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_pointerlockchange_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
    if (!document.body?.requestPointerLock) {
        return -1
    }
    target = findEventTarget(target);
    if (!target) return -4;
    return registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "pointerlockchange", targetThread)
};
var registerUiEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 36;
    JSEvents.uiEvent ||= _malloc(eventSize);
    target = findEventTarget(target);
    var uiEventHandlerFunc = e => {
        if (e.target != target) {
            return
        }
        var b = document.body;
        if (!b) {
            return
        }
        var uiEvent = JSEvents.uiEvent;
        HEAP32[uiEvent >> 2] = 0;
        HEAP32[uiEvent + 4 >> 2] = b.clientWidth;
        HEAP32[uiEvent + 8 >> 2] = b.clientHeight;
        HEAP32[uiEvent + 12 >> 2] = innerWidth;
        HEAP32[uiEvent + 16 >> 2] = innerHeight;
        HEAP32[uiEvent + 20 >> 2] = outerWidth;
        HEAP32[uiEvent + 24 >> 2] = outerHeight;
        HEAP32[uiEvent + 28 >> 2] = pageXOffset | 0;
        HEAP32[uiEvent + 32 >> 2] = pageYOffset | 0;
        if (getWasmTableEntry(callbackfunc)(eventTypeId, uiEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: uiEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_resize_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerUiEventCallback(target, userData, useCapture, callbackfunc, 10, "resize", targetThread);
var registerTouchEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 1552;
    JSEvents.touchEvent ||= _malloc(eventSize);
    target = findEventTarget(target);
    var touchEventHandlerFunc = e => {
        var t, touches = {},
            et = e.touches;
        for (let t of et) {
            t.isChanged = t.onTarget = 0;
            touches[t.identifier] = t
        }
        for (let t of e.changedTouches) {
            t.isChanged = 1;
            touches[t.identifier] = t
        }
        for (let t of e.targetTouches) {
            touches[t.identifier].onTarget = 1
        }
        var touchEvent = JSEvents.touchEvent;
        HEAPF64[touchEvent >> 3] = e.timeStamp;
        HEAP8[touchEvent + 12] = e.ctrlKey;
        HEAP8[touchEvent + 13] = e.shiftKey;
        HEAP8[touchEvent + 14] = e.altKey;
        HEAP8[touchEvent + 15] = e.metaKey;
        var idx = touchEvent + 16;
        var targetRect = getBoundingClientRect(target);
        var numTouches = 0;
        for (let t of Object.values(touches)) {
            var idx32 = idx >> 2;
            HEAP32[idx32 + 0] = t.identifier;
            HEAP32[idx32 + 1] = t.screenX;
            HEAP32[idx32 + 2] = t.screenY;
            HEAP32[idx32 + 3] = t.clientX;
            HEAP32[idx32 + 4] = t.clientY;
            HEAP32[idx32 + 5] = t.pageX;
            HEAP32[idx32 + 6] = t.pageY;
            HEAP8[idx + 28] = t.isChanged;
            HEAP8[idx + 29] = t.onTarget;
            HEAP32[idx32 + 8] = t.clientX - (targetRect.left | 0);
            HEAP32[idx32 + 9] = t.clientY - (targetRect.top | 0);
            idx += 48;
            if (++numTouches > 31) {
                break
            }
        }
        HEAP32[touchEvent + 8 >> 2] = numTouches;
        if (getWasmTableEntry(callbackfunc)(eventTypeId, touchEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString == "touchstart" || eventTypeString == "touchend",
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: touchEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_touchcancel_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 25, "touchcancel", targetThread);
var _emscripten_set_touchend_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 23, "touchend", targetThread);
var _emscripten_set_touchmove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 24, "touchmove", targetThread);
var _emscripten_set_touchstart_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 22, "touchstart", targetThread);
var fillVisibilityChangeEventData = eventStruct => {
    var visibilityStates = ["hidden", "visible", "prerender", "unloaded"];
    var visibilityState = visibilityStates.indexOf(document.visibilityState);
    HEAP8[eventStruct] = document.hidden;
    HEAP32[eventStruct + 4 >> 2] = visibilityState
};
var registerVisibilityChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 8;
    JSEvents.visibilityChangeEvent ||= _malloc(eventSize);
    var visibilityChangeEventHandlerFunc = e => {
        var visibilityChangeEvent = JSEvents.visibilityChangeEvent;
        fillVisibilityChangeEventData(visibilityChangeEvent);
        if (getWasmTableEntry(callbackfunc)(eventTypeId, visibilityChangeEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: visibilityChangeEventHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_visibilitychange_callback_on_thread = (userData, useCapture, callbackfunc, targetThread) => {
    if (!specialHTMLTargets[1]) {
        return -4
    }
    return registerVisibilityChangeEventCallback(specialHTMLTargets[1], userData, useCapture, callbackfunc, 21, "visibilitychange", targetThread)
};
var registerWheelEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
    var eventSize = 96;
    JSEvents.wheelEvent ||= _malloc(eventSize);
    var wheelHandlerFunc = e => {
        var wheelEvent = JSEvents.wheelEvent;
        fillMouseEventData(wheelEvent, e, target);
        HEAPF64[wheelEvent + 64 >> 3] = e["deltaX"];
        HEAPF64[wheelEvent + 72 >> 3] = e["deltaY"];
        HEAPF64[wheelEvent + 80 >> 3] = e["deltaZ"];
        HEAP32[wheelEvent + 88 >> 2] = e["deltaMode"];
        if (getWasmTableEntry(callbackfunc)(eventTypeId, wheelEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target,
        allowsDeferredCalls: true,
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: wheelHandlerFunc,
        useCapture
    };
    return JSEvents.registerOrRemoveHandler(eventHandler)
};
var _emscripten_set_wheel_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
    target = findEventTarget(target);
    if (!target) return -4;
    if (typeof target.onwheel != "undefined") {
        return registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread)
    } else {
        return -1
    }
};
