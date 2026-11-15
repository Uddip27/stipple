/* PhotoQRGIF classic worker. Bundled gifuct-js 2.1.2, gifenc 1.0.3 and js-binary-schema-parser 2.0.3. MIT license texts: gifuct-js.LICENSE.txt, gifenc.LICENSE.txt, js-binary-schema-parser.LICENSE.txt (same directory). No runtime imports or build step. */
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/js-binary-schema-parser/lib/index.js
  var require_lib = __commonJS({
    "node_modules/js-binary-schema-parser/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.loop = exports.conditional = exports.parse = void 0;
      var parse = function parse2(stream, schema) {
        var result = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        var parent = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : result;
        if (Array.isArray(schema)) {
          schema.forEach(function(partSchema) {
            return parse2(stream, partSchema, result, parent);
          });
        } else if (typeof schema === "function") {
          schema(stream, result, parent, parse2);
        } else {
          var key = Object.keys(schema)[0];
          if (Array.isArray(schema[key])) {
            parent[key] = {};
            parse2(stream, schema[key], result, parent[key]);
          } else {
            parent[key] = schema[key](stream, result, parent, parse2);
          }
        }
        return result;
      };
      exports.parse = parse;
      var conditional = function conditional2(schema, conditionFunc) {
        return function(stream, result, parent, parse2) {
          if (conditionFunc(stream, result, parent)) {
            parse2(stream, schema, result, parent);
          }
        };
      };
      exports.conditional = conditional;
      var loop = function loop2(schema, continueFunc) {
        return function(stream, result, parent, parse2) {
          var arr = [];
          var lastStreamPos = stream.pos;
          while (continueFunc(stream, result, parent)) {
            var newParent = {};
            parse2(stream, schema, result, newParent);
            if (stream.pos === lastStreamPos) {
              break;
            }
            lastStreamPos = stream.pos;
            arr.push(newParent);
          }
          return arr;
        };
      };
      exports.loop = loop;
    }
  });

  // node_modules/js-binary-schema-parser/lib/parsers/uint8.js
  var require_uint8 = __commonJS({
    "node_modules/js-binary-schema-parser/lib/parsers/uint8.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.readBits = exports.readArray = exports.readUnsigned = exports.readString = exports.peekBytes = exports.readBytes = exports.peekByte = exports.readByte = exports.buildStream = void 0;
      var buildStream = function buildStream2(uint8Data) {
        return {
          data: uint8Data,
          pos: 0
        };
      };
      exports.buildStream = buildStream;
      var readByte = function readByte2() {
        return function(stream) {
          return stream.data[stream.pos++];
        };
      };
      exports.readByte = readByte;
      var peekByte = function peekByte2() {
        var offset = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
        return function(stream) {
          return stream.data[stream.pos + offset];
        };
      };
      exports.peekByte = peekByte;
      var readBytes = function readBytes2(length) {
        return function(stream) {
          return stream.data.subarray(stream.pos, stream.pos += length);
        };
      };
      exports.readBytes = readBytes;
      var peekBytes = function peekBytes2(length) {
        return function(stream) {
          return stream.data.subarray(stream.pos, stream.pos + length);
        };
      };
      exports.peekBytes = peekBytes;
      var readString = function readString2(length) {
        return function(stream) {
          return Array.from(readBytes(length)(stream)).map(function(value) {
            return String.fromCharCode(value);
          }).join("");
        };
      };
      exports.readString = readString;
      var readUnsigned = function readUnsigned2(littleEndian) {
        return function(stream) {
          var bytes = readBytes(2)(stream);
          return littleEndian ? (bytes[1] << 8) + bytes[0] : (bytes[0] << 8) + bytes[1];
        };
      };
      exports.readUnsigned = readUnsigned;
      var readArray = function readArray2(byteSize, totalOrFunc) {
        return function(stream, result, parent) {
          var total = typeof totalOrFunc === "function" ? totalOrFunc(stream, result, parent) : totalOrFunc;
          var parser = readBytes(byteSize);
          var arr = new Array(total);
          for (var i = 0; i < total; i++) {
            arr[i] = parser(stream);
          }
          return arr;
        };
      };
      exports.readArray = readArray;
      var subBitsTotal = function subBitsTotal2(bits, startIndex, length) {
        var result = 0;
        for (var i = 0; i < length; i++) {
          result += bits[startIndex + i] && Math.pow(2, length - i - 1);
        }
        return result;
      };
      var readBits = function readBits2(schema) {
        return function(stream) {
          var _byte = readByte()(stream);
          var bits = new Array(8);
          for (var i = 0; i < 8; i++) {
            bits[7 - i] = !!(_byte & 1 << i);
          }
          return Object.keys(schema).reduce(function(res, key) {
            var def = schema[key];
            if (def.length) {
              res[key] = subBitsTotal(bits, def.index, def.length);
            } else {
              res[key] = bits[def.index];
            }
            return res;
          }, {});
        };
      };
      exports.readBits = readBits;
    }
  });

  // node_modules/js-binary-schema-parser/lib/schemas/gif.js
  var require_gif = __commonJS({
    "node_modules/js-binary-schema-parser/lib/schemas/gif.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports["default"] = void 0;
      var _ = require_lib();
      var _uint = require_uint8();
      var subBlocksSchema = {
        blocks: function blocks(stream) {
          var terminator = 0;
          var chunks = [];
          var streamSize = stream.data.length;
          var total = 0;
          for (var size = (0, _uint.readByte)()(stream); size !== terminator; size = (0, _uint.readByte)()(stream)) {
            if (!size) break;
            if (stream.pos + size >= streamSize) {
              var availableSize = streamSize - stream.pos;
              chunks.push((0, _uint.readBytes)(availableSize)(stream));
              total += availableSize;
              break;
            }
            chunks.push((0, _uint.readBytes)(size)(stream));
            total += size;
          }
          var result = new Uint8Array(total);
          var offset = 0;
          for (var i = 0; i < chunks.length; i++) {
            result.set(chunks[i], offset);
            offset += chunks[i].length;
          }
          return result;
        }
      };
      var gceSchema = (0, _.conditional)({
        gce: [{
          codes: (0, _uint.readBytes)(2)
        }, {
          byteSize: (0, _uint.readByte)()
        }, {
          extras: (0, _uint.readBits)({
            future: {
              index: 0,
              length: 3
            },
            disposal: {
              index: 3,
              length: 3
            },
            userInput: {
              index: 6
            },
            transparentColorGiven: {
              index: 7
            }
          })
        }, {
          delay: (0, _uint.readUnsigned)(true)
        }, {
          transparentColorIndex: (0, _uint.readByte)()
        }, {
          terminator: (0, _uint.readByte)()
        }]
      }, function(stream) {
        var codes = (0, _uint.peekBytes)(2)(stream);
        return codes[0] === 33 && codes[1] === 249;
      });
      var imageSchema = (0, _.conditional)({
        image: [{
          code: (0, _uint.readByte)()
        }, {
          descriptor: [{
            left: (0, _uint.readUnsigned)(true)
          }, {
            top: (0, _uint.readUnsigned)(true)
          }, {
            width: (0, _uint.readUnsigned)(true)
          }, {
            height: (0, _uint.readUnsigned)(true)
          }, {
            lct: (0, _uint.readBits)({
              exists: {
                index: 0
              },
              interlaced: {
                index: 1
              },
              sort: {
                index: 2
              },
              future: {
                index: 3,
                length: 2
              },
              size: {
                index: 5,
                length: 3
              }
            })
          }]
        }, (0, _.conditional)({
          lct: (0, _uint.readArray)(3, function(stream, result, parent) {
            return Math.pow(2, parent.descriptor.lct.size + 1);
          })
        }, function(stream, result, parent) {
          return parent.descriptor.lct.exists;
        }), {
          data: [{
            minCodeSize: (0, _uint.readByte)()
          }, subBlocksSchema]
        }]
      }, function(stream) {
        return (0, _uint.peekByte)()(stream) === 44;
      });
      var textSchema = (0, _.conditional)({
        text: [{
          codes: (0, _uint.readBytes)(2)
        }, {
          blockSize: (0, _uint.readByte)()
        }, {
          preData: function preData(stream, result, parent) {
            return (0, _uint.readBytes)(parent.text.blockSize)(stream);
          }
        }, subBlocksSchema]
      }, function(stream) {
        var codes = (0, _uint.peekBytes)(2)(stream);
        return codes[0] === 33 && codes[1] === 1;
      });
      var applicationSchema = (0, _.conditional)({
        application: [{
          codes: (0, _uint.readBytes)(2)
        }, {
          blockSize: (0, _uint.readByte)()
        }, {
          id: function id(stream, result, parent) {
            return (0, _uint.readString)(parent.blockSize)(stream);
          }
        }, subBlocksSchema]
      }, function(stream) {
        var codes = (0, _uint.peekBytes)(2)(stream);
        return codes[0] === 33 && codes[1] === 255;
      });
      var commentSchema = (0, _.conditional)({
        comment: [{
          codes: (0, _uint.readBytes)(2)
        }, subBlocksSchema]
      }, function(stream) {
        var codes = (0, _uint.peekBytes)(2)(stream);
        return codes[0] === 33 && codes[1] === 254;
      });
      var schema = [
        {
          header: [{
            signature: (0, _uint.readString)(3)
          }, {
            version: (0, _uint.readString)(3)
          }]
        },
        {
          lsd: [{
            width: (0, _uint.readUnsigned)(true)
          }, {
            height: (0, _uint.readUnsigned)(true)
          }, {
            gct: (0, _uint.readBits)({
              exists: {
                index: 0
              },
              resolution: {
                index: 1,
                length: 3
              },
              sort: {
                index: 4
              },
              size: {
                index: 5,
                length: 3
              }
            })
          }, {
            backgroundColorIndex: (0, _uint.readByte)()
          }, {
            pixelAspectRatio: (0, _uint.readByte)()
          }]
        },
        (0, _.conditional)({
          gct: (0, _uint.readArray)(3, function(stream, result) {
            return Math.pow(2, result.lsd.gct.size + 1);
          })
        }, function(stream, result) {
          return result.lsd.gct.exists;
        }),
        // content frames
        {
          frames: (0, _.loop)([gceSchema, applicationSchema, commentSchema, imageSchema, textSchema], function(stream) {
            var nextCode = (0, _uint.peekByte)()(stream);
            return nextCode === 33 || nextCode === 44;
          })
        }
      ];
      var _default = schema;
      exports["default"] = _default;
    }
  });

  // node_modules/gifuct-js/lib/deinterlace.js
  var require_deinterlace = __commonJS({
    "node_modules/gifuct-js/lib/deinterlace.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.deinterlace = void 0;
      var deinterlace = function deinterlace2(pixels, width) {
        var newPixels = new Array(pixels.length);
        var rows = pixels.length / width;
        var cpRow = function cpRow2(toRow2, fromRow2) {
          var fromPixels = pixels.slice(fromRow2 * width, (fromRow2 + 1) * width);
          newPixels.splice.apply(newPixels, [toRow2 * width, width].concat(fromPixels));
        };
        var offsets = [0, 4, 2, 1];
        var steps = [8, 8, 4, 2];
        var fromRow = 0;
        for (var pass = 0; pass < 4; pass++) {
          for (var toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
            cpRow(toRow, fromRow);
            fromRow++;
          }
        }
        return newPixels;
      };
      exports.deinterlace = deinterlace;
    }
  });

  // node_modules/gifuct-js/lib/lzw.js
  var require_lzw = __commonJS({
    "node_modules/gifuct-js/lib/lzw.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.lzw = void 0;
      var lzw = function lzw2(minCodeSize, data, pixelCount) {
        var MAX_STACK_SIZE = 4096;
        var nullCode = -1;
        var npix = pixelCount;
        var available, clear, code_mask, code_size, end_of_information, in_code, old_code, bits, code, i, datum, data_size, first, top, bi, pi;
        var dstPixels = new Array(pixelCount);
        var prefix = new Array(MAX_STACK_SIZE);
        var suffix = new Array(MAX_STACK_SIZE);
        var pixelStack = new Array(MAX_STACK_SIZE + 1);
        data_size = minCodeSize;
        clear = 1 << data_size;
        end_of_information = clear + 1;
        available = clear + 2;
        old_code = nullCode;
        code_size = data_size + 1;
        code_mask = (1 << code_size) - 1;
        for (code = 0; code < clear; code++) {
          prefix[code] = 0;
          suffix[code] = code;
        }
        var datum, bits, count, first, top, pi, bi;
        datum = bits = count = first = top = pi = bi = 0;
        for (i = 0; i < npix; ) {
          if (top === 0) {
            if (bits < code_size) {
              datum += data[bi] << bits;
              bits += 8;
              bi++;
              continue;
            }
            code = datum & code_mask;
            datum >>= code_size;
            bits -= code_size;
            if (code > available || code == end_of_information) {
              break;
            }
            if (code == clear) {
              code_size = data_size + 1;
              code_mask = (1 << code_size) - 1;
              available = clear + 2;
              old_code = nullCode;
              continue;
            }
            if (old_code == nullCode) {
              pixelStack[top++] = suffix[code];
              old_code = code;
              first = code;
              continue;
            }
            in_code = code;
            if (code == available) {
              pixelStack[top++] = first;
              code = old_code;
            }
            while (code > clear) {
              pixelStack[top++] = suffix[code];
              code = prefix[code];
            }
            first = suffix[code] & 255;
            pixelStack[top++] = first;
            if (available < MAX_STACK_SIZE) {
              prefix[available] = old_code;
              suffix[available] = first;
              available++;
              if ((available & code_mask) === 0 && available < MAX_STACK_SIZE) {
                code_size++;
                code_mask += available;
              }
            }
            old_code = in_code;
          }
          top--;
          dstPixels[pi++] = pixelStack[top];
          i++;
        }
        for (i = pi; i < npix; i++) {
          dstPixels[i] = 0;
        }
        return dstPixels;
      };
      exports.lzw = lzw;
    }
  });

  // node_modules/gifuct-js/lib/index.js
  var require_lib2 = __commonJS({
    "node_modules/gifuct-js/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.decompressFrames = exports.decompressFrame = exports.parseGIF = void 0;
      var _gif = _interopRequireDefault(require_gif());
      var _jsBinarySchemaParser = require_lib();
      var _uint = require_uint8();
      var _deinterlace = require_deinterlace();
      var _lzw = require_lzw();
      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { "default": obj };
      }
      var parseGIF = function parseGIF2(arrayBuffer) {
        var byteData = new Uint8Array(arrayBuffer);
        return (0, _jsBinarySchemaParser.parse)((0, _uint.buildStream)(byteData), _gif["default"]);
      };
      exports.parseGIF = parseGIF;
      var generatePatch = function generatePatch2(image) {
        var totalPixels = image.pixels.length;
        var patchData = new Uint8ClampedArray(totalPixels * 4);
        for (var i = 0; i < totalPixels; i++) {
          var pos = i * 4;
          var colorIndex = image.pixels[i];
          var color = image.colorTable[colorIndex] || [0, 0, 0];
          patchData[pos] = color[0];
          patchData[pos + 1] = color[1];
          patchData[pos + 2] = color[2];
          patchData[pos + 3] = colorIndex !== image.transparentIndex ? 255 : 0;
        }
        return patchData;
      };
      var decompressFrame = function decompressFrame2(frame, gct, buildImagePatch) {
        if (!frame.image) {
          console.warn("gif frame does not have associated image.");
          return;
        }
        var image = frame.image;
        var totalPixels = image.descriptor.width * image.descriptor.height;
        var pixels = (0, _lzw.lzw)(image.data.minCodeSize, image.data.blocks, totalPixels);
        if (image.descriptor.lct.interlaced) {
          pixels = (0, _deinterlace.deinterlace)(pixels, image.descriptor.width);
        }
        var resultImage = {
          pixels,
          dims: {
            top: frame.image.descriptor.top,
            left: frame.image.descriptor.left,
            width: frame.image.descriptor.width,
            height: frame.image.descriptor.height
          }
        };
        if (image.descriptor.lct && image.descriptor.lct.exists) {
          resultImage.colorTable = image.lct;
        } else {
          resultImage.colorTable = gct;
        }
        if (frame.gce) {
          resultImage.delay = (frame.gce.delay || 10) * 10;
          resultImage.disposalType = frame.gce.extras.disposal;
          if (frame.gce.extras.transparentColorGiven) {
            resultImage.transparentIndex = frame.gce.transparentColorIndex;
          }
        }
        if (buildImagePatch) {
          resultImage.patch = generatePatch(resultImage);
        }
        return resultImage;
      };
      exports.decompressFrame = decompressFrame;
      var decompressFrames = function decompressFrames2(parsedGif, buildImagePatches) {
        return parsedGif.frames.filter(function(f) {
          return f.image;
        }).map(function(f) {
          return decompressFrame(f, parsedGif.gct, buildImagePatches);
        });
      };
      exports.decompressFrames = decompressFrames;
    }
  });

  // node_modules/gifenc/dist/gifenc.js
  var require_gifenc = __commonJS({
    "node_modules/gifenc/dist/gifenc.js"(exports) {
      var __defProp2 = Object.defineProperty;
      var __markAsModule = (target) => __defProp2(target, "__esModule", { value: true });
      var __export = (target, all) => {
        for (var name in all)
          __defProp2(target, name, { get: all[name], enumerable: true });
      };
      __markAsModule(exports);
      __export(exports, {
        GIFEncoder: () => GIFEncoder,
        applyPalette: () => applyPalette,
        default: () => src_default,
        nearestColor: () => nearestColor,
        nearestColorIndex: () => nearestColorIndex,
        nearestColorIndexWithDistance: () => nearestColorIndexWithDistance,
        prequantize: () => prequantize,
        quantize: () => quantize,
        snapColorsToPalette: () => snapColorsToPalette
      });
      var constants_default = {
        signature: "GIF",
        version: "89a",
        trailer: 59,
        extensionIntroducer: 33,
        applicationExtensionLabel: 255,
        graphicControlExtensionLabel: 249,
        imageSeparator: 44,
        signatureSize: 3,
        versionSize: 3,
        globalColorTableFlagMask: 128,
        colorResolutionMask: 112,
        sortFlagMask: 8,
        globalColorTableSizeMask: 7,
        applicationIdentifierSize: 8,
        applicationAuthCodeSize: 3,
        disposalMethodMask: 28,
        userInputFlagMask: 2,
        transparentColorFlagMask: 1,
        localColorTableFlagMask: 128,
        interlaceFlagMask: 64,
        idSortFlagMask: 32,
        localColorTableSizeMask: 7
      };
      function createStream(initialCapacity = 256) {
        let cursor = 0;
        let contents = new Uint8Array(initialCapacity);
        return {
          get buffer() {
            return contents.buffer;
          },
          reset() {
            cursor = 0;
          },
          bytesView() {
            return contents.subarray(0, cursor);
          },
          bytes() {
            return contents.slice(0, cursor);
          },
          writeByte(byte) {
            expand(cursor + 1);
            contents[cursor] = byte;
            cursor++;
          },
          writeBytes(data, offset = 0, byteLength = data.length) {
            expand(cursor + byteLength);
            for (let i = 0; i < byteLength; i++) {
              contents[cursor++] = data[i + offset];
            }
          },
          writeBytesView(data, offset = 0, byteLength = data.byteLength) {
            expand(cursor + byteLength);
            contents.set(data.subarray(offset, offset + byteLength), cursor);
            cursor += byteLength;
          }
        };
        function expand(newCapacity) {
          var prevCapacity = contents.length;
          if (prevCapacity >= newCapacity)
            return;
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
          if (prevCapacity != 0)
            newCapacity = Math.max(newCapacity, 256);
          const oldContents = contents;
          contents = new Uint8Array(newCapacity);
          if (cursor > 0)
            contents.set(oldContents.subarray(0, cursor), 0);
        }
      }
      var BITS = 12;
      var DEFAULT_HSIZE = 5003;
      var MASKS = [
        0,
        1,
        3,
        7,
        15,
        31,
        63,
        127,
        255,
        511,
        1023,
        2047,
        4095,
        8191,
        16383,
        32767,
        65535
      ];
      function lzwEncode(width, height, pixels, colorDepth, outStream = createStream(512), accum = new Uint8Array(256), htab = new Int32Array(DEFAULT_HSIZE), codetab = new Int32Array(DEFAULT_HSIZE)) {
        const hsize = htab.length;
        const initCodeSize = Math.max(2, colorDepth);
        accum.fill(0);
        codetab.fill(0);
        htab.fill(-1);
        let cur_accum = 0;
        let cur_bits = 0;
        const init_bits = initCodeSize + 1;
        const g_init_bits = init_bits;
        let clear_flg = false;
        let n_bits = g_init_bits;
        let maxcode = (1 << n_bits) - 1;
        const ClearCode = 1 << init_bits - 1;
        const EOFCode = ClearCode + 1;
        let free_ent = ClearCode + 2;
        let a_count = 0;
        let ent = pixels[0];
        let hshift = 0;
        for (let fcode = hsize; fcode < 65536; fcode *= 2) {
          ++hshift;
        }
        hshift = 8 - hshift;
        outStream.writeByte(initCodeSize);
        output(ClearCode);
        const length = pixels.length;
        for (let idx = 1; idx < length; idx++) {
          next_block: {
            const c = pixels[idx];
            const fcode = (c << BITS) + ent;
            let i = c << hshift ^ ent;
            if (htab[i] === fcode) {
              ent = codetab[i];
              break next_block;
            }
            const disp = i === 0 ? 1 : hsize - i;
            while (htab[i] >= 0) {
              i -= disp;
              if (i < 0)
                i += hsize;
              if (htab[i] === fcode) {
                ent = codetab[i];
                break next_block;
              }
            }
            output(ent);
            ent = c;
            if (free_ent < 1 << BITS) {
              codetab[i] = free_ent++;
              htab[i] = fcode;
            } else {
              htab.fill(-1);
              free_ent = ClearCode + 2;
              clear_flg = true;
              output(ClearCode);
            }
          }
        }
        output(ent);
        output(EOFCode);
        outStream.writeByte(0);
        return outStream.bytesView();
        function output(code) {
          cur_accum &= MASKS[cur_bits];
          if (cur_bits > 0)
            cur_accum |= code << cur_bits;
          else
            cur_accum = code;
          cur_bits += n_bits;
          while (cur_bits >= 8) {
            accum[a_count++] = cur_accum & 255;
            if (a_count >= 254) {
              outStream.writeByte(a_count);
              outStream.writeBytesView(accum, 0, a_count);
              a_count = 0;
            }
            cur_accum >>= 8;
            cur_bits -= 8;
          }
          if (free_ent > maxcode || clear_flg) {
            if (clear_flg) {
              n_bits = g_init_bits;
              maxcode = (1 << n_bits) - 1;
              clear_flg = false;
            } else {
              ++n_bits;
              maxcode = n_bits === BITS ? 1 << n_bits : (1 << n_bits) - 1;
            }
          }
          if (code == EOFCode) {
            while (cur_bits > 0) {
              accum[a_count++] = cur_accum & 255;
              if (a_count >= 254) {
                outStream.writeByte(a_count);
                outStream.writeBytesView(accum, 0, a_count);
                a_count = 0;
              }
              cur_accum >>= 8;
              cur_bits -= 8;
            }
            if (a_count > 0) {
              outStream.writeByte(a_count);
              outStream.writeBytesView(accum, 0, a_count);
              a_count = 0;
            }
          }
        }
      }
      var lzwEncode_default = lzwEncode;
      function rgb888_to_rgb565(r, g, b) {
        return r << 8 & 63488 | g << 2 & 992 | b >> 3;
      }
      function rgba8888_to_rgba4444(r, g, b, a) {
        return r >> 4 | g & 240 | (b & 240) << 4 | (a & 240) << 8;
      }
      function rgb888_to_rgb444(r, g, b) {
        return r >> 4 << 8 | g & 240 | b >> 4;
      }
      function clamp(value, min, max) {
        return value < min ? min : value > max ? max : value;
      }
      function sqr(value) {
        return value * value;
      }
      function find_nn(bins, idx, hasAlpha) {
        var nn = 0;
        var err = 1e100;
        const bin1 = bins[idx];
        const n1 = bin1.cnt;
        const wa = bin1.ac;
        const wr = bin1.rc;
        const wg = bin1.gc;
        const wb = bin1.bc;
        for (var i = bin1.fw; i != 0; i = bins[i].fw) {
          const bin = bins[i];
          const n2 = bin.cnt;
          const nerr2 = n1 * n2 / (n1 + n2);
          if (nerr2 >= err)
            continue;
          var nerr = 0;
          if (hasAlpha) {
            nerr += nerr2 * sqr(bin.ac - wa);
            if (nerr >= err)
              continue;
          }
          nerr += nerr2 * sqr(bin.rc - wr);
          if (nerr >= err)
            continue;
          nerr += nerr2 * sqr(bin.gc - wg);
          if (nerr >= err)
            continue;
          nerr += nerr2 * sqr(bin.bc - wb);
          if (nerr >= err)
            continue;
          err = nerr;
          nn = i;
        }
        bin1.err = err;
        bin1.nn = nn;
      }
      function create_bin() {
        return {
          ac: 0,
          rc: 0,
          gc: 0,
          bc: 0,
          cnt: 0,
          nn: 0,
          fw: 0,
          bk: 0,
          tm: 0,
          mtm: 0,
          err: 0
        };
      }
      function create_bin_list(data, format) {
        const bincount = format === "rgb444" ? 4096 : 65536;
        const bins = new Array(bincount);
        const size = data.length;
        if (format === "rgba4444") {
          for (let i = 0; i < size; ++i) {
            const color = data[i];
            const a = color >> 24 & 255;
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const index = rgba8888_to_rgba4444(r, g, b, a);
            let bin = index in bins ? bins[index] : bins[index] = create_bin();
            bin.rc += r;
            bin.gc += g;
            bin.bc += b;
            bin.ac += a;
            bin.cnt++;
          }
        } else if (format === "rgb444") {
          for (let i = 0; i < size; ++i) {
            const color = data[i];
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const index = rgb888_to_rgb444(r, g, b);
            let bin = index in bins ? bins[index] : bins[index] = create_bin();
            bin.rc += r;
            bin.gc += g;
            bin.bc += b;
            bin.cnt++;
          }
        } else {
          for (let i = 0; i < size; ++i) {
            const color = data[i];
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const index = rgb888_to_rgb565(r, g, b);
            let bin = index in bins ? bins[index] : bins[index] = create_bin();
            bin.rc += r;
            bin.gc += g;
            bin.bc += b;
            bin.cnt++;
          }
        }
        return bins;
      }
      function quantize(rgba, maxColors, opts = {}) {
        const {
          format = "rgb565",
          clearAlpha = true,
          clearAlphaColor = 0,
          clearAlphaThreshold = 0,
          oneBitAlpha = false
        } = opts;
        if (!rgba || !rgba.buffer) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        const data = new Uint32Array(rgba.buffer);
        let useSqrt = opts.useSqrt !== false;
        const hasAlpha = format === "rgba4444";
        const bins = create_bin_list(data, format);
        const bincount = bins.length;
        const bincountMinusOne = bincount - 1;
        const heap = new Uint32Array(bincount + 1);
        var maxbins = 0;
        for (var i = 0; i < bincount; ++i) {
          const bin = bins[i];
          if (bin != null) {
            var d = 1 / bin.cnt;
            if (hasAlpha)
              bin.ac *= d;
            bin.rc *= d;
            bin.gc *= d;
            bin.bc *= d;
            bins[maxbins++] = bin;
          }
        }
        if (sqr(maxColors) / maxbins < 0.022) {
          useSqrt = false;
        }
        var i = 0;
        for (; i < maxbins - 1; ++i) {
          bins[i].fw = i + 1;
          bins[i + 1].bk = i;
          if (useSqrt)
            bins[i].cnt = Math.sqrt(bins[i].cnt);
        }
        if (useSqrt)
          bins[i].cnt = Math.sqrt(bins[i].cnt);
        var h, l, l2;
        for (i = 0; i < maxbins; ++i) {
          find_nn(bins, i, false);
          var err = bins[i].err;
          for (l = ++heap[0]; l > 1; l = l2) {
            l2 = l >> 1;
            if (bins[h = heap[l2]].err <= err)
              break;
            heap[l] = h;
          }
          heap[l] = i;
        }
        var extbins = maxbins - maxColors;
        for (i = 0; i < extbins; ) {
          var tb;
          for (; ; ) {
            var b1 = heap[1];
            tb = bins[b1];
            if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm)
              break;
            if (tb.mtm == bincountMinusOne)
              b1 = heap[1] = heap[heap[0]--];
            else {
              find_nn(bins, b1, false);
              tb.tm = i;
            }
            var err = bins[b1].err;
            for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
              if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err)
                l2++;
              if (err <= bins[h = heap[l2]].err)
                break;
              heap[l] = h;
            }
            heap[l] = b1;
          }
          var nb = bins[tb.nn];
          var n1 = tb.cnt;
          var n2 = nb.cnt;
          var d = 1 / (n1 + n2);
          if (hasAlpha)
            tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
          tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
          tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
          tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
          tb.cnt += nb.cnt;
          tb.mtm = ++i;
          bins[nb.bk].fw = nb.fw;
          bins[nb.fw].bk = nb.bk;
          nb.mtm = bincountMinusOne;
        }
        let palette = [];
        var k = 0;
        for (i = 0; ; ++k) {
          let r = clamp(Math.round(bins[i].rc), 0, 255);
          let g = clamp(Math.round(bins[i].gc), 0, 255);
          let b = clamp(Math.round(bins[i].bc), 0, 255);
          let a = 255;
          if (hasAlpha) {
            a = clamp(Math.round(bins[i].ac), 0, 255);
            if (oneBitAlpha) {
              const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
              a = a <= threshold ? 0 : 255;
            }
            if (clearAlpha && a <= clearAlphaThreshold) {
              r = g = b = clearAlphaColor;
              a = 0;
            }
          }
          const color = hasAlpha ? [r, g, b, a] : [r, g, b];
          const exists = existsInPalette(palette, color);
          if (!exists)
            palette.push(color);
          if ((i = bins[i].fw) == 0)
            break;
        }
        return palette;
      }
      function existsInPalette(palette, color) {
        for (let i = 0; i < palette.length; i++) {
          const p = palette[i];
          let matchesRGB = p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
          let matchesAlpha = p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
          if (matchesRGB && matchesAlpha)
            return true;
        }
        return false;
      }
      function euclideanDistanceSquared(a, b) {
        var sum = 0;
        var n;
        for (n = 0; n < a.length; n++) {
          const dx = a[n] - b[n];
          sum += dx * dx;
        }
        return sum;
      }
      function roundStep(byte, step) {
        return step > 1 ? Math.round(byte / step) * step : byte;
      }
      function prequantize(rgba, { roundRGB = 5, roundAlpha = 10, oneBitAlpha = null } = {}) {
        const data = new Uint32Array(rgba.buffer);
        for (let i = 0; i < data.length; i++) {
          const color = data[i];
          let a = color >> 24 & 255;
          let b = color >> 16 & 255;
          let g = color >> 8 & 255;
          let r = color & 255;
          a = roundStep(a, roundAlpha);
          if (oneBitAlpha) {
            const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
            a = a <= threshold ? 0 : 255;
          }
          r = roundStep(r, roundRGB);
          g = roundStep(g, roundRGB);
          b = roundStep(b, roundRGB);
          data[i] = a << 24 | b << 16 | g << 8 | r << 0;
        }
      }
      function applyPalette(rgba, palette, format = "rgb565") {
        if (!rgba || !rgba.buffer) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        if (palette.length > 256) {
          throw new Error("applyPalette() only works with 256 colors or less");
        }
        const data = new Uint32Array(rgba.buffer);
        const length = data.length;
        const bincount = format === "rgb444" ? 4096 : 65536;
        const index = new Uint8Array(length);
        const cache = new Array(bincount);
        const hasAlpha = format === "rgba4444";
        if (format === "rgba4444") {
          for (let i = 0; i < length; i++) {
            const color = data[i];
            const a = color >> 24 & 255;
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const key = rgba8888_to_rgba4444(r, g, b, a);
            const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGBA(r, g, b, a, palette);
            index[i] = idx;
          }
        } else {
          const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
          for (let i = 0; i < length; i++) {
            const color = data[i];
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const key = rgb888_to_key(r, g, b);
            const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGB(r, g, b, palette);
            index[i] = idx;
          }
        }
        return index;
      }
      function nearestColorIndexRGBA(r, g, b, a, palette) {
        let k = 0;
        let mindist = 1e100;
        for (let i = 0; i < palette.length; i++) {
          const px2 = palette[i];
          const a2 = px2[3];
          let curdist = sqr2(a2 - a);
          if (curdist > mindist)
            continue;
          const r2 = px2[0];
          curdist += sqr2(r2 - r);
          if (curdist > mindist)
            continue;
          const g2 = px2[1];
          curdist += sqr2(g2 - g);
          if (curdist > mindist)
            continue;
          const b2 = px2[2];
          curdist += sqr2(b2 - b);
          if (curdist > mindist)
            continue;
          mindist = curdist;
          k = i;
        }
        return k;
      }
      function nearestColorIndexRGB(r, g, b, palette) {
        let k = 0;
        let mindist = 1e100;
        for (let i = 0; i < palette.length; i++) {
          const px2 = palette[i];
          const r2 = px2[0];
          let curdist = sqr2(r2 - r);
          if (curdist > mindist)
            continue;
          const g2 = px2[1];
          curdist += sqr2(g2 - g);
          if (curdist > mindist)
            continue;
          const b2 = px2[2];
          curdist += sqr2(b2 - b);
          if (curdist > mindist)
            continue;
          mindist = curdist;
          k = i;
        }
        return k;
      }
      function snapColorsToPalette(palette, knownColors, threshold = 5) {
        if (!palette.length || !knownColors.length)
          return;
        const paletteRGB = palette.map((p) => p.slice(0, 3));
        const thresholdSq = threshold * threshold;
        const dim = palette[0].length;
        for (let i = 0; i < knownColors.length; i++) {
          let color = knownColors[i];
          if (color.length < dim) {
            color = [color[0], color[1], color[2], 255];
          } else if (color.length > dim) {
            color = color.slice(0, 3);
          } else {
            color = color.slice();
          }
          const r = nearestColorIndexWithDistance(paletteRGB, color.slice(0, 3), euclideanDistanceSquared);
          const idx = r[0];
          const distanceSq = r[1];
          if (distanceSq > 0 && distanceSq <= thresholdSq) {
            palette[idx] = color;
          }
        }
      }
      function sqr2(a) {
        return a * a;
      }
      function nearestColorIndex(colors, pixel, distanceFn = euclideanDistanceSquared) {
        let minDist = Infinity;
        let minDistIndex = -1;
        for (let j = 0; j < colors.length; j++) {
          const paletteColor = colors[j];
          const dist = distanceFn(pixel, paletteColor);
          if (dist < minDist) {
            minDist = dist;
            minDistIndex = j;
          }
        }
        return minDistIndex;
      }
      function nearestColorIndexWithDistance(colors, pixel, distanceFn = euclideanDistanceSquared) {
        let minDist = Infinity;
        let minDistIndex = -1;
        for (let j = 0; j < colors.length; j++) {
          const paletteColor = colors[j];
          const dist = distanceFn(pixel, paletteColor);
          if (dist < minDist) {
            minDist = dist;
            minDistIndex = j;
          }
        }
        return [minDistIndex, minDist];
      }
      function nearestColor(colors, pixel, distanceFn = euclideanDistanceSquared) {
        return colors[nearestColorIndex(colors, pixel, distanceFn)];
      }
      function GIFEncoder(opt = {}) {
        const { initialCapacity = 4096, auto = true } = opt;
        const stream = createStream(initialCapacity);
        const HSIZE = 5003;
        const accum = new Uint8Array(256);
        const htab = new Int32Array(HSIZE);
        const codetab = new Int32Array(HSIZE);
        let hasInit = false;
        return {
          reset() {
            stream.reset();
            hasInit = false;
          },
          finish() {
            stream.writeByte(constants_default.trailer);
          },
          bytes() {
            return stream.bytes();
          },
          bytesView() {
            return stream.bytesView();
          },
          get buffer() {
            return stream.buffer;
          },
          get stream() {
            return stream;
          },
          writeHeader,
          writeFrame(index, width, height, opts = {}) {
            const {
              transparent = false,
              transparentIndex = 0,
              delay = 0,
              palette = null,
              repeat = 0,
              colorDepth = 8,
              dispose = -1
            } = opts;
            let first = false;
            if (auto) {
              if (!hasInit) {
                first = true;
                writeHeader();
                hasInit = true;
              }
            } else {
              first = Boolean(opts.first);
            }
            width = Math.max(0, Math.floor(width));
            height = Math.max(0, Math.floor(height));
            if (first) {
              if (!palette) {
                throw new Error("First frame must include a { palette } option");
              }
              encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
              encodeColorTable(stream, palette);
              if (repeat >= 0) {
                encodeNetscapeExt(stream, repeat);
              }
            }
            const delayTime = Math.round(delay / 10);
            encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
            const useLocalColorTable = Boolean(palette) && !first;
            encodeImageDescriptor(stream, width, height, useLocalColorTable ? palette : null);
            if (useLocalColorTable)
              encodeColorTable(stream, palette);
            encodePixels(stream, index, width, height, colorDepth, accum, htab, codetab);
          }
        };
        function writeHeader() {
          writeUTFBytes(stream, "GIF89a");
        }
      }
      function encodeGraphicControlExt(stream, dispose, delay, transparent, transparentIndex) {
        stream.writeByte(33);
        stream.writeByte(249);
        stream.writeByte(4);
        if (transparentIndex < 0) {
          transparentIndex = 0;
          transparent = false;
        }
        var transp, disp;
        if (!transparent) {
          transp = 0;
          disp = 0;
        } else {
          transp = 1;
          disp = 2;
        }
        if (dispose >= 0) {
          disp = dispose & 7;
        }
        disp <<= 2;
        const userInput = 0;
        stream.writeByte(0 | disp | userInput | transp);
        writeUInt16(stream, delay);
        stream.writeByte(transparentIndex || 0);
        stream.writeByte(0);
      }
      function encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth = 8) {
        const globalColorTableFlag = 1;
        const sortFlag = 0;
        const globalColorTableSize = colorTableSize(palette.length) - 1;
        const fields = globalColorTableFlag << 7 | colorDepth - 1 << 4 | sortFlag << 3 | globalColorTableSize;
        const backgroundColorIndex = 0;
        const pixelAspectRatio = 0;
        writeUInt16(stream, width);
        writeUInt16(stream, height);
        stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
      }
      function encodeNetscapeExt(stream, repeat) {
        stream.writeByte(33);
        stream.writeByte(255);
        stream.writeByte(11);
        writeUTFBytes(stream, "NETSCAPE2.0");
        stream.writeByte(3);
        stream.writeByte(1);
        writeUInt16(stream, repeat);
        stream.writeByte(0);
      }
      function encodeColorTable(stream, palette) {
        const colorTableLength = 1 << colorTableSize(palette.length);
        for (let i = 0; i < colorTableLength; i++) {
          let color = [0, 0, 0];
          if (i < palette.length) {
            color = palette[i];
          }
          stream.writeByte(color[0]);
          stream.writeByte(color[1]);
          stream.writeByte(color[2]);
        }
      }
      function encodeImageDescriptor(stream, width, height, localPalette) {
        stream.writeByte(44);
        writeUInt16(stream, 0);
        writeUInt16(stream, 0);
        writeUInt16(stream, width);
        writeUInt16(stream, height);
        if (localPalette) {
          const interlace = 0;
          const sorted = 0;
          const palSize = colorTableSize(localPalette.length) - 1;
          stream.writeByte(128 | interlace | sorted | 0 | palSize);
        } else {
          stream.writeByte(0);
        }
      }
      function encodePixels(stream, index, width, height, colorDepth = 8, accum, htab, codetab) {
        lzwEncode_default(width, height, index, colorDepth, stream, accum, htab, codetab);
      }
      function writeUInt16(stream, short) {
        stream.writeByte(short & 255);
        stream.writeByte(short >> 8 & 255);
      }
      function writeUTFBytes(stream, text) {
        for (var i = 0; i < text.length; i++) {
          stream.writeByte(text.charCodeAt(i));
        }
      }
      function colorTableSize(length) {
        return Math.max(Math.ceil(Math.log2(length)), 1);
      }
      var src_default = GIFEncoder;
    }
  });

  // qr-gif-worker-source.js
  var require_qr_gif_worker_source = __commonJS({
    "qr-gif-worker-source.js"() {
      var import_gifuct_js = __toESM(require_lib2());
      var import_gifenc = __toESM(require_gifenc());
      var MAX_BYTES = 25 * 1024 * 1024;
      var MAX_EDGE = 2048;
      var MAX_FRAMES = 120;
      var MAX_DURATION = 1e4;
      var SOURCE_PIXELS = 4e7;
      var OUTPUT_PIXELS = 16e6;
      var state;
      function fail(message) {
        throw new Error(message);
      }
      function checkSize(width, height) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_EDGE || height > MAX_EDGE) {
          fail("GIF dimensions must be between 1 and 2048 pixels on each edge.");
        }
      }
      function inspectGIF(buffer) {
        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > MAX_BYTES) fail("GIF files must be 25 MB or smaller.");
        const bytes = new Uint8Array(buffer);
        let pos = 0;
        function need(count) {
          if (pos + count > bytes.length) fail("The GIF is incomplete or contains a truncated data block.");
        }
        function byte() {
          need(1);
          return bytes[pos++];
        }
        function word() {
          return byte() | byte() << 8;
        }
        function skip(count) {
          need(count);
          pos += count;
        }
        function blocks() {
          let count;
          let size = 0;
          while ((count = byte()) !== 0) {
            skip(count);
            size += count;
          }
          return size;
        }
        need(13);
        const signature = String.fromCharCode(...bytes.subarray(0, 6));
        if (signature !== "GIF87a" && signature !== "GIF89a") fail("This file is not a GIF (expected GIF87a or GIF89a).");
        pos = 6;
        const width = word();
        const height = word();
        checkSize(width, height);
        const packed = byte();
        skip(2);
        const globalColors = packed & 128 ? 1 << (packed & 7) + 1 : 0;
        skip(globalColors * 3);
        const prefixEnd = pos;
        const frames = [];
        let gce;
        let duration = 0;
        let ended = false;
        while (pos < bytes.length) {
          const start = pos;
          const marker = byte();
          if (marker === 59) {
            ended = true;
            break;
          }
          if (marker === 33) {
            const label = byte();
            if (label === 249) {
              if (byte() !== 4) fail("The GIF has an invalid graphics control block.");
              const flags = byte();
              const delay2 = word();
              const transparentColorIndex = byte();
              if (byte() !== 0) fail("The GIF has an invalid graphics control terminator.");
              const disposal = flags >> 2 & 7;
              if (disposal > 3) fail("The GIF uses an unsupported disposal method.");
              gce = { delay: delay2, transparentColorIndex, extras: { disposal, transparentColorGiven: !!(flags & 1) } };
            } else if (label === 1) {
              fail("GIF plain-text graphics are not supported. Please convert them to image frames.");
            } else {
              blocks();
            }
            continue;
          }
          if (marker !== 44) fail("The GIF contains an invalid block marker.");
          const left = word();
          const top = word();
          const frameWidth = word();
          const frameHeight = word();
          checkSize(frameWidth, frameHeight);
          if (left + frameWidth > width || top + frameHeight > height) fail("A GIF frame extends outside its logical screen.");
          const imageFlags = byte();
          const localColors = imageFlags & 128 ? 1 << (imageFlags & 7) + 1 : 0;
          if (!localColors && !globalColors) fail("The GIF is missing its color palette.");
          skip(localColors * 3);
          const minCodeSize = byte();
          if (minCodeSize < 2 || minCodeSize > 8) fail("The GIF has an invalid LZW code size.");
          if (!blocks()) fail("The GIF contains an empty image frame.");
          const delay = Math.max(20, gce && gce.delay ? gce.delay * 10 : 100);
          duration += delay;
          frames.push({ start, end: pos, gce, delay });
          gce = void 0;
          if (frames.length > MAX_FRAMES) fail("GIFs may contain at most 120 image frames. Please shorten the animation.");
          if (width * height * frames.length > SOURCE_PIXELS) fail("GIF source exceeds the 40 million decoded-pixel budget. Reduce its dimensions or frame count.");
          if (duration > MAX_DURATION) fail("GIF loops must be 10 seconds or shorter. Please shorten the animation.");
        }
        if (!ended) fail("The GIF is incomplete (missing its end marker).");
        if (!frames.length) fail("The GIF contains no image frames.");
        return { bytes, width, height, prefixEnd, frames, duration };
      }
      function validateLZW(data, expectedPixels) {
        const clear = 1 << data.minCodeSize;
        const end = clear + 1;
        const lengths = new Uint16Array(4096);
        lengths.fill(1, 0, clear);
        let size = data.minCodeSize + 1;
        let next = clear + 2;
        let previous = 0;
        let bits = 0;
        let value = 0;
        let position = 0;
        let pixels = 0;
        while (true) {
          while (bits < size) {
            if (position >= data.blocks.length) fail("The GIF contains incomplete LZW image data.");
            value |= data.blocks[position++] << bits;
            bits += 8;
          }
          const code = value & (1 << size) - 1;
          value >>>= size;
          bits -= size;
          if (code === clear) {
            size = data.minCodeSize + 1;
            next = clear + 2;
            previous = 0;
            continue;
          }
          if (code === end) {
            if (pixels !== expectedPixels) fail("The GIF image data does not match its frame dimensions.");
            return;
          }
          if (code > next || code === next && !previous || !previous && code >= clear) fail("The GIF contains an invalid LZW dictionary reference.");
          const length = code === next ? previous + 1 : lengths[code];
          pixels += length;
          if (!length || pixels > expectedPixels) fail("The GIF image data exceeds its frame dimensions.");
          if (previous && next < 4096) {
            lengths[next++] = previous + 1;
            if (next === 1 << size && size < 12) size++;
          }
          previous = length;
        }
      }
      function canvas2D(width, height) {
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) fail("A worker 2D canvas is required to decode GIFs.");
        return { canvas, context };
      }
      function restoreBackground(context, rect, gce, background) {
        context.clearRect(rect.left, rect.top, rect.width, rect.height);
        if (background && !(gce && gce.extras.transparentColorGiven)) {
          context.fillStyle = `rgb(${background[0]},${background[1]},${background[2]})`;
          context.fillRect(rect.left, rect.top, rect.width, rect.height);
        }
      }
      function beginDecode(buffer) {
        const meta = inspectGIF(buffer);
        const header = (0, import_gifuct_js.parseGIF)(meta.bytes.slice(0, meta.prefixEnd).buffer);
        const scale = Math.min(1, 600 / Math.max(meta.width, meta.height), Math.sqrt(OUTPUT_PIXELS / (meta.width * meta.height * meta.frames.length)));
        const width = Math.max(1, Math.floor(meta.width * scale));
        const height = Math.max(1, Math.floor(meta.height * scale));
        const screen = canvas2D(meta.width, meta.height);
        const background = header.gct && header.gct[header.lsd.backgroundColorIndex];
        restoreBackground(screen.context, { left: 0, top: 0, width: meta.width, height: meta.height }, meta.frames[0].gce, background);
        state = { type: "decode", meta, width, height, background, screen, output: canvas2D(width, height), patch: canvas2D(1, 1), index: 0 };
        self.postMessage({ type: "decode-info", width, height, frameCount: meta.frames.length, duration: meta.duration });
      }
      function decodeNext() {
        const s = state;
        if (!s || s.type !== "decode" || s.index >= s.meta.frames.length) fail("Unexpected GIF decode request.");
        const meta = s.meta.frames[s.index];
        const input = new Uint8Array(s.meta.prefixEnd + meta.end - meta.start + 1);
        input.set(s.meta.bytes.subarray(0, s.meta.prefixEnd));
        input.set(s.meta.bytes.subarray(meta.start, meta.end), s.meta.prefixEnd);
        input[input.length - 1] = 59;
        const parsed = (0, import_gifuct_js.parseGIF)(input.buffer);
        const raw = parsed.frames[0];
        raw.gce = meta.gce;
        const descriptor = raw.image.descriptor;
        validateLZW(raw.image.data, descriptor.width * descriptor.height);
        const frame = (0, import_gifuct_js.decompressFrame)(raw, parsed.gct, true);
        if (frame.pixels.some((index) => index >= frame.colorTable.length && index !== frame.transparentIndex)) fail("The GIF references a missing palette color.");
        const rect = frame.dims;
        const context = s.screen.context;
        const saved = frame.disposalType === 3 ? context.getImageData(rect.left, rect.top, rect.width, rect.height) : null;
        s.patch.canvas.width = rect.width;
        s.patch.canvas.height = rect.height;
        s.patch.context.putImageData(new ImageData(frame.patch, rect.width, rect.height), 0, 0);
        context.drawImage(s.patch.canvas, rect.left, rect.top);
        s.output.context.clearRect(0, 0, s.width, s.height);
        s.output.context.drawImage(s.screen.canvas, 0, 0, s.width, s.height);
        const output = s.output.context.getImageData(0, 0, s.width, s.height);
        if (frame.disposalType === 2) restoreBackground(context, rect, meta.gce, s.background);
        else if (saved) context.putImageData(saved, rect.left, rect.top);
        self.postMessage({ type: "decoded-frame", index: s.index++, delay: meta.delay, buffer: output.data.buffer }, [output.data.buffer]);
      }
      function beginEncode(message) {
        const { width, height, frameCount, delay } = message;
        checkSize(width, height);
        if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > MAX_FRAMES) fail("GIF exports must contain between 1 and 120 frames.");
        if (!Number.isInteger(delay) || delay < 20 || delay % 10 || delay * frameCount > MAX_DURATION) fail("GIF loops must be 10 seconds or shorter, with frame delays of at least 20ms.");
        state = { type: "encode", width, height, frameCount, delay, encoder: (0, import_gifenc.GIFEncoder)(), index: 0 };
        self.postMessage({ type: "need-frame", index: 0 });
      }
      function encodeFrame(message) {
        const s = state;
        if (!s || s.type !== "encode" || message.index !== s.index || s.index >= s.frameCount) fail("Unexpected GIF export frame.");
        if (!(message.buffer instanceof ArrayBuffer) || message.buffer.byteLength !== s.width * s.height * 4) fail("GIF export frame dimensions do not match.");
        const rgba = new Uint8ClampedArray(message.buffer);
        for (let i = 0; i < rgba.length; i += 4) {
          if (rgba[i + 3] < 128) rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
        }
        const opaquePalette = (0, import_gifenc.quantize)(rgba, 255, { format: "rgb565" });
        const indexed = (0, import_gifenc.applyPalette)(rgba, opaquePalette, "rgb565");
        for (let i = 0; i < indexed.length; i++) indexed[i] = rgba[i * 4 + 3] < 128 ? 0 : indexed[i] + 1;
        const palette = [[0, 0, 0], ...opaquePalette];
        while (palette.length < 256) palette.push([0, 0, 0]);
        s.encoder.writeFrame(indexed, s.width, s.height, {
          palette,
          delay: s.delay,
          repeat: 0,
          dispose: 2,
          transparent: true,
          transparentIndex: 0
        });
        if (s.encoder.bytesView().byteLength + 1 > MAX_BYTES) fail("The exported GIF exceeds 25 MB. Reduce dimensions or frame count.");
        s.index++;
        if (s.index < s.frameCount) {
          self.postMessage({ type: "need-frame", index: s.index });
        } else {
          s.encoder.finish();
          const bytes = s.encoder.bytes();
          state = null;
          self.postMessage({ type: "encoded", buffer: bytes.buffer }, [bytes.buffer]);
        }
      }
      self.onmessage = function(event) {
        try {
          const message = event.data;
          if (!message || typeof message.type !== "string") fail("Invalid GIF worker request.");
          if (message.type === "decode" || message.type === "encode") {
            if (state) fail("GIF worker is already processing an operation.");
            if (message.type === "decode") beginDecode(message.buffer);
            else beginEncode(message);
          } else if (message.type === "decode-next") decodeNext();
          else if (message.type === "encode-frame") encodeFrame(message);
          else fail("Unknown GIF worker request.");
        } catch (error) {
          state = null;
          self.postMessage({ type: "error", message: error && error.message ? error.message : "GIF processing failed." });
        }
      };
    }
  });
  require_qr_gif_worker_source();
})();
