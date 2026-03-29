var Module = typeof Module != "undefined" ? Module : {};
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
if (!Module["expectedDataFileDownloads"]) Module["expectedDataFileDownloads"] = 0;
Module["expectedDataFileDownloads"]++;
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = (status, toThrow) => {
    throw toThrow
};
var _scriptName = globalThis.document?.currentScript?.src;
if (typeof __filename != "undefined") {
    _scriptName = __filename
} else if (ENVIRONMENT_IS_WORKER) {
    _scriptName = self.location.href
}
var scriptDirectory = "";

function locateFile(path) {
    if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
    }
    return scriptDirectory + path
}
var readAsync, readBinary;
if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    scriptDirectory = __dirname + "/";
    readBinary = filename => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        return ret
    };
    readAsync = async (filename, binary = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary ? undefined : "utf8");
        return ret
    };
    if (process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/")
    }
    arguments_ = process.argv.slice(2);
    if (typeof module != "undefined") {
        module["exports"] = Module
    }
    quit_ = (status, toThrow) => {
        process.exitCode = status;
        throw toThrow
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
        scriptDirectory = new URL(".", _scriptName).href
    } catch {} {
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = url => {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            }
        }
        readAsync = async url => {
            if (isFileURI(url)) {
                return new Promise((resolve, reject) => {
                    var xhr = new XMLHttpRequest;
                    xhr.open("GET", url, true);
                    xhr.responseType = "arraybuffer";
                    xhr.onload = () => {
                        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                            resolve(xhr.response);
                            return
                        }
                        reject(xhr.status)
                    };
                    xhr.onerror = reject;
                    xhr.send(null)
                })
            }
            var response = await fetch(url, {
                credentials: "same-origin"
            });
            if (response.ok) {
                return response.arrayBuffer()
            }
            throw new Error(response.status + " : " + response.url)
        }
    }
} else {}
var out = console.log.bind(console);
var err = console.error.bind(console);
var wasmBinary;
var ABORT = false;
var EXITSTATUS;
var isFileURI = filename => filename.startsWith("file://");
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var HEAP64, HEAPU64;
var runtimeInitialized = false;

function updateMemoryViews() {
    var b = wasmMemory.buffer;
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
    HEAP64 = new BigInt64Array(b);
    HEAPU64 = new BigUint64Array(b)
}

function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(onPreRuns)
}

function initRuntime() {
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.preloadFile = FS_preloadFile;
    if (window.initGLFrame) window.initGLFrame();
    Fetch.init();
    runtimeInitialized = true;
    TTY.init();
    wasmExports["xk"]();
    FS.ignorePermissions = false
}

function preMain() {}

function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(onPostRuns)
}
abort = function(what) {
    Module["onAbort"]?.(what);
    what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e
};
var wasmBinaryFile;

function findWasmBinary() {
    return locateFile("index.wasm")
}

function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary)
    }
    if (readBinary) {
        return readBinary(file)
    }
    throw "both async and sync fetching of the wasm failed"
}
async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
        try {
            var response = await readAsync(binaryFile);
            return new Uint8Array(response)
        } catch {}
    }
    return getBinarySync(binaryFile)
}
async function instantiateArrayBuffer(binaryFile, imports) {
    try {
        var binary = await getWasmBinary(binaryFile);
        var instance = await WebAssembly.instantiate(binary, imports);
        return instance
    } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason)
    }
}
async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
        try {
            var response = fetch(binaryFile, {
                credentials: "same-origin"
            });
            var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
            return instantiationResult
        } catch (reason) {
            err(`wasm streaming compile failed: ${reason}`);
            err("falling back to ArrayBuffer instantiation")
        }
    }
    return instantiateArrayBuffer(binaryFile, imports)
}

function getWasmImports() {
    initDependencies();
    var imports = {
        a: wasmImports
    };
    return imports
}
async function createWasm() {
    function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        assignWasmExports(wasmExports);
        updateMemoryViews();
        removeRunDependency("wasm-instantiate");
        return wasmExports
    }
    addRunDependency("wasm-instantiate");

    function receiveInstantiationResult(result) {
        return receiveInstance(result["instance"])
    }
    var info = getWasmImports();
    if (Module["instantiateWasm"]) {
        return new Promise((resolve, reject) => {
            Module["instantiateWasm"](info, (inst, mod) => {
                resolve(receiveInstance(inst, mod))
            })
        })
    }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    var exports = receiveInstantiationResult(result);
    return exports
}
class ExitStatus {
    name = "ExitStatus";
    constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status
    }
}
var callRuntimeCallbacks = callbacks => {
    while (callbacks.length > 0) {
        callbacks.shift()(Module)
    }
};
var onPostRuns = [];
var addOnPostRun = cb => onPostRuns.push(cb);
var onPreRuns = [];
var addOnPreRun = cb => onPreRuns.push(cb);
var runDependencies = 0;
var dependenciesFulfilled = null;
var removeRunDependency = id => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
};
var addRunDependency = id => {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies)
};
var noExitRuntime = true;

function setValue(ptr, value, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
        case "i1":
            HEAP8[ptr] = value;
            break;
        case "i8":
            HEAP8[ptr] = value;
            break;
        case "i16":
            HEAP16[ptr >> 1] = value;
            break;
        case "i32":
            HEAP32[ptr >> 2] = value;
            break;
        case "i64":
            HEAP64[ptr >> 3] = BigInt(value);
            break;
        case "float":
            HEAPF32[ptr >> 2] = value;
            break;
        case "double":
            HEAPF64[ptr >> 3] = value;
            break;
        case "*":
            HEAPU32[ptr >> 2] = value;
            break;
        default:
            abort(`invalid type for setValue: ${type}`)
    }
}
var stackRestore = val => __emscripten_stack_restore(val);
var stackSave = () => _emscripten_stack_get_current();
var exceptionCaught = [];
var uncaughtExceptionCount = 0;
var ___cxa_begin_catch = ptr => {
    var info = new ExceptionInfo(ptr);
    if (!info.get_caught()) {
        info.set_caught(true);
        uncaughtExceptionCount--
    }
    info.set_rethrown(false);
    exceptionCaught.push(info);
    ___cxa_increment_exception_refcount(ptr);
    return ___cxa_get_exception_ptr(ptr)
};
var exceptionLast = 0;
var ___cxa_end_catch = () => {
    _setThrew(0, 0);
    var info = exceptionCaught.pop();
    ___cxa_decrement_exception_refcount(info.excPtr);
    exceptionLast = 0
};
class ExceptionInfo {
    constructor(excPtr) {
        this.excPtr = excPtr;
        this.ptr = excPtr - 24
    }
    set_type(type) {
        HEAPU32[this.ptr + 4 >> 2] = type
    }
    get_type() {
        return HEAPU32[this.ptr + 4 >> 2]
    }
    set_destructor(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor
    }
    get_destructor() {
        return HEAPU32[this.ptr + 8 >> 2]
    }
    set_caught(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12] = caught
    }
    get_caught() {
        return HEAP8[this.ptr + 12] != 0
    }
    set_rethrown(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13] = rethrown
    }
    get_rethrown() {
        return HEAP8[this.ptr + 13] != 0
    }
    init(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor)
    }
    set_adjusted_ptr(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr
    }
    get_adjusted_ptr() {
        return HEAPU32[this.ptr + 16 >> 2]
    }
}
var setTempRet0 = val => __emscripten_tempret_set(val);
var findMatchingCatch = args => {
    var thrown = exceptionLast;
    if (!thrown) {
        setTempRet0(0);
        return 0
    }
    var info = new ExceptionInfo(thrown);
    info.set_adjusted_ptr(thrown);
    var thrownType = info.get_type();
    if (!thrownType) {
        setTempRet0(0);
        return thrown
    }
    for (var caughtType of args) {
        if (caughtType === 0 || caughtType === thrownType) {
            break
        }
        var adjusted_ptr_addr = info.ptr + 16;
        if (___cxa_can_catch(caughtType, thrownType, adjusted_ptr_addr)) {
            setTempRet0(caughtType);
            return thrown
        }
    }
    setTempRet0(thrownType);
    return thrown
};
var ___cxa_find_matching_catch_2 = () => findMatchingCatch([]);
var ___cxa_find_matching_catch_3 = arg0 => findMatchingCatch([arg0]);
var ___cxa_rethrow = () => {
    var info = exceptionCaught.pop();
    if (!info) {
        abort("no exception to throw")
    }
    var ptr = info.excPtr;
    if (!info.get_rethrown()) {
        exceptionCaught.push(info);
        info.set_rethrown(true);
        info.set_caught(false);
        uncaughtExceptionCount++
    }
    exceptionLast = ptr;
    throw exceptionLast
};
var ___cxa_throw = (ptr, type, destructor) => {
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    exceptionLast = ptr;
    uncaughtExceptionCount++;
    throw exceptionLast
};
var ___cxa_uncaught_exceptions = () => uncaughtExceptionCount;
var ___resumeException = ptr => {
    if (!exceptionLast) {
        exceptionLast = ptr
    }
    throw exceptionLast
};
var __abort_js = () => abort("");
var INT53_MAX = 9007199254740992;
var INT53_MIN = -9007199254740992;
var bigintToI53Checked = num => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);

function __gmtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
    var date = new Date(time * 1e3);
    HEAP32[tmPtr >> 2] = date.getUTCSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
    HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
    HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
    var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
    var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday
}
var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
var ydayFromDate = date => {
    var leap = isLeapYear(date.getFullYear());
    var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
    var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
    return yday
};

