// FPS Limiter - читаем max_fps из query params
const _fpsLimiter = (() => {
    try {
        if (maxFPS > 0 && maxFPS <= 240) {
            console.log(`[FPS Limiter] Enabled: ${maxFPS} FPS`);
            return {
                enabled: true,
                maxFPS: maxFPS,
                minFrameTime: 1000 / maxFPS,
                lastFrameTime: 0
            };
        }
    } catch (e) {
        console.warn('[FPS Limiter] Failed to parse max_fps:', e);
    }
    return { enabled: false };
})();

var EGL = {
    errorCode: 12288,
    defaultDisplayInitialized: false,
    currentContext: 0,
    currentReadSurface: 0,
    currentDrawSurface: 0,
    contextAttributes: {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false
    },
    stringCache: {},
    setErrorCode(code) {
        EGL.errorCode = code
    },
    chooseConfig(display, attribList, config, config_size, numConfigs) {
        if (display != 62e3) {
            EGL.setErrorCode(12296);
            return 0
        }
        if (attribList) {
            for (;;) {
                var param = HEAP32[attribList >> 2];
                if (param == 12321) {
                    var alphaSize = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.alpha = alphaSize > 0
                } else if (param == 12325) {
                    var depthSize = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.depth = depthSize > 0
                } else if (param == 12326) {
                    var stencilSize = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.stencil = stencilSize > 0
                } else if (param == 12337) {
                    var samples = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.antialias = samples > 0
                } else if (param == 12338) {
                    var samples = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.antialias = samples == 1
                } else if (param == 12544) {
                    var requestedPriority = HEAP32[attribList + 4 >> 2];
                    EGL.contextAttributes.lowLatency = requestedPriority != 12547
                } else if (param == 12344) {
                    break
                }
                attribList += 8
            }
        }
        if ((!config || !config_size) && !numConfigs) {
            EGL.setErrorCode(12300);
            return 0
        }
        if (numConfigs) {
            HEAP32[numConfigs >> 2] = 1
        }
        if (config && config_size > 0) {
            HEAPU32[config >> 2] = 62002
        }
        EGL.setErrorCode(12288);
        return 1
    }
};
var _eglBindAPI = api => {
    if (api == 12448) {
        EGL.setErrorCode(12288);
        return 1
    }
    EGL.setErrorCode(12300);
    return 0
};
var _eglChooseConfig = (display, attrib_list, configs, config_size, numConfigs) => EGL.chooseConfig(display, attrib_list, configs, config_size, numConfigs);
var GLctx;
var webgl_enable_ANGLE_instanced_arrays = ctx => {
    var ext = ctx.getExtension("ANGLE_instanced_arrays");
    if (ext) {
        ctx["vertexAttribDivisor"] = (index, divisor) => ext["vertexAttribDivisorANGLE"](index, divisor);
        ctx["drawArraysInstanced"] = (mode, first, count, primcount) => ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
        ctx["drawElementsInstanced"] = (mode, count, type, indices, primcount) => ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
        return 1
    }
};
var webgl_enable_OES_vertex_array_object = ctx => {
    var ext = ctx.getExtension("OES_vertex_array_object");
    if (ext) {
        ctx["createVertexArray"] = () => ext["createVertexArrayOES"]();
        ctx["deleteVertexArray"] = vao => ext["deleteVertexArrayOES"](vao);
        ctx["bindVertexArray"] = vao => ext["bindVertexArrayOES"](vao);
        ctx["isVertexArray"] = vao => ext["isVertexArrayOES"](vao);
        return 1
    }
};
var webgl_enable_WEBGL_draw_buffers = ctx => {
    var ext = ctx.getExtension("WEBGL_draw_buffers");
    if (ext) {
        ctx["drawBuffers"] = (n, bufs) => ext["drawBuffersWEBGL"](n, bufs);
        return 1
    }
};
var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = ctx => !!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"));
var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = ctx => !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"));
var webgl_enable_EXT_polygon_offset_clamp = ctx => !!(ctx.extPolygonOffsetClamp = ctx.getExtension("EXT_polygon_offset_clamp"));
var webgl_enable_EXT_clip_control = ctx => !!(ctx.extClipControl = ctx.getExtension("EXT_clip_control"));
var webgl_enable_WEBGL_polygon_mode = ctx => !!(ctx.webglPolygonMode = ctx.getExtension("WEBGL_polygon_mode"));
var webgl_enable_WEBGL_multi_draw = ctx => !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));
var getEmscriptenSupportedExtensions = ctx => {
    var supportedExtensions = ["ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_disjoint_timer_query", "EXT_frag_depth", "EXT_shader_texture_lod", "EXT_sRGB", "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float", "OES_texture_half_float", "OES_texture_half_float_linear", "OES_vertex_array_object", "WEBGL_color_buffer_float", "WEBGL_depth_texture", "WEBGL_draw_buffers", "EXT_color_buffer_float", "EXT_conservative_depth", "EXT_disjoint_timer_query_webgl2", "EXT_texture_norm16", "NV_shader_noperspective_interpolation", "WEBGL_clip_cull_distance", "EXT_clip_control", "EXT_color_buffer_half_float", "EXT_depth_clamp", "EXT_float_blend", "EXT_polygon_offset_clamp", "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc", "EXT_texture_filter_anisotropic", "KHR_parallel_shader_compile", "OES_texture_float_linear", "WEBGL_blend_func_extended", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_lose_context", "WEBGL_multi_draw", "WEBGL_polygon_mode"];
    return (ctx.getSupportedExtensions() || []).filter(ext => supportedExtensions.includes(ext))
};
var registerPreMainLoop = f => {
    typeof MainLoop != "undefined" && MainLoop.preMainLoop.push(f)
};
var GL = {
    counter: 1,
    buffers: [],
    mappedBuffers: {},
    programs: [],
    framebuffers: [],
    renderbuffers: [],
    textures: [],
    shaders: [],
    vaos: [],
    contexts: [],
    offscreenCanvases: {},
    queries: [],
    samplers: [],
    transformFeedbacks: [],
    syncs: [],
    byteSizeByTypeRoot: 5120,
    byteSizeByType: [1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8],
    stringCache: {},
    stringiCache: {},
    unpackAlignment: 4,
    unpackRowLength: 0,
    recordError: errorCode => {
        if (!GL.lastError) {
            GL.lastError = errorCode
        }
    },
    getNewId: table => {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
            table[i] = null
        }
        while (table[ret]) {
            ret = GL.counter++
        }
        return ret
    },
    genObject: (n, buffers, createFunction, objectTable) => {
        for (var i = 0; i < n; i++) {
            var buffer = GLctx[createFunction]();
            var id = buffer && GL.getNewId(objectTable);
            if (buffer) {
                buffer.name = id;
                objectTable[id] = buffer
            } else {
                GL.recordError(1282)
            }
            HEAP32[buffers + i * 4 >> 2] = id
        }
    },
    MAX_TEMP_BUFFER_SIZE: 2097152,
    numTempVertexBuffersPerSize: 64,
    log2ceilLookup: i => 32 - Math.clz32(i === 0 ? 0 : i - 1),
    generateTempBuffers: (quads, context) => {
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        context.tempVertexBufferCounters1 = [];
        context.tempVertexBufferCounters2 = [];
        context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex + 1;
        context.tempVertexBuffers1 = [];
        context.tempVertexBuffers2 = [];
        context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex + 1;
        context.tempIndexBuffers = [];
        context.tempIndexBuffers.length = largestIndex + 1;
        for (var i = 0; i <= largestIndex; ++i) {
            context.tempIndexBuffers[i] = null;
            context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
            var ringbufferLength = GL.numTempVertexBuffersPerSize;
            context.tempVertexBuffers1[i] = [];
            context.tempVertexBuffers2[i] = [];
            var ringbuffer1 = context.tempVertexBuffers1[i];
            var ringbuffer2 = context.tempVertexBuffers2[i];
            ringbuffer1.length = ringbuffer2.length = ringbufferLength;
            for (var j = 0; j < ringbufferLength; ++j) {
                ringbuffer1[j] = ringbuffer2[j] = null
            }
        }
        if (quads) {
            context.tempQuadIndexBuffer = GLctx.createBuffer();
            context.GLctx.bindBuffer(34963, context.tempQuadIndexBuffer);
            var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
            var quadIndexes = new Uint16Array(numIndexes);
            var i = 0,
                v = 0;
            while (1) {
                quadIndexes[i++] = v;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 1;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 2;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 2;
                if (i >= numIndexes) break;
                quadIndexes[i++] = v + 3;
                if (i >= numIndexes) break;
                v += 4
            }
            context.GLctx.bufferData(34963, quadIndexes, 35044);
            context.GLctx.bindBuffer(34963, null)
        }
    },
    getTempVertexBuffer: sizeBytes => {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
        var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
        GL.currentContext.tempVertexBufferCounters1[idx] = GL.currentContext.tempVertexBufferCounters1[idx] + 1 & GL.numTempVertexBuffersPerSize - 1;
        var vbo = ringbuffer[nextFreeBufferIndex];
        if (vbo) {
            return vbo
        }
        var prevVBO = GLctx.getParameter(34964);
        ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
        GLctx.bindBuffer(34962, ringbuffer[nextFreeBufferIndex]);
        GLctx.bufferData(34962, 1 << idx, 35048);
        GLctx.bindBuffer(34962, prevVBO);
        return ringbuffer[nextFreeBufferIndex]
    },
    getTempIndexBuffer: sizeBytes => {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ibo = GL.currentContext.tempIndexBuffers[idx];
        if (ibo) {
            return ibo
        }
        var prevIBO = GLctx.getParameter(34965);
        GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
        GLctx.bindBuffer(34963, GL.currentContext.tempIndexBuffers[idx]);
        GLctx.bufferData(34963, 1 << idx, 35048);
        GLctx.bindBuffer(34963, prevIBO);
        return GL.currentContext.tempIndexBuffers[idx]
    },
    newRenderingFrameStarted: () => {
        if (!GL.currentContext) {
            return
        }
        var vb = GL.currentContext.tempVertexBuffers1;
        GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
        GL.currentContext.tempVertexBuffers2 = vb;
        vb = GL.currentContext.tempVertexBufferCounters1;
        GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
        GL.currentContext.tempVertexBufferCounters2 = vb;
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        for (var i = 0; i <= largestIndex; ++i) {
            GL.currentContext.tempVertexBufferCounters1[i] = 0
        }
    },
    getSource: (shader, count, string, length) => {
        var source = "";
        for (var i = 0; i < count; ++i) {
            var len = length ? HEAPU32[length + i * 4 >> 2] : undefined;
            source += UTF8ToString(HEAPU32[string + i * 4 >> 2], len)
        }
        return source
    },
    calcBufLength: (size, type, stride, count) => {
        if (stride > 0) {
            return count * stride
        }
        var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
        return size * typeSize * count
    },
    usedTempBuffers: [],
    preDrawHandleClientVertexAttribBindings: count => {
        GL.resetBufferBinding = false;
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
            var cb = GL.currentContext.clientBuffers[i];
            if (!cb.clientside || !cb.enabled) continue;
            GL.resetBufferBinding = true;
            var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
            var buf = GL.getTempVertexBuffer(size);
            GLctx.bindBuffer(34962, buf);
            GLctx.bufferSubData(34962, 0, HEAPU8.subarray(cb.ptr, cb.ptr + size));
            cb.vertexAttribPointerAdaptor.call(GLctx, i, cb.size, cb.type, cb.normalized, cb.stride, 0)
        }
    },
    postDrawHandleClientVertexAttribBindings: () => {
        if (GL.resetBufferBinding) {
            GLctx.bindBuffer(34962, GL.buffers[GLctx.currentArrayBufferBinding])
        }
    },
    createContext: (canvas, webGLContextAttributes) => {
        if (!canvas.getContextSafariWebGL2Fixed) {
            canvas.getContextSafariWebGL2Fixed = canvas.getContext;

            function fixedGetContext(ver, attrs) {
                var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
                return ver == "webgl" == gl instanceof WebGLRenderingContext ? gl : null
            }
            canvas.getContext = fixedGetContext
        }
        var ctx = webGLContextAttributes.majorVersion > 1 ? canvas.getContext("webgl2", webGLContextAttributes) : canvas.getContext("webgl", webGLContextAttributes);
        if (!ctx) return 0;
        var handle = GL.registerContext(ctx, webGLContextAttributes);
        return handle
    },
    registerContext: (ctx, webGLContextAttributes) => {
        var handle = GL.getNewId(GL.contexts);
        var context = {
            handle,
            attributes: webGLContextAttributes,
            version: webGLContextAttributes.majorVersion,
            GLctx: ctx
        };
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
            GL.initExtensions(context)
        }
        context.maxVertexAttribs = context.GLctx.getParameter(34921);
        context.clientBuffers = [];
        for (var i = 0; i < context.maxVertexAttribs; i++) {
            context.clientBuffers[i] = {
                enabled: false,
                clientside: false,
                size: 0,
                type: 0,
                normalized: 0,
                stride: 0,
                ptr: 0,
                vertexAttribPointerAdaptor: null
            }
        }
        GL.generateTempBuffers(false, context);
        return handle
    },
    makeContextCurrent: contextHandle => {
        GL.currentContext = GL.contexts[contextHandle];
        Module["ctx"] = GLctx = GL.currentContext?.GLctx;
        return !(contextHandle && !GLctx)
    },
    getContext: contextHandle => GL.contexts[contextHandle],
    deleteContext: contextHandle => {
        if (GL.currentContext === GL.contexts[contextHandle]) {
            GL.currentContext = null
        }
        if (typeof JSEvents == "object") {
            JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas)
        }
        if (GL.contexts[contextHandle]?.GLctx.canvas) {
            GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined
        }
        GL.contexts[contextHandle] = null
    },
    initExtensions: context => {
        context ||= GL.currentContext;
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
        var GLctx = context.GLctx;
        webgl_enable_WEBGL_multi_draw(GLctx);
        webgl_enable_EXT_polygon_offset_clamp(GLctx);
        webgl_enable_EXT_clip_control(GLctx);
        webgl_enable_WEBGL_polygon_mode(GLctx);
        webgl_enable_ANGLE_instanced_arrays(GLctx);
        webgl_enable_OES_vertex_array_object(GLctx);
        webgl_enable_WEBGL_draw_buffers(GLctx);
        webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
        if (context.version >= 2) {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query_webgl2")
        }
        if (context.version < 2 || !GLctx.disjointTimerQueryExt) {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query")
        }
        for (var ext of getEmscriptenSupportedExtensions(GLctx)) {
            if (!ext.includes("lose_context") && !ext.includes("debug")) {
                GLctx.getExtension(ext)
            }
        }
    }
};
var _eglCreateContext = (display, config, hmm, contextAttribs) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    var glesContextVersion = 1;
    for (;;) {
        var param = HEAP32[contextAttribs >> 2];
        if (param == 12440) {
            glesContextVersion = HEAP32[contextAttribs + 4 >> 2]
        } else if (param == 12344) {
            break
        } else {
            EGL.setErrorCode(12292);
            return 0
        }
        contextAttribs += 8
    }
    if (glesContextVersion < 2 || glesContextVersion > 3) {
        EGL.setErrorCode(12293);
        return 0
    }
    EGL.contextAttributes.majorVersion = glesContextVersion - 1;
    EGL.contextAttributes.minorVersion = 0;
    EGL.context = GL.createContext(Browser.getCanvas(), EGL.contextAttributes);
    if (EGL.context != 0) {
        EGL.setErrorCode(12288);
        GL.makeContextCurrent(EGL.context);
        Browser.useWebGL = true;
        Browser.moduleContextCreatedCallbacks.forEach(callback => callback());
        GL.makeContextCurrent(null);
        return 62004
    } else {
        EGL.setErrorCode(12297);
        return 0
    }
};
var _eglCreateWindowSurface = (display, config, win, attrib_list) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (config != 62002) {
        EGL.setErrorCode(12293);
        return 0
    }
    EGL.setErrorCode(12288);
    return 62006
};
var _eglDestroyContext = (display, context) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (context != 62004) {
        EGL.setErrorCode(12294);
        return 0
    }
    GL.deleteContext(EGL.context);
    EGL.setErrorCode(12288);
    if (EGL.currentContext == context) {
        EGL.currentContext = 0
    }
    return 1
};
var _eglDestroySurface = (display, surface) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (surface != 62006) {
        EGL.setErrorCode(12301);
        return 1
    }
    if (EGL.currentReadSurface == surface) {
        EGL.currentReadSurface = 0
    }
    if (EGL.currentDrawSurface == surface) {
        EGL.currentDrawSurface = 0
    }
    EGL.setErrorCode(12288);
    return 1
};
var _eglGetConfigAttrib = (display, config, attribute, value) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (config != 62002) {
        EGL.setErrorCode(12293);
        return 0
    }
    if (!value) {
        EGL.setErrorCode(12300);
        return 0
    }
    EGL.setErrorCode(12288);
    switch (attribute) {
        case 12320:
            HEAP32[value >> 2] = EGL.contextAttributes.alpha ? 32 : 24;
            return 1;
        case 12321:
            HEAP32[value >> 2] = EGL.contextAttributes.alpha ? 8 : 0;
            return 1;
        case 12322:
            HEAP32[value >> 2] = 8;
            return 1;
        case 12323:
            HEAP32[value >> 2] = 8;
            return 1;
        case 12324:
            HEAP32[value >> 2] = 8;
            return 1;
        case 12325:
            HEAP32[value >> 2] = EGL.contextAttributes.depth ? 24 : 0;
            return 1;
        case 12326:
            HEAP32[value >> 2] = EGL.contextAttributes.stencil ? 8 : 0;
            return 1;
        case 12327:
            HEAP32[value >> 2] = 12344;
            return 1;
        case 12328:
            HEAP32[value >> 2] = 62002;
            return 1;
        case 12329:
            HEAP32[value >> 2] = 0;
            return 1;
        case 12330:
            HEAP32[value >> 2] = 4096;
            return 1;
        case 12331:
            HEAP32[value >> 2] = 16777216;
            return 1;
        case 12332:
            HEAP32[value >> 2] = 4096;
            return 1;
        case 12333:
            HEAP32[value >> 2] = 0;
            return 1;
        case 12334:
            HEAP32[value >> 2] = 0;
            return 1;
        case 12335:
            HEAP32[value >> 2] = 12344;
            return 1;
        case 12337:
            HEAP32[value >> 2] = EGL.contextAttributes.antialias ? 4 : 0;
            return 1;
        case 12338:
            HEAP32[value >> 2] = EGL.contextAttributes.antialias ? 1 : 0;
            return 1;
        case 12339:
            HEAP32[value >> 2] = 4;
            return 1;
        case 12340:
            HEAP32[value >> 2] = 12344;
            return 1;
        case 12341:
        case 12342:
        case 12343:
            HEAP32[value >> 2] = -1;
            return 1;
        case 12345:
        case 12346:
            HEAP32[value >> 2] = 0;
            return 1;
        case 12347:
            HEAP32[value >> 2] = 0;
            return 1;
        case 12348:
            HEAP32[value >> 2] = 1;
            return 1;
        case 12349:
        case 12350:
            HEAP32[value >> 2] = 0;
            return 1;
        case 12351:
            HEAP32[value >> 2] = 12430;
            return 1;
        case 12352:
            HEAP32[value >> 2] = 4;
            return 1;
        case 12354:
            HEAP32[value >> 2] = 0;
            return 1;
        default:
            EGL.setErrorCode(12292);
            return 0
    }
};
var _eglGetDisplay = nativeDisplayType => {
    EGL.setErrorCode(12288);
    if (nativeDisplayType != 0 && nativeDisplayType != 1) {
        return 0
    }
    return 62e3
};
var _eglGetError = () => EGL.errorCode;
var _eglInitialize = (display, majorVersion, minorVersion) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (majorVersion) {
        HEAP32[majorVersion >> 2] = 1
    }
    if (minorVersion) {
        HEAP32[minorVersion >> 2] = 4
    }
    EGL.defaultDisplayInitialized = true;
    EGL.setErrorCode(12288);
    return 1
};
var _eglMakeCurrent = (display, draw, read, context) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (context != 0 && context != 62004) {
        EGL.setErrorCode(12294);
        return 0
    }
    if (read != 0 && read != 62006 || draw != 0 && draw != 62006) {
        EGL.setErrorCode(12301);
        return 0
    }
    GL.makeContextCurrent(context ? EGL.context : null);
    EGL.currentContext = context;
    EGL.currentDrawSurface = draw;
    EGL.currentReadSurface = read;
    EGL.setErrorCode(12288);
    return 1
};
var _eglQueryString = (display, name) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    EGL.setErrorCode(12288);
    if (EGL.stringCache[name]) return EGL.stringCache[name];
    var ret;
    switch (name) {
        case 12371:
            ret = stringToNewUTF8("Emscripten");
            break;
        case 12372:
            ret = stringToNewUTF8("1.4 Emscripten EGL");
            break;
        case 12373:
            ret = stringToNewUTF8("");
            break;
        case 12429:
            ret = stringToNewUTF8("OpenGL_ES");
            break;
        default:
            EGL.setErrorCode(12300);
            return 0
    }
    EGL.stringCache[name] = ret;
    return ret
};
var _eglSwapBuffers = (dpy, surface) => {
    // FPS Limiting logic
    if (_fpsLimiter.enabled) {
        const now = performance.now();
        const elapsed = now - _fpsLimiter.lastFrameTime;
        if (elapsed < _fpsLimiter.minFrameTime) {
            const waitUntil = _fpsLimiter.lastFrameTime + _fpsLimiter.minFrameTime;
            while (performance.now() < waitUntil) {
                // Frame rate limiting busy-wait
            }
        }
        _fpsLimiter.lastFrameTime = performance.now();
    }

    if (!EGL.defaultDisplayInitialized) {
        EGL.setErrorCode(12289)
    } else if (!GLctx) {
        EGL.setErrorCode(12290)
    } else if (GLctx.isContextLost()) {
        EGL.setErrorCode(12302)
    } else {
        EGL.setErrorCode(12288);
        return 1
    }
    return 0
};
var _eglSwapInterval = (display, interval) => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    if (interval == 0) _emscripten_set_main_loop_timing(0, 0);
    else _emscripten_set_main_loop_timing(1, interval);
    EGL.setErrorCode(12288);
    return 1
};
var _eglTerminate = display => {
    if (display != 62e3) {
        EGL.setErrorCode(12296);
        return 0
    }
    EGL.currentContext = 0;
    EGL.currentReadSurface = 0;
    EGL.currentDrawSurface = 0;
    EGL.defaultDisplayInitialized = false;
    EGL.setErrorCode(12288);
    return 1
};
var _eglWaitClient = () => {
    EGL.setErrorCode(12288);
    return 1
};
var _eglWaitGL = _eglWaitClient;
var _eglWaitNative = nativeEngineId => {
    EGL.setErrorCode(12288);
    return 1
};
var _emscripten_glActiveTexture = x0 => GLctx.activeTexture(x0);
var _emscripten_glAttachShader = (program, shader) => {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader])
};
var _emscripten_glBeginQuery = (target, id) => {
    GLctx.beginQuery(target, GL.queries[id])
};
var _emscripten_glBeginQueryEXT = (target, id) => {
    GLctx.disjointTimerQueryExt["beginQueryEXT"](target, GL.queries[id])
};
var _emscripten_glBeginTransformFeedback = x0 => GLctx.beginTransformFeedback(x0);
var _emscripten_glBindAttribLocation = (program, index, name) => {
    GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name))
};
var _emscripten_glBindBuffer = (target, buffer) => {
    if (buffer && !GL.buffers[buffer]) {
        var b = GLctx.createBuffer();
        b.name = buffer;
        GL.buffers[buffer] = b
    }
    if (target == 34962) {
        GLctx.currentArrayBufferBinding = buffer
    } else if (target == 34963) {
        GLctx.currentElementArrayBufferBinding = buffer
    }
    if (target == 35051) {
        GLctx.currentPixelPackBufferBinding = buffer
    } else if (target == 35052) {
        GLctx.currentPixelUnpackBufferBinding = buffer
    }
    GLctx.bindBuffer(target, GL.buffers[buffer])
};
var _emscripten_glBindBufferBase = (target, index, buffer) => {
    GLctx.bindBufferBase(target, index, GL.buffers[buffer])
};
var _emscripten_glBindBufferRange = (target, index, buffer, offset, ptrsize) => {
    GLctx.bindBufferRange(target, index, GL.buffers[buffer], offset, ptrsize)
};
var _emscripten_glBindFramebuffer = (target, framebuffer) => {
    GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer])
};
var _emscripten_glBindRenderbuffer = (target, renderbuffer) => {
    GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer])
};
var _emscripten_glBindSampler = (unit, sampler) => {
    GLctx.bindSampler(unit, GL.samplers[sampler])
};
var _emscripten_glBindTexture = (target, texture) => {
    GLctx.bindTexture(target, GL.textures[texture])
};
var _emscripten_glBindTransformFeedback = (target, id) => {
    GLctx.bindTransformFeedback(target, GL.transformFeedbacks[id])
};
var _emscripten_glBindVertexArray = vao => {
    GLctx.bindVertexArray(GL.vaos[vao]);
    var ibo = GLctx.getParameter(34965);
    GLctx.currentElementArrayBufferBinding = ibo ? ibo.name | 0 : 0
};
var _emscripten_glBindVertexArrayOES = _emscripten_glBindVertexArray;
var _emscripten_glBlendColor = (x0, x1, x2, x3) => GLctx.blendColor(x0, x1, x2, x3);
var _emscripten_glBlendEquation = x0 => GLctx.blendEquation(x0);
var _emscripten_glBlendEquationSeparate = (x0, x1) => GLctx.blendEquationSeparate(x0, x1);
var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);
var _emscripten_glBlendFuncSeparate = (x0, x1, x2, x3) => GLctx.blendFuncSeparate(x0, x1, x2, x3);
var _emscripten_glBlitFramebuffer = (x0, x1, x2, x3, x4, x5, x6, x7, x8, x9) => GLctx.blitFramebuffer(x0, x1, x2, x3, x4, x5, x6, x7, x8, x9);
var _emscripten_glBufferData = (target, size, data, usage) => {
    if (GL.currentContext.version >= 2) {
        if (data && size) {
            GLctx.bufferData(target, HEAPU8, usage, data, size)
        } else {
            GLctx.bufferData(target, size, usage)
        }
        return
    }
    GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage)
};
var _emscripten_glBufferSubData = (target, offset, size, data) => {
    if (GL.currentContext.version >= 2) {
        size && GLctx.bufferSubData(target, offset, HEAPU8, data, size);
        return
    }
    GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data + size))
};
var _emscripten_glCheckFramebufferStatus = x0 => GLctx.checkFramebufferStatus(x0);
var _emscripten_glClear = x0 => GLctx.clear(x0);
var _emscripten_glClearBufferfi = (x0, x1, x2, x3) => GLctx.clearBufferfi(x0, x1, x2, x3);
var _emscripten_glClearBufferfv = (buffer, drawbuffer, value) => {
    GLctx.clearBufferfv(buffer, drawbuffer, HEAPF32, value >> 2)
};
var _emscripten_glClearBufferiv = (buffer, drawbuffer, value) => {
    GLctx.clearBufferiv(buffer, drawbuffer, HEAP32, value >> 2)
};
var _emscripten_glClearBufferuiv = (buffer, drawbuffer, value) => {
    GLctx.clearBufferuiv(buffer, drawbuffer, HEAPU32, value >> 2)
};
var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);
var _emscripten_glClearDepthf = x0 => GLctx.clearDepth(x0);
var _emscripten_glClearStencil = x0 => GLctx.clearStencil(x0);
var _emscripten_glClientWaitSync = (sync, flags, timeout) => {
    timeout = Number(timeout);
    return GLctx.clientWaitSync(GL.syncs[sync], flags, timeout)
};
var _emscripten_glClipControlEXT = (origin, depth) => {
    GLctx.extClipControl["clipControlEXT"](origin, depth)
};
var _emscripten_glColorMask = (red, green, blue, alpha) => {
    GLctx.colorMask(!!red, !!green, !!blue, !!alpha)
};
var _emscripten_glCompileShader = shader => {
    GLctx.compileShader(GL.shaders[shader])
};
var _emscripten_glCompressedTexImage2D = (target, level, internalFormat, width, height, border, imageSize, data) => {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
            GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data);
            return
        }
        GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, HEAPU8, data, imageSize);
        return
    }
    GLctx.compressedTexImage2D(target, level, internalFormat, width, height, border, HEAPU8.subarray(data, data + imageSize))
};
var _emscripten_glCompressedTexImage3D = (target, level, internalFormat, width, height, depth, border, imageSize, data) => {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, imageSize, data)
    } else {
        GLctx.compressedTexImage3D(target, level, internalFormat, width, height, depth, border, HEAPU8, data, imageSize)
    }
};
var _emscripten_glCompressedTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, imageSize, data) => {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelUnpackBufferBinding || !imageSize) {
            GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data);
            return
        }
        GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, HEAPU8, data, imageSize);
        return
    }
    GLctx.compressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, HEAPU8.subarray(data, data + imageSize))
};
var _emscripten_glCompressedTexSubImage3D = (target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data) => {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, imageSize, data)
    } else {
        GLctx.compressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, HEAPU8, data, imageSize)
    }
};
var _emscripten_glCopyBufferSubData = (x0, x1, x2, x3, x4) => GLctx.copyBufferSubData(x0, x1, x2, x3, x4);
var _emscripten_glCopyTexImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7);
var _emscripten_glCopyTexSubImage2D = (x0, x1, x2, x3, x4, x5, x6, x7) => GLctx.copyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7);
var _emscripten_glCopyTexSubImage3D = (x0, x1, x2, x3, x4, x5, x6, x7, x8) => GLctx.copyTexSubImage3D(x0, x1, x2, x3, x4, x5, x6, x7, x8);
var _emscripten_glCreateProgram = () => {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
    program.uniformIdCounter = 1;
    GL.programs[id] = program;
    return id
};
var _emscripten_glCreateShader = shaderType => {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id
};
var _emscripten_glCullFace = x0 => GLctx.cullFace(x0);
var _emscripten_glDeleteBuffers = (n, buffers) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[buffers + i * 4 >> 2];
        var buffer = GL.buffers[id];
        if (!buffer) continue;
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
        if (id == GLctx.currentArrayBufferBinding) GLctx.currentArrayBufferBinding = 0;
        if (id == GLctx.currentElementArrayBufferBinding) GLctx.currentElementArrayBufferBinding = 0;
        if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
        if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0
    }
};
var _emscripten_glDeleteFramebuffers = (n, framebuffers) => {
    for (var i = 0; i < n; ++i) {
        var id = HEAP32[framebuffers + i * 4 >> 2];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue;
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null
    }
};
var _emscripten_glDeleteProgram = id => {
    if (!id) return;
    var program = GL.programs[id];
    if (!program) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteProgram(program);
    program.name = 0;
    GL.programs[id] = null
};
var _emscripten_glDeleteQueries = (n, ids) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[ids + i * 4 >> 2];
        var query = GL.queries[id];
        if (!query) continue;
        GLctx.deleteQuery(query);
        GL.queries[id] = null
    }
};
var _emscripten_glDeleteQueriesEXT = (n, ids) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[ids + i * 4 >> 2];
        var query = GL.queries[id];
        if (!query) continue;
        GLctx.disjointTimerQueryExt["deleteQueryEXT"](query);
        GL.queries[id] = null
    }
};
var _emscripten_glDeleteRenderbuffers = (n, renderbuffers) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[renderbuffers + i * 4 >> 2];
        var renderbuffer = GL.renderbuffers[id];
        if (!renderbuffer) continue;
        GLctx.deleteRenderbuffer(renderbuffer);
        renderbuffer.name = 0;
        GL.renderbuffers[id] = null
    }
};
var _emscripten_glDeleteSamplers = (n, samplers) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[samplers + i * 4 >> 2];
        var sampler = GL.samplers[id];
        if (!sampler) continue;
        GLctx.deleteSampler(sampler);
        sampler.name = 0;
        GL.samplers[id] = null
    }
};
var _emscripten_glDeleteShader = id => {
    if (!id) return;
    var shader = GL.shaders[id];
    if (!shader) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteShader(shader);
    GL.shaders[id] = null
};
var _emscripten_glDeleteSync = id => {
    if (!id) return;
    var sync = GL.syncs[id];
    if (!sync) {
        GL.recordError(1281);
        return
    }
    GLctx.deleteSync(sync);
    sync.name = 0;
    GL.syncs[id] = null
};
var _emscripten_glDeleteTextures = (n, textures) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[textures + i * 4 >> 2];
        var texture = GL.textures[id];
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null
    }
};
var _emscripten_glDeleteTransformFeedbacks = (n, ids) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[ids + i * 4 >> 2];
        var transformFeedback = GL.transformFeedbacks[id];
        if (!transformFeedback) continue;
        GLctx.deleteTransformFeedback(transformFeedback);
        transformFeedback.name = 0;
        GL.transformFeedbacks[id] = null
    }
};
var _emscripten_glDeleteVertexArrays = (n, vaos) => {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[vaos + i * 4 >> 2];
        GLctx.deleteVertexArray(GL.vaos[id]);
        GL.vaos[id] = null
    }
};
var _emscripten_glDeleteVertexArraysOES = _emscripten_glDeleteVertexArrays;
var _emscripten_glDepthFunc = x0 => GLctx.depthFunc(x0);
var _emscripten_glDepthMask = flag => {
    GLctx.depthMask(!!flag)
};
var _emscripten_glDepthRangef = (x0, x1) => GLctx.depthRange(x0, x1);
var _emscripten_glDetachShader = (program, shader) => {
    GLctx.detachShader(GL.programs[program], GL.shaders[shader])
};
var _emscripten_glDisable = x0 => GLctx.disable(x0);
var _emscripten_glDisableVertexAttribArray = index => {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = false;
    GLctx.disableVertexAttribArray(index)
};
var _emscripten_glDrawArrays = (mode, first, count) => {
    GL.preDrawHandleClientVertexAttribBindings(first + count);
    GLctx.drawArrays(mode, first, count);
    GL.postDrawHandleClientVertexAttribBindings()
};
var _emscripten_glDrawArraysInstanced = (mode, first, count, primcount) => {
    GLctx.drawArraysInstanced(mode, first, count, primcount)
};
var _emscripten_glDrawArraysInstancedANGLE = _emscripten_glDrawArraysInstanced;
var _emscripten_glDrawArraysInstancedARB = _emscripten_glDrawArraysInstanced;
var _emscripten_glDrawArraysInstancedEXT = _emscripten_glDrawArraysInstanced;
var _emscripten_glDrawArraysInstancedNV = _emscripten_glDrawArraysInstanced;
var tempFixedLengthArray = [];
var _emscripten_glDrawBuffers = (n, bufs) => {
    var bufArray = tempFixedLengthArray[n];
    for (var i = 0; i < n; i++) {
        bufArray[i] = HEAP32[bufs + i * 4 >> 2]
    }
    GLctx.drawBuffers(bufArray)
};
var _emscripten_glDrawBuffersEXT = _emscripten_glDrawBuffers;
var _emscripten_glDrawBuffersWEBGL = _emscripten_glDrawBuffers;
var _emscripten_glDrawElements = (mode, count, type, indices) => {
    var buf;
    var vertexes = 0;
    if (!GLctx.currentElementArrayBufferBinding) {
        var size = GL.calcBufLength(1, type, 0, count);
        buf = GL.getTempIndexBuffer(size);
        GLctx.bindBuffer(34963, buf);
        GLctx.bufferSubData(34963, 0, HEAPU8.subarray(indices, indices + size));
        if (count > 0) {
            for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
                var cb = GL.currentContext.clientBuffers[i];
                if (cb.clientside && cb.enabled) {
                    let arrayClass;
                    switch (type) {
                        case 5121:
                            arrayClass = Uint8Array;
                            break;
                        case 5123:
                            arrayClass = Uint16Array;
                            break;
                        case 5125:
                            arrayClass = Uint32Array;
                            break;
                        default:
                            GL.recordError(1282);
                            return
                    }
                    vertexes = new arrayClass(HEAPU8.buffer, indices, count).reduce((max, current) => Math.max(max, current)) + 1;
                    break
                }
            }
        }
        indices = 0
    }
    GL.preDrawHandleClientVertexAttribBindings(vertexes);
    GLctx.drawElements(mode, count, type, indices);
    GL.postDrawHandleClientVertexAttribBindings(count);
    if (!GLctx.currentElementArrayBufferBinding) {
        GLctx.bindBuffer(34963, null)
    }
};
var _emscripten_glDrawElementsInstanced = (mode, count, type, indices, primcount) => {
    GLctx.drawElementsInstanced(mode, count, type, indices, primcount)
};
var _emscripten_glDrawElementsInstancedANGLE = _emscripten_glDrawElementsInstanced;
var _emscripten_glDrawElementsInstancedARB = _emscripten_glDrawElementsInstanced;
var _emscripten_glDrawElementsInstancedEXT = _emscripten_glDrawElementsInstanced;
var _emscripten_glDrawElementsInstancedNV = _emscripten_glDrawElementsInstanced;
var _glDrawElements = _emscripten_glDrawElements;
var _emscripten_glDrawRangeElements = (mode, start, end, count, type, indices) => {
    _glDrawElements(mode, count, type, indices)
};
var _emscripten_glEnable = x0 => GLctx.enable(x0);
var _emscripten_glEnableVertexAttribArray = index => {
    var cb = GL.currentContext.clientBuffers[index];
    cb.enabled = true;
    GLctx.enableVertexAttribArray(index)
};
var _emscripten_glEndQuery = x0 => GLctx.endQuery(x0);
var _emscripten_glEndQueryEXT = target => {
    GLctx.disjointTimerQueryExt["endQueryEXT"](target)
};
var _emscripten_glEndTransformFeedback = () => GLctx.endTransformFeedback();
var _emscripten_glFenceSync = (condition, flags) => {
    var sync = GLctx.fenceSync(condition, flags);
    if (sync) {
        var id = GL.getNewId(GL.syncs);
        sync.name = id;
        GL.syncs[id] = sync;
        return id
    }
    return 0
};
var _emscripten_glFinish = () => GLctx.finish();
var _emscripten_glFlush = () => GLctx.flush();
var emscriptenWebGLGetBufferBinding = target => {
    switch (target) {
        case 34962:
            target = 34964;
            break;
        case 34963:
            target = 34965;
            break;
        case 35051:
            target = 35053;
            break;
        case 35052:
            target = 35055;
            break;
        case 35982:
            target = 35983;
            break;
        case 36662:
            target = 36662;
            break;
        case 36663:
            target = 36663;
            break;
        case 35345:
            target = 35368;
            break
    }
    var buffer = GLctx.getParameter(target);
    if (buffer) return buffer.name | 0;
    else return 0
};
var emscriptenWebGLValidateMapBufferTarget = target => {
    switch (target) {
        case 34962:
        case 34963:
        case 36662:
        case 36663:
        case 35051:
        case 35052:
        case 35882:
        case 35982:
        case 35345:
            return true;
        default:
            return false
    }
};
var _emscripten_glFlushMappedBufferRange = (target, offset, length) => {
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glFlushMappedBufferRange");
        return
    }
    var mapping = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
    if (!mapping) {
        GL.recordError(1282);
        err("buffer was never mapped in glFlushMappedBufferRange");
        return
    }
    if (!(mapping.access & 16)) {
        GL.recordError(1282);
        err("buffer was not mapped with GL_MAP_FLUSH_EXPLICIT_BIT in glFlushMappedBufferRange");
        return
    }
    if (offset < 0 || length < 0 || offset + length > mapping.length) {
        GL.recordError(1281);
        err("invalid range in glFlushMappedBufferRange");
        return
    }
    GLctx.bufferSubData(target, mapping.offset, HEAPU8.subarray(mapping.mem + offset, mapping.mem + offset + length))
};
var _emscripten_glFramebufferRenderbuffer = (target, attachment, renderbuffertarget, renderbuffer) => {
    GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer])
};
var _emscripten_glFramebufferTexture2D = (target, attachment, textarget, texture, level) => {
    GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level)
};
var _emscripten_glFramebufferTextureLayer = (target, attachment, texture, level, layer) => {
    GLctx.framebufferTextureLayer(target, attachment, GL.textures[texture], level, layer)
};
var _emscripten_glFrontFace = x0 => GLctx.frontFace(x0);
var _emscripten_glGenBuffers = (n, buffers) => {
    GL.genObject(n, buffers, "createBuffer", GL.buffers)
};
var _emscripten_glGenFramebuffers = (n, ids) => {
    GL.genObject(n, ids, "createFramebuffer", GL.framebuffers)
};
var _emscripten_glGenQueries = (n, ids) => {
    GL.genObject(n, ids, "createQuery", GL.queries)
};
var _emscripten_glGenQueriesEXT = (n, ids) => {
    for (var i = 0; i < n; i++) {
        var query = GLctx.disjointTimerQueryExt["createQueryEXT"]();
        if (!query) {
            GL.recordError(1282);
            while (i < n) HEAP32[ids + i++ * 4 >> 2] = 0;
            return
        }
        var id = GL.getNewId(GL.queries);
        query.name = id;
        GL.queries[id] = query;
        HEAP32[ids + i * 4 >> 2] = id
    }
};
var _emscripten_glGenRenderbuffers = (n, renderbuffers) => {
    GL.genObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers)
};
var _emscripten_glGenSamplers = (n, samplers) => {
    GL.genObject(n, samplers, "createSampler", GL.samplers)
};
var _emscripten_glGenTextures = (n, textures) => {
    GL.genObject(n, textures, "createTexture", GL.textures)
};
var _emscripten_glGenTransformFeedbacks = (n, ids) => {
    GL.genObject(n, ids, "createTransformFeedback", GL.transformFeedbacks)
};
var _emscripten_glGenVertexArrays = (n, arrays) => {
    GL.genObject(n, arrays, "createVertexArray", GL.vaos)
};
var _emscripten_glGenVertexArraysOES = _emscripten_glGenVertexArrays;
var _emscripten_glGenerateMipmap = x0 => GLctx.generateMipmap(x0);
var __glGetActiveAttribOrUniform = (funcName, program, index, bufSize, length, size, type, name) => {
    program = GL.programs[program];
    var info = GLctx[funcName](program, index);
    if (info) {
        var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
        if (length) HEAP32[length >> 2] = numBytesWrittenExclNull;
        if (size) HEAP32[size >> 2] = info.size;
        if (type) HEAP32[type >> 2] = info.type
    }
};
var _emscripten_glGetActiveAttrib = (program, index, bufSize, length, size, type, name) => __glGetActiveAttribOrUniform("getActiveAttrib", program, index, bufSize, length, size, type, name);
var _emscripten_glGetActiveUniform = (program, index, bufSize, length, size, type, name) => __glGetActiveAttribOrUniform("getActiveUniform", program, index, bufSize, length, size, type, name);
var _emscripten_glGetActiveUniformBlockName = (program, uniformBlockIndex, bufSize, length, uniformBlockName) => {
    program = GL.programs[program];
    var result = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
    if (!result) return;
    if (uniformBlockName && bufSize > 0) {
        var numBytesWrittenExclNull = stringToUTF8(result, uniformBlockName, bufSize);
        if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
    } else {
        if (length) HEAP32[length >> 2] = 0
    }
};
var _emscripten_glGetActiveUniformBlockiv = (program, uniformBlockIndex, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    if (pname == 35393) {
        var name = GLctx.getActiveUniformBlockName(program, uniformBlockIndex);
        HEAP32[params >> 2] = name.length + 1;
        return
    }
    var result = GLctx.getActiveUniformBlockParameter(program, uniformBlockIndex, pname);
    if (result === null) return;
    if (pname == 35395) {
        for (var i = 0; i < result.length; i++) {
            HEAP32[params + i * 4 >> 2] = result[i]
        }
    } else {
        HEAP32[params >> 2] = result
    }
};
var _emscripten_glGetActiveUniformsiv = (program, uniformCount, uniformIndices, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    if (uniformCount > 0 && uniformIndices == 0) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    var ids = [];
    for (var i = 0; i < uniformCount; i++) {
        ids.push(HEAP32[uniformIndices + i * 4 >> 2])
    }
    var result = GLctx.getActiveUniforms(program, ids, pname);
    if (!result) return;
    var len = result.length;
    for (var i = 0; i < len; i++) {
        HEAP32[params + i * 4 >> 2] = result[i]
    }
};
var _emscripten_glGetAttachedShaders = (program, maxCount, count, shaders) => {
    var result = GLctx.getAttachedShaders(GL.programs[program]);
    var len = result.length;
    if (len > maxCount) {
        len = maxCount
    }
    HEAP32[count >> 2] = len;
    for (var i = 0; i < len; ++i) {
        var id = GL.shaders.indexOf(result[i]);
        HEAP32[shaders + i * 4 >> 2] = id
    }
};
var _emscripten_glGetAttribLocation = (program, name) => GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));
var writeI53ToI64 = (ptr, num) => {
    HEAPU32[ptr >> 2] = num;
    var lower = HEAPU32[ptr >> 2];
    HEAPU32[ptr + 4 >> 2] = (num - lower) / 4294967296
};
var webglGetExtensions = () => {
    var exts = getEmscriptenSupportedExtensions(GLctx);
    exts = exts.concat(exts.map(e => "GL_" + e));
    return exts
};
var emscriptenWebGLGet = (name_, p, type) => {
    if (!p) {
        GL.recordError(1281);
        return
    }
    var ret = undefined;
    switch (name_) {
        case 36346:
            ret = 1;
            break;
        case 36344:
            if (type != 0 && type != 1) {
                GL.recordError(1280)
            }
            return;
        case 34814:
        case 36345:
            ret = 0;
            break;
        case 34466:
            var formats = GLctx.getParameter(34467);
            ret = formats ? formats.length : 0;
            break;
        case 33309:
            if (GL.currentContext.version < 2) {
                GL.recordError(1282);
                return
            }
            ret = webglGetExtensions().length;
            break;
        case 33307:
        case 33308:
            if (GL.currentContext.version < 2) {
                GL.recordError(1280);
                return
            }
            ret = name_ == 33307 ? 3 : 0;
            break
    }
    if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
            case "number":
                ret = result;
                break;
            case "boolean":
                ret = result ? 1 : 0;
                break;
            case "string":
                GL.recordError(1280);
                return;
            case "object":
                if (result === null) {
                    switch (name_) {
                        case 34964:
                        case 35725:
                        case 34965:
                        case 36006:
                        case 36007:
                        case 32873:
                        case 34229:
                        case 36662:
                        case 36663:
                        case 35053:
                        case 35055:
                        case 36010:
                        case 35097:
                        case 35869:
                        case 32874:
                        case 36389:
                        case 35983:
                        case 35368:
                        case 34068: {
                            ret = 0;
                            break
                        }
                        default: {
                            GL.recordError(1280);
                            return
                        }
                    }
                } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
                    for (var i = 0; i < result.length; ++i) {
                        switch (type) {
                            case 0:
                                HEAP32[p + i * 4 >> 2] = result[i];
                                break;
                            case 2:
                                HEAPF32[p + i * 4 >> 2] = result[i];
                                break;
                            case 4:
                                HEAP8[p + i] = result[i] ? 1 : 0;
                                break
                        }
                    }
                    return
                } else {
                    try {
                        ret = result.name | 0
                    } catch (e) {
                        GL.recordError(1280);
                        err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
                        return
                    }
                }
                break;
            default:
                GL.recordError(1280);
                err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof result}!`);
                return
        }
    }
    switch (type) {
        case 1:
            writeI53ToI64(p, ret);
            break;
        case 0:
            HEAP32[p >> 2] = ret;
            break;
        case 2:
            HEAPF32[p >> 2] = ret;
            break;
        case 4:
            HEAP8[p] = ret ? 1 : 0;
            break
    }
};
var _emscripten_glGetBooleanv = (name_, p) => emscriptenWebGLGet(name_, p, 4);
var _emscripten_glGetBufferParameteri64v = (target, value, data) => {
    if (!data) {
        GL.recordError(1281);
        return
    }
    writeI53ToI64(data, GLctx.getBufferParameter(target, value))
};
var _emscripten_glGetBufferParameteriv = (target, value, data) => {
    if (!data) {
        GL.recordError(1281);
        return
    }
    HEAP32[data >> 2] = GLctx.getBufferParameter(target, value)
};
var _emscripten_glGetBufferPointerv = (target, pname, params) => {
    if (pname == 35005) {
        var ptr = 0;
        var mappedBuffer = GL.mappedBuffers[emscriptenWebGLGetBufferBinding(target)];
        if (mappedBuffer) {
            ptr = mappedBuffer.mem
        }
        HEAP32[params >> 2] = ptr
    } else {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glGetBufferPointerv")
    }
};
var _emscripten_glGetError = () => {
    var error = GLctx.getError() || GL.lastError;
    GL.lastError = 0;
    return error
};
var _emscripten_glGetFloatv = (name_, p) => emscriptenWebGLGet(name_, p, 2);
var _emscripten_glGetFragDataLocation = (program, name) => GLctx.getFragDataLocation(GL.programs[program], UTF8ToString(name));
var _emscripten_glGetFramebufferAttachmentParameteriv = (target, attachment, pname, params) => {
    var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
    if (result instanceof WebGLRenderbuffer || result instanceof WebGLTexture) {
        result = result.name | 0
    }
    HEAP32[params >> 2] = result
};
var emscriptenWebGLGetIndexed = (target, index, data, type) => {
    if (!data) {
        GL.recordError(1281);
        return
    }
    var result = GLctx.getIndexedParameter(target, index);
    var ret;
    switch (typeof result) {
        case "boolean":
            ret = result ? 1 : 0;
            break;
        case "number":
            ret = result;
            break;
        case "object":
            if (result === null) {
                switch (target) {
                    case 35983:
                    case 35368:
                        ret = 0;
                        break;
                    default: {
                        GL.recordError(1280);
                        return
                    }
                }
            } else if (result instanceof WebGLBuffer) {
                ret = result.name | 0
            } else {
                GL.recordError(1280);
                return
            }
            break;
        default:
            GL.recordError(1280);
            return
    }
    switch (type) {
        case 1:
            writeI53ToI64(data, ret);
            break;
        case 0:
            HEAP32[data >> 2] = ret;
            break;
        case 2:
            HEAPF32[data >> 2] = ret;
            break;
        case 4:
            HEAP8[data] = ret ? 1 : 0;
            break;
        default:
            abort("internal emscriptenWebGLGetIndexed() error, bad type: " + type)
    }
};
var _emscripten_glGetInteger64i_v = (target, index, data) => emscriptenWebGLGetIndexed(target, index, data, 1);
var _emscripten_glGetInteger64v = (name_, p) => {
    emscriptenWebGLGet(name_, p, 1)
};
var _emscripten_glGetIntegeri_v = (target, index, data) => emscriptenWebGLGetIndexed(target, index, data, 0);
var _emscripten_glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);
var _emscripten_glGetInternalformativ = (target, internalformat, pname, bufSize, params) => {
    if (bufSize < 0) {
        GL.recordError(1281);
        return
    }
    if (!params) {
        GL.recordError(1281);
        return
    }
    var ret = GLctx.getInternalformatParameter(target, internalformat, pname);
    if (ret === null) return;
    for (var i = 0; i < ret.length && i < bufSize; ++i) {
        HEAP32[params + i * 4 >> 2] = ret[i]
    }
};
var _emscripten_glGetProgramBinary = (program, bufSize, length, binaryFormat, binary) => {
    GL.recordError(1282)
};
var _emscripten_glGetProgramInfoLog = (program, maxLength, length, infoLog) => {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
};
var _emscripten_glGetProgramiv = (program, pname, p) => {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (program >= GL.counter) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    if (pname == 35716) {
        var log = GLctx.getProgramInfoLog(program);
        if (log === null) log = "(unknown error)";
        HEAP32[p >> 2] = log.length + 1
    } else if (pname == 35719) {
        if (!program.maxUniformLength) {
            var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
            for (var i = 0; i < numActiveUniforms; ++i) {
                program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxUniformLength
    } else if (pname == 35722) {
        if (!program.maxAttributeLength) {
            var numActiveAttributes = GLctx.getProgramParameter(program, 35721);
            for (var i = 0; i < numActiveAttributes; ++i) {
                program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxAttributeLength
    } else if (pname == 35381) {
        if (!program.maxUniformBlockNameLength) {
            var numActiveUniformBlocks = GLctx.getProgramParameter(program, 35382);
            for (var i = 0; i < numActiveUniformBlocks; ++i) {
                program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxUniformBlockNameLength
    } else {
        HEAP32[p >> 2] = GLctx.getProgramParameter(program, pname)
    }
};
var _emscripten_glGetQueryObjecti64vEXT = (id, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.queries[id];
    var param;
    if (GL.currentContext.version < 2) {
        param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname)
    } else {
        param = GLctx.getQueryParameter(query, pname)
    }
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    writeI53ToI64(params, ret)
};
var _emscripten_glGetQueryObjectivEXT = (id, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.queries[id];
    var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    HEAP32[params >> 2] = ret
};
var _emscripten_glGetQueryObjectui64vEXT = _emscripten_glGetQueryObjecti64vEXT;
var _emscripten_glGetQueryObjectuiv = (id, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    var query = GL.queries[id];
    var param = GLctx.getQueryParameter(query, pname);
    var ret;
    if (typeof param == "boolean") {
        ret = param ? 1 : 0
    } else {
        ret = param
    }
    HEAP32[params >> 2] = ret
};
var _emscripten_glGetQueryObjectuivEXT = _emscripten_glGetQueryObjectivEXT;
var _emscripten_glGetQueryiv = (target, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.getQuery(target, pname)
};
var _emscripten_glGetQueryivEXT = (target, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname)
};
var _emscripten_glGetRenderbufferParameteriv = (target, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.getRenderbufferParameter(target, pname)
};
var _emscripten_glGetSamplerParameterfv = (sampler, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAPF32[params >> 2] = GLctx.getSamplerParameter(GL.samplers[sampler], pname)
};
var _emscripten_glGetSamplerParameteriv = (sampler, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.getSamplerParameter(GL.samplers[sampler], pname)
};
var _emscripten_glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
};
var _emscripten_glGetShaderPrecisionFormat = (shaderType, precisionType, range, precision) => {
    var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
    HEAP32[range >> 2] = result.rangeMin;
    HEAP32[range + 4 >> 2] = result.rangeMax;
    HEAP32[precision >> 2] = result.precision
};
var _emscripten_glGetShaderSource = (shader, bufSize, length, source) => {
    var result = GLctx.getShaderSource(GL.shaders[shader]);
    if (!result) return;
    var numBytesWrittenExclNull = bufSize > 0 && source ? stringToUTF8(result, source, bufSize) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
};
var _emscripten_glGetShaderiv = (shader, pname, p) => {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = "(unknown error)";
        var logLength = log ? log.length + 1 : 0;
        HEAP32[p >> 2] = logLength
    } else if (pname == 35720) {
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[p >> 2] = sourceLength
    } else {
        HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)
    }
};
var _emscripten_glGetString = name_ => {
    var ret = GL.stringCache[name_];
    if (!ret) {
        switch (name_) {
            case 7939:
                ret = stringToNewUTF8(webglGetExtensions().join(" "));
                break;
            case 7936:
            case 7937:
            case 37445:
            case 37446:
                var s = GLctx.getParameter(name_);
                if (!s) {
                    GL.recordError(1280)
                }
                ret = s ? stringToNewUTF8(s) : 0;
                break;
            case 7938:
                var webGLVersion = GLctx.getParameter(7938);
                var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
                if (GL.currentContext.version >= 2) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
                ret = stringToNewUTF8(glVersion);
                break;
            case 35724:
                var glslVersion = GLctx.getParameter(35724);
                var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
                var ver_num = glslVersion.match(ver_re);
                if (ver_num !== null) {
                    if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
                    glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`
                }
                ret = stringToNewUTF8(glslVersion);
                break;
            default:
                GL.recordError(1280)
        }
        GL.stringCache[name_] = ret
    }
    return ret
};
var _emscripten_glGetStringi = (name, index) => {
    if (GL.currentContext.version < 2) {
        GL.recordError(1282);
        return 0
    }
    var stringiCache = GL.stringiCache[name];
    if (stringiCache) {
        if (index < 0 || index >= stringiCache.length) {
            GL.recordError(1281);
            return 0
        }
        return stringiCache[index]
    }
    switch (name) {
        case 7939:
            var exts = webglGetExtensions().map(stringToNewUTF8);
            stringiCache = GL.stringiCache[name] = exts;
            if (index < 0 || index >= stringiCache.length) {
                GL.recordError(1281);
                return 0
            }
            return stringiCache[index];
        default:
            GL.recordError(1280);
            return 0
    }
};
var _emscripten_glGetSynciv = (sync, pname, bufSize, length, values) => {
    if (bufSize < 0) {
        GL.recordError(1281);
        return
    }
    if (!values) {
        GL.recordError(1281);
        return
    }
    var ret = GLctx.getSyncParameter(GL.syncs[sync], pname);
    if (ret !== null) {
        HEAP32[values >> 2] = ret;
        if (length) HEAP32[length >> 2] = 1
    }
};
var _emscripten_glGetTexParameterfv = (target, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAPF32[params >> 2] = GLctx.getTexParameter(target, pname)
};
var _emscripten_glGetTexParameteriv = (target, pname, params) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    HEAP32[params >> 2] = GLctx.getTexParameter(target, pname)
};
var _emscripten_glGetTransformFeedbackVarying = (program, index, bufSize, length, size, type, name) => {
    program = GL.programs[program];
    var info = GLctx.getTransformFeedbackVarying(program, index);
    if (!info) return;
    if (name && bufSize > 0) {
        var numBytesWrittenExclNull = stringToUTF8(info.name, name, bufSize);
        if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
    } else {
        if (length) HEAP32[length >> 2] = 0
    }
    if (size) HEAP32[size >> 2] = info.size;
    if (type) HEAP32[type >> 2] = info.type
};
var _emscripten_glGetUniformBlockIndex = (program, uniformBlockName) => GLctx.getUniformBlockIndex(GL.programs[program], UTF8ToString(uniformBlockName));
var _emscripten_glGetUniformIndices = (program, uniformCount, uniformNames, uniformIndices) => {
    if (!uniformIndices) {
        GL.recordError(1281);
        return
    }
    if (uniformCount > 0 && (uniformNames == 0 || uniformIndices == 0)) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    var names = [];
    for (var i = 0; i < uniformCount; i++) names.push(UTF8ToString(HEAPU32[uniformNames + i * 4 >> 2]));
    var result = GLctx.getUniformIndices(program, names);
    if (!result) return;
    var len = result.length;
    for (var i = 0; i < len; i++) {
        HEAP32[uniformIndices + i * 4 >> 2] = result[i]
    }
};
var jstoi_q = str => parseInt(str);
var webglGetLeftBracePos = name => name.slice(-1) == "]" && name.lastIndexOf("[");
var webglPrepareUniformLocationsBeforeFirstUse = program => {
    var uniformLocsById = program.uniformLocsById,
        uniformSizeAndIdsByName = program.uniformSizeAndIdsByName,
        i, j;
    if (!uniformLocsById) {
        program.uniformLocsById = uniformLocsById = {};
        program.uniformArrayNamesById = {};
        var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
        for (i = 0; i < numActiveUniforms; ++i) {
            var u = GLctx.getActiveUniform(program, i);
            var nm = u.name;
            var sz = u.size;
            var lb = webglGetLeftBracePos(nm);
            var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
            var id = program.uniformIdCounter;
            program.uniformIdCounter += sz;
            uniformSizeAndIdsByName[arrayName] = [sz, id];
            for (j = 0; j < sz; ++j) {
                uniformLocsById[id] = j;
                program.uniformArrayNamesById[id++] = arrayName
            }
        }
    }
};
var _emscripten_glGetUniformLocation = (program, name) => {
    name = UTF8ToString(name);
    if (program = GL.programs[program]) {
        webglPrepareUniformLocationsBeforeFirstUse(program);
        var uniformLocsById = program.uniformLocsById;
        var arrayIndex = 0;
        var uniformBaseName = name;
        var leftBrace = webglGetLeftBracePos(name);
        if (leftBrace > 0) {
            arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
            uniformBaseName = name.slice(0, leftBrace)
        }
        var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
        if (sizeAndId && arrayIndex < sizeAndId[0]) {
            arrayIndex += sizeAndId[1];
            if (uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name)) {
                return arrayIndex
            }
        }
    } else {
        GL.recordError(1281)
    }
    return -1
};
var webglGetUniformLocation = location => {
    var p = GLctx.currentProgram;
    if (p) {
        var webglLoc = p.uniformLocsById[location];
        if (typeof webglLoc == "number") {
            p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? `[${webglLoc}]` : ""))
        }
        return webglLoc
    } else {
        GL.recordError(1282)
    }
};
var emscriptenWebGLGetUniform = (program, location, params, type) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    webglPrepareUniformLocationsBeforeFirstUse(program);
    var data = GLctx.getUniform(program, webglGetUniformLocation(location));
    if (typeof data == "number" || typeof data == "boolean") {
        switch (type) {
            case 0:
                HEAP32[params >> 2] = data;
                break;
            case 2:
                HEAPF32[params >> 2] = data;
                break
        }
    } else {
        for (var i = 0; i < data.length; i++) {
            switch (type) {
                case 0:
                    HEAP32[params + i * 4 >> 2] = data[i];
                    break;
                case 2:
                    HEAPF32[params + i * 4 >> 2] = data[i];
                    break
            }
        }
    }
};
var _emscripten_glGetUniformfv = (program, location, params) => {
    emscriptenWebGLGetUniform(program, location, params, 2)
};
var _emscripten_glGetUniformiv = (program, location, params) => {
    emscriptenWebGLGetUniform(program, location, params, 0)
};
var _emscripten_glGetUniformuiv = (program, location, params) => emscriptenWebGLGetUniform(program, location, params, 0);
var emscriptenWebGLGetVertexAttrib = (index, pname, params, type) => {
    if (!params) {
        GL.recordError(1281);
        return
    }
    if (GL.currentContext.clientBuffers[index].enabled) {
        err("glGetVertexAttrib*v on client-side array: not supported, bad data returned")
    }
    var data = GLctx.getVertexAttrib(index, pname);
    if (pname == 34975) {
        HEAP32[params >> 2] = data && data["name"]
    } else if (typeof data == "number" || typeof data == "boolean") {
        switch (type) {
            case 0:
                HEAP32[params >> 2] = data;
                break;
            case 2:
                HEAPF32[params >> 2] = data;
                break;
            case 5:
                HEAP32[params >> 2] = Math.fround(data);
                break
        }
    } else {
        for (var i = 0; i < data.length; i++) {
            switch (type) {
                case 0:
                    HEAP32[params + i * 4 >> 2] = data[i];
                    break;
                case 2:
                    HEAPF32[params + i * 4 >> 2] = data[i];
                    break;
                case 5:
                    HEAP32[params + i * 4 >> 2] = Math.fround(data[i]);
                    break
            }
        }
    }
};
var _emscripten_glGetVertexAttribIiv = (index, pname, params) => {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 0)
};
var _emscripten_glGetVertexAttribIuiv = _emscripten_glGetVertexAttribIiv;
var _emscripten_glGetVertexAttribPointerv = (index, pname, pointer) => {
    if (!pointer) {
        GL.recordError(1281);
        return
    }
    if (GL.currentContext.clientBuffers[index].enabled) {
        err("glGetVertexAttribPointer on client-side array: not supported, bad data returned")
    }
    HEAP32[pointer >> 2] = GLctx.getVertexAttribOffset(index, pname)
};
var _emscripten_glGetVertexAttribfv = (index, pname, params) => {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 2)
};
var _emscripten_glGetVertexAttribiv = (index, pname, params) => {
    emscriptenWebGLGetVertexAttrib(index, pname, params, 5)
};
var _emscripten_glHint = (x0, x1) => GLctx.hint(x0, x1);
var _emscripten_glInvalidateFramebuffer = (target, numAttachments, attachments) => {
    var list = tempFixedLengthArray[numAttachments];
    for (var i = 0; i < numAttachments; i++) {
        list[i] = HEAP32[attachments + i * 4 >> 2]
    }
    GLctx.invalidateFramebuffer(target, list)
};
var _emscripten_glInvalidateSubFramebuffer = (target, numAttachments, attachments, x, y, width, height) => {
    var list = tempFixedLengthArray[numAttachments];
    for (var i = 0; i < numAttachments; i++) {
        list[i] = HEAP32[attachments + i * 4 >> 2]
    }
    GLctx.invalidateSubFramebuffer(target, list, x, y, width, height)
};
var _emscripten_glIsBuffer = buffer => {
    var b = GL.buffers[buffer];
    if (!b) return 0;
    return GLctx.isBuffer(b)
};
var _emscripten_glIsEnabled = x0 => GLctx.isEnabled(x0);
var _emscripten_glIsFramebuffer = framebuffer => {
    var fb = GL.framebuffers[framebuffer];
    if (!fb) return 0;
    return GLctx.isFramebuffer(fb)
};
var _emscripten_glIsProgram = program => {
    program = GL.programs[program];
    if (!program) return 0;
    return GLctx.isProgram(program)
};
var _emscripten_glIsQuery = id => {
    var query = GL.queries[id];
    if (!query) return 0;
    return GLctx.isQuery(query)
};
var _emscripten_glIsQueryEXT = id => {
    var query = GL.queries[id];
    if (!query) return 0;
    return GLctx.disjointTimerQueryExt["isQueryEXT"](query)
};
var _emscripten_glIsRenderbuffer = renderbuffer => {
    var rb = GL.renderbuffers[renderbuffer];
    if (!rb) return 0;
    return GLctx.isRenderbuffer(rb)
};
var _emscripten_glIsSampler = id => {
    var sampler = GL.samplers[id];
    if (!sampler) return 0;
    return GLctx.isSampler(sampler)
};
var _emscripten_glIsShader = shader => {
    var s = GL.shaders[shader];
    if (!s) return 0;
    return GLctx.isShader(s)
};
var _emscripten_glIsSync = sync => GLctx.isSync(GL.syncs[sync]);
var _emscripten_glIsTexture = id => {
    var texture = GL.textures[id];
    if (!texture) return 0;
    return GLctx.isTexture(texture)
};
var _emscripten_glIsTransformFeedback = id => GLctx.isTransformFeedback(GL.transformFeedbacks[id]);
var _emscripten_glIsVertexArray = array => {
    var vao = GL.vaos[array];
    if (!vao) return 0;
    return GLctx.isVertexArray(vao)
};
var _emscripten_glIsVertexArrayOES = _emscripten_glIsVertexArray;
var _emscripten_glLineWidth = x0 => GLctx.lineWidth(x0);
var _emscripten_glLinkProgram = program => {
    program = GL.programs[program];
    GLctx.linkProgram(program);
    program.uniformLocsById = 0;
    program.uniformSizeAndIdsByName = {}
};
var _emscripten_glMapBufferRange = (target, offset, length, access) => {
    if ((access & (1 | 32)) != 0) {
        err("glMapBufferRange access does not support MAP_READ or MAP_UNSYNCHRONIZED");
        return 0
    }
    if ((access & 2) == 0) {
        err("glMapBufferRange access must include MAP_WRITE");
        return 0
    }
    if ((access & (4 | 8)) == 0) {
        err("glMapBufferRange access must include INVALIDATE_BUFFER or INVALIDATE_RANGE");
        return 0
    }
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glMapBufferRange");
        return 0
    }
    var mem = _malloc(length),
        binding = emscriptenWebGLGetBufferBinding(target);
    if (!mem) return 0;
    binding = GL.mappedBuffers[binding] ??= {};
    binding.offset = offset;
    binding.length = length;
    binding.mem = mem;
    binding.access = access;
    return mem
};
var _emscripten_glPauseTransformFeedback = () => GLctx.pauseTransformFeedback();
var _emscripten_glPixelStorei = (pname, param) => {
    if (pname == 3317) {
        GL.unpackAlignment = param
    } else if (pname == 3314) {
        GL.unpackRowLength = param
    }
    GLctx.pixelStorei(pname, param)
};
var _emscripten_glPolygonModeWEBGL = (face, mode) => {
    GLctx.webglPolygonMode["polygonModeWEBGL"](face, mode)
};
var _emscripten_glPolygonOffset = (x0, x1) => GLctx.polygonOffset(x0, x1);
var _emscripten_glPolygonOffsetClampEXT = (factor, units, clamp) => {
    GLctx.extPolygonOffsetClamp["polygonOffsetClampEXT"](factor, units, clamp)
};
var _emscripten_glProgramBinary = (program, binaryFormat, binary, length) => {
    GL.recordError(1280)
};
var _emscripten_glProgramParameteri = (program, pname, value) => {
    GL.recordError(1280)
};
var _emscripten_glQueryCounterEXT = (id, target) => {
    GLctx.disjointTimerQueryExt["queryCounterEXT"](GL.queries[id], target)
};
var _emscripten_glReadBuffer = x0 => GLctx.readBuffer(x0);
var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
    function roundedToNextMultipleOf(x, y) {
        return x + y - 1 & -y
    }
    var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
    var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
    return height * alignedRowSize
};
var colorChannelsInGlTextureFormat = format => {
    var colorChannels = {
        5: 3,
        6: 4,
        8: 2,
        29502: 3,
        29504: 4,
        26917: 2,
        26918: 2,
        29846: 3,
        29847: 4
    };
    return colorChannels[format - 6402] || 1
};
var heapObjectForWebGLType = type => {
    type -= 5120;
    if (type == 0) return HEAP8;
    if (type == 1) return HEAPU8;
    if (type == 2) return HEAP16;
    if (type == 4) return HEAP32;
    if (type == 6) return HEAPF32;
    if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782) return HEAPU32;
    return HEAPU16
};
var toTypedArrayIndex = (pointer, heap) => pointer >>> 31 - Math.clz32(heap.BYTES_PER_ELEMENT);
var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels, internalFormat) => {
    var heap = heapObjectForWebGLType(type);
    var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
    var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
    return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap))
};
var _emscripten_glReadPixels = (x, y, width, height, format, type, pixels) => {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelPackBufferBinding) {
            GLctx.readPixels(x, y, width, height, format, type, pixels);
            return
        }
        var heap = heapObjectForWebGLType(type);
        var target = toTypedArrayIndex(pixels, heap);
        GLctx.readPixels(x, y, width, height, format, type, heap, target);
        return
    }
    var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
    if (!pixelData) {
        GL.recordError(1280);
        return
    }
    GLctx.readPixels(x, y, width, height, format, type, pixelData)
};
var _emscripten_glReleaseShaderCompiler = () => {};
var _emscripten_glRenderbufferStorage = (x0, x1, x2, x3) => GLctx.renderbufferStorage(x0, x1, x2, x3);
var _emscripten_glRenderbufferStorageMultisample = (x0, x1, x2, x3, x4) => GLctx.renderbufferStorageMultisample(x0, x1, x2, x3, x4);
var _emscripten_glResumeTransformFeedback = () => GLctx.resumeTransformFeedback();
var _emscripten_glSampleCoverage = (value, invert) => {
    GLctx.sampleCoverage(value, !!invert)
};
var _emscripten_glSamplerParameterf = (sampler, pname, param) => {
    GLctx.samplerParameterf(GL.samplers[sampler], pname, param)
};
var _emscripten_glSamplerParameterfv = (sampler, pname, params) => {
    var param = HEAPF32[params >> 2];
    GLctx.samplerParameterf(GL.samplers[sampler], pname, param)
};
var _emscripten_glSamplerParameteri = (sampler, pname, param) => {
    GLctx.samplerParameteri(GL.samplers[sampler], pname, param)
};
var _emscripten_glSamplerParameteriv = (sampler, pname, params) => {
    var param = HEAP32[params >> 2];
    GLctx.samplerParameteri(GL.samplers[sampler], pname, param)
};
var _emscripten_glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);
var _emscripten_glShaderBinary = (count, shaders, binaryformat, binary, length) => {
    GL.recordError(1280)
};
var _emscripten_glShaderSource = (shader, count, string, length) => {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source)
};
var _emscripten_glStencilFunc = (x0, x1, x2) => GLctx.stencilFunc(x0, x1, x2);
var _emscripten_glStencilFuncSeparate = (x0, x1, x2, x3) => GLctx.stencilFuncSeparate(x0, x1, x2, x3);
var _emscripten_glStencilMask = x0 => GLctx.stencilMask(x0);
var _emscripten_glStencilMaskSeparate = (x0, x1) => GLctx.stencilMaskSeparate(x0, x1);
var _emscripten_glStencilOp = (x0, x1, x2) => GLctx.stencilOp(x0, x1, x2);
var _emscripten_glStencilOpSeparate = (x0, x1, x2, x3) => GLctx.stencilOpSeparate(x0, x1, x2, x3);
var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
            return
        }
        if (pixels) {
            var heap = heapObjectForWebGLType(type);
            var index = toTypedArrayIndex(pixels, heap);
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
            return
        }
    }
    var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null;
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData)
};
var _emscripten_glTexImage3D = (target, level, internalFormat, width, height, depth, border, format, type, pixels) => {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, pixels)
    } else if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, heap, toTypedArrayIndex(pixels, heap))
    } else {
        GLctx.texImage3D(target, level, internalFormat, width, height, depth, border, format, type, null)
    }
};
var _emscripten_glTexParameterf = (x0, x1, x2) => GLctx.texParameterf(x0, x1, x2);
var _emscripten_glTexParameterfv = (target, pname, params) => {
    var param = HEAPF32[params >> 2];
    GLctx.texParameterf(target, pname, param)
};
var _emscripten_glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);
var _emscripten_glTexParameteriv = (target, pname, params) => {
    var param = HEAP32[params >> 2];
    GLctx.texParameteri(target, pname, param)
};
var _emscripten_glTexStorage2D = (x0, x1, x2, x3, x4) => GLctx.texStorage2D(x0, x1, x2, x3, x4);
var _emscripten_glTexStorage3D = (x0, x1, x2, x3, x4, x5) => GLctx.texStorage3D(x0, x1, x2, x3, x4, x5);
var _emscripten_glTexSubImage2D = (target, level, xoffset, yoffset, width, height, format, type, pixels) => {
    if (GL.currentContext.version >= 2) {
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels);
            return
        }
        if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, heap, toTypedArrayIndex(pixels, heap));
            return
        }
    }
    var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0) : null;
    GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData)
};
var _emscripten_glTexSubImage3D = (target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels) => {
    if (GLctx.currentPixelUnpackBufferBinding) {
        GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels)
    } else if (pixels) {
        var heap = heapObjectForWebGLType(type);
        GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, heap, toTypedArrayIndex(pixels, heap))
    } else {
        GLctx.texSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, null)
    }
};
var _emscripten_glTransformFeedbackVaryings = (program, count, varyings, bufferMode) => {
    program = GL.programs[program];
    var vars = [];
    for (var i = 0; i < count; i++) vars.push(UTF8ToString(HEAPU32[varyings + i * 4 >> 2]));
    GLctx.transformFeedbackVaryings(program, vars, bufferMode)
};
var _emscripten_glUniform1f = (location, v0) => {
    GLctx.uniform1f(webglGetUniformLocation(location), v0)
};
var miniTempWebGLFloatBuffers = [];
var _emscripten_glUniform1fv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform1fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count);
        return
    }
    if (count <= 288) {
        var view = miniTempWebGLFloatBuffers[count];
        for (var i = 0; i < count; ++i) {
            view[i] = HEAPF32[value + 4 * i >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 4 >> 2)
    }
    GLctx.uniform1fv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform1i = (location, v0) => {
    GLctx.uniform1i(webglGetUniformLocation(location), v0)
};
var miniTempWebGLIntBuffers = [];
var _emscripten_glUniform1iv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform1iv(webglGetUniformLocation(location), HEAP32, value >> 2, count);
        return
    }
    if (count <= 288) {
        var view = miniTempWebGLIntBuffers[count];
        for (var i = 0; i < count; ++i) {
            view[i] = HEAP32[value + 4 * i >> 2]
        }
    } else {
        var view = HEAP32.subarray(value >> 2, value + count * 4 >> 2)
    }
    GLctx.uniform1iv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform1ui = (location, v0) => {
    GLctx.uniform1ui(webglGetUniformLocation(location), v0)
};
var _emscripten_glUniform1uiv = (location, count, value) => {
    count && GLctx.uniform1uiv(webglGetUniformLocation(location), HEAPU32, value >> 2, count)
};
var _emscripten_glUniform2f = (location, v0, v1) => {
    GLctx.uniform2f(webglGetUniformLocation(location), v0, v1)
};
var _emscripten_glUniform2fv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform2fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count * 2);
        return
    }
    if (count <= 144) {
        count *= 2;
        var view = miniTempWebGLFloatBuffers[count];
        for (var i = 0; i < count; i += 2) {
            view[i] = HEAPF32[value + 4 * i >> 2];
            view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 8 >> 2)
    }
    GLctx.uniform2fv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform2i = (location, v0, v1) => {
    GLctx.uniform2i(webglGetUniformLocation(location), v0, v1)
};
var _emscripten_glUniform2iv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform2iv(webglGetUniformLocation(location), HEAP32, value >> 2, count * 2);
        return
    }
    if (count <= 144) {
        count *= 2;
        var view = miniTempWebGLIntBuffers[count];
        for (var i = 0; i < count; i += 2) {
            view[i] = HEAP32[value + 4 * i >> 2];
            view[i + 1] = HEAP32[value + (4 * i + 4) >> 2]
        }
    } else {
        var view = HEAP32.subarray(value >> 2, value + count * 8 >> 2)
    }
    GLctx.uniform2iv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform2ui = (location, v0, v1) => {
    GLctx.uniform2ui(webglGetUniformLocation(location), v0, v1)
};
var _emscripten_glUniform2uiv = (location, count, value) => {
    count && GLctx.uniform2uiv(webglGetUniformLocation(location), HEAPU32, value >> 2, count * 2)
};
var _emscripten_glUniform3f = (location, v0, v1, v2) => {
    GLctx.uniform3f(webglGetUniformLocation(location), v0, v1, v2)
};
var _emscripten_glUniform3fv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform3fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count * 3);
        return
    }
    if (count <= 96) {
        count *= 3;
        var view = miniTempWebGLFloatBuffers[count];
        for (var i = 0; i < count; i += 3) {
            view[i] = HEAPF32[value + 4 * i >> 2];
            view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2];
            view[i + 2] = HEAPF32[value + (4 * i + 8) >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 12 >> 2)
    }
    GLctx.uniform3fv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform3i = (location, v0, v1, v2) => {
    GLctx.uniform3i(webglGetUniformLocation(location), v0, v1, v2)
};
var _emscripten_glUniform3iv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform3iv(webglGetUniformLocation(location), HEAP32, value >> 2, count * 3);
        return
    }
    if (count <= 96) {
        count *= 3;
        var view = miniTempWebGLIntBuffers[count];
        for (var i = 0; i < count; i += 3) {
            view[i] = HEAP32[value + 4 * i >> 2];
            view[i + 1] = HEAP32[value + (4 * i + 4) >> 2];
            view[i + 2] = HEAP32[value + (4 * i + 8) >> 2]
        }
    } else {
        var view = HEAP32.subarray(value >> 2, value + count * 12 >> 2)
    }
    GLctx.uniform3iv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform3ui = (location, v0, v1, v2) => {
    GLctx.uniform3ui(webglGetUniformLocation(location), v0, v1, v2)
};
var _emscripten_glUniform3uiv = (location, count, value) => {
    count && GLctx.uniform3uiv(webglGetUniformLocation(location), HEAPU32, value >> 2, count * 3)
};
var _emscripten_glUniform4f = (location, v0, v1, v2, v3) => {
    GLctx.uniform4f(webglGetUniformLocation(location), v0, v1, v2, v3)
};
var _emscripten_glUniform4fv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform4fv(webglGetUniformLocation(location), HEAPF32, value >> 2, count * 4);
        return
    }
    if (count <= 72) {
        var view = miniTempWebGLFloatBuffers[4 * count];
        var heap = HEAPF32;
        value = value >> 2;
        count *= 4;
        for (var i = 0; i < count; i += 4) {
            var dst = value + i;
            view[i] = heap[dst];
            view[i + 1] = heap[dst + 1];
            view[i + 2] = heap[dst + 2];
            view[i + 3] = heap[dst + 3]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 16 >> 2)
    }
    GLctx.uniform4fv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform4i = (location, v0, v1, v2, v3) => {
    GLctx.uniform4i(webglGetUniformLocation(location), v0, v1, v2, v3)
};
var _emscripten_glUniform4iv = (location, count, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniform4iv(webglGetUniformLocation(location), HEAP32, value >> 2, count * 4);
        return
    }
    if (count <= 72) {
        count *= 4;
        var view = miniTempWebGLIntBuffers[count];
        for (var i = 0; i < count; i += 4) {
            view[i] = HEAP32[value + 4 * i >> 2];
            view[i + 1] = HEAP32[value + (4 * i + 4) >> 2];
            view[i + 2] = HEAP32[value + (4 * i + 8) >> 2];
            view[i + 3] = HEAP32[value + (4 * i + 12) >> 2]
        }
    } else {
        var view = HEAP32.subarray(value >> 2, value + count * 16 >> 2)
    }
    GLctx.uniform4iv(webglGetUniformLocation(location), view)
};
var _emscripten_glUniform4ui = (location, v0, v1, v2, v3) => {
    GLctx.uniform4ui(webglGetUniformLocation(location), v0, v1, v2, v3)
};
var _emscripten_glUniform4uiv = (location, count, value) => {
    count && GLctx.uniform4uiv(webglGetUniformLocation(location), HEAPU32, value >> 2, count * 4)
};
var _emscripten_glUniformBlockBinding = (program, uniformBlockIndex, uniformBlockBinding) => {
    program = GL.programs[program];
    GLctx.uniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding)
};
var _emscripten_glUniformMatrix2fv = (location, count, transpose, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniformMatrix2fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 4);
        return
    }
    if (count <= 72) {
        count *= 4;
        var view = miniTempWebGLFloatBuffers[count];
        for (var i = 0; i < count; i += 4) {
            view[i] = HEAPF32[value + 4 * i >> 2];
            view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2];
            view[i + 2] = HEAPF32[value + (4 * i + 8) >> 2];
            view[i + 3] = HEAPF32[value + (4 * i + 12) >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 16 >> 2)
    }
    GLctx.uniformMatrix2fv(webglGetUniformLocation(location), !!transpose, view)
};
var _emscripten_glUniformMatrix2x3fv = (location, count, transpose, value) => {
    count && GLctx.uniformMatrix2x3fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 6)
};
var _emscripten_glUniformMatrix2x4fv = (location, count, transpose, value) => {
    count && GLctx.uniformMatrix2x4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 8)
};
var _emscripten_glUniformMatrix3fv = (location, count, transpose, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 9);
        return
    }
    if (count <= 32) {
        count *= 9;
        var view = miniTempWebGLFloatBuffers[count];
        for (var i = 0; i < count; i += 9) {
            view[i] = HEAPF32[value + 4 * i >> 2];
            view[i + 1] = HEAPF32[value + (4 * i + 4) >> 2];
            view[i + 2] = HEAPF32[value + (4 * i + 8) >> 2];
            view[i + 3] = HEAPF32[value + (4 * i + 12) >> 2];
            view[i + 4] = HEAPF32[value + (4 * i + 16) >> 2];
            view[i + 5] = HEAPF32[value + (4 * i + 20) >> 2];
            view[i + 6] = HEAPF32[value + (4 * i + 24) >> 2];
            view[i + 7] = HEAPF32[value + (4 * i + 28) >> 2];
            view[i + 8] = HEAPF32[value + (4 * i + 32) >> 2]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 36 >> 2)
    }
    GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, view)
};
var _emscripten_glUniformMatrix3x2fv = (location, count, transpose, value) => {
    count && GLctx.uniformMatrix3x2fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 6)
};
var _emscripten_glUniformMatrix3x4fv = (location, count, transpose, value) => {
    count && GLctx.uniformMatrix3x4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 12)
};
var _emscripten_glUniformMatrix4fv = (location, count, transpose, value) => {
    if (GL.currentContext.version >= 2) {
        count && GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 16);
        return
    }
    if (count <= 18) {
        var view = miniTempWebGLFloatBuffers[16 * count];
        var heap = HEAPF32;
        value = value >> 2;
        count *= 16;
        for (var i = 0; i < count; i += 16) {
            var dst = value + i;
            view[i] = heap[dst];
            view[i + 1] = heap[dst + 1];
            view[i + 2] = heap[dst + 2];
            view[i + 3] = heap[dst + 3];
            view[i + 4] = heap[dst + 4];
            view[i + 5] = heap[dst + 5];
            view[i + 6] = heap[dst + 6];
            view[i + 7] = heap[dst + 7];
            view[i + 8] = heap[dst + 8];
            view[i + 9] = heap[dst + 9];
            view[i + 10] = heap[dst + 10];
            view[i + 11] = heap[dst + 11];
            view[i + 12] = heap[dst + 12];
            view[i + 13] = heap[dst + 13];
            view[i + 14] = heap[dst + 14];
            view[i + 15] = heap[dst + 15]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 64 >> 2)
    }
    GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view)
};
var _emscripten_glUniformMatrix4x2fv = (location, count, transpose, value) => {
    count && GLctx.uniformMatrix4x2fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 8)
};
var _emscripten_glUniformMatrix4x3fv = (location, count, transpose, value) => {
    count && GLctx.uniformMatrix4x3fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 12)
};
var _emscripten_glUnmapBuffer = target => {
    if (!emscriptenWebGLValidateMapBufferTarget(target)) {
        GL.recordError(1280);
        err("GL_INVALID_ENUM in glUnmapBuffer");
        return 0
    }
    var buffer = emscriptenWebGLGetBufferBinding(target);
    var mapping = GL.mappedBuffers[buffer];
    if (!mapping || !mapping.mem) {
        GL.recordError(1282);
        err("buffer was never mapped in glUnmapBuffer");
        return 0
    }
    if (!(mapping.access & 16)) {
        if (GL.currentContext.version >= 2) {
            GLctx.bufferSubData(target, mapping.offset, HEAPU8, mapping.mem, mapping.length)
        } else GLctx.bufferSubData(target, mapping.offset, HEAPU8.subarray(mapping.mem, mapping.mem + mapping.length))
    }
    _free(mapping.mem);
    mapping.mem = 0;
    return 1
};
var _emscripten_glUseProgram = program => {
    program = GL.programs[program];
    GLctx.useProgram(program);
    GLctx.currentProgram = program
};
var _emscripten_glValidateProgram = program => {
    GLctx.validateProgram(GL.programs[program])
};
var _emscripten_glVertexAttrib1f = (x0, x1) => GLctx.vertexAttrib1f(x0, x1);
var _emscripten_glVertexAttrib1fv = (index, v) => {
    GLctx.vertexAttrib1f(index, HEAPF32[v >> 2])
};
var _emscripten_glVertexAttrib2f = (x0, x1, x2) => GLctx.vertexAttrib2f(x0, x1, x2);
var _emscripten_glVertexAttrib2fv = (index, v) => {
    GLctx.vertexAttrib2f(index, HEAPF32[v >> 2], HEAPF32[v + 4 >> 2])
};
var _emscripten_glVertexAttrib3f = (x0, x1, x2, x3) => GLctx.vertexAttrib3f(x0, x1, x2, x3);
var _emscripten_glVertexAttrib3fv = (index, v) => {
    GLctx.vertexAttrib3f(index, HEAPF32[v >> 2], HEAPF32[v + 4 >> 2], HEAPF32[v + 8 >> 2])
};
var _emscripten_glVertexAttrib4f = (x0, x1, x2, x3, x4) => GLctx.vertexAttrib4f(x0, x1, x2, x3, x4);
var _emscripten_glVertexAttrib4fv = (index, v) => {
    GLctx.vertexAttrib4f(index, HEAPF32[v >> 2], HEAPF32[v + 4 >> 2], HEAPF32[v + 8 >> 2], HEAPF32[v + 12 >> 2])
};
var _emscripten_glVertexAttribDivisor = (index, divisor) => {
    GLctx.vertexAttribDivisor(index, divisor)
};
var _emscripten_glVertexAttribDivisorANGLE = _emscripten_glVertexAttribDivisor;
var _emscripten_glVertexAttribDivisorARB = _emscripten_glVertexAttribDivisor;
var _emscripten_glVertexAttribDivisorEXT = _emscripten_glVertexAttribDivisor;
var _emscripten_glVertexAttribDivisorNV = _emscripten_glVertexAttribDivisor;
var _emscripten_glVertexAttribI4i = (x0, x1, x2, x3, x4) => GLctx.vertexAttribI4i(x0, x1, x2, x3, x4);
var _emscripten_glVertexAttribI4iv = (index, v) => {
    GLctx.vertexAttribI4i(index, HEAP32[v >> 2], HEAP32[v + 4 >> 2], HEAP32[v + 8 >> 2], HEAP32[v + 12 >> 2])
};
var _emscripten_glVertexAttribI4ui = (x0, x1, x2, x3, x4) => GLctx.vertexAttribI4ui(x0, x1, x2, x3, x4);
var _emscripten_glVertexAttribI4uiv = (index, v) => {
    GLctx.vertexAttribI4ui(index, HEAPU32[v >> 2], HEAPU32[v + 4 >> 2], HEAPU32[v + 8 >> 2], HEAPU32[v + 12 >> 2])
};
var _emscripten_glVertexAttribIPointer = (index, size, type, stride, ptr) => {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = false;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
            this.vertexAttribIPointer(index, size, type, stride, ptr)
        };
        return
    }
    cb.clientside = false;
    GLctx.vertexAttribIPointer(index, size, type, stride, ptr)
};
var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
    var cb = GL.currentContext.clientBuffers[index];
    if (!GLctx.currentArrayBufferBinding) {
        cb.size = size;
        cb.type = type;
        cb.normalized = normalized;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        cb.vertexAttribPointerAdaptor = function(index, size, type, normalized, stride, ptr) {
            this.vertexAttribPointer(index, size, type, normalized, stride, ptr)
        };
        return
    }
    cb.clientside = false;
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)
};
var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);
var _emscripten_glWaitSync = (sync, flags, timeout) => {
    timeout = Number(timeout);
    GLctx.waitSync(GL.syncs[sync], flags, timeout)
};
