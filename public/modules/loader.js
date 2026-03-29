(() => {
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != "undefined" && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != "undefined" && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    var isNode = globalThis.process && globalThis.process.versions && globalThis.process.versions.node && globalThis.process.type != "renderer";
    async function loadPackage(metadata) {
        var PACKAGE_PATH = "";
        if (typeof window === "object") {
            PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/")
        } else if (typeof process === "undefined" && typeof location !== "undefined") {
            PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf("/")) + "/")
        }
        var PACKAGE_NAME = "/home/caiiiycuk/vc/vc-sky/index.data";
        var REMOTE_PACKAGE_BASE = "index.data";
        var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
        var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];
        async function fetchRemotePackage(packageName, packageSize) {
            if (isNode) {
                var contents = require("fs").readFileSync(packageName);
                return new Uint8Array(contents).buffer
            }
            if (!Module["dataFileDownloads"]) Module["dataFileDownloads"] = {};
            try {
                var response = await fetch(packageName)
            } catch (e) {
                throw new Error(`Network Error: ${packageName}`, {
                    e
                })
            }
            if (!response.ok) {
                throw new Error(`${response.status}: ${response.url}`)
            }
            const chunks = [];
            const headers = response.headers;
            const total = Number(headers.get("Content-Length") || packageSize);
            let loaded = 0;
            Module["setStatus"] && Module["setStatus"]("Downloading data...");
            const reader = response.body.getReader();
            while (1) {
                var {
                    done,
                    value
                } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                Module["dataFileDownloads"][packageName] = {
                    loaded,
                    total
                };
                let totalLoaded = 0;
                let totalSize = 0;
                for (const download of Object.values(Module["dataFileDownloads"])) {
                    totalLoaded += download.loaded;
                    totalSize += download.total
                }
                Module["setStatus"] && Module["setStatus"](`Downloading data... (${totalLoaded}/${totalSize})`)
            }
            const packageData = new Uint8Array(chunks.map(c => c.length).reduce((a, b) => a + b, 0));
            let offset = 0;
            for (const chunk of chunks) {
                packageData.set(chunk, offset);
                offset += chunk.length
            }
            return packageData.buffer
        }
        var fetchPromise;
        var fetched = Module["getPreloadedPackage"] && Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
        if (!fetched) {
            fetchPromise = fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE)
        }
        async function runWithFS(Module) {
            function assert(check, msg) {
                if (!check) throw new Error(msg)
            }
            Module["FS_createPath"]("/", "vc-assets", true, true);
            Module["FS_createPath"]("/vc-assets", "local", true, true);
            Module["FS_createPath"]("/vc-assets/local", "anim", true, true);
            Module["FS_createPath"]("/vc-assets/local/anim", "cuts.img", true, true);
            Module["FS_createPath"]("/vc-assets/local", "audio", true, true);
            Module["FS_createPath"]("/vc-assets/local", "data", true, true);
            Module["FS_createPath"]("/vc-assets/local/data", "maps", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "airport", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "airportn", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "bank", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "bar", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "bridge", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "cisland", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "club", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "concerth", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "docks", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "downtown", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "downtows", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "golf", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "haiti", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "haitin", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "hotel", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "islandsf", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "lawyers", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "littleha", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "mall", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "mansion", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "nbeach", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "nbeachbt", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "nbeachw", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "oceandn", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "oceandrv", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "stadint", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "starisl", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "stripclb", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "washintn", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "washints", true, true);
            Module["FS_createPath"]("/vc-assets/local/data/maps", "yacht", true, true);
            Module["FS_createPath"]("/vc-assets/local/data", "paths", true, true);
            Module["FS_createPath"]("/vc-assets/local", "fonts", true, true);
            Module["FS_createPath"]("/vc-assets/local", "models", true, true);
            Module["FS_createPath"]("/vc-assets/local/models", "coll", true, true);
            Module["FS_createPath"]("/vc-assets/local/models", "generic", true, true);
            Module["FS_createPath"]("/vc-assets/local/models", "gta3.img", true, true);
            Module["FS_createPath"]("/vc-assets/local", "mp3", true, true);
            Module["FS_createPath"]("/vc-assets/local", "mss", true, true);
            Module["FS_createPath"]("/vc-assets/local", "skins", true, true);
            Module["FS_createPath"]("/vc-assets/local", "text", true, true);
            Module["FS_createPath"]("/vc-assets/local", "txd", true, true);
            for (var file of metadata["files"]) {
                var name = file["filename"];
                Module["addRunDependency"](`fp ${name}`)
            }
            async function processPackageData(arrayBuffer) {
                assert(arrayBuffer, "Loading data file failed.");
                assert(arrayBuffer.constructor.name === ArrayBuffer.name, "bad input to processPackageData " + arrayBuffer.constructor.name);
                var byteArray = new Uint8Array(arrayBuffer);
                for (var file of metadata["files"]) {
                    var name = file["filename"];
                    var data = byteArray.subarray(file["start"], file["end"]);
                    Module["FS_createDataFile"](name, null, data, true, true, true);
                    Module["removeRunDependency"](`fp ${name}`)
                }
                Module["removeRunDependency"]("datafile_/home/caiiiycuk/vc/vc-sky/index.data")
            }
            Module["addRunDependency"]("datafile_/home/caiiiycuk/vc/vc-sky/index.data");
            if (!Module["preloadResults"]) Module["preloadResults"] = {};
            Module["preloadResults"][PACKAGE_NAME] = {
                fromCache: false
            };
            if (!fetched) {
                fetched = await fetchPromise
            }
            processPackageData(fetched)
        }
        if (Module["calledRun"]) {
            runWithFS(Module)
        } else {
            if (!Module["preRun"]) Module["preRun"] = [];
            Module["preRun"].push(runWithFS)
        }
    }
    loadPackage(DATA_PACKAGE)
})();
