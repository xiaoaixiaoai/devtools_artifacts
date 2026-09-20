// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `load-ids` option is passed. Each load ID maps to one
  //   or more wasm files as specified in the emitted JSON file. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It also takes a callback that should be invoked with the
  //   loaded module in a format supported by `WebAssembly.compile` or
  //   `WebAssembly.compileStreaming` and the result of using the JS 'import'
  //   API on the js file path. It should return a Promise that resolves when
  //   all the modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports,
      {loadDeferredModules, loadDynamicModule, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            _1: (decoder, codeUnits) => decoder.decode(codeUnits),
      _2: () => new TextDecoder("utf-8", {fatal: true}),
      _3: () => new TextDecoder("utf-8", {fatal: false}),
      _4: (s) => +s,
      _5: x0 => new Uint8Array(x0),
      _6: (x0,x1,x2) => x0.set(x1,x2),
      _7: (x0,x1) => x0.transferFromImageBitmap(x1),
      _9: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._9(f,arguments.length,x0) }),
      _10: x0 => new window.FinalizationRegistry(x0),
      _11: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _12: (x0,x1) => x0.unregister(x1),
      _13: (x0,x1,x2) => x0.slice(x1,x2),
      _14: (x0,x1) => x0.decode(x1),
      _15: (x0,x1) => x0.segment(x1),
      _16: () => new TextDecoder(),
      _18: x0 => x0.buffer,
      _19: x0 => x0.wasmMemory,
      _20: () => globalThis.window._flutter_skwasmInstance,
      _21: x0 => x0.rasterStartMilliseconds,
      _22: x0 => x0.rasterEndMilliseconds,
      _23: x0 => x0.imageBitmaps,
      _140: (x0,x1) => x0.appendChild(x1),
      _171: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _172: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _173: (x0,x1) => new OffscreenCanvas(x0,x1),
      _174: x0 => x0.remove(),
      _175: (x0,x1) => x0.append(x1),
      _177: x0 => x0.unlock(),
      _178: x0 => x0.getReader(),
      _179: (x0,x1) => x0.item(x1),
      _180: x0 => x0.next(),
      _181: x0 => x0.now(),
      _182: (x0,x1) => x0.revokeObjectURL(x1),
      _183: x0 => x0.close(),
      _184: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _185: x0 => new window.ImageDecoder(x0),
      _186: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      _187: (x0,x1) => x0.decode(x1),
      _188: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._188(f,arguments.length,x0) }),
      _189: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _191: (x0,x1) => x0.getModifierState(x1),
      _192: x0 => x0.preventDefault(),
      _193: x0 => x0.stopPropagation(),
      _194: (x0,x1) => x0.removeProperty(x1),
      _195: (x0,x1) => x0.prepend(x1),
      _196: x0 => new Intl.Locale(x0),
      _197: (x0,x1) => x0.observe(x1),
      _198: x0 => x0.disconnect(),
      _199: (x0,x1) => x0.getAttribute(x1),
      _200: (x0,x1) => x0.contains(x1),
      _201: (x0,x1) => x0.querySelector(x1),
      _202: (x0,x1) => x0.matchMedia(x1),
      _203: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._203(f,arguments.length,x0) }),
      _204: (x0,x1,x2) => x0.call(x1,x2),
      _205: x0 => x0.blur(),
      _206: x0 => x0.hasFocus(),
      _207: (x0,x1) => x0.removeAttribute(x1),
      _208: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _209: (x0,x1) => x0.hasAttribute(x1),
      _210: (x0,x1) => x0.getModifierState(x1),
      _211: (x0,x1) => x0.createTextNode(x1),
      _212: x0 => x0.getBoundingClientRect(),
      _213: (x0,x1) => x0.closest(x1),
      _214: () => new Array(),
      _651: x0 => new Uint8Array(x0),
      _654: () => globalThis.window.flutterConfiguration,
      _656: x0 => x0.assetBase,
      _661: x0 => x0.canvasKitMaximumSurfaces,
      _662: x0 => x0.debugShowSemanticsNodes,
      _663: x0 => x0.hostElement,
      _664: x0 => x0.multiViewEnabled,
      _665: x0 => x0.nonce,
      _667: x0 => x0.fontFallbackBaseUrl,
      _677: x0 => x0.console,
      _678: x0 => x0.devicePixelRatio,
      _679: x0 => x0.document,
      _680: x0 => x0.history,
      _681: x0 => x0.innerHeight,
      _682: x0 => x0.innerWidth,
      _683: x0 => x0.location,
      _684: x0 => x0.navigator,
      _685: x0 => x0.visualViewport,
      _686: x0 => x0.performance,
      _687: x0 => x0.parent,
      _689: x0 => x0.URL,
      _691: (x0,x1) => x0.getComputedStyle(x1),
      _692: x0 => x0.screen,
      _693: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._693(f,arguments.length,x0) }),
      _694: (x0,x1) => x0.requestAnimationFrame(x1),
      _698: (x0,x1) => x0.warn(x1),
      _700: (x0,x1) => x0.debug(x1),
      _701: x0 => globalThis.parseFloat(x0),
      _702: () => globalThis.window,
      _703: () => globalThis.Intl,
      _704: () => globalThis.Symbol,
      _705: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _707: x0 => x0.clipboard,
      _708: x0 => x0.maxTouchPoints,
      _709: x0 => x0.vendor,
      _710: x0 => x0.language,
      _711: x0 => x0.platform,
      _712: x0 => x0.userAgent,
      _713: (x0,x1) => x0.vibrate(x1),
      _714: x0 => x0.languages,
      _715: x0 => x0.documentElement,
      _716: (x0,x1) => x0.querySelector(x1),
      _717: (x0,x1) => x0.querySelectorAll(x1),
      _719: (x0,x1) => x0.createElement(x1),
      _722: (x0,x1) => x0.createEvent(x1),
      _723: x0 => x0.activeElement,
      _726: x0 => x0.head,
      _727: x0 => x0.body,
      _729: (x0,x1) => { x0.title = x1 },
      _732: x0 => x0.visibilityState,
      _733: () => globalThis.document,
      _734: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._734(f,arguments.length,x0) }),
      _735: (x0,x1) => x0.dispatchEvent(x1),
      _743: x0 => x0.target,
      _745: x0 => x0.timeStamp,
      _746: x0 => x0.type,
      _748: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _754: x0 => x0.baseURI,
      _755: x0 => x0.firstChild,
      _759: x0 => x0.parentElement,
      _761: (x0,x1) => { x0.textContent = x1 },
      _762: x0 => x0.parentNode,
      _763: x0 => x0.nextSibling,
      _764: (x0,x1) => x0.removeChild(x1),
      _765: x0 => x0.isConnected,
      _770: x0 => x0.firstElementChild,
      _773: x0 => x0.clientHeight,
      _774: x0 => x0.clientWidth,
      _775: x0 => x0.offsetHeight,
      _776: x0 => x0.offsetWidth,
      _777: x0 => x0.id,
      _778: (x0,x1) => { x0.id = x1 },
      _781: (x0,x1) => { x0.spellcheck = x1 },
      _782: x0 => x0.tagName,
      _783: x0 => x0.style,
      _786: (x0,x1) => x0.querySelectorAll(x1),
      _787: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _788: x0 => x0.tabIndex,
      _789: (x0,x1) => { x0.tabIndex = x1 },
      _790: (x0,x1) => x0.focus(x1),
      _791: x0 => x0.scrollTop,
      _792: (x0,x1) => { x0.scrollTop = x1 },
      _793: (x0,x1) => { x0.scrollLeft = x1 },
      _794: x0 => x0.scrollLeft,
      _795: x0 => x0.classList,
      _796: (x0,x1) => x0.scrollIntoView(x1),
      _799: (x0,x1) => { x0.className = x1 },
      _801: (x0,x1) => x0.getElementsByClassName(x1),
      _802: x0 => x0.click(),
      _803: (x0,x1) => x0.attachShadow(x1),
      _806: x0 => x0.computedStyleMap(),
      _807: (x0,x1) => x0.get(x1),
      _813: (x0,x1) => x0.getPropertyValue(x1),
      _814: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _815: x0 => x0.offsetLeft,
      _816: x0 => x0.offsetTop,
      _817: x0 => x0.offsetParent,
      _819: (x0,x1) => { x0.name = x1 },
      _820: x0 => x0.content,
      _821: (x0,x1) => { x0.content = x1 },
      _825: (x0,x1) => { x0.src = x1 },
      _826: x0 => x0.naturalWidth,
      _827: x0 => x0.naturalHeight,
      _831: (x0,x1) => { x0.crossOrigin = x1 },
      _833: (x0,x1) => { x0.decoding = x1 },
      _834: x0 => x0.decode(),
      _839: (x0,x1) => { x0.nonce = x1 },
      _844: (x0,x1) => { x0.width = x1 },
      _846: (x0,x1) => { x0.height = x1 },
      _849: (x0,x1) => x0.getContext(x1),
      _917: x0 => x0.width,
      _918: x0 => x0.height,
      _920: (x0,x1) => x0.fetch(x1),
      _921: x0 => x0.status,
      _923: x0 => x0.body,
      _924: x0 => x0.arrayBuffer(),
      _927: x0 => x0.read(),
      _928: x0 => x0.value,
      _929: x0 => x0.done,
      _936: x0 => x0.name,
      _937: x0 => x0.x,
      _938: x0 => x0.y,
      _941: x0 => x0.top,
      _942: x0 => x0.right,
      _943: x0 => x0.bottom,
      _944: x0 => x0.left,
      _954: x0 => x0.height,
      _955: x0 => x0.width,
      _956: x0 => x0.scale,
      _957: (x0,x1) => { x0.value = x1 },
      _960: (x0,x1) => { x0.placeholder = x1 },
      _962: (x0,x1) => { x0.name = x1 },
      _963: x0 => x0.selectionDirection,
      _964: x0 => x0.selectionStart,
      _965: x0 => x0.selectionEnd,
      _968: x0 => x0.value,
      _970: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _971: x0 => x0.readText(),
      _972: (x0,x1) => x0.writeText(x1),
      _974: x0 => x0.altKey,
      _975: x0 => x0.code,
      _976: x0 => x0.ctrlKey,
      _977: x0 => x0.key,
      _978: x0 => x0.keyCode,
      _979: x0 => x0.location,
      _980: x0 => x0.metaKey,
      _981: x0 => x0.repeat,
      _982: x0 => x0.shiftKey,
      _983: x0 => x0.isComposing,
      _985: x0 => x0.state,
      _986: (x0,x1) => x0.go(x1),
      _988: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _989: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _990: x0 => x0.pathname,
      _991: x0 => x0.search,
      _992: x0 => x0.hash,
      _996: x0 => x0.state,
      _999: (x0,x1) => x0.createObjectURL(x1),
      _1001: x0 => new Blob(x0),
      _1011: x0 => x0.matches,
      _1015: x0 => x0.matches,
      _1019: x0 => x0.relatedTarget,
      _1021: x0 => x0.clientX,
      _1022: x0 => x0.clientY,
      _1023: x0 => x0.offsetX,
      _1024: x0 => x0.offsetY,
      _1027: x0 => x0.button,
      _1028: x0 => x0.buttons,
      _1029: x0 => x0.ctrlKey,
      _1033: x0 => x0.pointerId,
      _1034: x0 => x0.pointerType,
      _1035: x0 => x0.pressure,
      _1036: x0 => x0.tiltX,
      _1037: x0 => x0.tiltY,
      _1038: x0 => x0.getCoalescedEvents(),
      _1041: x0 => x0.deltaX,
      _1042: x0 => x0.deltaY,
      _1043: x0 => x0.wheelDeltaX,
      _1044: x0 => x0.wheelDeltaY,
      _1045: x0 => x0.deltaMode,
      _1052: x0 => x0.changedTouches,
      _1055: x0 => x0.clientX,
      _1056: x0 => x0.clientY,
      _1059: x0 => x0.data,
      _1062: (x0,x1) => { x0.disabled = x1 },
      _1064: (x0,x1) => { x0.type = x1 },
      _1065: (x0,x1) => { x0.max = x1 },
      _1066: (x0,x1) => { x0.min = x1 },
      _1067: x0 => x0.value,
      _1068: (x0,x1) => { x0.value = x1 },
      _1069: x0 => x0.disabled,
      _1070: (x0,x1) => { x0.disabled = x1 },
      _1072: (x0,x1) => { x0.placeholder = x1 },
      _1074: (x0,x1) => { x0.name = x1 },
      _1075: (x0,x1) => { x0.autocomplete = x1 },
      _1077: x0 => x0.selectionDirection,
      _1078: x0 => x0.selectionStart,
      _1080: x0 => x0.selectionEnd,
      _1083: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1084: (x0,x1) => x0.add(x1),
      _1087: (x0,x1) => { x0.noValidate = x1 },
      _1088: (x0,x1) => { x0.method = x1 },
      _1089: (x0,x1) => { x0.action = x1 },
      _1114: x0 => x0.orientation,
      _1115: x0 => x0.width,
      _1116: x0 => x0.height,
      _1117: (x0,x1) => x0.lock(x1),
      _1136: x0 => new ResizeObserver(x0),
      _1139: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1139(f,arguments.length,x0,x1) }),
      _1147: x0 => x0.length,
      _1148: x0 => x0.iterator,
      _1149: x0 => x0.Segmenter,
      _1150: x0 => x0.v8BreakIterator,
      _1151: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1154: x0 => x0.language,
      _1155: x0 => x0.script,
      _1156: x0 => x0.region,
      _1174: x0 => x0.done,
      _1175: x0 => x0.value,
      _1176: x0 => x0.index,
      _1180: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1181: (x0,x1) => x0.adoptText(x1),
      _1182: x0 => x0.first(),
      _1183: x0 => x0.next(),
      _1184: x0 => x0.current(),
      _1197: x0 => x0.hostElement,
      _1198: x0 => x0.viewConstraints,
      _1201: x0 => x0.maxHeight,
      _1202: x0 => x0.maxWidth,
      _1203: x0 => x0.minHeight,
      _1204: x0 => x0.minWidth,
      _1205: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1205(f,arguments.length,x0) }),
      _1206: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1206(f,arguments.length,x0) }),
      _1207: (x0,x1) => ({addView: x0,removeView: x1}),
      _1210: x0 => x0.loader,
      _1211: () => globalThis._flutter,
      _1212: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1213: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1213(f,arguments.length,x0) }),
      _1214: (module,f) => finalizeWrapper(f, function() { return module.exports._1214(f,arguments.length) }),
      _1215: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1218: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1218(f,arguments.length,x0) }),
      _1219: x0 => ({runApp: x0}),
      _1221: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1221(f,arguments.length,x0,x1) }),
      _1222: x0 => new Promise(x0),
      _1223: x0 => x0.length,
      _1224: () => globalThis.window.ImageDecoder,
      _1225: x0 => x0.tracks,
      _1227: x0 => x0.completed,
      _1229: x0 => x0.image,
      _1235: x0 => x0.displayWidth,
      _1236: x0 => x0.displayHeight,
      _1237: x0 => x0.duration,
      _1240: x0 => x0.ready,
      _1241: x0 => x0.selectedTrack,
      _1242: x0 => x0.repetitionCount,
      _1243: x0 => x0.frameCount,
      _1286: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1286(f,arguments.length,x0) }),
      _1287: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1288: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1289: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _1290: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1290(f,arguments.length,x0) }),
      _1291: () => globalThis.initializeGA(),
      _1293: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9,x10,x11,x12,x13,x14,x15,x16,x17,x18,x19,x20,x21,x22,x23,x24,x25,x26,x27,x28,x29,x30,x31,x32,x33) => ({screen: x0,event_category: x1,event_label: x2,send_to: x3,value: x4,non_interaction: x5,user_app: x6,user_build: x7,user_platform: x8,devtools_platform: x9,devtools_chrome: x10,devtools_version: x11,ide_launched: x12,flutter_client_id: x13,is_external_build: x14,is_embedded: x15,g3_username: x16,ide_launched_feature: x17,is_wasm: x18,ui_duration_micros: x19,raster_duration_micros: x20,shader_compilation_duration_micros: x21,cpu_sample_count: x22,cpu_stack_depth: x23,trace_event_count: x24,heap_diff_objects_before: x25,heap_diff_objects_after: x26,heap_objects_total: x27,root_set_count: x28,row_count: x29,inspector_tree_controller_id: x30,android_app_id: x31,ios_bundle_id: x32,is_v2_inspector: x33}),
      _1294: x0 => x0.screen,
      _1295: x0 => x0.user_app,
      _1296: x0 => x0.user_build,
      _1297: x0 => x0.user_platform,
      _1298: x0 => x0.devtools_platform,
      _1299: x0 => x0.devtools_chrome,
      _1300: x0 => x0.devtools_version,
      _1301: x0 => x0.ide_launched,
      _1303: x0 => x0.is_external_build,
      _1304: x0 => x0.is_embedded,
      _1305: x0 => x0.g3_username,
      _1306: x0 => x0.ide_launched_feature,
      _1307: x0 => x0.is_wasm,
      _1308: x0 => x0.ui_duration_micros,
      _1309: x0 => x0.raster_duration_micros,
      _1310: x0 => x0.shader_compilation_duration_micros,
      _1311: x0 => x0.cpu_sample_count,
      _1312: x0 => x0.cpu_stack_depth,
      _1313: x0 => x0.trace_event_count,
      _1314: x0 => x0.heap_diff_objects_before,
      _1315: x0 => x0.heap_diff_objects_after,
      _1316: x0 => x0.heap_objects_total,
      _1317: x0 => x0.root_set_count,
      _1318: x0 => x0.row_count,
      _1319: x0 => x0.inspector_tree_controller_id,
      _1320: x0 => x0.android_app_id,
      _1321: x0 => x0.ios_bundle_id,
      _1322: x0 => x0.is_v2_inspector,
      _1324: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9,x10,x11,x12,x13,x14,x15,x16,x17,x18,x19,x20,x21,x22,x23,x24,x25,x26,x27,x28,x29) => ({description: x0,fatal: x1,user_app: x2,user_build: x3,user_platform: x4,devtools_platform: x5,devtools_chrome: x6,devtools_version: x7,ide_launched: x8,flutter_client_id: x9,is_external_build: x10,is_embedded: x11,g3_username: x12,ide_launched_feature: x13,is_wasm: x14,ui_duration_micros: x15,raster_duration_micros: x16,shader_compilation_duration_micros: x17,cpu_sample_count: x18,cpu_stack_depth: x19,trace_event_count: x20,heap_diff_objects_before: x21,heap_diff_objects_after: x22,heap_objects_total: x23,root_set_count: x24,row_count: x25,inspector_tree_controller_id: x26,android_app_id: x27,ios_bundle_id: x28,is_v2_inspector: x29}),
      _1325: x0 => x0.user_app,
      _1326: x0 => x0.user_build,
      _1327: x0 => x0.user_platform,
      _1328: x0 => x0.devtools_platform,
      _1329: x0 => x0.devtools_chrome,
      _1330: x0 => x0.devtools_version,
      _1331: x0 => x0.ide_launched,
      _1333: x0 => x0.is_external_build,
      _1334: x0 => x0.is_embedded,
      _1335: x0 => x0.g3_username,
      _1336: x0 => x0.ide_launched_feature,
      _1337: x0 => x0.is_wasm,
      _1353: () => globalThis.getDevToolsPropertyID(),
      _1354: () => globalThis.hookupListenerForGA(),
      _1355: (x0,x1,x2) => globalThis.gtag(x0,x1,x2),
      _1357: x0 => x0.event_category,
      _1358: x0 => x0.event_label,
      _1360: x0 => x0.value,
      _1361: x0 => x0.non_interaction,
      _1364: x0 => x0.description,
      _1365: x0 => x0.fatal,
      _1366: (x0,x1) => x0.getItem(x1),
      _1367: (x0,x1,x2) => x0.setItem(x1,x2),
      _1368: (x0,x1) => x0.querySelectorAll(x1),
      _1369: (x0,x1) => x0.removeChild(x1),
      _1370: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1370(f,arguments.length,x0) }),
      _1371: (x0,x1) => x0.forEach(x1),
      _1372: x0 => x0.preventDefault(),
      _1373: (x0,x1) => x0.execCommand(x1),
      _1374: (x0,x1) => x0.item(x1),
      _1375: () => new FileReader(),
      _1376: (x0,x1) => x0.readAsText(x1),
      _1377: (x0,x1) => x0.createElement(x1),
      _1378: x0 => new Blob(x0),
      _1379: x0 => globalThis.URL.createObjectURL(x0),
      _1380: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1381: (x0,x1) => x0.append(x1),
      _1382: x0 => x0.click(),
      _1383: x0 => x0.remove(),
      _1384: x0 => x0.createRange(),
      _1385: (x0,x1) => x0.selectNode(x1),
      _1386: x0 => x0.getSelection(),
      _1387: x0 => x0.removeAllRanges(),
      _1388: (x0,x1) => x0.addRange(x1),
      _1389: (x0,x1) => x0.createElement(x1),
      _1390: (x0,x1) => x0.append(x1),
      _1391: (x0,x1,x2) => x0.insertRule(x1,x2),
      _1392: (x0,x1) => x0.add(x1),
      _1393: x0 => x0.preventDefault(),
      _1394: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1394(f,arguments.length,x0) }),
      _1395: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1396: () => globalThis.window.navigator.userAgent,
      _1397: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1397(f,arguments.length,x0) }),
      _1398: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1399: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1404: (x0,x1) => x0.closest(x1),
      _1405: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1406: x0 => x0.decode(),
      _1407: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1408: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1409: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1409(f,arguments.length,x0) }),
      _1410: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1410(f,arguments.length,x0) }),
      _1411: x0 => x0.send(),
      _1412: () => new XMLHttpRequest(),
      _1413: (x0,x1) => x0.querySelector(x1),
      _1414: (x0,x1) => x0.appendChild(x1),
      _1415: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1415(f,arguments.length,x0) }),
      _1416: Date.now,
      _1418: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1419: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1420: () => typeof dartUseDateNowForTicks !== "undefined",
      _1421: () => 1000 * performance.now(),
      _1422: () => Date.now(),
      _1423: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1424: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1425: () => new WeakMap(),
      _1426: (map, o) => map.get(o),
      _1427: (map, o, v) => map.set(o, v),
      _1428: x0 => new WeakRef(x0),
      _1429: x0 => x0.deref(),
      _1436: () => globalThis.WeakRef,
      _1440: s => JSON.stringify(s),
      _1441: s => printToConsole(s),
      _1442: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      _1443: (o, p, r) => o.replaceAll(p, () => r),
      _1444: (o, p, r) => o.replace(p, () => r),
      _1445: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1446: s => s.toUpperCase(),
      _1447: s => s.trim(),
      _1448: s => s.trimLeft(),
      _1449: s => s.trimRight(),
      _1450: (string, times) => string.repeat(times),
      _1451: Function.prototype.call.bind(String.prototype.indexOf),
      _1452: (s, p, i) => s.lastIndexOf(p, i),
      _1453: (string, token) => string.split(token),
      _1454: Object.is,
      _1457: (o, t) => typeof o === t,
      _1458: (o, c) => o instanceof c,
      _1459: o => Object.keys(o),
      _1491: x0 => new Array(x0),
      _1493: x0 => x0.length,
      _1495: (x0,x1) => x0[x1],
      _1496: (x0,x1,x2) => { x0[x1] = x2 },
      _1499: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1501: x0 => new Int8Array(x0),
      _1502: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1504: x0 => new Uint8ClampedArray(x0),
      _1506: x0 => new Int16Array(x0),
      _1508: x0 => new Uint16Array(x0),
      _1510: x0 => new Int32Array(x0),
      _1512: x0 => new Uint32Array(x0),
      _1514: x0 => new Float32Array(x0),
      _1516: x0 => new Float64Array(x0),
      _1540: x0 => x0.random(),
      _1543: () => globalThis.Math,
      _1556: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1557: (handle) => clearTimeout(handle),
      _1558: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1559: (handle) => clearInterval(handle),
      _1560: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1561: () => Date.now(),
      _1562: () => new Error().stack,
      _1563: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1564: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1565: (x0,x1) => x0.exec(x1),
      _1566: (x0,x1) => x0.test(x1),
      _1567: x0 => x0.pop(),
      _1569: o => o === undefined,
      _1571: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1573: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1574: o => o instanceof RegExp,
      _1575: (l, r) => l === r,
      _1576: o => o,
      _1577: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      _1578: o => o,
      _1579: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      _1580: o => o,
      _1581: b => !!b,
      _1582: o => o.length,
      _1584: (o, i) => o[i],
      _1585: f => f.dartFunction,
      _1586: () => ({}),
      _1587: () => [],
      _1589: () => globalThis,
      _1590: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _1591: (o, p) => p in o,
      _1592: (o, p) => o[p],
      _1593: (o, p, v) => o[p] = v,
      _1594: (o, m, a) => o[m].apply(o, a),
      _1596: o => String(o),
      _1597: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _1598: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1598(f,arguments.length,x0) }),
      _1599: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1599(f,arguments.length,x0,x1) }),
      _1600: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      _1601: o => [o],
      _1602: (o0, o1) => [o0, o1],
      _1603: (o0, o1, o2) => [o0, o1, o2],
      _1604: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _1605: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      _1606: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1607: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1608: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1609: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1610: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1611: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1612: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1613: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1614: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1615: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1616: x0 => new ArrayBuffer(x0),
      _1617: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _1618: x0 => x0.input,
      _1619: x0 => x0.index,
      _1620: x0 => x0.groups,
      _1621: x0 => x0.flags,
      _1622: x0 => x0.multiline,
      _1623: x0 => x0.ignoreCase,
      _1624: x0 => x0.unicode,
      _1625: x0 => x0.dotAll,
      _1626: (x0,x1) => { x0.lastIndex = x1 },
      _1627: (o, p) => p in o,
      _1628: (o, p) => o[p],
      _1631: () => new XMLHttpRequest(),
      _1632: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1636: x0 => x0.send(),
      _1638: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1638(f,arguments.length,x0) }),
      _1639: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1639(f,arguments.length,x0) }),
      _1644: (x0,x1) => new WebSocket(x0,x1),
      _1645: (x0,x1) => x0.send(x1),
      _1646: (x0,x1,x2) => x0.close(x1,x2),
      _1648: x0 => x0.close(),
      _1653: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1654: x0 => ({body: x0}),
      _1655: (x0,x1) => new Notification(x0,x1),
      _1656: () => globalThis.Notification.requestPermission(),
      _1657: x0 => x0.close(),
      _1658: () => new AbortController(),
      _1659: x0 => x0.abort(),
      _1660: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _1661: (x0,x1) => globalThis.fetch(x0,x1),
      _1662: (x0,x1) => x0.get(x1),
      _1663: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1663(f,arguments.length,x0,x1,x2) }),
      _1664: (x0,x1) => x0.forEach(x1),
      _1665: x0 => x0.getReader(),
      _1666: x0 => x0.cancel(),
      _1667: x0 => x0.read(),
      _1668: x0 => ({withCredentials: x0}),
      _1669: (x0,x1) => new EventSource(x0,x1),
      _1670: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1670(f,arguments.length,x0) }),
      _1671: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1671(f,arguments.length,x0) }),
      _1672: x0 => x0.close(),
      _1673: (x0,x1,x2) => ({method: x0,body: x1,credentials: x2}),
      _1674: (x0,x1,x2) => x0.fetch(x1,x2),
      _1675: (x0,x1) => x0.groupCollapsed(x1),
      _1676: (x0,x1) => x0.log(x1),
      _1677: x0 => x0.groupEnd(),
      _1678: (x0,x1) => x0.warn(x1),
      _1679: (x0,x1) => x0.error(x1),
      _1680: x0 => x0.measureUserAgentSpecificMemory(),
      _1681: x0 => x0.bytes,
      _1691: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1691(f,arguments.length,x0) }),
      _1692: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1692(f,arguments.length,x0) }),
      _1693: x0 => x0.blur(),
      _1694: (x0,x1) => x0.replace(x1),
      _1695: x0 => x0.reload(),
      _1696: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _1697: o => o instanceof Array,
      _1698: (a, i) => a.splice(i, 1)[0],
      _1700: (a, l) => a.length = l,
      _1701: a => a.pop(),
      _1702: (a, i) => a.splice(i, 1),
      _1703: (a, s) => a.join(s),
      _1704: (a, s, e) => a.slice(s, e),
      _1706: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1707: a => a.length,
      _1708: (a, l) => a.length = l,
      _1709: (a, i) => a[i],
      _1710: (a, i, v) => a[i] = v,
      _1712: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _1713: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1715: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _1716: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1717: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _1718: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1719: o => o instanceof Uint8ClampedArray,
      _1720: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1721: o => o instanceof Uint16Array,
      _1722: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1723: o => o instanceof Int16Array,
      _1724: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1725: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _1726: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1727: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _1728: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1729: (o, start, length) => new BigUint64Array(o.buffer, o.byteOffset + start, length),
      _1730: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1731: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _1732: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1733: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _1734: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1735: (a, i) => a.push(i),
      _1736: (t, s) => t.set(s),
      _1738: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1739: o => o.byteLength,
      _1740: o => o.buffer,
      _1741: o => o.byteOffset,
      _1742: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1743: (b, o) => new DataView(b, o),
      _1744: (b, o, l) => new DataView(b, o, l),
      _1745: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1746: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1747: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1748: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1749: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1750: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1751: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1752: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1753: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1754: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1755: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1756: Function.prototype.call.bind(DataView.prototype.setInt32),
      _1757: Function.prototype.call.bind(DataView.prototype.getBigUint64),
      _1758: Function.prototype.call.bind(DataView.prototype.setBigUint64),
      _1759: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _1760: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _1761: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _1762: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _1763: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _1764: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _1765: Function.prototype.call.bind(Number.prototype.toString),
      _1766: Function.prototype.call.bind(BigInt.prototype.toString),
      _1767: Function.prototype.call.bind(Number.prototype.toString),
      _1768: (d, digits) => d.toFixed(digits),
      _1771: (d, precision) => d.toPrecision(precision),
      _1829: (x0,x1) => { x0.responseType = x1 },
      _1830: x0 => x0.response,
      _1905: x0 => x0.style,
      _2382: (x0,x1) => { x0.src = x1 },
      _2389: (x0,x1) => { x0.allow = x1 },
      _2401: x0 => x0.contentWindow,
      _2834: (x0,x1) => { x0.accept = x1 },
      _2848: x0 => x0.files,
      _2874: (x0,x1) => { x0.multiple = x1 },
      _2892: (x0,x1) => { x0.type = x1 },
      _3590: (x0,x1) => { x0.dropEffect = x1 },
      _3595: x0 => x0.files,
      _3607: x0 => x0.dataTransfer,
      _3611: () => globalThis.window,
      _3653: x0 => x0.location,
      _3654: x0 => x0.history,
      _3670: x0 => x0.parent,
      _3672: x0 => x0.navigator,
      _3927: x0 => x0.isSecureContext,
      _3928: x0 => x0.crossOriginIsolated,
      _3931: x0 => x0.performance,
      _3936: x0 => x0.localStorage,
      _3944: x0 => x0.origin,
      _3953: x0 => x0.pathname,
      _3967: x0 => x0.state,
      _3992: x0 => x0.message,
      _4054: x0 => x0.appVersion,
      _4055: x0 => x0.platform,
      _4058: x0 => x0.userAgent,
      _4059: x0 => x0.vendor,
      _4109: x0 => x0.data,
      _4110: x0 => x0.origin,
      _4482: x0 => x0.readyState,
      _4491: x0 => x0.protocol,
      _4495: (x0,x1) => { x0.binaryType = x1 },
      _4498: x0 => x0.code,
      _4499: x0 => x0.reason,
      _6166: x0 => x0.type,
      _6207: x0 => x0.signal,
      _6265: x0 => x0.parentNode,
      _6279: () => globalThis.document,
      _6361: x0 => x0.body,
      _6404: x0 => x0.activeElement,
      _7038: x0 => x0.offsetX,
      _7039: x0 => x0.offsetY,
      _7124: x0 => x0.key,
      _7125: x0 => x0.code,
      _7126: x0 => x0.location,
      _7127: x0 => x0.ctrlKey,
      _7128: x0 => x0.shiftKey,
      _7129: x0 => x0.altKey,
      _7130: x0 => x0.metaKey,
      _7131: x0 => x0.repeat,
      _7132: x0 => x0.isComposing,
      _7134: x0 => x0.keyCode,
      _8038: x0 => x0.value,
      _8040: x0 => x0.done,
      _8220: x0 => x0.size,
      _8221: x0 => x0.type,
      _8228: x0 => x0.name,
      _8229: x0 => x0.lastModified,
      _8234: x0 => x0.length,
      _8240: x0 => x0.result,
      _8735: x0 => x0.url,
      _8737: x0 => x0.status,
      _8739: x0 => x0.statusText,
      _8740: x0 => x0.headers,
      _8741: x0 => x0.body,
      _10823: (x0,x1) => { x0.backgroundColor = x1 },
      _10869: (x0,x1) => { x0.border = x1 },
      _11147: (x0,x1) => { x0.display = x1 },
      _11311: (x0,x1) => { x0.height = x1 },
      _12001: (x0,x1) => { x0.width = x1 },
      _12369: x0 => x0.name,
      _13088: () => globalThis.console,
      _13108: () => globalThis.document,
      _13109: () => globalThis.window,
      _13110: () => globalThis.console,
      _13115: (x0,x1) => { x0.height = x1 },
      _13117: (x0,x1) => { x0.width = x1 },
      _13119: (x0,x1) => { x0.pointerEvents = x1 },
      _13122: x0 => x0.head,
      _13123: x0 => x0.classList,
      _13127: (x0,x1) => { x0.innerText = x1 },
      _13128: x0 => x0.style,
      _13130: x0 => x0.sheet,
      _13131: x0 => x0.src,
      _13132: (x0,x1) => { x0.src = x1 },
      _13133: x0 => x0.naturalWidth,
      _13134: x0 => x0.naturalHeight,
      _13141: x0 => x0.offsetX,
      _13142: x0 => x0.offsetY,
      _13143: x0 => x0.button,
      _13149: (x0,x1) => x0.error(x1),
      _13154: x0 => x0.status,
      _13155: (x0,x1) => { x0.responseType = x1 },
      _13157: x0 => x0.response,

    };

    const baseImports = {
      dart2wasm: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });
    dartInstance.exports.$setThisModule(dartInstance);

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