function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
    var date = new Date(time * 1e3);
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var yday = ydayFromDate(date) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
    HEAP32[tmPtr + 32 >> 2] = dst
}
var __mktime_js = function(tmPtr) {
    var ret = (() => {
        var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
        var dst = HEAP32[tmPtr + 32 >> 2];
        var guessedOffset = date.getTimezoneOffset();
        var start = new Date(date.getFullYear(), 0, 1);
        var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
        var winterOffset = start.getTimezoneOffset();
        var dstOffset = Math.min(winterOffset, summerOffset);
        if (dst < 0) {
            HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset)
        } else if (dst > 0 != (dstOffset == guessedOffset)) {
            var nonDstOffset = Math.max(winterOffset, summerOffset);
            var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
            date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4)
        }
        HEAP32[tmPtr + 24 >> 2] = date.getDay();
        var yday = ydayFromDate(date) | 0;
        HEAP32[tmPtr + 28 >> 2] = yday;
        HEAP32[tmPtr >> 2] = date.getSeconds();
        HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
        HEAP32[tmPtr + 8 >> 2] = date.getHours();
        HEAP32[tmPtr + 12 >> 2] = date.getDate();
        HEAP32[tmPtr + 16 >> 2] = date.getMonth();
        HEAP32[tmPtr + 20 >> 2] = date.getYear();
        var timeMs = date.getTime();
        if (isNaN(timeMs)) {
            return -1
        }
        return timeMs / 1e3
    })();
    return BigInt(ret)
};
var __tzset_js = (timezone, daylight, std_name, dst_name) => {
    var currentYear = (new Date).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
    HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
    var extractZone = timezoneOffset => {
        var sign = timezoneOffset >= 0 ? "-" : "+";
        var absOffset = Math.abs(timezoneOffset);
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
        return `UTC${sign}${hours}${minutes}`
    };
    var winterName = extractZone(winterOffset);
    var summerName = extractZone(summerOffset);
    if (summerOffset < winterOffset) {
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17)
    } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17)
    }
};
var _emscripten_set_main_loop_timing = (mode, value) => {
    MainLoop.timingMode = mode;
    MainLoop.timingValue = value;
    if (!MainLoop.func) {
        return 1
    }
    if (!MainLoop.running) {
        MainLoop.running = true
    }
    if (mode == 0) {
        MainLoop.scheduler = function MainLoop_scheduler_setTimeout() {
            var timeUntilNextTick = Math.max(0, MainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
            setTimeout(MainLoop.runner, timeUntilNextTick)
        };
        MainLoop.method = "timeout"
    } else if (mode == 1) {
        MainLoop.scheduler = function MainLoop_scheduler_rAF() {
            MainLoop.requestAnimationFrame(MainLoop.runner)
        };
        MainLoop.method = "rAF"
    } else if (mode == 2) {
        if (!MainLoop.setImmediate) {
            if (globalThis.setImmediate) {
                MainLoop.setImmediate = setImmediate
            } else {
                var setImmediates = [];
                var emscriptenMainLoopMessageId = "setimmediate";
                var MainLoop_setImmediate_messageHandler = event => {
                    if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
                        event.stopPropagation();
                        setImmediates.shift()()
                    }
                };
                addEventListener("message", MainLoop_setImmediate_messageHandler, true);
                MainLoop.setImmediate = func => {
                    setImmediates.push(func);
                    if (ENVIRONMENT_IS_WORKER) {
                        Module["setImmediates"] ??= [];
                        Module["setImmediates"].push(func);
                        postMessage({
                            target: emscriptenMainLoopMessageId
                        })
                    } else postMessage(emscriptenMainLoopMessageId, "*")
                }
            }
        }
        MainLoop.scheduler = function MainLoop_scheduler_setImmediate() {
            MainLoop.setImmediate(MainLoop.runner)
        };
        MainLoop.method = "immediate"
    }
    return 0
};
var _emscripten_get_now = () => performance.now();
var runtimeKeepaliveCounter = 0;
var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
var _proc_exit = code => {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
        Module["onExit"]?.(code);
        ABORT = true
    }
    quit_(code, new ExitStatus(code))
};
var exitJS = (status, implicit) => {
    EXITSTATUS = status;
    _proc_exit(status)
};
var _exit = exitJS;
var handleException = e => {
    if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS
    }
    quit_(1, e)
};
var maybeExit = () => {
    if (!keepRuntimeAlive()) {
        try {
            _exit(EXITSTATUS)
        } catch (e) {
            handleException(e)
        }
    }
};
var setMainLoop = (iterFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
    MainLoop.func = iterFunc;
    MainLoop.arg = arg;
    var thisMainLoopId = MainLoop.currentlyRunningMainloop;

    function checkIsRunning() {
        if (thisMainLoopId < MainLoop.currentlyRunningMainloop) {
            maybeExit();
            return false
        }
        return true
    }
    MainLoop.running = false;
    MainLoop.runner = function MainLoop_runner() {
        if (ABORT) return;
        if (MainLoop.queue.length > 0) {
            var start = Date.now();
            var blocker = MainLoop.queue.shift();
            blocker.func(blocker.arg);
            if (MainLoop.remainingBlockers) {
                var remaining = MainLoop.remainingBlockers;
                var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
                if (blocker.counted) {
                    MainLoop.remainingBlockers = next
                } else {
                    next = next + .5;
                    MainLoop.remainingBlockers = (8 * remaining + next) / 9
                }
            }
            MainLoop.updateStatus();
            if (!checkIsRunning()) return;
            setTimeout(MainLoop.runner, 0);
            return
        }
        if (!checkIsRunning()) return;
        MainLoop.currentFrameNumber = MainLoop.currentFrameNumber + 1 | 0;
        if (MainLoop.timingMode == 1 && MainLoop.timingValue > 1 && MainLoop.currentFrameNumber % MainLoop.timingValue != 0) {
            MainLoop.scheduler();
            return
        } else if (MainLoop.timingMode == 0) {
            MainLoop.tickStartTime = _emscripten_get_now()
        }
        MainLoop.runIter(iterFunc);
        if (!checkIsRunning()) return;
        MainLoop.scheduler()
    };
    if (!noSetTiming) {
        if (fps > 0) {
            _emscripten_set_main_loop_timing(0, 1e3 / fps)
        } else {
            _emscripten_set_main_loop_timing(1, 1)
        }
        MainLoop.scheduler()
    }
    if (simulateInfiniteLoop) {
        throw "unwind"
    }
};
var callUserCallback = func => {
    if (ABORT) {
        return
    }
    try {
        func();
        maybeExit()
    } catch (e) {
        handleException(e)
    }
};
var MainLoop = {
    running: false,
    scheduler: null,
    method: "",
    currentlyRunningMainloop: 0,
    func: null,
    arg: 0,
    timingMode: 0,
    timingValue: 0,
    currentFrameNumber: 0,
    queue: [],
    preMainLoop: [],
    postMainLoop: [],
    pause() {
        MainLoop.scheduler = null;
        MainLoop.currentlyRunningMainloop++
    },
    resume() {
        MainLoop.currentlyRunningMainloop++;
        var timingMode = MainLoop.timingMode;
        var timingValue = MainLoop.timingValue;
        var func = MainLoop.func;
        MainLoop.func = null;
        setMainLoop(func, 0, false, MainLoop.arg, true);
        _emscripten_set_main_loop_timing(timingMode, timingValue);
        MainLoop.scheduler()
    },
    updateStatus() {
        if (Module["setStatus"]) {
            var message = Module["statusMessage"] || "Please wait...";
            var remaining = MainLoop.remainingBlockers ?? 0;
            var expected = MainLoop.expectedBlockers ?? 0;
            if (remaining) {
                if (remaining < expected) {
                    Module["setStatus"](`{message} ({expected - remaining}/{expected})`)
                } else {
                    Module["setStatus"](message)
                }
            } else {
                Module["setStatus"]("")
            }
        }
    },
    init() {
        Module["preMainLoop"] && MainLoop.preMainLoop.push(Module["preMainLoop"]);
        Module["postMainLoop"] && MainLoop.postMainLoop.push(Module["postMainLoop"])
    },
    runIter(func) {
        if (ABORT) return;
        for (var pre of MainLoop.preMainLoop) {
            if (pre() === false) {
                return
            }
        }
        callUserCallback(func);
        for (var post of MainLoop.postMainLoop) {
            post()
        }
    },
    nextRAF: 0,
    fakeRequestAnimationFrame(func) {
        var now = Date.now();
        if (MainLoop.nextRAF === 0) {
            MainLoop.nextRAF = now + 1e3 / 60
        } else {
            while (now + 2 >= MainLoop.nextRAF) {
                MainLoop.nextRAF += 1e3 / 60
            }
        }
        var delay = Math.max(MainLoop.nextRAF - now, 0);
        setTimeout(func, delay)
    },
    requestAnimationFrame(func) {
        if (globalThis.requestAnimationFrame) {
            requestAnimationFrame(func)
        } else {
            MainLoop.fakeRequestAnimationFrame(func)
        }
    }
};
var _emscripten_date_now = () => Date.now();
var nowIsMonotonic = 1;
var checkWasiClock = clock_id => clock_id >= 0 && clock_id <= 3;

