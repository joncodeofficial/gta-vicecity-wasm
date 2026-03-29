var AL = {
    QUEUE_INTERVAL: 25,
    QUEUE_LOOKAHEAD: .1,
    DEVICE_NAME: "Emscripten OpenAL",
    CAPTURE_DEVICE_NAME: "Emscripten OpenAL capture",
    ALC_EXTENSIONS: {
        ALC_SOFT_pause_device: true,
        ALC_SOFT_HRTF: true
    },
    AL_EXTENSIONS: {
        AL_EXT_float32: true,
        AL_SOFT_loop_points: true,
        AL_SOFT_source_length: true,
        AL_EXT_source_distance_model: true,
        AL_SOFT_source_spatialize: true
    },
    _alcErr: 0,
    alcErr: 0,
    deviceRefCounts: {},
    alcStringCache: {},
    paused: false,
    stringCache: {},
    contexts: {},
    currentCtx: null,
    buffers: {
        0: {
            id: 0,
            refCount: 0,
            audioBuf: null,
            frequency: 0,
            bytesPerSample: 2,
            channels: 1,
            length: 0
        }
    },
    paramArray: [],
    _nextId: 1,
    newId: () => AL.freeIds.length > 0 ? AL.freeIds.pop() : AL._nextId++,
    freeIds: [],
    scheduleContextAudio: ctx => {
        if (MainLoop.timingMode === 1 && document["visibilityState"] != "visible") {
            return
        }
        for (var i in ctx.sources) {
            AL.scheduleSourceAudio(ctx.sources[i])
        }
    },
    scheduleSourceAudio: (src, lookahead) => {
        if (MainLoop.timingMode === 1 && document["visibilityState"] != "visible") {
            return
        }
        if (src.state !== 4114) {
            return
        }
        var currentTime = AL.updateSourceTime(src);
        var startTime = src.bufStartTime;
        var startOffset = src.bufOffset;
        var bufCursor = src.bufsProcessed;
        for (var i = 0; i < src.audioQueue.length; i++) {
            var audioSrc = src.audioQueue[i];
            startTime = audioSrc._startTime + audioSrc._duration;
            startOffset = 0;
            bufCursor += audioSrc._skipCount + 1
        }
        if (!lookahead) {
            lookahead = AL.QUEUE_LOOKAHEAD
        }
        var lookaheadTime = currentTime + lookahead;
        var skipCount = 0;
        while (startTime < lookaheadTime) {
            if (bufCursor >= src.bufQueue.length) {
                if (src.looping) {
                    bufCursor %= src.bufQueue.length
                } else {
                    break
                }
            }
            var buf = src.bufQueue[bufCursor % src.bufQueue.length];
            if (buf.length === 0) {
                skipCount++;
                if (skipCount === src.bufQueue.length) {
                    break
                }
            } else {
                var audioSrc = src.context.audioCtx.createBufferSource();
                audioSrc.buffer = buf.audioBuf;
                audioSrc.playbackRate.value = src.playbackRate;
                if (buf.audioBuf._loopStart || buf.audioBuf._loopEnd) {
                    audioSrc.loopStart = buf.audioBuf._loopStart;
                    audioSrc.loopEnd = buf.audioBuf._loopEnd
                }
                var duration = 0;
                if (src.type === 4136 && src.looping) {
                    duration = Number.POSITIVE_INFINITY;
                    audioSrc.loop = true;
                    if (buf.audioBuf._loopStart) {
                        audioSrc.loopStart = buf.audioBuf._loopStart
                    }
                    if (buf.audioBuf._loopEnd) {
                        audioSrc.loopEnd = buf.audioBuf._loopEnd
                    }
                } else {
                    duration = (buf.audioBuf.duration - startOffset) / src.playbackRate
                }
                audioSrc._startOffset = startOffset;
                audioSrc._duration = duration;
                audioSrc._skipCount = skipCount;
                skipCount = 0;
                audioSrc.connect(src.gain);
                if (typeof audioSrc.start != "undefined") {
                    startTime = Math.max(startTime, src.context.audioCtx.currentTime);
                    audioSrc.start(startTime, startOffset)
                } else if (typeof audioSrc.noteOn != "undefined") {
                    startTime = Math.max(startTime, src.context.audioCtx.currentTime);
                    audioSrc.noteOn(startTime)
                }
                audioSrc._startTime = startTime;
                src.audioQueue.push(audioSrc);
                startTime += duration
            }
            startOffset = 0;
            bufCursor++
        }
    },
    updateSourceTime: src => {
        var currentTime = src.context.audioCtx.currentTime;
        if (src.state !== 4114) {
            return currentTime
        }
        if (!isFinite(src.bufStartTime)) {
            src.bufStartTime = currentTime - src.bufOffset / src.playbackRate;
            src.bufOffset = 0
        }
        var nextStartTime = 0;
        while (src.audioQueue.length) {
            var audioSrc = src.audioQueue[0];
            src.bufsProcessed += audioSrc._skipCount;
            nextStartTime = audioSrc._startTime + audioSrc._duration;
            if (currentTime < nextStartTime) {
                break
            }
            src.audioQueue.shift();
            src.bufStartTime = nextStartTime;
            src.bufOffset = 0;
            src.bufsProcessed++
        }
        if (src.bufsProcessed >= src.bufQueue.length && !src.looping) {
            AL.setSourceState(src, 4116)
        } else if (src.type === 4136 && src.looping) {
            var buf = src.bufQueue[0];
            if (buf.length === 0) {
                src.bufOffset = 0
            } else {
                var delta = (currentTime - src.bufStartTime) * src.playbackRate;
                var loopStart = buf.audioBuf._loopStart || 0;
                var loopEnd = buf.audioBuf._loopEnd || buf.audioBuf.duration;
                if (loopEnd <= loopStart) {
                    loopEnd = buf.audioBuf.duration
                }
                if (delta < loopEnd) {
                    src.bufOffset = delta
                } else {
                    src.bufOffset = loopStart + (delta - loopStart) % (loopEnd - loopStart)
                }
            }
        } else if (src.audioQueue[0]) {
            src.bufOffset = (currentTime - src.audioQueue[0]._startTime) * src.playbackRate
        } else {
            if (src.type !== 4136 && src.looping) {
                var srcDuration = AL.sourceDuration(src) / src.playbackRate;
                if (srcDuration > 0) {
                    src.bufStartTime += Math.floor((currentTime - src.bufStartTime) / srcDuration) * srcDuration
                }
            }
            for (var i = 0; i < src.bufQueue.length; i++) {
                if (src.bufsProcessed >= src.bufQueue.length) {
                    if (src.looping) {
                        src.bufsProcessed %= src.bufQueue.length
                    } else {
                        AL.setSourceState(src, 4116);
                        break
                    }
                }
                var buf = src.bufQueue[src.bufsProcessed];
                if (buf.length > 0) {
                    nextStartTime = src.bufStartTime + buf.audioBuf.duration / src.playbackRate;
                    if (currentTime < nextStartTime) {
                        src.bufOffset = (currentTime - src.bufStartTime) * src.playbackRate;
                        break
                    }
                    src.bufStartTime = nextStartTime
                }
                src.bufOffset = 0;
                src.bufsProcessed++
            }
        }
        return currentTime
    },
    cancelPendingSourceAudio: src => {
        AL.updateSourceTime(src);
        for (var i = 1; i < src.audioQueue.length; i++) {
            var audioSrc = src.audioQueue[i];
            audioSrc.stop()
        }
        if (src.audioQueue.length > 1) {
            src.audioQueue.length = 1
        }
    },
    stopSourceAudio: src => {
        for (var i = 0; i < src.audioQueue.length; i++) {
            src.audioQueue[i].stop()
        }
        src.audioQueue.length = 0
    },
    setSourceState: (src, state) => {
        if (state === 4114) {
            if (src.state === 4114 || src.state == 4116) {
                src.bufsProcessed = 0;
                src.bufOffset = 0
            } else {}
            AL.stopSourceAudio(src);
            src.state = 4114;
            src.bufStartTime = Number.NEGATIVE_INFINITY;
            AL.scheduleSourceAudio(src)
        } else if (state === 4115) {
            if (src.state === 4114) {
                AL.updateSourceTime(src);
                AL.stopSourceAudio(src);
                src.state = 4115
            }
        } else if (state === 4116) {
            if (src.state !== 4113) {
                src.state = 4116;
                src.bufsProcessed = src.bufQueue.length;
                src.bufStartTime = Number.NEGATIVE_INFINITY;
                src.bufOffset = 0;
                AL.stopSourceAudio(src)
            }
        } else if (state === 4113) {
            if (src.state !== 4113) {
                src.state = 4113;
                src.bufsProcessed = 0;
                src.bufStartTime = Number.NEGATIVE_INFINITY;
                src.bufOffset = 0;
                AL.stopSourceAudio(src)
            }
        }
    },
    initSourcePanner: src => {
        if (src.type === 4144) {
            return
        }
        var templateBuf = AL.buffers[0];
        for (var i = 0; i < src.bufQueue.length; i++) {
            if (src.bufQueue[i].id !== 0) {
                templateBuf = src.bufQueue[i];
                break
            }
        }
        if (src.spatialize === 1 || src.spatialize === 2 && templateBuf.channels === 1) {
            if (src.panner) {
                return
            }
            src.panner = src.context.audioCtx.createPanner();
            AL.updateSourceGlobal(src);
            AL.updateSourceSpace(src);
            src.panner.connect(src.context.gain);
            src.gain.disconnect();
            src.gain.connect(src.panner)
        } else {
            if (!src.panner) {
                return
            }
            src.panner.disconnect();
            src.gain.disconnect();
            src.gain.connect(src.context.gain);
            src.panner = null
        }
    },
    updateContextGlobal: ctx => {
        for (var i in ctx.sources) {
            AL.updateSourceGlobal(ctx.sources[i])
        }
    },
    updateSourceGlobal: src => {
        var panner = src.panner;
        if (!panner) {
            return
        }
        panner.refDistance = src.refDistance;
        panner.maxDistance = src.maxDistance;
        panner.rolloffFactor = src.rolloffFactor;
        panner.panningModel = src.context.hrtf ? "HRTF" : "equalpower";
        var distanceModel = src.context.sourceDistanceModel ? src.distanceModel : src.context.distanceModel;
        switch (distanceModel) {
            case 0:
                panner.distanceModel = "inverse";
                panner.refDistance = 340282e33;
                break;
            case 53249:
            case 53250:
                panner.distanceModel = "inverse";
                break;
            case 53251:
            case 53252:
                panner.distanceModel = "linear";
                break;
            case 53253:
            case 53254:
                panner.distanceModel = "exponential";
                break
        }
    },
    updateListenerSpace: ctx => {
        var listener = ctx.audioCtx.listener;
        if (listener.positionX) {
            listener.positionX.value = ctx.listener.position[0];
            listener.positionY.value = ctx.listener.position[1];
            listener.positionZ.value = ctx.listener.position[2]
        } else {
            listener.setPosition(ctx.listener.position[0], ctx.listener.position[1], ctx.listener.position[2])
        }
        if (listener.forwardX) {
            listener.forwardX.value = ctx.listener.direction[0];
            listener.forwardY.value = ctx.listener.direction[1];
            listener.forwardZ.value = ctx.listener.direction[2];
            listener.upX.value = ctx.listener.up[0];
            listener.upY.value = ctx.listener.up[1];
            listener.upZ.value = ctx.listener.up[2]
        } else {
            listener.setOrientation(ctx.listener.direction[0], ctx.listener.direction[1], ctx.listener.direction[2], ctx.listener.up[0], ctx.listener.up[1], ctx.listener.up[2])
        }
        for (var i in ctx.sources) {
            AL.updateSourceSpace(ctx.sources[i])
        }
    },
    updateSourceSpace: src => {
        if (!src.panner) {
            return
        }
        var panner = src.panner;
        var posX = src.position[0];
        var posY = src.position[1];
        var posZ = src.position[2];
        var dirX = src.direction[0];
        var dirY = src.direction[1];
        var dirZ = src.direction[2];
        var listener = src.context.listener;
        var lPosX = listener.position[0];
        var lPosY = listener.position[1];
        var lPosZ = listener.position[2];
        if (src.relative) {
            var lBackX = -listener.direction[0];
            var lBackY = -listener.direction[1];
            var lBackZ = -listener.direction[2];
            var lUpX = listener.up[0];
            var lUpY = listener.up[1];
            var lUpZ = listener.up[2];
            var inverseMagnitude = (x, y, z) => {
                var length = Math.sqrt(x * x + y * y + z * z);
                if (length < Number.EPSILON) {
                    return 0
                }
                return 1 / length
            };
            var invMag = inverseMagnitude(lBackX, lBackY, lBackZ);
            lBackX *= invMag;
            lBackY *= invMag;
            lBackZ *= invMag;
            invMag = inverseMagnitude(lUpX, lUpY, lUpZ);
            lUpX *= invMag;
            lUpY *= invMag;
            lUpZ *= invMag;
            var lRightX = lUpY * lBackZ - lUpZ * lBackY;
            var lRightY = lUpZ * lBackX - lUpX * lBackZ;
            var lRightZ = lUpX * lBackY - lUpY * lBackX;
            invMag = inverseMagnitude(lRightX, lRightY, lRightZ);
            lRightX *= invMag;
            lRightY *= invMag;
            lRightZ *= invMag;
            lUpX = lBackY * lRightZ - lBackZ * lRightY;
            lUpY = lBackZ * lRightX - lBackX * lRightZ;
            lUpZ = lBackX * lRightY - lBackY * lRightX;
            var oldX = dirX;
            var oldY = dirY;
            var oldZ = dirZ;
            dirX = oldX * lRightX + oldY * lUpX + oldZ * lBackX;
            dirY = oldX * lRightY + oldY * lUpY + oldZ * lBackY;
            dirZ = oldX * lRightZ + oldY * lUpZ + oldZ * lBackZ;
            oldX = posX;
            oldY = posY;
            oldZ = posZ;
            posX = oldX * lRightX + oldY * lUpX + oldZ * lBackX;
            posY = oldX * lRightY + oldY * lUpY + oldZ * lBackY;
            posZ = oldX * lRightZ + oldY * lUpZ + oldZ * lBackZ;
            posX += lPosX;
            posY += lPosY;
            posZ += lPosZ
        }
        if (panner.positionX) {
            if (posX != panner.positionX.value) panner.positionX.value = posX;
            if (posY != panner.positionY.value) panner.positionY.value = posY;
            if (posZ != panner.positionZ.value) panner.positionZ.value = posZ
        } else {
            panner.setPosition(posX, posY, posZ)
        }
        if (panner.orientationX) {
            if (dirX != panner.orientationX.value) panner.orientationX.value = dirX;
            if (dirY != panner.orientationY.value) panner.orientationY.value = dirY;
            if (dirZ != panner.orientationZ.value) panner.orientationZ.value = dirZ
        } else {
            panner.setOrientation(dirX, dirY, dirZ)
        }
        var oldShift = src.dopplerShift;
        var velX = src.velocity[0];
        var velY = src.velocity[1];
        var velZ = src.velocity[2];
        var lVelX = listener.velocity[0];
        var lVelY = listener.velocity[1];
        var lVelZ = listener.velocity[2];
        if (posX === lPosX && posY === lPosY && posZ === lPosZ || velX === lVelX && velY === lVelY && velZ === lVelZ) {
            src.dopplerShift = 1
        } else {
            var speedOfSound = src.context.speedOfSound;
            var dopplerFactor = src.context.dopplerFactor;
            var slX = lPosX - posX;
            var slY = lPosY - posY;
            var slZ = lPosZ - posZ;
            var magSl = Math.sqrt(slX * slX + slY * slY + slZ * slZ);
            var vls = (slX * lVelX + slY * lVelY + slZ * lVelZ) / magSl;
            var vss = (slX * velX + slY * velY + slZ * velZ) / magSl;
            vls = Math.min(vls, speedOfSound / dopplerFactor);
            vss = Math.min(vss, speedOfSound / dopplerFactor);
            src.dopplerShift = (speedOfSound - dopplerFactor * vls) / (speedOfSound - dopplerFactor * vss)
        }
        if (src.dopplerShift !== oldShift) {
            AL.updateSourceRate(src)
        }
    },
    updateSourceRate: src => {
        if (src.state === 4114) {
            AL.cancelPendingSourceAudio(src);
            var audioSrc = src.audioQueue[0];
            if (!audioSrc) {
                return
            }
            var duration;
            if (src.type === 4136 && src.looping) {
                duration = Number.POSITIVE_INFINITY
            } else {
                duration = (audioSrc.buffer.duration - audioSrc._startOffset) / src.playbackRate
            }
            audioSrc._duration = duration;
            audioSrc.playbackRate.value = src.playbackRate;
            AL.scheduleSourceAudio(src)
        }
    },
    sourceDuration: src => {
        var length = 0;
        for (var i = 0; i < src.bufQueue.length; i++) {
            var audioBuf = src.bufQueue[i].audioBuf;
            length += audioBuf ? audioBuf.duration : 0
        }
        return length
    },
    sourceTell: src => {
        AL.updateSourceTime(src);
        var offset = 0;
        for (var i = 0; i < src.bufsProcessed; i++) {
            if (src.bufQueue[i].audioBuf) {
                offset += src.bufQueue[i].audioBuf.duration
            }
        }
        offset += src.bufOffset;
        return offset
    },
    sourceSeek: (src, offset) => {
        var playing = src.state == 4114;
        if (playing) {
            AL.setSourceState(src, 4113)
        }
        if (src.bufQueue[src.bufsProcessed].audioBuf !== null) {
            src.bufsProcessed = 0;
            while (offset > src.bufQueue[src.bufsProcessed].audioBuf.duration) {
                offset -= src.bufQueue[src.bufsProcessed].audioBuf.duration;
                src.bufsProcessed++
            }
            src.bufOffset = offset
        }
        if (playing) {
            AL.setSourceState(src, 4114)
        }
    },
    getGlobalParam: (funcname, param) => {
        if (!AL.currentCtx) {
            return null
        }
        switch (param) {
            case 49152:
                return AL.currentCtx.dopplerFactor;
            case 49155:
                return AL.currentCtx.speedOfSound;
            case 53248:
                return AL.currentCtx.distanceModel;
            default:
                AL.currentCtx.err = 40962;
                return null
        }
    },
    setGlobalParam: (funcname, param, value) => {
        if (!AL.currentCtx) {
            return
        }
        switch (param) {
            case 49152:
                if (!Number.isFinite(value) || value < 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                AL.currentCtx.dopplerFactor = value;
                AL.updateListenerSpace(AL.currentCtx);
                break;
            case 49155:
                if (!Number.isFinite(value) || value <= 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                AL.currentCtx.speedOfSound = value;
                AL.updateListenerSpace(AL.currentCtx);
                break;
            case 53248:
                switch (value) {
                    case 0:
                    case 53249:
                    case 53250:
                    case 53251:
                    case 53252:
                    case 53253:
                    case 53254:
                        AL.currentCtx.distanceModel = value;
                        AL.updateContextGlobal(AL.currentCtx);
                        break;
                    default:
                        AL.currentCtx.err = 40963;
                        return
                }
                break;
            default:
                AL.currentCtx.err = 40962;
                return
        }
    },
    getListenerParam: (funcname, param) => {
        if (!AL.currentCtx) {
            return null
        }
        switch (param) {
            case 4100:
                return AL.currentCtx.listener.position;
            case 4102:
                return AL.currentCtx.listener.velocity;
            case 4111:
                return AL.currentCtx.listener.direction.concat(AL.currentCtx.listener.up);
            case 4106:
                return AL.currentCtx.gain.gain.value;
            default:
                AL.currentCtx.err = 40962;
                return null
        }
    },
    setListenerParam: (funcname, param, value) => {
        if (!AL.currentCtx) {
            return
        }
        if (value === null) {
            AL.currentCtx.err = 40962;
            return
        }
        var listener = AL.currentCtx.listener;
        switch (param) {
            case 4100:
                if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2])) {
                    AL.currentCtx.err = 40963;
                    return
                }
                listener.position[0] = value[0];
                listener.position[1] = value[1];
                listener.position[2] = value[2];
                AL.updateListenerSpace(AL.currentCtx);
                break;
            case 4102:
                if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2])) {
                    AL.currentCtx.err = 40963;
                    return
                }
                listener.velocity[0] = value[0];
                listener.velocity[1] = value[1];
                listener.velocity[2] = value[2];
                AL.updateListenerSpace(AL.currentCtx);
                break;
            case 4106:
                if (!Number.isFinite(value) || value < 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                AL.currentCtx.gain.gain.value = value;
                break;
            case 4111:
                if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2]) || !Number.isFinite(value[3]) || !Number.isFinite(value[4]) || !Number.isFinite(value[5])) {
                    AL.currentCtx.err = 40963;
                    return
                }
                listener.direction[0] = value[0];
                listener.direction[1] = value[1];
                listener.direction[2] = value[2];
                listener.up[0] = value[3];
                listener.up[1] = value[4];
                listener.up[2] = value[5];
                AL.updateListenerSpace(AL.currentCtx);
                break;
            default:
                AL.currentCtx.err = 40962;
                return
        }
    },
    getBufferParam: (funcname, bufferId, param) => {
        if (!AL.currentCtx) {
            return
        }
        var buf = AL.buffers[bufferId];
        if (!buf || bufferId === 0) {
            AL.currentCtx.err = 40961;
            return
        }
        switch (param) {
            case 8193:
                return buf.frequency;
            case 8194:
                return buf.bytesPerSample * 8;
            case 8195:
                return buf.channels;
            case 8196:
                return buf.length * buf.bytesPerSample * buf.channels;
            case 8213:
                if (buf.length === 0) {
                    return [0, 0]
                }
                return [(buf.audioBuf._loopStart || 0) * buf.frequency, (buf.audioBuf._loopEnd || buf.length) * buf.frequency];
            default:
                AL.currentCtx.err = 40962;
                return null
        }
    },
    setBufferParam: (funcname, bufferId, param, value) => {
        if (!AL.currentCtx) {
            return
        }
        var buf = AL.buffers[bufferId];
        if (!buf || bufferId === 0) {
            AL.currentCtx.err = 40961;
            return
        }
        if (value === null) {
            AL.currentCtx.err = 40962;
            return
        }
        switch (param) {
            case 8196:
                if (value !== 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                break;
            case 8213:
                if (value[0] < 0 || value[0] > buf.length || value[1] < 0 || value[1] > buf.Length || value[0] >= value[1]) {
                    AL.currentCtx.err = 40963;
                    return
                }
                if (buf.refCount > 0) {
                    AL.currentCtx.err = 40964;
                    return
                }
                if (buf.audioBuf) {
                    buf.audioBuf._loopStart = value[0] / buf.frequency;
                    buf.audioBuf._loopEnd = value[1] / buf.frequency
                }
                break;
            default:
                AL.currentCtx.err = 40962;
                return
        }
    },
    getSourceParam: (funcname, sourceId, param) => {
        if (!AL.currentCtx) {
            return null
        }
        var src = AL.currentCtx.sources[sourceId];
        if (!src) {
            AL.currentCtx.err = 40961;
            return null
        }
        switch (param) {
            case 514:
                return src.relative;
            case 4097:
                return src.coneInnerAngle;
            case 4098:
                return src.coneOuterAngle;
            case 4099:
                return src.pitch;
            case 4100:
                return src.position;
            case 4101:
                return src.direction;
            case 4102:
                return src.velocity;
            case 4103:
                return src.looping;
            case 4105:
                if (src.type === 4136) {
                    return src.bufQueue[0].id
                }
                return 0;
            case 4106:
                return src.gain.gain.value;
            case 4109:
                return src.minGain;
            case 4110:
                return src.maxGain;
            case 4112:
                return src.state;
            case 4117:
                if (src.bufQueue.length === 1 && src.bufQueue[0].id === 0) {
                    return 0
                }
                return src.bufQueue.length;
            case 4118:
                if (src.bufQueue.length === 1 && src.bufQueue[0].id === 0 || src.looping) {
                    return 0
                }
                return src.bufsProcessed;
            case 4128:
                return src.refDistance;
            case 4129:
                return src.rolloffFactor;
            case 4130:
                return src.coneOuterGain;
            case 4131:
                return src.maxDistance;
            case 4132:
                return AL.sourceTell(src);
            case 4133:
                var offset = AL.sourceTell(src);
                if (offset > 0) {
                    offset *= src.bufQueue[0].frequency
                }
                return offset;
            case 4134:
                var offset = AL.sourceTell(src);
                if (offset > 0) {
                    offset *= src.bufQueue[0].frequency * src.bufQueue[0].bytesPerSample
                }
                return offset;
            case 4135:
                return src.type;
            case 4628:
                return src.spatialize;
            case 8201:
                var length = 0;
                var bytesPerFrame = 0;
                for (var i = 0; i < src.bufQueue.length; i++) {
                    length += src.bufQueue[i].length;
                    if (src.bufQueue[i].id !== 0) {
                        bytesPerFrame = src.bufQueue[i].bytesPerSample * src.bufQueue[i].channels
                    }
                }
                return length * bytesPerFrame;
            case 8202:
                var length = 0;
                for (var i = 0; i < src.bufQueue.length; i++) {
                    length += src.bufQueue[i].length
                }
                return length;
            case 8203:
                return AL.sourceDuration(src);
            case 53248:
                return src.distanceModel;
            default:
                AL.currentCtx.err = 40962;
                return null
        }
    },
    setSourceParam: (funcname, sourceId, param, value) => {
        if (!AL.currentCtx) {
            return
        }
        var src = AL.currentCtx.sources[sourceId];
        if (!src) {
            AL.currentCtx.err = 40961;
            return
        }
        if (value === null) {
            AL.currentCtx.err = 40962;
            return
        }
        switch (param) {
            case 514:
                if (value === 1) {
                    src.relative = true;
                    AL.updateSourceSpace(src)
                } else if (value === 0) {
                    src.relative = false;
                    AL.updateSourceSpace(src)
                } else {
                    AL.currentCtx.err = 40963;
                    return
                }
                break;
            case 4097:
                if (!Number.isFinite(value)) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.coneInnerAngle = value;
                if (src.panner) {
                    src.panner.coneInnerAngle = value % 360
                }
                break;
            case 4098:
                if (!Number.isFinite(value)) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.coneOuterAngle = value;
                if (src.panner) {
                    src.panner.coneOuterAngle = value % 360
                }
                break;
            case 4099:
                if (!Number.isFinite(value) || value <= 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                if (src.pitch === value) {
                    break
                }
                src.pitch = value;
                AL.updateSourceRate(src);
                break;
            case 4100:
                if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2])) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.position[0] = value[0];
                src.position[1] = value[1];
                src.position[2] = value[2];
                AL.updateSourceSpace(src);
                break;
            case 4101:
                if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2])) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.direction[0] = value[0];
                src.direction[1] = value[1];
                src.direction[2] = value[2];
                AL.updateSourceSpace(src);
                break;
            case 4102:
                if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2])) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.velocity[0] = value[0];
                src.velocity[1] = value[1];
                src.velocity[2] = value[2];
                AL.updateSourceSpace(src);
                break;
            case 4103:
                if (value === 1) {
                    src.looping = true;
                    AL.updateSourceTime(src);
                    if (src.type === 4136 && src.audioQueue.length > 0) {
                        var audioSrc = src.audioQueue[0];
                        audioSrc.loop = true;
                        audioSrc._duration = Number.POSITIVE_INFINITY
                    }
                } else if (value === 0) {
                    src.looping = false;
                    var currentTime = AL.updateSourceTime(src);
                    if (src.type === 4136 && src.audioQueue.length > 0) {
                        var audioSrc = src.audioQueue[0];
                        audioSrc.loop = false;
                        audioSrc._duration = src.bufQueue[0].audioBuf.duration / src.playbackRate;
                        audioSrc._startTime = currentTime - src.bufOffset / src.playbackRate
                    }
                } else {
                    AL.currentCtx.err = 40963;
                    return
                }
                break;
            case 4105:
                if (src.state === 4114 || src.state === 4115) {
                    AL.currentCtx.err = 40964;
                    return
                }
                if (value === 0) {
                    for (var i in src.bufQueue) {
                        src.bufQueue[i].refCount--
                    }
                    src.bufQueue.length = 1;
                    src.bufQueue[0] = AL.buffers[0];
                    src.bufsProcessed = 0;
                    src.type = 4144
                } else {
                    var buf = AL.buffers[value];
                    if (!buf) {
                        AL.currentCtx.err = 40963;
                        return
                    }
                    for (var i in src.bufQueue) {
                        src.bufQueue[i].refCount--
                    }
                    src.bufQueue.length = 0;
                    buf.refCount++;
                    src.bufQueue = [buf];
                    src.bufsProcessed = 0;
                    src.type = 4136
                }
                AL.initSourcePanner(src);
                AL.scheduleSourceAudio(src);
                break;
            case 4106:
                if (!Number.isFinite(value) || value < 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.gain.gain.value = value;
                break;
            case 4109:
                if (!Number.isFinite(value) || value < 0 || value > Math.min(src.maxGain, 1)) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.minGain = value;
                break;
            case 4110:
                if (!Number.isFinite(value) || value < Math.max(0, src.minGain) || value > 1) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.maxGain = value;
                break;
            case 4128:
                if (!Number.isFinite(value) || value < 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.refDistance = value;
                if (src.panner) {
                    src.panner.refDistance = value
                }
                break;
            case 4129:
                if (!Number.isFinite(value) || value < 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.rolloffFactor = value;
                if (src.panner) {
                    src.panner.rolloffFactor = value
                }
                break;
            case 4130:
                if (!Number.isFinite(value) || value < 0 || value > 1) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.coneOuterGain = value;
                if (src.panner) {
                    src.panner.coneOuterGain = value
                }
                break;
            case 4131:
                if (!Number.isFinite(value) || value < 0) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.maxDistance = value;
                if (src.panner) {
                    src.panner.maxDistance = value
                }
                break;
            case 4132:
                if (value < 0 || value > AL.sourceDuration(src)) {
                    AL.currentCtx.err = 40963;
                    return
                }
                AL.sourceSeek(src, value);
                break;
            case 4133:
                var srcLen = AL.sourceDuration(src);
                if (srcLen > 0) {
                    var frequency;
                    for (var bufId in src.bufQueue) {
                        if (bufId) {
                            frequency = src.bufQueue[bufId].frequency;
                            break
                        }
                    }
                    value /= frequency
                }
                if (value < 0 || value > srcLen) {
                    AL.currentCtx.err = 40963;
                    return
                }
                AL.sourceSeek(src, value);
                break;
            case 4134:
                var srcLen = AL.sourceDuration(src);
                if (srcLen > 0) {
                    var bytesPerSec;
                    for (var bufId in src.bufQueue) {
                        if (bufId) {
                            var buf = src.bufQueue[bufId];
                            bytesPerSec = buf.frequency * buf.bytesPerSample * buf.channels;
                            break
                        }
                    }
                    value /= bytesPerSec
                }
                if (value < 0 || value > srcLen) {
                    AL.currentCtx.err = 40963;
                    return
                }
                AL.sourceSeek(src, value);
                break;
            case 4628:
                if (value !== 0 && value !== 1 && value !== 2) {
                    AL.currentCtx.err = 40963;
                    return
                }
                src.spatialize = value;
                AL.initSourcePanner(src);
                break;
            case 8201:
            case 8202:
            case 8203:
                AL.currentCtx.err = 40964;
                break;
            case 53248:
                switch (value) {
                    case 0:
                    case 53249:
                    case 53250:
                    case 53251:
                    case 53252:
                    case 53253:
                    case 53254:
                        src.distanceModel = value;
                        if (AL.currentCtx.sourceDistanceModel) {
                            AL.updateContextGlobal(AL.currentCtx)
                        }
                        break;
                    default:
                        AL.currentCtx.err = 40963;
                        return
                }
                break;
            default:
                AL.currentCtx.err = 40962;
                return
        }
    },
    captures: {},
    sharedCaptureAudioCtx: null,
    requireValidCaptureDevice: (deviceId, funcname) => {
        if (deviceId === 0) {
            AL.alcErr = 40961;
            return null
        }
        var c = AL.captures[deviceId];
        if (!c) {
            AL.alcErr = 40961;
            return null
        }
        var err = c.mediaStreamError;
        if (err) {
            AL.alcErr = 40961;
            return null
        }
        return c
    }
};
var _alBuffer3f = (bufferId, param, value0, value1, value2) => {
    AL.setBufferParam("alBuffer3f", bufferId, param, null)
};
var _alBuffer3i = (bufferId, param, value0, value1, value2) => {
    AL.setBufferParam("alBuffer3i", bufferId, param, null)
};
var _alBufferData = (bufferId, format, pData, size, freq) => {
    if (!AL.currentCtx) {
        return
    }
    var buf = AL.buffers[bufferId];
    if (!buf) {
        AL.currentCtx.err = 40963;
        return
    }
    if (freq <= 0) {
        AL.currentCtx.err = 40963;
        return
    }
    var audioBuf = null;
    try {
        switch (format) {
            case 4352:
                if (size > 0) {
                    audioBuf = AL.currentCtx.audioCtx.createBuffer(1, size, freq);
                    var channel0 = audioBuf.getChannelData(0);
                    for (var i = 0; i < size; ++i) {
                        channel0[i] = HEAPU8[pData++] * .0078125 - 1
                    }
                }
                buf.bytesPerSample = 1;
                buf.channels = 1;
                buf.length = size;
                break;
            case 4353:
                if (size > 0) {
                    audioBuf = AL.currentCtx.audioCtx.createBuffer(1, size >> 1, freq);
                    var channel0 = audioBuf.getChannelData(0);
                    pData >>= 1;
                    for (var i = 0; i < size >> 1; ++i) {
                        channel0[i] = HEAP16[pData++] * 30517578125e-15
                    }
                }
                buf.bytesPerSample = 2;
                buf.channels = 1;
                buf.length = size >> 1;
                break;
            case 4354:
                if (size > 0) {
                    audioBuf = AL.currentCtx.audioCtx.createBuffer(2, size >> 1, freq);
                    var channel0 = audioBuf.getChannelData(0);
                    var channel1 = audioBuf.getChannelData(1);
                    for (var i = 0; i < size >> 1; ++i) {
                        channel0[i] = HEAPU8[pData++] * .0078125 - 1;
                        channel1[i] = HEAPU8[pData++] * .0078125 - 1
                    }
                }
                buf.bytesPerSample = 1;
                buf.channels = 2;
                buf.length = size >> 1;
                break;
            case 4355:
                if (size > 0) {
                    audioBuf = AL.currentCtx.audioCtx.createBuffer(2, size >> 2, freq);
                    var channel0 = audioBuf.getChannelData(0);
                    var channel1 = audioBuf.getChannelData(1);
                    pData >>= 1;
                    for (var i = 0; i < size >> 2; ++i) {
                        channel0[i] = HEAP16[pData++] * 30517578125e-15;
                        channel1[i] = HEAP16[pData++] * 30517578125e-15
                    }
                }
                buf.bytesPerSample = 2;
                buf.channels = 2;
                buf.length = size >> 2;
                break;
            case 65552:
                if (size > 0) {
                    audioBuf = AL.currentCtx.audioCtx.createBuffer(1, size >> 2, freq);
                    var channel0 = audioBuf.getChannelData(0);
                    pData >>= 2;
                    for (var i = 0; i < size >> 2; ++i) {
                        channel0[i] = HEAPF32[pData++]
                    }
                }
                buf.bytesPerSample = 4;
                buf.channels = 1;
                buf.length = size >> 2;
                break;
            case 65553:
                if (size > 0) {
                    audioBuf = AL.currentCtx.audioCtx.createBuffer(2, size >> 3, freq);
                    var channel0 = audioBuf.getChannelData(0);
                    var channel1 = audioBuf.getChannelData(1);
                    pData >>= 2;
                    for (var i = 0; i < size >> 3; ++i) {
                        channel0[i] = HEAPF32[pData++];
                        channel1[i] = HEAPF32[pData++]
                    }
                }
                buf.bytesPerSample = 4;
                buf.channels = 2;
                buf.length = size >> 3;
                break;
            default:
                AL.currentCtx.err = 40963;
                return
        }
        buf.frequency = freq;
        buf.audioBuf = audioBuf
    } catch (e) {
        AL.currentCtx.err = 40963;
        return
    }
};
var _alBufferf = (bufferId, param, value) => {
    AL.setBufferParam("alBufferf", bufferId, param, null)
};
var _alBufferfv = (bufferId, param, pValues) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    AL.setBufferParam("alBufferfv", bufferId, param, null)
};
var _alBufferi = (bufferId, param, value) => {
    AL.setBufferParam("alBufferi", bufferId, param, null)
};
var _alBufferiv = (bufferId, param, pValues) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 8213:
            AL.paramArray[0] = HEAP32[pValues >> 2];
            AL.paramArray[1] = HEAP32[pValues + 4 >> 2];
            AL.setBufferParam("alBufferiv", bufferId, param, AL.paramArray);
            break;
        default:
            AL.setBufferParam("alBufferiv", bufferId, param, null);
            break
    }
};
var _alDeleteBuffers = (count, pBufferIds) => {
    if (!AL.currentCtx) {
        return
    }
    for (var i = 0; i < count; ++i) {
        var bufId = HEAP32[pBufferIds + i * 4 >> 2];
        if (bufId === 0) {
            continue
        }
        if (!AL.buffers[bufId]) {
            AL.currentCtx.err = 40961;
            return
        }
        if (AL.buffers[bufId].refCount) {
            AL.currentCtx.err = 40964;
            return
        }
    }
    for (var i = 0; i < count; ++i) {
        var bufId = HEAP32[pBufferIds + i * 4 >> 2];
        if (bufId === 0) {
            continue
        }
        AL.deviceRefCounts[AL.buffers[bufId].deviceId]--;
        delete AL.buffers[bufId];
        AL.freeIds.push(bufId)
    }
};
var _alSourcei = (sourceId, param, value) => {
    switch (param) {
        case 514:
        case 4097:
        case 4098:
        case 4103:
        case 4105:
        case 4128:
        case 4129:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 4628:
        case 8201:
        case 8202:
        case 53248:
            AL.setSourceParam("alSourcei", sourceId, param, value);
            break;
        default:
            AL.setSourceParam("alSourcei", sourceId, param, null);
            break
    }
};
var _alDeleteSources = (count, pSourceIds) => {
    if (!AL.currentCtx) {
        return
    }
    for (var i = 0; i < count; ++i) {
        var srcId = HEAP32[pSourceIds + i * 4 >> 2];
        if (!AL.currentCtx.sources[srcId]) {
            AL.currentCtx.err = 40961;
            return
        }
    }
    for (var i = 0; i < count; ++i) {
        var srcId = HEAP32[pSourceIds + i * 4 >> 2];
        AL.setSourceState(AL.currentCtx.sources[srcId], 4116);
        _alSourcei(srcId, 4105, 0);
        delete AL.currentCtx.sources[srcId];
        AL.freeIds.push(srcId)
    }
};
var _alDisable = param => {
    if (!AL.currentCtx) {
        return
    }
    switch (param) {
        case 512:
            AL.currentCtx.sourceDistanceModel = false;
            AL.updateContextGlobal(AL.currentCtx);
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alDistanceModel = model => {
    AL.setGlobalParam("alDistanceModel", 53248, model)
};
var _alDopplerFactor = value => {
    AL.setGlobalParam("alDopplerFactor", 49152, value)
};
var _alDopplerVelocity = value => {
    warnOnce("alDopplerVelocity() is deprecated, and only kept for compatibility with OpenAL 1.0. Use alSpeedOfSound() instead.");
    if (!AL.currentCtx) {
        return
    }
    if (value <= 0) {
        AL.currentCtx.err = 40963;
        return
    }
};
var _alEnable = param => {
    if (!AL.currentCtx) {
        return
    }
    switch (param) {
        case 512:
            AL.currentCtx.sourceDistanceModel = true;
            AL.updateContextGlobal(AL.currentCtx);
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGenBuffers = (count, pBufferIds) => {
    if (!AL.currentCtx) {
        return
    }
    for (var i = 0; i < count; ++i) {
        var buf = {
            deviceId: AL.currentCtx.deviceId,
            id: AL.newId(),
            refCount: 0,
            audioBuf: null,
            frequency: 0,
            bytesPerSample: 2,
            channels: 1,
            length: 0
        };
        AL.deviceRefCounts[buf.deviceId]++;
        AL.buffers[buf.id] = buf;
        HEAP32[pBufferIds + i * 4 >> 2] = buf.id
    }
};
var _alGenSources = (count, pSourceIds) => {
    if (!AL.currentCtx) {
        return
    }
    for (var i = 0; i < count; ++i) {
        var gain = AL.currentCtx.audioCtx.createGain();
        gain.connect(AL.currentCtx.gain);
        var src = {
            context: AL.currentCtx,
            id: AL.newId(),
            type: 4144,
            state: 4113,
            bufQueue: [AL.buffers[0]],
            audioQueue: [],
            looping: false,
            pitch: 1,
            dopplerShift: 1,
            gain,
            minGain: 0,
            maxGain: 1,
            panner: null,
            bufsProcessed: 0,
            bufStartTime: Number.NEGATIVE_INFINITY,
            bufOffset: 0,
            relative: false,
            refDistance: 1,
            maxDistance: 340282e33,
            rolloffFactor: 1,
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            direction: [0, 0, 0],
            coneOuterGain: 0,
            coneInnerAngle: 360,
            coneOuterAngle: 360,
            distanceModel: 53250,
            spatialize: 2,
            get playbackRate() {
                return this.pitch * this.dopplerShift
            }
        };
        AL.currentCtx.sources[src.id] = src;
        HEAP32[pSourceIds + i * 4 >> 2] = src.id
    }
};
var _alGetBoolean = param => {
    var val = AL.getGlobalParam("alGetBoolean", param);
    if (val === null) {
        return 0
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            return val !== 0 ? 1 : 0;
        default:
            AL.currentCtx.err = 40962;
            return 0
    }
};
var _alGetBooleanv = (param, pValues) => {
    var val = AL.getGlobalParam("alGetBooleanv", param);
    if (val === null || !pValues) {
        return
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            HEAP8[pValues] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetBuffer3f = (bufferId, param, pValue0, pValue1, pValue2) => {
    var val = AL.getBufferParam("alGetBuffer3f", bufferId, param);
    if (val === null) {
        return
    }
    if (!pValue0 || !pValue1 || !pValue2) {
        AL.currentCtx.err = 40963;
        return
    }
    AL.currentCtx.err = 40962
};
var _alGetBuffer3i = (bufferId, param, pValue0, pValue1, pValue2) => {
    var val = AL.getBufferParam("alGetBuffer3i", bufferId, param);
    if (val === null) {
        return
    }
    if (!pValue0 || !pValue1 || !pValue2) {
        AL.currentCtx.err = 40963;
        return
    }
    AL.currentCtx.err = 40962
};
var _alGetBufferf = (bufferId, param, pValue) => {
    var val = AL.getBufferParam("alGetBufferf", bufferId, param);
    if (val === null) {
        return
    }
    if (!pValue) {
        AL.currentCtx.err = 40963;
        return
    }
    AL.currentCtx.err = 40962
};
var _alGetBufferfv = (bufferId, param, pValues) => {
    var val = AL.getBufferParam("alGetBufferfv", bufferId, param);
    if (val === null) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    AL.currentCtx.err = 40962
};
var _alGetBufferi = (bufferId, param, pValue) => {
    var val = AL.getBufferParam("alGetBufferi", bufferId, param);
    if (val === null) {
        return
    }
    if (!pValue) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 8193:
        case 8194:
        case 8195:
        case 8196:
            HEAP32[pValue >> 2] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetBufferiv = (bufferId, param, pValues) => {
    var val = AL.getBufferParam("alGetBufferiv", bufferId, param);
    if (val === null) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 8193:
        case 8194:
        case 8195:
        case 8196:
            HEAP32[pValues >> 2] = val;
            break;
        case 8213:
            HEAP32[pValues >> 2] = val[0];
            HEAP32[pValues + 4 >> 2] = val[1];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetDouble = param => {
    var val = AL.getGlobalParam("alGetDouble", param);
    if (val === null) {
        return 0
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            return val;
        default:
            AL.currentCtx.err = 40962;
            return 0
    }
};
var _alGetDoublev = (param, pValues) => {
    var val = AL.getGlobalParam("alGetDoublev", param);
    if (val === null || !pValues) {
        return
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            HEAPF64[pValues >> 3] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetEnumValue = pEnumName => {
    if (!AL.currentCtx) {
        return 0
    }
    if (!pEnumName) {
        AL.currentCtx.err = 40963;
        return 0
    }
    var name = UTF8ToString(pEnumName);
    switch (name) {
        case "AL_BITS":
            return 8194;
        case "AL_BUFFER":
            return 4105;
        case "AL_BUFFERS_PROCESSED":
            return 4118;
        case "AL_BUFFERS_QUEUED":
            return 4117;
        case "AL_BYTE_OFFSET":
            return 4134;
        case "AL_CHANNELS":
            return 8195;
        case "AL_CONE_INNER_ANGLE":
            return 4097;
        case "AL_CONE_OUTER_ANGLE":
            return 4098;
        case "AL_CONE_OUTER_GAIN":
            return 4130;
        case "AL_DIRECTION":
            return 4101;
        case "AL_DISTANCE_MODEL":
            return 53248;
        case "AL_DOPPLER_FACTOR":
            return 49152;
        case "AL_DOPPLER_VELOCITY":
            return 49153;
        case "AL_EXPONENT_DISTANCE":
            return 53253;
        case "AL_EXPONENT_DISTANCE_CLAMPED":
            return 53254;
        case "AL_EXTENSIONS":
            return 45060;
        case "AL_FORMAT_MONO16":
            return 4353;
        case "AL_FORMAT_MONO8":
            return 4352;
        case "AL_FORMAT_STEREO16":
            return 4355;
        case "AL_FORMAT_STEREO8":
            return 4354;
        case "AL_FREQUENCY":
            return 8193;
        case "AL_GAIN":
            return 4106;
        case "AL_INITIAL":
            return 4113;
        case "AL_INVALID":
            return -1;
        case "AL_ILLEGAL_ENUM":
        case "AL_INVALID_ENUM":
            return 40962;
        case "AL_INVALID_NAME":
            return 40961;
        case "AL_ILLEGAL_COMMAND":
        case "AL_INVALID_OPERATION":
            return 40964;
        case "AL_INVALID_VALUE":
            return 40963;
        case "AL_INVERSE_DISTANCE":
            return 53249;
        case "AL_INVERSE_DISTANCE_CLAMPED":
            return 53250;
        case "AL_LINEAR_DISTANCE":
            return 53251;
        case "AL_LINEAR_DISTANCE_CLAMPED":
            return 53252;
        case "AL_LOOPING":
            return 4103;
        case "AL_MAX_DISTANCE":
            return 4131;
        case "AL_MAX_GAIN":
            return 4110;
        case "AL_MIN_GAIN":
            return 4109;
        case "AL_NONE":
            return 0;
        case "AL_NO_ERROR":
            return 0;
        case "AL_ORIENTATION":
            return 4111;
        case "AL_OUT_OF_MEMORY":
            return 40965;
        case "AL_PAUSED":
            return 4115;
        case "AL_PENDING":
            return 8209;
        case "AL_PITCH":
            return 4099;
        case "AL_PLAYING":
            return 4114;
        case "AL_POSITION":
            return 4100;
        case "AL_PROCESSED":
            return 8210;
        case "AL_REFERENCE_DISTANCE":
            return 4128;
        case "AL_RENDERER":
            return 45059;
        case "AL_ROLLOFF_FACTOR":
            return 4129;
        case "AL_SAMPLE_OFFSET":
            return 4133;
        case "AL_SEC_OFFSET":
            return 4132;
        case "AL_SIZE":
            return 8196;
        case "AL_SOURCE_RELATIVE":
            return 514;
        case "AL_SOURCE_STATE":
            return 4112;
        case "AL_SOURCE_TYPE":
            return 4135;
        case "AL_SPEED_OF_SOUND":
            return 49155;
        case "AL_STATIC":
            return 4136;
        case "AL_STOPPED":
            return 4116;
        case "AL_STREAMING":
            return 4137;
        case "AL_UNDETERMINED":
            return 4144;
        case "AL_UNUSED":
            return 8208;
        case "AL_VELOCITY":
            return 4102;
        case "AL_VENDOR":
            return 45057;
        case "AL_VERSION":
            return 45058;
        case "AL_AUTO_SOFT":
            return 2;
        case "AL_SOURCE_DISTANCE_MODEL":
            return 512;
        case "AL_SOURCE_SPATIALIZE_SOFT":
            return 4628;
        case "AL_LOOP_POINTS_SOFT":
            return 8213;
        case "AL_BYTE_LENGTH_SOFT":
            return 8201;
        case "AL_SAMPLE_LENGTH_SOFT":
            return 8202;
        case "AL_SEC_LENGTH_SOFT":
            return 8203;
        case "AL_FORMAT_MONO_FLOAT32":
            return 65552;
        case "AL_FORMAT_STEREO_FLOAT32":
            return 65553;
        default:
            AL.currentCtx.err = 40963;
            return 0
    }
};
var _alGetError = () => {
    if (!AL.currentCtx) {
        return 40964
    }
    var err = AL.currentCtx.err;
    AL.currentCtx.err = 0;
    return err
};
var _alGetFloat = param => {
    var val = AL.getGlobalParam("alGetFloat", param);
    if (val === null) {
        return 0
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            return val;
        default:
            return 0
    }
};
var _alGetFloatv = (param, pValues) => {
    var val = AL.getGlobalParam("alGetFloatv", param);
    if (val === null || !pValues) {
        return
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            HEAPF32[pValues >> 2] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetInteger = param => {
    var val = AL.getGlobalParam("alGetInteger", param);
    if (val === null) {
        return 0
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            return val;
        default:
            AL.currentCtx.err = 40962;
            return 0
    }
};
var _alGetIntegerv = (param, pValues) => {
    var val = AL.getGlobalParam("alGetIntegerv", param);
    if (val === null || !pValues) {
        return
    }
    switch (param) {
        case 49152:
        case 49155:
        case 53248:
            HEAP32[pValues >> 2] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetListener3f = (param, pValue0, pValue1, pValue2) => {
    var val = AL.getListenerParam("alGetListener3f", param);
    if (val === null) {
        return
    }
    if (!pValue0 || !pValue1 || !pValue2) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4102:
            HEAPF32[pValue0 >> 2] = val[0];
            HEAPF32[pValue1 >> 2] = val[1];
            HEAPF32[pValue2 >> 2] = val[2];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetListener3i = (param, pValue0, pValue1, pValue2) => {
    var val = AL.getListenerParam("alGetListener3i", param);
    if (val === null) {
        return
    }
    if (!pValue0 || !pValue1 || !pValue2) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4102:
            HEAP32[pValue0 >> 2] = val[0];
            HEAP32[pValue1 >> 2] = val[1];
            HEAP32[pValue2 >> 2] = val[2];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetListenerf = (param, pValue) => {
    var val = AL.getListenerParam("alGetListenerf", param);
    if (val === null) {
        return
    }
    if (!pValue) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4106:
            HEAPF32[pValue >> 2] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetListenerfv = (param, pValues) => {
    var val = AL.getListenerParam("alGetListenerfv", param);
    if (val === null) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4102:
            HEAPF32[pValues >> 2] = val[0];
            HEAPF32[pValues + 4 >> 2] = val[1];
            HEAPF32[pValues + 8 >> 2] = val[2];
            break;
        case 4111:
            HEAPF32[pValues >> 2] = val[0];
            HEAPF32[pValues + 4 >> 2] = val[1];
            HEAPF32[pValues + 8 >> 2] = val[2];
            HEAPF32[pValues + 12 >> 2] = val[3];
            HEAPF32[pValues + 16 >> 2] = val[4];
            HEAPF32[pValues + 20 >> 2] = val[5];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetListeneri = (param, pValue) => {
    var val = AL.getListenerParam("alGetListeneri", param);
    if (val === null) {
        return
    }
    if (!pValue) {
        AL.currentCtx.err = 40963;
        return
    }
    AL.currentCtx.err = 40962
};
var _alGetListeneriv = (param, pValues) => {
    var val = AL.getListenerParam("alGetListeneriv", param);
    if (val === null) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4102:
            HEAP32[pValues >> 2] = val[0];
            HEAP32[pValues + 4 >> 2] = val[1];
            HEAP32[pValues + 8 >> 2] = val[2];
            break;
        case 4111:
            HEAP32[pValues >> 2] = val[0];
            HEAP32[pValues + 4 >> 2] = val[1];
            HEAP32[pValues + 8 >> 2] = val[2];
            HEAP32[pValues + 12 >> 2] = val[3];
            HEAP32[pValues + 16 >> 2] = val[4];
            HEAP32[pValues + 20 >> 2] = val[5];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetSource3f = (sourceId, param, pValue0, pValue1, pValue2) => {
    var val = AL.getSourceParam("alGetSource3f", sourceId, param);
    if (val === null) {
        return
    }
    if (!pValue0 || !pValue1 || !pValue2) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4101:
        case 4102:
            HEAPF32[pValue0 >> 2] = val[0];
            HEAPF32[pValue1 >> 2] = val[1];
            HEAPF32[pValue2 >> 2] = val[2];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetSource3i = (sourceId, param, pValue0, pValue1, pValue2) => {
    var val = AL.getSourceParam("alGetSource3i", sourceId, param);
    if (val === null) {
        return
    }
    if (!pValue0 || !pValue1 || !pValue2) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4101:
        case 4102:
            HEAP32[pValue0 >> 2] = val[0];
            HEAP32[pValue1 >> 2] = val[1];
            HEAP32[pValue2 >> 2] = val[2];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetSourcef = (sourceId, param, pValue) => {
    var val = AL.getSourceParam("alGetSourcef", sourceId, param);
    if (val === null) {
        return
    }
    if (!pValue) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4097:
        case 4098:
        case 4099:
        case 4106:
        case 4109:
        case 4110:
        case 4128:
        case 4129:
        case 4130:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 8203:
            HEAPF32[pValue >> 2] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetSourcefv = (sourceId, param, pValues) => {
    var val = AL.getSourceParam("alGetSourcefv", sourceId, param);
    if (val === null) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4097:
        case 4098:
        case 4099:
        case 4106:
        case 4109:
        case 4110:
        case 4128:
        case 4129:
        case 4130:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 8203:
            HEAPF32[pValues >> 2] = val[0];
            break;
        case 4100:
        case 4101:
        case 4102:
            HEAPF32[pValues >> 2] = val[0];
            HEAPF32[pValues + 4 >> 2] = val[1];
            HEAPF32[pValues + 8 >> 2] = val[2];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetSourcei = (sourceId, param, pValue) => {
    var val = AL.getSourceParam("alGetSourcei", sourceId, param);
    if (val === null) {
        return
    }
    if (!pValue) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 514:
        case 4097:
        case 4098:
        case 4103:
        case 4105:
        case 4112:
        case 4117:
        case 4118:
        case 4128:
        case 4129:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 4135:
        case 4628:
        case 8201:
        case 8202:
        case 53248:
            HEAP32[pValue >> 2] = val;
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var _alGetSourceiv = (sourceId, param, pValues) => {
    var val = AL.getSourceParam("alGetSourceiv", sourceId, param);
    if (val === null) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 514:
        case 4097:
        case 4098:
        case 4103:
        case 4105:
        case 4112:
        case 4117:
        case 4118:
        case 4128:
        case 4129:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 4135:
        case 4628:
        case 8201:
        case 8202:
        case 53248:
            HEAP32[pValues >> 2] = val;
            break;
        case 4100:
        case 4101:
        case 4102:
            HEAP32[pValues >> 2] = val[0];
            HEAP32[pValues + 4 >> 2] = val[1];
            HEAP32[pValues + 8 >> 2] = val[2];
            break;
        default:
            AL.currentCtx.err = 40962;
            return
    }
};
var stringToNewUTF8 = str => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = _malloc(size);
    if (ret) stringToUTF8(str, ret, size);
    return ret
};
var _alGetString = param => {
    if (AL.stringCache[param]) {
        return AL.stringCache[param]
    }
    var ret;
    switch (param) {
        case 0:
            ret = "No Error";
            break;
        case 40961:
            ret = "Invalid Name";
            break;
        case 40962:
            ret = "Invalid Enum";
            break;
        case 40963:
            ret = "Invalid Value";
            break;
        case 40964:
            ret = "Invalid Operation";
            break;
        case 40965:
            ret = "Out of Memory";
            break;
        case 45057:
            ret = "Emscripten";
            break;
        case 45058:
            ret = "1.1";
            break;
        case 45059:
            ret = "WebAudio";
            break;
        case 45060:
            ret = Object.keys(AL.AL_EXTENSIONS).join(" ");
            break;
        default:
            if (AL.currentCtx) {
                AL.currentCtx.err = 40962
            } else {}
            return 0
    }
    ret = stringToNewUTF8(ret);
    AL.stringCache[param] = ret;
    return ret
};
var _alIsBuffer = bufferId => {
    if (!AL.currentCtx) {
        return false
    }
    if (bufferId > AL.buffers.length) {
        return false
    }
    if (!AL.buffers[bufferId]) {
        return false
    }
    return true
};
var _alIsEnabled = param => {
    if (!AL.currentCtx) {
        return 0
    }
    switch (param) {
        case 512:
            return AL.currentCtx.sourceDistanceModel ? 0 : 1;
        default:
            AL.currentCtx.err = 40962;
            return 0
    }
};
var _alIsExtensionPresent = pExtName => {
    var name = UTF8ToString(pExtName);
    return AL.AL_EXTENSIONS[name] ? 1 : 0
};
var _alIsSource = sourceId => {
    if (!AL.currentCtx) {
        return false
    }
    if (!AL.currentCtx.sources[sourceId]) {
        return false
    }
    return true
};
var _alListener3f = (param, value0, value1, value2) => {
    switch (param) {
        case 4100:
        case 4102:
            AL.paramArray[0] = value0;
            AL.paramArray[1] = value1;
            AL.paramArray[2] = value2;
            AL.setListenerParam("alListener3f", param, AL.paramArray);
            break;
        default:
            AL.setListenerParam("alListener3f", param, null);
            break
    }
};
var _alListener3i = (param, value0, value1, value2) => {
    switch (param) {
        case 4100:
        case 4102:
            AL.paramArray[0] = value0;
            AL.paramArray[1] = value1;
            AL.paramArray[2] = value2;
            AL.setListenerParam("alListener3i", param, AL.paramArray);
            break;
        default:
            AL.setListenerParam("alListener3i", param, null);
            break
    }
};
var _alListenerf = (param, value) => {
    switch (param) {
        case 4106:
            AL.setListenerParam("alListenerf", param, value);
            break;
        default:
            AL.setListenerParam("alListenerf", param, null);
            break
    }
};
var _alListenerfv = (param, pValues) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4102:
            AL.paramArray[0] = HEAPF32[pValues >> 2];
            AL.paramArray[1] = HEAPF32[pValues + 4 >> 2];
            AL.paramArray[2] = HEAPF32[pValues + 8 >> 2];
            AL.setListenerParam("alListenerfv", param, AL.paramArray);
            break;
        case 4111:
            AL.paramArray[0] = HEAPF32[pValues >> 2];
            AL.paramArray[1] = HEAPF32[pValues + 4 >> 2];
            AL.paramArray[2] = HEAPF32[pValues + 8 >> 2];
            AL.paramArray[3] = HEAPF32[pValues + 12 >> 2];
            AL.paramArray[4] = HEAPF32[pValues + 16 >> 2];
            AL.paramArray[5] = HEAPF32[pValues + 20 >> 2];
            AL.setListenerParam("alListenerfv", param, AL.paramArray);
            break;
        default:
            AL.setListenerParam("alListenerfv", param, null);
            break
    }
};
var _alListeneri = (param, value) => {
    AL.setListenerParam("alListeneri", param, null)
};
var _alListeneriv = (param, pValues) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4100:
        case 4102:
            AL.paramArray[0] = HEAP32[pValues >> 2];
            AL.paramArray[1] = HEAP32[pValues + 4 >> 2];
            AL.paramArray[2] = HEAP32[pValues + 8 >> 2];
            AL.setListenerParam("alListeneriv", param, AL.paramArray);
            break;
        case 4111:
            AL.paramArray[0] = HEAP32[pValues >> 2];
            AL.paramArray[1] = HEAP32[pValues + 4 >> 2];
            AL.paramArray[2] = HEAP32[pValues + 8 >> 2];
            AL.paramArray[3] = HEAP32[pValues + 12 >> 2];
            AL.paramArray[4] = HEAP32[pValues + 16 >> 2];
            AL.paramArray[5] = HEAP32[pValues + 20 >> 2];
            AL.setListenerParam("alListeneriv", param, AL.paramArray);
            break;
        default:
            AL.setListenerParam("alListeneriv", param, null);
            break
    }
};
var _alSource3f = (sourceId, param, value0, value1, value2) => {
    switch (param) {
        case 4100:
        case 4101:
        case 4102:
            AL.paramArray[0] = value0;
            AL.paramArray[1] = value1;
            AL.paramArray[2] = value2;
            AL.setSourceParam("alSource3f", sourceId, param, AL.paramArray);
            break;
        default:
            AL.setSourceParam("alSource3f", sourceId, param, null);
            break
    }
};
var _alSource3i = (sourceId, param, value0, value1, value2) => {
    switch (param) {
        case 4100:
        case 4101:
        case 4102:
            AL.paramArray[0] = value0;
            AL.paramArray[1] = value1;
            AL.paramArray[2] = value2;
            AL.setSourceParam("alSource3i", sourceId, param, AL.paramArray);
            break;
        default:
            AL.setSourceParam("alSource3i", sourceId, param, null);
            break
    }
};
var _alSourcePause = sourceId => {
    if (!AL.currentCtx) {
        return
    }
    var src = AL.currentCtx.sources[sourceId];
    if (!src) {
        AL.currentCtx.err = 40961;
        return
    }
    AL.setSourceState(src, 4115)
};
var _alSourcePausev = (count, pSourceIds) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pSourceIds) {
        AL.currentCtx.err = 40963
    }
    for (var i = 0; i < count; ++i) {
        if (!AL.currentCtx.sources[HEAP32[pSourceIds + i * 4 >> 2]]) {
            AL.currentCtx.err = 40961;
            return
        }
    }
    for (var i = 0; i < count; ++i) {
        var srcId = HEAP32[pSourceIds + i * 4 >> 2];
        AL.setSourceState(AL.currentCtx.sources[srcId], 4115)
    }
};
var _alSourcePlay = sourceId => {
    if (!AL.currentCtx) {
        return
    }
    var src = AL.currentCtx.sources[sourceId];
    if (!src) {
        AL.currentCtx.err = 40961;
        return
    }
    AL.setSourceState(src, 4114)
};
var _alSourcePlayv = (count, pSourceIds) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pSourceIds) {
        AL.currentCtx.err = 40963
    }
    for (var i = 0; i < count; ++i) {
        if (!AL.currentCtx.sources[HEAP32[pSourceIds + i * 4 >> 2]]) {
            AL.currentCtx.err = 40961;
            return
        }
    }
    for (var i = 0; i < count; ++i) {
        var srcId = HEAP32[pSourceIds + i * 4 >> 2];
        AL.setSourceState(AL.currentCtx.sources[srcId], 4114)
    }
};
var _alSourceQueueBuffers = (sourceId, count, pBufferIds) => {
    if (!AL.currentCtx) {
        return
    }
    var src = AL.currentCtx.sources[sourceId];
    if (!src) {
        AL.currentCtx.err = 40961;
        return
    }
    if (src.type === 4136) {
        AL.currentCtx.err = 40964;
        return
    }
    if (count === 0) {
        return
    }
    var templateBuf = AL.buffers[0];
    for (var buf of src.bufQueue) {
        if (buf.id !== 0) {
            templateBuf = buf;
            break
        }
    }
    for (var i = 0; i < count; ++i) {
        var bufId = HEAP32[pBufferIds + i * 4 >> 2];
        var buf = AL.buffers[bufId];
        if (!buf) {
            AL.currentCtx.err = 40961;
            return
        }
        if (templateBuf.id !== 0 && (buf.frequency !== templateBuf.frequency || buf.bytesPerSample !== templateBuf.bytesPerSample || buf.channels !== templateBuf.channels)) {
            AL.currentCtx.err = 40964
        }
    }
    if (src.bufQueue.length === 1 && src.bufQueue[0].id === 0) {
        src.bufQueue.length = 0
    }
    src.type = 4137;
    for (var i = 0; i < count; ++i) {
        var bufId = HEAP32[pBufferIds + i * 4 >> 2];
        var buf = AL.buffers[bufId];
        buf.refCount++;
        src.bufQueue.push(buf)
    }
    if (src.looping) {
        AL.cancelPendingSourceAudio(src)
    }
    AL.initSourcePanner(src);
    AL.scheduleSourceAudio(src)
};
var _alSourceRewind = sourceId => {
    if (!AL.currentCtx) {
        return
    }
    var src = AL.currentCtx.sources[sourceId];
    if (!src) {
        AL.currentCtx.err = 40961;
        return
    }
    AL.setSourceState(src, 4116);
    AL.setSourceState(src, 4113)
};
var _alSourceRewindv = (count, pSourceIds) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pSourceIds) {
        AL.currentCtx.err = 40963
    }
    for (var i = 0; i < count; ++i) {
        if (!AL.currentCtx.sources[HEAP32[pSourceIds + i * 4 >> 2]]) {
            AL.currentCtx.err = 40961;
            return
        }
    }
    for (var i = 0; i < count; ++i) {
        var srcId = HEAP32[pSourceIds + i * 4 >> 2];
        AL.setSourceState(AL.currentCtx.sources[srcId], 4113)
    }
};
var _alSourceStop = sourceId => {
    if (!AL.currentCtx) {
        return
    }
    var src = AL.currentCtx.sources[sourceId];
    if (!src) {
        AL.currentCtx.err = 40961;
        return
    }
    AL.setSourceState(src, 4116)
};
var _alSourceStopv = (count, pSourceIds) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pSourceIds) {
        AL.currentCtx.err = 40963
    }
    for (var i = 0; i < count; ++i) {
        if (!AL.currentCtx.sources[HEAP32[pSourceIds + i * 4 >> 2]]) {
            AL.currentCtx.err = 40961;
            return
        }
    }
    for (var i = 0; i < count; ++i) {
        var srcId = HEAP32[pSourceIds + i * 4 >> 2];
        AL.setSourceState(AL.currentCtx.sources[srcId], 4116)
    }
};
var _alSourceUnqueueBuffers = (sourceId, count, pBufferIds) => {
    if (!AL.currentCtx) {
        return
    }
    var src = AL.currentCtx.sources[sourceId];
    if (!src) {
        AL.currentCtx.err = 40961;
        return
    }
    if (count > (src.bufQueue.length === 1 && src.bufQueue[0].id === 0 ? 0 : src.bufsProcessed)) {
        AL.currentCtx.err = 40963;
        return
    }
    if (count === 0) {
        return
    }
    for (var i = 0; i < count; i++) {
        var buf = src.bufQueue.shift();
        buf.refCount--;
        HEAP32[pBufferIds + i * 4 >> 2] = buf.id;
        src.bufsProcessed--
    }
    if (src.bufQueue.length === 0) {
        src.bufQueue.push(AL.buffers[0])
    }
    AL.initSourcePanner(src);
    AL.scheduleSourceAudio(src)
};
var _alSourcef = (sourceId, param, value) => {
    switch (param) {
        case 4097:
        case 4098:
        case 4099:
        case 4106:
        case 4109:
        case 4110:
        case 4128:
        case 4129:
        case 4130:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 8203:
            AL.setSourceParam("alSourcef", sourceId, param, value);
            break;
        default:
            AL.setSourceParam("alSourcef", sourceId, param, null);
            break
    }
};
var _alSourcefv = (sourceId, param, pValues) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 4097:
        case 4098:
        case 4099:
        case 4106:
        case 4109:
        case 4110:
        case 4128:
        case 4129:
        case 4130:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 8203:
            var val = HEAPF32[pValues >> 2];
            AL.setSourceParam("alSourcefv", sourceId, param, val);
            break;
        case 4100:
        case 4101:
        case 4102:
            AL.paramArray[0] = HEAPF32[pValues >> 2];
            AL.paramArray[1] = HEAPF32[pValues + 4 >> 2];
            AL.paramArray[2] = HEAPF32[pValues + 8 >> 2];
            AL.setSourceParam("alSourcefv", sourceId, param, AL.paramArray);
            break;
        default:
            AL.setSourceParam("alSourcefv", sourceId, param, null);
            break
    }
};
var _alSourceiv = (sourceId, param, pValues) => {
    if (!AL.currentCtx) {
        return
    }
    if (!pValues) {
        AL.currentCtx.err = 40963;
        return
    }
    switch (param) {
        case 514:
        case 4097:
        case 4098:
        case 4103:
        case 4105:
        case 4128:
        case 4129:
        case 4131:
        case 4132:
        case 4133:
        case 4134:
        case 4628:
        case 8201:
        case 8202:
        case 53248:
            var val = HEAP32[pValues >> 2];
            AL.setSourceParam("alSourceiv", sourceId, param, val);
            break;
        case 4100:
        case 4101:
        case 4102:
            AL.paramArray[0] = HEAP32[pValues >> 2];
            AL.paramArray[1] = HEAP32[pValues + 4 >> 2];
            AL.paramArray[2] = HEAP32[pValues + 8 >> 2];
            AL.setSourceParam("alSourceiv", sourceId, param, AL.paramArray);
            break;
        default:
            AL.setSourceParam("alSourceiv", sourceId, param, null);
            break
    }
};
var _alSpeedOfSound = value => {
    AL.setGlobalParam("alSpeedOfSound", 49155, value)
};
var _alcCloseDevice = deviceId => {
    if (!(deviceId in AL.deviceRefCounts) || AL.deviceRefCounts[deviceId] > 0) {
        return 0
    }
    delete AL.deviceRefCounts[deviceId];
    AL.freeIds.push(deviceId);
    return 1
};
var autoResumeAudioContext = ctx => {
    var elements = [window, document, document.body, document.getElementById("canvas")].filter(Boolean);
    var events = ["keydown", "mousedown", "mouseup", "click", "pointerdown", "pointerup", "touchstart", "touchend"];
    var tryResume = () => {
        if (!ctx || ctx.state !== "suspended") {
            cleanup();
            return;
        }
        ctx.resume().then(() => {
            if (ctx.state !== "suspended") {
                cleanup();
            }
        }).catch(() => {});
    };
    var cleanup = () => {
        for (var element of elements) {
            for (var event of events) {
                element.removeEventListener(event, tryResume, true);
            }
        }
    };
    if (typeof navigator.userActivation !== "undefined" && navigator.userActivation.hasBeenActive) {
        tryResume();
    }
    for (var element of elements) {
        for (var event of events) {
            element.addEventListener(event, tryResume, true);
        }
    }
};
var _alcCreateContext = (deviceId, pAttrList) => {
    if (!(deviceId in AL.deviceRefCounts)) {
        AL.alcErr = 40961;
        return 0
    }
    var options = null;
    var attrs = [];
    var hrtf = null;
    pAttrList >>= 2;
    if (pAttrList) {
        var attr = 0;
        var val = 0;
        while (true) {
            attr = HEAP32[pAttrList++];
            attrs.push(attr);
            if (attr === 0) {
                break
            }
            val = HEAP32[pAttrList++];
            attrs.push(val);
            switch (attr) {
                case 4103:
                    if (!options) {
                        options = {}
                    }
                    options.sampleRate = val;
                    break;
                case 4112:
                case 4113:
                    break;
                case 6546:
                    switch (val) {
                        case 0:
                            hrtf = false;
                            break;
                        case 1:
                            hrtf = true;
                            break;
                        case 2:
                            break;
                        default:
                            AL.alcErr = 40964;
                            return 0
                    }
                    break;
                case 6550:
                    if (val !== 0) {
                        AL.alcErr = 40964;
                        return 0
                    }
                    break;
                default:
                    AL.alcErr = 40964;
                    return 0
            }
        }
    }
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var ac = null;
    try {
        if (options) {
            ac = new AudioContext(options)
        } else {
            ac = new AudioContext
        }
    } catch (e) {
        if (e.name === "NotSupportedError") {
            AL.alcErr = 40964
        } else {
            AL.alcErr = 40961
        }
        return 0
    }
    autoResumeAudioContext(ac);
    if (typeof ac.createGain == "undefined") {
        ac.createGain = ac.createGainNode
    }
    var gain = ac.createGain();
    gain.connect(ac.destination);
    var ctx = {
        deviceId,
        id: AL.newId(),
        attrs,
        audioCtx: ac,
        listener: {
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            direction: [0, 0, 0],
            up: [0, 0, 0]
        },
        sources: [],
        interval: setInterval(() => AL.scheduleContextAudio(ctx), AL.QUEUE_INTERVAL),
        gain,
        distanceModel: 53250,
        speedOfSound: 343.3,
        dopplerFactor: 1,
        sourceDistanceModel: false,
        hrtf: hrtf || false,
        _err: 0,
        get err() {
            return this._err
        },
        set err(val) {
            if (this._err === 0 || val === 0) {
                this._err = val
            }
        }
    };
    AL.deviceRefCounts[deviceId]++;
    AL.contexts[ctx.id] = ctx;
    if (hrtf !== null) {
        for (var ctxId in AL.contexts) {
            var c = AL.contexts[ctxId];
            if (c.deviceId === deviceId) {
                c.hrtf = hrtf;
                AL.updateContextGlobal(c)
            }
        }
    }
    return ctx.id
};
var _alcDestroyContext = contextId => {
    var ctx = AL.contexts[contextId];
    if (AL.currentCtx === ctx) {
        AL.alcErr = 40962;
        return
    }
    if (AL.contexts[contextId].interval) {
        clearInterval(AL.contexts[contextId].interval)
    }
    AL.deviceRefCounts[ctx.deviceId]--;
    delete AL.contexts[contextId];
    AL.freeIds.push(contextId)
};
var _alcGetIntegerv = (deviceId, param, size, pValues) => {
    if (size === 0 || !pValues) {
        return
    }
    switch (param) {
        case 4096:
            HEAP32[pValues >> 2] = 1;
            break;
        case 4097:
            HEAP32[pValues >> 2] = 1;
            break;
        case 4098:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            if (!AL.currentCtx) {
                AL.alcErr = 40962;
                return
            }
            HEAP32[pValues >> 2] = AL.currentCtx.attrs.length;
            break;
        case 4099:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            if (!AL.currentCtx) {
                AL.alcErr = 40962;
                return
            }
            for (var i = 0; i < AL.currentCtx.attrs.length; i++) {
                HEAP32[pValues + i * 4 >> 2] = AL.currentCtx.attrs[i]
            }
            break;
        case 4103:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            if (!AL.currentCtx) {
                AL.alcErr = 40962;
                return
            }
            HEAP32[pValues >> 2] = AL.currentCtx.audioCtx.sampleRate;
            break;
        case 4112:
        case 4113:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            if (!AL.currentCtx) {
                AL.alcErr = 40962;
                return
            }
            HEAP32[pValues >> 2] = 2147483647;
            break;
        case 6546:
        case 6547:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            var hrtfStatus = 0;
            for (var ctxId in AL.contexts) {
                var ctx = AL.contexts[ctxId];
                if (ctx.deviceId === deviceId) {
                    hrtfStatus = ctx.hrtf ? 1 : 0
                }
            }
            HEAP32[pValues >> 2] = hrtfStatus;
            break;
        case 6548:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            HEAP32[pValues >> 2] = 1;
            break;
        case 131075:
            if (!(deviceId in AL.deviceRefCounts)) {
                AL.alcErr = 40961;
                return
            }
            if (!AL.currentCtx) {
                AL.alcErr = 40962;
                return
            }
            HEAP32[pValues >> 2] = 1;
        case 786:
            var c = AL.requireValidCaptureDevice(deviceId, "alcGetIntegerv");
            if (!c) {
                return
            }
            var n = c.capturedFrameCount;
            var dstfreq = c.requestedSampleRate;
            var srcfreq = c.audioCtx.sampleRate;
            var nsamples = Math.floor(n * (dstfreq / srcfreq));
            HEAP32[pValues >> 2] = nsamples;
            break;
        default:
            AL.alcErr = 40963;
            return
    }
};
var _alcIsExtensionPresent = (deviceId, pExtName) => {
    var name = UTF8ToString(pExtName);
    return AL.ALC_EXTENSIONS[name] ? 1 : 0
};
var _alcMakeContextCurrent = contextId => {
    if (contextId === 0) {
        AL.currentCtx = null
    } else {
        AL.currentCtx = AL.contexts[contextId]
    }
    return 1
};
var _alcOpenDevice = pDeviceName => {
    if (pDeviceName) {
        var name = UTF8ToString(pDeviceName);
        if (name !== AL.DEVICE_NAME) {
            return 0
        }
    }
    if (globalThis.AudioContext || globalThis.webkitAudioContext) {
        var deviceId = AL.newId();
        AL.deviceRefCounts[deviceId] = 0;
        return deviceId
    }
    return 0
};
var _alcSuspendContext = contextId => {};
