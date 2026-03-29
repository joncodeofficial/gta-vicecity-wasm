"use strict";
var CloudSDK;
(function (CloudSDK) {
    const v8Endpoint = "https://d5dn8hh4ivlobv6682ep.apigw.yandexcloud.net";
    const storageEndpoint = "https://storage.yandexcloud.net/doszone-uploads/personal-v2/cloud";
    const presignPut = v8Endpoint + "/presign-put";
    async function resolveToken(token) {
        if (token && token.length === 5) {
            const response = await fetch("https://cloud.js-dos.com/token/get?id=" + token);
            const data = await response.json();
            if (data.token === token) {
                return data;
            }
        }
        // return {
        //     premium: true,
        //     token: "aaaa2",
        //     email: "test@morgen.oleg"
        // };
        return null;
    }
    CloudSDK.resolveToken = resolveToken;
    async function pushToStorage(token, fileName, payload) {
        const profile = await resolveToken(token);
        if (!profile || !profile.premium) {
            return false;
        }
        const boundSize = compressBound(payload.length);
        const compressed = new Uint8Array(boundSize + 4);
        writeUint32(compressed, payload.length, 0);
        const compressedSize = compress(payload, compressed, 4, compressed.length);
        const upload = compressed.slice(0, compressedSize);
        const presign = await (await fetch(presignPut + "?path=" +
            encodeURIComponent(fileName) + "&token=" + token)).json();
        if (!presign.success) {
            console.error("Failed to generate presign put request", presign);
            return false;
        }
        const post = presign.post;
        const formData = new FormData();
        Object.entries(post.fields).forEach(([k, v]) => {
            formData.append(k, v);
        });
        formData.append("acl", "public-read");
        formData.append("file", new Blob([upload]));
        const response = await fetch(post.url, {
            method: "post",
            body: formData,
        });
        if (response.status !== 200 && response.status !== 204) {
            console.error("Unable to put changes: " + response.statusText);
            return false;
        }
        return true;
    }
    CloudSDK.pushToStorage = pushToStorage;
    async function pullFromStorage(token, fileName) {
        const profile = await resolveToken(token);
        if (profile && profile.email) {
            const response = (await fetch(storageEndpoint + "/" +
                profile.email + "/" + encodeURIComponent(fileName), {
                cache: "no-cache",
            }));
            if (response.status === 200) {
                const compressed = new Uint8Array(await response.arrayBuffer());
                const uncompressedSize = readUint32(compressed, 0);
                const uncompressed = new Uint8Array(uncompressedSize);
                if (uncompress(compressed, uncompressed, 4) === uncompressedSize) {
                    return uncompressed;
                }
            }
        }
        return null;
    }
    CloudSDK.pullFromStorage = pullFromStorage;
    const lz4 = {};
    lz4.uncompress = function (input, output, sIdx, eIdx) {
        sIdx = sIdx || 0;
        eIdx = eIdx || (input.length - sIdx);
        for (var i = sIdx, n = eIdx, j = 0; i < n;) {
            var token = input[i++];
            var literals_length = (token >> 4);
            if (literals_length > 0) {
                var l = literals_length + 240;
                while (l === 255) {
                    l = input[i++];
                    literals_length += l;
                }
                var end = i + literals_length;
                while (i < end)
                    output[j++] = input[i++];
                if (i === n)
                    return j;
            }
            var offset = input[i++] | (input[i++] << 8);
            if (offset === 0)
                return j;
            if (offset > j)
                return -(i - 2);
            var match_length = (token & 0xf);
            var l = match_length + 240;
            while (l === 255) {
                l = input[i++];
                match_length += l;
            }
            var pos = j - offset;
            var end = j + match_length + 4;
            while (j < end)
                output[j++] = output[pos++];
        }
        return j;
    };
    var maxInputSize = 0x7E000000, minMatch = 4, hashLog = 16, hashShift = (minMatch * 8) - hashLog, hashSize = 1 << hashLog, copyLength = 8, lastLiterals = 5, mfLimit = copyLength + minMatch, skipStrength = 6, mlBits = 4, mlMask = (1 << mlBits) - 1, runBits = 8 - mlBits, runMask = (1 << runBits) - 1, hasher = 2654435761;
    assert(hashShift === 16);
    var hashTable = new Int16Array(1 << 16);
    var empty = new Int16Array(hashTable.length);
    lz4.compressBound = function (isize) {
        return isize > maxInputSize
            ? 0
            : (isize + (isize / 255) + 16) | 0;
    };
    lz4.compress = function (src, dst, sIdx, eIdx) {
        hashTable.set(empty);
        return compressBlock(src, dst, 0, sIdx || 0, eIdx || dst.length);
    };
    function compressBlock(src, dst, pos, sIdx, eIdx) {
        var dpos = sIdx;
        var dlen = eIdx - sIdx;
        var anchor = 0;
        if (src.length >= maxInputSize)
            throw new Error("input too large");
        if (src.length > mfLimit) {
            var n = lz4.compressBound(src.length);
            if (dlen < n)
                throw Error("output too small: " + dlen + " < " + n);
            var step = 1, findMatchAttempts = (1 << skipStrength) + 3, srcLength = src.length - mfLimit;
            while (pos + minMatch < srcLength) {
                var sequenceLowBits = src[pos + 1] << 8 | src[pos];
                var sequenceHighBits = src[pos + 3] << 8 | src[pos + 2];
                var hash = Math.imul(sequenceLowBits | (sequenceHighBits << 16), hasher) >>> hashShift;
                var ref = hashTable[hash] - 1;
                hashTable[hash] = pos + 1;
                if (ref < 0 ||
                    ((pos - ref) >>> 16) > 0 ||
                    (((src[ref + 3] << 8 | src[ref + 2]) != sequenceHighBits) ||
                        ((src[ref + 1] << 8 | src[ref]) != sequenceLowBits))) {
                    step = findMatchAttempts++ >> skipStrength;
                    pos += step;
                    continue;
                }
                findMatchAttempts = (1 << skipStrength) + 3;
                var literals_length = pos - anchor;
                var offset = pos - ref;
                pos += minMatch;
                ref += minMatch;
                var match_length = pos;
                while (pos < srcLength && src[pos] == src[ref]) {
                    pos++;
                    ref++;
                }
                match_length = pos - match_length;
                var token = match_length < mlMask ? match_length : mlMask;
                if (literals_length >= runMask) {
                    dst[dpos++] = (runMask << mlBits) + token;
                    for (var len = literals_length - runMask; len > 254; len -= 255) {
                        dst[dpos++] = 255;
                    }
                    dst[dpos++] = len;
                }
                else {
                    dst[dpos++] = (literals_length << mlBits) + token;
                }
                for (var i = 0; i < literals_length; i++) {
                    dst[dpos++] = src[anchor + i];
                }
                dst[dpos++] = offset;
                dst[dpos++] = (offset >> 8);
                if (match_length >= mlMask) {
                    match_length -= mlMask;
                    while (match_length >= 255) {
                        match_length -= 255;
                        dst[dpos++] = 255;
                    }
                    dst[dpos++] = match_length;
                }
                anchor = pos;
            }
        }
        if (anchor == 0)
            return 0;
        literals_length = src.length - anchor;
        if (literals_length >= runMask) {
            dst[dpos++] = (runMask << mlBits);
            for (var ln = literals_length - runMask; ln > 254; ln -= 255) {
                dst[dpos++] = 255;
            }
            dst[dpos++] = ln;
        }
        else {
            dst[dpos++] = (literals_length << mlBits);
        }
        pos = anchor;
        while (pos < src.length) {
            dst[dpos++] = src[pos++];
        }
        return dpos;
    }
    lz4.CHUNK_SIZE = 2048;
    const compressBound = lz4.compressBound;
    const compress = lz4.compress;
    const uncompress = lz4.uncompress;
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    }
    function writeUint32(container, value, offset) {
        container[offset] = value & 0xFF;
        container[offset + 1] = (value & 0x0000FF00) >> 8;
        container[offset + 2] = (value & 0x00FF0000) >> 16;
        container[offset + 3] = (value & 0xFF000000) >> 24;
        return offset + 4;
    }
    function readUint32(container, offset) {
        return (container[offset] & 0x000000FF) |
            ((container[offset + 1] << 8) & 0x0000FF00) |
            ((container[offset + 2] << 16) & 0x00FF0000) |
            ((container[offset + 3] << 24) & 0xFF000000);
    }
})(CloudSDK || (CloudSDK = {}));
var CloudSDKUI;
(function (CloudSDKUI) {
    let v8Key = localStorage.getItem("js.cloud.sdk.v8.key");
    let premium = false;
    let renderedState = null;
    let state = "init";
    const t = {
        enter: "Enter",
        key: "key",
        toenable: "to enable cloud saves",
        cloudsaves: "Cloud saves",
        enabled: "enabled",
        disabled: "disabled, no",
        subscription: "subscription",
        savedincloud: "Saved in cloud",
        savedlocally: "Saved locally",
        saveerror: "Save error",
    };
    function Loading() {
        return {
            html: `
            <div class="cloud-saves-spinner">
                <div class="cloud-saves-spinner-inner"></div>
            </div>
            `,
            bind: () => { },
            unbind: () => { },
        };
    }
    function Init() {
        return {
            html: `
            <div class="cloud-saves-spinner">
                <div class="cloud-saves-spinner-inner"></div>
            </div>
        `,
            bind: () => {
                if (v8Key === null) {
                    state = "nokey";
                }
                else {
                    CloudSDK.resolveToken(v8Key).then((token) => {
                        var _a;
                        premium = (_a = token === null || token === void 0 ? void 0 : token.premium) !== null && _a !== void 0 ? _a : false;
                        state = "key";
                    }).catch(() => {
                        state = "nokey";
                    });
                }
            },
            unbind: () => { },
        };
    }
    function NoKey() {
        function onKeyChange(event) {
            const input = event.target;
            const value = input.value;
            if (value.length === 5) {
                state = "loading";
                CloudSDK.resolveToken(value).then((token) => {
                    var _a;
                    if (token) {
                        v8Key = value;
                        localStorage.setItem("js.cloud.sdk.v8.key", value);
                        if (premium) {
                            location.reload();
                        }
                        else {
                            state = "key";
                        }
                    }
                    else {
                        v8Key = null;
                        localStorage.removeItem("js.cloud.sdk.v8.key");
                        input.value = "";
                        state = "nokey";
                    }
                    premium = (_a = token === null || token === void 0 ? void 0 : token.premium) !== null && _a !== void 0 ? _a : false;
                }).catch(() => {
                    state = "nokey";
                });
            }
        }
        function onPaste(event) {
            setTimeout(() => {
                onKeyChange(event);
            }, 100);
        }
        return {
            html: `
            <div class="cloud-saves-no-key">
                <span>${t.enter} <a href="https://v8.js-dos.com/key" target="_blank">js-dos ${t.key}</a> ${t.toenable}</span>
                <input class="keyboard-input key-input" type="text" maxlength="5" minlength="5" placeholder="${t.key}" />
            </div>`,
            bind: (root) => {
                const input = root.querySelector(".key-input");
                input.value = "";
                input.addEventListener("input", onKeyChange);
                input.addEventListener("paste", onPaste);
            },
            unbind: (root) => {
                const input = root.querySelector(".key-input");
                input.removeEventListener("input", onKeyChange);
                input.removeEventListener("paste", onPaste);
            },
        };
    }
    function Key() {
        function reset() {
            v8Key = null;
            localStorage.removeItem("js.cloud.sdk.v8.key");
            state = "nokey";
        }
        ;
        const subscriptionLink = !premium ? `<a href="https://v8.js-dos.com/key" class="cloud-saves-disabled" target="_blank">${t.subscription}</a>` : "";
        return {
            html: `
            <div class="cloud-saves-key">
                <span>${t.cloudsaves}: </span><span class="${premium ? "cloud-saves-enabled" : "cloud-saves-disabled"}">${premium ? t.enabled : t.disabled}</span>
                ${subscriptionLink}
                <button class="cloud-saves-clear">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </button>
            </div>
            `,
            bind: (root) => {
                var _a;
                (_a = root.querySelector(".cloud-saves-clear")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", reset);
            },
            unbind: (root) => {
                var _a;
                (_a = root.querySelector(".cloud-saves-clear")) === null || _a === void 0 ? void 0 : _a.removeEventListener("click", reset);
            },
        };
    }
    function Hidden() {
        return {
            html: "",
            bind: (root) => { root.style.display = "none"; },
            unbind: (root) => { root.style.display = "flex"; },
        };
    }
    function SavedInCloud() {
        return {
            html: `
            <div class="cloud-saves-saved-in-cloud">
                ${t.savedincloud}
            </div>
            `,
            bind: () => {
                setTimeout(() => {
                    state = "hidden";
                }, 3000);
            },
            unbind: () => { },
        };
    }
    function SavedLocally() {
        return {
            html: `
            <div class="cloud-saves-saved-locally">
                ${t.savedlocally}
            </div>
            `,
            bind: () => {
                setTimeout(() => {
                    state = "hidden";
                }, 3000);
            },
            unbind: () => { },
        };
    }
    function SaveError() {
        return {
            html: `
            <div class="cloud-saves-save-error">
                ${t.saveerror}
            </div>
            `,
            bind: () => {
                setTimeout(() => {
                    state = "hidden";
                }, 3000);
            },
            unbind: () => { },
        };
    }
    function render() {
        if (renderedState === state) {
            return null;
        }
        renderedState = state;
        switch (state) {
            case "loading":
                return Loading();
            case "init":
                return Init();
            case "nokey":
                return NoKey();
            case "key":
                return Key();
            case "hidden":
                return Hidden();
            case "saved-in-cloud":
                return SavedInCloud();
            case "saved-locally":
                return SavedLocally();
            case "save-error":
                return SaveError();
        }
    }
    async function pushToStorage(fileName, payload) {
        state = "loading";
        try {
            const saved = await (async () => {
                if (!v8Key || !premium) {
                    return false;
                }
                return CloudSDK.pushToStorage(v8Key, fileName, payload);
            })();
            state = saved ? "saved-in-cloud" : "saved-locally";
            return saved;
        }
        catch (e) {
            console.error(e);
            state = "save-error";
            return false;
        }
    }
    CloudSDKUI.pushToStorage = pushToStorage;
    async function pullFromStorage(fileName) {
        if (!v8Key || !premium) {
            throw new Error("Not logged in or not premium");
        }
        return CloudSDK.pullFromStorage(v8Key, fileName);
    }
    CloudSDKUI.pullFromStorage = pullFromStorage;
    function mount() {
        return new Promise((resolve) => {
            const style = document.createElement('style');
            style.textContent = cssStyles;
            document.head.appendChild(style);
            const root = document.createElement('div');
            root.id = 'cloud-saves';
            document.body.appendChild(root);
            let { html, bind, unbind } = render();
            root.innerHTML = html;
            bind(root);
            let resolved = false;
            setInterval(() => {
                const tuple = render();
                if (tuple) {
                    unbind(root);
                    html = tuple.html;
                    bind = tuple.bind;
                    unbind = tuple.unbind;
                    root.innerHTML = html;
                    bind(root);
                    if (!resolved) {
                        resolved = true;
                        resolve(() => {
                            state = "hidden";
                        });
                    }
                }
            }, 150);
        });
    }
    CloudSDKUI.mount = mount;
    const cssStyles = `
        #cloud-saves {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
    
            z-index: 9999;
            background-color: rgba(69, 69, 78, 0.5);
            padding: 8px 16px;
            border-radius: 5px;
            color: white;
            font-family: sans-serif;
            font-size: 14px;
            backdrop-filter: blur(4px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            
            text-align: center;
        }

        #cloud-saves a {
            text-decoration: underline;
            color: #ffeb3b;
        }

        .cloud-saves-enabled {
            color: #39ff14;
            font-weight: bold;
        }

        .cloud-saves-disabled {
            color: #ff3939;
        }

        a.cloud-saves-disabled {
            margin-left: -4px;
            color: #ff3939 !important;
        }

        .cloud-saves-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid white;
            border-top: 2px solid transparent;
            border-radius: 50%;
        }

        .cloud-saves-spinner-inner {
            width: 100%;
            height: 100%;
            border: 2px solid transparent;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .cloud-saves-spinner {
            animation: spin 1s linear infinite;
        }

        .cloud-saves-no-key {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .key-input {
            width: 50px;
            height: 20px;
            background-color: #1a1a1a;
            color: #ffffff;
            border: none; 
            border-radius: 4px;
            padding: 4px;
            text-align: center;
        }

        .cloud-saves-key {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .cloud-saves-clear {
            background-color: transparent;
            border: none;
            padding: 0;
            color: white;
            cursor: pointer;
            width: 20px;
            height: 20px;
        }

        .cloud-saves-saved-in-cloud {
            color: #39ff14;
            font-weight: bold;
        }

        .cloud-saves-saved-locally {
            color: #ffeb3b;
            font-weight: bold;
        }

        .cloud-saves-save-error {
            color: #ff3939;
            font-weight: bold;
        }
    `;
})(CloudSDKUI || (CloudSDKUI = {}));
(function (global) {
    global.CloudSDK = CloudSDK;
    global.CloudSDKUI = CloudSDKUI;
})(typeof window !== "undefined" ? window : this);