function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (!checkWasiClock(clk_id)) {
        return 28
    }
    var now;
    if (clk_id === 0) {
        now = _emscripten_date_now()
    } else if (nowIsMonotonic) {
        now = _emscripten_get_now()
    } else {
        return 52
    }
    var nsec = Math.round(now * 1e3 * 1e3);
    HEAP64[ptime >> 3] = BigInt(nsec);
    return 0
}

function getFullscreenElement() {
    return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement || document.msFullscreenElement
}
var safeSetTimeout = (func, timeout) => setTimeout(() => {
    callUserCallback(func)
}, timeout);
var warnOnce = text => {
    warnOnce.shown ||= {};
    if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
        err(text)
    }
};
var readEmAsmArgsArray = [];
var readEmAsmArgs = (sigPtr, buf) => {
    readEmAsmArgsArray.length = 0;
    var ch;
    while (ch = HEAPU8[sigPtr++]) {
        var wide = ch != 105;
        wide &= ch != 112;
        buf += wide && buf % 8 ? 4 : 0;
        readEmAsmArgsArray.push(ch == 112 ? HEAPU32[buf >> 2] : ch == 106 ? HEAP64[buf >> 3] : ch == 105 ? HEAP32[buf >> 2] : HEAPF64[buf >> 3]);
        buf += wide ? 8 : 4
    }
    return readEmAsmArgsArray
};
var runEmAsmFunction = (code, sigPtr, argbuf) => {
    var args = readEmAsmArgs(sigPtr, argbuf);
    return ASM_CONSTS[code](...args)
};
var _emscripten_asm_const_int = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);
var runMainThreadEmAsm = (emAsmAddr, sigPtr, argbuf, sync) => {
    var args = readEmAsmArgs(sigPtr, argbuf);
    return ASM_CONSTS[emAsmAddr](...args)
};
var _emscripten_asm_const_int_sync_on_main_thread = (emAsmAddr, sigPtr, argbuf) => runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 1);
var _emscripten_asm_const_ptr_sync_on_main_thread = (emAsmAddr, sigPtr, argbuf) => runMainThreadEmAsm(emAsmAddr, sigPtr, argbuf, 1);
var _emscripten_err = str => err(UTF8ToString(str));
var _emscripten_set_window_title = title => document.title = UTF8ToString(title);
var _emscripten_sleep = () => {
    abort("Please compile your program with async support in order to use asynchronous operations like emscripten_sleep")
};
class HandleAllocator {
    allocated = [undefined];
    freelist = [];
    get(id) {
        return this.allocated[id]
    }
    has(id) {
        return this.allocated[id] !== undefined
    }
    allocate(handle) {
        var id = this.freelist.pop() || this.allocated.length;
        this.allocated[id] = handle;
        return id
    }
    free(id) {
        this.allocated[id] = undefined;
        this.freelist.push(id)
    }
}
var ENV = {};
var getExecutableName = () => thisProgram || "./this.program";
var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
        var lang = (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8";
        var env = {
            USER: "web_user",
            LOGNAME: "web_user",
            PATH: "/",
            PWD: "/",
            HOME: "/home/web_user",
            LANG: lang,
            _: getExecutableName()
        };
        for (var x in ENV) {
            if (ENV[x] === undefined) delete env[x];
            else env[x] = ENV[x]
        }
        var strings = [];
        for (var x in env) {
            strings.push(`${x}=${env[x]}`)
        }
        getEnvStrings.strings = strings
    }
    return getEnvStrings.strings
};
var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + envp >> 2] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4
    }
    return 0
};
var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1
    }
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0
};

function _fd_close(fd) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno
    }
}
var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
        if (typeof offset != "undefined") {
            offset += curr
        }
    }
    return ret
};

function _fd_read(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno
    }
}

function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        HEAP64[newOffset >> 3] = BigInt(stream.position);
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno
    }
}
var doWritev = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
            break
        }
        if (typeof offset != "undefined") {
            offset += curr
        }
    }
    return ret
};

function _fd_write(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno
    }
}
var _glActiveTexture = (...args) => _emscripten_glActiveTexture(...args);
var _glAttachShader = (...args) => _emscripten_glAttachShader(...args);
var _glBindBuffer = (...args) => _emscripten_glBindBuffer(...args);
var _glBindBufferBase = (...args) => _emscripten_glBindBufferBase(...args);
var _glBindFramebuffer = (...args) => _emscripten_glBindFramebuffer(...args);
var _glBindRenderbuffer = (...args) => _emscripten_glBindRenderbuffer(...args);
var _glBindSampler = (...args) => _emscripten_glBindSampler(...args);
var _glBindTexture = (...args) => _emscripten_glBindTexture(...args);
var _glBindVertexArray = (...args) => _emscripten_glBindVertexArray(...args);
var _glBlendEquationSeparate = (...args) => _emscripten_glBlendEquationSeparate(...args);
var _glBlendFuncSeparate = (...args) => _emscripten_glBlendFuncSeparate(...args);
var _glBufferData = (...args) => _emscripten_glBufferData(...args);
var _glClear = (...args) => _emscripten_glClear(...args);
var _glClearColor = (...args) => _emscripten_glClearColor(...args);
var _glClearDepthf = (...args) => _emscripten_glClearDepthf(...args);
var _glClearStencil = (...args) => _emscripten_glClearStencil(...args);
var _glColorMask = (...args) => _emscripten_glColorMask(...args);
var _glCompileShader = (...args) => _emscripten_glCompileShader(...args);
var _glCopyTexSubImage2D = (...args) => _emscripten_glCopyTexSubImage2D(...args);
var _glCreateProgram = (...args) => _emscripten_glCreateProgram(...args);
var _glCreateShader = (...args) => _emscripten_glCreateShader(...args);
var _glCullFace = (...args) => _emscripten_glCullFace(...args);
var _glDeleteBuffers = (...args) => _emscripten_glDeleteBuffers(...args);
var _glDeleteFramebuffers = (...args) => _emscripten_glDeleteFramebuffers(...args);
var _glDeleteProgram = (...args) => _emscripten_glDeleteProgram(...args);
var _glDeleteRenderbuffers = (...args) => _emscripten_glDeleteRenderbuffers(...args);
var _glDeleteSamplers = (...args) => _emscripten_glDeleteSamplers(...args);
var _glDeleteShader = (...args) => _emscripten_glDeleteShader(...args);
var _glDeleteTextures = (...args) => _emscripten_glDeleteTextures(...args);
var _glDeleteVertexArrays = (...args) => _emscripten_glDeleteVertexArrays(...args);
var _glDepthFunc = (...args) => _emscripten_glDepthFunc(...args);
var _glDepthMask = (...args) => _emscripten_glDepthMask(...args);
var _glDepthRangef = (...args) => _emscripten_glDepthRangef(...args);
var _glDisable = (...args) => _emscripten_glDisable(...args);
var _glDisableVertexAttribArray = (...args) => _emscripten_glDisableVertexAttribArray(...args);
var _glDrawArraysInstanced = (...args) => _emscripten_glDrawArraysInstanced(...args);
var _glDrawBuffers = (...args) => _emscripten_glDrawBuffers(...args);
var _glDrawElementsInstanced = (...args) => _emscripten_glDrawElementsInstanced(...args);
var _glEnable = (...args) => _emscripten_glEnable(...args);
var _glEnableVertexAttribArray = (...args) => _emscripten_glEnableVertexAttribArray(...args);
var _glFramebufferRenderbuffer = (...args) => _emscripten_glFramebufferRenderbuffer(...args);
var _glFramebufferTexture2D = (...args) => _emscripten_glFramebufferTexture2D(...args);
var _glFrontFace = (...args) => _emscripten_glFrontFace(...args);
var _glGenBuffers = (...args) => _emscripten_glGenBuffers(...args);
var _glGenFramebuffers = (...args) => _emscripten_glGenFramebuffers(...args);
var _glGenRenderbuffers = (...args) => _emscripten_glGenRenderbuffers(...args);
var _glGenSamplers = (...args) => _emscripten_glGenSamplers(...args);
var _glGenTextures = (...args) => _emscripten_glGenTextures(...args);
var _glGenVertexArrays = (...args) => _emscripten_glGenVertexArrays(...args);
var _glGenerateMipmap = (...args) => _emscripten_glGenerateMipmap(...args);
var _glGetIntegerv = (...args) => _emscripten_glGetIntegerv(...args);
var _glGetProgramInfoLog = (...args) => _emscripten_glGetProgramInfoLog(...args);
var _glGetProgramiv = (...args) => _emscripten_glGetProgramiv(...args);
var _glGetShaderInfoLog = (...args) => _emscripten_glGetShaderInfoLog(...args);
var _glGetShaderiv = (...args) => _emscripten_glGetShaderiv(...args);
var _glGetStringi = (...args) => _emscripten_glGetStringi(...args);
var _glGetUniformBlockIndex = (...args) => _emscripten_glGetUniformBlockIndex(...args);
var _glGetUniformLocation = (...args) => _emscripten_glGetUniformLocation(...args);
var _glLinkProgram = (...args) => _emscripten_glLinkProgram(...args);
var _glPixelStorei = (...args) => _emscripten_glPixelStorei(...args);
var _glPolygonOffset = (...args) => _emscripten_glPolygonOffset(...args);
var _glReadPixels = (...args) => _emscripten_glReadPixels(...args);
var _glRenderbufferStorage = (...args) => _emscripten_glRenderbufferStorage(...args);
var _glSamplerParameterf = (...args) => _emscripten_glSamplerParameterf(...args);
var _glSamplerParameteri = (...args) => _emscripten_glSamplerParameteri(...args);
var _glScissor = (...args) => _emscripten_glScissor(...args);
var _glShaderSource = (...args) => _emscripten_glShaderSource(...args);
var _glStencilFunc = (...args) => _emscripten_glStencilFunc(...args);
var _glStencilMask = (...args) => _emscripten_glStencilMask(...args);
var _glStencilOp = (...args) => _emscripten_glStencilOp(...args);
var _glTexImage2D = (...args) => _emscripten_glTexImage2D(...args);
var _glTexParameteri = (...args) => _emscripten_glTexParameteri(...args);
var _glTexSubImage2D = (...args) => _emscripten_glTexSubImage2D(...args);
var _glUniform1i = (...args) => _emscripten_glUniform1i(...args);
var _glUniformBlockBinding = (...args) => _emscripten_glUniformBlockBinding(...args);
var _glUseProgram = (...args) => _emscripten_glUseProgram(...args);
var _glVertexAttribDivisor = (...args) => _emscripten_glVertexAttribDivisor(...args);
var _glVertexAttribPointer = (...args) => _emscripten_glVertexAttribPointer(...args);
var _glViewport = (...args) => _emscripten_glViewport(...args);
var _llvm_eh_typeid_for = type => type;
var dynCall = (sig, ptr, args = [], promising = false) => {
    var func = getWasmTableEntry(ptr);
    var rtn = func(...args);

    function convert(rtn) {
        return rtn
    }
    return convert(rtn)
};
var FS_createPath = (...args) => FS.createPath(...args);
var FS_unlink = (...args) => FS.unlink(...args);
var FS_createLazyFile = (...args) => FS.createLazyFile(...args);
var FS_createDevice = (...args) => FS.createDevice(...args);
var createContext;
var dependenciesInitted = false;
function initDependencies() {
    if (dependenciesInitted) return;
    dependenciesInitted = true;
    console.log("Initializing dependencies...");
    var fs_obj = typeof FS !== "undefined" ? FS : window.FS;
    if (fs_obj) {
        console.log("Initializing FS...");
        if (!fs_obj.nameTable) fs_obj.staticInit();
        if (!fs_obj.initialized) fs_obj.init();
    } else { console.error("FS NOT FOUND!"); }
    if (typeof FS !== "undefined") {
    }
    createContext = (...args) => Browser.createContext(...args);
// FS.createPreloadedFile = FS_createPreloadedFile;
// FS.preloadFile = FS_preloadFile;
Module["requestAnimationFrame"] = MainLoop.requestAnimationFrame;
Module["pauseMainLoop"] = MainLoop.pause;
Module["resumeMainLoop"] = MainLoop.resume;
MainLoop.init();
    window.initGLFrame = () => registerPreMainLoop(() => GL.newRenderingFrameStarted());
for (let i = 0; i < 32; ++i) tempFixedLengthArray.push(new Array(i));
var miniTempWebGLFloatBuffersStorage = new Float32Array(288);
for (var i = 0; i <= 288; ++i) {
    miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i)
}
var miniTempWebGLIntBuffersStorage = new Int32Array(288);
for (var i = 0; i <= 288; ++i) {
    miniTempWebGLIntBuffers[i] = miniTempWebGLIntBuffersStorage.subarray(0, i)
}
// Fetch.init();
}
{
    if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
    if (Module["preloadPlugins"]) preloadPlugins = Module["preloadPlugins"];
    if (Module["print"]) out = Module["print"];
    if (Module["printErr"]) err = Module["printErr"];
    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
    if (Module["arguments"]) arguments_ = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
            Module["preInit"].shift()()
        }
    }
}
Module["addRunDependency"] = addRunDependency;
Module["removeRunDependency"] = removeRunDependency;
Module["createContext"] = (...args) => createContext(...args);
Module["FS_preloadFile"] = (...args) => window.FS_preloadFile(...args);
Module["FS_unlink"] = FS_unlink;
Module["FS_createPath"] = FS_createPath;
Module["FS_createDevice"] = FS_createDevice;
Object.defineProperty(Module, "FS", { get: () => typeof FS !== "undefined" ? FS : window.FS });
Module["FS_createDataFile"] = (...args) => FS_createDataFile(...args);
Module["FS_createLazyFile"] = (...args) => FS_createLazyFile(...args);

var stackAlloc = (...args) => __emscripten_stack_alloc(...args);
var stringToUTF8OnStack = str => {
    var len = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(len);
    stringToUTF8(str, ret, len);
    return ret;
};

var getWasmTableEntry = funcPtr => wasmTable.get(funcPtr);
var _malloc, _free, _realloc, _main, _setThrew, __emscripten_tempret_set, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, ___cxa_decrement_exception_refcount, ___cxa_increment_exception_refcount, ___cxa_can_catch, ___cxa_get_exception_ptr, memory, __indirect_function_table, wasmMemory, wasmTable;

function assignWasmExports(wasmExports) {
    _malloc = wasmExports["zk"];
    _free = wasmExports["Ak"];
    _realloc = wasmExports["Bk"];
    _main = Module["_main"] = wasmExports["Ck"];
    _setThrew = wasmExports["Dk"];
    __emscripten_tempret_set = wasmExports["Ek"];
    __emscripten_stack_restore = wasmExports["Fk"];
    __emscripten_stack_alloc = wasmExports["Gk"];
    _emscripten_stack_get_current = wasmExports["Hk"];
    ___cxa_decrement_exception_refcount = wasmExports["Ik"];
    ___cxa_increment_exception_refcount = wasmExports["Jk"];
    ___cxa_can_catch = wasmExports["Kk"];
    ___cxa_get_exception_ptr = wasmExports["Lk"];
    memory = wasmMemory = wasmExports["wk"];
    __indirect_function_table = wasmTable = wasmExports["yk"]
}
var wasmImports = {
    n: (...args) => ___cxa_begin_catch(...args),
    z: (...args) => ___cxa_end_catch(...args),
    a: (...args) => ___cxa_find_matching_catch_2(...args),
    f: (...args) => ___cxa_find_matching_catch_3(...args),
    gc: (...args) => ___cxa_rethrow(...args),
    h: (...args) => ___cxa_throw(...args),
    fc: (...args) => ___cxa_uncaught_exceptions(...args),
    c: (...args) => ___resumeException(...args),
    vk: (...args) => ___syscall__newselect(...args),
    uk: (...args) => ___syscall_chdir(...args),
    tk: (...args) => ___syscall_faccessat(...args),
    H: (...args) => ___syscall_fcntl64(...args),
    sk: (...args) => ___syscall_getcwd(...args),
    rk: (...args) => ___syscall_getdents64(...args),
    qk: (...args) => ___syscall_ioctl(...args),
    pk: (...args) => ___syscall_lstat64(...args),
    ok: (...args) => ___syscall_mkdirat(...args),
    nk: (...args) => ___syscall_newfstatat(...args),
    ec: (...args) => ___syscall_openat(...args),
    mk: (...args) => ___syscall_readlinkat(...args),
    lk: (...args) => ___syscall_stat64(...args),
    kk: (...args) => ___syscall_unlinkat(...args),
    fk: (...args) => __abort_js(...args),
    ek: (...args) => __gmtime_js(...args),
    dk: (...args) => __localtime_js(...args),
    ck: (...args) => __mktime_js(...args),
    bk: (...args) => __tzset_js(...args),
    ak: (...args) => _alBuffer3f(...args),
    $j: (...args) => _alBuffer3i(...args),
    ia: (...args) => _alBufferData(...args),
    _j: (...args) => _alBufferf(...args),
    Zj: (...args) => _alBufferfv(...args),
    Yj: (...args) => _alBufferi(...args),
    bc: (...args) => _alBufferiv(...args),
    ha: (...args) => _alDeleteBuffers(...args),
    Ia: (...args) => _alDeleteSources(...args),
    Xj: (...args) => _alDisable(...args),
    ac: (...args) => _alDistanceModel(...args),
    Wj: (...args) => _alDopplerFactor(...args),
    Vj: (...args) => _alDopplerVelocity(...args),
    Uj: (...args) => _alEnable(...args),
    ga: (...args) => _alGenBuffers(...args),
    Ha: (...args) => _alGenSources(...args),
    Tj: (...args) => _alGetBoolean(...args),
    Sj: (...args) => _alGetBooleanv(...args),
    Rj: (...args) => _alGetBuffer3f(...args),
    Qj: (...args) => _alGetBuffer3i(...args),
    Pj: (...args) => _alGetBufferf(...args),
    Oj: (...args) => _alGetBufferfv(...args),
    Nj: (...args) => _alGetBufferi(...args),
    Mj: (...args) => _alGetBufferiv(...args),
    Lj: (...args) => _alGetDouble(...args),
    Kj: (...args) => _alGetDoublev(...args),
    $b: (...args) => _alGetEnumValue(...args),
    Jj: (...args) => _alGetError(...args),
    Ij: (...args) => _alGetFloat(...args),
    Hj: (...args) => _alGetFloatv(...args),
    Gj: (...args) => _alGetInteger(...args),
    Fj: (...args) => _alGetIntegerv(...args),
    Ej: (...args) => _alGetListener3f(...args),
    Dj: (...args) => _alGetListener3i(...args),
    Cj: (...args) => _alGetListenerf(...args),
    Bj: (...args) => _alGetListenerfv(...args),
    Aj: (...args) => _alGetListeneri(...args),
    zj: (...args) => _alGetListeneriv(...args),
    yj: (...args) => _alGetSource3f(...args),
    xj: (...args) => _alGetSource3i(...args),
    _b: (...args) => _alGetSourcef(...args),
    wj: (...args) => _alGetSourcefv(...args),
    u: (...args) => _alGetSourcei(...args),
    vj: (...args) => _alGetSourceiv(...args),
    Zb: (...args) => _alGetString(...args),
    Ga: (...args) => _alIsBuffer(...args),
    uj: (...args) => _alIsEnabled(...args),
    tj: (...args) => _alIsExtensionPresent(...args),
    sj: (...args) => _alIsSource(...args),
    Fa: (...args) => _alListener3f(...args),
    rj: (...args) => _alListener3i(...args),
    Yb: (...args) => _alListenerf(...args),
    Xb: (...args) => _alListenerfv(...args),
    qj: (...args) => _alListeneri(...args),
    pj: (...args) => _alListeneriv(...args),
    D: (...args) => _alSource3f(...args),
    ra: (...args) => _alSource3i(...args),
    Ea: (...args) => _alSourcePause(...args),
    oj: (...args) => _alSourcePausev(...args),
    R: (...args) => _alSourcePlay(...args),
    nj: (...args) => _alSourcePlayv(...args),
    G: (...args) => _alSourceQueueBuffers(...args),
    mj: (...args) => _alSourceRewind(...args),
    lj: (...args) => _alSourceRewindv(...args),
    $: (...args) => _alSourceStop(...args),
    kj: (...args) => _alSourceStopv(...args),
    fa: (...args) => _alSourceUnqueueBuffers(...args),
    v: (...args) => _alSourcef(...args),
    jj: (...args) => _alSourcefv(...args),
    y: (...args) => _alSourcei(...args),
    ij: (...args) => _alSourceiv(...args),
    hj: (...args) => _alSpeedOfSound(...args),
    Wb: (...args) => _alcCloseDevice(...args),
    Vb: (...args) => _alcCreateContext(...args),
    Ub: (...args) => _alcDestroyContext(...args),
    gj: (...args) => _alcGetIntegerv(...args),
    qa: (...args) => _alcIsExtensionPresent(...args),
    Da: (...args) => _alcMakeContextCurrent(...args),
    Tb: (...args) => _alcOpenDevice(...args),
    fj: (...args) => _alcSuspendContext(...args),
    jk: (...args) => _clock_time_get(...args),
    ej: (...args) => _eglBindAPI(...args),
    Sb: (...args) => _eglChooseConfig(...args),
    Rb: (...args) => _eglCreateContext(...args),
    Qb: (...args) => _eglCreateWindowSurface(...args),
    dj: (...args) => _eglDestroyContext(...args),
    cj: (...args) => _eglDestroySurface(...args),
    bj: (...args) => _eglGetConfigAttrib(...args),
    Ca: (...args) => _eglGetDisplay(...args),
    aj: (...args) => _eglGetError(...args),
    Pb: (...args) => _eglInitialize(...args),
    Ob: (...args) => _eglMakeCurrent(...args),
    $i: (...args) => _eglQueryString(...args),
    Nb: (...args) => _eglSwapBuffers(...args),
    _i: (...args) => _eglSwapInterval(...args),
    Zi: (...args) => _eglTerminate(...args),
    Yi: (...args) => _eglWaitGL(...args),
    Xi: (...args) => _eglWaitNative(...args),
    q: (...args) => _emscripten_asm_const_int(...args),
    B: (...args) => _emscripten_asm_const_int_sync_on_main_thread(...args),
    Wi: (...args) => _emscripten_asm_const_ptr_sync_on_main_thread(...args),
    Mb: (...args) => _emscripten_date_now(...args),
    Lb: (...args) => _emscripten_err(...args),
    Vi: (...args) => _emscripten_exit_fullscreen(...args),
    Ui: (...args) => _emscripten_exit_pointerlock(...args),
    Ti: (...args) => _emscripten_fetch_free(...args),
    ea: (...args) => _emscripten_get_device_pixel_ratio(...args),
    U: (...args) => _emscripten_get_element_css_size(...args),
    Kb: (...args) => _emscripten_get_gamepad_status(...args),
    Jb: (...args) => _emscripten_get_now(...args),
    Si: (...args) => _emscripten_get_num_gamepads(...args),
    Ri: (...args) => _emscripten_get_screen_size(...args),
    Qi: (...args) => _emscripten_glActiveTexture(...args),
    Pi: (...args) => _emscripten_glAttachShader(...args),
    Oi: (...args) => _emscripten_glBeginQuery(...args),
    Ni: (...args) => _emscripten_glBeginQueryEXT(...args),
    Mi: (...args) => _emscripten_glBeginTransformFeedback(...args),
    Li: (...args) => _emscripten_glBindAttribLocation(...args),
    Ki: (...args) => _emscripten_glBindBuffer(...args),
    Ji: (...args) => _emscripten_glBindBufferBase(...args),
    Ii: (...args) => _emscripten_glBindBufferRange(...args),
    Hi: (...args) => _emscripten_glBindFramebuffer(...args),
    Gi: (...args) => _emscripten_glBindRenderbuffer(...args),
    Fi: (...args) => _emscripten_glBindSampler(...args),
    Ei: (...args) => _emscripten_glBindTexture(...args),
    Di: (...args) => _emscripten_glBindTransformFeedback(...args),
    Ci: (...args) => _emscripten_glBindVertexArray(...args),
    Bi: (...args) => _emscripten_glBindVertexArrayOES(...args),
    Ai: (...args) => _emscripten_glBlendColor(...args),
    zi: (...args) => _emscripten_glBlendEquation(...args),
    yi: (...args) => _emscripten_glBlendEquationSeparate(...args),
    xi: (...args) => _emscripten_glBlendFunc(...args),
    wi: (...args) => _emscripten_glBlendFuncSeparate(...args),
    vi: (...args) => _emscripten_glBlitFramebuffer(...args),
    ui: (...args) => _emscripten_glBufferData(...args),
    ti: (...args) => _emscripten_glBufferSubData(...args),
    si: (...args) => _emscripten_glCheckFramebufferStatus(...args),
    ri: (...args) => _emscripten_glClear(...args),
    qi: (...args) => _emscripten_glClearBufferfi(...args),
    pi: (...args) => _emscripten_glClearBufferfv(...args),
    oi: (...args) => _emscripten_glClearBufferiv(...args),
    ni: (...args) => _emscripten_glClearBufferuiv(...args),
    mi: (...args) => _emscripten_glClearColor(...args),
    li: (...args) => _emscripten_glClearDepthf(...args),
    ki: (...args) => _emscripten_glClearStencil(...args),
    ji: (...args) => _emscripten_glClientWaitSync(...args),
    ii: (...args) => _emscripten_glClipControlEXT(...args),
    hi: (...args) => _emscripten_glColorMask(...args),
    gi: (...args) => _emscripten_glCompileShader(...args),
    fi: (...args) => _emscripten_glCompressedTexImage2D(...args),
    ei: (...args) => _emscripten_glCompressedTexImage3D(...args),
    di: (...args) => _emscripten_glCompressedTexSubImage2D(...args),
    ci: (...args) => _emscripten_glCompressedTexSubImage3D(...args),
    bi: (...args) => _emscripten_glCopyBufferSubData(...args),
    ai: (...args) => _emscripten_glCopyTexImage2D(...args),
    $h: (...args) => _emscripten_glCopyTexSubImage2D(...args),
    _h: (...args) => _emscripten_glCopyTexSubImage3D(...args),
    Zh: (...args) => _emscripten_glCreateProgram(...args),
    Yh: (...args) => _emscripten_glCreateShader(...args),
    Xh: (...args) => _emscripten_glCullFace(...args),
    Wh: (...args) => _emscripten_glDeleteBuffers(...args),
    Vh: (...args) => _emscripten_glDeleteFramebuffers(...args),
    Uh: (...args) => _emscripten_glDeleteProgram(...args),
    Th: (...args) => _emscripten_glDeleteQueries(...args),
    Sh: (...args) => _emscripten_glDeleteQueriesEXT(...args),
    Rh: (...args) => _emscripten_glDeleteRenderbuffers(...args),
    Qh: (...args) => _emscripten_glDeleteSamplers(...args),
    Ph: (...args) => _emscripten_glDeleteShader(...args),
    Oh: (...args) => _emscripten_glDeleteSync(...args),
    Nh: (...args) => _emscripten_glDeleteTextures(...args),
    Mh: (...args) => _emscripten_glDeleteTransformFeedbacks(...args),
    Lh: (...args) => _emscripten_glDeleteVertexArrays(...args),
    Kh: (...args) => _emscripten_glDeleteVertexArraysOES(...args),
    Jh: (...args) => _emscripten_glDepthFunc(...args),
    Ih: (...args) => _emscripten_glDepthMask(...args),
    Hh: (...args) => _emscripten_glDepthRangef(...args),
    Gh: (...args) => _emscripten_glDetachShader(...args),
    Fh: (...args) => _emscripten_glDisable(...args),
    Eh: (...args) => _emscripten_glDisableVertexAttribArray(...args),
    Dh: (...args) => _emscripten_glDrawArrays(...args),
    Ch: (...args) => _emscripten_glDrawArraysInstanced(...args),
    Bh: (...args) => _emscripten_glDrawArraysInstancedANGLE(...args),
    Ah: (...args) => _emscripten_glDrawArraysInstancedARB(...args),
    zh: (...args) => _emscripten_glDrawArraysInstancedEXT(...args),
    yh: (...args) => _emscripten_glDrawArraysInstancedNV(...args),
    xh: (...args) => _emscripten_glDrawBuffers(...args),
    wh: (...args) => _emscripten_glDrawBuffersEXT(...args),
    vh: (...args) => _emscripten_glDrawBuffersWEBGL(...args),
    uh: (...args) => _emscripten_glDrawElements(...args),
    th: (...args) => _emscripten_glDrawElementsInstanced(...args),
    sh: (...args) => _emscripten_glDrawElementsInstancedANGLE(...args),
    rh: (...args) => _emscripten_glDrawElementsInstancedARB(...args),
    qh: (...args) => _emscripten_glDrawElementsInstancedEXT(...args),
    ph: (...args) => _emscripten_glDrawElementsInstancedNV(...args),
    oh: (...args) => _emscripten_glDrawRangeElements(...args),
    nh: (...args) => _emscripten_glEnable(...args),
    mh: (...args) => _emscripten_glEnableVertexAttribArray(...args),
    lh: (...args) => _emscripten_glEndQuery(...args),
    kh: (...args) => _emscripten_glEndQueryEXT(...args),
    jh: (...args) => _emscripten_glEndTransformFeedback(...args),
    ih: (...args) => _emscripten_glFenceSync(...args),
    hh: (...args) => _emscripten_glFinish(...args),
    gh: (...args) => _emscripten_glFlush(...args),
    fh: (...args) => _emscripten_glFlushMappedBufferRange(...args),
    eh: (...args) => _emscripten_glFramebufferRenderbuffer(...args),
    dh: (...args) => _emscripten_glFramebufferTexture2D(...args),
    ch: (...args) => _emscripten_glFramebufferTextureLayer(...args),
    bh: (...args) => _emscripten_glFrontFace(...args),
    ah: (...args) => _emscripten_glGenBuffers(...args),
    $g: (...args) => _emscripten_glGenFramebuffers(...args),
    _g: (...args) => _emscripten_glGenQueries(...args),
    Zg: (...args) => _emscripten_glGenQueriesEXT(...args),
    Yg: (...args) => _emscripten_glGenRenderbuffers(...args),
    Xg: (...args) => _emscripten_glGenSamplers(...args),
    Wg: (...args) => _emscripten_glGenTextures(...args),
    Vg: (...args) => _emscripten_glGenTransformFeedbacks(...args),
    Ug: (...args) => _emscripten_glGenVertexArrays(...args),
    Tg: (...args) => _emscripten_glGenVertexArraysOES(...args),
    Sg: (...args) => _emscripten_glGenerateMipmap(...args),
    Rg: (...args) => _emscripten_glGetActiveAttrib(...args),
    Qg: (...args) => _emscripten_glGetActiveUniform(...args),
    Pg: (...args) => _emscripten_glGetActiveUniformBlockName(...args),
    Og: (...args) => _emscripten_glGetActiveUniformBlockiv(...args),
    Ng: (...args) => _emscripten_glGetActiveUniformsiv(...args),
    Mg: (...args) => _emscripten_glGetAttachedShaders(...args),
    Lg: (...args) => _emscripten_glGetAttribLocation(...args),
    Kg: (...args) => _emscripten_glGetBooleanv(...args),
    Jg: (...args) => _emscripten_glGetBufferParameteri64v(...args),
    Ig: (...args) => _emscripten_glGetBufferParameteriv(...args),
    Hg: (...args) => _emscripten_glGetBufferPointerv(...args),
    Gg: (...args) => _emscripten_glGetError(...args),
    Fg: (...args) => _emscripten_glGetFloatv(...args),
    Eg: (...args) => _emscripten_glGetFragDataLocation(...args),
    Dg: (...args) => _emscripten_glGetFramebufferAttachmentParameteriv(...args),
    Cg: (...args) => _emscripten_glGetInteger64i_v(...args),
    Bg: (...args) => _emscripten_glGetInteger64v(...args),
    Ag: (...args) => _emscripten_glGetIntegeri_v(...args),
    zg: (...args) => _emscripten_glGetIntegerv(...args),
    yg: (...args) => _emscripten_glGetInternalformativ(...args),
    xg: (...args) => _emscripten_glGetProgramBinary(...args),
    wg: (...args) => _emscripten_glGetProgramInfoLog(...args),
    vg: (...args) => _emscripten_glGetProgramiv(...args),
    ug: (...args) => _emscripten_glGetQueryObjecti64vEXT(...args),
    tg: (...args) => _emscripten_glGetQueryObjectivEXT(...args),
    sg: (...args) => _emscripten_glGetQueryObjectui64vEXT(...args),
    rg: (...args) => _emscripten_glGetQueryObjectuiv(...args),
    qg: (...args) => _emscripten_glGetQueryObjectuivEXT(...args),
    pg: (...args) => _emscripten_glGetQueryiv(...args),
    og: (...args) => _emscripten_glGetQueryivEXT(...args),
    ng: (...args) => _emscripten_glGetRenderbufferParameteriv(...args),
    mg: (...args) => _emscripten_glGetSamplerParameterfv(...args),
    lg: (...args) => _emscripten_glGetSamplerParameteriv(...args),
    kg: (...args) => _emscripten_glGetShaderInfoLog(...args),
    jg: (...args) => _emscripten_glGetShaderPrecisionFormat(...args),
    ig: (...args) => _emscripten_glGetShaderSource(...args),
    hg: (...args) => _emscripten_glGetShaderiv(...args),
    gg: (...args) => _emscripten_glGetString(...args),
    fg: (...args) => _emscripten_glGetStringi(...args),
    eg: (...args) => _emscripten_glGetSynciv(...args),
    dg: (...args) => _emscripten_glGetTexParameterfv(...args),
    cg: (...args) => _emscripten_glGetTexParameteriv(...args),
    bg: (...args) => _emscripten_glGetTransformFeedbackVarying(...args),
    ag: (...args) => _emscripten_glGetUniformBlockIndex(...args),
    $f: (...args) => _emscripten_glGetUniformIndices(...args),
    _f: (...args) => _emscripten_glGetUniformLocation(...args),
    Zf: (...args) => _emscripten_glGetUniformfv(...args),
    Yf: (...args) => _emscripten_glGetUniformiv(...args),
    Xf: (...args) => _emscripten_glGetUniformuiv(...args),
    Wf: (...args) => _emscripten_glGetVertexAttribIiv(...args),
    Vf: (...args) => _emscripten_glGetVertexAttribIuiv(...args),
    Uf: (...args) => _emscripten_glGetVertexAttribPointerv(...args),
    Tf: (...args) => _emscripten_glGetVertexAttribfv(...args),
    Sf: (...args) => _emscripten_glGetVertexAttribiv(...args),
    Rf: (...args) => _emscripten_glHint(...args),
    Qf: (...args) => _emscripten_glInvalidateFramebuffer(...args),
    Pf: (...args) => _emscripten_glInvalidateSubFramebuffer(...args),
    Of: (...args) => _emscripten_glIsBuffer(...args),
    Nf: (...args) => _emscripten_glIsEnabled(...args),
    Mf: (...args) => _emscripten_glIsFramebuffer(...args),
    Lf: (...args) => _emscripten_glIsProgram(...args),
    Kf: (...args) => _emscripten_glIsQuery(...args),
    Jf: (...args) => _emscripten_glIsQueryEXT(...args),
    If: (...args) => _emscripten_glIsRenderbuffer(...args),
    Hf: (...args) => _emscripten_glIsSampler(...args),
    Gf: (...args) => _emscripten_glIsShader(...args),
    Ff: (...args) => _emscripten_glIsSync(...args),
    Ef: (...args) => _emscripten_glIsTexture(...args),
    Df: (...args) => _emscripten_glIsTransformFeedback(...args),
    Cf: (...args) => _emscripten_glIsVertexArray(...args),
    Bf: (...args) => _emscripten_glIsVertexArrayOES(...args),
    Af: (...args) => _emscripten_glLineWidth(...args),
    zf: (...args) => _emscripten_glLinkProgram(...args),
    yf: (...args) => _emscripten_glMapBufferRange(...args),
    xf: (...args) => _emscripten_glPauseTransformFeedback(...args),
    wf: (...args) => _emscripten_glPixelStorei(...args),
    vf: (...args) => _emscripten_glPolygonModeWEBGL(...args),
    uf: (...args) => _emscripten_glPolygonOffset(...args),
    tf: (...args) => _emscripten_glPolygonOffsetClampEXT(...args),
    sf: (...args) => _emscripten_glProgramBinary(...args),
    rf: (...args) => _emscripten_glProgramParameteri(...args),
    qf: (...args) => _emscripten_glQueryCounterEXT(...args),
    pf: (...args) => _emscripten_glReadBuffer(...args),
    of: (...args) => _emscripten_glReadPixels(...args),
    nf: (...args) => _emscripten_glReleaseShaderCompiler(...args),
    mf: (...args) => _emscripten_glRenderbufferStorage(...args),
    lf: (...args) => _emscripten_glRenderbufferStorageMultisample(...args),
    kf: (...args) => _emscripten_glResumeTransformFeedback(...args),
    jf: (...args) => _emscripten_glSampleCoverage(...args),
    hf: (...args) => _emscripten_glSamplerParameterf(...args),
    gf: (...args) => _emscripten_glSamplerParameterfv(...args),
    ff: (...args) => _emscripten_glSamplerParameteri(...args),
    ef: (...args) => _emscripten_glSamplerParameteriv(...args),
    df: (...args) => _emscripten_glScissor(...args),
    cf: (...args) => _emscripten_glShaderBinary(...args),
    bf: (...args) => _emscripten_glShaderSource(...args),
    af: (...args) => _emscripten_glStencilFunc(...args),
    $e: (...args) => _emscripten_glStencilFuncSeparate(...args),
    _e: (...args) => _emscripten_glStencilMask(...args),
    Ze: (...args) => _emscripten_glStencilMaskSeparate(...args),
    Ye: (...args) => _emscripten_glStencilOp(...args),
    Xe: (...args) => _emscripten_glStencilOpSeparate(...args),
    We: (...args) => _emscripten_glTexImage2D(...args),
    Ve: (...args) => _emscripten_glTexImage3D(...args),
    Ue: (...args) => _emscripten_glTexParameterf(...args),
    Te: (...args) => _emscripten_glTexParameterfv(...args),
    Se: (...args) => _emscripten_glTexParameteri(...args),
    Re: (...args) => _emscripten_glTexParameteriv(...args),
    Qe: (...args) => _emscripten_glTexStorage2D(...args),
    Pe: (...args) => _emscripten_glTexStorage3D(...args),
    Oe: (...args) => _emscripten_glTexSubImage2D(...args),
    Ne: (...args) => _emscripten_glTexSubImage3D(...args),
    Me: (...args) => _emscripten_glTransformFeedbackVaryings(...args),
    Le: (...args) => _emscripten_glUniform1f(...args),
    Ke: (...args) => _emscripten_glUniform1fv(...args),
    Je: (...args) => _emscripten_glUniform1i(...args),
    Ie: (...args) => _emscripten_glUniform1iv(...args),
    He: (...args) => _emscripten_glUniform1ui(...args),
    Ge: (...args) => _emscripten_glUniform1uiv(...args),
    Fe: (...args) => _emscripten_glUniform2f(...args),
    Ee: (...args) => _emscripten_glUniform2fv(...args),
    De: (...args) => _emscripten_glUniform2i(...args),
    Ce: (...args) => _emscripten_glUniform2iv(...args),
    Be: (...args) => _emscripten_glUniform2ui(...args),
    Ae: (...args) => _emscripten_glUniform2uiv(...args),
    ze: (...args) => _emscripten_glUniform3f(...args),
    ye: (...args) => _emscripten_glUniform3fv(...args),
    xe: (...args) => _emscripten_glUniform3i(...args),
    we: (...args) => _emscripten_glUniform3iv(...args),
    ve: (...args) => _emscripten_glUniform3ui(...args),
    ue: (...args) => _emscripten_glUniform3uiv(...args),
    te: (...args) => _emscripten_glUniform4f(...args),
    se: (...args) => _emscripten_glUniform4fv(...args),
    re: (...args) => _emscripten_glUniform4i(...args),
    qe: (...args) => _emscripten_glUniform4iv(...args),
    pe: (...args) => _emscripten_glUniform4ui(...args),
    oe: (...args) => _emscripten_glUniform4uiv(...args),
    ne: (...args) => _emscripten_glUniformBlockBinding(...args),
    me: (...args) => _emscripten_glUniformMatrix2fv(...args),
    le: (...args) => _emscripten_glUniformMatrix2x3fv(...args),
    ke: (...args) => _emscripten_glUniformMatrix2x4fv(...args),
    je: (...args) => _emscripten_glUniformMatrix3fv(...args),
    ie: (...args) => _emscripten_glUniformMatrix3x2fv(...args),
    he: (...args) => _emscripten_glUniformMatrix3x4fv(...args),
    ge: (...args) => _emscripten_glUniformMatrix4fv(...args),
    fe: (...args) => _emscripten_glUniformMatrix4x2fv(...args),
    ee: (...args) => _emscripten_glUniformMatrix4x3fv(...args),
    de: (...args) => _emscripten_glUnmapBuffer(...args),
    ce: (...args) => _emscripten_glUseProgram(...args),
    be: (...args) => _emscripten_glValidateProgram(...args),
    ae: (...args) => _emscripten_glVertexAttrib1f(...args),
    $d: (...args) => _emscripten_glVertexAttrib1fv(...args),
    _d: (...args) => _emscripten_glVertexAttrib2f(...args),
    Zd: (...args) => _emscripten_glVertexAttrib2fv(...args),
    Yd: (...args) => _emscripten_glVertexAttrib3f(...args),
    Xd: (...args) => _emscripten_glVertexAttrib3fv(...args),
    Wd: (...args) => _emscripten_glVertexAttrib4f(...args),
    Vd: (...args) => _emscripten_glVertexAttrib4fv(...args),
    Ud: (...args) => _emscripten_glVertexAttribDivisor(...args),
    Td: (...args) => _emscripten_glVertexAttribDivisorANGLE(...args),
    Sd: (...args) => _emscripten_glVertexAttribDivisorARB(...args),
    Rd: (...args) => _emscripten_glVertexAttribDivisorEXT(...args),
    Qd: (...args) => _emscripten_glVertexAttribDivisorNV(...args),
    Pd: (...args) => _emscripten_glVertexAttribI4i(...args),
    Od: (...args) => _emscripten_glVertexAttribI4iv(...args),
    Nd: (...args) => _emscripten_glVertexAttribI4ui(...args),
    Md: (...args) => _emscripten_glVertexAttribI4uiv(...args),
    Ld: (...args) => _emscripten_glVertexAttribIPointer(...args),
    Kd: (...args) => _emscripten_glVertexAttribPointer(...args),
    Jd: (...args) => _emscripten_glViewport(...args),
    Id: (...args) => _emscripten_glWaitSync(...args),
    Ba: (...args) => _emscripten_has_asyncify(...args),
    Hd: (...args) => _emscripten_is_main_browser_thread(...args),
    Gd: (...args) => _emscripten_request_fullscreen_strategy(...args),
    Ib: (...args) => _emscripten_request_pointerlock(...args),
    Fd: (...args) => _emscripten_resize_heap(...args),
    Ed: (...args) => _emscripten_run_script_int(...args),
    Hb: (...args) => _emscripten_sample_gamepad_data(...args),
    Gb: (...args) => _emscripten_set_beforeunload_callback_on_thread(...args),
    Fb: (...args) => _emscripten_set_blur_callback_on_thread(...args),
    da: (...args) => _emscripten_set_canvas_element_size(...args),
    Aa: (...args) => _emscripten_set_element_css_size(...args),
    Eb: (...args) => _emscripten_set_focus_callback_on_thread(...args),
    Db: (...args) => _emscripten_set_fullscreenchange_callback_on_thread(...args),
    Cb: (...args) => _emscripten_set_gamepadconnected_callback_on_thread(...args),
    Bb: (...args) => _emscripten_set_gamepaddisconnected_callback_on_thread(...args),
    Ab: (...args) => _emscripten_set_keydown_callback_on_thread(...args),
    zb: (...args) => _emscripten_set_keypress_callback_on_thread(...args),
    yb: (...args) => _emscripten_set_keyup_callback_on_thread(...args),
    Dd: (...args) => _emscripten_set_main_loop(...args),
    xb: (...args) => _emscripten_set_mousedown_callback_on_thread(...args),
    wb: (...args) => _emscripten_set_mouseenter_callback_on_thread(...args),
    vb: (...args) => _emscripten_set_mouseleave_callback_on_thread(...args),
    ub: (...args) => _emscripten_set_mousemove_callback_on_thread(...args),
    tb: (...args) => _emscripten_set_mouseup_callback_on_thread(...args),
    sb: (...args) => _emscripten_set_pointerlockchange_callback_on_thread(...args),
    rb: (...args) => _emscripten_set_resize_callback_on_thread(...args),
    qb: (...args) => _emscripten_set_touchcancel_callback_on_thread(...args),
    pb: (...args) => _emscripten_set_touchend_callback_on_thread(...args),
    ob: (...args) => _emscripten_set_touchmove_callback_on_thread(...args),
    nb: (...args) => _emscripten_set_touchstart_callback_on_thread(...args),
    mb: (...args) => _emscripten_set_visibilitychange_callback_on_thread(...args),
    lb: (...args) => _emscripten_set_wheel_callback_on_thread(...args),
    Cd: (...args) => _emscripten_set_window_title(...args),
    za: (...args) => _emscripten_sleep(...args),
    Bd: (...args) => _emscripten_start_fetch(...args),
    ik: (...args) => _environ_get(...args),
    hk: (...args) => _environ_sizes_get(...args),
    Ad: (...args) => _exit(...args),
    ja: (...args) => _fd_close(...args),
    dc: (...args) => _fd_read(...args),
    gk: (...args) => _fd_seek(...args),
    cc: (...args) => _fd_write(...args),
    zd: (...args) => _glActiveTexture(...args),
    kb: (...args) => _glAttachShader(...args),
    _: (...args) => _glBindBuffer(...args),
    yd: (...args) => _glBindBufferBase(...args),
    Z: (...args) => _glBindFramebuffer(...args),
    jb: (...args) => _glBindRenderbuffer(...args),
    xd: (...args) => _glBindSampler(...args),
    M: (...args) => _glBindTexture(...args),
    wd: (...args) => _glBindVertexArray(...args),
    vd: (...args) => _glBlendEquationSeparate(...args),
    ud: (...args) => _glBlendFuncSeparate(...args),
    Y: (...args) => _glBufferData(...args),
    td: (...args) => _glClear(...args),
    sd: (...args) => _glClearColor(...args),
    rd: (...args) => _glClearDepthf(...args),
    qd: (...args) => _glClearStencil(...args),
    pd: (...args) => _glColorMask(...args),
    od: (...args) => _glCompileShader(...args),
    nd: (...args) => _glCopyTexSubImage2D(...args),
    md: (...args) => _glCreateProgram(...args),
    ld: (...args) => _glCreateShader(...args),
    kd: (...args) => _glCullFace(...args),
    ya: (...args) => _glDeleteBuffers(...args),
    ib: (...args) => _glDeleteFramebuffers(...args),
    jd: (...args) => _glDeleteProgram(...args),
    id: (...args) => _glDeleteRenderbuffers(...args),
    hd: (...args) => _glDeleteSamplers(...args),
    hb: (...args) => _glDeleteShader(...args),
    gd: (...args) => _glDeleteTextures(...args),
    fd: (...args) => _glDeleteVertexArrays(...args),
    ed: (...args) => _glDepthFunc(...args),
    xa: (...args) => _glDepthMask(...args),
    dd: (...args) => _glDepthRangef(...args),
    Q: (...args) => _glDisable(...args),
    cd: (...args) => _glDisableVertexAttribArray(...args),
    bd: (...args) => _glDrawArraysInstanced(...args),
    ad: (...args) => _glDrawBuffers(...args),
    $c: (...args) => _glDrawElementsInstanced(...args),
    P: (...args) => _glEnable(...args),
    _c: (...args) => _glEnableVertexAttribArray(...args),
    Zc: (...args) => _glFramebufferRenderbuffer(...args),
    gb: (...args) => _glFramebufferTexture2D(...args),
    Yc: (...args) => _glFrontFace(...args),
    wa: (...args) => _glGenBuffers(...args),
    fb: (...args) => _glGenFramebuffers(...args),
    Xc: (...args) => _glGenRenderbuffers(...args),
    Wc: (...args) => _glGenSamplers(...args),
    Vc: (...args) => _glGenTextures(...args),
    Uc: (...args) => _glGenVertexArrays(...args),
    Tc: (...args) => _glGenerateMipmap(...args),
    C: (...args) => _glGetIntegerv(...args),
    Sc: (...args) => _glGetProgramInfoLog(...args),
    eb: (...args) => _glGetProgramiv(...args),
    Rc: (...args) => _glGetShaderInfoLog(...args),
    db: (...args) => _glGetShaderiv(...args),
    Qc: (...args) => _glGetStringi(...args),
    Pc: (...args) => _glGetUniformBlockIndex(...args),
    Oc: (...args) => _glGetUniformLocation(...args),
    Nc: (...args) => _glLinkProgram(...args),
    cb: (...args) => _glPixelStorei(...args),
    Mc: (...args) => _glPolygonOffset(...args),
    Lc: (...args) => _glReadPixels(...args),
    Kc: (...args) => _glRenderbufferStorage(...args),
    Jc: (...args) => _glSamplerParameterf(...args),
    pa: (...args) => _glSamplerParameteri(...args),
    bb: (...args) => _glScissor(...args),
    Ic: (...args) => _glShaderSource(...args),
    Hc: (...args) => _glStencilFunc(...args),
    Gc: (...args) => _glStencilMask(...args),
    Fc: (...args) => _glStencilOp(...args),
    Ec: (...args) => _glTexImage2D(...args),
    Dc: (...args) => _glTexParameteri(...args),
    Cc: (...args) => _glTexSubImage2D(...args),
    Bc: (...args) => _glUniform1i(...args),
    Ac: (...args) => _glUniformBlockBinding(...args),
    va: (...args) => _glUseProgram(...args),
    zc: (...args) => _glVertexAttribDivisor(...args),
    yc: (...args) => _glVertexAttribPointer(...args),
    xc: (...args) => _glViewport(...args),
    ab: invoke_diii,
    wc: invoke_f,
    ca: invoke_fff,
    $a: invoke_ffffi,
    ba: invoke_fi,
    F: invoke_fii,
    oa: invoke_fiif,
    na: invoke_fiii,
    _a: invoke_fiiif,
    t: invoke_i,
    Za: invoke_idiiii,
    d: invoke_ii,
    Ya: invoke_iif,
    aa: invoke_iifiiiiiii,
    k: invoke_iii,
    w: invoke_iiifffii,
    A: invoke_iiiffii,
    ua: invoke_iiifi,
    j: invoke_iiii,
    ta: invoke_iiiid,
    Xa: invoke_iiiif,
    Wa: invoke_iiiifi,
    Va: invoke_iiiifii,
    m: invoke_iiiii,
    vc: invoke_iiiiiff,
    X: invoke_iiiiifffffff,
    T: invoke_iiiiifiiii,
    L: invoke_iiiiifiiiii,
    o: invoke_iiiiii,
    r: invoke_iiiiiii,
    K: invoke_iiiiiiii,
    Ua: invoke_iiiiiiiii,
    ma: invoke_iiiiiiiiiiii,
    Ta: invoke_iiiiiiiiiiiii,
    W: invoke_iiji,
    la: invoke_iijiii,
    uc: invoke_iijji,
    Sa: invoke_iijjiii,
    tc: invoke_ijjiiii,
    O: invoke_j,
    Ra: invoke_ji,
    Qa: invoke_jiiii,
    g: invoke_v,
    Pa: invoke_vdii,
    sc: invoke_vf,
    e: invoke_vi,
    N: invoke_vif,
    Oa: invoke_viff,
    rc: invoke_vifffii,
    J: invoke_vifi,
    b: invoke_vii,
    I: invoke_viif,
    qc: invoke_viiff,
    Na: invoke_viifi,
    i: invoke_viii,
    Ma: invoke_viiif,
    pc: invoke_viiiffi,
    sa: invoke_viiifi,
    x: invoke_viiifiiiiifi,
    l: invoke_viiii,
    La: invoke_viiiiffffiiif,
    Ka: invoke_viiiifi,
    oc: invoke_viiiifif,
    p: invoke_viiiii,
    s: invoke_viiiiii,
    E: invoke_viiiiiii,
    S: invoke_viiiiiiii,
    nc: invoke_viiiiiiiii,
    V: invoke_viiiiiiiiii,
    mc: invoke_viiiiiiiiiii,
    ka: invoke_viiiiiiiiiiiiiii,
    lc: invoke_viij,
    Ja: invoke_viijii,
    kc: invoke_vij,
    jc: invoke_viji,
    ic: invoke_vjjii,
    hc: _llvm_eh_typeid_for
};

function invoke_viiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vii(index, a1, a2) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_ii(index, a1) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iii(index, a1, a2) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_v(index) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)()
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vi(index, a1) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_i(index) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)()
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiid(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vif(index, a1, a2) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vifi(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viif(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiifiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vf(index, a1) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_ffffi(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiifii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiifi(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_fff(index, a1, a2) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiif(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiif(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_fi(index, a1) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiifiiiiifi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iif(index, a1, a2) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_j(index) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)()
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        return 0n
    }
}

function invoke_ji(index, a1) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        return 0n
    }
}

function invoke_viifi(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_f(index) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)()
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiff(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiji(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiifiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iifiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiifffffff(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiiff(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiffffiiif(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiifi(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiifi(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiifi(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vifffii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_fiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_fiiif(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_fiif(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiffi(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_fii(index, a1, a2) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vij(index, a1, a2) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viij(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viff(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iijiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iijjiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iijji(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vjjii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_ijjiiii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vdii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_idiiii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiffii(index, a1, a2, a3, a4, a5, a6) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiifffii(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiifif(index, a1, a2, a3, a4, a5, a6, a7) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viji(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viijii(index, a1, a2, a3, a4, a5) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_jiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        return 0n
    }
}

function invoke_diii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    var sp = stackSave();
    try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15) {
    var sp = stackSave();
    try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function callMain(args = []) {
    var entryFunction = _main;
    args.unshift(thisProgram);
    var argc = args.length;
    var argv = stackAlloc((argc + 1) * 4);
    var argv_ptr = argv;
    for (var arg of args) {
        HEAPU32[argv_ptr >> 2] = stringToUTF8OnStack(arg);
        argv_ptr += 4
    }
    HEAPU32[argv_ptr >> 2] = 0;
    try {
        var ret = entryFunction(argc, argv);
        exitJS(ret, true);
        return ret
    } catch (e) {
        return handleException(e)
    }
}

function run(args = arguments_) {
    if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return
    }
    preRun();
    if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return
    }

    function doRun() {
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        Module["onRuntimeInitialized"]?.();
        var noInitialRun = Module["noInitialRun"] || false;
        if (!noInitialRun) callMain(args);
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(() => {
            setTimeout(() => Module["setStatus"](""), 1);
            doRun()
        }, 1)
    } else {
        doRun()
    }
}
