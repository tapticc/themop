// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/utils/suins.mjs
var SUI_NS_NAME_REGEX = /^(?!.*(^(?!@)|[-.@])($|[-.@]))(?:[a-z0-9-]{0,63}(?:\.[a-z0-9-]{0,63})*)?@[a-z0-9-]{0,63}$/i;
var SUI_NS_DOMAIN_REGEX = /^(?!.*(^|[-.])($|[-.]))(?:[a-z0-9-]{0,63}\.)+sui$/i;
var MAX_SUI_NS_NAME_LENGTH = 235;
function isValidSuiNSName(name) {
  if (name.length > MAX_SUI_NS_NAME_LENGTH)
    return false;
  if (name.includes("@"))
    return SUI_NS_NAME_REGEX.test(name);
  return SUI_NS_DOMAIN_REGEX.test(name);
}
function normalizeSuiNSName(name, format = "at") {
  const lowerCase = name.toLowerCase();
  let parts;
  if (lowerCase.includes("@")) {
    if (!SUI_NS_NAME_REGEX.test(lowerCase))
      throw new Error(`Invalid SuiNS name ${name}`);
    const [labels, domain] = lowerCase.split("@");
    parts = [...labels ? labels.split(".") : [], domain];
  } else {
    if (!SUI_NS_DOMAIN_REGEX.test(lowerCase))
      throw new Error(`Invalid SuiNS name ${name}`);
    parts = lowerCase.split(".").slice(0, -1);
  }
  if (format === "dot")
    return `${parts.join(".")}.sui`;
  return `${parts.slice(0, -1).join(".")}@${parts[parts.length - 1]}`;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/utils/move-registry.mjs
var NAME_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)$/;
var VERSION_REGEX = /^\d+$/;
var MAX_APP_SIZE = 64;
var NAME_SEPARATOR = "/";
var isValidNamedPackage = (name) => {
  const parts = name.split(NAME_SEPARATOR);
  if (parts.length < 2 || parts.length > 3)
    return false;
  const [org, app, version] = parts;
  if (version !== void 0 && !VERSION_REGEX.test(version))
    return false;
  if (!isValidSuiNSName(org))
    return false;
  return NAME_PATTERN.test(app) && app.length < MAX_APP_SIZE;
};
var isValidNamedType = (type) => {
  const splitType = type.split(/::|<|>|,/);
  for (const t of splitType)
    if (t.includes(NAME_SEPARATOR) && !isValidNamedPackage(t))
      return false;
  return isValidStructTag(type);
};

// node_modules/.pnpm/@mysten+bcs@2.0.2/node_modules/@mysten/bcs/dist/uleb.mjs
function ulebEncode(num) {
  let bigNum = BigInt(num);
  const arr = [];
  let len = 0;
  if (bigNum === 0n)
    return [0];
  while (bigNum > 0) {
    arr[len] = Number(bigNum & 127n);
    bigNum >>= 7n;
    if (bigNum > 0n)
      arr[len] |= 128;
    len += 1;
  }
  return arr;
}
function ulebDecode(arr) {
  let total = 0n;
  let shift = 0n;
  let len = 0;
  while (true) {
    if (len >= arr.length)
      throw new Error("ULEB decode error: buffer overflow");
    const byte = arr[len];
    len += 1;
    total += BigInt(byte & 127) << shift;
    if ((byte & 128) === 0)
      break;
    shift += 7n;
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("ULEB decode error: value exceeds MAX_SAFE_INTEGER");
  return {
    value: Number(total),
    length: len
  };
}

// node_modules/.pnpm/@mysten+bcs@2.0.2/node_modules/@mysten/bcs/dist/reader.mjs
var BcsReader = class {
  /**
  * @param {Uint8Array} data Data to use as a buffer.
  */
  constructor(data) {
    this.bytePosition = 0;
    this.dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  /**
  * Shift current cursor position by `bytes`.
  *
  * @param {Number} bytes Number of bytes to
  * @returns {this} Self for possible chaining.
  */
  shift(bytes) {
    this.bytePosition += bytes;
    return this;
  }
  /**
  * Read U8 value from the buffer and shift cursor by 1.
  * @returns
  */
  read8() {
    const value = this.dataView.getUint8(this.bytePosition);
    this.shift(1);
    return value;
  }
  /**
  * Read U16 value from the buffer and shift cursor by 2.
  * @returns
  */
  read16() {
    const value = this.dataView.getUint16(this.bytePosition, true);
    this.shift(2);
    return value;
  }
  /**
  * Read U32 value from the buffer and shift cursor by 4.
  * @returns
  */
  read32() {
    const value = this.dataView.getUint32(this.bytePosition, true);
    this.shift(4);
    return value;
  }
  /**
  * Read U64 value from the buffer and shift cursor by 8.
  * @returns
  */
  read64() {
    const value1 = this.read32();
    const result = this.read32().toString(16) + value1.toString(16).padStart(8, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
  * Read U128 value from the buffer and shift cursor by 16.
  */
  read128() {
    const value1 = BigInt(this.read64());
    const result = BigInt(this.read64()).toString(16) + value1.toString(16).padStart(16, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
  * Read U128 value from the buffer and shift cursor by 32.
  * @returns
  */
  read256() {
    const value1 = BigInt(this.read128());
    const result = BigInt(this.read128()).toString(16) + value1.toString(16).padStart(32, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
  * Read `num` number of bytes from the buffer and shift cursor by `num`.
  * @param num Number of bytes to read.
  */
  readBytes(num) {
    const start = this.bytePosition + this.dataView.byteOffset;
    const value = new Uint8Array(this.dataView.buffer, start, num);
    this.shift(num);
    return value;
  }
  /**
  * Read ULEB value - an integer of varying size. Used for enum indexes and
  * vector lengths.
  * @returns {Number} The ULEB value.
  */
  readULEB() {
    const start = this.bytePosition + this.dataView.byteOffset;
    const { value, length } = ulebDecode(new Uint8Array(this.dataView.buffer, start));
    this.shift(length);
    return value;
  }
  /**
  * Read a BCS vector: read a length and then apply function `cb` X times
  * where X is the length of the vector, defined as ULEB in BCS bytes.
  * @param cb Callback to process elements of vector.
  * @returns {Array<Any>} Array of the resulting values, returned by callback.
  */
  readVec(cb) {
    const length = this.readULEB();
    const result = [];
    for (let i = 0; i < length; i++)
      result.push(cb(this, i, length));
    return result;
  }
};

// node_modules/.pnpm/@scure+base@2.0.0/node_modules/@scure/base/index.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function isArrayOf(isString, arr) {
  if (!Array.isArray(arr))
    return false;
  if (arr.length === 0)
    return true;
  if (isString) {
    return arr.every((item) => typeof item === "string");
  } else {
    return arr.every((item) => Number.isSafeInteger(item));
  }
}
function astr(label, input) {
  if (typeof input !== "string")
    throw new Error(`${label}: string expected`);
  return true;
}
function anumber(n) {
  if (!Number.isSafeInteger(n))
    throw new Error(`invalid integer: ${n}`);
}
function aArr(input) {
  if (!Array.isArray(input))
    throw new Error("array expected");
}
function astrArr(label, input) {
  if (!isArrayOf(true, input))
    throw new Error(`${label}: array of strings expected`);
}
function anumArr(label, input) {
  if (!isArrayOf(false, input))
    throw new Error(`${label}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function chain(...args) {
  const id = (a) => a;
  const wrap = (a, b) => (c2) => a(b(c2));
  const encode = args.map((x) => x.encode).reduceRight(wrap, id);
  const decode = args.map((x) => x.decode).reduce(wrap, id);
  return { encode, decode };
}
// @__NO_SIDE_EFFECTS__
function alphabet(letters) {
  const lettersA = typeof letters === "string" ? letters.split("") : letters;
  const len = lettersA.length;
  astrArr("alphabet", lettersA);
  const indexes = new Map(lettersA.map((l, i) => [l, i]));
  return {
    encode: (digits) => {
      aArr(digits);
      return digits.map((i) => {
        if (!Number.isSafeInteger(i) || i < 0 || i >= len)
          throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${letters}`);
        return lettersA[i];
      });
    },
    decode: (input) => {
      aArr(input);
      return input.map((letter) => {
        astr("alphabet.decode", letter);
        const i = indexes.get(letter);
        if (i === void 0)
          throw new Error(`Unknown letter: "${letter}". Allowed: ${letters}`);
        return i;
      });
    }
  };
}
// @__NO_SIDE_EFFECTS__
function join(separator = "") {
  astr("join", separator);
  return {
    encode: (from) => {
      astrArr("join.decode", from);
      return from.join(separator);
    },
    decode: (to) => {
      astr("join.decode", to);
      return to.split(separator);
    }
  };
}
function convertRadix(data, from, to) {
  if (from < 2)
    throw new Error(`convertRadix: invalid from=${from}, base cannot be less than 2`);
  if (to < 2)
    throw new Error(`convertRadix: invalid to=${to}, base cannot be less than 2`);
  aArr(data);
  if (!data.length)
    return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data, (d) => {
    anumber(d);
    if (d < 0 || d >= from)
      throw new Error(`invalid integer: ${d}`);
    return d;
  });
  const dlen = digits.length;
  while (true) {
    let carry = 0;
    let done = true;
    for (let i = pos; i < dlen; i++) {
      const digit = digits[i];
      const fromCarry = from * carry;
      const digitBase = fromCarry + digit;
      if (!Number.isSafeInteger(digitBase) || fromCarry / from !== carry || digitBase - digit !== fromCarry) {
        throw new Error("convertRadix: carry overflow");
      }
      const div = digitBase / to;
      carry = digitBase % to;
      const rounded = Math.floor(div);
      digits[i] = rounded;
      if (!Number.isSafeInteger(rounded) || rounded * to + carry !== digitBase)
        throw new Error("convertRadix: carry overflow");
      if (!done)
        continue;
      else if (!rounded)
        pos = i;
      else
        done = false;
    }
    res.push(carry);
    if (done)
      break;
  }
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++)
    res.push(0);
  return res.reverse();
}
// @__NO_SIDE_EFFECTS__
function radix(num) {
  anumber(num);
  const _256 = 2 ** 8;
  return {
    encode: (bytes) => {
      if (!isBytes(bytes))
        throw new Error("radix.encode input should be Uint8Array");
      return convertRadix(Array.from(bytes), _256, num);
    },
    decode: (digits) => {
      anumArr("radix.decode", digits);
      return Uint8Array.from(convertRadix(digits, num, _256));
    }
  };
}
var genBase58 = /* @__NO_SIDE_EFFECTS__ */ (abc) => /* @__PURE__ */ chain(/* @__PURE__ */ radix(58), /* @__PURE__ */ alphabet(abc), /* @__PURE__ */ join(""));
var base58 = /* @__PURE__ */ genBase58("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");

// node_modules/.pnpm/@mysten+utils@0.3.1/node_modules/@mysten/utils/dist/b58.mjs
var toBase58 = (buffer) => base58.encode(buffer);
var fromBase58 = (str) => base58.decode(str);

// node_modules/.pnpm/@mysten+utils@0.3.1/node_modules/@mysten/utils/dist/b64.mjs
function fromBase64(base64String2) {
  return Uint8Array.from(atob(base64String2), (char) => char.charCodeAt(0));
}
var CHUNK_SIZE = 8192;
function toBase64(bytes) {
  if (bytes.length < CHUNK_SIZE)
    return btoa(String.fromCharCode(...bytes));
  let output = "";
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk2 = bytes.slice(i, i + CHUNK_SIZE);
    output += String.fromCharCode(...chunk2);
  }
  return btoa(output);
}

// node_modules/.pnpm/@mysten+utils@0.3.1/node_modules/@mysten/utils/dist/hex.mjs
function fromHex(hexStr) {
  const normalized = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
  const padded = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
  const intArr = padded.match(/[0-9a-fA-F]{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [];
  if (intArr.length !== padded.length / 2)
    throw new Error(`Invalid hex string ${hexStr}`);
  return Uint8Array.from(intArr);
}
function toHex(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}

// node_modules/.pnpm/@mysten+utils@0.3.1/node_modules/@mysten/utils/dist/chunk.mjs
function chunk(array2, size) {
  return Array.from({ length: Math.ceil(array2.length / size) }, (_, i) => {
    return array2.slice(i * size, (i + 1) * size);
  });
}

// node_modules/.pnpm/@mysten+utils@0.3.1/node_modules/@mysten/utils/dist/dataloader.mjs
var DataLoader = class {
  constructor(batchLoadFn, options) {
    if (typeof batchLoadFn !== "function")
      throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}.`);
    this._batchLoadFn = batchLoadFn;
    this._maxBatchSize = getValidMaxBatchSize(options);
    this._batchScheduleFn = getValidBatchScheduleFn(options);
    this._cacheKeyFn = getValidCacheKeyFn(options);
    this._cacheMap = getValidCacheMap(options);
    this._batch = null;
    this.name = getValidName(options);
  }
  /**
  * Loads a key, returning a `Promise` for the value represented by that key.
  */
  load(key) {
    if (key === null || key === void 0)
      throw new TypeError(`The loader.load() function must be called with a value, but got: ${String(key)}.`);
    const batch = getCurrentBatch(this);
    const cacheMap = this._cacheMap;
    let cacheKey;
    if (cacheMap) {
      cacheKey = this._cacheKeyFn(key);
      const cachedPromise = cacheMap.get(cacheKey);
      if (cachedPromise) {
        const cacheHits = batch.cacheHits || (batch.cacheHits = []);
        return new Promise((resolve) => {
          cacheHits.push(() => {
            resolve(cachedPromise);
          });
        });
      }
    }
    batch.keys.push(key);
    const promise = new Promise((resolve, reject) => {
      batch.callbacks.push({
        resolve,
        reject
      });
    });
    if (cacheMap)
      cacheMap.set(cacheKey, promise);
    return promise;
  }
  /**
  * Loads multiple keys, promising an array of values:
  *
  *     var [ a, b ] = await myLoader.loadMany([ 'a', 'b' ]);
  *
  * This is similar to the more verbose:
  *
  *     var [ a, b ] = await Promise.all([
  *       myLoader.load('a'),
  *       myLoader.load('b')
  *     ]);
  *
  * However it is different in the case where any load fails. Where
  * Promise.all() would reject, loadMany() always resolves, however each result
  * is either a value or an Error instance.
  *
  *     var [ a, b, c ] = await myLoader.loadMany([ 'a', 'b', 'badkey' ]);
  *     // c instanceof Error
  *
  */
  loadMany(keys) {
    if (!isArrayLike(keys))
      throw new TypeError(`The loader.loadMany() function must be called with Array<key>, but got: ${keys}.`);
    const loadPromises = [];
    for (let i = 0; i < keys.length; i++)
      loadPromises.push(this.load(keys[i]).catch((error) => error));
    return Promise.all(loadPromises);
  }
  /**
  * Clears the value at `key` from the cache, if it exists. Returns itself for
  * method chaining.
  */
  clear(key) {
    const cacheMap = this._cacheMap;
    if (cacheMap) {
      const cacheKey = this._cacheKeyFn(key);
      cacheMap.delete(cacheKey);
    }
    return this;
  }
  /**
  * Clears the entire cache. To be used when some event results in unknown
  * invalidations across this particular `DataLoader`. Returns itself for
  * method chaining.
  */
  clearAll() {
    const cacheMap = this._cacheMap;
    if (cacheMap)
      cacheMap.clear();
    return this;
  }
  /**
  * Adds the provided key and value to the cache. If the key already
  * exists, no change is made. Returns itself for method chaining.
  *
  * To prime the cache with an error at a key, provide an Error instance.
  */
  prime(key, value) {
    const cacheMap = this._cacheMap;
    if (cacheMap) {
      const cacheKey = this._cacheKeyFn(key);
      if (cacheMap.get(cacheKey) === void 0) {
        let promise;
        if (value instanceof Error) {
          promise = Promise.reject(value);
          promise.catch(() => {
          });
        } else
          promise = Promise.resolve(value);
        cacheMap.set(cacheKey, promise);
      }
    }
    return this;
  }
};
var enqueuePostPromiseJob = typeof process === "object" && typeof process.nextTick === "function" ? function(fn) {
  if (!resolvedPromise)
    resolvedPromise = Promise.resolve();
  resolvedPromise.then(() => {
    process.nextTick(fn);
  });
} : typeof setImmediate === "function" ? function(fn) {
  setImmediate(fn);
} : function(fn) {
  setTimeout(fn);
};
var resolvedPromise;
function getCurrentBatch(loader) {
  const existingBatch = loader._batch;
  if (existingBatch !== null && !existingBatch.hasDispatched && existingBatch.keys.length < loader._maxBatchSize)
    return existingBatch;
  const newBatch = {
    hasDispatched: false,
    keys: [],
    callbacks: []
  };
  loader._batch = newBatch;
  loader._batchScheduleFn(() => {
    dispatchBatch(loader, newBatch);
  });
  return newBatch;
}
function dispatchBatch(loader, batch) {
  batch.hasDispatched = true;
  if (batch.keys.length === 0) {
    resolveCacheHits(batch);
    return;
  }
  let batchPromise;
  try {
    batchPromise = loader._batchLoadFn(batch.keys);
  } catch (e) {
    return failedDispatch(loader, batch, /* @__PURE__ */ new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function errored synchronously: ${String(e)}.`));
  }
  if (!batchPromise || typeof batchPromise.then !== "function")
    return failedDispatch(loader, batch, /* @__PURE__ */ new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise: ${String(batchPromise)}.`));
  Promise.resolve(batchPromise).then((values) => {
    if (!isArrayLike(values))
      throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array: ${String(values)}.`);
    if (values.length !== batch.keys.length)
      throw new TypeError(`DataLoader must be constructed with a function which accepts Array<key> and returns Promise<Array<value>>, but the function did not return a Promise of an Array of the same length as the Array of keys.

Keys:
${String(batch.keys)}

Values:
${String(values)}`);
    resolveCacheHits(batch);
    for (let i = 0; i < batch.callbacks.length; i++) {
      const value = values[i];
      if (value instanceof Error)
        batch.callbacks[i].reject(value);
      else
        batch.callbacks[i].resolve(value);
    }
  }).catch((error) => {
    failedDispatch(loader, batch, error);
  });
}
function failedDispatch(loader, batch, error) {
  resolveCacheHits(batch);
  for (let i = 0; i < batch.keys.length; i++) {
    loader.clear(batch.keys[i]);
    batch.callbacks[i].reject(error);
  }
}
function resolveCacheHits(batch) {
  if (batch.cacheHits)
    for (let i = 0; i < batch.cacheHits.length; i++)
      batch.cacheHits[i]();
}
function getValidMaxBatchSize(options) {
  if (!(!options || options.batch !== false))
    return 1;
  const maxBatchSize = options && options.maxBatchSize;
  if (maxBatchSize === void 0)
    return Infinity;
  if (typeof maxBatchSize !== "number" || maxBatchSize < 1)
    throw new TypeError(`maxBatchSize must be a positive number: ${maxBatchSize}`);
  return maxBatchSize;
}
function getValidBatchScheduleFn(options) {
  const batchScheduleFn = options && options.batchScheduleFn;
  if (batchScheduleFn === void 0)
    return enqueuePostPromiseJob;
  if (typeof batchScheduleFn !== "function")
    throw new TypeError(`batchScheduleFn must be a function: ${batchScheduleFn}`);
  return batchScheduleFn;
}
function getValidCacheKeyFn(options) {
  const cacheKeyFn = options && options.cacheKeyFn;
  if (cacheKeyFn === void 0)
    return (key) => key;
  if (typeof cacheKeyFn !== "function")
    throw new TypeError(`cacheKeyFn must be a function: ${cacheKeyFn}`);
  return cacheKeyFn;
}
function getValidCacheMap(options) {
  if (!(!options || options.cache !== false))
    return null;
  const cacheMap = options && options.cacheMap;
  if (cacheMap === void 0)
    return /* @__PURE__ */ new Map();
  if (cacheMap !== null) {
    const missingFunctions = [
      "get",
      "set",
      "delete",
      "clear"
    ].filter((fnName) => cacheMap && typeof cacheMap[fnName] !== "function");
    if (missingFunctions.length !== 0)
      throw new TypeError("Custom cacheMap missing methods: " + missingFunctions.join(", "));
  }
  return cacheMap;
}
function getValidName(options) {
  if (options && options.name)
    return options.name;
  return null;
}
function isArrayLike(x) {
  return typeof x === "object" && x !== null && "length" in x && typeof x.length === "number" && (x.length === 0 || x.length > 0 && Object.prototype.hasOwnProperty.call(x, x.length - 1));
}

// node_modules/.pnpm/@mysten+bcs@2.0.2/node_modules/@mysten/bcs/dist/utils.mjs
function encodeStr(data, encoding) {
  switch (encoding) {
    case "base58":
      return toBase58(data);
    case "base64":
      return toBase64(data);
    case "hex":
      return toHex(data);
    default:
      throw new Error("Unsupported encoding, supported values are: base64, hex");
  }
}
function splitGenericParameters(str, genericSeparators = ["<", ">"]) {
  const [left, right] = genericSeparators;
  const tok = [];
  let word = "";
  let nestedAngleBrackets = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === left)
      nestedAngleBrackets++;
    if (char === right)
      nestedAngleBrackets--;
    if (nestedAngleBrackets === 0 && char === ",") {
      tok.push(word.trim());
      word = "";
      continue;
    }
    word += char;
  }
  tok.push(word.trim());
  return tok;
}

// node_modules/.pnpm/@mysten+bcs@2.0.2/node_modules/@mysten/bcs/dist/writer.mjs
var BcsWriter = class {
  constructor({ initialSize = 1024, maxSize = Infinity, allocateSize = 1024 } = {}) {
    this.bytePosition = 0;
    this.size = initialSize;
    this.maxSize = maxSize;
    this.allocateSize = allocateSize;
    this.dataView = new DataView(new ArrayBuffer(initialSize));
  }
  ensureSizeOrGrow(bytes) {
    const requiredSize = this.bytePosition + bytes;
    if (requiredSize > this.size) {
      const nextSize = Math.min(this.maxSize, Math.max(this.size + requiredSize, this.size + this.allocateSize));
      if (requiredSize > nextSize)
        throw new Error(`Attempting to serialize to BCS, but buffer does not have enough size. Allocated size: ${this.size}, Max size: ${this.maxSize}, Required size: ${requiredSize}`);
      this.size = nextSize;
      const nextBuffer = new ArrayBuffer(this.size);
      new Uint8Array(nextBuffer).set(new Uint8Array(this.dataView.buffer));
      this.dataView = new DataView(nextBuffer);
    }
  }
  /**
  * Shift current cursor position by `bytes`.
  *
  * @param {Number} bytes Number of bytes to
  * @returns {this} Self for possible chaining.
  */
  shift(bytes) {
    this.bytePosition += bytes;
    return this;
  }
  /**
  * Write a U8 value into a buffer and shift cursor position by 1.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  write8(value) {
    this.ensureSizeOrGrow(1);
    this.dataView.setUint8(this.bytePosition, Number(value));
    return this.shift(1);
  }
  /**
  * Write a U8 value into a buffer and shift cursor position by 1.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  writeBytes(bytes) {
    this.ensureSizeOrGrow(bytes.length);
    for (let i = 0; i < bytes.length; i++)
      this.dataView.setUint8(this.bytePosition + i, bytes[i]);
    return this.shift(bytes.length);
  }
  /**
  * Write a U16 value into a buffer and shift cursor position by 2.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  write16(value) {
    this.ensureSizeOrGrow(2);
    this.dataView.setUint16(this.bytePosition, Number(value), true);
    return this.shift(2);
  }
  /**
  * Write a U32 value into a buffer and shift cursor position by 4.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  write32(value) {
    this.ensureSizeOrGrow(4);
    this.dataView.setUint32(this.bytePosition, Number(value), true);
    return this.shift(4);
  }
  /**
  * Write a U64 value into a buffer and shift cursor position by 8.
  * @param {bigint} value Value to write.
  * @returns {this}
  */
  write64(value) {
    toLittleEndian(BigInt(value), 8).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a U128 value into a buffer and shift cursor position by 16.
  *
  * @param {bigint} value Value to write.
  * @returns {this}
  */
  write128(value) {
    toLittleEndian(BigInt(value), 16).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a U256 value into a buffer and shift cursor position by 16.
  *
  * @param {bigint} value Value to write.
  * @returns {this}
  */
  write256(value) {
    toLittleEndian(BigInt(value), 32).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a ULEB value into a buffer and shift cursor position by number of bytes
  * written.
  * @param {Number} value Value to write.
  * @returns {this}
  */
  writeULEB(value) {
    ulebEncode(value).forEach((el) => this.write8(el));
    return this;
  }
  /**
  * Write a vector into a buffer by first writing the vector length and then calling
  * a callback on each passed value.
  *
  * @param {Array<Any>} vector Array of elements to write.
  * @param {WriteVecCb} cb Callback to call on each element of the vector.
  * @returns {this}
  */
  writeVec(vector2, cb) {
    this.writeULEB(vector2.length);
    Array.from(vector2).forEach((el, i) => cb(this, el, i, vector2.length));
    return this;
  }
  /**
  * Adds support for iterations over the object.
  * @returns {Uint8Array}
  */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.bytePosition; i++)
      yield this.dataView.getUint8(i);
    return this.toBytes();
  }
  /**
  * Get underlying buffer taking only value bytes (in case initial buffer size was bigger).
  * @returns {Uint8Array} Resulting bcs.
  */
  toBytes() {
    return new Uint8Array(this.dataView.buffer.slice(0, this.bytePosition));
  }
  /**
  * Represent data as 'hex' or 'base64'
  * @param encoding Encoding to use: 'base64' or 'hex'
  */
  toString(encoding) {
    return encodeStr(this.toBytes(), encoding);
  }
};
function toLittleEndian(bigint2, size) {
  const result = new Uint8Array(size);
  let i = 0;
  while (bigint2 > 0) {
    result[i] = Number(bigint2 % BigInt(256));
    bigint2 = bigint2 / BigInt(256);
    i += 1;
  }
  return result;
}

// node_modules/.pnpm/@mysten+bcs@2.0.2/node_modules/@mysten/bcs/dist/bcs-type.mjs
var BcsType = class BcsType2 {
  #write;
  #serialize;
  constructor(options) {
    this.name = options.name;
    this.read = options.read;
    this.serializedSize = options.serializedSize ?? (() => null);
    this.#write = options.write;
    this.#serialize = options.serialize ?? ((value, options$1) => {
      const writer = new BcsWriter({
        initialSize: this.serializedSize(value) ?? void 0,
        ...options$1
      });
      this.#write(value, writer);
      return writer.toBytes();
    });
    this.validate = options.validate ?? (() => {
    });
  }
  write(value, writer) {
    this.validate(value);
    this.#write(value, writer);
  }
  serialize(value, options) {
    this.validate(value);
    return new SerializedBcs(this, this.#serialize(value, options));
  }
  parse(bytes) {
    const reader = new BcsReader(bytes);
    return this.read(reader);
  }
  fromHex(hex) {
    return this.parse(fromHex(hex));
  }
  fromBase58(b64) {
    return this.parse(fromBase58(b64));
  }
  fromBase64(b64) {
    return this.parse(fromBase64(b64));
  }
  transform({ name, input, output, validate: validate2 }) {
    return new BcsType2({
      name: name ?? this.name,
      read: (reader) => output ? output(this.read(reader)) : this.read(reader),
      write: (value, writer) => this.#write(input ? input(value) : value, writer),
      serializedSize: (value) => this.serializedSize(input ? input(value) : value),
      serialize: (value, options) => this.#serialize(input ? input(value) : value, options),
      validate: (value) => {
        validate2?.(value);
        this.validate(input ? input(value) : value);
      }
    });
  }
};
var SERIALIZED_BCS_BRAND = Symbol.for("@mysten/serialized-bcs");
function isSerializedBcs(obj) {
  return !!obj && typeof obj === "object" && obj[SERIALIZED_BCS_BRAND] === true;
}
var SerializedBcs = class {
  #schema;
  #bytes;
  get [SERIALIZED_BCS_BRAND]() {
    return true;
  }
  constructor(schema, bytes) {
    this.#schema = schema;
    this.#bytes = bytes;
  }
  toBytes() {
    return this.#bytes;
  }
  toHex() {
    return toHex(this.#bytes);
  }
  toBase64() {
    return toBase64(this.#bytes);
  }
  toBase58() {
    return toBase58(this.#bytes);
  }
  parse() {
    return this.#schema.parse(this.#bytes);
  }
};
function fixedSizeBcsType({ size, ...options }) {
  return new BcsType({
    ...options,
    serializedSize: () => size
  });
}
function uIntBcsType({ readMethod, writeMethod, ...options }) {
  return fixedSizeBcsType({
    ...options,
    read: (reader) => reader[readMethod](),
    write: (value, writer) => writer[writeMethod](value),
    validate: (value) => {
      if (value < 0 || value > options.maxValue)
        throw new TypeError(`Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`);
      options.validate?.(value);
    }
  });
}
function bigUIntBcsType({ readMethod, writeMethod, ...options }) {
  return fixedSizeBcsType({
    ...options,
    read: (reader) => reader[readMethod](),
    write: (value, writer) => writer[writeMethod](BigInt(value)),
    validate: (val) => {
      const value = BigInt(val);
      if (value < 0 || value > options.maxValue)
        throw new TypeError(`Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`);
      options.validate?.(value);
    }
  });
}
function dynamicSizeBcsType({ serialize, ...options }) {
  const type = new BcsType({
    ...options,
    serialize,
    write: (value, writer) => {
      for (const byte of type.serialize(value).toBytes())
        writer.write8(byte);
    }
  });
  return type;
}
function stringLikeBcsType({ toBytes, fromBytes, ...options }) {
  return new BcsType({
    ...options,
    read: (reader) => {
      const length = reader.readULEB();
      return fromBytes(reader.readBytes(length));
    },
    write: (hex, writer) => {
      const bytes = toBytes(hex);
      writer.writeULEB(bytes.length);
      for (let i = 0; i < bytes.length; i++)
        writer.write8(bytes[i]);
    },
    serialize: (value) => {
      const bytes = toBytes(value);
      const size = ulebEncode(bytes.length);
      const result = new Uint8Array(size.length + bytes.length);
      result.set(size, 0);
      result.set(bytes, size.length);
      return result;
    },
    validate: (value) => {
      if (typeof value !== "string")
        throw new TypeError(`Invalid ${options.name} value: ${value}. Expected string`);
      options.validate?.(value);
    }
  });
}
function lazyBcsType(cb) {
  let lazyType = null;
  function getType() {
    if (!lazyType)
      lazyType = cb();
    return lazyType;
  }
  return new BcsType({
    name: "lazy",
    read: (data) => getType().read(data),
    serializedSize: (value) => getType().serializedSize(value),
    write: (value, writer) => getType().write(value, writer),
    serialize: (value, options) => getType().serialize(value, options).toBytes()
  });
}
var BcsStruct = class extends BcsType {
  constructor({ name, fields, ...options }) {
    const canonicalOrder = Object.entries(fields);
    super({
      name,
      serializedSize: (values) => {
        let total = 0;
        for (const [field, type] of canonicalOrder) {
          const size = type.serializedSize(values[field]);
          if (size == null)
            return null;
          total += size;
        }
        return total;
      },
      read: (reader) => {
        const result = {};
        for (const [field, type] of canonicalOrder)
          result[field] = type.read(reader);
        return result;
      },
      write: (value, writer) => {
        for (const [field, type] of canonicalOrder)
          type.write(value[field], writer);
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "object" || value == null)
          throw new TypeError(`Expected object, found ${typeof value}`);
      }
    });
  }
};
var BcsEnum = class extends BcsType {
  constructor({ fields, ...options }) {
    const canonicalOrder = Object.entries(fields);
    super({
      read: (reader) => {
        const index = reader.readULEB();
        const enumEntry = canonicalOrder[index];
        if (!enumEntry)
          throw new TypeError(`Unknown value ${index} for enum ${options.name}`);
        const [kind, type] = enumEntry;
        return {
          [kind]: type?.read(reader) ?? true,
          $kind: kind
        };
      },
      write: (value, writer) => {
        const [name, val] = Object.entries(value).filter(([name$1]) => Object.hasOwn(fields, name$1))[0];
        for (let i = 0; i < canonicalOrder.length; i++) {
          const [optionName, optionType] = canonicalOrder[i];
          if (optionName === name) {
            writer.writeULEB(i);
            optionType?.write(val, writer);
            return;
          }
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "object" || value == null)
          throw new TypeError(`Expected object, found ${typeof value}`);
        const keys = Object.keys(value).filter((k) => value[k] !== void 0 && Object.hasOwn(fields, k));
        if (keys.length !== 1)
          throw new TypeError(`Expected object with one key, but found ${keys.length} for type ${options.name}}`);
        const [variant] = keys;
        if (!Object.hasOwn(fields, variant))
          throw new TypeError(`Invalid enum variant ${variant}`);
      }
    });
  }
};
var BcsTuple = class extends BcsType {
  constructor({ fields, name, ...options }) {
    super({
      name: name ?? `(${fields.map((t) => t.name).join(", ")})`,
      serializedSize: (values) => {
        let total = 0;
        for (let i = 0; i < fields.length; i++) {
          const size = fields[i].serializedSize(values[i]);
          if (size == null)
            return null;
          total += size;
        }
        return total;
      },
      read: (reader) => {
        const result = [];
        for (const field of fields)
          result.push(field.read(reader));
        return result;
      },
      write: (value, writer) => {
        for (let i = 0; i < fields.length; i++)
          fields[i].write(value[i], writer);
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (!Array.isArray(value))
          throw new TypeError(`Expected array, found ${typeof value}`);
        if (value.length !== fields.length)
          throw new TypeError(`Expected array of length ${fields.length}, found ${value.length}`);
      }
    });
  }
};

// node_modules/.pnpm/@mysten+bcs@2.0.2/node_modules/@mysten/bcs/dist/bcs.mjs
function fixedArray(size, type, options) {
  return new BcsType({
    read: (reader) => {
      const result = new Array(size);
      for (let i = 0; i < size; i++)
        result[i] = type.read(reader);
      return result;
    },
    write: (value, writer) => {
      for (const item of value)
        type.write(item, writer);
    },
    ...options,
    name: options?.name ?? `${type.name}[${size}]`,
    validate: (value) => {
      options?.validate?.(value);
      if (!value || typeof value !== "object" || !("length" in value))
        throw new TypeError(`Expected array, found ${typeof value}`);
      if (value.length !== size)
        throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
    }
  });
}
function option(type) {
  return bcs.enum(`Option<${type.name}>`, {
    None: null,
    Some: type
  }).transform({
    input: (value) => {
      if (value == null)
        return { None: true };
      return { Some: value };
    },
    output: (value) => {
      if (value.$kind === "Some")
        return value.Some;
      return null;
    }
  });
}
function vector(type, options) {
  return new BcsType({
    read: (reader) => {
      const length = reader.readULEB();
      const result = new Array(length);
      for (let i = 0; i < length; i++)
        result[i] = type.read(reader);
      return result;
    },
    write: (value, writer) => {
      writer.writeULEB(value.length);
      for (const item of value)
        type.write(item, writer);
    },
    ...options,
    name: options?.name ?? `vector<${type.name}>`,
    validate: (value) => {
      options?.validate?.(value);
      if (!value || typeof value !== "object" || !("length" in value))
        throw new TypeError(`Expected array, found ${typeof value}`);
    }
  });
}
function compareBcsBytes(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++)
    if (a[i] !== b[i])
      return a[i] - b[i];
  return a.length - b.length;
}
function map(keyType, valueType) {
  return new BcsType({
    name: `Map<${keyType.name}, ${valueType.name}>`,
    read: (reader) => {
      const length = reader.readULEB();
      const result = /* @__PURE__ */ new Map();
      for (let i = 0; i < length; i++)
        result.set(keyType.read(reader), valueType.read(reader));
      return result;
    },
    write: (value, writer) => {
      const entries = [...value.entries()].map(([key, val]) => [keyType.serialize(key).toBytes(), val]);
      entries.sort(([a], [b]) => compareBcsBytes(a, b));
      writer.writeULEB(entries.length);
      for (const [keyBytes, val] of entries) {
        writer.writeBytes(keyBytes);
        valueType.write(val, writer);
      }
    }
  });
}
var bcs = {
  u8(options) {
    return uIntBcsType({
      readMethod: "read8",
      writeMethod: "write8",
      size: 1,
      maxValue: 2 ** 8 - 1,
      ...options,
      name: options?.name ?? "u8"
    });
  },
  u16(options) {
    return uIntBcsType({
      readMethod: "read16",
      writeMethod: "write16",
      size: 2,
      maxValue: 2 ** 16 - 1,
      ...options,
      name: options?.name ?? "u16"
    });
  },
  u32(options) {
    return uIntBcsType({
      readMethod: "read32",
      writeMethod: "write32",
      size: 4,
      maxValue: 2 ** 32 - 1,
      ...options,
      name: options?.name ?? "u32"
    });
  },
  u64(options) {
    return bigUIntBcsType({
      readMethod: "read64",
      writeMethod: "write64",
      size: 8,
      maxValue: 2n ** 64n - 1n,
      ...options,
      name: options?.name ?? "u64"
    });
  },
  u128(options) {
    return bigUIntBcsType({
      readMethod: "read128",
      writeMethod: "write128",
      size: 16,
      maxValue: 2n ** 128n - 1n,
      ...options,
      name: options?.name ?? "u128"
    });
  },
  u256(options) {
    return bigUIntBcsType({
      readMethod: "read256",
      writeMethod: "write256",
      size: 32,
      maxValue: 2n ** 256n - 1n,
      ...options,
      name: options?.name ?? "u256"
    });
  },
  bool(options) {
    return fixedSizeBcsType({
      size: 1,
      read: (reader) => reader.read8() === 1,
      write: (value, writer) => writer.write8(value ? 1 : 0),
      ...options,
      name: options?.name ?? "bool",
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "boolean")
          throw new TypeError(`Expected boolean, found ${typeof value}`);
      }
    });
  },
  uleb128(options) {
    return dynamicSizeBcsType({
      read: (reader) => reader.readULEB(),
      serialize: (value) => {
        return Uint8Array.from(ulebEncode(value));
      },
      ...options,
      name: options?.name ?? "uleb128"
    });
  },
  bytes(size, options) {
    return fixedSizeBcsType({
      size,
      read: (reader) => reader.readBytes(size),
      write: (value, writer) => {
        writer.writeBytes(new Uint8Array(value));
      },
      ...options,
      name: options?.name ?? `bytes[${size}]`,
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value))
          throw new TypeError(`Expected array, found ${typeof value}`);
        if (value.length !== size)
          throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
      }
    });
  },
  byteVector(options) {
    return new BcsType({
      read: (reader) => {
        const length = reader.readULEB();
        return reader.readBytes(length);
      },
      write: (value, writer) => {
        const array2 = new Uint8Array(value);
        writer.writeULEB(array2.length);
        writer.writeBytes(array2);
      },
      ...options,
      name: options?.name ?? "vector<u8>",
      serializedSize: (value) => {
        const length = "length" in value ? value.length : null;
        return length == null ? null : ulebEncode(length).length + length;
      },
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value))
          throw new TypeError(`Expected array, found ${typeof value}`);
      }
    });
  },
  string(options) {
    return stringLikeBcsType({
      toBytes: (value) => new TextEncoder().encode(value),
      fromBytes: (bytes) => new TextDecoder().decode(bytes),
      ...options,
      name: options?.name ?? "string"
    });
  },
  fixedArray,
  option,
  vector,
  tuple(fields, options) {
    return new BcsTuple({
      fields,
      ...options
    });
  },
  struct(name, fields, options) {
    return new BcsStruct({
      name,
      fields,
      ...options
    });
  },
  enum(name, fields, options) {
    return new BcsEnum({
      name,
      fields,
      ...options
    });
  },
  map,
  lazy(cb) {
    return lazyBcsType(cb);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/utils/sui-types.mjs
var TX_DIGEST_LENGTH = 32;
function isValidTransactionDigest(value) {
  try {
    return fromBase58(value).length === TX_DIGEST_LENGTH;
  } catch {
    return false;
  }
}
var SUI_ADDRESS_LENGTH = 32;
function isValidSuiAddress(value) {
  return isHex(value) && getHexByteLength(value) === SUI_ADDRESS_LENGTH;
}
function isValidSuiObjectId(value) {
  return isValidSuiAddress(value);
}
var MOVE_IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
function isValidMoveIdentifier(name) {
  return MOVE_IDENTIFIER_REGEX.test(name);
}
var PRIMITIVE_TYPE_TAGS = [
  "bool",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "u256",
  "address",
  "signer"
];
var VECTOR_TYPE_REGEX = /^vector<(.+)>$/;
function isValidTypeTag(type) {
  if (PRIMITIVE_TYPE_TAGS.includes(type))
    return true;
  const vectorMatch = type.match(VECTOR_TYPE_REGEX);
  if (vectorMatch)
    return isValidTypeTag(vectorMatch[1]);
  if (type.includes("::"))
    return isValidStructTag(type);
  return false;
}
function isValidParsedStructTag(tag) {
  if (!isValidSuiAddress(tag.address) && !isValidNamedPackage(tag.address))
    return false;
  if (!isValidMoveIdentifier(tag.module) || !isValidMoveIdentifier(tag.name))
    return false;
  return tag.typeParams.every((param) => {
    if (typeof param === "string")
      return isValidTypeTag(param);
    return isValidParsedStructTag(param);
  });
}
function isValidStructTag(type) {
  try {
    return isValidParsedStructTag(parseStructTag(type));
  } catch {
    return false;
  }
}
function parseTypeTag(type) {
  if (type.startsWith("vector<")) {
    if (!type.endsWith(">"))
      throw new Error(`Invalid type tag: ${type}`);
    const inner = type.slice(7, -1);
    if (!inner)
      throw new Error(`Invalid type tag: ${type}`);
    const parsed = parseTypeTag(inner);
    if (typeof parsed === "string")
      return `vector<${parsed}>`;
    return `vector<${normalizeStructTag(parsed)}>`;
  }
  if (!type.includes("::"))
    return type;
  return parseStructTag(type);
}
function parseStructTag(type) {
  const parts = type.split("::");
  if (parts.length < 3)
    throw new Error(`Invalid struct tag: ${type}`);
  const [address, module] = parts;
  const isMvrPackage = isValidNamedPackage(address);
  const rest = type.slice(address.length + module.length + 4);
  const name = rest.includes("<") ? rest.slice(0, rest.indexOf("<")) : rest;
  const typeParams = rest.includes("<") ? splitGenericParameters(rest.slice(rest.indexOf("<") + 1, rest.lastIndexOf(">"))).map((typeParam) => parseTypeTag(typeParam.trim())) : [];
  return {
    address: isMvrPackage ? address : normalizeSuiAddress(address),
    module,
    name,
    typeParams
  };
}
function normalizeStructTag(type) {
  const { address, module, name, typeParams } = typeof type === "string" ? parseStructTag(type) : type;
  return `${address}::${module}::${name}${typeParams?.length > 0 ? `<${typeParams.map((typeParam) => typeof typeParam === "string" ? typeParam : normalizeStructTag(typeParam)).join(",")}>` : ""}`;
}
function normalizeSuiAddress(value, forceAdd0x = false) {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith("0x"))
    address = address.slice(2);
  return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, "0")}`;
}
function normalizeSuiObjectId(value, forceAdd0x = false) {
  return normalizeSuiAddress(value, forceAdd0x);
}
function isHex(value) {
  return /^(0x|0X)?[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
}
function getHexByteLength(value) {
  return /^(0x|0X)/.test(value) ? (value.length - 2) / 2 : value.length / 2;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/bcs/type-tag-serializer.mjs
var VECTOR_REGEX = /^vector<(.+)>$/;
var STRUCT_REGEX = /^([^:]+)::([^:]+)::([^<]+)(<(.+)>)?/;
var TypeTagSerializer = class TypeTagSerializer2 {
  static parseFromStr(str, normalizeAddress = false) {
    if (str === "address")
      return { address: null };
    else if (str === "bool")
      return { bool: null };
    else if (str === "u8")
      return { u8: null };
    else if (str === "u16")
      return { u16: null };
    else if (str === "u32")
      return { u32: null };
    else if (str === "u64")
      return { u64: null };
    else if (str === "u128")
      return { u128: null };
    else if (str === "u256")
      return { u256: null };
    else if (str === "signer")
      return { signer: null };
    const vectorMatch = str.match(VECTOR_REGEX);
    if (vectorMatch)
      return { vector: TypeTagSerializer2.parseFromStr(vectorMatch[1], normalizeAddress) };
    const structMatch = str.match(STRUCT_REGEX);
    if (structMatch)
      return { struct: {
        address: normalizeAddress ? normalizeSuiAddress(structMatch[1]) : structMatch[1],
        module: structMatch[2],
        name: structMatch[3],
        typeParams: structMatch[5] === void 0 ? [] : TypeTagSerializer2.parseStructTypeArgs(structMatch[5], normalizeAddress)
      } };
    throw new Error(`Encountered unexpected token when parsing type args for ${str}`);
  }
  static parseStructTypeArgs(str, normalizeAddress = false) {
    return splitGenericParameters(str).map((tok) => TypeTagSerializer2.parseFromStr(tok, normalizeAddress));
  }
  static tagToString(tag) {
    if ("bool" in tag)
      return "bool";
    if ("u8" in tag)
      return "u8";
    if ("u16" in tag)
      return "u16";
    if ("u32" in tag)
      return "u32";
    if ("u64" in tag)
      return "u64";
    if ("u128" in tag)
      return "u128";
    if ("u256" in tag)
      return "u256";
    if ("address" in tag)
      return "address";
    if ("signer" in tag)
      return "signer";
    if ("vector" in tag)
      return `vector<${TypeTagSerializer2.tagToString(tag.vector)}>`;
    if ("struct" in tag) {
      const struct = tag.struct;
      const typeParams = struct.typeParams.map(TypeTagSerializer2.tagToString).join(", ");
      return `${struct.address}::${struct.module}::${struct.name}${typeParams ? `<${typeParams}>` : ""}`;
    }
    throw new Error("Invalid TypeTag");
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/bcs/bcs.mjs
function unsafe_u64(options) {
  return bcs.u64({
    name: "unsafe_u64",
    ...options
  }).transform({
    input: (val) => val,
    output: (val) => Number(val)
  });
}
function optionEnum(type) {
  return bcs.enum("Option", {
    None: null,
    Some: type
  });
}
var Address = bcs.bytes(SUI_ADDRESS_LENGTH).transform({
  validate: (val) => {
    const address = typeof val === "string" ? val : toHex(val);
    if (!address || !isValidSuiAddress(normalizeSuiAddress(address)))
      throw new Error(`Invalid Sui address ${address}`);
  },
  input: (val) => typeof val === "string" ? fromHex(normalizeSuiAddress(val)) : val,
  output: (val) => normalizeSuiAddress(toHex(val))
});
var ObjectDigest = bcs.byteVector().transform({
  name: "ObjectDigest",
  input: (value) => fromBase58(value),
  output: (value) => toBase58(new Uint8Array(value)),
  validate: (value) => {
    if (fromBase58(value).length !== 32)
      throw new Error("ObjectDigest must be 32 bytes");
  }
});
var SuiObjectRef = bcs.struct("SuiObjectRef", {
  objectId: Address,
  version: bcs.u64(),
  digest: ObjectDigest
});
var SharedObjectRef = bcs.struct("SharedObjectRef", {
  objectId: Address,
  initialSharedVersion: bcs.u64(),
  mutable: bcs.bool()
});
var ObjectArg = bcs.enum("ObjectArg", {
  ImmOrOwnedObject: SuiObjectRef,
  SharedObject: SharedObjectRef,
  Receiving: SuiObjectRef
});
var Owner = bcs.enum("Owner", {
  AddressOwner: Address,
  ObjectOwner: Address,
  Shared: bcs.struct("Shared", { initialSharedVersion: bcs.u64() }),
  Immutable: null,
  ConsensusAddressOwner: bcs.struct("ConsensusAddressOwner", {
    startVersion: bcs.u64(),
    owner: Address
  })
});
var Reservation = bcs.enum("Reservation", { MaxAmountU64: bcs.u64() });
var WithdrawalType = bcs.enum("WithdrawalType", { Balance: bcs.lazy(() => TypeTag) });
var WithdrawFrom = bcs.enum("WithdrawFrom", {
  Sender: null,
  Sponsor: null
});
var FundsWithdrawal = bcs.struct("FundsWithdrawal", {
  reservation: Reservation,
  typeArg: WithdrawalType,
  withdrawFrom: WithdrawFrom
});
var CallArg = bcs.enum("CallArg", {
  Pure: bcs.struct("Pure", { bytes: bcs.byteVector().transform({
    input: (val) => typeof val === "string" ? fromBase64(val) : val,
    output: (val) => toBase64(new Uint8Array(val))
  }) }),
  Object: ObjectArg,
  FundsWithdrawal
});
var InnerTypeTag = bcs.enum("TypeTag", {
  bool: null,
  u8: null,
  u64: null,
  u128: null,
  address: null,
  signer: null,
  vector: bcs.lazy(() => InnerTypeTag),
  struct: bcs.lazy(() => StructTag),
  u16: null,
  u32: null,
  u256: null
});
var TypeTag = InnerTypeTag.transform({
  input: (typeTag) => typeof typeTag === "string" ? TypeTagSerializer.parseFromStr(typeTag, true) : typeTag,
  output: (typeTag) => TypeTagSerializer.tagToString(typeTag)
});
var Argument = bcs.enum("Argument", {
  GasCoin: null,
  Input: bcs.u16(),
  Result: bcs.u16(),
  NestedResult: bcs.tuple([bcs.u16(), bcs.u16()])
});
var ProgrammableMoveCall = bcs.struct("ProgrammableMoveCall", {
  package: Address,
  module: bcs.string(),
  function: bcs.string(),
  typeArguments: bcs.vector(TypeTag),
  arguments: bcs.vector(Argument)
});
var Command = bcs.enum("Command", {
  MoveCall: ProgrammableMoveCall,
  TransferObjects: bcs.struct("TransferObjects", {
    objects: bcs.vector(Argument),
    address: Argument
  }),
  SplitCoins: bcs.struct("SplitCoins", {
    coin: Argument,
    amounts: bcs.vector(Argument)
  }),
  MergeCoins: bcs.struct("MergeCoins", {
    destination: Argument,
    sources: bcs.vector(Argument)
  }),
  Publish: bcs.struct("Publish", {
    modules: bcs.vector(bcs.byteVector().transform({
      input: (val) => typeof val === "string" ? fromBase64(val) : val,
      output: (val) => toBase64(new Uint8Array(val))
    })),
    dependencies: bcs.vector(Address)
  }),
  MakeMoveVec: bcs.struct("MakeMoveVec", {
    type: optionEnum(TypeTag).transform({
      input: (val) => val === null ? { None: true } : { Some: val },
      output: (val) => val.Some ?? null
    }),
    elements: bcs.vector(Argument)
  }),
  Upgrade: bcs.struct("Upgrade", {
    modules: bcs.vector(bcs.byteVector().transform({
      input: (val) => typeof val === "string" ? fromBase64(val) : val,
      output: (val) => toBase64(new Uint8Array(val))
    })),
    dependencies: bcs.vector(Address),
    package: Address,
    ticket: Argument
  })
});
var ProgrammableTransaction = bcs.struct("ProgrammableTransaction", {
  inputs: bcs.vector(CallArg),
  commands: bcs.vector(Command)
});
var TransactionKind = bcs.enum("TransactionKind", {
  ProgrammableTransaction,
  ChangeEpoch: null,
  Genesis: null,
  ConsensusCommitPrologue: null
});
var ValidDuring = bcs.struct("ValidDuring", {
  minEpoch: bcs.option(bcs.u64()),
  maxEpoch: bcs.option(bcs.u64()),
  minTimestamp: bcs.option(bcs.u64()),
  maxTimestamp: bcs.option(bcs.u64()),
  chain: ObjectDigest,
  nonce: bcs.u32()
});
var TransactionExpiration = bcs.enum("TransactionExpiration", {
  None: null,
  Epoch: unsafe_u64(),
  ValidDuring
});
var StructTag = bcs.struct("StructTag", {
  address: Address,
  module: bcs.string(),
  name: bcs.string(),
  typeParams: bcs.vector(InnerTypeTag)
});
var GasData = bcs.struct("GasData", {
  payment: bcs.vector(SuiObjectRef),
  owner: Address,
  price: bcs.u64(),
  budget: bcs.u64()
});
var TransactionDataV1 = bcs.struct("TransactionDataV1", {
  kind: TransactionKind,
  sender: Address,
  gasData: GasData,
  expiration: TransactionExpiration
});
var TransactionData = bcs.enum("TransactionData", { V1: TransactionDataV1 });
var IntentScope = bcs.enum("IntentScope", {
  TransactionData: null,
  TransactionEffects: null,
  CheckpointSummary: null,
  PersonalMessage: null
});
var IntentVersion = bcs.enum("IntentVersion", { V0: null });
var AppId = bcs.enum("AppId", { Sui: null });
var Intent = bcs.struct("Intent", {
  scope: IntentScope,
  version: IntentVersion,
  appId: AppId
});
function IntentMessage(T) {
  return bcs.struct(`IntentMessage<${T.name}>`, {
    intent: Intent,
    value: T
  });
}
var CompressedSignature = bcs.enum("CompressedSignature", {
  ED25519: bcs.bytes(64),
  Secp256k1: bcs.bytes(64),
  Secp256r1: bcs.bytes(64),
  ZkLogin: bcs.byteVector(),
  Passkey: bcs.byteVector()
});
var PublicKey = bcs.enum("PublicKey", {
  ED25519: bcs.bytes(32),
  Secp256k1: bcs.bytes(33),
  Secp256r1: bcs.bytes(33),
  ZkLogin: bcs.byteVector(),
  Passkey: bcs.bytes(33)
});
var MultiSigPkMap = bcs.struct("MultiSigPkMap", {
  pubKey: PublicKey,
  weight: bcs.u8()
});
var MultiSigPublicKey = bcs.struct("MultiSigPublicKey", {
  pk_map: bcs.vector(MultiSigPkMap),
  threshold: bcs.u16()
});
var MultiSig = bcs.struct("MultiSig", {
  sigs: bcs.vector(CompressedSignature),
  bitmap: bcs.u16(),
  multisig_pk: MultiSigPublicKey
});
var base64String = bcs.byteVector().transform({
  input: (val) => typeof val === "string" ? fromBase64(val) : val,
  output: (val) => toBase64(new Uint8Array(val))
});
var SenderSignedTransaction = bcs.struct("SenderSignedTransaction", {
  intentMessage: IntentMessage(TransactionData),
  txSignatures: bcs.vector(base64String)
});
var SenderSignedData = bcs.vector(SenderSignedTransaction, { name: "SenderSignedData" });
var PasskeyAuthenticator = bcs.struct("PasskeyAuthenticator", {
  authenticatorData: bcs.byteVector(),
  clientDataJson: bcs.string(),
  userSignature: bcs.byteVector()
});
var MoveObjectType = bcs.enum("MoveObjectType", {
  Other: StructTag,
  GasCoin: null,
  StakedSui: null,
  Coin: TypeTag,
  AccumulatorBalanceWrapper: null
});
var TypeOrigin = bcs.struct("TypeOrigin", {
  moduleName: bcs.string(),
  datatypeName: bcs.string(),
  package: Address
});
var UpgradeInfo = bcs.struct("UpgradeInfo", {
  upgradedId: Address,
  upgradedVersion: bcs.u64()
});
var MovePackage = bcs.struct("MovePackage", {
  id: Address,
  version: bcs.u64(),
  moduleMap: bcs.map(bcs.string(), bcs.byteVector()),
  typeOriginTable: bcs.vector(TypeOrigin),
  linkageTable: bcs.map(Address, UpgradeInfo)
});
var MoveObject = bcs.struct("MoveObject", {
  type: MoveObjectType,
  hasPublicTransfer: bcs.bool(),
  version: bcs.u64(),
  contents: bcs.byteVector()
});
var Data = bcs.enum("Data", {
  Move: MoveObject,
  Package: MovePackage
});
var ObjectInner = bcs.struct("ObjectInner", {
  data: Data,
  owner: Owner,
  previousTransaction: ObjectDigest,
  storageRebate: bcs.u64()
});

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/bcs/effects.mjs
var PackageUpgradeError = bcs.enum("PackageUpgradeError", {
  UnableToFetchPackage: bcs.struct("UnableToFetchPackage", { packageId: Address }),
  NotAPackage: bcs.struct("NotAPackage", { objectId: Address }),
  IncompatibleUpgrade: null,
  DigestDoesNotMatch: bcs.struct("DigestDoesNotMatch", { digest: bcs.byteVector() }),
  UnknownUpgradePolicy: bcs.struct("UnknownUpgradePolicy", { policy: bcs.u8() }),
  PackageIDDoesNotMatch: bcs.struct("PackageIDDoesNotMatch", {
    packageId: Address,
    ticketId: Address
  })
});
var ModuleId = bcs.struct("ModuleId", {
  address: Address,
  name: bcs.string()
});
var MoveLocation = bcs.struct("MoveLocation", {
  module: ModuleId,
  function: bcs.u16(),
  instruction: bcs.u16(),
  functionName: bcs.option(bcs.string())
});
var CommandArgumentError = bcs.enum("CommandArgumentError", {
  TypeMismatch: null,
  InvalidBCSBytes: null,
  InvalidUsageOfPureArg: null,
  InvalidArgumentToPrivateEntryFunction: null,
  IndexOutOfBounds: bcs.struct("IndexOutOfBounds", { idx: bcs.u16() }),
  SecondaryIndexOutOfBounds: bcs.struct("SecondaryIndexOutOfBounds", {
    resultIdx: bcs.u16(),
    secondaryIdx: bcs.u16()
  }),
  InvalidResultArity: bcs.struct("InvalidResultArity", { resultIdx: bcs.u16() }),
  InvalidGasCoinUsage: null,
  InvalidValueUsage: null,
  InvalidObjectByValue: null,
  InvalidObjectByMutRef: null,
  SharedObjectOperationNotAllowed: null,
  InvalidArgumentArity: null,
  InvalidTransferObject: null,
  InvalidMakeMoveVecNonObjectArgument: null,
  ArgumentWithoutValue: null,
  CannotMoveBorrowedValue: null,
  CannotWriteToExtendedReference: null,
  InvalidReferenceArgument: null
});
var TypeArgumentError = bcs.enum("TypeArgumentError", {
  TypeNotFound: null,
  ConstraintNotSatisfied: null
});
var ExecutionFailureStatus = bcs.enum("ExecutionFailureStatus", {
  InsufficientGas: null,
  InvalidGasObject: null,
  InvariantViolation: null,
  FeatureNotYetSupported: null,
  MoveObjectTooBig: bcs.struct("MoveObjectTooBig", {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64()
  }),
  MovePackageTooBig: bcs.struct("MovePackageTooBig", {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64()
  }),
  CircularObjectOwnership: bcs.struct("CircularObjectOwnership", { object: Address }),
  InsufficientCoinBalance: null,
  CoinBalanceOverflow: null,
  PublishErrorNonZeroAddress: null,
  SuiMoveVerificationError: null,
  MovePrimitiveRuntimeError: bcs.option(MoveLocation),
  MoveAbort: bcs.tuple([MoveLocation, bcs.u64()]),
  VMVerificationOrDeserializationError: null,
  VMInvariantViolation: null,
  FunctionNotFound: null,
  ArityMismatch: null,
  TypeArityMismatch: null,
  NonEntryFunctionInvoked: null,
  CommandArgumentError: bcs.struct("CommandArgumentError", {
    argIdx: bcs.u16(),
    kind: CommandArgumentError
  }),
  TypeArgumentError: bcs.struct("TypeArgumentError", {
    argumentIdx: bcs.u16(),
    kind: TypeArgumentError
  }),
  UnusedValueWithoutDrop: bcs.struct("UnusedValueWithoutDrop", {
    resultIdx: bcs.u16(),
    secondaryIdx: bcs.u16()
  }),
  InvalidPublicFunctionReturnType: bcs.struct("InvalidPublicFunctionReturnType", { idx: bcs.u16() }),
  InvalidTransferObject: null,
  EffectsTooLarge: bcs.struct("EffectsTooLarge", {
    currentSize: bcs.u64(),
    maxSize: bcs.u64()
  }),
  PublishUpgradeMissingDependency: null,
  PublishUpgradeDependencyDowngrade: null,
  PackageUpgradeError: bcs.struct("PackageUpgradeError", { upgradeError: PackageUpgradeError }),
  WrittenObjectsTooLarge: bcs.struct("WrittenObjectsTooLarge", {
    currentSize: bcs.u64(),
    maxSize: bcs.u64()
  }),
  CertificateDenied: null,
  SuiMoveVerificationTimedout: null,
  SharedObjectOperationNotAllowed: null,
  InputObjectDeleted: null,
  ExecutionCancelledDueToSharedObjectCongestion: bcs.struct("ExecutionCancelledDueToSharedObjectCongestion", { congested_objects: bcs.vector(Address) }),
  AddressDeniedForCoin: bcs.struct("AddressDeniedForCoin", {
    address: Address,
    coinType: bcs.string()
  }),
  CoinTypeGlobalPause: bcs.struct("CoinTypeGlobalPause", { coinType: bcs.string() }),
  ExecutionCancelledDueToRandomnessUnavailable: null,
  MoveVectorElemTooBig: bcs.struct("MoveVectorElemTooBig", {
    valueSize: bcs.u64(),
    maxScaledSize: bcs.u64()
  }),
  MoveRawValueTooBig: bcs.struct("MoveRawValueTooBig", {
    valueSize: bcs.u64(),
    maxScaledSize: bcs.u64()
  }),
  InvalidLinkage: null,
  InsufficientBalanceForWithdraw: null,
  NonExclusiveWriteInputObjectModified: bcs.struct("NonExclusiveWriteInputObjectModified", { id: Address })
});
var ExecutionStatus = bcs.enum("ExecutionStatus", {
  Success: null,
  Failure: bcs.struct("Failure", {
    error: ExecutionFailureStatus,
    command: bcs.option(bcs.u64())
  })
});
var GasCostSummary = bcs.struct("GasCostSummary", {
  computationCost: bcs.u64(),
  storageCost: bcs.u64(),
  storageRebate: bcs.u64(),
  nonRefundableStorageFee: bcs.u64()
});
var TransactionEffectsV1 = bcs.struct("TransactionEffectsV1", {
  status: ExecutionStatus,
  executedEpoch: bcs.u64(),
  gasUsed: GasCostSummary,
  modifiedAtVersions: bcs.vector(bcs.tuple([Address, bcs.u64()])),
  sharedObjects: bcs.vector(SuiObjectRef),
  transactionDigest: ObjectDigest,
  created: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  mutated: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  unwrapped: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  deleted: bcs.vector(SuiObjectRef),
  unwrappedThenDeleted: bcs.vector(SuiObjectRef),
  wrapped: bcs.vector(SuiObjectRef),
  gasObject: bcs.tuple([SuiObjectRef, Owner]),
  eventsDigest: bcs.option(ObjectDigest),
  dependencies: bcs.vector(ObjectDigest)
});
var VersionDigest = bcs.tuple([bcs.u64(), ObjectDigest]);
var ObjectIn = bcs.enum("ObjectIn", {
  NotExist: null,
  Exist: bcs.tuple([VersionDigest, Owner])
});
var AccumulatorAddress = bcs.struct("AccumulatorAddress", {
  address: Address,
  ty: TypeTag
});
var AccumulatorOperation = bcs.enum("AccumulatorOperation", {
  Merge: null,
  Split: null
});
var AccumulatorValue = bcs.enum("AccumulatorValue", {
  Integer: bcs.u64(),
  IntegerTuple: bcs.tuple([bcs.u64(), bcs.u64()]),
  EventDigest: bcs.vector(bcs.tuple([bcs.u64(), ObjectDigest]))
});
var AccumulatorWriteV1 = bcs.struct("AccumulatorWriteV1", {
  address: AccumulatorAddress,
  operation: AccumulatorOperation,
  value: AccumulatorValue
});
var ObjectOut = bcs.enum("ObjectOut", {
  NotExist: null,
  ObjectWrite: bcs.tuple([ObjectDigest, Owner]),
  PackageWrite: VersionDigest,
  AccumulatorWriteV1
});
var IDOperation = bcs.enum("IDOperation", {
  None: null,
  Created: null,
  Deleted: null
});
var EffectsObjectChange = bcs.struct("EffectsObjectChange", {
  inputState: ObjectIn,
  outputState: ObjectOut,
  idOperation: IDOperation
});
var UnchangedConsensusKind = bcs.enum("UnchangedConsensusKind", {
  ReadOnlyRoot: VersionDigest,
  MutateConsensusStreamEnded: bcs.u64(),
  ReadConsensusStreamEnded: bcs.u64(),
  Cancelled: bcs.u64(),
  PerEpochConfig: null
});
var TransactionEffectsV2 = bcs.struct("TransactionEffectsV2", {
  status: ExecutionStatus,
  executedEpoch: bcs.u64(),
  gasUsed: GasCostSummary,
  transactionDigest: ObjectDigest,
  gasObjectIndex: bcs.option(bcs.u32()),
  eventsDigest: bcs.option(ObjectDigest),
  dependencies: bcs.vector(ObjectDigest),
  lamportVersion: bcs.u64(),
  changedObjects: bcs.vector(bcs.tuple([Address, EffectsObjectChange])),
  unchangedConsensusObjects: bcs.vector(bcs.tuple([Address, UnchangedConsensusKind])),
  auxDataDigest: bcs.option(ObjectDigest)
});
var TransactionEffects = bcs.enum("TransactionEffects", {
  V1: TransactionEffectsV1,
  V2: TransactionEffectsV2
});

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/bcs/pure.mjs
function pureBcsSchemaFromTypeName(name) {
  switch (name) {
    case "u8":
      return bcs.u8();
    case "u16":
      return bcs.u16();
    case "u32":
      return bcs.u32();
    case "u64":
      return bcs.u64();
    case "u128":
      return bcs.u128();
    case "u256":
      return bcs.u256();
    case "bool":
      return bcs.bool();
    case "string":
      return bcs.string();
    case "id":
    case "address":
      return Address;
  }
  const generic = name.match(/^(vector|option)<(.+)>$/);
  if (generic) {
    const [kind, inner] = generic.slice(1);
    if (kind === "vector")
      return bcs.vector(pureBcsSchemaFromTypeName(inner));
    else
      return bcs.option(pureBcsSchemaFromTypeName(inner));
  }
  throw new Error(`Invalid Pure type name: ${name}`);
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/bcs/index.mjs
var suiBcs = {
  ...bcs,
  U8: bcs.u8(),
  U16: bcs.u16(),
  U32: bcs.u32(),
  U64: bcs.u64(),
  U128: bcs.u128(),
  U256: bcs.u256(),
  ULEB128: bcs.uleb128(),
  Bool: bcs.bool(),
  String: bcs.string(),
  Address,
  AppId,
  Argument,
  CallArg,
  Command,
  CompressedSignature,
  Data,
  GasData,
  Intent,
  IntentMessage,
  IntentScope,
  IntentVersion,
  MoveObject,
  MoveObjectType,
  MovePackage,
  MultiSig,
  MultiSigPkMap,
  MultiSigPublicKey,
  Object: ObjectInner,
  ObjectArg,
  ObjectDigest,
  Owner,
  PasskeyAuthenticator,
  ProgrammableMoveCall,
  ProgrammableTransaction,
  PublicKey,
  SenderSignedData,
  SenderSignedTransaction,
  SharedObjectRef,
  StructTag,
  SuiObjectRef,
  TransactionData,
  TransactionDataV1,
  TransactionEffects,
  TransactionExpiration,
  TransactionKind,
  TypeOrigin,
  TypeTag,
  UpgradeInfo
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/cache.mjs
var ClientCache = class ClientCache2 {
  #prefix;
  #cache;
  constructor({ prefix, cache } = {}) {
    this.#prefix = prefix ?? [];
    this.#cache = cache ?? /* @__PURE__ */ new Map();
  }
  read(key, load) {
    const cacheKey = [this.#prefix, ...key].join(":");
    if (this.#cache.has(cacheKey))
      return this.#cache.get(cacheKey);
    const result = load();
    this.#cache.set(cacheKey, result);
    if (typeof result === "object" && result !== null && "then" in result)
      return Promise.resolve(result).then((v) => {
        this.#cache.set(cacheKey, v);
        return v;
      }).catch((err) => {
        this.#cache.delete(cacheKey);
        throw err;
      });
    return result;
  }
  readSync(key, load) {
    const cacheKey = [this.#prefix, ...key].join(":");
    if (this.#cache.has(cacheKey))
      return this.#cache.get(cacheKey);
    const result = load();
    this.#cache.set(cacheKey, result);
    return result;
  }
  clear(prefix) {
    const prefixKey = [...this.#prefix, ...prefix ?? []].join(":");
    if (!prefixKey) {
      this.#cache.clear();
      return;
    }
    for (const key of this.#cache.keys())
      if (key.startsWith(prefixKey))
        this.#cache.delete(key);
  }
  scope(prefix) {
    return new ClientCache2({
      prefix: [...this.#prefix, ...Array.isArray(prefix) ? prefix : [prefix]],
      cache: this.#cache
    });
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/client.mjs
var BaseClient = class {
  constructor({ network, base, cache = base?.cache ?? new ClientCache() }) {
    this.network = network;
    this.base = base ?? this;
    this.cache = cache;
  }
  $extend(...registrations) {
    const extensions = Object.fromEntries(registrations.map((registration) => {
      return [registration.name, registration.register(this)];
    }));
    const methodCache = /* @__PURE__ */ new Map();
    return new Proxy(this, { get(target, prop, receiver) {
      if (typeof prop === "string" && prop in extensions)
        return extensions[prop];
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        if (prop === "$extend")
          return value.bind(receiver);
        if (!methodCache.has(prop))
          methodCache.set(prop, value.bind(target));
        return methodCache.get(prop);
      }
      return value;
    } });
  }
};

// node_modules/.pnpm/@noble+hashes@2.0.1/node_modules/@noble/hashes/utils.js
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber2(n, title = "") {
  if (!Number.isSafeInteger(n) || n < 0) {
    const prefix = title && `"${title}" `;
    throw new Error(`${prefix}expected integer >= 0, got ${n}`);
  }
}
function abytes(value, length, title = "") {
  const bytes = isBytes2(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "digestInto() output");
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error('"digestInto() output" expected to be of length >=' + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n);
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}

// node_modules/.pnpm/@noble+hashes@2.0.1/node_modules/@noble/hashes/_blake.js
var BSIGMA = /* @__PURE__ */ Uint8Array.from([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  // Blake1, unused in others
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9
]);

// node_modules/.pnpm/@noble+hashes@2.0.1/node_modules/@noble/hashes/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
var rotr32H = (_h, l) => l;
var rotr32L = (h, _l) => h;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;

// node_modules/.pnpm/@noble+hashes@2.0.1/node_modules/@noble/hashes/blake2.js
var B2B_IV = /* @__PURE__ */ Uint32Array.from([
  4089235720,
  1779033703,
  2227873595,
  3144134277,
  4271175723,
  1013904242,
  1595750129,
  2773480762,
  2917565137,
  1359893119,
  725511199,
  2600822924,
  4215389547,
  528734635,
  327033209,
  1541459225
]);
var BBUF = /* @__PURE__ */ new Uint32Array(32);
function G1b(a, b, c2, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c2], Ch = BBUF[2 * c2 + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotr32H(Dh, Dl), Dl: rotr32L(Dh, Dl) });
  ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrSH(Bh, Bl, 24), Bl: rotrSL(Bh, Bl, 24) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c2] = Cl, BBUF[2 * c2 + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function G2b(a, b, c2, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c2], Ch = BBUF[2 * c2 + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotrSH(Dh, Dl, 16), Dl: rotrSL(Dh, Dl, 16) });
  ({ h: Ch, l: Cl } = add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrBH(Bh, Bl, 63), Bl: rotrBL(Bh, Bl, 63) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c2] = Cl, BBUF[2 * c2 + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
  anumber2(keyLen);
  if (outputLen < 0 || outputLen > keyLen)
    throw new Error("outputLen bigger than keyLen");
  const { key, salt, personalization } = opts;
  if (key !== void 0 && (key.length < 1 || key.length > keyLen))
    throw new Error('"key" expected to be undefined or of length=1..' + keyLen);
  if (salt !== void 0)
    abytes(salt, saltLen, "salt");
  if (personalization !== void 0)
    abytes(personalization, persLen, "personalization");
}
var _BLAKE2 = class {
  buffer;
  buffer32;
  finished = false;
  destroyed = false;
  length = 0;
  pos = 0;
  blockLen;
  outputLen;
  constructor(blockLen, outputLen) {
    anumber2(blockLen);
    anumber2(outputLen);
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.buffer = new Uint8Array(blockLen);
    this.buffer32 = u32(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { blockLen, buffer, buffer32 } = this;
    const len = data.length;
    const offset = data.byteOffset;
    const buf = data.buffer;
    for (let pos = 0; pos < len; ) {
      if (this.pos === blockLen) {
        swap32IfBE(buffer32);
        this.compress(buffer32, 0, false);
        swap32IfBE(buffer32);
        this.pos = 0;
      }
      const take = Math.min(blockLen - this.pos, len - pos);
      const dataOffset = offset + pos;
      if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
        const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
        swap32IfBE(data32);
        for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
          this.length += blockLen;
          this.compress(data32, pos32, false);
        }
        swap32IfBE(data32);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      this.length += take;
      pos += take;
    }
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    const { pos, buffer32 } = this;
    this.finished = true;
    clean(this.buffer.subarray(pos));
    swap32IfBE(buffer32);
    this.compress(buffer32, 0, true);
    swap32IfBE(buffer32);
    const out32 = u32(out);
    this.get().forEach((v, i) => out32[i] = swap8IfBE(v));
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    const { buffer, length, finished, destroyed, outputLen, pos } = this;
    to ||= new this.constructor({ dkLen: outputLen });
    to.set(...this.get());
    to.buffer.set(buffer);
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    to.outputLen = outputLen;
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var _BLAKE2b = class extends _BLAKE2 {
  // Same as SHA-512, but LE
  v0l = B2B_IV[0] | 0;
  v0h = B2B_IV[1] | 0;
  v1l = B2B_IV[2] | 0;
  v1h = B2B_IV[3] | 0;
  v2l = B2B_IV[4] | 0;
  v2h = B2B_IV[5] | 0;
  v3l = B2B_IV[6] | 0;
  v3h = B2B_IV[7] | 0;
  v4l = B2B_IV[8] | 0;
  v4h = B2B_IV[9] | 0;
  v5l = B2B_IV[10] | 0;
  v5h = B2B_IV[11] | 0;
  v6l = B2B_IV[12] | 0;
  v6h = B2B_IV[13] | 0;
  v7l = B2B_IV[14] | 0;
  v7h = B2B_IV[15] | 0;
  constructor(opts = {}) {
    const olen = opts.dkLen === void 0 ? 64 : opts.dkLen;
    super(128, olen);
    checkBlake2Opts(olen, opts, 64, 16, 16);
    let { key, personalization, salt } = opts;
    let keyLength = 0;
    if (key !== void 0) {
      abytes(key, void 0, "key");
      keyLength = key.length;
    }
    this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
    if (salt !== void 0) {
      abytes(salt, void 0, "salt");
      const slt = u32(salt);
      this.v4l ^= swap8IfBE(slt[0]);
      this.v4h ^= swap8IfBE(slt[1]);
      this.v5l ^= swap8IfBE(slt[2]);
      this.v5h ^= swap8IfBE(slt[3]);
    }
    if (personalization !== void 0) {
      abytes(personalization, void 0, "personalization");
      const pers = u32(personalization);
      this.v6l ^= swap8IfBE(pers[0]);
      this.v6h ^= swap8IfBE(pers[1]);
      this.v7l ^= swap8IfBE(pers[2]);
      this.v7h ^= swap8IfBE(pers[3]);
    }
    if (key !== void 0) {
      const tmp = new Uint8Array(this.blockLen);
      tmp.set(key);
      this.update(tmp);
    }
  }
  // prettier-ignore
  get() {
    let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
  }
  // prettier-ignore
  set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
    this.v0l = v0l | 0;
    this.v0h = v0h | 0;
    this.v1l = v1l | 0;
    this.v1h = v1h | 0;
    this.v2l = v2l | 0;
    this.v2h = v2h | 0;
    this.v3l = v3l | 0;
    this.v3h = v3h | 0;
    this.v4l = v4l | 0;
    this.v4h = v4h | 0;
    this.v5l = v5l | 0;
    this.v5h = v5h | 0;
    this.v6l = v6l | 0;
    this.v6h = v6h | 0;
    this.v7l = v7l | 0;
    this.v7h = v7h | 0;
  }
  compress(msg, offset, isLast) {
    this.get().forEach((v, i) => BBUF[i] = v);
    BBUF.set(B2B_IV, 16);
    let { h, l } = fromBig(BigInt(this.length));
    BBUF[24] = B2B_IV[8] ^ l;
    BBUF[25] = B2B_IV[9] ^ h;
    if (isLast) {
      BBUF[28] = ~BBUF[28];
      BBUF[29] = ~BBUF[29];
    }
    let j = 0;
    const s = BSIGMA;
    for (let i = 0; i < 12; i++) {
      G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
    }
    this.v0l ^= BBUF[0] ^ BBUF[16];
    this.v0h ^= BBUF[1] ^ BBUF[17];
    this.v1l ^= BBUF[2] ^ BBUF[18];
    this.v1h ^= BBUF[3] ^ BBUF[19];
    this.v2l ^= BBUF[4] ^ BBUF[20];
    this.v2h ^= BBUF[5] ^ BBUF[21];
    this.v3l ^= BBUF[6] ^ BBUF[22];
    this.v3h ^= BBUF[7] ^ BBUF[23];
    this.v4l ^= BBUF[8] ^ BBUF[24];
    this.v4h ^= BBUF[9] ^ BBUF[25];
    this.v5l ^= BBUF[10] ^ BBUF[26];
    this.v5h ^= BBUF[11] ^ BBUF[27];
    this.v6l ^= BBUF[12] ^ BBUF[28];
    this.v6h ^= BBUF[13] ^ BBUF[29];
    this.v7l ^= BBUF[14] ^ BBUF[30];
    this.v7h ^= BBUF[15] ^ BBUF[31];
    clean(BBUF);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer32);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var blake2b = /* @__PURE__ */ createHasher((opts) => new _BLAKE2b(opts));

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/utils/dynamic-fields.mjs
function deriveDynamicFieldID(parentId, typeTag, key) {
  const address = suiBcs.Address.serialize(parentId).toBytes();
  const tag = suiBcs.TypeTag.serialize(typeTag).toBytes();
  const keyLength = suiBcs.u64().serialize(key.length).toBytes();
  const hash = blake2b.create({ dkLen: 32 });
  hash.update(new Uint8Array([240]));
  hash.update(address);
  hash.update(keyLength);
  hash.update(key);
  hash.update(tag);
  return `0x${toHex(hash.digest().slice(0, 32))}`;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/version.mjs
var PACKAGE_VERSION = "2.6.0";
var TARGETED_RPC_VERSION = "1.68.0";

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/mvr.mjs
var NAME_SEPARATOR2 = "/";
var MVR_API_HEADER = { "Mvr-Source": `@mysten/sui@${PACKAGE_VERSION}` };
var MvrClient = class {
  #cache;
  #url;
  #pageSize;
  #overrides;
  constructor({ cache, url, pageSize = 50, overrides }) {
    this.#cache = cache;
    this.#url = url;
    this.#pageSize = pageSize;
    this.#overrides = {
      packages: overrides?.packages,
      types: overrides?.types
    };
    validateOverrides(this.#overrides);
  }
  get #mvrPackageDataLoader() {
    return this.#cache.readSync(["#mvrPackageDataLoader", this.#url ?? ""], () => {
      const loader = new DataLoader(async (packages) => {
        if (!this.#url)
          throw new Error(`MVR Api URL is not set for the current client (resolving ${packages.join(", ")})`);
        const resolved = await this.#resolvePackages(packages);
        return packages.map((pkg) => resolved[pkg] ?? /* @__PURE__ */ new Error(`Failed to resolve package: ${pkg}`));
      });
      const overrides = this.#overrides?.packages;
      if (overrides)
        for (const [pkg, id] of Object.entries(overrides))
          loader.prime(pkg, id);
      return loader;
    });
  }
  get #mvrTypeDataLoader() {
    return this.#cache.readSync(["#mvrTypeDataLoader", this.#url ?? ""], () => {
      const loader = new DataLoader(async (types) => {
        if (!this.#url)
          throw new Error(`MVR Api URL is not set for the current client (resolving ${types.join(", ")})`);
        const resolved = await this.#resolveTypes(types);
        return types.map((type) => resolved[type] ?? /* @__PURE__ */ new Error(`Failed to resolve type: ${type}`));
      });
      const overrides = this.#overrides?.types;
      if (overrides)
        for (const [type, id] of Object.entries(overrides))
          loader.prime(type, id);
      return loader;
    });
  }
  async #resolvePackages(packages) {
    if (packages.length === 0)
      return {};
    const batches = chunk(packages, this.#pageSize);
    const results = {};
    await Promise.all(batches.map(async (batch) => {
      const data = await this.#fetch("/v1/resolution/bulk", { names: batch });
      if (!data?.resolution)
        return;
      for (const pkg of Object.keys(data?.resolution)) {
        const pkgData = data.resolution[pkg]?.package_id;
        if (!pkgData)
          continue;
        results[pkg] = pkgData;
      }
    }));
    return results;
  }
  async #resolveTypes(types) {
    if (types.length === 0)
      return {};
    const batches = chunk(types, this.#pageSize);
    const results = {};
    await Promise.all(batches.map(async (batch) => {
      const data = await this.#fetch("/v1/struct-definition/bulk", { types: batch });
      if (!data?.resolution)
        return;
      for (const type of Object.keys(data?.resolution)) {
        const typeData = data.resolution[type]?.type_tag;
        if (!typeData)
          continue;
        results[type] = typeData;
      }
    }));
    return results;
  }
  async #fetch(url, body) {
    if (!this.#url)
      throw new Error("MVR Api URL is not set for the current client");
    const response = await fetch(`${this.#url}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...MVR_API_HEADER
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Failed to resolve types: ${errorBody?.message}`);
    }
    return response.json();
  }
  async resolvePackage({ package: name }) {
    if (!hasMvrName(name))
      return { package: name };
    return { package: await this.#mvrPackageDataLoader.load(name) };
  }
  async resolveType({ type }) {
    if (!hasMvrName(type))
      return { type };
    const mvrTypes = [...extractMvrTypes(type)];
    const resolvedTypes = await this.#mvrTypeDataLoader.loadMany(mvrTypes);
    const typeMap = {};
    for (let i = 0; i < mvrTypes.length; i++) {
      const resolvedType = resolvedTypes[i];
      if (resolvedType instanceof Error)
        throw resolvedType;
      typeMap[mvrTypes[i]] = resolvedType;
    }
    return { type: replaceMvrNames(type, typeMap) };
  }
  async resolve({ types = [], packages = [] }) {
    const mvrTypes = /* @__PURE__ */ new Set();
    for (const type of types ?? [])
      extractMvrTypes(type, mvrTypes);
    const typesArray = [...mvrTypes];
    const [resolvedTypes, resolvedPackages] = await Promise.all([typesArray.length > 0 ? this.#mvrTypeDataLoader.loadMany(typesArray) : [], packages.length > 0 ? this.#mvrPackageDataLoader.loadMany(packages) : []]);
    const typeMap = { ...this.#overrides?.types };
    for (const [i, type] of typesArray.entries()) {
      const resolvedType = resolvedTypes[i];
      if (resolvedType instanceof Error)
        throw resolvedType;
      typeMap[type] = resolvedType;
    }
    const replacedTypes = {};
    for (const type of types ?? [])
      replacedTypes[type] = { type: replaceMvrNames(type, typeMap) };
    const replacedPackages = {};
    for (const [i, pkg] of (packages ?? []).entries()) {
      const resolvedPkg = this.#overrides?.packages?.[pkg] ?? resolvedPackages[i];
      if (resolvedPkg instanceof Error)
        throw resolvedPkg;
      replacedPackages[pkg] = { package: resolvedPkg };
    }
    return {
      types: replacedTypes,
      packages: replacedPackages
    };
  }
};
function validateOverrides(overrides) {
  if (overrides?.packages)
    for (const [pkg, id] of Object.entries(overrides.packages)) {
      if (!isValidNamedPackage(pkg))
        throw new Error(`Invalid package name: ${pkg}`);
      if (!isValidSuiAddress(normalizeSuiAddress(id)))
        throw new Error(`Invalid package ID: ${id}`);
    }
  if (overrides?.types)
    for (const [type, val] of Object.entries(overrides.types)) {
      if (parseStructTag(type).typeParams.length > 0)
        throw new Error("Type overrides must be first-level only. If you want to supply generic types, just pass each type individually.");
      if (!isValidSuiAddress(parseStructTag(val).address))
        throw new Error(`Invalid type: ${val}`);
    }
}
function extractMvrTypes(type, types = /* @__PURE__ */ new Set()) {
  if (typeof type === "string" && !hasMvrName(type))
    return types;
  const tag = isStructTag(type) ? type : parseStructTag(type);
  if (hasMvrName(tag.address))
    types.add(`${tag.address}::${tag.module}::${tag.name}`);
  for (const param of tag.typeParams)
    extractMvrTypes(param, types);
  return types;
}
function replaceMvrNames(tag, typeCache) {
  const type = isStructTag(tag) ? tag : parseStructTag(tag);
  const cacheHit = typeCache[`${type.address}::${type.module}::${type.name}`];
  return normalizeStructTag({
    ...type,
    address: cacheHit ? cacheHit.split("::")[0] : type.address,
    typeParams: type.typeParams.map((param) => replaceMvrNames(param, typeCache))
  });
}
function hasMvrName(nameOrType) {
  return nameOrType.includes(NAME_SEPARATOR2) || nameOrType.includes("@") || nameOrType.includes(".sui");
}
function isStructTag(type) {
  return typeof type === "object" && "address" in type && "module" in type && "name" in type && "typeParams" in type;
}
function findNamesInTransaction(builder) {
  const packages = /* @__PURE__ */ new Set();
  const types = /* @__PURE__ */ new Set();
  for (const command of builder.commands)
    switch (command.$kind) {
      case "MakeMoveVec":
        if (command.MakeMoveVec.type)
          getNamesFromTypeList([command.MakeMoveVec.type]).forEach((type) => {
            types.add(type);
          });
        break;
      case "MoveCall":
        const moveCall = command.MoveCall;
        const pkg = moveCall.package.split("::")[0];
        if (hasMvrName(pkg)) {
          if (!isValidNamedPackage(pkg))
            throw new Error(`Invalid package name: ${pkg}`);
          packages.add(pkg);
        }
        getNamesFromTypeList(moveCall.typeArguments ?? []).forEach((type) => {
          types.add(type);
        });
        break;
      default:
        break;
    }
  return {
    packages: [...packages],
    types: [...types]
  };
}
function replaceNames(builder, resolved) {
  for (const command of builder.commands) {
    if (command.MakeMoveVec?.type) {
      if (!hasMvrName(command.MakeMoveVec.type))
        continue;
      if (!resolved.types[command.MakeMoveVec.type])
        throw new Error(`No resolution found for type: ${command.MakeMoveVec.type}`);
      command.MakeMoveVec.type = resolved.types[command.MakeMoveVec.type].type;
    }
    const tx = command.MoveCall;
    if (!tx)
      continue;
    const nameParts = tx.package.split("::");
    const name = nameParts[0];
    if (hasMvrName(name) && !resolved.packages[name])
      throw new Error(`No address found for package: ${name}`);
    if (hasMvrName(name)) {
      nameParts[0] = resolved.packages[name].package;
      tx.package = nameParts.join("::");
    }
    const types = tx.typeArguments;
    if (!types)
      continue;
    for (let i = 0; i < types.length; i++) {
      if (!hasMvrName(types[i]))
        continue;
      if (!resolved.types[types[i]])
        throw new Error(`No resolution found for type: ${types[i]}`);
      types[i] = resolved.types[types[i]].type;
    }
    tx.typeArguments = types;
  }
}
function getNamesFromTypeList(types) {
  const names = /* @__PURE__ */ new Set();
  for (const type of types)
    if (hasMvrName(type)) {
      if (!isValidNamedType(type))
        throw new Error(`Invalid type with names: ${type}`);
      names.add(type);
    }
  return names;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/core.mjs
var DEFAULT_MVR_URLS = {
  mainnet: "https://mainnet.mvr.mystenlabs.com",
  testnet: "https://testnet.mvr.mystenlabs.com"
};
var CoreClient = class extends BaseClient {
  constructor(options) {
    super(options);
    this.core = this;
    this.mvr = new MvrClient({
      cache: this.cache.scope("core.mvr"),
      url: options.mvr?.url ?? DEFAULT_MVR_URLS[this.network],
      pageSize: options.mvr?.pageSize,
      overrides: options.mvr?.overrides
    });
  }
  async getObject(options) {
    const { objectId } = options;
    const { objects: [result] } = await this.getObjects({
      objectIds: [objectId],
      signal: options.signal,
      include: options.include
    });
    if (result instanceof Error)
      throw result;
    return { object: result };
  }
  async getDynamicField(options) {
    const normalizedNameType = TypeTagSerializer.parseFromStr((await this.core.mvr.resolveType({ type: options.name.type })).type);
    const fieldId = deriveDynamicFieldID(options.parentId, normalizedNameType, options.name.bcs);
    const { objects: [fieldObject] } = await this.getObjects({
      objectIds: [fieldId],
      signal: options.signal,
      include: {
        previousTransaction: true,
        content: true
      }
    });
    if (fieldObject instanceof Error)
      throw fieldObject;
    const fieldType = parseStructTag(fieldObject.type);
    const content = await fieldObject.content;
    const nameTypeParam = fieldType.typeParams[0];
    const isDynamicObject = typeof nameTypeParam !== "string" && nameTypeParam.module === "dynamic_object_field" && nameTypeParam.name === "Wrapper";
    const valueBcs = content.slice(SUI_ADDRESS_LENGTH + options.name.bcs.length);
    const valueType = typeof fieldType.typeParams[1] === "string" ? fieldType.typeParams[1] : normalizeStructTag(fieldType.typeParams[1]);
    return { dynamicField: {
      $kind: isDynamicObject ? "DynamicObject" : "DynamicField",
      fieldId: fieldObject.objectId,
      digest: fieldObject.digest,
      version: fieldObject.version,
      type: fieldObject.type,
      previousTransaction: fieldObject.previousTransaction,
      name: {
        type: typeof nameTypeParam === "string" ? nameTypeParam : normalizeStructTag(nameTypeParam),
        bcs: options.name.bcs
      },
      value: {
        type: valueType,
        bcs: valueBcs
      },
      childId: isDynamicObject ? suiBcs.Address.parse(valueBcs) : void 0
    } };
  }
  async getDynamicObjectField(options) {
    const wrappedType = `0x2::dynamic_object_field::Wrapper<${(await this.core.mvr.resolveType({ type: options.name.type })).type}>`;
    const { dynamicField } = await this.getDynamicField({
      parentId: options.parentId,
      name: {
        type: wrappedType,
        bcs: options.name.bcs
      },
      signal: options.signal
    });
    const { object: object2 } = await this.getObject({
      objectId: dynamicField.childId,
      signal: options.signal,
      include: options.include
    });
    return { object: object2 };
  }
  async waitForTransaction(options) {
    const { signal, timeout = 60 * 1e3, include } = options;
    const digest = "result" in options && options.result ? (options.result.Transaction ?? options.result.FailedTransaction).digest : options.digest;
    const abortSignal = signal ? AbortSignal.any([AbortSignal.timeout(timeout), signal]) : AbortSignal.timeout(timeout);
    const abortPromise = new Promise((_, reject) => {
      abortSignal.addEventListener("abort", () => reject(abortSignal.reason));
    });
    abortPromise.catch(() => {
    });
    while (true) {
      abortSignal.throwIfAborted();
      try {
        return await this.getTransaction({
          digest,
          include,
          signal: abortSignal
        });
      } catch {
        await Promise.race([new Promise((resolve) => setTimeout(resolve, 2e3)), abortPromise]);
      }
    }
  }
  async signAndExecuteTransaction({ transaction, signer, additionalSignatures = [], ...input }) {
    let transactionBytes;
    if (transaction instanceof Uint8Array)
      transactionBytes = transaction;
    else {
      transaction.setSenderIfNotSet(signer.toSuiAddress());
      transactionBytes = await transaction.build({ client: this });
    }
    const { signature } = await signer.signTransaction(transactionBytes);
    return this.executeTransaction({
      transaction: transactionBytes,
      signatures: [signature, ...additionalSignatures],
      ...input
    });
  }
};

// node_modules/.pnpm/valibot@1.2.0_typescript@5.9.3/node_modules/valibot/dist/index.mjs
var store$4;
// @__NO_SIDE_EFFECTS__
function getGlobalConfig(config$1) {
  return {
    lang: config$1?.lang ?? store$4?.lang,
    message: config$1?.message,
    abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
    abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
  };
}
var store$3;
// @__NO_SIDE_EFFECTS__
function getGlobalMessage(lang) {
  return store$3?.get(lang);
}
var store$2;
// @__NO_SIDE_EFFECTS__
function getSchemaMessage(lang) {
  return store$2?.get(lang);
}
var store$1;
// @__NO_SIDE_EFFECTS__
function getSpecificMessage(reference, lang) {
  return store$1?.get(reference)?.get(lang);
}
// @__NO_SIDE_EFFECTS__
function _stringify(input) {
  const type = typeof input;
  if (type === "string")
    return `"${input}"`;
  if (type === "number" || type === "bigint" || type === "boolean")
    return `${input}`;
  if (type === "object" || type === "function")
    return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
  return type;
}
function _addIssue(context, label, dataset, config$1, other) {
  const input = other && "input" in other ? other.input : dataset.value;
  const expected = other?.expected ?? context.expects ?? null;
  const received = other?.received ?? /* @__PURE__ */ _stringify(input);
  const issue = {
    kind: context.kind,
    type: context.type,
    input,
    expected,
    received,
    message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
    requirement: context.requirement,
    path: other?.path,
    issues: other?.issues,
    lang: config$1.lang,
    abortEarly: config$1.abortEarly,
    abortPipeEarly: config$1.abortPipeEarly
  };
  const isSchema = context.kind === "schema";
  const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
  if (message$1 !== void 0)
    issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
  if (isSchema)
    dataset.typed = false;
  if (dataset.issues)
    dataset.issues.push(issue);
  else
    dataset.issues = [issue];
}
// @__NO_SIDE_EFFECTS__
function _getStandardProps(context) {
  return {
    version: 1,
    vendor: "valibot",
    validate(value$1) {
      return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
    }
  };
}
// @__NO_SIDE_EFFECTS__
function _isValidObjectKey(object$1, key) {
  return Object.hasOwn(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
// @__NO_SIDE_EFFECTS__
function _joinExpects(values$1, separator) {
  const list = [...new Set(values$1)];
  if (list.length > 1)
    return `(${list.join(` ${separator} `)})`;
  return list[0] ?? "never";
}
var ValiError = class extends Error {
  /**
  * Creates a Valibot error with useful information.
  *
  * @param issues The error issues.
  */
  constructor(issues) {
    super(issues[0].message);
    this.name = "ValiError";
    this.issues = issues;
  }
};
// @__NO_SIDE_EFFECTS__
function check(requirement, message$1) {
  return {
    kind: "validation",
    type: "check",
    reference: check,
    async: false,
    expects: null,
    requirement,
    message: message$1,
    "~run"(dataset, config$1) {
      if (dataset.typed && !this.requirement(dataset.value))
        _addIssue(this, "input", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function integer(message$1) {
  return {
    kind: "validation",
    type: "integer",
    reference: integer,
    async: false,
    expects: null,
    requirement: Number.isInteger,
    message: message$1,
    "~run"(dataset, config$1) {
      if (dataset.typed && !this.requirement(dataset.value))
        _addIssue(this, "integer", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function transform(operation) {
  return {
    kind: "transformation",
    type: "transform",
    reference: transform,
    async: false,
    operation,
    "~run"(dataset) {
      dataset.value = this.operation(dataset.value);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function getFallback(schema, dataset, config$1) {
  return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
}
// @__NO_SIDE_EFFECTS__
function getDefault(schema, dataset, config$1) {
  return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
}
// @__NO_SIDE_EFFECTS__
function is(schema, input) {
  return !schema["~run"]({ value: input }, { abortEarly: true }).issues;
}
// @__NO_SIDE_EFFECTS__
function array(item, message$1) {
  return {
    kind: "schema",
    type: "array",
    reference: array,
    expects: "Array",
    async: false,
    item,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0; key < input.length; key++) {
          const value$1 = input[key];
          const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value$1
            };
            for (const issue of itemDataset.issues) {
              if (issue.path)
                issue.path.unshift(pathItem);
              else
                issue.path = [pathItem];
              dataset.issues?.push(issue);
            }
            if (!dataset.issues)
              dataset.issues = itemDataset.issues;
            if (config$1.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed)
            dataset.typed = false;
          dataset.value.push(itemDataset.value);
        }
      } else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function bigint(message$1) {
  return {
    kind: "schema",
    type: "bigint",
    reference: bigint,
    expects: "bigint",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "bigint")
        dataset.typed = true;
      else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function boolean(message$1) {
  return {
    kind: "schema",
    type: "boolean",
    reference: boolean,
    expects: "boolean",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "boolean")
        dataset.typed = true;
      else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function lazy(getter) {
  return {
    kind: "schema",
    type: "lazy",
    reference: lazy,
    expects: "unknown",
    async: false,
    getter,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      return this.getter(dataset.value)["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function literal(literal_, message$1) {
  return {
    kind: "schema",
    type: "literal",
    reference: literal,
    expects: /* @__PURE__ */ _stringify(literal_),
    async: false,
    literal: literal_,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === this.literal)
        dataset.typed = true;
      else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function nullable(wrapped, default_) {
  return {
    kind: "schema",
    type: "nullable",
    reference: nullable,
    expects: `(${wrapped.expects} | null)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === null) {
        if (this.default !== void 0)
          dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
        if (dataset.value === null) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function nullish(wrapped, default_) {
  return {
    kind: "schema",
    type: "nullish",
    reference: nullish,
    expects: `(${wrapped.expects} | null | undefined)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === null || dataset.value === void 0) {
        if (this.default !== void 0)
          dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
        if (dataset.value === null || dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function number(message$1) {
  return {
    kind: "schema",
    type: "number",
    reference: number,
    expects: "number",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "number" && !isNaN(dataset.value))
        dataset.typed = true;
      else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function object(entries$1, message$1) {
  return {
    kind: "schema",
    type: "object",
    reference: object,
    expects: "Object",
    async: false,
    entries: entries$1,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const key in this.entries) {
          const valueSchema = this.entries[key];
          if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
            const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
            const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
            if (valueDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "value",
                input,
                key,
                value: value$1
              };
              for (const issue of valueDataset.issues) {
                if (issue.path)
                  issue.path.unshift(pathItem);
                else
                  issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues)
                dataset.issues = valueDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!valueDataset.typed)
              dataset.typed = false;
            dataset.value[key] = valueDataset.value;
          } else if (valueSchema.fallback !== void 0)
            dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
          else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
            _addIssue(this, "key", dataset, config$1, {
              input: void 0,
              expected: `"${key}"`,
              path: [{
                type: "object",
                origin: "key",
                input,
                key,
                value: input[key]
              }]
            });
            if (config$1.abortEarly)
              break;
          }
        }
      } else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function optional(wrapped, default_) {
  return {
    kind: "schema",
    type: "optional",
    reference: optional,
    expects: `(${wrapped.expects} | undefined)`,
    async: false,
    wrapped,
    default: default_,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (dataset.value === void 0) {
        if (this.default !== void 0)
          dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
        if (dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped["~run"](dataset, config$1);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function record(key, value$1, message$1) {
  return {
    kind: "schema",
    type: "record",
    reference: record,
    expects: "Object",
    async: false,
    key,
    value: value$1,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const entryKey in input)
          if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
            const entryValue = input[entryKey];
            const keyDataset = this.key["~run"]({ value: entryKey }, config$1);
            if (keyDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "key",
                input,
                key: entryKey,
                value: entryValue
              };
              for (const issue of keyDataset.issues) {
                issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues)
                dataset.issues = keyDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            const valueDataset = this.value["~run"]({ value: entryValue }, config$1);
            if (valueDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "value",
                input,
                key: entryKey,
                value: entryValue
              };
              for (const issue of valueDataset.issues) {
                if (issue.path)
                  issue.path.unshift(pathItem);
                else
                  issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues)
                dataset.issues = valueDataset.issues;
              if (config$1.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!keyDataset.typed || !valueDataset.typed)
              dataset.typed = false;
            if (keyDataset.typed)
              dataset.value[keyDataset.value] = valueDataset.value;
          }
      } else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function string(message$1) {
  return {
    kind: "schema",
    type: "string",
    reference: string,
    expects: "string",
    async: false,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      if (typeof dataset.value === "string")
        dataset.typed = true;
      else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function tuple(items, message$1) {
  return {
    kind: "schema",
    type: "tuple",
    reference: tuple,
    expects: "Array",
    async: false,
    items,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0; key < this.items.length; key++) {
          const value$1 = input[key];
          const itemDataset = this.items[key]["~run"]({ value: value$1 }, config$1);
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value$1
            };
            for (const issue of itemDataset.issues) {
              if (issue.path)
                issue.path.unshift(pathItem);
              else
                issue.path = [pathItem];
              dataset.issues?.push(issue);
            }
            if (!dataset.issues)
              dataset.issues = itemDataset.issues;
            if (config$1.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed)
            dataset.typed = false;
          dataset.value.push(itemDataset.value);
        }
      } else
        _addIssue(this, "type", dataset, config$1);
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function _subIssues(datasets) {
  let issues;
  if (datasets)
    for (const dataset of datasets)
      if (issues)
        issues.push(...dataset.issues);
      else
        issues = dataset.issues;
  return issues;
}
// @__NO_SIDE_EFFECTS__
function union(options, message$1) {
  return {
    kind: "schema",
    type: "union",
    reference: union,
    expects: /* @__PURE__ */ _joinExpects(options.map((option2) => option2.expects), "|"),
    async: false,
    options,
    message: message$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      let validDataset;
      let typedDatasets;
      let untypedDatasets;
      for (const schema of this.options) {
        const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
        if (optionDataset.typed)
          if (optionDataset.issues)
            if (typedDatasets)
              typedDatasets.push(optionDataset);
            else
              typedDatasets = [optionDataset];
          else {
            validDataset = optionDataset;
            break;
          }
        else if (untypedDatasets)
          untypedDatasets.push(optionDataset);
        else
          untypedDatasets = [optionDataset];
      }
      if (validDataset)
        return validDataset;
      if (typedDatasets) {
        if (typedDatasets.length === 1)
          return typedDatasets[0];
        _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
        dataset.typed = true;
      } else if (untypedDatasets?.length === 1)
        return untypedDatasets[0];
      else
        _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
      return dataset;
    }
  };
}
// @__NO_SIDE_EFFECTS__
function unknown() {
  return {
    kind: "schema",
    type: "unknown",
    reference: unknown,
    expects: "unknown",
    async: false,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset) {
      dataset.typed = true;
      return dataset;
    }
  };
}
function parse(schema, input, config$1) {
  const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
  if (dataset.issues)
    throw new ValiError(dataset.issues);
  return dataset.value;
}
// @__NO_SIDE_EFFECTS__
function pipe(...pipe$1) {
  return {
    ...pipe$1[0],
    pipe: pipe$1,
    get "~standard"() {
      return /* @__PURE__ */ _getStandardProps(this);
    },
    "~run"(dataset, config$1) {
      for (const item of pipe$1)
        if (item.kind !== "metadata") {
          if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
            dataset.typed = false;
            break;
          }
          if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly)
            dataset = item["~run"](dataset, config$1);
        }
      return dataset;
    }
  };
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/data/internal.mjs
function safeEnum(options) {
  return union(Object.keys(options).map((key) => withKind(key, object({ [key]: options[key] }))));
}
function withKind(key, schema) {
  return pipe(object({
    ...schema.entries,
    $kind: optional(literal(key))
  }), transform((value) => ({
    ...value,
    $kind: key
  })));
}
var SuiAddress = pipe(string(), transform((value) => normalizeSuiAddress(value)), check(isValidSuiAddress));
var ObjectID = SuiAddress;
var BCSBytes = string();
var JsonU64 = pipe(union([string(), pipe(number(), integer())]), check((val) => {
  try {
    BigInt(val);
    return BigInt(val) >= 0 && BigInt(val) <= 18446744073709551615n;
  } catch {
    return false;
  }
}, "Invalid u64"));
var U32 = pipe(number(), integer(), check((val) => val >= 0 && val < 2 ** 32, "Invalid u32"));
var ObjectRefSchema = object({
  objectId: SuiAddress,
  version: JsonU64,
  digest: string()
});
var ArgumentSchema = union([
  withKind("GasCoin", object({ GasCoin: literal(true) })),
  withKind("Input", object({
    Input: pipe(number(), integer()),
    type: optional(union([
      literal("pure"),
      literal("object"),
      literal("withdrawal")
    ]))
  })),
  withKind("Result", object({ Result: pipe(number(), integer()) })),
  withKind("NestedResult", object({ NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())]) }))
]);
var GasDataSchema = object({
  budget: nullable(JsonU64),
  price: nullable(JsonU64),
  owner: nullable(SuiAddress),
  payment: nullable(array(ObjectRefSchema))
});
var StructTagSchema = object({
  address: string(),
  module: string(),
  name: string(),
  typeParams: array(string())
});
var OpenSignatureBodySchema = union([
  object({ $kind: literal("address") }),
  object({ $kind: literal("bool") }),
  object({ $kind: literal("u8") }),
  object({ $kind: literal("u16") }),
  object({ $kind: literal("u32") }),
  object({ $kind: literal("u64") }),
  object({ $kind: literal("u128") }),
  object({ $kind: literal("u256") }),
  object({ $kind: literal("unknown") }),
  object({
    $kind: literal("vector"),
    vector: lazy(() => OpenSignatureBodySchema)
  }),
  object({
    $kind: literal("datatype"),
    datatype: object({
      typeName: string(),
      typeParameters: array(lazy(() => OpenSignatureBodySchema))
    })
  }),
  object({
    $kind: literal("typeParameter"),
    index: pipe(number(), integer())
  })
]);
var OpenSignatureSchema = object({
  reference: nullable(union([
    literal("mutable"),
    literal("immutable"),
    literal("unknown")
  ])),
  body: OpenSignatureBodySchema
});
var ProgrammableMoveCallSchema = object({
  package: ObjectID,
  module: string(),
  function: string(),
  typeArguments: array(string()),
  arguments: array(ArgumentSchema),
  _argumentTypes: optional(nullable(array(OpenSignatureSchema)))
});
var $Intent = object({
  name: string(),
  inputs: record(string(), union([ArgumentSchema, array(ArgumentSchema)])),
  data: record(string(), unknown())
});
var CommandSchema = safeEnum({
  MoveCall: ProgrammableMoveCallSchema,
  TransferObjects: object({
    objects: array(ArgumentSchema),
    address: ArgumentSchema
  }),
  SplitCoins: object({
    coin: ArgumentSchema,
    amounts: array(ArgumentSchema)
  }),
  MergeCoins: object({
    destination: ArgumentSchema,
    sources: array(ArgumentSchema)
  }),
  Publish: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID)
  }),
  MakeMoveVec: object({
    type: nullable(string()),
    elements: array(ArgumentSchema)
  }),
  Upgrade: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID),
    package: ObjectID,
    ticket: ArgumentSchema
  }),
  $Intent
});
var ObjectArgSchema = safeEnum({
  ImmOrOwnedObject: ObjectRefSchema,
  SharedObject: object({
    objectId: ObjectID,
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRefSchema
});
var ReservationSchema = safeEnum({ MaxAmountU64: JsonU64 });
var WithdrawalTypeArgSchema = safeEnum({ Balance: string() });
var WithdrawFromSchema = safeEnum({
  Sender: literal(true),
  Sponsor: literal(true)
});
var FundsWithdrawalArgSchema = object({
  reservation: ReservationSchema,
  typeArg: WithdrawalTypeArgSchema,
  withdrawFrom: WithdrawFromSchema
});
var CallArgSchema = safeEnum({
  Object: ObjectArgSchema,
  Pure: object({ bytes: BCSBytes }),
  UnresolvedPure: object({ value: unknown() }),
  UnresolvedObject: object({
    objectId: ObjectID,
    version: optional(nullable(JsonU64)),
    digest: optional(nullable(string())),
    initialSharedVersion: optional(nullable(JsonU64)),
    mutable: optional(nullable(boolean()))
  }),
  FundsWithdrawal: FundsWithdrawalArgSchema
});
var NormalizedCallArg = safeEnum({
  Object: ObjectArgSchema,
  Pure: object({ bytes: BCSBytes })
});
var ValidDuringSchema = object({
  minEpoch: nullable(JsonU64),
  maxEpoch: nullable(JsonU64),
  minTimestamp: nullable(JsonU64),
  maxTimestamp: nullable(JsonU64),
  chain: string(),
  nonce: U32
});
var TransactionExpiration2 = safeEnum({
  None: literal(true),
  Epoch: JsonU64,
  ValidDuring: ValidDuringSchema
});
var TransactionDataSchema = object({
  version: literal(2),
  sender: nullish(SuiAddress),
  expiration: nullish(TransactionExpiration2),
  gasData: GasDataSchema,
  inputs: array(CallArgSchema),
  commands: array(CommandSchema)
});

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/data/v1.mjs
var ObjectRef = object({
  digest: string(),
  objectId: string(),
  version: union([
    pipe(number(), integer()),
    string(),
    bigint()
  ])
});
var ObjectArg2 = safeEnum({
  ImmOrOwned: ObjectRef,
  Shared: object({
    objectId: ObjectID,
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRef
});
var NormalizedCallArg2 = safeEnum({
  Object: ObjectArg2,
  Pure: array(pipe(number(), integer()))
});
var TransactionInput = union([object({
  kind: literal("Input"),
  index: pipe(number(), integer()),
  value: unknown(),
  type: optional(literal("object"))
}), object({
  kind: literal("Input"),
  index: pipe(number(), integer()),
  value: unknown(),
  type: literal("pure")
})]);
var TransactionExpiration3 = union([object({ Epoch: pipe(number(), integer()) }), object({ None: nullable(literal(true)) })]);
var StringEncodedBigint = pipe(union([
  number(),
  string(),
  bigint()
]), check((val) => {
  if (![
    "string",
    "number",
    "bigint"
  ].includes(typeof val))
    return false;
  try {
    BigInt(val);
    return true;
  } catch {
    return false;
  }
}));
var TypeTag2 = union([
  object({ bool: nullable(literal(true)) }),
  object({ u8: nullable(literal(true)) }),
  object({ u64: nullable(literal(true)) }),
  object({ u128: nullable(literal(true)) }),
  object({ address: nullable(literal(true)) }),
  object({ signer: nullable(literal(true)) }),
  object({ vector: lazy(() => TypeTag2) }),
  object({ struct: lazy(() => StructTag2) }),
  object({ u16: nullable(literal(true)) }),
  object({ u32: nullable(literal(true)) }),
  object({ u256: nullable(literal(true)) })
]);
var StructTag2 = object({
  address: string(),
  module: string(),
  name: string(),
  typeParams: array(TypeTag2)
});
var GasConfig = object({
  budget: optional(StringEncodedBigint),
  price: optional(StringEncodedBigint),
  payment: optional(array(ObjectRef)),
  owner: optional(string())
});
var TransactionArgumentTypes = [
  TransactionInput,
  object({ kind: literal("GasCoin") }),
  object({
    kind: literal("Result"),
    index: pipe(number(), integer())
  }),
  object({
    kind: literal("NestedResult"),
    index: pipe(number(), integer()),
    resultIndex: pipe(number(), integer())
  })
];
var TransactionArgument = union([...TransactionArgumentTypes]);
var MoveCallTransaction = object({
  kind: literal("MoveCall"),
  target: pipe(string(), check((target) => target.split("::").length === 3)),
  typeArguments: array(string()),
  arguments: array(TransactionArgument)
});
var TransferObjectsTransaction = object({
  kind: literal("TransferObjects"),
  objects: array(TransactionArgument),
  address: TransactionArgument
});
var SplitCoinsTransaction = object({
  kind: literal("SplitCoins"),
  coin: TransactionArgument,
  amounts: array(TransactionArgument)
});
var MergeCoinsTransaction = object({
  kind: literal("MergeCoins"),
  destination: TransactionArgument,
  sources: array(TransactionArgument)
});
var MakeMoveVecTransaction = object({
  kind: literal("MakeMoveVec"),
  type: union([object({ Some: TypeTag2 }), object({ None: nullable(literal(true)) })]),
  objects: array(TransactionArgument)
});
var TransactionType = union([...[
  MoveCallTransaction,
  TransferObjectsTransaction,
  SplitCoinsTransaction,
  MergeCoinsTransaction,
  object({
    kind: literal("Publish"),
    modules: array(array(pipe(number(), integer()))),
    dependencies: array(string())
  }),
  object({
    kind: literal("Upgrade"),
    modules: array(array(pipe(number(), integer()))),
    dependencies: array(string()),
    packageId: string(),
    ticket: TransactionArgument
  }),
  MakeMoveVecTransaction
]]);
var SerializedTransactionDataV1 = object({
  version: literal(1),
  sender: optional(string()),
  expiration: nullish(TransactionExpiration3),
  gasConfig: GasConfig,
  inputs: array(TransactionInput),
  transactions: array(TransactionType)
});
function serializeV1TransactionData(transactionData) {
  const inputs = transactionData.inputs.map((input, index) => {
    if (input.Object)
      return {
        kind: "Input",
        index,
        value: { Object: input.Object.ImmOrOwnedObject ? { ImmOrOwned: input.Object.ImmOrOwnedObject } : input.Object.Receiving ? { Receiving: {
          digest: input.Object.Receiving.digest,
          version: input.Object.Receiving.version,
          objectId: input.Object.Receiving.objectId
        } } : { Shared: {
          mutable: input.Object.SharedObject.mutable,
          initialSharedVersion: input.Object.SharedObject.initialSharedVersion,
          objectId: input.Object.SharedObject.objectId
        } } },
        type: "object"
      };
    if (input.Pure)
      return {
        kind: "Input",
        index,
        value: { Pure: Array.from(fromBase64(input.Pure.bytes)) },
        type: "pure"
      };
    if (input.UnresolvedPure)
      return {
        kind: "Input",
        type: "pure",
        index,
        value: input.UnresolvedPure.value
      };
    if (input.UnresolvedObject)
      return {
        kind: "Input",
        type: "object",
        index,
        value: input.UnresolvedObject.objectId
      };
    throw new Error("Invalid input");
  });
  return {
    version: 1,
    sender: transactionData.sender ?? void 0,
    expiration: transactionData.expiration?.$kind === "Epoch" ? { Epoch: Number(transactionData.expiration.Epoch) } : transactionData.expiration ? { None: true } : null,
    gasConfig: {
      owner: transactionData.gasData.owner ?? void 0,
      budget: transactionData.gasData.budget ?? void 0,
      price: transactionData.gasData.price ?? void 0,
      payment: transactionData.gasData.payment ?? void 0
    },
    inputs,
    transactions: transactionData.commands.map((command) => {
      if (command.MakeMoveVec)
        return {
          kind: "MakeMoveVec",
          type: command.MakeMoveVec.type === null ? { None: true } : { Some: TypeTagSerializer.parseFromStr(command.MakeMoveVec.type) },
          objects: command.MakeMoveVec.elements.map((arg) => convertTransactionArgument(arg, inputs))
        };
      if (command.MergeCoins)
        return {
          kind: "MergeCoins",
          destination: convertTransactionArgument(command.MergeCoins.destination, inputs),
          sources: command.MergeCoins.sources.map((arg) => convertTransactionArgument(arg, inputs))
        };
      if (command.MoveCall)
        return {
          kind: "MoveCall",
          target: `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`,
          typeArguments: command.MoveCall.typeArguments,
          arguments: command.MoveCall.arguments.map((arg) => convertTransactionArgument(arg, inputs))
        };
      if (command.Publish)
        return {
          kind: "Publish",
          modules: command.Publish.modules.map((mod) => Array.from(fromBase64(mod))),
          dependencies: command.Publish.dependencies
        };
      if (command.SplitCoins)
        return {
          kind: "SplitCoins",
          coin: convertTransactionArgument(command.SplitCoins.coin, inputs),
          amounts: command.SplitCoins.amounts.map((arg) => convertTransactionArgument(arg, inputs))
        };
      if (command.TransferObjects)
        return {
          kind: "TransferObjects",
          objects: command.TransferObjects.objects.map((arg) => convertTransactionArgument(arg, inputs)),
          address: convertTransactionArgument(command.TransferObjects.address, inputs)
        };
      if (command.Upgrade)
        return {
          kind: "Upgrade",
          modules: command.Upgrade.modules.map((mod) => Array.from(fromBase64(mod))),
          dependencies: command.Upgrade.dependencies,
          packageId: command.Upgrade.package,
          ticket: convertTransactionArgument(command.Upgrade.ticket, inputs)
        };
      throw new Error(`Unknown transaction ${Object.keys(command)}`);
    })
  };
}
function convertTransactionArgument(arg, inputs) {
  if (arg.$kind === "GasCoin")
    return { kind: "GasCoin" };
  if (arg.$kind === "Result")
    return {
      kind: "Result",
      index: arg.Result
    };
  if (arg.$kind === "NestedResult")
    return {
      kind: "NestedResult",
      index: arg.NestedResult[0],
      resultIndex: arg.NestedResult[1]
    };
  if (arg.$kind === "Input")
    return inputs[arg.Input];
  throw new Error(`Invalid argument ${Object.keys(arg)}`);
}
function transactionDataFromV1(data) {
  return parse(TransactionDataSchema, {
    version: 2,
    sender: data.sender ?? null,
    expiration: data.expiration ? "Epoch" in data.expiration ? { Epoch: data.expiration.Epoch } : { None: true } : null,
    gasData: {
      owner: data.gasConfig.owner ?? null,
      budget: data.gasConfig.budget?.toString() ?? null,
      price: data.gasConfig.price?.toString() ?? null,
      payment: data.gasConfig.payment?.map((ref) => ({
        digest: ref.digest,
        objectId: ref.objectId,
        version: ref.version.toString()
      })) ?? null
    },
    inputs: data.inputs.map((input) => {
      if (input.kind === "Input") {
        if (is(NormalizedCallArg2, input.value)) {
          const value = parse(NormalizedCallArg2, input.value);
          if (value.Object) {
            if (value.Object.ImmOrOwned)
              return { Object: { ImmOrOwnedObject: {
                objectId: value.Object.ImmOrOwned.objectId,
                version: String(value.Object.ImmOrOwned.version),
                digest: value.Object.ImmOrOwned.digest
              } } };
            if (value.Object.Shared)
              return { Object: { SharedObject: {
                mutable: value.Object.Shared.mutable ?? null,
                initialSharedVersion: value.Object.Shared.initialSharedVersion,
                objectId: value.Object.Shared.objectId
              } } };
            if (value.Object.Receiving)
              return { Object: { Receiving: {
                digest: value.Object.Receiving.digest,
                version: String(value.Object.Receiving.version),
                objectId: value.Object.Receiving.objectId
              } } };
            throw new Error("Invalid object input");
          }
          return { Pure: { bytes: toBase64(new Uint8Array(value.Pure)) } };
        }
        if (input.type === "object")
          return { UnresolvedObject: { objectId: input.value } };
        return { UnresolvedPure: { value: input.value } };
      }
      throw new Error("Invalid input");
    }),
    commands: data.transactions.map((transaction) => {
      switch (transaction.kind) {
        case "MakeMoveVec":
          return { MakeMoveVec: {
            type: "Some" in transaction.type ? TypeTagSerializer.tagToString(transaction.type.Some) : null,
            elements: transaction.objects.map((arg) => parseV1TransactionArgument(arg))
          } };
        case "MergeCoins":
          return { MergeCoins: {
            destination: parseV1TransactionArgument(transaction.destination),
            sources: transaction.sources.map((arg) => parseV1TransactionArgument(arg))
          } };
        case "MoveCall": {
          const [pkg, mod, fn] = transaction.target.split("::");
          return { MoveCall: {
            package: pkg,
            module: mod,
            function: fn,
            typeArguments: transaction.typeArguments,
            arguments: transaction.arguments.map((arg) => parseV1TransactionArgument(arg))
          } };
        }
        case "Publish":
          return { Publish: {
            modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
            dependencies: transaction.dependencies
          } };
        case "SplitCoins":
          return { SplitCoins: {
            coin: parseV1TransactionArgument(transaction.coin),
            amounts: transaction.amounts.map((arg) => parseV1TransactionArgument(arg))
          } };
        case "TransferObjects":
          return { TransferObjects: {
            objects: transaction.objects.map((arg) => parseV1TransactionArgument(arg)),
            address: parseV1TransactionArgument(transaction.address)
          } };
        case "Upgrade":
          return { Upgrade: {
            modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
            dependencies: transaction.dependencies,
            package: transaction.packageId,
            ticket: parseV1TransactionArgument(transaction.ticket)
          } };
      }
      throw new Error(`Unknown transaction ${Object.keys(transaction)}`);
    })
  });
}
function parseV1TransactionArgument(arg) {
  switch (arg.kind) {
    case "GasCoin":
      return { GasCoin: true };
    case "Result":
      return { Result: arg.index };
    case "NestedResult":
      return { NestedResult: [arg.index, arg.resultIndex] };
    case "Input":
      return { Input: arg.index };
  }
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/hash.mjs
function hashTypedData(typeTag, data) {
  const typeTagBytes = Array.from(`${typeTag}::`).map((e) => e.charCodeAt(0));
  const dataWithTag = new Uint8Array(typeTagBytes.length + data.length);
  dataWithTag.set(typeTagBytes);
  dataWithTag.set(data, typeTagBytes.length);
  return blake2b(dataWithTag, { dkLen: 32 });
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/utils.mjs
function getIdFromCallArg(arg) {
  if (typeof arg === "string")
    return normalizeSuiAddress(arg);
  if (arg.Object) {
    if (arg.Object.ImmOrOwnedObject)
      return normalizeSuiAddress(arg.Object.ImmOrOwnedObject.objectId);
    if (arg.Object.Receiving)
      return normalizeSuiAddress(arg.Object.Receiving.objectId);
    return normalizeSuiAddress(arg.Object.SharedObject.objectId);
  }
  if (arg.UnresolvedObject)
    return normalizeSuiAddress(arg.UnresolvedObject.objectId);
}
function remapCommandArguments(command, inputMapping, commandMapping) {
  const remapArg = (arg) => {
    switch (arg.$kind) {
      case "Input": {
        const newInputIndex = inputMapping.get(arg.Input);
        if (newInputIndex === void 0)
          throw new Error(`Input ${arg.Input} not found in input mapping`);
        return {
          ...arg,
          Input: newInputIndex
        };
      }
      case "Result": {
        const newCommandIndex = commandMapping.get(arg.Result);
        if (newCommandIndex !== void 0)
          return {
            ...arg,
            Result: newCommandIndex
          };
        return arg;
      }
      case "NestedResult": {
        const newCommandIndex = commandMapping.get(arg.NestedResult[0]);
        if (newCommandIndex !== void 0)
          return {
            ...arg,
            NestedResult: [newCommandIndex, arg.NestedResult[1]]
          };
        return arg;
      }
      default:
        return arg;
    }
  };
  switch (command.$kind) {
    case "MoveCall":
      command.MoveCall.arguments = command.MoveCall.arguments.map(remapArg);
      break;
    case "TransferObjects":
      command.TransferObjects.objects = command.TransferObjects.objects.map(remapArg);
      command.TransferObjects.address = remapArg(command.TransferObjects.address);
      break;
    case "SplitCoins":
      command.SplitCoins.coin = remapArg(command.SplitCoins.coin);
      command.SplitCoins.amounts = command.SplitCoins.amounts.map(remapArg);
      break;
    case "MergeCoins":
      command.MergeCoins.destination = remapArg(command.MergeCoins.destination);
      command.MergeCoins.sources = command.MergeCoins.sources.map(remapArg);
      break;
    case "MakeMoveVec":
      command.MakeMoveVec.elements = command.MakeMoveVec.elements.map(remapArg);
      break;
    case "Upgrade":
      command.Upgrade.ticket = remapArg(command.Upgrade.ticket);
      break;
    case "$Intent": {
      const inputs = command.$Intent.inputs;
      command.$Intent.inputs = {};
      for (const [key, value] of Object.entries(inputs))
        command.$Intent.inputs[key] = Array.isArray(value) ? value.map(remapArg) : remapArg(value);
      break;
    }
    case "Publish":
      break;
  }
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/TransactionData.mjs
function prepareSuiAddress(address) {
  return normalizeSuiAddress(address).replace("0x", "");
}
var TransactionDataBuilder = class TransactionDataBuilder2 {
  static fromKindBytes(bytes) {
    const programmableTx = suiBcs.TransactionKind.parse(bytes).ProgrammableTransaction;
    if (!programmableTx)
      throw new Error("Unable to deserialize from bytes.");
    return TransactionDataBuilder2.restore({
      version: 2,
      sender: null,
      expiration: null,
      gasData: {
        budget: null,
        owner: null,
        payment: null,
        price: null
      },
      inputs: programmableTx.inputs,
      commands: programmableTx.commands
    });
  }
  static fromBytes(bytes) {
    const data = suiBcs.TransactionData.parse(bytes)?.V1;
    const programmableTx = data.kind.ProgrammableTransaction;
    if (!data || !programmableTx)
      throw new Error("Unable to deserialize from bytes.");
    return TransactionDataBuilder2.restore({
      version: 2,
      sender: data.sender,
      expiration: data.expiration,
      gasData: data.gasData,
      inputs: programmableTx.inputs,
      commands: programmableTx.commands
    });
  }
  static restore(data) {
    if (data.version === 2)
      return new TransactionDataBuilder2(parse(TransactionDataSchema, data));
    else
      return new TransactionDataBuilder2(parse(TransactionDataSchema, transactionDataFromV1(data)));
  }
  /**
  * Generate transaction digest.
  *
  * @param bytes BCS serialized transaction data
  * @returns transaction digest.
  */
  static getDigestFromBytes(bytes) {
    return toBase58(hashTypedData("TransactionData", bytes));
  }
  constructor(clone) {
    this.version = 2;
    this.sender = clone?.sender ?? null;
    this.expiration = clone?.expiration ?? null;
    this.inputs = clone?.inputs ?? [];
    this.commands = clone?.commands ?? [];
    this.gasData = clone?.gasData ?? {
      budget: null,
      price: null,
      owner: null,
      payment: null
    };
  }
  build({ maxSizeBytes = Infinity, overrides, onlyTransactionKind } = {}) {
    const inputs = this.inputs;
    const commands = this.commands;
    const kind = { ProgrammableTransaction: {
      inputs,
      commands
    } };
    if (onlyTransactionKind)
      return suiBcs.TransactionKind.serialize(kind, { maxSize: maxSizeBytes }).toBytes();
    const expiration = overrides?.expiration ?? this.expiration;
    const sender = overrides?.sender ?? this.sender;
    const gasData = {
      ...this.gasData,
      ...overrides?.gasData
    };
    if (!sender)
      throw new Error("Missing transaction sender");
    if (!gasData.budget)
      throw new Error("Missing gas budget");
    if (!gasData.payment)
      throw new Error("Missing gas payment");
    if (!gasData.price)
      throw new Error("Missing gas price");
    const transactionData = {
      sender: prepareSuiAddress(sender),
      expiration: expiration ? expiration : { None: true },
      gasData: {
        payment: gasData.payment,
        owner: prepareSuiAddress(this.gasData.owner ?? sender),
        price: BigInt(gasData.price),
        budget: BigInt(gasData.budget)
      },
      kind: { ProgrammableTransaction: {
        inputs,
        commands
      } }
    };
    return suiBcs.TransactionData.serialize({ V1: transactionData }, { maxSize: maxSizeBytes }).toBytes();
  }
  addInput(type, arg) {
    const index = this.inputs.length;
    this.inputs.push(arg);
    return {
      Input: index,
      type,
      $kind: "Input"
    };
  }
  getInputUses(index, fn) {
    this.mapArguments((arg, command) => {
      if (arg.$kind === "Input" && arg.Input === index)
        fn(arg, command);
      return arg;
    });
  }
  mapCommandArguments(index, fn) {
    const command = this.commands[index];
    switch (command.$kind) {
      case "MoveCall":
        command.MoveCall.arguments = command.MoveCall.arguments.map((arg) => fn(arg, command, index));
        break;
      case "TransferObjects":
        command.TransferObjects.objects = command.TransferObjects.objects.map((arg) => fn(arg, command, index));
        command.TransferObjects.address = fn(command.TransferObjects.address, command, index);
        break;
      case "SplitCoins":
        command.SplitCoins.coin = fn(command.SplitCoins.coin, command, index);
        command.SplitCoins.amounts = command.SplitCoins.amounts.map((arg) => fn(arg, command, index));
        break;
      case "MergeCoins":
        command.MergeCoins.destination = fn(command.MergeCoins.destination, command, index);
        command.MergeCoins.sources = command.MergeCoins.sources.map((arg) => fn(arg, command, index));
        break;
      case "MakeMoveVec":
        command.MakeMoveVec.elements = command.MakeMoveVec.elements.map((arg) => fn(arg, command, index));
        break;
      case "Upgrade":
        command.Upgrade.ticket = fn(command.Upgrade.ticket, command, index);
        break;
      case "$Intent":
        const inputs = command.$Intent.inputs;
        command.$Intent.inputs = {};
        for (const [key, value] of Object.entries(inputs))
          command.$Intent.inputs[key] = Array.isArray(value) ? value.map((arg) => fn(arg, command, index)) : fn(value, command, index);
        break;
      case "Publish":
        break;
      default:
        throw new Error(`Unexpected transaction kind: ${command.$kind}`);
    }
  }
  mapArguments(fn) {
    for (const commandIndex of this.commands.keys())
      this.mapCommandArguments(commandIndex, fn);
  }
  replaceCommand(index, replacement, resultIndex = index) {
    if (!Array.isArray(replacement)) {
      this.commands[index] = replacement;
      return;
    }
    const sizeDiff = replacement.length - 1;
    this.commands.splice(index, 1, ...structuredClone(replacement));
    this.mapArguments((arg, _command, commandIndex) => {
      if (commandIndex < index + replacement.length)
        return arg;
      if (typeof resultIndex !== "number") {
        if (arg.$kind === "Result" && arg.Result === index || arg.$kind === "NestedResult" && arg.NestedResult[0] === index)
          if (!("NestedResult" in arg) || arg.NestedResult[1] === 0)
            return parse(ArgumentSchema, structuredClone(resultIndex));
          else
            throw new Error(`Cannot replace command ${index} with a specific result type: NestedResult[${index}, ${arg.NestedResult[1]}] references a nested element that cannot be mapped to the replacement result`);
      }
      switch (arg.$kind) {
        case "Result":
          if (arg.Result === index && typeof resultIndex === "number")
            arg.Result = resultIndex;
          if (arg.Result > index)
            arg.Result += sizeDiff;
          break;
        case "NestedResult":
          if (arg.NestedResult[0] === index && typeof resultIndex === "number")
            return {
              $kind: "NestedResult",
              NestedResult: [resultIndex, arg.NestedResult[1]]
            };
          if (arg.NestedResult[0] > index)
            arg.NestedResult[0] += sizeDiff;
          break;
      }
      return arg;
    });
  }
  replaceCommandWithTransaction(index, otherTransaction, result) {
    if (result.$kind !== "Result" && result.$kind !== "NestedResult")
      throw new Error("Result must be of kind Result or NestedResult");
    this.insertTransaction(index, otherTransaction);
    this.replaceCommand(index + otherTransaction.commands.length, [], "Result" in result ? { NestedResult: [result.Result + index, 0] } : { NestedResult: [result.NestedResult[0] + index, result.NestedResult[1]] });
  }
  insertTransaction(atCommandIndex, otherTransaction) {
    const inputMapping = /* @__PURE__ */ new Map();
    const commandMapping = /* @__PURE__ */ new Map();
    for (let i = 0; i < otherTransaction.inputs.length; i++) {
      const otherInput = otherTransaction.inputs[i];
      const id = getIdFromCallArg(otherInput);
      let existingIndex = -1;
      if (id !== void 0) {
        existingIndex = this.inputs.findIndex((input) => getIdFromCallArg(input) === id);
        if (existingIndex !== -1 && this.inputs[existingIndex].Object?.SharedObject && otherInput.Object?.SharedObject)
          this.inputs[existingIndex].Object.SharedObject.mutable = this.inputs[existingIndex].Object.SharedObject.mutable || otherInput.Object.SharedObject.mutable;
      }
      if (existingIndex !== -1)
        inputMapping.set(i, existingIndex);
      else {
        const newIndex = this.inputs.length;
        this.inputs.push(otherInput);
        inputMapping.set(i, newIndex);
      }
    }
    for (let i = 0; i < otherTransaction.commands.length; i++)
      commandMapping.set(i, atCommandIndex + i);
    const remappedCommands = [];
    for (let i = 0; i < otherTransaction.commands.length; i++) {
      const command = structuredClone(otherTransaction.commands[i]);
      remapCommandArguments(command, inputMapping, commandMapping);
      remappedCommands.push(command);
    }
    this.commands.splice(atCommandIndex, 0, ...remappedCommands);
    const sizeDiff = remappedCommands.length;
    if (sizeDiff > 0)
      this.mapArguments((arg, _command, commandIndex) => {
        if (commandIndex >= atCommandIndex && commandIndex < atCommandIndex + remappedCommands.length)
          return arg;
        switch (arg.$kind) {
          case "Result":
            if (arg.Result >= atCommandIndex)
              arg.Result += sizeDiff;
            break;
          case "NestedResult":
            if (arg.NestedResult[0] >= atCommandIndex)
              arg.NestedResult[0] += sizeDiff;
            break;
        }
        return arg;
      });
  }
  getDigest() {
    const bytes = this.build({ onlyTransactionKind: false });
    return TransactionDataBuilder2.getDigestFromBytes(bytes);
  }
  snapshot() {
    return parse(TransactionDataSchema, this);
  }
  shallowClone() {
    return new TransactionDataBuilder2({
      version: this.version,
      sender: this.sender,
      expiration: this.expiration,
      gasData: { ...this.gasData },
      inputs: [...this.inputs],
      commands: [...this.commands]
    });
  }
  applyResolvedData(resolved) {
    if (!this.sender)
      this.sender = resolved.sender ?? null;
    if (!this.expiration)
      this.expiration = resolved.expiration ?? null;
    if (!this.gasData.budget)
      this.gasData.budget = resolved.gasData.budget;
    if (!this.gasData.owner)
      this.gasData.owner = resolved.gasData.owner ?? null;
    if (!this.gasData.payment)
      this.gasData.payment = resolved.gasData.payment;
    if (!this.gasData.price)
      this.gasData.price = resolved.gasData.price;
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      const resolvedInput = resolved.inputs[i];
      switch (input.$kind) {
        case "UnresolvedPure":
          if (resolvedInput.$kind !== "Pure")
            throw new Error(`Expected input at index ${i} to resolve to a Pure argument, but got ${JSON.stringify(resolvedInput)}`);
          this.inputs[i] = resolvedInput;
          break;
        case "UnresolvedObject":
          if (resolvedInput.$kind !== "Object")
            throw new Error(`Expected input at index ${i} to resolve to an Object argument, but got ${JSON.stringify(resolvedInput)}`);
          if (resolvedInput.Object.$kind === "ImmOrOwnedObject" || resolvedInput.Object.$kind === "Receiving") {
            const original = input.UnresolvedObject;
            const resolved$1 = resolvedInput.Object.ImmOrOwnedObject ?? resolvedInput.Object.Receiving;
            if (normalizeSuiAddress(original.objectId) !== normalizeSuiAddress(resolved$1.objectId) || original.version != null && original.version !== resolved$1.version || original.digest != null && original.digest !== resolved$1.digest || original.mutable != null || original.initialSharedVersion != null)
              throw new Error(`Input at index ${i} did not match unresolved object. ${JSON.stringify(original)} is not compatible with ${JSON.stringify(resolved$1)}`);
          } else if (resolvedInput.Object.$kind === "SharedObject") {
            const original = input.UnresolvedObject;
            const resolved$1 = resolvedInput.Object.SharedObject;
            if (normalizeSuiAddress(original.objectId) !== normalizeSuiAddress(resolved$1.objectId) || original.initialSharedVersion != null && original.initialSharedVersion !== resolved$1.initialSharedVersion || original.mutable != null && original.mutable !== resolved$1.mutable || original.version != null || original.digest != null)
              throw new Error(`Input at index ${i} did not match unresolved object. ${JSON.stringify(original)} is not compatible with ${JSON.stringify(resolved$1)}`);
          } else
            throw new Error(`Input at index ${i} resolved to an unexpected Object kind: ${JSON.stringify(resolvedInput.Object)}`);
          this.inputs[i] = resolvedInput;
          break;
      }
    }
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/utils.mjs
var ordinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });
var ordinalSuffixes = /* @__PURE__ */ new Map([
  ["one", "st"],
  ["two", "nd"],
  ["few", "rd"],
  ["other", "th"]
]);
function formatOrdinal(n) {
  return `${n}${ordinalSuffixes.get(ordinalRules.select(n))}`;
}
function formatMoveAbortMessage(options) {
  const { command, location, abortCode, cleverError } = options;
  const parts = [];
  if (command != null)
    parts.push(`MoveAbort in ${formatOrdinal(command + 1)} command`);
  else
    parts.push("MoveAbort");
  if (cleverError?.constantName) {
    const errorStr = cleverError.value ? `'${cleverError.constantName}': ${cleverError.value}` : `'${cleverError.constantName}'`;
    parts.push(errorStr);
  } else
    parts.push(`abort code: ${abortCode}`);
  if (location?.package && location?.module) {
    const locationStr = [`in '${[
      location.package.startsWith("0x") ? location.package : `0x${location.package}`,
      location.module,
      location.functionName
    ].filter(Boolean).join("::")}'`];
    if (cleverError?.lineNumber != null)
      locationStr.push(`(line ${cleverError.lineNumber})`);
    else if (location.instruction != null)
      locationStr.push(`(instruction ${location.instruction})`);
    parts.push(locationStr.join(" "));
  }
  return parts.join(", ");
}
var MinimalEffectsWithError = suiBcs.struct("MinimalEffectsWithError", { status: ExecutionStatus });
var MinimalTransactionEffectsWithError = suiBcs.enum("MinimalTransactionEffectsWithError", {
  V1: MinimalEffectsWithError,
  V2: MinimalEffectsWithError
});
var MinimalExecutionStatusNoError = suiBcs.enum("MinimalExecutionStatusNoError", {
  Success: null,
  Failed: null
});
var MinimalEffectsNoError = suiBcs.struct("MinimalEffectsNoError", { status: MinimalExecutionStatusNoError });
var MinimalTransactionEffectsNoError = suiBcs.enum("MinimalTransactionEffectsNoError", {
  V1: MinimalEffectsNoError,
  V2: MinimalEffectsNoError
});
function formatErrorMessage($kind, data) {
  if (data !== null && data !== void 0 && typeof data !== "boolean")
    return `${$kind}(${JSON.stringify(data, (_key, value) => typeof value === "bigint" ? value.toString() : value)})`;
  return $kind;
}
function parseBcsExecutionError(failure) {
  const error = failure.error;
  const command = failure.command != null ? Number(failure.command) : void 0;
  switch (error.$kind) {
    case "MoveAbort": {
      const [location, abortCode] = error.MoveAbort;
      const moveLocation = {
        package: location.module.address,
        module: location.module.name,
        function: location.function,
        functionName: location.functionName ?? void 0,
        instruction: location.instruction
      };
      return {
        $kind: "MoveAbort",
        message: formatMoveAbortMessage({
          command,
          location: moveLocation,
          abortCode: String(abortCode)
        }),
        command,
        MoveAbort: {
          abortCode: String(abortCode),
          location: moveLocation
        }
      };
    }
    case "MoveObjectTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MoveObjectTooBig", error.MoveObjectTooBig),
        command,
        SizeError: {
          name: "ObjectTooBig",
          size: Number(error.MoveObjectTooBig.objectSize),
          maxSize: Number(error.MoveObjectTooBig.maxObjectSize)
        }
      };
    case "MovePackageTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MovePackageTooBig", error.MovePackageTooBig),
        command,
        SizeError: {
          name: "PackageTooBig",
          size: Number(error.MovePackageTooBig.objectSize),
          maxSize: Number(error.MovePackageTooBig.maxObjectSize)
        }
      };
    case "EffectsTooLarge":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("EffectsTooLarge", error.EffectsTooLarge),
        command,
        SizeError: {
          name: "EffectsTooLarge",
          size: Number(error.EffectsTooLarge.currentSize),
          maxSize: Number(error.EffectsTooLarge.maxSize)
        }
      };
    case "WrittenObjectsTooLarge":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("WrittenObjectsTooLarge", error.WrittenObjectsTooLarge),
        command,
        SizeError: {
          name: "WrittenObjectsTooLarge",
          size: Number(error.WrittenObjectsTooLarge.currentSize),
          maxSize: Number(error.WrittenObjectsTooLarge.maxSize)
        }
      };
    case "MoveVectorElemTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MoveVectorElemTooBig", error.MoveVectorElemTooBig),
        command,
        SizeError: {
          name: "MoveVectorElemTooBig",
          size: Number(error.MoveVectorElemTooBig.valueSize),
          maxSize: Number(error.MoveVectorElemTooBig.maxScaledSize)
        }
      };
    case "MoveRawValueTooBig":
      return {
        $kind: "SizeError",
        message: formatErrorMessage("MoveRawValueTooBig", error.MoveRawValueTooBig),
        command,
        SizeError: {
          name: "MoveRawValueTooBig",
          size: Number(error.MoveRawValueTooBig.valueSize),
          maxSize: Number(error.MoveRawValueTooBig.maxScaledSize)
        }
      };
    case "CommandArgumentError":
      return {
        $kind: "CommandArgumentError",
        message: formatErrorMessage("CommandArgumentError", error.CommandArgumentError),
        command,
        CommandArgumentError: {
          argument: error.CommandArgumentError.argIdx,
          name: error.CommandArgumentError.kind.$kind
        }
      };
    case "TypeArgumentError":
      return {
        $kind: "TypeArgumentError",
        message: formatErrorMessage("TypeArgumentError", error.TypeArgumentError),
        command,
        TypeArgumentError: {
          typeArgument: error.TypeArgumentError.argumentIdx,
          name: error.TypeArgumentError.kind.$kind
        }
      };
    case "PackageUpgradeError": {
      const upgradeError = error.PackageUpgradeError.upgradeError;
      return {
        $kind: "PackageUpgradeError",
        message: formatErrorMessage("PackageUpgradeError", error.PackageUpgradeError),
        command,
        PackageUpgradeError: {
          name: upgradeError.$kind,
          packageId: upgradeError.$kind === "UnableToFetchPackage" ? upgradeError.UnableToFetchPackage.packageId : void 0,
          digest: upgradeError.$kind === "DigestDoesNotMatch" ? toBase64(upgradeError.DigestDoesNotMatch.digest) : void 0
        }
      };
    }
    case "ExecutionCancelledDueToSharedObjectCongestion":
      return {
        $kind: "CongestedObjects",
        message: formatErrorMessage("ExecutionCancelledDueToSharedObjectCongestion", error.ExecutionCancelledDueToSharedObjectCongestion),
        command,
        CongestedObjects: {
          name: "ExecutionCanceledDueToConsensusObjectCongestion",
          objects: error.ExecutionCancelledDueToSharedObjectCongestion.congested_objects
        }
      };
    case "AddressDeniedForCoin":
      return {
        $kind: "CoinDenyListError",
        message: formatErrorMessage("AddressDeniedForCoin", error.AddressDeniedForCoin),
        command,
        CoinDenyListError: {
          name: "AddressDeniedForCoin",
          address: error.AddressDeniedForCoin.address,
          coinType: error.AddressDeniedForCoin.coinType
        }
      };
    case "CoinTypeGlobalPause":
      return {
        $kind: "CoinDenyListError",
        message: formatErrorMessage("CoinTypeGlobalPause", error.CoinTypeGlobalPause),
        command,
        CoinDenyListError: {
          name: "CoinTypeGlobalPause",
          coinType: error.CoinTypeGlobalPause.coinType
        }
      };
    case "CircularObjectOwnership":
      return {
        $kind: "ObjectIdError",
        message: formatErrorMessage("CircularObjectOwnership", error.CircularObjectOwnership),
        command,
        ObjectIdError: {
          name: "CircularObjectOwnership",
          objectId: error.CircularObjectOwnership.object
        }
      };
    case "InvalidGasObject":
      return {
        $kind: "ObjectIdError",
        message: "InvalidGasObject",
        command,
        ObjectIdError: {
          name: "InvalidGasObject",
          objectId: ""
        }
      };
    case "InputObjectDeleted":
      return {
        $kind: "ObjectIdError",
        message: "InputObjectDeleted",
        command,
        ObjectIdError: {
          name: "InputObjectDeleted",
          objectId: ""
        }
      };
    case "InvalidTransferObject":
      return {
        $kind: "ObjectIdError",
        message: "InvalidTransferObject",
        command,
        ObjectIdError: {
          name: "InvalidTransferObject",
          objectId: ""
        }
      };
    case "NonExclusiveWriteInputObjectModified":
      return {
        $kind: "Unknown",
        message: formatErrorMessage("NonExclusiveWriteInputObjectModified", error.NonExclusiveWriteInputObjectModified),
        command,
        Unknown: null
      };
    case "InsufficientGas":
    case "InvariantViolation":
    case "FeatureNotYetSupported":
    case "InsufficientCoinBalance":
    case "CoinBalanceOverflow":
    case "PublishErrorNonZeroAddress":
    case "SuiMoveVerificationError":
    case "MovePrimitiveRuntimeError":
    case "VMVerificationOrDeserializationError":
    case "VMInvariantViolation":
    case "FunctionNotFound":
    case "ArityMismatch":
    case "TypeArityMismatch":
    case "NonEntryFunctionInvoked":
    case "UnusedValueWithoutDrop":
    case "InvalidPublicFunctionReturnType":
    case "PublishUpgradeMissingDependency":
    case "PublishUpgradeDependencyDowngrade":
    case "CertificateDenied":
    case "SuiMoveVerificationTimedout":
    case "SharedObjectOperationNotAllowed":
    case "ExecutionCancelledDueToRandomnessUnavailable":
    case "InvalidLinkage":
    case "InsufficientBalanceForWithdraw":
      return {
        $kind: "Unknown",
        message: error.$kind,
        command,
        Unknown: null
      };
    default:
      return {
        $kind: "Unknown",
        message: "Unknown error",
        command,
        Unknown: null
      };
  }
}
function parseTransactionBcs(bytes, onlyTransactionKind = false) {
  return (onlyTransactionKind ? TransactionDataBuilder.fromKindBytes(bytes) : TransactionDataBuilder.fromBytes(bytes)).snapshot();
}
function parseTransactionEffectsBcs(effects) {
  const parsed = suiBcs.TransactionEffects.parse(effects);
  switch (parsed.$kind) {
    case "V1":
      return parseTransactionEffectsV1({
        bytes: effects,
        effects: parsed.V1
      });
    case "V2":
      return parseTransactionEffectsV2({
        bytes: effects,
        effects: parsed.V2
      });
    default:
      throw new Error(`Unknown transaction effects version: ${parsed.$kind}`);
  }
}
function parseTransactionEffectsV1(_) {
  throw new Error("V1 effects are not supported yet");
}
function parseTransactionEffectsV2({ bytes, effects }) {
  const changedObjects = effects.changedObjects.map(([id, change]) => {
    return {
      objectId: id,
      inputState: change.inputState.$kind === "Exist" ? "Exists" : "DoesNotExist",
      inputVersion: change.inputState.Exist?.[0][0] ?? null,
      inputDigest: change.inputState.Exist?.[0][1] ?? null,
      inputOwner: change.inputState.Exist?.[1] ?? null,
      outputState: change.outputState.$kind === "NotExist" ? "DoesNotExist" : change.outputState.$kind,
      outputVersion: change.outputState.$kind === "PackageWrite" ? change.outputState.PackageWrite?.[0] : change.outputState.$kind === "ObjectWrite" ? effects.lamportVersion : null,
      outputDigest: change.outputState.$kind === "PackageWrite" ? change.outputState.PackageWrite?.[1] : change.outputState.$kind === "ObjectWrite" ? change.outputState.ObjectWrite?.[0] ?? null : null,
      outputOwner: change.outputState.$kind === "ObjectWrite" ? change.outputState.ObjectWrite[1] : null,
      idOperation: change.idOperation.$kind
    };
  });
  return {
    bcs: bytes,
    version: 2,
    status: effects.status.$kind === "Success" ? {
      success: true,
      error: null
    } : {
      success: false,
      error: parseBcsExecutionError(effects.status.Failure)
    },
    gasUsed: effects.gasUsed,
    transactionDigest: effects.transactionDigest,
    gasObject: effects.gasObjectIndex === null ? null : changedObjects[effects.gasObjectIndex] ?? null,
    eventsDigest: effects.eventsDigest,
    dependencies: effects.dependencies,
    lamportVersion: effects.lamportVersion,
    changedObjects,
    unchangedConsensusObjects: effects.unchangedConsensusObjects.map(([objectId, object2]) => {
      return {
        kind: object2.$kind,
        objectId,
        version: object2.$kind === "ReadOnlyRoot" ? object2.ReadOnlyRoot[0] : object2[object2.$kind],
        digest: object2.$kind === "ReadOnlyRoot" ? object2.ReadOnlyRoot[1] : null
      };
    }),
    auxiliaryDataDigest: effects.auxDataDigest
  };
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/errors.mjs
var SuiClientError = class extends Error {
};
var SimulationError = class extends SuiClientError {
  constructor(message, options) {
    super(message, { cause: options?.cause });
    this.executionError = options?.executionError;
  }
};
var ObjectError = class ObjectError2 extends SuiClientError {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  static fromResponse(response, objectId) {
    switch (response.code) {
      case "notExists":
        return new ObjectError2(response.code, `Object ${response.object_id} does not exist`);
      case "dynamicFieldNotFound":
        return new ObjectError2(response.code, `Dynamic field not found for object ${response.parent_object_id}`);
      case "deleted":
        return new ObjectError2(response.code, `Object ${response.object_id} has been deleted`);
      case "displayError":
        return new ObjectError2(response.code, `Display error: ${response.error}`);
      case "unknown":
      default:
        return new ObjectError2(response.code, `Unknown error while loading object${objectId ? ` ${objectId}` : ""}`);
    }
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/utils/constants.mjs
var MIST_PER_SUI = BigInt(1e9);
var MOVE_STDLIB_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000001";
var SUI_FRAMEWORK_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000002";
var SUI_SYSTEM_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000003";
var SUI_CLOCK_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";
var SUI_TYPE_ARG = `${SUI_FRAMEWORK_ADDRESS}::sui::SUI`;
var SUI_SYSTEM_STATE_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000005";
var SUI_RANDOM_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000008";
var SUI_DENY_LIST_OBJECT_ID = "0x0000000000000000000000000000000000000000000000000000000000000403";

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/json-typings.js
function typeofJsonValue(value) {
  let t = typeof value;
  if (t == "object") {
    if (Array.isArray(value))
      return "array";
    if (value === null)
      return "null";
  }
  return t;
}
function isJsonObject(value) {
  return value !== null && typeof value == "object" && !Array.isArray(value);
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/base64.js
var encTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
var decTable = [];
for (let i = 0; i < encTable.length; i++)
  decTable[encTable[i].charCodeAt(0)] = i;
decTable["-".charCodeAt(0)] = encTable.indexOf("+");
decTable["_".charCodeAt(0)] = encTable.indexOf("/");
function base64decode(base64Str) {
  let es = base64Str.length * 3 / 4;
  if (base64Str[base64Str.length - 2] == "=")
    es -= 2;
  else if (base64Str[base64Str.length - 1] == "=")
    es -= 1;
  let bytes = new Uint8Array(es), bytePos = 0, groupPos = 0, b, p = 0;
  for (let i = 0; i < base64Str.length; i++) {
    b = decTable[base64Str.charCodeAt(i)];
    if (b === void 0) {
      switch (base64Str[i]) {
        case "=":
          groupPos = 0;
        case "\n":
        case "\r":
        case "	":
        case " ":
          continue;
        default:
          throw Error(`invalid base64 string.`);
      }
    }
    switch (groupPos) {
      case 0:
        p = b;
        groupPos = 1;
        break;
      case 1:
        bytes[bytePos++] = p << 2 | (b & 48) >> 4;
        p = b;
        groupPos = 2;
        break;
      case 2:
        bytes[bytePos++] = (p & 15) << 4 | (b & 60) >> 2;
        p = b;
        groupPos = 3;
        break;
      case 3:
        bytes[bytePos++] = (p & 3) << 6 | b;
        groupPos = 0;
        break;
    }
  }
  if (groupPos == 1)
    throw Error(`invalid base64 string.`);
  return bytes.subarray(0, bytePos);
}
function base64encode(bytes) {
  let base64 = "", groupPos = 0, b, p = 0;
  for (let i = 0; i < bytes.length; i++) {
    b = bytes[i];
    switch (groupPos) {
      case 0:
        base64 += encTable[b >> 2];
        p = (b & 3) << 4;
        groupPos = 1;
        break;
      case 1:
        base64 += encTable[p | b >> 4];
        p = (b & 15) << 2;
        groupPos = 2;
        break;
      case 2:
        base64 += encTable[p | b >> 6];
        base64 += encTable[b & 63];
        groupPos = 0;
        break;
    }
  }
  if (groupPos) {
    base64 += encTable[p];
    base64 += "=";
    if (groupPos == 1)
      base64 += "=";
  }
  return base64;
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/binary-format-contract.js
var UnknownFieldHandler;
(function(UnknownFieldHandler2) {
  UnknownFieldHandler2.symbol = Symbol.for("protobuf-ts/unknown");
  UnknownFieldHandler2.onRead = (typeName, message, fieldNo, wireType, data) => {
    let container = is2(message) ? message[UnknownFieldHandler2.symbol] : message[UnknownFieldHandler2.symbol] = [];
    container.push({ no: fieldNo, wireType, data });
  };
  UnknownFieldHandler2.onWrite = (typeName, message, writer) => {
    for (let { no, wireType, data } of UnknownFieldHandler2.list(message))
      writer.tag(no, wireType).raw(data);
  };
  UnknownFieldHandler2.list = (message, fieldNo) => {
    if (is2(message)) {
      let all = message[UnknownFieldHandler2.symbol];
      return fieldNo ? all.filter((uf) => uf.no == fieldNo) : all;
    }
    return [];
  };
  UnknownFieldHandler2.last = (message, fieldNo) => UnknownFieldHandler2.list(message, fieldNo).slice(-1)[0];
  const is2 = (message) => message && Array.isArray(message[UnknownFieldHandler2.symbol]);
})(UnknownFieldHandler || (UnknownFieldHandler = {}));
function mergeBinaryOptions(a, b) {
  return Object.assign(Object.assign({}, a), b);
}
var WireType;
(function(WireType2) {
  WireType2[WireType2["Varint"] = 0] = "Varint";
  WireType2[WireType2["Bit64"] = 1] = "Bit64";
  WireType2[WireType2["LengthDelimited"] = 2] = "LengthDelimited";
  WireType2[WireType2["StartGroup"] = 3] = "StartGroup";
  WireType2[WireType2["EndGroup"] = 4] = "EndGroup";
  WireType2[WireType2["Bit32"] = 5] = "Bit32";
})(WireType || (WireType = {}));

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/goog-varint.js
function varint64read() {
  let lowBits = 0;
  let highBits = 0;
  for (let shift = 0; shift < 28; shift += 7) {
    let b = this.buf[this.pos++];
    lowBits |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
  }
  let middleByte = this.buf[this.pos++];
  lowBits |= (middleByte & 15) << 28;
  highBits = (middleByte & 112) >> 4;
  if ((middleByte & 128) == 0) {
    this.assertBounds();
    return [lowBits, highBits];
  }
  for (let shift = 3; shift <= 31; shift += 7) {
    let b = this.buf[this.pos++];
    highBits |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
  }
  throw new Error("invalid varint");
}
function varint64write(lo, hi, bytes) {
  for (let i = 0; i < 28; i = i + 7) {
    const shift = lo >>> i;
    const hasNext = !(shift >>> 7 == 0 && hi == 0);
    const byte = (hasNext ? shift | 128 : shift) & 255;
    bytes.push(byte);
    if (!hasNext) {
      return;
    }
  }
  const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
  const hasMoreBits = !(hi >> 3 == 0);
  bytes.push((hasMoreBits ? splitBits | 128 : splitBits) & 255);
  if (!hasMoreBits) {
    return;
  }
  for (let i = 3; i < 31; i = i + 7) {
    const shift = hi >>> i;
    const hasNext = !(shift >>> 7 == 0);
    const byte = (hasNext ? shift | 128 : shift) & 255;
    bytes.push(byte);
    if (!hasNext) {
      return;
    }
  }
  bytes.push(hi >>> 31 & 1);
}
var TWO_PWR_32_DBL = (1 << 16) * (1 << 16);
function int64fromString(dec) {
  let minus = dec[0] == "-";
  if (minus)
    dec = dec.slice(1);
  const base = 1e6;
  let lowBits = 0;
  let highBits = 0;
  function add1e6digit(begin, end) {
    const digit1e6 = Number(dec.slice(begin, end));
    highBits *= base;
    lowBits = lowBits * base + digit1e6;
    if (lowBits >= TWO_PWR_32_DBL) {
      highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
      lowBits = lowBits % TWO_PWR_32_DBL;
    }
  }
  add1e6digit(-24, -18);
  add1e6digit(-18, -12);
  add1e6digit(-12, -6);
  add1e6digit(-6);
  return [minus, lowBits, highBits];
}
function int64toString(bitsLow, bitsHigh) {
  if (bitsHigh >>> 0 <= 2097151) {
    return "" + (TWO_PWR_32_DBL * bitsHigh + (bitsLow >>> 0));
  }
  let low = bitsLow & 16777215;
  let mid = (bitsLow >>> 24 | bitsHigh << 8) >>> 0 & 16777215;
  let high = bitsHigh >> 16 & 65535;
  let digitA = low + mid * 6777216 + high * 6710656;
  let digitB = mid + high * 8147497;
  let digitC = high * 2;
  let base = 1e7;
  if (digitA >= base) {
    digitB += Math.floor(digitA / base);
    digitA %= base;
  }
  if (digitB >= base) {
    digitC += Math.floor(digitB / base);
    digitB %= base;
  }
  function decimalFrom1e7(digit1e7, needLeadingZeros) {
    let partial = digit1e7 ? String(digit1e7) : "";
    if (needLeadingZeros) {
      return "0000000".slice(partial.length) + partial;
    }
    return partial;
  }
  return decimalFrom1e7(
    digitC,
    /*needLeadingZeros=*/
    0
  ) + decimalFrom1e7(
    digitB,
    /*needLeadingZeros=*/
    digitC
  ) + // If the final 1e7 digit didn't need leading zeros, we would have
  // returned via the trivial code path at the top.
  decimalFrom1e7(
    digitA,
    /*needLeadingZeros=*/
    1
  );
}
function varint32write(value, bytes) {
  if (value >= 0) {
    while (value > 127) {
      bytes.push(value & 127 | 128);
      value = value >>> 7;
    }
    bytes.push(value);
  } else {
    for (let i = 0; i < 9; i++) {
      bytes.push(value & 127 | 128);
      value = value >> 7;
    }
    bytes.push(1);
  }
}
function varint32read() {
  let b = this.buf[this.pos++];
  let result = b & 127;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 7;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 14;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 21;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 15) << 28;
  for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++)
    b = this.buf[this.pos++];
  if ((b & 128) != 0)
    throw new Error("invalid varint");
  this.assertBounds();
  return result >>> 0;
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/pb-long.js
var BI;
function detectBi() {
  const dv = new DataView(new ArrayBuffer(8));
  const ok = globalThis.BigInt !== void 0 && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function";
  BI = ok ? {
    MIN: BigInt("-9223372036854775808"),
    MAX: BigInt("9223372036854775807"),
    UMIN: BigInt("0"),
    UMAX: BigInt("18446744073709551615"),
    C: BigInt,
    V: dv
  } : void 0;
}
detectBi();
function assertBi(bi) {
  if (!bi)
    throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support");
}
var RE_DECIMAL_STR = /^-?[0-9]+$/;
var TWO_PWR_32_DBL2 = 4294967296;
var HALF_2_PWR_32 = 2147483648;
var SharedPbLong = class {
  /**
   * Create a new instance with the given bits.
   */
  constructor(lo, hi) {
    this.lo = lo | 0;
    this.hi = hi | 0;
  }
  /**
   * Is this instance equal to 0?
   */
  isZero() {
    return this.lo == 0 && this.hi == 0;
  }
  /**
   * Convert to a native number.
   */
  toNumber() {
    let result = this.hi * TWO_PWR_32_DBL2 + (this.lo >>> 0);
    if (!Number.isSafeInteger(result))
      throw new Error("cannot convert to safe number");
    return result;
  }
};
var PbULong = class _PbULong extends SharedPbLong {
  /**
   * Create instance from a `string`, `number` or `bigint`.
   */
  static from(value) {
    if (BI)
      switch (typeof value) {
        case "string":
          if (value == "0")
            return this.ZERO;
          if (value == "")
            throw new Error("string is no integer");
          value = BI.C(value);
        case "number":
          if (value === 0)
            return this.ZERO;
          value = BI.C(value);
        case "bigint":
          if (!value)
            return this.ZERO;
          if (value < BI.UMIN)
            throw new Error("signed value for ulong");
          if (value > BI.UMAX)
            throw new Error("ulong too large");
          BI.V.setBigUint64(0, value, true);
          return new _PbULong(BI.V.getInt32(0, true), BI.V.getInt32(4, true));
      }
    else
      switch (typeof value) {
        case "string":
          if (value == "0")
            return this.ZERO;
          value = value.trim();
          if (!RE_DECIMAL_STR.test(value))
            throw new Error("string is no integer");
          let [minus, lo, hi] = int64fromString(value);
          if (minus)
            throw new Error("signed value for ulong");
          return new _PbULong(lo, hi);
        case "number":
          if (value == 0)
            return this.ZERO;
          if (!Number.isSafeInteger(value))
            throw new Error("number is no integer");
          if (value < 0)
            throw new Error("signed value for ulong");
          return new _PbULong(value, value / TWO_PWR_32_DBL2);
      }
    throw new Error("unknown value " + typeof value);
  }
  /**
   * Convert to decimal string.
   */
  toString() {
    return BI ? this.toBigInt().toString() : int64toString(this.lo, this.hi);
  }
  /**
   * Convert to native bigint.
   */
  toBigInt() {
    assertBi(BI);
    BI.V.setInt32(0, this.lo, true);
    BI.V.setInt32(4, this.hi, true);
    return BI.V.getBigUint64(0, true);
  }
};
PbULong.ZERO = new PbULong(0, 0);
var PbLong = class _PbLong extends SharedPbLong {
  /**
   * Create instance from a `string`, `number` or `bigint`.
   */
  static from(value) {
    if (BI)
      switch (typeof value) {
        case "string":
          if (value == "0")
            return this.ZERO;
          if (value == "")
            throw new Error("string is no integer");
          value = BI.C(value);
        case "number":
          if (value === 0)
            return this.ZERO;
          value = BI.C(value);
        case "bigint":
          if (!value)
            return this.ZERO;
          if (value < BI.MIN)
            throw new Error("signed long too small");
          if (value > BI.MAX)
            throw new Error("signed long too large");
          BI.V.setBigInt64(0, value, true);
          return new _PbLong(BI.V.getInt32(0, true), BI.V.getInt32(4, true));
      }
    else
      switch (typeof value) {
        case "string":
          if (value == "0")
            return this.ZERO;
          value = value.trim();
          if (!RE_DECIMAL_STR.test(value))
            throw new Error("string is no integer");
          let [minus, lo, hi] = int64fromString(value);
          if (minus) {
            if (hi > HALF_2_PWR_32 || hi == HALF_2_PWR_32 && lo != 0)
              throw new Error("signed long too small");
          } else if (hi >= HALF_2_PWR_32)
            throw new Error("signed long too large");
          let pbl = new _PbLong(lo, hi);
          return minus ? pbl.negate() : pbl;
        case "number":
          if (value == 0)
            return this.ZERO;
          if (!Number.isSafeInteger(value))
            throw new Error("number is no integer");
          return value > 0 ? new _PbLong(value, value / TWO_PWR_32_DBL2) : new _PbLong(-value, -value / TWO_PWR_32_DBL2).negate();
      }
    throw new Error("unknown value " + typeof value);
  }
  /**
   * Do we have a minus sign?
   */
  isNegative() {
    return (this.hi & HALF_2_PWR_32) !== 0;
  }
  /**
   * Negate two's complement.
   * Invert all the bits and add one to the result.
   */
  negate() {
    let hi = ~this.hi, lo = this.lo;
    if (lo)
      lo = ~lo + 1;
    else
      hi += 1;
    return new _PbLong(lo, hi);
  }
  /**
   * Convert to decimal string.
   */
  toString() {
    if (BI)
      return this.toBigInt().toString();
    if (this.isNegative()) {
      let n = this.negate();
      return "-" + int64toString(n.lo, n.hi);
    }
    return int64toString(this.lo, this.hi);
  }
  /**
   * Convert to native bigint.
   */
  toBigInt() {
    assertBi(BI);
    BI.V.setInt32(0, this.lo, true);
    BI.V.setInt32(4, this.hi, true);
    return BI.V.getBigInt64(0, true);
  }
};
PbLong.ZERO = new PbLong(0, 0);

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/binary-reader.js
var defaultsRead = {
  readUnknownField: true,
  readerFactory: (bytes) => new BinaryReader(bytes)
};
function binaryReadOptions(options) {
  return options ? Object.assign(Object.assign({}, defaultsRead), options) : defaultsRead;
}
var BinaryReader = class {
  constructor(buf, textDecoder) {
    this.varint64 = varint64read;
    this.uint32 = varint32read;
    this.buf = buf;
    this.len = buf.length;
    this.pos = 0;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.textDecoder = textDecoder !== null && textDecoder !== void 0 ? textDecoder : new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true
    });
  }
  /**
   * Reads a tag - field number and wire type.
   */
  tag() {
    let tag = this.uint32(), fieldNo = tag >>> 3, wireType = tag & 7;
    if (fieldNo <= 0 || wireType < 0 || wireType > 5)
      throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
    return [fieldNo, wireType];
  }
  /**
   * Skip one element on the wire and return the skipped data.
   * Supports WireType.StartGroup since v2.0.0-alpha.23.
   */
  skip(wireType) {
    let start = this.pos;
    switch (wireType) {
      case WireType.Varint:
        while (this.buf[this.pos++] & 128) {
        }
        break;
      case WireType.Bit64:
        this.pos += 4;
      case WireType.Bit32:
        this.pos += 4;
        break;
      case WireType.LengthDelimited:
        let len = this.uint32();
        this.pos += len;
        break;
      case WireType.StartGroup:
        let t;
        while ((t = this.tag()[1]) !== WireType.EndGroup) {
          this.skip(t);
        }
        break;
      default:
        throw new Error("cant skip wire type " + wireType);
    }
    this.assertBounds();
    return this.buf.subarray(start, this.pos);
  }
  /**
   * Throws error if position in byte array is out of range.
   */
  assertBounds() {
    if (this.pos > this.len)
      throw new RangeError("premature EOF");
  }
  /**
   * Read a `int32` field, a signed 32 bit varint.
   */
  int32() {
    return this.uint32() | 0;
  }
  /**
   * Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
   */
  sint32() {
    let zze = this.uint32();
    return zze >>> 1 ^ -(zze & 1);
  }
  /**
   * Read a `int64` field, a signed 64-bit varint.
   */
  int64() {
    return new PbLong(...this.varint64());
  }
  /**
   * Read a `uint64` field, an unsigned 64-bit varint.
   */
  uint64() {
    return new PbULong(...this.varint64());
  }
  /**
   * Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
   */
  sint64() {
    let [lo, hi] = this.varint64();
    let s = -(lo & 1);
    lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
    hi = hi >>> 1 ^ s;
    return new PbLong(lo, hi);
  }
  /**
   * Read a `bool` field, a variant.
   */
  bool() {
    let [lo, hi] = this.varint64();
    return lo !== 0 || hi !== 0;
  }
  /**
   * Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
   */
  fixed32() {
    return this.view.getUint32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
   */
  sfixed32() {
    return this.view.getInt32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
   */
  fixed64() {
    return new PbULong(this.sfixed32(), this.sfixed32());
  }
  /**
   * Read a `fixed64` field, a signed, fixed-length 64-bit integer.
   */
  sfixed64() {
    return new PbLong(this.sfixed32(), this.sfixed32());
  }
  /**
   * Read a `float` field, 32-bit floating point number.
   */
  float() {
    return this.view.getFloat32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `double` field, a 64-bit floating point number.
   */
  double() {
    return this.view.getFloat64((this.pos += 8) - 8, true);
  }
  /**
   * Read a `bytes` field, length-delimited arbitrary data.
   */
  bytes() {
    let len = this.uint32();
    let start = this.pos;
    this.pos += len;
    this.assertBounds();
    return this.buf.subarray(start, start + len);
  }
  /**
   * Read a `string` field, length-delimited data converted to UTF-8 text.
   */
  string() {
    return this.textDecoder.decode(this.bytes());
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/assert.js
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}
function assertNever(value, msg) {
  throw new Error(msg !== null && msg !== void 0 ? msg : "Unexpected object: " + value);
}
var FLOAT32_MAX = 34028234663852886e22;
var FLOAT32_MIN = -34028234663852886e22;
var UINT32_MAX = 4294967295;
var INT32_MAX = 2147483647;
var INT32_MIN = -2147483648;
function assertInt32(arg) {
  if (typeof arg !== "number")
    throw new Error("invalid int 32: " + typeof arg);
  if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
    throw new Error("invalid int 32: " + arg);
}
function assertUInt32(arg) {
  if (typeof arg !== "number")
    throw new Error("invalid uint 32: " + typeof arg);
  if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
    throw new Error("invalid uint 32: " + arg);
}
function assertFloat32(arg) {
  if (typeof arg !== "number")
    throw new Error("invalid float 32: " + typeof arg);
  if (!Number.isFinite(arg))
    return;
  if (arg > FLOAT32_MAX || arg < FLOAT32_MIN)
    throw new Error("invalid float 32: " + arg);
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/binary-writer.js
var defaultsWrite = {
  writeUnknownFields: true,
  writerFactory: () => new BinaryWriter()
};
function binaryWriteOptions(options) {
  return options ? Object.assign(Object.assign({}, defaultsWrite), options) : defaultsWrite;
}
var BinaryWriter = class {
  constructor(textEncoder) {
    this.stack = [];
    this.textEncoder = textEncoder !== null && textEncoder !== void 0 ? textEncoder : new TextEncoder();
    this.chunks = [];
    this.buf = [];
  }
  /**
   * Return all bytes written and reset this writer.
   */
  finish() {
    this.chunks.push(new Uint8Array(this.buf));
    let len = 0;
    for (let i = 0; i < this.chunks.length; i++)
      len += this.chunks[i].length;
    let bytes = new Uint8Array(len);
    let offset = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      bytes.set(this.chunks[i], offset);
      offset += this.chunks[i].length;
    }
    this.chunks = [];
    return bytes;
  }
  /**
   * Start a new fork for length-delimited data like a message
   * or a packed repeated field.
   *
   * Must be joined later with `join()`.
   */
  fork() {
    this.stack.push({ chunks: this.chunks, buf: this.buf });
    this.chunks = [];
    this.buf = [];
    return this;
  }
  /**
   * Join the last fork. Write its length and bytes, then
   * return to the previous state.
   */
  join() {
    let chunk2 = this.finish();
    let prev = this.stack.pop();
    if (!prev)
      throw new Error("invalid state, fork stack empty");
    this.chunks = prev.chunks;
    this.buf = prev.buf;
    this.uint32(chunk2.byteLength);
    return this.raw(chunk2);
  }
  /**
   * Writes a tag (field number and wire type).
   *
   * Equivalent to `uint32( (fieldNo << 3 | type) >>> 0 )`.
   *
   * Generated code should compute the tag ahead of time and call `uint32()`.
   */
  tag(fieldNo, type) {
    return this.uint32((fieldNo << 3 | type) >>> 0);
  }
  /**
   * Write a chunk of raw bytes.
   */
  raw(chunk2) {
    if (this.buf.length) {
      this.chunks.push(new Uint8Array(this.buf));
      this.buf = [];
    }
    this.chunks.push(chunk2);
    return this;
  }
  /**
   * Write a `uint32` value, an unsigned 32 bit varint.
   */
  uint32(value) {
    assertUInt32(value);
    while (value > 127) {
      this.buf.push(value & 127 | 128);
      value = value >>> 7;
    }
    this.buf.push(value);
    return this;
  }
  /**
   * Write a `int32` value, a signed 32 bit varint.
   */
  int32(value) {
    assertInt32(value);
    varint32write(value, this.buf);
    return this;
  }
  /**
   * Write a `bool` value, a variant.
   */
  bool(value) {
    this.buf.push(value ? 1 : 0);
    return this;
  }
  /**
   * Write a `bytes` value, length-delimited arbitrary data.
   */
  bytes(value) {
    this.uint32(value.byteLength);
    return this.raw(value);
  }
  /**
   * Write a `string` value, length-delimited data converted to UTF-8 text.
   */
  string(value) {
    let chunk2 = this.textEncoder.encode(value);
    this.uint32(chunk2.byteLength);
    return this.raw(chunk2);
  }
  /**
   * Write a `float` value, 32-bit floating point number.
   */
  float(value) {
    assertFloat32(value);
    let chunk2 = new Uint8Array(4);
    new DataView(chunk2.buffer).setFloat32(0, value, true);
    return this.raw(chunk2);
  }
  /**
   * Write a `double` value, a 64-bit floating point number.
   */
  double(value) {
    let chunk2 = new Uint8Array(8);
    new DataView(chunk2.buffer).setFloat64(0, value, true);
    return this.raw(chunk2);
  }
  /**
   * Write a `fixed32` value, an unsigned, fixed-length 32-bit integer.
   */
  fixed32(value) {
    assertUInt32(value);
    let chunk2 = new Uint8Array(4);
    new DataView(chunk2.buffer).setUint32(0, value, true);
    return this.raw(chunk2);
  }
  /**
   * Write a `sfixed32` value, a signed, fixed-length 32-bit integer.
   */
  sfixed32(value) {
    assertInt32(value);
    let chunk2 = new Uint8Array(4);
    new DataView(chunk2.buffer).setInt32(0, value, true);
    return this.raw(chunk2);
  }
  /**
   * Write a `sint32` value, a signed, zigzag-encoded 32-bit varint.
   */
  sint32(value) {
    assertInt32(value);
    value = (value << 1 ^ value >> 31) >>> 0;
    varint32write(value, this.buf);
    return this;
  }
  /**
   * Write a `fixed64` value, a signed, fixed-length 64-bit integer.
   */
  sfixed64(value) {
    let chunk2 = new Uint8Array(8);
    let view = new DataView(chunk2.buffer);
    let long = PbLong.from(value);
    view.setInt32(0, long.lo, true);
    view.setInt32(4, long.hi, true);
    return this.raw(chunk2);
  }
  /**
   * Write a `fixed64` value, an unsigned, fixed-length 64 bit integer.
   */
  fixed64(value) {
    let chunk2 = new Uint8Array(8);
    let view = new DataView(chunk2.buffer);
    let long = PbULong.from(value);
    view.setInt32(0, long.lo, true);
    view.setInt32(4, long.hi, true);
    return this.raw(chunk2);
  }
  /**
   * Write a `int64` value, a signed 64-bit varint.
   */
  int64(value) {
    let long = PbLong.from(value);
    varint64write(long.lo, long.hi, this.buf);
    return this;
  }
  /**
   * Write a `sint64` value, a signed, zig-zag-encoded 64-bit varint.
   */
  sint64(value) {
    let long = PbLong.from(value), sign = long.hi >> 31, lo = long.lo << 1 ^ sign, hi = (long.hi << 1 | long.lo >>> 31) ^ sign;
    varint64write(lo, hi, this.buf);
    return this;
  }
  /**
   * Write a `uint64` value, an unsigned 64-bit varint.
   */
  uint64(value) {
    let long = PbULong.from(value);
    varint64write(long.lo, long.hi, this.buf);
    return this;
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/json-format-contract.js
var defaultsWrite2 = {
  emitDefaultValues: false,
  enumAsInteger: false,
  useProtoFieldName: false,
  prettySpaces: 0
};
var defaultsRead2 = {
  ignoreUnknownFields: false
};
function jsonReadOptions(options) {
  return options ? Object.assign(Object.assign({}, defaultsRead2), options) : defaultsRead2;
}
function jsonWriteOptions(options) {
  return options ? Object.assign(Object.assign({}, defaultsWrite2), options) : defaultsWrite2;
}
function mergeJsonOptions(a, b) {
  var _a, _b;
  let c2 = Object.assign(Object.assign({}, a), b);
  c2.typeRegistry = [...(_a = a === null || a === void 0 ? void 0 : a.typeRegistry) !== null && _a !== void 0 ? _a : [], ...(_b = b === null || b === void 0 ? void 0 : b.typeRegistry) !== null && _b !== void 0 ? _b : []];
  return c2;
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/message-type-contract.js
var MESSAGE_TYPE = Symbol.for("protobuf-ts/message-type");

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/lower-camel-case.js
function lowerCamelCase(snakeCase) {
  let capNext = false;
  const sb = [];
  for (let i = 0; i < snakeCase.length; i++) {
    let next = snakeCase.charAt(i);
    if (next == "_") {
      capNext = true;
    } else if (/\d/.test(next)) {
      sb.push(next);
      capNext = true;
    } else if (capNext) {
      sb.push(next.toUpperCase());
      capNext = false;
    } else if (i == 0) {
      sb.push(next.toLowerCase());
    } else {
      sb.push(next);
    }
  }
  return sb.join("");
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-info.js
var ScalarType;
(function(ScalarType2) {
  ScalarType2[ScalarType2["DOUBLE"] = 1] = "DOUBLE";
  ScalarType2[ScalarType2["FLOAT"] = 2] = "FLOAT";
  ScalarType2[ScalarType2["INT64"] = 3] = "INT64";
  ScalarType2[ScalarType2["UINT64"] = 4] = "UINT64";
  ScalarType2[ScalarType2["INT32"] = 5] = "INT32";
  ScalarType2[ScalarType2["FIXED64"] = 6] = "FIXED64";
  ScalarType2[ScalarType2["FIXED32"] = 7] = "FIXED32";
  ScalarType2[ScalarType2["BOOL"] = 8] = "BOOL";
  ScalarType2[ScalarType2["STRING"] = 9] = "STRING";
  ScalarType2[ScalarType2["BYTES"] = 12] = "BYTES";
  ScalarType2[ScalarType2["UINT32"] = 13] = "UINT32";
  ScalarType2[ScalarType2["SFIXED32"] = 15] = "SFIXED32";
  ScalarType2[ScalarType2["SFIXED64"] = 16] = "SFIXED64";
  ScalarType2[ScalarType2["SINT32"] = 17] = "SINT32";
  ScalarType2[ScalarType2["SINT64"] = 18] = "SINT64";
})(ScalarType || (ScalarType = {}));
var LongType;
(function(LongType2) {
  LongType2[LongType2["BIGINT"] = 0] = "BIGINT";
  LongType2[LongType2["STRING"] = 1] = "STRING";
  LongType2[LongType2["NUMBER"] = 2] = "NUMBER";
})(LongType || (LongType = {}));
var RepeatType;
(function(RepeatType2) {
  RepeatType2[RepeatType2["NO"] = 0] = "NO";
  RepeatType2[RepeatType2["PACKED"] = 1] = "PACKED";
  RepeatType2[RepeatType2["UNPACKED"] = 2] = "UNPACKED";
})(RepeatType || (RepeatType = {}));
function normalizeFieldInfo(field) {
  var _a, _b, _c, _d;
  field.localName = (_a = field.localName) !== null && _a !== void 0 ? _a : lowerCamelCase(field.name);
  field.jsonName = (_b = field.jsonName) !== null && _b !== void 0 ? _b : lowerCamelCase(field.name);
  field.repeat = (_c = field.repeat) !== null && _c !== void 0 ? _c : RepeatType.NO;
  field.opt = (_d = field.opt) !== null && _d !== void 0 ? _d : field.repeat ? false : field.oneof ? false : field.kind == "message";
  return field;
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/oneof.js
function isOneofGroup(any) {
  if (typeof any != "object" || any === null || !any.hasOwnProperty("oneofKind")) {
    return false;
  }
  switch (typeof any.oneofKind) {
    case "string":
      if (any[any.oneofKind] === void 0)
        return false;
      return Object.keys(any).length == 2;
    case "undefined":
      return Object.keys(any).length == 1;
    default:
      return false;
  }
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-type-check.js
var ReflectionTypeCheck = class {
  constructor(info) {
    var _a;
    this.fields = (_a = info.fields) !== null && _a !== void 0 ? _a : [];
  }
  prepare() {
    if (this.data)
      return;
    const req = [], known = [], oneofs = [];
    for (let field of this.fields) {
      if (field.oneof) {
        if (!oneofs.includes(field.oneof)) {
          oneofs.push(field.oneof);
          req.push(field.oneof);
          known.push(field.oneof);
        }
      } else {
        known.push(field.localName);
        switch (field.kind) {
          case "scalar":
          case "enum":
            if (!field.opt || field.repeat)
              req.push(field.localName);
            break;
          case "message":
            if (field.repeat)
              req.push(field.localName);
            break;
          case "map":
            req.push(field.localName);
            break;
        }
      }
    }
    this.data = { req, known, oneofs: Object.values(oneofs) };
  }
  /**
   * Is the argument a valid message as specified by the
   * reflection information?
   *
   * Checks all field types recursively. The `depth`
   * specifies how deep into the structure the check will be.
   *
   * With a depth of 0, only the presence of fields
   * is checked.
   *
   * With a depth of 1 or more, the field types are checked.
   *
   * With a depth of 2 or more, the members of map, repeated
   * and message fields are checked.
   *
   * Message fields will be checked recursively with depth - 1.
   *
   * The number of map entries / repeated values being checked
   * is < depth.
   */
  is(message, depth, allowExcessProperties = false) {
    if (depth < 0)
      return true;
    if (message === null || message === void 0 || typeof message != "object")
      return false;
    this.prepare();
    let keys = Object.keys(message), data = this.data;
    if (keys.length < data.req.length || data.req.some((n) => !keys.includes(n)))
      return false;
    if (!allowExcessProperties) {
      if (keys.some((k) => !data.known.includes(k)))
        return false;
    }
    if (depth < 1) {
      return true;
    }
    for (const name of data.oneofs) {
      const group = message[name];
      if (!isOneofGroup(group))
        return false;
      if (group.oneofKind === void 0)
        continue;
      const field = this.fields.find((f) => f.localName === group.oneofKind);
      if (!field)
        return false;
      if (!this.field(group[group.oneofKind], field, allowExcessProperties, depth))
        return false;
    }
    for (const field of this.fields) {
      if (field.oneof !== void 0)
        continue;
      if (!this.field(message[field.localName], field, allowExcessProperties, depth))
        return false;
    }
    return true;
  }
  field(arg, field, allowExcessProperties, depth) {
    let repeated = field.repeat;
    switch (field.kind) {
      case "scalar":
        if (arg === void 0)
          return field.opt;
        if (repeated)
          return this.scalars(arg, field.T, depth, field.L);
        return this.scalar(arg, field.T, field.L);
      case "enum":
        if (arg === void 0)
          return field.opt;
        if (repeated)
          return this.scalars(arg, ScalarType.INT32, depth);
        return this.scalar(arg, ScalarType.INT32);
      case "message":
        if (arg === void 0)
          return true;
        if (repeated)
          return this.messages(arg, field.T(), allowExcessProperties, depth);
        return this.message(arg, field.T(), allowExcessProperties, depth);
      case "map":
        if (typeof arg != "object" || arg === null)
          return false;
        if (depth < 2)
          return true;
        if (!this.mapKeys(arg, field.K, depth))
          return false;
        switch (field.V.kind) {
          case "scalar":
            return this.scalars(Object.values(arg), field.V.T, depth, field.V.L);
          case "enum":
            return this.scalars(Object.values(arg), ScalarType.INT32, depth);
          case "message":
            return this.messages(Object.values(arg), field.V.T(), allowExcessProperties, depth);
        }
        break;
    }
    return true;
  }
  message(arg, type, allowExcessProperties, depth) {
    if (allowExcessProperties) {
      return type.isAssignable(arg, depth);
    }
    return type.is(arg, depth);
  }
  messages(arg, type, allowExcessProperties, depth) {
    if (!Array.isArray(arg))
      return false;
    if (depth < 2)
      return true;
    if (allowExcessProperties) {
      for (let i = 0; i < arg.length && i < depth; i++)
        if (!type.isAssignable(arg[i], depth - 1))
          return false;
    } else {
      for (let i = 0; i < arg.length && i < depth; i++)
        if (!type.is(arg[i], depth - 1))
          return false;
    }
    return true;
  }
  scalar(arg, type, longType) {
    let argType = typeof arg;
    switch (type) {
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        switch (longType) {
          case LongType.BIGINT:
            return argType == "bigint";
          case LongType.NUMBER:
            return argType == "number" && !isNaN(arg);
          default:
            return argType == "string";
        }
      case ScalarType.BOOL:
        return argType == "boolean";
      case ScalarType.STRING:
        return argType == "string";
      case ScalarType.BYTES:
        return arg instanceof Uint8Array;
      case ScalarType.DOUBLE:
      case ScalarType.FLOAT:
        return argType == "number" && !isNaN(arg);
      default:
        return argType == "number" && Number.isInteger(arg);
    }
  }
  scalars(arg, type, depth, longType) {
    if (!Array.isArray(arg))
      return false;
    if (depth < 2)
      return true;
    if (Array.isArray(arg)) {
      for (let i = 0; i < arg.length && i < depth; i++)
        if (!this.scalar(arg[i], type, longType))
          return false;
    }
    return true;
  }
  mapKeys(map2, type, depth) {
    let keys = Object.keys(map2);
    switch (type) {
      case ScalarType.INT32:
      case ScalarType.FIXED32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
      case ScalarType.UINT32:
        return this.scalars(keys.slice(0, depth).map((k) => parseInt(k)), type, depth);
      case ScalarType.BOOL:
        return this.scalars(keys.slice(0, depth).map((k) => k == "true" ? true : k == "false" ? false : k), type, depth);
      default:
        return this.scalars(keys, type, depth, LongType.STRING);
    }
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-long-convert.js
function reflectionLongConvert(long, type) {
  switch (type) {
    case LongType.BIGINT:
      return long.toBigInt();
    case LongType.NUMBER:
      return long.toNumber();
    default:
      return long.toString();
  }
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-json-reader.js
var ReflectionJsonReader = class {
  constructor(info) {
    this.info = info;
  }
  prepare() {
    var _a;
    if (this.fMap === void 0) {
      this.fMap = {};
      const fieldsInput = (_a = this.info.fields) !== null && _a !== void 0 ? _a : [];
      for (const field of fieldsInput) {
        this.fMap[field.name] = field;
        this.fMap[field.jsonName] = field;
        this.fMap[field.localName] = field;
      }
    }
  }
  // Cannot parse JSON <type of jsonValue> for <type name>#<fieldName>.
  assert(condition, fieldName, jsonValue) {
    if (!condition) {
      let what = typeofJsonValue(jsonValue);
      if (what == "number" || what == "boolean")
        what = jsonValue.toString();
      throw new Error(`Cannot parse JSON ${what} for ${this.info.typeName}#${fieldName}`);
    }
  }
  /**
   * Reads a message from canonical JSON format into the target message.
   *
   * Repeated fields are appended. Map entries are added, overwriting
   * existing keys.
   *
   * If a message field is already present, it will be merged with the
   * new data.
   */
  read(input, message, options) {
    this.prepare();
    const oneofsHandled = [];
    for (const [jsonKey, jsonValue] of Object.entries(input)) {
      const field = this.fMap[jsonKey];
      if (!field) {
        if (!options.ignoreUnknownFields)
          throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${jsonKey}`);
        continue;
      }
      const localName = field.localName;
      let target;
      if (field.oneof) {
        if (jsonValue === null && (field.kind !== "enum" || field.T()[0] !== "google.protobuf.NullValue")) {
          continue;
        }
        if (oneofsHandled.includes(field.oneof))
          throw new Error(`Multiple members of the oneof group "${field.oneof}" of ${this.info.typeName} are present in JSON.`);
        oneofsHandled.push(field.oneof);
        target = message[field.oneof] = {
          oneofKind: localName
        };
      } else {
        target = message;
      }
      if (field.kind == "map") {
        if (jsonValue === null) {
          continue;
        }
        this.assert(isJsonObject(jsonValue), field.name, jsonValue);
        const fieldObj = target[localName];
        for (const [jsonObjKey, jsonObjValue] of Object.entries(jsonValue)) {
          this.assert(jsonObjValue !== null, field.name + " map value", null);
          let val;
          switch (field.V.kind) {
            case "message":
              val = field.V.T().internalJsonRead(jsonObjValue, options);
              break;
            case "enum":
              val = this.enum(field.V.T(), jsonObjValue, field.name, options.ignoreUnknownFields);
              if (val === false)
                continue;
              break;
            case "scalar":
              val = this.scalar(jsonObjValue, field.V.T, field.V.L, field.name);
              break;
          }
          this.assert(val !== void 0, field.name + " map value", jsonObjValue);
          let key = jsonObjKey;
          if (field.K == ScalarType.BOOL)
            key = key == "true" ? true : key == "false" ? false : key;
          key = this.scalar(key, field.K, LongType.STRING, field.name).toString();
          fieldObj[key] = val;
        }
      } else if (field.repeat) {
        if (jsonValue === null)
          continue;
        this.assert(Array.isArray(jsonValue), field.name, jsonValue);
        const fieldArr = target[localName];
        for (const jsonItem of jsonValue) {
          this.assert(jsonItem !== null, field.name, null);
          let val;
          switch (field.kind) {
            case "message":
              val = field.T().internalJsonRead(jsonItem, options);
              break;
            case "enum":
              val = this.enum(field.T(), jsonItem, field.name, options.ignoreUnknownFields);
              if (val === false)
                continue;
              break;
            case "scalar":
              val = this.scalar(jsonItem, field.T, field.L, field.name);
              break;
          }
          this.assert(val !== void 0, field.name, jsonValue);
          fieldArr.push(val);
        }
      } else {
        switch (field.kind) {
          case "message":
            if (jsonValue === null && field.T().typeName != "google.protobuf.Value") {
              this.assert(field.oneof === void 0, field.name + " (oneof member)", null);
              continue;
            }
            target[localName] = field.T().internalJsonRead(jsonValue, options, target[localName]);
            break;
          case "enum":
            if (jsonValue === null)
              continue;
            let val = this.enum(field.T(), jsonValue, field.name, options.ignoreUnknownFields);
            if (val === false)
              continue;
            target[localName] = val;
            break;
          case "scalar":
            if (jsonValue === null)
              continue;
            target[localName] = this.scalar(jsonValue, field.T, field.L, field.name);
            break;
        }
      }
    }
  }
  /**
   * Returns `false` for unrecognized string representations.
   *
   * google.protobuf.NullValue accepts only JSON `null` (or the old `"NULL_VALUE"`).
   */
  enum(type, json, fieldName, ignoreUnknownFields) {
    if (type[0] == "google.protobuf.NullValue")
      assert(json === null || json === "NULL_VALUE", `Unable to parse field ${this.info.typeName}#${fieldName}, enum ${type[0]} only accepts null.`);
    if (json === null)
      return 0;
    switch (typeof json) {
      case "number":
        assert(Number.isInteger(json), `Unable to parse field ${this.info.typeName}#${fieldName}, enum can only be integral number, got ${json}.`);
        return json;
      case "string":
        let localEnumName = json;
        if (type[2] && json.substring(0, type[2].length) === type[2])
          localEnumName = json.substring(type[2].length);
        let enumNumber = type[1][localEnumName];
        if (typeof enumNumber === "undefined" && ignoreUnknownFields) {
          return false;
        }
        assert(typeof enumNumber == "number", `Unable to parse field ${this.info.typeName}#${fieldName}, enum ${type[0]} has no value for "${json}".`);
        return enumNumber;
    }
    assert(false, `Unable to parse field ${this.info.typeName}#${fieldName}, cannot parse enum value from ${typeof json}".`);
  }
  scalar(json, type, longType, fieldName) {
    let e;
    try {
      switch (type) {
        case ScalarType.DOUBLE:
        case ScalarType.FLOAT:
          if (json === null)
            return 0;
          if (json === "NaN")
            return Number.NaN;
          if (json === "Infinity")
            return Number.POSITIVE_INFINITY;
          if (json === "-Infinity")
            return Number.NEGATIVE_INFINITY;
          if (json === "") {
            e = "empty string";
            break;
          }
          if (typeof json == "string" && json.trim().length !== json.length) {
            e = "extra whitespace";
            break;
          }
          if (typeof json != "string" && typeof json != "number") {
            break;
          }
          let float = Number(json);
          if (Number.isNaN(float)) {
            e = "not a number";
            break;
          }
          if (!Number.isFinite(float)) {
            e = "too large or small";
            break;
          }
          if (type == ScalarType.FLOAT)
            assertFloat32(float);
          return float;
        case ScalarType.INT32:
        case ScalarType.FIXED32:
        case ScalarType.SFIXED32:
        case ScalarType.SINT32:
        case ScalarType.UINT32:
          if (json === null)
            return 0;
          let int32;
          if (typeof json == "number")
            int32 = json;
          else if (json === "")
            e = "empty string";
          else if (typeof json == "string") {
            if (json.trim().length !== json.length)
              e = "extra whitespace";
            else
              int32 = Number(json);
          }
          if (int32 === void 0)
            break;
          if (type == ScalarType.UINT32)
            assertUInt32(int32);
          else
            assertInt32(int32);
          return int32;
        case ScalarType.INT64:
        case ScalarType.SFIXED64:
        case ScalarType.SINT64:
          if (json === null)
            return reflectionLongConvert(PbLong.ZERO, longType);
          if (typeof json != "number" && typeof json != "string")
            break;
          return reflectionLongConvert(PbLong.from(json), longType);
        case ScalarType.FIXED64:
        case ScalarType.UINT64:
          if (json === null)
            return reflectionLongConvert(PbULong.ZERO, longType);
          if (typeof json != "number" && typeof json != "string")
            break;
          return reflectionLongConvert(PbULong.from(json), longType);
        case ScalarType.BOOL:
          if (json === null)
            return false;
          if (typeof json !== "boolean")
            break;
          return json;
        case ScalarType.STRING:
          if (json === null)
            return "";
          if (typeof json !== "string") {
            e = "extra whitespace";
            break;
          }
          try {
            encodeURIComponent(json);
          } catch (e2) {
            e2 = "invalid UTF8";
            break;
          }
          return json;
        case ScalarType.BYTES:
          if (json === null || json === "")
            return new Uint8Array(0);
          if (typeof json !== "string")
            break;
          return base64decode(json);
      }
    } catch (error) {
      e = error.message;
    }
    this.assert(false, fieldName + (e ? " - " + e : ""), json);
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-json-writer.js
var ReflectionJsonWriter = class {
  constructor(info) {
    var _a;
    this.fields = (_a = info.fields) !== null && _a !== void 0 ? _a : [];
  }
  /**
   * Converts the message to a JSON object, based on the field descriptors.
   */
  write(message, options) {
    const json = {}, source = message;
    for (const field of this.fields) {
      if (!field.oneof) {
        let jsonValue2 = this.field(field, source[field.localName], options);
        if (jsonValue2 !== void 0)
          json[options.useProtoFieldName ? field.name : field.jsonName] = jsonValue2;
        continue;
      }
      const group = source[field.oneof];
      if (group.oneofKind !== field.localName)
        continue;
      const opt = field.kind == "scalar" || field.kind == "enum" ? Object.assign(Object.assign({}, options), { emitDefaultValues: true }) : options;
      let jsonValue = this.field(field, group[field.localName], opt);
      assert(jsonValue !== void 0);
      json[options.useProtoFieldName ? field.name : field.jsonName] = jsonValue;
    }
    return json;
  }
  field(field, value, options) {
    let jsonValue = void 0;
    if (field.kind == "map") {
      assert(typeof value == "object" && value !== null);
      const jsonObj = {};
      switch (field.V.kind) {
        case "scalar":
          for (const [entryKey, entryValue] of Object.entries(value)) {
            const val = this.scalar(field.V.T, entryValue, field.name, false, true);
            assert(val !== void 0);
            jsonObj[entryKey.toString()] = val;
          }
          break;
        case "message":
          const messageType = field.V.T();
          for (const [entryKey, entryValue] of Object.entries(value)) {
            const val = this.message(messageType, entryValue, field.name, options);
            assert(val !== void 0);
            jsonObj[entryKey.toString()] = val;
          }
          break;
        case "enum":
          const enumInfo = field.V.T();
          for (const [entryKey, entryValue] of Object.entries(value)) {
            assert(entryValue === void 0 || typeof entryValue == "number");
            const val = this.enum(enumInfo, entryValue, field.name, false, true, options.enumAsInteger);
            assert(val !== void 0);
            jsonObj[entryKey.toString()] = val;
          }
          break;
      }
      if (options.emitDefaultValues || Object.keys(jsonObj).length > 0)
        jsonValue = jsonObj;
    } else if (field.repeat) {
      assert(Array.isArray(value));
      const jsonArr = [];
      switch (field.kind) {
        case "scalar":
          for (let i = 0; i < value.length; i++) {
            const val = this.scalar(field.T, value[i], field.name, field.opt, true);
            assert(val !== void 0);
            jsonArr.push(val);
          }
          break;
        case "enum":
          const enumInfo = field.T();
          for (let i = 0; i < value.length; i++) {
            assert(value[i] === void 0 || typeof value[i] == "number");
            const val = this.enum(enumInfo, value[i], field.name, field.opt, true, options.enumAsInteger);
            assert(val !== void 0);
            jsonArr.push(val);
          }
          break;
        case "message":
          const messageType = field.T();
          for (let i = 0; i < value.length; i++) {
            const val = this.message(messageType, value[i], field.name, options);
            assert(val !== void 0);
            jsonArr.push(val);
          }
          break;
      }
      if (options.emitDefaultValues || jsonArr.length > 0 || options.emitDefaultValues)
        jsonValue = jsonArr;
    } else {
      switch (field.kind) {
        case "scalar":
          jsonValue = this.scalar(field.T, value, field.name, field.opt, options.emitDefaultValues);
          break;
        case "enum":
          jsonValue = this.enum(field.T(), value, field.name, field.opt, options.emitDefaultValues, options.enumAsInteger);
          break;
        case "message":
          jsonValue = this.message(field.T(), value, field.name, options);
          break;
      }
    }
    return jsonValue;
  }
  /**
   * Returns `null` as the default for google.protobuf.NullValue.
   */
  enum(type, value, fieldName, optional2, emitDefaultValues, enumAsInteger) {
    if (type[0] == "google.protobuf.NullValue")
      return !emitDefaultValues && !optional2 ? void 0 : null;
    if (value === void 0) {
      assert(optional2);
      return void 0;
    }
    if (value === 0 && !emitDefaultValues && !optional2)
      return void 0;
    assert(typeof value == "number");
    assert(Number.isInteger(value));
    if (enumAsInteger || !type[1].hasOwnProperty(value))
      return value;
    if (type[2])
      return type[2] + type[1][value];
    return type[1][value];
  }
  message(type, value, fieldName, options) {
    if (value === void 0)
      return options.emitDefaultValues ? null : void 0;
    return type.internalJsonWrite(value, options);
  }
  scalar(type, value, fieldName, optional2, emitDefaultValues) {
    if (value === void 0) {
      assert(optional2);
      return void 0;
    }
    const ed = emitDefaultValues || optional2;
    switch (type) {
      case ScalarType.INT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
        if (value === 0)
          return ed ? 0 : void 0;
        assertInt32(value);
        return value;
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
        if (value === 0)
          return ed ? 0 : void 0;
        assertUInt32(value);
        return value;
      case ScalarType.FLOAT:
        assertFloat32(value);
      case ScalarType.DOUBLE:
        if (value === 0)
          return ed ? 0 : void 0;
        assert(typeof value == "number");
        if (Number.isNaN(value))
          return "NaN";
        if (value === Number.POSITIVE_INFINITY)
          return "Infinity";
        if (value === Number.NEGATIVE_INFINITY)
          return "-Infinity";
        return value;
      case ScalarType.STRING:
        if (value === "")
          return ed ? "" : void 0;
        assert(typeof value == "string");
        return value;
      case ScalarType.BOOL:
        if (value === false)
          return ed ? false : void 0;
        assert(typeof value == "boolean");
        return value;
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
        assert(typeof value == "number" || typeof value == "string" || typeof value == "bigint");
        let ulong = PbULong.from(value);
        if (ulong.isZero() && !ed)
          return void 0;
        return ulong.toString();
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        assert(typeof value == "number" || typeof value == "string" || typeof value == "bigint");
        let long = PbLong.from(value);
        if (long.isZero() && !ed)
          return void 0;
        return long.toString();
      case ScalarType.BYTES:
        assert(value instanceof Uint8Array);
        if (!value.byteLength)
          return ed ? "" : void 0;
        return base64encode(value);
    }
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-scalar-default.js
function reflectionScalarDefault(type, longType = LongType.STRING) {
  switch (type) {
    case ScalarType.BOOL:
      return false;
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return reflectionLongConvert(PbULong.ZERO, longType);
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      return reflectionLongConvert(PbLong.ZERO, longType);
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return 0;
    case ScalarType.BYTES:
      return new Uint8Array(0);
    case ScalarType.STRING:
      return "";
    default:
      return 0;
  }
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-binary-reader.js
var ReflectionBinaryReader = class {
  constructor(info) {
    this.info = info;
  }
  prepare() {
    var _a;
    if (!this.fieldNoToField) {
      const fieldsInput = (_a = this.info.fields) !== null && _a !== void 0 ? _a : [];
      this.fieldNoToField = new Map(fieldsInput.map((field) => [field.no, field]));
    }
  }
  /**
   * Reads a message from binary format into the target message.
   *
   * Repeated fields are appended. Map entries are added, overwriting
   * existing keys.
   *
   * If a message field is already present, it will be merged with the
   * new data.
   */
  read(reader, message, options, length) {
    this.prepare();
    const end = length === void 0 ? reader.len : reader.pos + length;
    while (reader.pos < end) {
      const [fieldNo, wireType] = reader.tag(), field = this.fieldNoToField.get(fieldNo);
      if (!field) {
        let u = options.readUnknownField;
        if (u == "throw")
          throw new Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.info.typeName}`);
        let d = reader.skip(wireType);
        if (u !== false)
          (u === true ? UnknownFieldHandler.onRead : u)(this.info.typeName, message, fieldNo, wireType, d);
        continue;
      }
      let target = message, repeated = field.repeat, localName = field.localName;
      if (field.oneof) {
        target = target[field.oneof];
        if (target.oneofKind !== localName)
          target = message[field.oneof] = {
            oneofKind: localName
          };
      }
      switch (field.kind) {
        case "scalar":
        case "enum":
          let T = field.kind == "enum" ? ScalarType.INT32 : field.T;
          let L = field.kind == "scalar" ? field.L : void 0;
          if (repeated) {
            let arr = target[localName];
            if (wireType == WireType.LengthDelimited && T != ScalarType.STRING && T != ScalarType.BYTES) {
              let e = reader.uint32() + reader.pos;
              while (reader.pos < e)
                arr.push(this.scalar(reader, T, L));
            } else
              arr.push(this.scalar(reader, T, L));
          } else
            target[localName] = this.scalar(reader, T, L);
          break;
        case "message":
          if (repeated) {
            let arr = target[localName];
            let msg = field.T().internalBinaryRead(reader, reader.uint32(), options);
            arr.push(msg);
          } else
            target[localName] = field.T().internalBinaryRead(reader, reader.uint32(), options, target[localName]);
          break;
        case "map":
          let [mapKey, mapVal] = this.mapEntry(field, reader, options);
          target[localName][mapKey] = mapVal;
          break;
      }
    }
  }
  /**
   * Read a map field, expecting key field = 1, value field = 2
   */
  mapEntry(field, reader, options) {
    let length = reader.uint32();
    let end = reader.pos + length;
    let key = void 0;
    let val = void 0;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1:
          if (field.K == ScalarType.BOOL)
            key = reader.bool().toString();
          else
            key = this.scalar(reader, field.K, LongType.STRING);
          break;
        case 2:
          switch (field.V.kind) {
            case "scalar":
              val = this.scalar(reader, field.V.T, field.V.L);
              break;
            case "enum":
              val = reader.int32();
              break;
            case "message":
              val = field.V.T().internalBinaryRead(reader, reader.uint32(), options);
              break;
          }
          break;
        default:
          throw new Error(`Unknown field ${fieldNo} (wire type ${wireType}) in map entry for ${this.info.typeName}#${field.name}`);
      }
    }
    if (key === void 0) {
      let keyRaw = reflectionScalarDefault(field.K);
      key = field.K == ScalarType.BOOL ? keyRaw.toString() : keyRaw;
    }
    if (val === void 0)
      switch (field.V.kind) {
        case "scalar":
          val = reflectionScalarDefault(field.V.T, field.V.L);
          break;
        case "enum":
          val = 0;
          break;
        case "message":
          val = field.V.T().create();
          break;
      }
    return [key, val];
  }
  scalar(reader, type, longType) {
    switch (type) {
      case ScalarType.INT32:
        return reader.int32();
      case ScalarType.STRING:
        return reader.string();
      case ScalarType.BOOL:
        return reader.bool();
      case ScalarType.DOUBLE:
        return reader.double();
      case ScalarType.FLOAT:
        return reader.float();
      case ScalarType.INT64:
        return reflectionLongConvert(reader.int64(), longType);
      case ScalarType.UINT64:
        return reflectionLongConvert(reader.uint64(), longType);
      case ScalarType.FIXED64:
        return reflectionLongConvert(reader.fixed64(), longType);
      case ScalarType.FIXED32:
        return reader.fixed32();
      case ScalarType.BYTES:
        return reader.bytes();
      case ScalarType.UINT32:
        return reader.uint32();
      case ScalarType.SFIXED32:
        return reader.sfixed32();
      case ScalarType.SFIXED64:
        return reflectionLongConvert(reader.sfixed64(), longType);
      case ScalarType.SINT32:
        return reader.sint32();
      case ScalarType.SINT64:
        return reflectionLongConvert(reader.sint64(), longType);
    }
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-binary-writer.js
var ReflectionBinaryWriter = class {
  constructor(info) {
    this.info = info;
  }
  prepare() {
    if (!this.fields) {
      const fieldsInput = this.info.fields ? this.info.fields.concat() : [];
      this.fields = fieldsInput.sort((a, b) => a.no - b.no);
    }
  }
  /**
   * Writes the message to binary format.
   */
  write(message, writer, options) {
    this.prepare();
    for (const field of this.fields) {
      let value, emitDefault, repeated = field.repeat, localName = field.localName;
      if (field.oneof) {
        const group = message[field.oneof];
        if (group.oneofKind !== localName)
          continue;
        value = group[localName];
        emitDefault = true;
      } else {
        value = message[localName];
        emitDefault = false;
      }
      switch (field.kind) {
        case "scalar":
        case "enum":
          let T = field.kind == "enum" ? ScalarType.INT32 : field.T;
          if (repeated) {
            assert(Array.isArray(value));
            if (repeated == RepeatType.PACKED)
              this.packed(writer, T, field.no, value);
            else
              for (const item of value)
                this.scalar(writer, T, field.no, item, true);
          } else if (value === void 0)
            assert(field.opt);
          else
            this.scalar(writer, T, field.no, value, emitDefault || field.opt);
          break;
        case "message":
          if (repeated) {
            assert(Array.isArray(value));
            for (const item of value)
              this.message(writer, options, field.T(), field.no, item);
          } else {
            this.message(writer, options, field.T(), field.no, value);
          }
          break;
        case "map":
          assert(typeof value == "object" && value !== null);
          for (const [key, val] of Object.entries(value))
            this.mapEntry(writer, options, field, key, val);
          break;
      }
    }
    let u = options.writeUnknownFields;
    if (u !== false)
      (u === true ? UnknownFieldHandler.onWrite : u)(this.info.typeName, message, writer);
  }
  mapEntry(writer, options, field, key, value) {
    writer.tag(field.no, WireType.LengthDelimited);
    writer.fork();
    let keyValue = key;
    switch (field.K) {
      case ScalarType.INT32:
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
        keyValue = Number.parseInt(key);
        break;
      case ScalarType.BOOL:
        assert(key == "true" || key == "false");
        keyValue = key == "true";
        break;
    }
    this.scalar(writer, field.K, 1, keyValue, true);
    switch (field.V.kind) {
      case "scalar":
        this.scalar(writer, field.V.T, 2, value, true);
        break;
      case "enum":
        this.scalar(writer, ScalarType.INT32, 2, value, true);
        break;
      case "message":
        this.message(writer, options, field.V.T(), 2, value);
        break;
    }
    writer.join();
  }
  message(writer, options, handler, fieldNo, value) {
    if (value === void 0)
      return;
    handler.internalBinaryWrite(value, writer.tag(fieldNo, WireType.LengthDelimited).fork(), options);
    writer.join();
  }
  /**
   * Write a single scalar value.
   */
  scalar(writer, type, fieldNo, value, emitDefault) {
    let [wireType, method, isDefault] = this.scalarInfo(type, value);
    if (!isDefault || emitDefault) {
      writer.tag(fieldNo, wireType);
      writer[method](value);
    }
  }
  /**
   * Write an array of scalar values in packed format.
   */
  packed(writer, type, fieldNo, value) {
    if (!value.length)
      return;
    assert(type !== ScalarType.BYTES && type !== ScalarType.STRING);
    writer.tag(fieldNo, WireType.LengthDelimited);
    writer.fork();
    let [, method] = this.scalarInfo(type);
    for (let i = 0; i < value.length; i++)
      writer[method](value[i]);
    writer.join();
  }
  /**
   * Get information for writing a scalar value.
   *
   * Returns tuple:
   * [0]: appropriate WireType
   * [1]: name of the appropriate method of IBinaryWriter
   * [2]: whether the given value is a default value
   *
   * If argument `value` is omitted, [2] is always false.
   */
  scalarInfo(type, value) {
    let t = WireType.Varint;
    let m;
    let i = value === void 0;
    let d = value === 0;
    switch (type) {
      case ScalarType.INT32:
        m = "int32";
        break;
      case ScalarType.STRING:
        d = i || !value.length;
        t = WireType.LengthDelimited;
        m = "string";
        break;
      case ScalarType.BOOL:
        d = value === false;
        m = "bool";
        break;
      case ScalarType.UINT32:
        m = "uint32";
        break;
      case ScalarType.DOUBLE:
        t = WireType.Bit64;
        m = "double";
        break;
      case ScalarType.FLOAT:
        t = WireType.Bit32;
        m = "float";
        break;
      case ScalarType.INT64:
        d = i || PbLong.from(value).isZero();
        m = "int64";
        break;
      case ScalarType.UINT64:
        d = i || PbULong.from(value).isZero();
        m = "uint64";
        break;
      case ScalarType.FIXED64:
        d = i || PbULong.from(value).isZero();
        t = WireType.Bit64;
        m = "fixed64";
        break;
      case ScalarType.BYTES:
        d = i || !value.byteLength;
        t = WireType.LengthDelimited;
        m = "bytes";
        break;
      case ScalarType.FIXED32:
        t = WireType.Bit32;
        m = "fixed32";
        break;
      case ScalarType.SFIXED32:
        t = WireType.Bit32;
        m = "sfixed32";
        break;
      case ScalarType.SFIXED64:
        d = i || PbLong.from(value).isZero();
        t = WireType.Bit64;
        m = "sfixed64";
        break;
      case ScalarType.SINT32:
        m = "sint32";
        break;
      case ScalarType.SINT64:
        d = i || PbLong.from(value).isZero();
        m = "sint64";
        break;
    }
    return [t, m, i || d];
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-create.js
function reflectionCreate(type) {
  const msg = type.messagePrototype ? Object.create(type.messagePrototype) : Object.defineProperty({}, MESSAGE_TYPE, { value: type });
  for (let field of type.fields) {
    let name = field.localName;
    if (field.opt)
      continue;
    if (field.oneof)
      msg[field.oneof] = { oneofKind: void 0 };
    else if (field.repeat)
      msg[name] = [];
    else
      switch (field.kind) {
        case "scalar":
          msg[name] = reflectionScalarDefault(field.T, field.L);
          break;
        case "enum":
          msg[name] = 0;
          break;
        case "map":
          msg[name] = {};
          break;
      }
  }
  return msg;
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-merge-partial.js
function reflectionMergePartial(info, target, source) {
  let fieldValue, input = source, output;
  for (let field of info.fields) {
    let name = field.localName;
    if (field.oneof) {
      const group = input[field.oneof];
      if ((group === null || group === void 0 ? void 0 : group.oneofKind) == void 0) {
        continue;
      }
      fieldValue = group[name];
      output = target[field.oneof];
      output.oneofKind = group.oneofKind;
      if (fieldValue == void 0) {
        delete output[name];
        continue;
      }
    } else {
      fieldValue = input[name];
      output = target;
      if (fieldValue == void 0) {
        continue;
      }
    }
    if (field.repeat)
      output[name].length = fieldValue.length;
    switch (field.kind) {
      case "scalar":
      case "enum":
        if (field.repeat)
          for (let i = 0; i < fieldValue.length; i++)
            output[name][i] = fieldValue[i];
        else
          output[name] = fieldValue;
        break;
      case "message":
        let T = field.T();
        if (field.repeat)
          for (let i = 0; i < fieldValue.length; i++)
            output[name][i] = T.create(fieldValue[i]);
        else if (output[name] === void 0)
          output[name] = T.create(fieldValue);
        else
          T.mergePartial(output[name], fieldValue);
        break;
      case "map":
        switch (field.V.kind) {
          case "scalar":
          case "enum":
            Object.assign(output[name], fieldValue);
            break;
          case "message":
            let T2 = field.V.T();
            for (let k of Object.keys(fieldValue))
              output[name][k] = T2.create(fieldValue[k]);
            break;
        }
        break;
    }
  }
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/reflection-equals.js
function reflectionEquals(info, a, b) {
  if (a === b)
    return true;
  if (!a || !b)
    return false;
  for (let field of info.fields) {
    let localName = field.localName;
    let val_a = field.oneof ? a[field.oneof][localName] : a[localName];
    let val_b = field.oneof ? b[field.oneof][localName] : b[localName];
    switch (field.kind) {
      case "enum":
      case "scalar":
        let t = field.kind == "enum" ? ScalarType.INT32 : field.T;
        if (!(field.repeat ? repeatedPrimitiveEq(t, val_a, val_b) : primitiveEq(t, val_a, val_b)))
          return false;
        break;
      case "map":
        if (!(field.V.kind == "message" ? repeatedMsgEq(field.V.T(), objectValues(val_a), objectValues(val_b)) : repeatedPrimitiveEq(field.V.kind == "enum" ? ScalarType.INT32 : field.V.T, objectValues(val_a), objectValues(val_b))))
          return false;
        break;
      case "message":
        let T = field.T();
        if (!(field.repeat ? repeatedMsgEq(T, val_a, val_b) : T.equals(val_a, val_b)))
          return false;
        break;
    }
  }
  return true;
}
var objectValues = Object.values;
function primitiveEq(type, a, b) {
  if (a === b)
    return true;
  if (type !== ScalarType.BYTES)
    return false;
  let ba = a;
  let bb = b;
  if (ba.length !== bb.length)
    return false;
  for (let i = 0; i < ba.length; i++)
    if (ba[i] != bb[i])
      return false;
  return true;
}
function repeatedPrimitiveEq(type, a, b) {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++)
    if (!primitiveEq(type, a[i], b[i]))
      return false;
  return true;
}
function repeatedMsgEq(type, a, b) {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++)
    if (!type.equals(a[i], b[i]))
      return false;
  return true;
}

// node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/es2015/message-type.js
var baseDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf({}));
var messageTypeDescriptor = baseDescriptors[MESSAGE_TYPE] = {};
var MessageType = class {
  constructor(name, fields, options) {
    this.defaultCheckDepth = 16;
    this.typeName = name;
    this.fields = fields.map(normalizeFieldInfo);
    this.options = options !== null && options !== void 0 ? options : {};
    messageTypeDescriptor.value = this;
    this.messagePrototype = Object.create(null, baseDescriptors);
    this.refTypeCheck = new ReflectionTypeCheck(this);
    this.refJsonReader = new ReflectionJsonReader(this);
    this.refJsonWriter = new ReflectionJsonWriter(this);
    this.refBinReader = new ReflectionBinaryReader(this);
    this.refBinWriter = new ReflectionBinaryWriter(this);
  }
  create(value) {
    let message = reflectionCreate(this);
    if (value !== void 0) {
      reflectionMergePartial(this, message, value);
    }
    return message;
  }
  /**
   * Clone the message.
   *
   * Unknown fields are discarded.
   */
  clone(message) {
    let copy2 = this.create();
    reflectionMergePartial(this, copy2, message);
    return copy2;
  }
  /**
   * Determines whether two message of the same type have the same field values.
   * Checks for deep equality, traversing repeated fields, oneof groups, maps
   * and messages recursively.
   * Will also return true if both messages are `undefined`.
   */
  equals(a, b) {
    return reflectionEquals(this, a, b);
  }
  /**
   * Is the given value assignable to our message type
   * and contains no [excess properties](https://www.typescriptlang.org/docs/handbook/interfaces.html#excess-property-checks)?
   */
  is(arg, depth = this.defaultCheckDepth) {
    return this.refTypeCheck.is(arg, depth, false);
  }
  /**
   * Is the given value assignable to our message type,
   * regardless of [excess properties](https://www.typescriptlang.org/docs/handbook/interfaces.html#excess-property-checks)?
   */
  isAssignable(arg, depth = this.defaultCheckDepth) {
    return this.refTypeCheck.is(arg, depth, true);
  }
  /**
   * Copy partial data into the target message.
   */
  mergePartial(target, source) {
    reflectionMergePartial(this, target, source);
  }
  /**
   * Create a new message from binary format.
   */
  fromBinary(data, options) {
    let opt = binaryReadOptions(options);
    return this.internalBinaryRead(opt.readerFactory(data), data.byteLength, opt);
  }
  /**
   * Read a new message from a JSON value.
   */
  fromJson(json, options) {
    return this.internalJsonRead(json, jsonReadOptions(options));
  }
  /**
   * Read a new message from a JSON string.
   * This is equivalent to `T.fromJson(JSON.parse(json))`.
   */
  fromJsonString(json, options) {
    let value = JSON.parse(json);
    return this.fromJson(value, options);
  }
  /**
   * Write the message to canonical JSON value.
   */
  toJson(message, options) {
    return this.internalJsonWrite(message, jsonWriteOptions(options));
  }
  /**
   * Convert the message to canonical JSON string.
   * This is equivalent to `JSON.stringify(T.toJson(t))`
   */
  toJsonString(message, options) {
    var _a;
    let value = this.toJson(message, options);
    return JSON.stringify(value, null, (_a = options === null || options === void 0 ? void 0 : options.prettySpaces) !== null && _a !== void 0 ? _a : 0);
  }
  /**
   * Write the message to binary format.
   */
  toBinary(message, options) {
    let opt = binaryWriteOptions(options);
    return this.internalBinaryWrite(message, opt.writerFactory(), opt).finish();
  }
  /**
   * This is an internal method. If you just want to read a message from
   * JSON, use `fromJson()` or `fromJsonString()`.
   *
   * Reads JSON value and merges the fields into the target
   * according to protobuf rules. If the target is omitted,
   * a new instance is created first.
   */
  internalJsonRead(json, options, target) {
    if (json !== null && typeof json == "object" && !Array.isArray(json)) {
      let message = target !== null && target !== void 0 ? target : this.create();
      this.refJsonReader.read(json, message, options);
      return message;
    }
    throw new Error(`Unable to parse message ${this.typeName} from JSON ${typeofJsonValue(json)}.`);
  }
  /**
   * This is an internal method. If you just want to write a message
   * to JSON, use `toJson()` or `toJsonString().
   *
   * Writes JSON value and returns it.
   */
  internalJsonWrite(message, options) {
    return this.refJsonWriter.write(message, options);
  }
  /**
   * This is an internal method. If you just want to write a message
   * in binary format, use `toBinary()`.
   *
   * Serializes the message in binary format and appends it to the given
   * writer. Returns passed writer.
   */
  internalBinaryWrite(message, writer, options) {
    this.refBinWriter.write(message, writer, options);
    return writer;
  }
  /**
   * This is an internal method. If you just want to read a message from
   * binary data, use `fromBinary()`.
   *
   * Reads data from binary format and merges the fields into
   * the target according to protobuf rules. If the target is
   * omitted, a new instance is created first.
   */
  internalBinaryRead(reader, length, options, target) {
    let message = target !== null && target !== void 0 ? target : this.create();
    this.refBinReader.read(reader, message, options, length);
    return message;
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/google/protobuf/struct.mjs
var NullValue = /* @__PURE__ */ function(NullValue$1) {
  NullValue$1[NullValue$1["NULL_VALUE"] = 0] = "NULL_VALUE";
  return NullValue$1;
}({});
var Struct$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.Struct", [{
      no: 1,
      name: "fields",
      kind: "map",
      K: 9,
      V: {
        kind: "message",
        T: () => Value
      }
    }]);
  }
  /**
  * Encode `Struct` to JSON object.
  */
  internalJsonWrite(message, options) {
    let json = {};
    for (let [k, v] of Object.entries(message.fields))
      json[k] = Value.toJson(v);
    return json;
  }
  /**
  * Decode `Struct` from JSON object.
  */
  internalJsonRead(json, options, target) {
    if (!isJsonObject(json))
      throw new globalThis.Error("Unable to parse message " + this.typeName + " from JSON " + typeofJsonValue(json) + ".");
    if (!target)
      target = this.create();
    for (let [k, v] of globalThis.Object.entries(json))
      target.fields[k] = Value.fromJson(v);
    return target;
  }
};
var Struct = new Struct$Type();
var Value$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.Value", [
      {
        no: 1,
        name: "null_value",
        kind: "enum",
        oneof: "kind",
        T: () => ["google.protobuf.NullValue", NullValue]
      },
      {
        no: 2,
        name: "number_value",
        kind: "scalar",
        oneof: "kind",
        T: 1
      },
      {
        no: 3,
        name: "string_value",
        kind: "scalar",
        oneof: "kind",
        T: 9
      },
      {
        no: 4,
        name: "bool_value",
        kind: "scalar",
        oneof: "kind",
        T: 8
      },
      {
        no: 5,
        name: "struct_value",
        kind: "message",
        oneof: "kind",
        T: () => Struct
      },
      {
        no: 6,
        name: "list_value",
        kind: "message",
        oneof: "kind",
        T: () => ListValue
      }
    ]);
  }
  /**
  * Encode `Value` to JSON value.
  */
  internalJsonWrite(message, options) {
    if (message.kind.oneofKind === void 0)
      throw new globalThis.Error();
    switch (message.kind.oneofKind) {
      case void 0:
        throw new globalThis.Error();
      case "boolValue":
        return message.kind.boolValue;
      case "nullValue":
        return null;
      case "numberValue":
        let numberValue = message.kind.numberValue;
        if (typeof numberValue == "number" && !Number.isFinite(numberValue))
          throw new globalThis.Error();
        return numberValue;
      case "stringValue":
        return message.kind.stringValue;
      case "listValue":
        let listValueField = this.fields.find((f) => f.no === 6);
        if (listValueField?.kind !== "message")
          throw new globalThis.Error();
        return listValueField.T().toJson(message.kind.listValue);
      case "structValue":
        let structValueField = this.fields.find((f) => f.no === 5);
        if (structValueField?.kind !== "message")
          throw new globalThis.Error();
        return structValueField.T().toJson(message.kind.structValue);
    }
  }
  /**
  * Decode `Value` from JSON value.
  */
  internalJsonRead(json, options, target) {
    if (!target)
      target = this.create();
    switch (typeof json) {
      case "number":
        target.kind = {
          oneofKind: "numberValue",
          numberValue: json
        };
        break;
      case "string":
        target.kind = {
          oneofKind: "stringValue",
          stringValue: json
        };
        break;
      case "boolean":
        target.kind = {
          oneofKind: "boolValue",
          boolValue: json
        };
        break;
      case "object":
        if (json === null)
          target.kind = {
            oneofKind: "nullValue",
            nullValue: NullValue.NULL_VALUE
          };
        else if (globalThis.Array.isArray(json))
          target.kind = {
            oneofKind: "listValue",
            listValue: ListValue.fromJson(json)
          };
        else
          target.kind = {
            oneofKind: "structValue",
            structValue: Struct.fromJson(json)
          };
        break;
      default:
        throw new globalThis.Error("Unable to parse " + this.typeName + " from JSON " + typeofJsonValue(json));
    }
    return target;
  }
};
var Value = new Value$Type();
var ListValue$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.ListValue", [{
      no: 1,
      name: "values",
      kind: "message",
      repeat: 1,
      T: () => Value
    }]);
  }
  /**
  * Encode `ListValue` to JSON array.
  */
  internalJsonWrite(message, options) {
    return message.values.map((v) => Value.toJson(v));
  }
  /**
  * Decode `ListValue` from JSON array.
  */
  internalJsonRead(json, options, target) {
    if (!globalThis.Array.isArray(json))
      throw new globalThis.Error("Unable to parse " + this.typeName + " from JSON " + typeofJsonValue(json));
    if (!target)
      target = this.create();
    let values = json.map((v) => Value.fromJson(v));
    target.values.push(...values);
    return target;
  }
};
var ListValue = new ListValue$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/move_package.mjs
var DatatypeDescriptor_DatatypeKind = /* @__PURE__ */ function(DatatypeDescriptor_DatatypeKind$1) {
  DatatypeDescriptor_DatatypeKind$1[DatatypeDescriptor_DatatypeKind$1["DATATYPE_KIND_UNKNOWN"] = 0] = "DATATYPE_KIND_UNKNOWN";
  DatatypeDescriptor_DatatypeKind$1[DatatypeDescriptor_DatatypeKind$1["STRUCT"] = 1] = "STRUCT";
  DatatypeDescriptor_DatatypeKind$1[DatatypeDescriptor_DatatypeKind$1["ENUM"] = 2] = "ENUM";
  return DatatypeDescriptor_DatatypeKind$1;
}({});
var OpenSignatureBody_Type = /* @__PURE__ */ function(OpenSignatureBody_Type$1) {
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["TYPE_UNKNOWN"] = 0] = "TYPE_UNKNOWN";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["ADDRESS"] = 1] = "ADDRESS";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["BOOL"] = 2] = "BOOL";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["U8"] = 3] = "U8";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["U16"] = 4] = "U16";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["U32"] = 5] = "U32";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["U64"] = 6] = "U64";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["U128"] = 7] = "U128";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["U256"] = 8] = "U256";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["VECTOR"] = 9] = "VECTOR";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["DATATYPE"] = 10] = "DATATYPE";
  OpenSignatureBody_Type$1[OpenSignatureBody_Type$1["TYPE_PARAMETER"] = 11] = "TYPE_PARAMETER";
  return OpenSignatureBody_Type$1;
}({});
var FunctionDescriptor_Visibility = /* @__PURE__ */ function(FunctionDescriptor_Visibility$1) {
  FunctionDescriptor_Visibility$1[FunctionDescriptor_Visibility$1["VISIBILITY_UNKNOWN"] = 0] = "VISIBILITY_UNKNOWN";
  FunctionDescriptor_Visibility$1[FunctionDescriptor_Visibility$1["PRIVATE"] = 1] = "PRIVATE";
  FunctionDescriptor_Visibility$1[FunctionDescriptor_Visibility$1["PUBLIC"] = 2] = "PUBLIC";
  FunctionDescriptor_Visibility$1[FunctionDescriptor_Visibility$1["FRIEND"] = 3] = "FRIEND";
  return FunctionDescriptor_Visibility$1;
}({});
var OpenSignature_Reference = /* @__PURE__ */ function(OpenSignature_Reference$1) {
  OpenSignature_Reference$1[OpenSignature_Reference$1["REFERENCE_UNKNOWN"] = 0] = "REFERENCE_UNKNOWN";
  OpenSignature_Reference$1[OpenSignature_Reference$1["IMMUTABLE"] = 1] = "IMMUTABLE";
  OpenSignature_Reference$1[OpenSignature_Reference$1["MUTABLE"] = 2] = "MUTABLE";
  return OpenSignature_Reference$1;
}({});
var Ability = /* @__PURE__ */ function(Ability$1) {
  Ability$1[Ability$1["ABILITY_UNKNOWN"] = 0] = "ABILITY_UNKNOWN";
  Ability$1[Ability$1["COPY"] = 1] = "COPY";
  Ability$1[Ability$1["DROP"] = 2] = "DROP";
  Ability$1[Ability$1["STORE"] = 3] = "STORE";
  Ability$1[Ability$1["KEY"] = 4] = "KEY";
  return Ability$1;
}({});
var Package$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Package", [
      {
        no: 1,
        name: "storage_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "original_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "modules",
        kind: "message",
        repeat: 1,
        T: () => Module
      },
      {
        no: 5,
        name: "type_origins",
        kind: "message",
        repeat: 1,
        T: () => TypeOrigin2
      },
      {
        no: 6,
        name: "linkage",
        kind: "message",
        repeat: 1,
        T: () => Linkage
      }
    ]);
  }
};
var Package = new Package$Type();
var Module$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Module", [
      {
        no: 1,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "contents",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 3,
        name: "datatypes",
        kind: "message",
        repeat: 1,
        T: () => DatatypeDescriptor
      },
      {
        no: 4,
        name: "functions",
        kind: "message",
        repeat: 1,
        T: () => FunctionDescriptor
      }
    ]);
  }
};
var Module = new Module$Type();
var DatatypeDescriptor$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.DatatypeDescriptor", [
      {
        no: 1,
        name: "type_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "defining_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "module",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "abilities",
        kind: "enum",
        repeat: 1,
        T: () => ["sui.rpc.v2.Ability", Ability]
      },
      {
        no: 6,
        name: "type_parameters",
        kind: "message",
        repeat: 1,
        T: () => TypeParameter
      },
      {
        no: 7,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.DatatypeDescriptor.DatatypeKind", DatatypeDescriptor_DatatypeKind]
      },
      {
        no: 8,
        name: "fields",
        kind: "message",
        repeat: 1,
        T: () => FieldDescriptor
      },
      {
        no: 9,
        name: "variants",
        kind: "message",
        repeat: 1,
        T: () => VariantDescriptor
      }
    ]);
  }
};
var DatatypeDescriptor = new DatatypeDescriptor$Type();
var TypeParameter$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TypeParameter", [{
      no: 1,
      name: "constraints",
      kind: "enum",
      repeat: 1,
      T: () => ["sui.rpc.v2.Ability", Ability]
    }, {
      no: 2,
      name: "is_phantom",
      kind: "scalar",
      opt: true,
      T: 8
    }]);
  }
};
var TypeParameter = new TypeParameter$Type();
var FieldDescriptor$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.FieldDescriptor", [
      {
        no: 1,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "position",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "type",
        kind: "message",
        T: () => OpenSignatureBody
      }
    ]);
  }
};
var FieldDescriptor = new FieldDescriptor$Type();
var VariantDescriptor$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.VariantDescriptor", [
      {
        no: 1,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "position",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "fields",
        kind: "message",
        repeat: 1,
        T: () => FieldDescriptor
      }
    ]);
  }
};
var VariantDescriptor = new VariantDescriptor$Type();
var OpenSignatureBody$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.OpenSignatureBody", [
      {
        no: 1,
        name: "type",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.OpenSignatureBody.Type", OpenSignatureBody_Type]
      },
      {
        no: 2,
        name: "type_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "type_parameter_instantiation",
        kind: "message",
        repeat: 1,
        T: () => OpenSignatureBody
      },
      {
        no: 4,
        name: "type_parameter",
        kind: "scalar",
        opt: true,
        T: 13
      }
    ]);
  }
};
var OpenSignatureBody = new OpenSignatureBody$Type();
var FunctionDescriptor$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.FunctionDescriptor", [
      {
        no: 1,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "visibility",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.FunctionDescriptor.Visibility", FunctionDescriptor_Visibility]
      },
      {
        no: 6,
        name: "is_entry",
        kind: "scalar",
        opt: true,
        T: 8
      },
      {
        no: 7,
        name: "type_parameters",
        kind: "message",
        repeat: 1,
        T: () => TypeParameter
      },
      {
        no: 8,
        name: "parameters",
        kind: "message",
        repeat: 1,
        T: () => OpenSignature
      },
      {
        no: 9,
        name: "returns",
        kind: "message",
        repeat: 1,
        T: () => OpenSignature
      }
    ]);
  }
};
var FunctionDescriptor = new FunctionDescriptor$Type();
var OpenSignature$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.OpenSignature", [{
      no: 1,
      name: "reference",
      kind: "enum",
      opt: true,
      T: () => ["sui.rpc.v2.OpenSignature.Reference", OpenSignature_Reference]
    }, {
      no: 2,
      name: "body",
      kind: "message",
      T: () => OpenSignatureBody
    }]);
  }
};
var OpenSignature = new OpenSignature$Type();
var TypeOrigin$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TypeOrigin", [
      {
        no: 1,
        name: "module_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "datatype_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "package_id",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var TypeOrigin2 = new TypeOrigin$Type();
var Linkage$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Linkage", [
      {
        no: 1,
        name: "original_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "upgraded_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "upgraded_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var Linkage = new Linkage$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/owner.mjs
var Owner_OwnerKind = /* @__PURE__ */ function(Owner_OwnerKind$1) {
  Owner_OwnerKind$1[Owner_OwnerKind$1["OWNER_KIND_UNKNOWN"] = 0] = "OWNER_KIND_UNKNOWN";
  Owner_OwnerKind$1[Owner_OwnerKind$1["ADDRESS"] = 1] = "ADDRESS";
  Owner_OwnerKind$1[Owner_OwnerKind$1["OBJECT"] = 2] = "OBJECT";
  Owner_OwnerKind$1[Owner_OwnerKind$1["SHARED"] = 3] = "SHARED";
  Owner_OwnerKind$1[Owner_OwnerKind$1["IMMUTABLE"] = 4] = "IMMUTABLE";
  Owner_OwnerKind$1[Owner_OwnerKind$1["CONSENSUS_ADDRESS"] = 5] = "CONSENSUS_ADDRESS";
  return Owner_OwnerKind$1;
}({});
var Owner$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Owner", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.Owner.OwnerKind", Owner_OwnerKind]
      },
      {
        no: 2,
        name: "address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var Owner2 = new Owner$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/argument.mjs
var Argument_ArgumentKind = /* @__PURE__ */ function(Argument_ArgumentKind$1) {
  Argument_ArgumentKind$1[Argument_ArgumentKind$1["ARGUMENT_KIND_UNKNOWN"] = 0] = "ARGUMENT_KIND_UNKNOWN";
  Argument_ArgumentKind$1[Argument_ArgumentKind$1["GAS"] = 1] = "GAS";
  Argument_ArgumentKind$1[Argument_ArgumentKind$1["INPUT"] = 2] = "INPUT";
  Argument_ArgumentKind$1[Argument_ArgumentKind$1["RESULT"] = 3] = "RESULT";
  return Argument_ArgumentKind$1;
}({});
var Argument$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Argument", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.Argument.ArgumentKind", Argument_ArgumentKind]
      },
      {
        no: 2,
        name: "input",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "result",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 4,
        name: "subresult",
        kind: "scalar",
        opt: true,
        T: 13
      }
    ]);
  }
};
var Argument2 = new Argument$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/input.mjs
var Input_InputKind = /* @__PURE__ */ function(Input_InputKind$1) {
  Input_InputKind$1[Input_InputKind$1["INPUT_KIND_UNKNOWN"] = 0] = "INPUT_KIND_UNKNOWN";
  Input_InputKind$1[Input_InputKind$1["PURE"] = 1] = "PURE";
  Input_InputKind$1[Input_InputKind$1["IMMUTABLE_OR_OWNED"] = 2] = "IMMUTABLE_OR_OWNED";
  Input_InputKind$1[Input_InputKind$1["SHARED"] = 3] = "SHARED";
  Input_InputKind$1[Input_InputKind$1["RECEIVING"] = 4] = "RECEIVING";
  Input_InputKind$1[Input_InputKind$1["FUNDS_WITHDRAWAL"] = 5] = "FUNDS_WITHDRAWAL";
  return Input_InputKind$1;
}({});
var Input_Mutability = /* @__PURE__ */ function(Input_Mutability$1) {
  Input_Mutability$1[Input_Mutability$1["MUTABILITY_UNKNOWN"] = 0] = "MUTABILITY_UNKNOWN";
  Input_Mutability$1[Input_Mutability$1["IMMUTABLE"] = 1] = "IMMUTABLE";
  Input_Mutability$1[Input_Mutability$1["MUTABLE"] = 2] = "MUTABLE";
  Input_Mutability$1[Input_Mutability$1["NON_EXCLUSIVE_WRITE"] = 3] = "NON_EXCLUSIVE_WRITE";
  return Input_Mutability$1;
}({});
var FundsWithdrawal_Source = /* @__PURE__ */ function(FundsWithdrawal_Source$1) {
  FundsWithdrawal_Source$1[FundsWithdrawal_Source$1["SOURCE_UNKNOWN"] = 0] = "SOURCE_UNKNOWN";
  FundsWithdrawal_Source$1[FundsWithdrawal_Source$1["SENDER"] = 1] = "SENDER";
  FundsWithdrawal_Source$1[FundsWithdrawal_Source$1["SPONSOR"] = 2] = "SPONSOR";
  return FundsWithdrawal_Source$1;
}({});
var Input$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Input", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.Input.InputKind", Input_InputKind]
      },
      {
        no: 2,
        name: "pure",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 3,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 6,
        name: "mutable",
        kind: "scalar",
        opt: true,
        T: 8
      },
      {
        no: 7,
        name: "mutability",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.Input.Mutability", Input_Mutability]
      },
      {
        no: 8,
        name: "funds_withdrawal",
        kind: "message",
        T: () => FundsWithdrawal2
      },
      {
        no: 1e3,
        name: "literal",
        kind: "message",
        T: () => Value
      }
    ]);
  }
};
var Input = new Input$Type();
var FundsWithdrawal$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.FundsWithdrawal", [
      {
        no: 1,
        name: "amount",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "coin_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "source",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.FundsWithdrawal.Source", FundsWithdrawal_Source]
      }
    ]);
  }
};
var FundsWithdrawal2 = new FundsWithdrawal$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/google/protobuf/duration.mjs
var Duration$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.Duration", [{
      no: 1,
      name: "seconds",
      kind: "scalar",
      T: 3,
      L: 0
    }, {
      no: 2,
      name: "nanos",
      kind: "scalar",
      T: 5
    }]);
  }
  /**
  * Encode `Duration` to JSON string like "3.000001s".
  */
  internalJsonWrite(message, options) {
    let s = PbLong.from(message.seconds).toNumber();
    if (s > 315576e6 || s < -315576e6)
      throw new Error("Duration value out of range.");
    let text = message.seconds.toString();
    if (s === 0 && message.nanos < 0)
      text = "-" + text;
    if (message.nanos !== 0) {
      let nanosStr = Math.abs(message.nanos).toString();
      nanosStr = "0".repeat(9 - nanosStr.length) + nanosStr;
      if (nanosStr.substring(3) === "000000")
        nanosStr = nanosStr.substring(0, 3);
      else if (nanosStr.substring(6) === "000")
        nanosStr = nanosStr.substring(0, 6);
      text += "." + nanosStr;
    }
    return text + "s";
  }
  /**
  * Decode `Duration` from JSON string like "3.000001s"
  */
  internalJsonRead(json, options, target) {
    if (typeof json !== "string")
      throw new Error("Unable to parse Duration from JSON " + typeofJsonValue(json) + ". Expected string.");
    let match = json.match(/^(-?)([0-9]+)(?:\.([0-9]+))?s/);
    if (match === null)
      throw new Error("Unable to parse Duration from JSON string. Invalid format.");
    if (!target)
      target = this.create();
    let [, sign, secs, nanos] = match;
    let longSeconds = PbLong.from(sign + secs);
    if (longSeconds.toNumber() > 315576e6 || longSeconds.toNumber() < -315576e6)
      throw new Error("Unable to parse Duration from JSON string. Value out of range.");
    target.seconds = longSeconds.toBigInt();
    if (typeof nanos == "string") {
      let nanosStr = sign + nanos + "0".repeat(9 - nanos.length);
      target.nanos = parseInt(nanosStr);
    }
    return target;
  }
};
var Duration = new Duration$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/jwk.mjs
var JwkId$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.JwkId", [{
      no: 1,
      name: "iss",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "kid",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var JwkId = new JwkId$Type();
var Jwk$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Jwk", [
      {
        no: 1,
        name: "kty",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "e",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "n",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "alg",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var Jwk = new Jwk$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/bcs.mjs
var Bcs$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Bcs", [{
      no: 1,
      name: "name",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "value",
      kind: "scalar",
      opt: true,
      T: 12
    }]);
  }
};
var Bcs = new Bcs$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/object.mjs
var Object$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Object", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "owner",
        kind: "message",
        T: () => Owner2
      },
      {
        no: 6,
        name: "object_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 7,
        name: "has_public_transfer",
        kind: "scalar",
        opt: true,
        T: 8
      },
      {
        no: 8,
        name: "contents",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 9,
        name: "package",
        kind: "message",
        T: () => Package
      },
      {
        no: 10,
        name: "previous_transaction",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 11,
        name: "storage_rebate",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 100,
        name: "json",
        kind: "message",
        T: () => Value
      },
      {
        no: 101,
        name: "balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var Object$1 = new Object$Type();
var ObjectSet$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ObjectSet", [{
      no: 1,
      name: "objects",
      kind: "message",
      repeat: 1,
      T: () => Object$1
    }]);
  }
};
var ObjectSet = new ObjectSet$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/google/protobuf/timestamp.mjs
var Timestamp$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.Timestamp", [{
      no: 1,
      name: "seconds",
      kind: "scalar",
      T: 3,
      L: 0
    }, {
      no: 2,
      name: "nanos",
      kind: "scalar",
      T: 5
    }]);
  }
  /**
  * Creates a new `Timestamp` for the current time.
  */
  now() {
    const msg = this.create();
    const ms = Date.now();
    msg.seconds = PbLong.from(Math.floor(ms / 1e3)).toBigInt();
    msg.nanos = ms % 1e3 * 1e6;
    return msg;
  }
  /**
  * Converts a `Timestamp` to a JavaScript Date.
  */
  toDate(message) {
    return new Date(PbLong.from(message.seconds).toNumber() * 1e3 + Math.ceil(message.nanos / 1e6));
  }
  /**
  * Converts a JavaScript Date to a `Timestamp`.
  */
  fromDate(date) {
    const msg = this.create();
    const ms = date.getTime();
    msg.seconds = PbLong.from(Math.floor(ms / 1e3)).toBigInt();
    msg.nanos = (ms % 1e3 + (ms < 0 && ms % 1e3 !== 0 ? 1e3 : 0)) * 1e6;
    return msg;
  }
  /**
  * In JSON format, the `Timestamp` type is encoded as a string
  * in the RFC 3339 format.
  */
  internalJsonWrite(message, options) {
    let ms = PbLong.from(message.seconds).toNumber() * 1e3;
    if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z"))
      throw new Error("Unable to encode Timestamp to JSON. Must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive.");
    if (message.nanos < 0)
      throw new Error("Unable to encode invalid Timestamp to JSON. Nanos must not be negative.");
    let z = "Z";
    if (message.nanos > 0) {
      let nanosStr = (message.nanos + 1e9).toString().substring(1);
      if (nanosStr.substring(3) === "000000")
        z = "." + nanosStr.substring(0, 3) + "Z";
      else if (nanosStr.substring(6) === "000")
        z = "." + nanosStr.substring(0, 6) + "Z";
      else
        z = "." + nanosStr + "Z";
    }
    return new Date(ms).toISOString().replace(".000Z", z);
  }
  /**
  * In JSON format, the `Timestamp` type is encoded as a string
  * in the RFC 3339 format.
  */
  internalJsonRead(json, options, target) {
    if (typeof json !== "string")
      throw new Error("Unable to parse Timestamp from JSON " + typeofJsonValue(json) + ".");
    let matches = json.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:Z|\.([0-9]{3,9})Z|([+-][0-9][0-9]:[0-9][0-9]))$/);
    if (!matches)
      throw new Error("Unable to parse Timestamp from JSON. Invalid format.");
    let ms = Date.parse(matches[1] + "-" + matches[2] + "-" + matches[3] + "T" + matches[4] + ":" + matches[5] + ":" + matches[6] + (matches[8] ? matches[8] : "Z"));
    if (Number.isNaN(ms))
      throw new Error("Unable to parse Timestamp from JSON. Invalid value.");
    if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z"))
      throw new globalThis.Error("Unable to parse Timestamp from JSON. Must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive.");
    if (!target)
      target = this.create();
    target.seconds = PbLong.from(ms / 1e3).toBigInt();
    target.nanos = 0;
    if (matches[7])
      target.nanos = parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1e9;
    return target;
  }
};
var Timestamp = new Timestamp$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/object_reference.mjs
var ObjectReference$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ObjectReference", [
      {
        no: 1,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var ObjectReference = new ObjectReference$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/transaction.mjs
var TransactionExpiration_TransactionExpirationKind = /* @__PURE__ */ function(TransactionExpiration_TransactionExpirationKind$1) {
  TransactionExpiration_TransactionExpirationKind$1[TransactionExpiration_TransactionExpirationKind$1["TRANSACTION_EXPIRATION_KIND_UNKNOWN"] = 0] = "TRANSACTION_EXPIRATION_KIND_UNKNOWN";
  TransactionExpiration_TransactionExpirationKind$1[TransactionExpiration_TransactionExpirationKind$1["NONE"] = 1] = "NONE";
  TransactionExpiration_TransactionExpirationKind$1[TransactionExpiration_TransactionExpirationKind$1["EPOCH"] = 2] = "EPOCH";
  TransactionExpiration_TransactionExpirationKind$1[TransactionExpiration_TransactionExpirationKind$1["VALID_DURING"] = 3] = "VALID_DURING";
  return TransactionExpiration_TransactionExpirationKind$1;
}({});
var TransactionKind_Kind = /* @__PURE__ */ function(TransactionKind_Kind$1) {
  TransactionKind_Kind$1[TransactionKind_Kind$1["KIND_UNKNOWN"] = 0] = "KIND_UNKNOWN";
  TransactionKind_Kind$1[TransactionKind_Kind$1["PROGRAMMABLE_TRANSACTION"] = 1] = "PROGRAMMABLE_TRANSACTION";
  TransactionKind_Kind$1[TransactionKind_Kind$1["CHANGE_EPOCH"] = 2] = "CHANGE_EPOCH";
  TransactionKind_Kind$1[TransactionKind_Kind$1["GENESIS"] = 3] = "GENESIS";
  TransactionKind_Kind$1[TransactionKind_Kind$1["CONSENSUS_COMMIT_PROLOGUE_V1"] = 4] = "CONSENSUS_COMMIT_PROLOGUE_V1";
  TransactionKind_Kind$1[TransactionKind_Kind$1["AUTHENTICATOR_STATE_UPDATE"] = 5] = "AUTHENTICATOR_STATE_UPDATE";
  TransactionKind_Kind$1[TransactionKind_Kind$1["END_OF_EPOCH"] = 6] = "END_OF_EPOCH";
  TransactionKind_Kind$1[TransactionKind_Kind$1["RANDOMNESS_STATE_UPDATE"] = 7] = "RANDOMNESS_STATE_UPDATE";
  TransactionKind_Kind$1[TransactionKind_Kind$1["CONSENSUS_COMMIT_PROLOGUE_V2"] = 8] = "CONSENSUS_COMMIT_PROLOGUE_V2";
  TransactionKind_Kind$1[TransactionKind_Kind$1["CONSENSUS_COMMIT_PROLOGUE_V3"] = 9] = "CONSENSUS_COMMIT_PROLOGUE_V3";
  TransactionKind_Kind$1[TransactionKind_Kind$1["CONSENSUS_COMMIT_PROLOGUE_V4"] = 10] = "CONSENSUS_COMMIT_PROLOGUE_V4";
  TransactionKind_Kind$1[TransactionKind_Kind$1["PROGRAMMABLE_SYSTEM_TRANSACTION"] = 11] = "PROGRAMMABLE_SYSTEM_TRANSACTION";
  return TransactionKind_Kind$1;
}({});
var EndOfEpochTransactionKind_Kind = /* @__PURE__ */ function(EndOfEpochTransactionKind_Kind$1) {
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["KIND_UNKNOWN"] = 0] = "KIND_UNKNOWN";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["CHANGE_EPOCH"] = 1] = "CHANGE_EPOCH";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["AUTHENTICATOR_STATE_CREATE"] = 2] = "AUTHENTICATOR_STATE_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["AUTHENTICATOR_STATE_EXPIRE"] = 3] = "AUTHENTICATOR_STATE_EXPIRE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["RANDOMNESS_STATE_CREATE"] = 4] = "RANDOMNESS_STATE_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["DENY_LIST_STATE_CREATE"] = 5] = "DENY_LIST_STATE_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["BRIDGE_STATE_CREATE"] = 6] = "BRIDGE_STATE_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["BRIDGE_COMMITTEE_INIT"] = 7] = "BRIDGE_COMMITTEE_INIT";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["STORE_EXECUTION_TIME_OBSERVATIONS"] = 8] = "STORE_EXECUTION_TIME_OBSERVATIONS";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["ACCUMULATOR_ROOT_CREATE"] = 9] = "ACCUMULATOR_ROOT_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["COIN_REGISTRY_CREATE"] = 10] = "COIN_REGISTRY_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["DISPLAY_REGISTRY_CREATE"] = 11] = "DISPLAY_REGISTRY_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["ADDRESS_ALIAS_STATE_CREATE"] = 12] = "ADDRESS_ALIAS_STATE_CREATE";
  EndOfEpochTransactionKind_Kind$1[EndOfEpochTransactionKind_Kind$1["WRITE_ACCUMULATOR_STORAGE_COST"] = 13] = "WRITE_ACCUMULATOR_STORAGE_COST";
  return EndOfEpochTransactionKind_Kind$1;
}({});
var ExecutionTimeObservation_ExecutionTimeObservationKind = /* @__PURE__ */ function(ExecutionTimeObservation_ExecutionTimeObservationKind$1) {
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["EXECUTION_TIME_OBSERVATION_KIND_UNKNOWN"] = 0] = "EXECUTION_TIME_OBSERVATION_KIND_UNKNOWN";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["MOVE_ENTRY_POINT"] = 1] = "MOVE_ENTRY_POINT";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["TRANSFER_OBJECTS"] = 2] = "TRANSFER_OBJECTS";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["SPLIT_COINS"] = 3] = "SPLIT_COINS";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["MERGE_COINS"] = 4] = "MERGE_COINS";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["PUBLISH"] = 5] = "PUBLISH";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["MAKE_MOVE_VECTOR"] = 6] = "MAKE_MOVE_VECTOR";
  ExecutionTimeObservation_ExecutionTimeObservationKind$1[ExecutionTimeObservation_ExecutionTimeObservationKind$1["UPGRADE"] = 7] = "UPGRADE";
  return ExecutionTimeObservation_ExecutionTimeObservationKind$1;
}({});
var Transaction$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Transaction", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 5
      },
      {
        no: 4,
        name: "kind",
        kind: "message",
        T: () => TransactionKind2
      },
      {
        no: 5,
        name: "sender",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 6,
        name: "gas_payment",
        kind: "message",
        T: () => GasPayment
      },
      {
        no: 7,
        name: "expiration",
        kind: "message",
        T: () => TransactionExpiration4
      }
    ]);
  }
};
var Transaction = new Transaction$Type();
var GasPayment$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GasPayment", [
      {
        no: 1,
        name: "objects",
        kind: "message",
        repeat: 1,
        T: () => ObjectReference
      },
      {
        no: 2,
        name: "owner",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "price",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "budget",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var GasPayment = new GasPayment$Type();
var TransactionExpiration$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TransactionExpiration", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.TransactionExpiration.TransactionExpirationKind", TransactionExpiration_TransactionExpirationKind]
      },
      {
        no: 2,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "min_epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "min_timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 5,
        name: "max_timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 6,
        name: "chain",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 7,
        name: "nonce",
        kind: "scalar",
        opt: true,
        T: 13
      }
    ]);
  }
};
var TransactionExpiration4 = new TransactionExpiration$Type();
var TransactionKind$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TransactionKind", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.TransactionKind.Kind", TransactionKind_Kind]
      },
      {
        no: 2,
        name: "programmable_transaction",
        kind: "message",
        oneof: "data",
        T: () => ProgrammableTransaction2
      },
      {
        no: 3,
        name: "change_epoch",
        kind: "message",
        oneof: "data",
        T: () => ChangeEpoch
      },
      {
        no: 4,
        name: "genesis",
        kind: "message",
        oneof: "data",
        T: () => GenesisTransaction
      },
      {
        no: 5,
        name: "consensus_commit_prologue",
        kind: "message",
        oneof: "data",
        T: () => ConsensusCommitPrologue
      },
      {
        no: 6,
        name: "authenticator_state_update",
        kind: "message",
        oneof: "data",
        T: () => AuthenticatorStateUpdate
      },
      {
        no: 7,
        name: "end_of_epoch",
        kind: "message",
        oneof: "data",
        T: () => EndOfEpochTransaction
      },
      {
        no: 8,
        name: "randomness_state_update",
        kind: "message",
        oneof: "data",
        T: () => RandomnessStateUpdate
      }
    ]);
  }
};
var TransactionKind2 = new TransactionKind$Type();
var ProgrammableTransaction$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ProgrammableTransaction", [{
      no: 1,
      name: "inputs",
      kind: "message",
      repeat: 1,
      T: () => Input
    }, {
      no: 2,
      name: "commands",
      kind: "message",
      repeat: 1,
      T: () => Command2
    }]);
  }
};
var ProgrammableTransaction2 = new ProgrammableTransaction$Type();
var Command$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Command", [
      {
        no: 1,
        name: "move_call",
        kind: "message",
        oneof: "command",
        T: () => MoveCall
      },
      {
        no: 2,
        name: "transfer_objects",
        kind: "message",
        oneof: "command",
        T: () => TransferObjects
      },
      {
        no: 3,
        name: "split_coins",
        kind: "message",
        oneof: "command",
        T: () => SplitCoins
      },
      {
        no: 4,
        name: "merge_coins",
        kind: "message",
        oneof: "command",
        T: () => MergeCoins
      },
      {
        no: 5,
        name: "publish",
        kind: "message",
        oneof: "command",
        T: () => Publish
      },
      {
        no: 6,
        name: "make_move_vector",
        kind: "message",
        oneof: "command",
        T: () => MakeMoveVector
      },
      {
        no: 7,
        name: "upgrade",
        kind: "message",
        oneof: "command",
        T: () => Upgrade
      }
    ]);
  }
};
var Command2 = new Command$Type();
var MoveCall$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MoveCall", [
      {
        no: 1,
        name: "package",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "module",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "function",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "type_arguments",
        kind: "scalar",
        repeat: 2,
        T: 9
      },
      {
        no: 5,
        name: "arguments",
        kind: "message",
        repeat: 1,
        T: () => Argument2
      }
    ]);
  }
};
var MoveCall = new MoveCall$Type();
var TransferObjects$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TransferObjects", [{
      no: 1,
      name: "objects",
      kind: "message",
      repeat: 1,
      T: () => Argument2
    }, {
      no: 2,
      name: "address",
      kind: "message",
      T: () => Argument2
    }]);
  }
};
var TransferObjects = new TransferObjects$Type();
var SplitCoins$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SplitCoins", [{
      no: 1,
      name: "coin",
      kind: "message",
      T: () => Argument2
    }, {
      no: 2,
      name: "amounts",
      kind: "message",
      repeat: 1,
      T: () => Argument2
    }]);
  }
};
var SplitCoins = new SplitCoins$Type();
var MergeCoins$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MergeCoins", [{
      no: 1,
      name: "coin",
      kind: "message",
      T: () => Argument2
    }, {
      no: 2,
      name: "coins_to_merge",
      kind: "message",
      repeat: 1,
      T: () => Argument2
    }]);
  }
};
var MergeCoins = new MergeCoins$Type();
var Publish$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Publish", [{
      no: 1,
      name: "modules",
      kind: "scalar",
      repeat: 2,
      T: 12
    }, {
      no: 2,
      name: "dependencies",
      kind: "scalar",
      repeat: 2,
      T: 9
    }]);
  }
};
var Publish = new Publish$Type();
var MakeMoveVector$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MakeMoveVector", [{
      no: 1,
      name: "element_type",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "elements",
      kind: "message",
      repeat: 1,
      T: () => Argument2
    }]);
  }
};
var MakeMoveVector = new MakeMoveVector$Type();
var Upgrade$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Upgrade", [
      {
        no: 1,
        name: "modules",
        kind: "scalar",
        repeat: 2,
        T: 12
      },
      {
        no: 2,
        name: "dependencies",
        kind: "scalar",
        repeat: 2,
        T: 9
      },
      {
        no: 3,
        name: "package",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "ticket",
        kind: "message",
        T: () => Argument2
      }
    ]);
  }
};
var Upgrade = new Upgrade$Type();
var RandomnessStateUpdate$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.RandomnessStateUpdate", [
      {
        no: 1,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "randomness_round",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "random_bytes",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 4,
        name: "randomness_object_initial_shared_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var RandomnessStateUpdate = new RandomnessStateUpdate$Type();
var ChangeEpoch$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ChangeEpoch", [
      {
        no: 1,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "protocol_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "storage_charge",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "computation_charge",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "storage_rebate",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "non_refundable_storage_fee",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 7,
        name: "epoch_start_timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 8,
        name: "system_packages",
        kind: "message",
        repeat: 1,
        T: () => SystemPackage
      }
    ]);
  }
};
var ChangeEpoch = new ChangeEpoch$Type();
var SystemPackage$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SystemPackage", [
      {
        no: 1,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "modules",
        kind: "scalar",
        repeat: 2,
        T: 12
      },
      {
        no: 3,
        name: "dependencies",
        kind: "scalar",
        repeat: 2,
        T: 9
      }
    ]);
  }
};
var SystemPackage = new SystemPackage$Type();
var GenesisTransaction$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GenesisTransaction", [{
      no: 1,
      name: "objects",
      kind: "message",
      repeat: 1,
      T: () => Object$1
    }]);
  }
};
var GenesisTransaction = new GenesisTransaction$Type();
var ConsensusCommitPrologue$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ConsensusCommitPrologue", [
      {
        no: 1,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "round",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "commit_timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 4,
        name: "consensus_commit_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "sub_dag_index",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "consensus_determined_version_assignments",
        kind: "message",
        T: () => ConsensusDeterminedVersionAssignments
      },
      {
        no: 7,
        name: "additional_state_digest",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var ConsensusCommitPrologue = new ConsensusCommitPrologue$Type();
var VersionAssignment$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.VersionAssignment", [
      {
        no: 1,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "start_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var VersionAssignment = new VersionAssignment$Type();
var CanceledTransaction$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CanceledTransaction", [{
      no: 1,
      name: "digest",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "version_assignments",
      kind: "message",
      repeat: 1,
      T: () => VersionAssignment
    }]);
  }
};
var CanceledTransaction = new CanceledTransaction$Type();
var ConsensusDeterminedVersionAssignments$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ConsensusDeterminedVersionAssignments", [{
      no: 1,
      name: "version",
      kind: "scalar",
      opt: true,
      T: 5
    }, {
      no: 3,
      name: "canceled_transactions",
      kind: "message",
      repeat: 1,
      T: () => CanceledTransaction
    }]);
  }
};
var ConsensusDeterminedVersionAssignments = new ConsensusDeterminedVersionAssignments$Type();
var AuthenticatorStateUpdate$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.AuthenticatorStateUpdate", [
      {
        no: 1,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "round",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "new_active_jwks",
        kind: "message",
        repeat: 1,
        T: () => ActiveJwk
      },
      {
        no: 4,
        name: "authenticator_object_initial_shared_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var AuthenticatorStateUpdate = new AuthenticatorStateUpdate$Type();
var ActiveJwk$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ActiveJwk", [
      {
        no: 1,
        name: "id",
        kind: "message",
        T: () => JwkId
      },
      {
        no: 2,
        name: "jwk",
        kind: "message",
        T: () => Jwk
      },
      {
        no: 3,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var ActiveJwk = new ActiveJwk$Type();
var EndOfEpochTransaction$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.EndOfEpochTransaction", [{
      no: 1,
      name: "transactions",
      kind: "message",
      repeat: 1,
      T: () => EndOfEpochTransactionKind
    }]);
  }
};
var EndOfEpochTransaction = new EndOfEpochTransaction$Type();
var EndOfEpochTransactionKind$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.EndOfEpochTransactionKind", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.EndOfEpochTransactionKind.Kind", EndOfEpochTransactionKind_Kind]
      },
      {
        no: 2,
        name: "change_epoch",
        kind: "message",
        oneof: "data",
        T: () => ChangeEpoch
      },
      {
        no: 3,
        name: "authenticator_state_expire",
        kind: "message",
        oneof: "data",
        T: () => AuthenticatorStateExpire
      },
      {
        no: 4,
        name: "execution_time_observations",
        kind: "message",
        oneof: "data",
        T: () => ExecutionTimeObservations
      },
      {
        no: 5,
        name: "bridge_chain_id",
        kind: "scalar",
        oneof: "data",
        T: 9
      },
      {
        no: 6,
        name: "bridge_object_version",
        kind: "scalar",
        oneof: "data",
        T: 4,
        L: 0
      },
      {
        no: 7,
        name: "storage_cost",
        kind: "scalar",
        oneof: "data",
        T: 4,
        L: 0
      }
    ]);
  }
};
var EndOfEpochTransactionKind = new EndOfEpochTransactionKind$Type();
var AuthenticatorStateExpire$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.AuthenticatorStateExpire", [{
      no: 1,
      name: "min_epoch",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }, {
      no: 2,
      name: "authenticator_object_initial_shared_version",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var AuthenticatorStateExpire = new AuthenticatorStateExpire$Type();
var ExecutionTimeObservations$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecutionTimeObservations", [{
      no: 1,
      name: "version",
      kind: "scalar",
      opt: true,
      T: 5
    }, {
      no: 2,
      name: "observations",
      kind: "message",
      repeat: 1,
      T: () => ExecutionTimeObservation
    }]);
  }
};
var ExecutionTimeObservations = new ExecutionTimeObservations$Type();
var ExecutionTimeObservation$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecutionTimeObservation", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.ExecutionTimeObservation.ExecutionTimeObservationKind", ExecutionTimeObservation_ExecutionTimeObservationKind]
      },
      {
        no: 2,
        name: "move_entry_point",
        kind: "message",
        T: () => MoveCall
      },
      {
        no: 3,
        name: "validator_observations",
        kind: "message",
        repeat: 1,
        T: () => ValidatorExecutionTimeObservation
      }
    ]);
  }
};
var ExecutionTimeObservation = new ExecutionTimeObservation$Type();
var ValidatorExecutionTimeObservation$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ValidatorExecutionTimeObservation", [{
      no: 1,
      name: "validator",
      kind: "scalar",
      opt: true,
      T: 12
    }, {
      no: 2,
      name: "duration",
      kind: "message",
      T: () => Duration
    }]);
  }
};
var ValidatorExecutionTimeObservation = new ValidatorExecutionTimeObservation$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/transaction-resolver.mjs
function callArgToGrpcInput(arg) {
  switch (arg.$kind) {
    case "Pure":
      return {
        kind: Input_InputKind.PURE,
        pure: fromBase64(arg.Pure.bytes)
      };
    case "Object":
      if (arg.Object.$kind === "ImmOrOwnedObject")
        return {
          kind: Input_InputKind.IMMUTABLE_OR_OWNED,
          objectId: arg.Object.ImmOrOwnedObject.objectId,
          version: BigInt(arg.Object.ImmOrOwnedObject.version),
          digest: arg.Object.ImmOrOwnedObject.digest
        };
      else if (arg.Object.$kind === "SharedObject")
        return {
          kind: Input_InputKind.SHARED,
          objectId: arg.Object.SharedObject.objectId,
          version: BigInt(arg.Object.SharedObject.initialSharedVersion),
          mutable: arg.Object.SharedObject.mutable
        };
      else if (arg.Object.$kind === "Receiving")
        return {
          kind: Input_InputKind.RECEIVING,
          objectId: arg.Object.Receiving.objectId,
          version: BigInt(arg.Object.Receiving.version),
          digest: arg.Object.Receiving.digest
        };
      throw new Error(`Unknown Object kind: ${JSON.stringify(arg.Object)}`);
    case "UnresolvedObject":
      const unresolved = arg.UnresolvedObject;
      return {
        objectId: unresolved.objectId,
        version: unresolved.version ? BigInt(unresolved.version) : unresolved.initialSharedVersion ? BigInt(unresolved.initialSharedVersion) : void 0,
        digest: unresolved.digest ?? void 0,
        mutable: unresolved.mutable ?? void 0
      };
    case "UnresolvedPure":
      throw new Error("UnresolvedPure arguments must be resolved before converting to gRPC format");
    case "FundsWithdrawal": {
      const withdrawal = arg.FundsWithdrawal;
      return {
        kind: Input_InputKind.FUNDS_WITHDRAWAL,
        fundsWithdrawal: {
          amount: withdrawal.reservation.$kind === "MaxAmountU64" ? BigInt(withdrawal.reservation.MaxAmountU64) : void 0,
          coinType: withdrawal.typeArg.$kind === "Balance" ? withdrawal.typeArg.Balance : void 0,
          source: withdrawal.withdrawFrom.$kind === "Sponsor" ? FundsWithdrawal_Source.SPONSOR : FundsWithdrawal_Source.SENDER
        }
      };
    }
    default:
      throw new Error(`Unknown CallArg kind: ${JSON.stringify(arg)}`);
  }
}
function tsArgumentToGrpcArgument(arg) {
  if ("GasCoin" in arg)
    return { kind: Argument_ArgumentKind.GAS };
  else if ("Input" in arg)
    return {
      kind: Argument_ArgumentKind.INPUT,
      input: arg.Input
    };
  else if ("Result" in arg)
    return {
      kind: Argument_ArgumentKind.RESULT,
      result: arg.Result
    };
  else if ("NestedResult" in arg)
    return {
      kind: Argument_ArgumentKind.RESULT,
      result: arg.NestedResult[0],
      subresult: arg.NestedResult[1]
    };
  throw new Error(`Unknown Argument: ${JSON.stringify(arg)}`);
}
function tsCommandToGrpcCommand(cmd) {
  switch (cmd.$kind) {
    case "MoveCall":
      return { command: {
        oneofKind: "moveCall",
        moveCall: {
          package: cmd.MoveCall.package,
          module: cmd.MoveCall.module,
          function: cmd.MoveCall.function,
          typeArguments: cmd.MoveCall.typeArguments,
          arguments: cmd.MoveCall.arguments.map(tsArgumentToGrpcArgument)
        }
      } };
    case "TransferObjects":
      return { command: {
        oneofKind: "transferObjects",
        transferObjects: {
          objects: cmd.TransferObjects.objects.map(tsArgumentToGrpcArgument),
          address: tsArgumentToGrpcArgument(cmd.TransferObjects.address)
        }
      } };
    case "SplitCoins":
      return { command: {
        oneofKind: "splitCoins",
        splitCoins: {
          coin: tsArgumentToGrpcArgument(cmd.SplitCoins.coin),
          amounts: cmd.SplitCoins.amounts.map(tsArgumentToGrpcArgument)
        }
      } };
    case "MergeCoins":
      return { command: {
        oneofKind: "mergeCoins",
        mergeCoins: {
          coin: tsArgumentToGrpcArgument(cmd.MergeCoins.destination),
          coinsToMerge: cmd.MergeCoins.sources.map(tsArgumentToGrpcArgument)
        }
      } };
    case "Publish":
      return { command: {
        oneofKind: "publish",
        publish: {
          modules: cmd.Publish.modules.map((m) => fromBase64(m)),
          dependencies: cmd.Publish.dependencies
        }
      } };
    case "MakeMoveVec":
      return { command: {
        oneofKind: "makeMoveVector",
        makeMoveVector: {
          elementType: cmd.MakeMoveVec.type ?? void 0,
          elements: cmd.MakeMoveVec.elements.map(tsArgumentToGrpcArgument)
        }
      } };
    case "Upgrade":
      return { command: {
        oneofKind: "upgrade",
        upgrade: {
          modules: cmd.Upgrade.modules.map((m) => fromBase64(m)),
          dependencies: cmd.Upgrade.dependencies,
          package: cmd.Upgrade.package,
          ticket: tsArgumentToGrpcArgument(cmd.Upgrade.ticket)
        }
      } };
    default:
      throw new Error(`Unknown Command kind: ${JSON.stringify(cmd)}`);
  }
}
function transactionDataToGrpcTransaction(data) {
  const transaction = {
    version: 1,
    kind: { data: {
      oneofKind: "programmableTransaction",
      programmableTransaction: {
        inputs: data.inputs.map(callArgToGrpcInput),
        commands: data.commands.map(tsCommandToGrpcCommand)
      }
    } }
  };
  if (data.sender)
    transaction.sender = data.sender;
  const gasOwner = data.gasData.owner ?? data.sender;
  transaction.gasPayment = {
    objects: data.gasData.payment ? data.gasData.payment.map((ref) => ({
      objectId: ref.objectId,
      version: BigInt(ref.version),
      digest: ref.digest
    })) : [],
    price: data.gasData.price ? BigInt(data.gasData.price) : void 0,
    budget: data.gasData.budget ? BigInt(data.gasData.budget) : void 0
  };
  if (gasOwner)
    transaction.gasPayment.owner = gasOwner;
  if (data.expiration) {
    if ("None" in data.expiration)
      transaction.expiration = { kind: TransactionExpiration_TransactionExpirationKind.NONE };
    else if (data.expiration.$kind === "Epoch")
      transaction.expiration = {
        kind: TransactionExpiration_TransactionExpirationKind.EPOCH,
        epoch: BigInt(data.expiration.Epoch)
      };
    else if (data.expiration.$kind === "ValidDuring") {
      const validDuring = data.expiration.ValidDuring;
      transaction.expiration = {
        kind: TransactionExpiration_TransactionExpirationKind.VALID_DURING,
        minEpoch: validDuring.minEpoch != null ? BigInt(validDuring.minEpoch) : void 0,
        epoch: validDuring.maxEpoch != null ? BigInt(validDuring.maxEpoch) : void 0,
        chain: validDuring.chain,
        nonce: validDuring.nonce
      };
    }
  }
  return transaction;
}
function applyGrpcResolvedTransaction(transactionData, resolvedTransaction, options) {
  const resolved = grpcTransactionToTransactionData(resolvedTransaction);
  if (options?.onlyTransactionKind)
    transactionData.applyResolvedData({
      ...resolved,
      gasData: {
        budget: null,
        owner: null,
        payment: null,
        price: null
      },
      expiration: null
    });
  else
    transactionData.applyResolvedData(resolved);
}
function transactionToGrpcTransaction(transaction) {
  const snapshot = transaction.getData();
  if (!snapshot.sender)
    snapshot.sender = "0x0000000000000000000000000000000000000000000000000000000000000000";
  return transactionDataToGrpcTransaction(snapshot);
}
function grpcInputToCallArg(input) {
  switch (input.kind) {
    case Input_InputKind.PURE:
      return {
        $kind: "Pure",
        Pure: { bytes: toBase64(input.pure) }
      };
    case Input_InputKind.IMMUTABLE_OR_OWNED:
      return {
        $kind: "Object",
        Object: {
          $kind: "ImmOrOwnedObject",
          ImmOrOwnedObject: {
            objectId: input.objectId,
            version: input.version.toString(),
            digest: input.digest
          }
        }
      };
    case Input_InputKind.SHARED:
      return {
        $kind: "Object",
        Object: {
          $kind: "SharedObject",
          SharedObject: {
            objectId: input.objectId,
            initialSharedVersion: input.version.toString(),
            mutable: input.mutable ?? false
          }
        }
      };
    case Input_InputKind.RECEIVING:
      return {
        $kind: "Object",
        Object: {
          $kind: "Receiving",
          Receiving: {
            objectId: input.objectId,
            version: input.version.toString(),
            digest: input.digest
          }
        }
      };
    case Input_InputKind.FUNDS_WITHDRAWAL:
      return {
        $kind: "FundsWithdrawal",
        FundsWithdrawal: {
          reservation: {
            $kind: "MaxAmountU64",
            MaxAmountU64: input.fundsWithdrawal?.amount?.toString() ?? "0"
          },
          typeArg: {
            $kind: "Balance",
            Balance: input.fundsWithdrawal?.coinType ?? "0x2::sui::SUI"
          },
          withdrawFrom: input.fundsWithdrawal?.source === FundsWithdrawal_Source.SPONSOR ? {
            $kind: "Sponsor",
            Sponsor: true
          } : {
            $kind: "Sender",
            Sender: true
          }
        }
      };
    default:
      throw new Error(`Unknown Input kind: ${JSON.stringify(input)}`);
  }
}
function grpcArgumentToTsArgument(arg) {
  switch (arg.kind) {
    case Argument_ArgumentKind.GAS:
      return {
        $kind: "GasCoin",
        GasCoin: true
      };
    case Argument_ArgumentKind.INPUT:
      return {
        $kind: "Input",
        Input: arg.input
      };
    case Argument_ArgumentKind.RESULT:
      if (arg.subresult != null)
        return {
          $kind: "NestedResult",
          NestedResult: [arg.result, arg.subresult]
        };
      return {
        $kind: "Result",
        Result: arg.result
      };
    default:
      throw new Error(`Unknown Argument kind: ${JSON.stringify(arg)}`);
  }
}
function grpcCommandToTsCommand(cmd) {
  const command = cmd.command;
  if (!command)
    throw new Error("Command is missing");
  switch (command.oneofKind) {
    case "moveCall":
      return {
        $kind: "MoveCall",
        MoveCall: {
          package: command.moveCall.package,
          module: command.moveCall.module,
          function: command.moveCall.function,
          typeArguments: command.moveCall.typeArguments ?? [],
          arguments: command.moveCall.arguments.map(grpcArgumentToTsArgument)
        }
      };
    case "transferObjects":
      return {
        $kind: "TransferObjects",
        TransferObjects: {
          objects: command.transferObjects.objects.map(grpcArgumentToTsArgument),
          address: grpcArgumentToTsArgument(command.transferObjects.address)
        }
      };
    case "splitCoins":
      return {
        $kind: "SplitCoins",
        SplitCoins: {
          coin: grpcArgumentToTsArgument(command.splitCoins.coin),
          amounts: command.splitCoins.amounts.map(grpcArgumentToTsArgument)
        }
      };
    case "mergeCoins":
      return {
        $kind: "MergeCoins",
        MergeCoins: {
          destination: grpcArgumentToTsArgument(command.mergeCoins.coin),
          sources: command.mergeCoins.coinsToMerge.map(grpcArgumentToTsArgument)
        }
      };
    case "publish":
      return {
        $kind: "Publish",
        Publish: {
          modules: command.publish.modules.map((m) => toBase64(m)),
          dependencies: command.publish.dependencies ?? []
        }
      };
    case "makeMoveVector":
      return {
        $kind: "MakeMoveVec",
        MakeMoveVec: {
          type: command.makeMoveVector.elementType ?? null,
          elements: command.makeMoveVector.elements.map(grpcArgumentToTsArgument)
        }
      };
    case "upgrade":
      return {
        $kind: "Upgrade",
        Upgrade: {
          modules: command.upgrade.modules.map((m) => toBase64(m)),
          dependencies: command.upgrade.dependencies ?? [],
          package: command.upgrade.package,
          ticket: grpcArgumentToTsArgument(command.upgrade.ticket)
        }
      };
    default:
      throw new Error(`Unknown Command kind: ${JSON.stringify(command)}`);
  }
}
function grpcTransactionToTransactionData(grpcTx) {
  const programmableTx = grpcTx.kind?.data;
  if (programmableTx?.oneofKind !== "programmableTransaction")
    throw new Error("Only programmable transactions are supported");
  const inputs = programmableTx.programmableTransaction.inputs.map(grpcInputToCallArg);
  const commands = programmableTx.programmableTransaction.commands.map(grpcCommandToTsCommand);
  let expiration = null;
  if (grpcTx.expiration)
    switch (grpcTx.expiration.kind) {
      case TransactionExpiration_TransactionExpirationKind.NONE:
        expiration = {
          $kind: "None",
          None: true
        };
        break;
      case TransactionExpiration_TransactionExpirationKind.EPOCH:
        expiration = {
          $kind: "Epoch",
          Epoch: grpcTx.expiration.epoch.toString()
        };
        break;
      case TransactionExpiration_TransactionExpirationKind.VALID_DURING:
        expiration = {
          $kind: "ValidDuring",
          ValidDuring: {
            minEpoch: grpcTx.expiration.minEpoch?.toString() ?? null,
            maxEpoch: grpcTx.expiration.epoch?.toString() ?? null,
            minTimestamp: null,
            maxTimestamp: null,
            chain: grpcTx.expiration.chain ?? "",
            nonce: grpcTx.expiration.nonce ?? 0
          }
        };
        break;
    }
  return {
    version: 2,
    sender: grpcTx.sender ?? null,
    expiration,
    gasData: {
      budget: grpcTx.gasPayment?.budget?.toString() ?? null,
      owner: grpcTx.gasPayment?.owner ?? null,
      payment: grpcTx.gasPayment?.objects?.map((obj) => ({
        objectId: obj.objectId,
        version: obj.version.toString(),
        digest: obj.digest
      })) ?? null,
      price: grpcTx.gasPayment?.price?.toString() ?? null
    },
    inputs,
    commands
  };
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/execution_status.mjs
var ExecutionError_ExecutionErrorKind = /* @__PURE__ */ function(ExecutionError_ExecutionErrorKind$1) {
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["EXECUTION_ERROR_KIND_UNKNOWN"] = 0] = "EXECUTION_ERROR_KIND_UNKNOWN";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INSUFFICIENT_GAS"] = 1] = "INSUFFICIENT_GAS";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INVALID_GAS_OBJECT"] = 2] = "INVALID_GAS_OBJECT";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INVARIANT_VIOLATION"] = 3] = "INVARIANT_VIOLATION";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["FEATURE_NOT_YET_SUPPORTED"] = 4] = "FEATURE_NOT_YET_SUPPORTED";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["OBJECT_TOO_BIG"] = 5] = "OBJECT_TOO_BIG";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["PACKAGE_TOO_BIG"] = 6] = "PACKAGE_TOO_BIG";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["CIRCULAR_OBJECT_OWNERSHIP"] = 7] = "CIRCULAR_OBJECT_OWNERSHIP";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INSUFFICIENT_COIN_BALANCE"] = 8] = "INSUFFICIENT_COIN_BALANCE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["COIN_BALANCE_OVERFLOW"] = 9] = "COIN_BALANCE_OVERFLOW";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["PUBLISH_ERROR_NON_ZERO_ADDRESS"] = 10] = "PUBLISH_ERROR_NON_ZERO_ADDRESS";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["SUI_MOVE_VERIFICATION_ERROR"] = 11] = "SUI_MOVE_VERIFICATION_ERROR";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["MOVE_PRIMITIVE_RUNTIME_ERROR"] = 12] = "MOVE_PRIMITIVE_RUNTIME_ERROR";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["MOVE_ABORT"] = 13] = "MOVE_ABORT";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["VM_VERIFICATION_OR_DESERIALIZATION_ERROR"] = 14] = "VM_VERIFICATION_OR_DESERIALIZATION_ERROR";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["VM_INVARIANT_VIOLATION"] = 15] = "VM_INVARIANT_VIOLATION";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["FUNCTION_NOT_FOUND"] = 16] = "FUNCTION_NOT_FOUND";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["ARITY_MISMATCH"] = 17] = "ARITY_MISMATCH";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["TYPE_ARITY_MISMATCH"] = 18] = "TYPE_ARITY_MISMATCH";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["NON_ENTRY_FUNCTION_INVOKED"] = 19] = "NON_ENTRY_FUNCTION_INVOKED";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["COMMAND_ARGUMENT_ERROR"] = 20] = "COMMAND_ARGUMENT_ERROR";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["TYPE_ARGUMENT_ERROR"] = 21] = "TYPE_ARGUMENT_ERROR";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["UNUSED_VALUE_WITHOUT_DROP"] = 22] = "UNUSED_VALUE_WITHOUT_DROP";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INVALID_PUBLIC_FUNCTION_RETURN_TYPE"] = 23] = "INVALID_PUBLIC_FUNCTION_RETURN_TYPE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INVALID_TRANSFER_OBJECT"] = 24] = "INVALID_TRANSFER_OBJECT";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["EFFECTS_TOO_LARGE"] = 25] = "EFFECTS_TOO_LARGE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["PUBLISH_UPGRADE_MISSING_DEPENDENCY"] = 26] = "PUBLISH_UPGRADE_MISSING_DEPENDENCY";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["PUBLISH_UPGRADE_DEPENDENCY_DOWNGRADE"] = 27] = "PUBLISH_UPGRADE_DEPENDENCY_DOWNGRADE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["PACKAGE_UPGRADE_ERROR"] = 28] = "PACKAGE_UPGRADE_ERROR";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["WRITTEN_OBJECTS_TOO_LARGE"] = 29] = "WRITTEN_OBJECTS_TOO_LARGE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["CERTIFICATE_DENIED"] = 30] = "CERTIFICATE_DENIED";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["SUI_MOVE_VERIFICATION_TIMEDOUT"] = 31] = "SUI_MOVE_VERIFICATION_TIMEDOUT";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["CONSENSUS_OBJECT_OPERATION_NOT_ALLOWED"] = 32] = "CONSENSUS_OBJECT_OPERATION_NOT_ALLOWED";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INPUT_OBJECT_DELETED"] = 33] = "INPUT_OBJECT_DELETED";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["EXECUTION_CANCELED_DUE_TO_CONSENSUS_OBJECT_CONGESTION"] = 34] = "EXECUTION_CANCELED_DUE_TO_CONSENSUS_OBJECT_CONGESTION";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["ADDRESS_DENIED_FOR_COIN"] = 35] = "ADDRESS_DENIED_FOR_COIN";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["COIN_TYPE_GLOBAL_PAUSE"] = 36] = "COIN_TYPE_GLOBAL_PAUSE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["EXECUTION_CANCELED_DUE_TO_RANDOMNESS_UNAVAILABLE"] = 37] = "EXECUTION_CANCELED_DUE_TO_RANDOMNESS_UNAVAILABLE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["MOVE_VECTOR_ELEM_TOO_BIG"] = 38] = "MOVE_VECTOR_ELEM_TOO_BIG";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["MOVE_RAW_VALUE_TOO_BIG"] = 39] = "MOVE_RAW_VALUE_TOO_BIG";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INVALID_LINKAGE"] = 40] = "INVALID_LINKAGE";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["INSUFFICIENT_FUNDS_FOR_WITHDRAW"] = 41] = "INSUFFICIENT_FUNDS_FOR_WITHDRAW";
  ExecutionError_ExecutionErrorKind$1[ExecutionError_ExecutionErrorKind$1["NON_EXCLUSIVE_WRITE_INPUT_OBJECT_MODIFIED"] = 42] = "NON_EXCLUSIVE_WRITE_INPUT_OBJECT_MODIFIED";
  return ExecutionError_ExecutionErrorKind$1;
}({});
var CommandArgumentError_CommandArgumentErrorKind = /* @__PURE__ */ function(CommandArgumentError_CommandArgumentErrorKind$1) {
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["COMMAND_ARGUMENT_ERROR_KIND_UNKNOWN"] = 0] = "COMMAND_ARGUMENT_ERROR_KIND_UNKNOWN";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["TYPE_MISMATCH"] = 1] = "TYPE_MISMATCH";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_BCS_BYTES"] = 2] = "INVALID_BCS_BYTES";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_USAGE_OF_PURE_ARGUMENT"] = 3] = "INVALID_USAGE_OF_PURE_ARGUMENT";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_ARGUMENT_TO_PRIVATE_ENTRY_FUNCTION"] = 4] = "INVALID_ARGUMENT_TO_PRIVATE_ENTRY_FUNCTION";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INDEX_OUT_OF_BOUNDS"] = 5] = "INDEX_OUT_OF_BOUNDS";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["SECONDARY_INDEX_OUT_OF_BOUNDS"] = 6] = "SECONDARY_INDEX_OUT_OF_BOUNDS";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_RESULT_ARITY"] = 7] = "INVALID_RESULT_ARITY";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_GAS_COIN_USAGE"] = 8] = "INVALID_GAS_COIN_USAGE";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_VALUE_USAGE"] = 9] = "INVALID_VALUE_USAGE";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_OBJECT_BY_VALUE"] = 10] = "INVALID_OBJECT_BY_VALUE";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_OBJECT_BY_MUT_REF"] = 11] = "INVALID_OBJECT_BY_MUT_REF";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["CONSENSUS_OBJECT_OPERATION_NOT_ALLOWED"] = 12] = "CONSENSUS_OBJECT_OPERATION_NOT_ALLOWED";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_ARGUMENT_ARITY"] = 13] = "INVALID_ARGUMENT_ARITY";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_TRANSFER_OBJECT"] = 14] = "INVALID_TRANSFER_OBJECT";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_MAKE_MOVE_VEC_NON_OBJECT_ARGUMENT"] = 15] = "INVALID_MAKE_MOVE_VEC_NON_OBJECT_ARGUMENT";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["ARGUMENT_WITHOUT_VALUE"] = 16] = "ARGUMENT_WITHOUT_VALUE";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["CANNOT_MOVE_BORROWED_VALUE"] = 17] = "CANNOT_MOVE_BORROWED_VALUE";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["CANNOT_WRITE_TO_EXTENDED_REFERENCE"] = 18] = "CANNOT_WRITE_TO_EXTENDED_REFERENCE";
  CommandArgumentError_CommandArgumentErrorKind$1[CommandArgumentError_CommandArgumentErrorKind$1["INVALID_REFERENCE_ARGUMENT"] = 19] = "INVALID_REFERENCE_ARGUMENT";
  return CommandArgumentError_CommandArgumentErrorKind$1;
}({});
var PackageUpgradeError_PackageUpgradeErrorKind = /* @__PURE__ */ function(PackageUpgradeError_PackageUpgradeErrorKind$1) {
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["PACKAGE_UPGRADE_ERROR_KIND_UNKNOWN"] = 0] = "PACKAGE_UPGRADE_ERROR_KIND_UNKNOWN";
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["UNABLE_TO_FETCH_PACKAGE"] = 1] = "UNABLE_TO_FETCH_PACKAGE";
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["NOT_A_PACKAGE"] = 2] = "NOT_A_PACKAGE";
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["INCOMPATIBLE_UPGRADE"] = 3] = "INCOMPATIBLE_UPGRADE";
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["DIGEST_DOES_NOT_MATCH"] = 4] = "DIGEST_DOES_NOT_MATCH";
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["UNKNOWN_UPGRADE_POLICY"] = 5] = "UNKNOWN_UPGRADE_POLICY";
  PackageUpgradeError_PackageUpgradeErrorKind$1[PackageUpgradeError_PackageUpgradeErrorKind$1["PACKAGE_ID_DOES_NOT_MATCH"] = 6] = "PACKAGE_ID_DOES_NOT_MATCH";
  return PackageUpgradeError_PackageUpgradeErrorKind$1;
}({});
var TypeArgumentError_TypeArgumentErrorKind = /* @__PURE__ */ function(TypeArgumentError_TypeArgumentErrorKind$1) {
  TypeArgumentError_TypeArgumentErrorKind$1[TypeArgumentError_TypeArgumentErrorKind$1["TYPE_ARGUMENT_ERROR_KIND_UNKNOWN"] = 0] = "TYPE_ARGUMENT_ERROR_KIND_UNKNOWN";
  TypeArgumentError_TypeArgumentErrorKind$1[TypeArgumentError_TypeArgumentErrorKind$1["TYPE_NOT_FOUND"] = 1] = "TYPE_NOT_FOUND";
  TypeArgumentError_TypeArgumentErrorKind$1[TypeArgumentError_TypeArgumentErrorKind$1["CONSTRAINT_NOT_SATISFIED"] = 2] = "CONSTRAINT_NOT_SATISFIED";
  return TypeArgumentError_TypeArgumentErrorKind$1;
}({});
var ExecutionStatus$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecutionStatus", [{
      no: 1,
      name: "success",
      kind: "scalar",
      opt: true,
      T: 8
    }, {
      no: 2,
      name: "error",
      kind: "message",
      T: () => ExecutionError
    }]);
  }
};
var ExecutionStatus2 = new ExecutionStatus$Type();
var ExecutionError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecutionError", [
      {
        no: 1,
        name: "description",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "command",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.ExecutionError.ExecutionErrorKind", ExecutionError_ExecutionErrorKind]
      },
      {
        no: 4,
        name: "abort",
        kind: "message",
        oneof: "errorDetails",
        T: () => MoveAbort
      },
      {
        no: 5,
        name: "size_error",
        kind: "message",
        oneof: "errorDetails",
        T: () => SizeError
      },
      {
        no: 6,
        name: "command_argument_error",
        kind: "message",
        oneof: "errorDetails",
        T: () => CommandArgumentError2
      },
      {
        no: 7,
        name: "type_argument_error",
        kind: "message",
        oneof: "errorDetails",
        T: () => TypeArgumentError2
      },
      {
        no: 8,
        name: "package_upgrade_error",
        kind: "message",
        oneof: "errorDetails",
        T: () => PackageUpgradeError2
      },
      {
        no: 9,
        name: "index_error",
        kind: "message",
        oneof: "errorDetails",
        T: () => IndexError
      },
      {
        no: 10,
        name: "object_id",
        kind: "scalar",
        oneof: "errorDetails",
        T: 9
      },
      {
        no: 11,
        name: "coin_deny_list_error",
        kind: "message",
        oneof: "errorDetails",
        T: () => CoinDenyListError
      },
      {
        no: 12,
        name: "congested_objects",
        kind: "message",
        oneof: "errorDetails",
        T: () => CongestedObjects
      }
    ]);
  }
};
var ExecutionError = new ExecutionError$Type();
var MoveAbort$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MoveAbort", [
      {
        no: 1,
        name: "abort_code",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "location",
        kind: "message",
        T: () => MoveLocation2
      },
      {
        no: 3,
        name: "clever_error",
        kind: "message",
        T: () => CleverError
      }
    ]);
  }
};
var MoveAbort = new MoveAbort$Type();
var MoveLocation$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MoveLocation", [
      {
        no: 1,
        name: "package",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "module",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "function",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 4,
        name: "instruction",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 5,
        name: "function_name",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var MoveLocation2 = new MoveLocation$Type();
var CleverError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CleverError", [
      {
        no: 1,
        name: "error_code",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "line_number",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "constant_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "constant_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "rendered",
        kind: "scalar",
        oneof: "value",
        T: 9
      },
      {
        no: 6,
        name: "raw",
        kind: "scalar",
        oneof: "value",
        T: 12
      }
    ]);
  }
};
var CleverError = new CleverError$Type();
var SizeError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SizeError", [{
      no: 1,
      name: "size",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }, {
      no: 2,
      name: "max_size",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var SizeError = new SizeError$Type();
var IndexError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.IndexError", [{
      no: 1,
      name: "index",
      kind: "scalar",
      opt: true,
      T: 13
    }, {
      no: 2,
      name: "subresult",
      kind: "scalar",
      opt: true,
      T: 13
    }]);
  }
};
var IndexError = new IndexError$Type();
var CoinDenyListError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CoinDenyListError", [{
      no: 1,
      name: "address",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "coin_type",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var CoinDenyListError = new CoinDenyListError$Type();
var CongestedObjects$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CongestedObjects", [{
      no: 1,
      name: "objects",
      kind: "scalar",
      repeat: 2,
      T: 9
    }]);
  }
};
var CongestedObjects = new CongestedObjects$Type();
var CommandArgumentError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CommandArgumentError", [
      {
        no: 1,
        name: "argument",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 2,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.CommandArgumentError.CommandArgumentErrorKind", CommandArgumentError_CommandArgumentErrorKind]
      },
      {
        no: 3,
        name: "index_error",
        kind: "message",
        T: () => IndexError
      }
    ]);
  }
};
var CommandArgumentError2 = new CommandArgumentError$Type();
var PackageUpgradeError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.PackageUpgradeError", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.PackageUpgradeError.PackageUpgradeErrorKind", PackageUpgradeError_PackageUpgradeErrorKind]
      },
      {
        no: 2,
        name: "package_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "policy",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 5,
        name: "ticket_id",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var PackageUpgradeError2 = new PackageUpgradeError$Type();
var TypeArgumentError$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TypeArgumentError", [{
      no: 1,
      name: "type_argument",
      kind: "scalar",
      opt: true,
      T: 13
    }, {
      no: 2,
      name: "kind",
      kind: "enum",
      opt: true,
      T: () => ["sui.rpc.v2.TypeArgumentError.TypeArgumentErrorKind", TypeArgumentError_TypeArgumentErrorKind]
    }]);
  }
};
var TypeArgumentError2 = new TypeArgumentError$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/gas_cost_summary.mjs
var GasCostSummary$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GasCostSummary", [
      {
        no: 1,
        name: "computation_cost",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "storage_cost",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "storage_rebate",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "non_refundable_storage_fee",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var GasCostSummary2 = new GasCostSummary$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/effects.mjs
var ChangedObject_InputObjectState = /* @__PURE__ */ function(ChangedObject_InputObjectState$1) {
  ChangedObject_InputObjectState$1[ChangedObject_InputObjectState$1["UNKNOWN"] = 0] = "UNKNOWN";
  ChangedObject_InputObjectState$1[ChangedObject_InputObjectState$1["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
  ChangedObject_InputObjectState$1[ChangedObject_InputObjectState$1["EXISTS"] = 2] = "EXISTS";
  return ChangedObject_InputObjectState$1;
}({});
var ChangedObject_OutputObjectState = /* @__PURE__ */ function(ChangedObject_OutputObjectState$1) {
  ChangedObject_OutputObjectState$1[ChangedObject_OutputObjectState$1["UNKNOWN"] = 0] = "UNKNOWN";
  ChangedObject_OutputObjectState$1[ChangedObject_OutputObjectState$1["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
  ChangedObject_OutputObjectState$1[ChangedObject_OutputObjectState$1["OBJECT_WRITE"] = 2] = "OBJECT_WRITE";
  ChangedObject_OutputObjectState$1[ChangedObject_OutputObjectState$1["PACKAGE_WRITE"] = 3] = "PACKAGE_WRITE";
  ChangedObject_OutputObjectState$1[ChangedObject_OutputObjectState$1["ACCUMULATOR_WRITE"] = 4] = "ACCUMULATOR_WRITE";
  return ChangedObject_OutputObjectState$1;
}({});
var ChangedObject_IdOperation = /* @__PURE__ */ function(ChangedObject_IdOperation$1) {
  ChangedObject_IdOperation$1[ChangedObject_IdOperation$1["ID_OPERATION_UNKNOWN"] = 0] = "ID_OPERATION_UNKNOWN";
  ChangedObject_IdOperation$1[ChangedObject_IdOperation$1["NONE"] = 1] = "NONE";
  ChangedObject_IdOperation$1[ChangedObject_IdOperation$1["CREATED"] = 2] = "CREATED";
  ChangedObject_IdOperation$1[ChangedObject_IdOperation$1["DELETED"] = 3] = "DELETED";
  return ChangedObject_IdOperation$1;
}({});
var AccumulatorWrite_AccumulatorOperation = /* @__PURE__ */ function(AccumulatorWrite_AccumulatorOperation$1) {
  AccumulatorWrite_AccumulatorOperation$1[AccumulatorWrite_AccumulatorOperation$1["ACCUMULATOR_OPERATION_UNKNOWN"] = 0] = "ACCUMULATOR_OPERATION_UNKNOWN";
  AccumulatorWrite_AccumulatorOperation$1[AccumulatorWrite_AccumulatorOperation$1["MERGE"] = 1] = "MERGE";
  AccumulatorWrite_AccumulatorOperation$1[AccumulatorWrite_AccumulatorOperation$1["SPLIT"] = 2] = "SPLIT";
  return AccumulatorWrite_AccumulatorOperation$1;
}({});
var UnchangedConsensusObject_UnchangedConsensusObjectKind = /* @__PURE__ */ function(UnchangedConsensusObject_UnchangedConsensusObjectKind$1) {
  UnchangedConsensusObject_UnchangedConsensusObjectKind$1[UnchangedConsensusObject_UnchangedConsensusObjectKind$1["UNCHANGED_CONSENSUS_OBJECT_KIND_UNKNOWN"] = 0] = "UNCHANGED_CONSENSUS_OBJECT_KIND_UNKNOWN";
  UnchangedConsensusObject_UnchangedConsensusObjectKind$1[UnchangedConsensusObject_UnchangedConsensusObjectKind$1["READ_ONLY_ROOT"] = 1] = "READ_ONLY_ROOT";
  UnchangedConsensusObject_UnchangedConsensusObjectKind$1[UnchangedConsensusObject_UnchangedConsensusObjectKind$1["MUTATE_CONSENSUS_STREAM_ENDED"] = 2] = "MUTATE_CONSENSUS_STREAM_ENDED";
  UnchangedConsensusObject_UnchangedConsensusObjectKind$1[UnchangedConsensusObject_UnchangedConsensusObjectKind$1["READ_CONSENSUS_STREAM_ENDED"] = 3] = "READ_CONSENSUS_STREAM_ENDED";
  UnchangedConsensusObject_UnchangedConsensusObjectKind$1[UnchangedConsensusObject_UnchangedConsensusObjectKind$1["CANCELED"] = 4] = "CANCELED";
  UnchangedConsensusObject_UnchangedConsensusObjectKind$1[UnchangedConsensusObject_UnchangedConsensusObjectKind$1["PER_EPOCH_CONFIG"] = 5] = "PER_EPOCH_CONFIG";
  return UnchangedConsensusObject_UnchangedConsensusObjectKind$1;
}({});
var TransactionEffects$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TransactionEffects", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 5
      },
      {
        no: 4,
        name: "status",
        kind: "message",
        T: () => ExecutionStatus2
      },
      {
        no: 5,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "gas_used",
        kind: "message",
        T: () => GasCostSummary2
      },
      {
        no: 7,
        name: "transaction_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 8,
        name: "gas_object",
        kind: "message",
        T: () => ChangedObject
      },
      {
        no: 9,
        name: "events_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 10,
        name: "dependencies",
        kind: "scalar",
        repeat: 2,
        T: 9
      },
      {
        no: 11,
        name: "lamport_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 12,
        name: "changed_objects",
        kind: "message",
        repeat: 1,
        T: () => ChangedObject
      },
      {
        no: 13,
        name: "unchanged_consensus_objects",
        kind: "message",
        repeat: 1,
        T: () => UnchangedConsensusObject
      },
      {
        no: 14,
        name: "auxiliary_data_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 15,
        name: "unchanged_loaded_runtime_objects",
        kind: "message",
        repeat: 1,
        T: () => ObjectReference
      }
    ]);
  }
};
var TransactionEffects2 = new TransactionEffects$Type();
var ChangedObject$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ChangedObject", [
      {
        no: 1,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "input_state",
        kind: "enum",
        opt: true,
        T: () => [
          "sui.rpc.v2.ChangedObject.InputObjectState",
          ChangedObject_InputObjectState,
          "INPUT_OBJECT_STATE_"
        ]
      },
      {
        no: 3,
        name: "input_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "input_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "input_owner",
        kind: "message",
        T: () => Owner2
      },
      {
        no: 6,
        name: "output_state",
        kind: "enum",
        opt: true,
        T: () => [
          "sui.rpc.v2.ChangedObject.OutputObjectState",
          ChangedObject_OutputObjectState,
          "OUTPUT_OBJECT_STATE_"
        ]
      },
      {
        no: 7,
        name: "output_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 8,
        name: "output_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 9,
        name: "output_owner",
        kind: "message",
        T: () => Owner2
      },
      {
        no: 12,
        name: "accumulator_write",
        kind: "message",
        T: () => AccumulatorWrite
      },
      {
        no: 10,
        name: "id_operation",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.ChangedObject.IdOperation", ChangedObject_IdOperation]
      },
      {
        no: 11,
        name: "object_type",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var ChangedObject = new ChangedObject$Type();
var AccumulatorWrite$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.AccumulatorWrite", [
      {
        no: 1,
        name: "address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "accumulator_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "operation",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.AccumulatorWrite.AccumulatorOperation", AccumulatorWrite_AccumulatorOperation]
      },
      {
        no: 5,
        name: "value",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var AccumulatorWrite = new AccumulatorWrite$Type();
var UnchangedConsensusObject$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.UnchangedConsensusObject", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.UnchangedConsensusObject.UnchangedConsensusObjectKind", UnchangedConsensusObject_UnchangedConsensusObjectKind]
      },
      {
        no: 2,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "object_type",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var UnchangedConsensusObject = new UnchangedConsensusObject$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/core.mjs
var GrpcCoreClient = class extends CoreClient {
  #client;
  constructor({ client, ...options }) {
    super(options);
    this.#client = client;
  }
  async getObjects(options) {
    const batches = chunk(options.objectIds, 50);
    const results = [];
    const paths = [
      "owner",
      "object_type",
      "digest",
      "version",
      "object_id"
    ];
    if (options.include?.content)
      paths.push("contents");
    if (options.include?.previousTransaction)
      paths.push("previous_transaction");
    if (options.include?.objectBcs)
      paths.push("bcs");
    if (options.include?.json)
      paths.push("json");
    for (const batch of batches) {
      const response = await this.#client.ledgerService.batchGetObjects({
        requests: batch.map((id) => ({ objectId: id })),
        readMask: { paths }
      });
      results.push(...response.response.objects.map((object2) => {
        if (object2.result.oneofKind === "error")
          return new Error(object2.result.error.message);
        if (object2.result.oneofKind !== "object")
          return /* @__PURE__ */ new Error("Unexpected result type");
        const bcsContent = object2.result.object.contents?.value ?? void 0;
        const objectBcs = object2.result.object.bcs?.value ?? void 0;
        const objectType = object2.result.object.objectType;
        const type = objectType && objectType.includes("::") ? normalizeStructTag(objectType) : objectType ?? "";
        const jsonContent = options.include?.json ? object2.result.object.json ? Value.toJson(object2.result.object.json) : null : void 0;
        return {
          objectId: object2.result.object.objectId,
          version: object2.result.object.version?.toString(),
          digest: object2.result.object.digest,
          content: bcsContent,
          owner: mapOwner(object2.result.object.owner),
          type,
          previousTransaction: object2.result.object.previousTransaction ?? void 0,
          objectBcs,
          json: jsonContent
        };
      }));
    }
    return { objects: results };
  }
  async listOwnedObjects(options) {
    const paths = [
      "owner",
      "object_type",
      "digest",
      "version",
      "object_id"
    ];
    if (options.include?.content)
      paths.push("contents");
    if (options.include?.previousTransaction)
      paths.push("previous_transaction");
    if (options.include?.objectBcs)
      paths.push("bcs");
    if (options.include?.json)
      paths.push("json");
    const response = await this.#client.stateService.listOwnedObjects({
      owner: options.owner,
      objectType: options.type ? (await this.mvr.resolveType({ type: options.type })).type : void 0,
      pageToken: options.cursor ? fromBase64(options.cursor) : void 0,
      pageSize: options.limit,
      readMask: { paths }
    });
    return {
      objects: response.response.objects.map((object2) => ({
        objectId: object2.objectId,
        version: object2.version?.toString(),
        digest: object2.digest,
        content: object2.contents?.value,
        owner: mapOwner(object2.owner),
        type: object2.objectType,
        previousTransaction: object2.previousTransaction ?? void 0,
        objectBcs: object2.bcs?.value,
        json: options.include?.json ? object2.json ? Value.toJson(object2.json) : null : void 0
      })),
      cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
      hasNextPage: response.response.nextPageToken !== void 0
    };
  }
  async listCoins(options) {
    const paths = [
      "owner",
      "object_type",
      "digest",
      "version",
      "object_id",
      "balance"
    ];
    const coinType = options.coinType ?? SUI_TYPE_ARG;
    const response = await this.#client.stateService.listOwnedObjects({
      owner: options.owner,
      objectType: `0x2::coin::Coin<${(await this.mvr.resolveType({ type: coinType })).type}>`,
      pageToken: options.cursor ? fromBase64(options.cursor) : void 0,
      readMask: { paths }
    });
    return {
      objects: response.response.objects.map((object2) => ({
        objectId: object2.objectId,
        version: object2.version?.toString(),
        digest: object2.digest,
        owner: mapOwner(object2.owner),
        type: object2.objectType,
        balance: object2.balance?.toString()
      })),
      cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
      hasNextPage: response.response.nextPageToken !== void 0
    };
  }
  async getBalance(options) {
    const coinType = options.coinType ?? SUI_TYPE_ARG;
    const result = await this.#client.stateService.getBalance({
      owner: options.owner,
      coinType: (await this.mvr.resolveType({ type: coinType })).type
    });
    return { balance: {
      balance: result.response.balance?.balance?.toString() ?? "0",
      coinType: result.response.balance?.coinType ?? coinType,
      coinBalance: result.response.balance?.coinBalance?.toString() ?? "0",
      addressBalance: result.response.balance?.addressBalance?.toString() ?? "0"
    } };
  }
  async getCoinMetadata(options) {
    const coinType = (await this.mvr.resolveType({ type: options.coinType })).type;
    let response;
    try {
      ({ response } = await this.#client.stateService.getCoinInfo({ coinType }));
    } catch {
      return { coinMetadata: null };
    }
    if (!response.metadata)
      return { coinMetadata: null };
    return { coinMetadata: {
      id: response.metadata.id ?? null,
      decimals: response.metadata.decimals ?? 0,
      name: response.metadata.name ?? "",
      symbol: response.metadata.symbol ?? "",
      description: response.metadata.description ?? "",
      iconUrl: response.metadata.iconUrl ?? null
    } };
  }
  async listBalances(options) {
    const result = await this.#client.stateService.listBalances({
      owner: options.owner,
      pageToken: options.cursor ? fromBase64(options.cursor) : void 0,
      pageSize: options.limit
    });
    return {
      hasNextPage: !!result.response.nextPageToken,
      cursor: result.response.nextPageToken ? toBase64(result.response.nextPageToken) : null,
      balances: result.response.balances.map((balance) => ({
        balance: balance.balance?.toString() ?? "0",
        coinType: balance.coinType,
        coinBalance: balance.coinBalance?.toString() ?? "0",
        addressBalance: balance.addressBalance?.toString() ?? "0"
      }))
    };
  }
  async getTransaction(options) {
    const paths = [
      "digest",
      "transaction.digest",
      "signatures",
      "effects.status"
    ];
    if (options.include?.transaction)
      paths.push("transaction.sender", "transaction.gas_payment", "transaction.expiration", "transaction.kind");
    if (options.include?.bcs)
      paths.push("transaction.bcs");
    if (options.include?.balanceChanges)
      paths.push("balance_changes");
    if (options.include?.effects)
      paths.push("effects");
    if (options.include?.events)
      paths.push("events");
    if (options.include?.objectTypes) {
      paths.push("effects.changed_objects.object_type");
      paths.push("effects.changed_objects.object_id");
    }
    const { response } = await this.#client.ledgerService.getTransaction({
      digest: options.digest,
      readMask: { paths }
    });
    if (!response.transaction)
      throw new Error(`Transaction ${options.digest} not found`);
    return parseTransaction(response.transaction, options.include);
  }
  async executeTransaction(options) {
    const paths = [
      "digest",
      "transaction.digest",
      "signatures",
      "effects.status"
    ];
    if (options.include?.transaction)
      paths.push("transaction.sender", "transaction.gas_payment", "transaction.expiration", "transaction.kind");
    if (options.include?.bcs)
      paths.push("transaction.bcs");
    if (options.include?.balanceChanges)
      paths.push("balance_changes");
    if (options.include?.effects)
      paths.push("effects");
    if (options.include?.events)
      paths.push("events");
    if (options.include?.objectTypes) {
      paths.push("effects.changed_objects.object_type");
      paths.push("effects.changed_objects.object_id");
    }
    const { response } = await this.#client.transactionExecutionService.executeTransaction({
      transaction: { bcs: { value: options.transaction } },
      signatures: options.signatures.map((signature) => ({
        bcs: { value: fromBase64(signature) },
        signature: { oneofKind: void 0 }
      })),
      readMask: { paths }
    });
    return parseTransaction(response.transaction, options.include);
  }
  async simulateTransaction(options) {
    const paths = [
      "transaction.digest",
      "transaction.transaction.digest",
      "transaction.signatures",
      "transaction.effects.status"
    ];
    if (options.include?.transaction)
      paths.push("transaction.transaction.sender", "transaction.transaction.gas_payment", "transaction.transaction.expiration", "transaction.transaction.kind");
    if (options.include?.bcs)
      paths.push("transaction.transaction.bcs");
    if (options.include?.balanceChanges)
      paths.push("transaction.balance_changes");
    if (options.include?.effects)
      paths.push("transaction.effects");
    if (options.include?.events)
      paths.push("transaction.events");
    if (options.include?.objectTypes) {
      paths.push("transaction.effects.changed_objects.object_type");
      paths.push("transaction.effects.changed_objects.object_id");
    }
    if (options.include?.commandResults)
      paths.push("command_outputs");
    if (!(options.transaction instanceof Uint8Array))
      await options.transaction.prepareForSerialization({ client: this });
    const { response } = await this.#client.transactionExecutionService.simulateTransaction({
      transaction: options.transaction instanceof Uint8Array ? { bcs: { value: options.transaction } } : transactionToGrpcTransaction(options.transaction),
      readMask: { paths },
      doGasSelection: false
    });
    const transactionResult = parseTransaction(response.transaction, options.include);
    const commandResults = options.include?.commandResults && response.commandOutputs ? response.commandOutputs.map((output) => ({
      returnValues: (output.returnValues ?? []).map((rv) => ({ bcs: rv.value?.value ?? null })),
      mutatedReferences: (output.mutatedByRef ?? []).map((mr) => ({ bcs: mr.value?.value ?? null }))
    })) : void 0;
    if (transactionResult.$kind === "Transaction")
      return {
        $kind: "Transaction",
        Transaction: transactionResult.Transaction,
        commandResults
      };
    else
      return {
        $kind: "FailedTransaction",
        FailedTransaction: transactionResult.FailedTransaction,
        commandResults
      };
  }
  async getReferenceGasPrice() {
    return { referenceGasPrice: (await this.#client.ledgerService.getEpoch({ readMask: { paths: ["reference_gas_price"] } })).response.epoch?.referenceGasPrice?.toString() ?? "" };
  }
  async getCurrentSystemState() {
    const epoch = (await this.#client.ledgerService.getEpoch({ readMask: { paths: [
      "system_state.version",
      "system_state.epoch",
      "system_state.protocol_version",
      "system_state.reference_gas_price",
      "system_state.epoch_start_timestamp_ms",
      "system_state.safe_mode",
      "system_state.safe_mode_storage_rewards",
      "system_state.safe_mode_computation_rewards",
      "system_state.safe_mode_storage_rebates",
      "system_state.safe_mode_non_refundable_storage_fee",
      "system_state.parameters",
      "system_state.storage_fund",
      "system_state.stake_subsidy"
    ] } })).response.epoch;
    const systemState = epoch?.systemState;
    if (!systemState)
      throw new Error("System state not found in response");
    const startMs = epoch?.start?.seconds ? Number(epoch.start.seconds) * 1e3 + Math.floor((epoch.start.nanos || 0) / 1e6) : systemState.epochStartTimestampMs ? Number(systemState.epochStartTimestampMs) : null;
    return { systemState: {
      systemStateVersion: systemState.version?.toString() ?? null,
      epoch: systemState.epoch?.toString() ?? null,
      protocolVersion: systemState.protocolVersion?.toString() ?? null,
      referenceGasPrice: systemState.referenceGasPrice?.toString() ?? null,
      epochStartTimestampMs: startMs.toString(),
      safeMode: systemState.safeMode ?? false,
      safeModeStorageRewards: systemState.safeModeStorageRewards?.toString() ?? null,
      safeModeComputationRewards: systemState.safeModeComputationRewards?.toString() ?? null,
      safeModeStorageRebates: systemState.safeModeStorageRebates?.toString() ?? null,
      safeModeNonRefundableStorageFee: systemState.safeModeNonRefundableStorageFee?.toString() ?? null,
      parameters: {
        epochDurationMs: systemState.parameters?.epochDurationMs?.toString() ?? null,
        stakeSubsidyStartEpoch: systemState.parameters?.stakeSubsidyStartEpoch?.toString() ?? null,
        maxValidatorCount: systemState.parameters?.maxValidatorCount?.toString() ?? null,
        minValidatorJoiningStake: systemState.parameters?.minValidatorJoiningStake?.toString() ?? null,
        validatorLowStakeThreshold: systemState.parameters?.validatorLowStakeThreshold?.toString() ?? null,
        validatorLowStakeGracePeriod: systemState.parameters?.validatorLowStakeGracePeriod?.toString() ?? null
      },
      storageFund: {
        totalObjectStorageRebates: systemState.storageFund?.totalObjectStorageRebates?.toString() ?? null,
        nonRefundableBalance: systemState.storageFund?.nonRefundableBalance?.toString() ?? null
      },
      stakeSubsidy: {
        balance: systemState.stakeSubsidy?.balance?.toString() ?? null,
        distributionCounter: systemState.stakeSubsidy?.distributionCounter?.toString() ?? null,
        currentDistributionAmount: systemState.stakeSubsidy?.currentDistributionAmount?.toString() ?? null,
        stakeSubsidyPeriodLength: systemState.stakeSubsidy?.stakeSubsidyPeriodLength?.toString() ?? null,
        stakeSubsidyDecreaseRate: systemState.stakeSubsidy?.stakeSubsidyDecreaseRate ?? null
      }
    } };
  }
  async listDynamicFields(options) {
    return this.#client.listDynamicFields(options);
  }
  async verifyZkLoginSignature(options) {
    const messageBytes = fromBase64(options.bytes);
    const messageValue = options.intentScope === "PersonalMessage" ? suiBcs.byteVector().serialize(messageBytes).toBytes() : messageBytes;
    const { response } = await this.#client.signatureVerificationService.verifySignature({
      message: {
        name: options.intentScope,
        value: messageValue
      },
      signature: {
        bcs: { value: fromBase64(options.signature) },
        signature: { oneofKind: void 0 }
      },
      address: options.address,
      jwks: []
    });
    return {
      success: response.isValid ?? false,
      errors: response.reason ? [response.reason] : []
    };
  }
  async defaultNameServiceName(options) {
    return { data: { name: (await this.#client.nameService.reverseLookupName({ address: options.address })).response.record?.name ?? null } };
  }
  async getMoveFunction(options) {
    const resolvedPackageId = (await this.mvr.resolvePackage({ package: options.packageId })).package;
    const { response } = await this.#client.movePackageService.getFunction({
      packageId: resolvedPackageId,
      moduleName: options.moduleName,
      name: options.name
    });
    let visibility = "unknown";
    switch (response.function?.visibility) {
      case FunctionDescriptor_Visibility.PUBLIC:
        visibility = "public";
        break;
      case FunctionDescriptor_Visibility.PRIVATE:
        visibility = "private";
        break;
      case FunctionDescriptor_Visibility.FRIEND:
        visibility = "friend";
        break;
    }
    return { function: {
      packageId: normalizeSuiAddress(resolvedPackageId),
      moduleName: options.moduleName,
      name: response.function?.name,
      visibility,
      isEntry: response.function?.isEntry ?? false,
      typeParameters: response.function?.typeParameters?.map(({ constraints }) => ({
        isPhantom: false,
        constraints: constraints.map((constraint) => {
          switch (constraint) {
            case Ability.COPY:
              return "copy";
            case Ability.DROP:
              return "drop";
            case Ability.STORE:
              return "store";
            case Ability.KEY:
              return "key";
            default:
              return "unknown";
          }
        }) ?? []
      })) ?? [],
      parameters: response.function?.parameters?.map((param) => parseNormalizedSuiMoveType(param)) ?? [],
      returns: response.function?.returns?.map((ret) => parseNormalizedSuiMoveType(ret)) ?? []
    } };
  }
  async getChainIdentifier(_options) {
    return this.cache.read(["chainIdentifier"], async () => {
      const { response } = await this.#client.ledgerService.getServiceInfo({});
      if (!response.chainId)
        throw new Error("Chain identifier not found in service info");
      return { chainIdentifier: response.chainId };
    });
  }
  resolveTransactionPlugin() {
    const client = this.#client;
    return async function resolveTransactionData(transactionData, options, next) {
      const snapshot = transactionData.snapshot();
      if (!snapshot.sender)
        snapshot.sender = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const grpcTransaction = transactionDataToGrpcTransaction(snapshot);
      let response;
      try {
        response = (await client.transactionExecutionService.simulateTransaction({
          transaction: grpcTransaction,
          doGasSelection: !options.onlyTransactionKind && (snapshot.gasData.budget == null || snapshot.gasData.payment == null),
          readMask: { paths: [
            "transaction.transaction.sender",
            "transaction.transaction.gas_payment",
            "transaction.transaction.expiration",
            "transaction.transaction.kind",
            "transaction.effects.status"
          ] }
        })).response;
      } catch (error) {
        if (error instanceof Error && error.message)
          throw new SimulationError(decodeURIComponent(error.message), { cause: error });
        throw error;
      }
      if (!options.onlyTransactionKind && response.transaction?.effects?.status && !response.transaction.effects.status.success) {
        const executionError = response.transaction.effects.status.error ? parseGrpcExecutionError(response.transaction.effects.status.error) : void 0;
        throw new SimulationError(`Transaction resolution failed: ${executionError?.message ?? "Transaction failed"}`, { executionError });
      }
      if (!response.transaction?.transaction)
        throw new Error("simulateTransaction did not return resolved transaction data");
      applyGrpcResolvedTransaction(transactionData, response.transaction.transaction, options);
      return await next();
    };
  }
};
function mapOwner(owner) {
  if (!owner)
    return null;
  if (owner.kind === Owner_OwnerKind.IMMUTABLE)
    return {
      $kind: "Immutable",
      Immutable: true
    };
  if (owner.kind === Owner_OwnerKind.ADDRESS)
    return {
      AddressOwner: owner.address,
      $kind: "AddressOwner"
    };
  if (owner.kind === Owner_OwnerKind.OBJECT)
    return {
      $kind: "ObjectOwner",
      ObjectOwner: owner.address
    };
  if (owner.kind === Owner_OwnerKind.SHARED)
    return {
      $kind: "Shared",
      Shared: { initialSharedVersion: owner.version?.toString() }
    };
  if (owner.kind === Owner_OwnerKind.CONSENSUS_ADDRESS)
    return {
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: {
        startVersion: owner.version?.toString(),
        owner: owner.address
      }
    };
  throw new Error(`Unknown owner kind ${JSON.stringify(owner, (_k, v) => typeof v === "bigint" ? v.toString() : v)}`);
}
function parseGrpcExecutionError(error) {
  const message = error.description ?? "Unknown error";
  const command = error.command != null ? Number(error.command) : void 0;
  const details = error.errorDetails;
  switch (details?.oneofKind) {
    case "abort": {
      const abort = details.abort;
      const cleverError = abort.cleverError;
      return {
        $kind: "MoveAbort",
        message: formatMoveAbortMessage({
          command,
          location: abort.location,
          abortCode: String(abort.abortCode ?? 0n),
          cleverError: cleverError ? {
            lineNumber: cleverError.lineNumber != null ? Number(cleverError.lineNumber) : void 0,
            constantName: cleverError.constantName,
            value: cleverError.value?.oneofKind === "rendered" ? cleverError.value.rendered : void 0
          } : void 0
        }),
        command,
        MoveAbort: parseMoveAbort(abort)
      };
    }
    case "sizeError":
      return {
        $kind: "SizeError",
        message,
        command,
        SizeError: {
          name: mapErrorName(error.kind),
          size: Number(details.sizeError.size ?? 0n),
          maxSize: Number(details.sizeError.maxSize ?? 0n)
        }
      };
    case "commandArgumentError":
      return {
        $kind: "CommandArgumentError",
        message,
        command,
        CommandArgumentError: {
          argument: details.commandArgumentError.argument ?? 0,
          name: mapErrorName(details.commandArgumentError.kind)
        }
      };
    case "typeArgumentError":
      return {
        $kind: "TypeArgumentError",
        message,
        command,
        TypeArgumentError: {
          typeArgument: details.typeArgumentError.typeArgument ?? 0,
          name: mapErrorName(details.typeArgumentError.kind)
        }
      };
    case "packageUpgradeError":
      return {
        $kind: "PackageUpgradeError",
        message,
        command,
        PackageUpgradeError: {
          name: mapErrorName(details.packageUpgradeError.kind),
          packageId: details.packageUpgradeError.packageId,
          digest: details.packageUpgradeError.digest
        }
      };
    case "indexError":
      return {
        $kind: "IndexError",
        message,
        command,
        IndexError: {
          index: details.indexError.index,
          subresult: details.indexError.subresult
        }
      };
    case "coinDenyListError":
      return {
        $kind: "CoinDenyListError",
        message,
        command,
        CoinDenyListError: {
          name: mapErrorName(error.kind),
          coinType: details.coinDenyListError.coinType,
          address: details.coinDenyListError.address
        }
      };
    case "congestedObjects":
      return {
        $kind: "CongestedObjects",
        message,
        command,
        CongestedObjects: {
          name: mapErrorName(error.kind),
          objects: details.congestedObjects.objects
        }
      };
    case "objectId":
      return {
        $kind: "ObjectIdError",
        message,
        command,
        ObjectIdError: {
          name: mapErrorName(error.kind),
          objectId: details.objectId
        }
      };
    default:
      return {
        $kind: "Unknown",
        message,
        command,
        Unknown: null
      };
  }
}
function parseMoveAbort(abort) {
  return {
    abortCode: String(abort.abortCode ?? 0n),
    location: { ...abort.location },
    cleverError: abort.cleverError ? {
      errorCode: abort.cleverError.errorCode != null ? Number(abort.cleverError.errorCode) : void 0,
      lineNumber: abort.cleverError.lineNumber != null ? Number(abort.cleverError.lineNumber) : void 0,
      constantName: abort.cleverError.constantName,
      constantType: abort.cleverError.constantType,
      value: abort.cleverError.value?.oneofKind === "rendered" ? abort.cleverError.value.rendered : abort.cleverError.value?.oneofKind === "raw" ? toBase64(abort.cleverError.value.raw) : void 0
    } : void 0
  };
}
function mapErrorName(kind) {
  if (kind == null)
    return "Unknown";
  const name = CommandArgumentError_CommandArgumentErrorKind[kind];
  if (!name || name.endsWith("_UNKNOWN"))
    return "Unknown";
  return name.split("_").map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join("");
}
function mapIdOperation(operation) {
  if (operation == null)
    return null;
  switch (operation) {
    case ChangedObject_IdOperation.CREATED:
      return "Created";
    case ChangedObject_IdOperation.DELETED:
      return "Deleted";
    case ChangedObject_IdOperation.NONE:
    case ChangedObject_IdOperation.ID_OPERATION_UNKNOWN:
      return "None";
    default:
      return "Unknown";
  }
}
function mapInputObjectState(state) {
  if (state == null)
    return null;
  switch (state) {
    case ChangedObject_InputObjectState.EXISTS:
      return "Exists";
    case ChangedObject_InputObjectState.DOES_NOT_EXIST:
      return "DoesNotExist";
    case ChangedObject_InputObjectState.UNKNOWN:
      return "Unknown";
    default:
      return "Unknown";
  }
}
function mapOutputObjectState(state) {
  if (state == null)
    return null;
  switch (state) {
    case ChangedObject_OutputObjectState.OBJECT_WRITE:
      return "ObjectWrite";
    case ChangedObject_OutputObjectState.PACKAGE_WRITE:
      return "PackageWrite";
    case ChangedObject_OutputObjectState.DOES_NOT_EXIST:
      return "DoesNotExist";
    case ChangedObject_OutputObjectState.ACCUMULATOR_WRITE:
      return "AccumulatorWriteV1";
    case ChangedObject_OutputObjectState.UNKNOWN:
      return "Unknown";
    default:
      return "Unknown";
  }
}
function mapUnchangedConsensusObjectKind(kind) {
  if (kind == null)
    return null;
  switch (kind) {
    case UnchangedConsensusObject_UnchangedConsensusObjectKind.UNCHANGED_CONSENSUS_OBJECT_KIND_UNKNOWN:
      return "Unknown";
    case UnchangedConsensusObject_UnchangedConsensusObjectKind.READ_ONLY_ROOT:
      return "ReadOnlyRoot";
    case UnchangedConsensusObject_UnchangedConsensusObjectKind.MUTATE_CONSENSUS_STREAM_ENDED:
      return "MutateConsensusStreamEnded";
    case UnchangedConsensusObject_UnchangedConsensusObjectKind.READ_CONSENSUS_STREAM_ENDED:
      return "ReadConsensusStreamEnded";
    case UnchangedConsensusObject_UnchangedConsensusObjectKind.CANCELED:
      return "Cancelled";
    case UnchangedConsensusObject_UnchangedConsensusObjectKind.PER_EPOCH_CONFIG:
      return "PerEpochConfig";
    default:
      return "Unknown";
  }
}
function parseTransactionEffects({ effects }) {
  if (!effects)
    return null;
  const changedObjects = effects.changedObjects.map((change) => {
    return {
      objectId: change.objectId,
      inputState: mapInputObjectState(change.inputState),
      inputVersion: change.inputVersion?.toString() ?? null,
      inputDigest: change.inputDigest ?? null,
      inputOwner: mapOwner(change.inputOwner),
      outputState: mapOutputObjectState(change.outputState),
      outputVersion: change.outputVersion?.toString() ?? null,
      outputDigest: change.outputDigest ?? null,
      outputOwner: mapOwner(change.outputOwner),
      idOperation: mapIdOperation(change.idOperation)
    };
  });
  return {
    bcs: effects.bcs?.value,
    version: 2,
    status: effects.status?.success ? {
      success: true,
      error: null
    } : {
      success: false,
      error: parseGrpcExecutionError(effects.status.error)
    },
    gasUsed: {
      computationCost: effects.gasUsed?.computationCost?.toString(),
      storageCost: effects.gasUsed?.storageCost?.toString(),
      storageRebate: effects.gasUsed?.storageRebate?.toString(),
      nonRefundableStorageFee: effects.gasUsed?.nonRefundableStorageFee?.toString()
    },
    transactionDigest: effects.transactionDigest,
    gasObject: {
      objectId: effects.gasObject?.objectId,
      inputState: mapInputObjectState(effects.gasObject?.inputState),
      inputVersion: effects.gasObject?.inputVersion?.toString() ?? null,
      inputDigest: effects.gasObject?.inputDigest ?? null,
      inputOwner: mapOwner(effects.gasObject?.inputOwner),
      outputState: mapOutputObjectState(effects.gasObject?.outputState),
      outputVersion: effects.gasObject?.outputVersion?.toString() ?? null,
      outputDigest: effects.gasObject?.outputDigest ?? null,
      outputOwner: mapOwner(effects.gasObject?.outputOwner),
      idOperation: mapIdOperation(effects.gasObject?.idOperation)
    },
    eventsDigest: effects.eventsDigest ?? null,
    dependencies: effects.dependencies,
    lamportVersion: effects.lamportVersion?.toString() ?? null,
    changedObjects,
    unchangedConsensusObjects: effects.unchangedConsensusObjects.map((object2) => {
      return {
        kind: mapUnchangedConsensusObjectKind(object2.kind),
        objectId: object2.objectId,
        version: object2.version?.toString() ?? null,
        digest: object2.digest ?? null
      };
    }),
    auxiliaryDataDigest: effects.auxiliaryDataDigest ?? null
  };
}
function parseTransaction(transaction, include) {
  const objectTypes = {};
  if (include?.objectTypes)
    transaction.effects?.changedObjects?.forEach((change) => {
      if (change.objectId && change.objectType)
        objectTypes[change.objectId] = change.objectType;
    });
  let transactionData;
  if (include?.transaction) {
    const tx = transaction.transaction;
    if (!tx)
      throw new Error("Transaction data is required but missing from gRPC response");
    const resolved = grpcTransactionToTransactionData(tx);
    transactionData = {
      gasData: resolved.gasData,
      sender: resolved.sender,
      expiration: resolved.expiration,
      commands: resolved.commands,
      inputs: resolved.inputs,
      version: resolved.version
    };
  }
  const bcsBytes = include?.bcs ? transaction.transaction?.bcs?.value : void 0;
  const effects = include?.effects ? parseTransactionEffects({ effects: transaction.effects }) : void 0;
  const status = transaction.effects?.status?.success ? {
    success: true,
    error: null
  } : {
    success: false,
    error: transaction.effects?.status?.error ? parseGrpcExecutionError(transaction.effects.status.error) : {
      $kind: "Unknown",
      message: "Transaction failed",
      Unknown: null
    }
  };
  const result = {
    digest: transaction.digest,
    epoch: transaction.effects?.epoch?.toString() ?? null,
    status,
    effects,
    objectTypes: include?.objectTypes ? objectTypes : void 0,
    transaction: transactionData,
    bcs: bcsBytes,
    signatures: transaction.signatures?.map((sig) => toBase64(sig.bcs?.value)) ?? [],
    balanceChanges: include?.balanceChanges ? transaction.balanceChanges?.map((change) => ({
      coinType: change.coinType,
      address: change.address,
      amount: change.amount
    })) ?? [] : void 0,
    events: include?.events ? transaction.events?.events.map((event) => ({
      packageId: normalizeSuiAddress(event.packageId),
      module: event.module,
      sender: normalizeSuiAddress(event.sender),
      eventType: event.eventType,
      bcs: event.contents?.value ?? new Uint8Array(),
      json: event.json ? Value.toJson(event.json) : null
    })) ?? [] : void 0
  };
  return status.success ? {
    $kind: "Transaction",
    Transaction: result
  } : {
    $kind: "FailedTransaction",
    FailedTransaction: result
  };
}
function parseNormalizedSuiMoveType(type) {
  let reference = null;
  if (type.reference === OpenSignature_Reference.IMMUTABLE)
    reference = "immutable";
  else if (type.reference === OpenSignature_Reference.MUTABLE)
    reference = "mutable";
  return {
    reference,
    body: parseNormalizedSuiMoveTypeBody(type.body)
  };
}
function parseNormalizedSuiMoveTypeBody(type) {
  switch (type.type) {
    case OpenSignatureBody_Type.TYPE_UNKNOWN:
      return { $kind: "unknown" };
    case OpenSignatureBody_Type.ADDRESS:
      return { $kind: "address" };
    case OpenSignatureBody_Type.BOOL:
      return { $kind: "bool" };
    case OpenSignatureBody_Type.U8:
      return { $kind: "u8" };
    case OpenSignatureBody_Type.U16:
      return { $kind: "u16" };
    case OpenSignatureBody_Type.U32:
      return { $kind: "u32" };
    case OpenSignatureBody_Type.U64:
      return { $kind: "u64" };
    case OpenSignatureBody_Type.U128:
      return { $kind: "u128" };
    case OpenSignatureBody_Type.U256:
      return { $kind: "u256" };
    case OpenSignatureBody_Type.VECTOR:
      return {
        $kind: "vector",
        vector: parseNormalizedSuiMoveTypeBody(type.typeParameterInstantiation[0])
      };
    case OpenSignatureBody_Type.DATATYPE:
      return {
        $kind: "datatype",
        datatype: {
          typeName: type.typeName,
          typeParameters: type.typeParameterInstantiation.map((t) => parseNormalizedSuiMoveTypeBody(t))
        }
      };
    case OpenSignatureBody_Type.TYPE_PARAMETER:
      return {
        $kind: "typeParameter",
        index: type.typeParameter
      };
    default:
      return { $kind: "unknown" };
  }
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/signature_scheme.mjs
var SignatureScheme = /* @__PURE__ */ function(SignatureScheme$1) {
  SignatureScheme$1[SignatureScheme$1["ED25519"] = 0] = "ED25519";
  SignatureScheme$1[SignatureScheme$1["SECP256K1"] = 1] = "SECP256K1";
  SignatureScheme$1[SignatureScheme$1["SECP256R1"] = 2] = "SECP256R1";
  SignatureScheme$1[SignatureScheme$1["MULTISIG"] = 3] = "MULTISIG";
  SignatureScheme$1[SignatureScheme$1["BLS12381"] = 4] = "BLS12381";
  SignatureScheme$1[SignatureScheme$1["ZKLOGIN"] = 5] = "ZKLOGIN";
  SignatureScheme$1[SignatureScheme$1["PASSKEY"] = 6] = "PASSKEY";
  return SignatureScheme$1;
}({});

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/signature.mjs
var UserSignature$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.UserSignature", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "scheme",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.SignatureScheme", SignatureScheme]
      },
      {
        no: 3,
        name: "simple",
        kind: "message",
        oneof: "signature",
        T: () => SimpleSignature
      },
      {
        no: 4,
        name: "multisig",
        kind: "message",
        oneof: "signature",
        T: () => MultisigAggregatedSignature
      },
      {
        no: 5,
        name: "zklogin",
        kind: "message",
        oneof: "signature",
        T: () => ZkLoginAuthenticator
      },
      {
        no: 6,
        name: "passkey",
        kind: "message",
        oneof: "signature",
        T: () => PasskeyAuthenticator2
      }
    ]);
  }
};
var UserSignature = new UserSignature$Type();
var SimpleSignature$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SimpleSignature", [
      {
        no: 1,
        name: "scheme",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.SignatureScheme", SignatureScheme]
      },
      {
        no: 2,
        name: "signature",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 3,
        name: "public_key",
        kind: "scalar",
        opt: true,
        T: 12
      }
    ]);
  }
};
var SimpleSignature = new SimpleSignature$Type();
var ZkLoginPublicIdentifier$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ZkLoginPublicIdentifier", [{
      no: 1,
      name: "iss",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "address_seed",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var ZkLoginPublicIdentifier = new ZkLoginPublicIdentifier$Type();
var MultisigMemberPublicKey$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MultisigMemberPublicKey", [
      {
        no: 1,
        name: "scheme",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.SignatureScheme", SignatureScheme]
      },
      {
        no: 2,
        name: "public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 3,
        name: "zklogin",
        kind: "message",
        T: () => ZkLoginPublicIdentifier
      }
    ]);
  }
};
var MultisigMemberPublicKey = new MultisigMemberPublicKey$Type();
var MultisigMember$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MultisigMember", [{
      no: 1,
      name: "public_key",
      kind: "message",
      T: () => MultisigMemberPublicKey
    }, {
      no: 2,
      name: "weight",
      kind: "scalar",
      opt: true,
      T: 13
    }]);
  }
};
var MultisigMember = new MultisigMember$Type();
var MultisigCommittee$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MultisigCommittee", [{
      no: 1,
      name: "members",
      kind: "message",
      repeat: 1,
      T: () => MultisigMember
    }, {
      no: 2,
      name: "threshold",
      kind: "scalar",
      opt: true,
      T: 13
    }]);
  }
};
var MultisigCommittee = new MultisigCommittee$Type();
var MultisigAggregatedSignature$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MultisigAggregatedSignature", [
      {
        no: 1,
        name: "signatures",
        kind: "message",
        repeat: 1,
        T: () => MultisigMemberSignature
      },
      {
        no: 2,
        name: "bitmap",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "legacy_bitmap",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 4,
        name: "committee",
        kind: "message",
        T: () => MultisigCommittee
      }
    ]);
  }
};
var MultisigAggregatedSignature = new MultisigAggregatedSignature$Type();
var MultisigMemberSignature$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MultisigMemberSignature", [
      {
        no: 1,
        name: "scheme",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.SignatureScheme", SignatureScheme]
      },
      {
        no: 2,
        name: "signature",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 3,
        name: "zklogin",
        kind: "message",
        T: () => ZkLoginAuthenticator
      },
      {
        no: 4,
        name: "passkey",
        kind: "message",
        T: () => PasskeyAuthenticator2
      }
    ]);
  }
};
var MultisigMemberSignature = new MultisigMemberSignature$Type();
var ZkLoginAuthenticator$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ZkLoginAuthenticator", [
      {
        no: 1,
        name: "inputs",
        kind: "message",
        T: () => ZkLoginInputs
      },
      {
        no: 2,
        name: "max_epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "signature",
        kind: "message",
        T: () => SimpleSignature
      },
      {
        no: 4,
        name: "public_identifier",
        kind: "message",
        T: () => ZkLoginPublicIdentifier
      },
      {
        no: 5,
        name: "jwk_id",
        kind: "message",
        T: () => JwkId
      }
    ]);
  }
};
var ZkLoginAuthenticator = new ZkLoginAuthenticator$Type();
var ZkLoginInputs$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ZkLoginInputs", [
      {
        no: 1,
        name: "proof_points",
        kind: "message",
        T: () => ZkLoginProof
      },
      {
        no: 2,
        name: "iss_base64_details",
        kind: "message",
        T: () => ZkLoginClaim
      },
      {
        no: 3,
        name: "header_base64",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "address_seed",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var ZkLoginInputs = new ZkLoginInputs$Type();
var ZkLoginProof$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ZkLoginProof", [
      {
        no: 1,
        name: "a",
        kind: "message",
        T: () => CircomG1
      },
      {
        no: 2,
        name: "b",
        kind: "message",
        T: () => CircomG2
      },
      {
        no: 3,
        name: "c",
        kind: "message",
        T: () => CircomG1
      }
    ]);
  }
};
var ZkLoginProof = new ZkLoginProof$Type();
var ZkLoginClaim$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ZkLoginClaim", [{
      no: 1,
      name: "value",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "index_mod_4",
      kind: "scalar",
      opt: true,
      T: 13
    }]);
  }
};
var ZkLoginClaim = new ZkLoginClaim$Type();
var CircomG1$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CircomG1", [
      {
        no: 1,
        name: "e0",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "e1",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "e2",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var CircomG1 = new CircomG1$Type();
var CircomG2$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CircomG2", [
      {
        no: 1,
        name: "e00",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "e01",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "e10",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "e11",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "e20",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 6,
        name: "e21",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var CircomG2 = new CircomG2$Type();
var PasskeyAuthenticator$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.PasskeyAuthenticator", [
      {
        no: 1,
        name: "authenticator_data",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 2,
        name: "client_data_json",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "signature",
        kind: "message",
        T: () => SimpleSignature
      }
    ]);
  }
};
var PasskeyAuthenticator2 = new PasskeyAuthenticator$Type();
var ValidatorCommittee$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ValidatorCommittee", [{
      no: 1,
      name: "epoch",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }, {
      no: 2,
      name: "members",
      kind: "message",
      repeat: 1,
      T: () => ValidatorCommitteeMember
    }]);
  }
};
var ValidatorCommittee = new ValidatorCommittee$Type();
var ValidatorCommitteeMember$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ValidatorCommitteeMember", [{
      no: 1,
      name: "public_key",
      kind: "scalar",
      opt: true,
      T: 12
    }, {
      no: 2,
      name: "weight",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var ValidatorCommitteeMember = new ValidatorCommitteeMember$Type();
var ValidatorAggregatedSignature$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ValidatorAggregatedSignature", [
      {
        no: 1,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "signature",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 3,
        name: "bitmap",
        kind: "scalar",
        opt: true,
        T: 12
      }
    ]);
  }
};
var ValidatorAggregatedSignature = new ValidatorAggregatedSignature$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/balance_change.mjs
var BalanceChange$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.BalanceChange", [
      {
        no: 1,
        name: "address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "coin_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "amount",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var BalanceChange = new BalanceChange$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/event.mjs
var TransactionEvents$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.TransactionEvents", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "events",
        kind: "message",
        repeat: 1,
        T: () => Event2
      }
    ]);
  }
};
var TransactionEvents = new TransactionEvents$Type();
var Event$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Event", [
      {
        no: 1,
        name: "package_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "module",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "sender",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "event_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "contents",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 6,
        name: "json",
        kind: "message",
        T: () => Value
      }
    ]);
  }
};
var Event2 = new Event$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/executed_transaction.mjs
var ExecutedTransaction$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecutedTransaction", [
      {
        no: 1,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "transaction",
        kind: "message",
        T: () => Transaction
      },
      {
        no: 3,
        name: "signatures",
        kind: "message",
        repeat: 1,
        T: () => UserSignature
      },
      {
        no: 4,
        name: "effects",
        kind: "message",
        T: () => TransactionEffects2
      },
      {
        no: 5,
        name: "events",
        kind: "message",
        T: () => TransactionEvents
      },
      {
        no: 6,
        name: "checkpoint",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 7,
        name: "timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 8,
        name: "balance_changes",
        kind: "message",
        repeat: 1,
        T: () => BalanceChange
      },
      {
        no: 9,
        name: "objects",
        kind: "message",
        T: () => ObjectSet
      }
    ]);
  }
};
var ExecutedTransaction = new ExecutedTransaction$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/google/protobuf/field_mask.mjs
var FieldMask$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.FieldMask", [{
      no: 1,
      name: "paths",
      kind: "scalar",
      repeat: 2,
      T: 9
    }]);
  }
  /**
  * Encode `FieldMask` to JSON object.
  */
  internalJsonWrite(message, options) {
    const invalidFieldMaskJsonRegex = /[A-Z]|(_([.0-9_]|$))/g;
    return message.paths.map((p) => {
      if (invalidFieldMaskJsonRegex.test(p))
        throw new Error('Unable to encode FieldMask to JSON. lowerCamelCase of path name "' + p + '" is irreversible.');
      return lowerCamelCase(p);
    }).join(",");
  }
  /**
  * Decode `FieldMask` from JSON object.
  */
  internalJsonRead(json, options, target) {
    if (typeof json !== "string")
      throw new Error("Unable to parse FieldMask from JSON " + typeofJsonValue(json) + ". Expected string.");
    if (!target)
      target = this.create();
    if (json === "")
      return target;
    let camelToSnake = (str) => {
      if (str.includes("_"))
        throw new Error("Unable to parse FieldMask from JSON. Path names must be lowerCamelCase.");
      return str.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
    };
    target.paths = json.split(",").map(camelToSnake);
    return target;
  }
};
var FieldMask = new FieldMask$Type();

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/reflection-info.js
function normalizeMethodInfo(method, service) {
  var _a, _b, _c;
  let m = method;
  m.service = service;
  m.localName = (_a = m.localName) !== null && _a !== void 0 ? _a : lowerCamelCase(m.name);
  m.serverStreaming = !!m.serverStreaming;
  m.clientStreaming = !!m.clientStreaming;
  m.options = (_b = m.options) !== null && _b !== void 0 ? _b : {};
  m.idempotency = (_c = m.idempotency) !== null && _c !== void 0 ? _c : void 0;
  return m;
}

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/service-type.js
var ServiceType = class {
  constructor(typeName, methods, options) {
    this.typeName = typeName;
    this.methods = methods.map((i) => normalizeMethodInfo(i, this));
    this.options = options !== null && options !== void 0 ? options : {};
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/rpc-error.js
var RpcError = class extends Error {
  constructor(message, code = "UNKNOWN", meta) {
    super(message);
    this.name = "RpcError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
    this.meta = meta !== null && meta !== void 0 ? meta : {};
  }
  toString() {
    const l = [this.name + ": " + this.message];
    if (this.code) {
      l.push("");
      l.push("Code: " + this.code);
    }
    if (this.serviceName && this.methodName) {
      l.push("Method: " + this.serviceName + "/" + this.methodName);
    }
    let m = Object.entries(this.meta);
    if (m.length) {
      l.push("");
      l.push("Meta:");
      for (let [k, v] of m) {
        l.push(`  ${k}: ${v}`);
      }
    }
    return l.join("\n");
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/rpc-options.js
function mergeRpcOptions(defaults, options) {
  if (!options)
    return defaults;
  let o = {};
  copy(defaults, o);
  copy(options, o);
  for (let key of Object.keys(options)) {
    let val = options[key];
    switch (key) {
      case "jsonOptions":
        o.jsonOptions = mergeJsonOptions(defaults.jsonOptions, o.jsonOptions);
        break;
      case "binaryOptions":
        o.binaryOptions = mergeBinaryOptions(defaults.binaryOptions, o.binaryOptions);
        break;
      case "meta":
        o.meta = {};
        copy(defaults.meta, o.meta);
        copy(options.meta, o.meta);
        break;
      case "interceptors":
        o.interceptors = defaults.interceptors ? defaults.interceptors.concat(val) : val.concat();
        break;
    }
  }
  return o;
}
function copy(a, into) {
  if (!a)
    return;
  let c2 = into;
  for (let [k, v] of Object.entries(a)) {
    if (v instanceof Date)
      c2[k] = new Date(v.getTime());
    else if (Array.isArray(v))
      c2[k] = v.concat();
    else
      c2[k] = v;
  }
}

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/deferred.js
var DeferredState;
(function(DeferredState2) {
  DeferredState2[DeferredState2["PENDING"] = 0] = "PENDING";
  DeferredState2[DeferredState2["REJECTED"] = 1] = "REJECTED";
  DeferredState2[DeferredState2["RESOLVED"] = 2] = "RESOLVED";
})(DeferredState || (DeferredState = {}));
var Deferred = class {
  /**
   * @param preventUnhandledRejectionWarning - prevents the warning
   * "Unhandled Promise rejection" by adding a noop rejection handler.
   * Working with calls returned from the runtime-rpc package in an
   * async function usually means awaiting one call property after
   * the other. This means that the "status" is not being awaited when
   * an earlier await for the "headers" is rejected. This causes the
   * "unhandled promise reject" warning. A more correct behaviour for
   * calls might be to become aware whether at least one of the
   * promises is handled and swallow the rejection warning for the
   * others.
   */
  constructor(preventUnhandledRejectionWarning = true) {
    this._state = DeferredState.PENDING;
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    if (preventUnhandledRejectionWarning) {
      this._promise.catch((_) => {
      });
    }
  }
  /**
   * Get the current state of the promise.
   */
  get state() {
    return this._state;
  }
  /**
   * Get the deferred promise.
   */
  get promise() {
    return this._promise;
  }
  /**
   * Resolve the promise. Throws if the promise is already resolved or rejected.
   */
  resolve(value) {
    if (this.state !== DeferredState.PENDING)
      throw new Error(`cannot resolve ${DeferredState[this.state].toLowerCase()}`);
    this._resolve(value);
    this._state = DeferredState.RESOLVED;
  }
  /**
   * Reject the promise. Throws if the promise is already resolved or rejected.
   */
  reject(reason) {
    if (this.state !== DeferredState.PENDING)
      throw new Error(`cannot reject ${DeferredState[this.state].toLowerCase()}`);
    this._reject(reason);
    this._state = DeferredState.REJECTED;
  }
  /**
   * Resolve the promise. Ignore if not pending.
   */
  resolvePending(val) {
    if (this._state === DeferredState.PENDING)
      this.resolve(val);
  }
  /**
   * Reject the promise. Ignore if not pending.
   */
  rejectPending(reason) {
    if (this._state === DeferredState.PENDING)
      this.reject(reason);
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/rpc-output-stream.js
var RpcOutputStreamController = class {
  constructor() {
    this._lis = {
      nxt: [],
      msg: [],
      err: [],
      cmp: []
    };
    this._closed = false;
    this._itState = { q: [] };
  }
  // --- RpcOutputStream callback API
  onNext(callback) {
    return this.addLis(callback, this._lis.nxt);
  }
  onMessage(callback) {
    return this.addLis(callback, this._lis.msg);
  }
  onError(callback) {
    return this.addLis(callback, this._lis.err);
  }
  onComplete(callback) {
    return this.addLis(callback, this._lis.cmp);
  }
  addLis(callback, list) {
    list.push(callback);
    return () => {
      let i = list.indexOf(callback);
      if (i >= 0)
        list.splice(i, 1);
    };
  }
  // remove all listeners
  clearLis() {
    for (let l of Object.values(this._lis))
      l.splice(0, l.length);
  }
  // --- Controller API
  /**
   * Is this stream already closed by a completion or error?
   */
  get closed() {
    return this._closed !== false;
  }
  /**
   * Emit message, close with error, or close successfully, but only one
   * at a time.
   * Can be used to wrap a stream by using the other stream's `onNext`.
   */
  notifyNext(message, error, complete) {
    assert((message ? 1 : 0) + (error ? 1 : 0) + (complete ? 1 : 0) <= 1, "only one emission at a time");
    if (message)
      this.notifyMessage(message);
    if (error)
      this.notifyError(error);
    if (complete)
      this.notifyComplete();
  }
  /**
   * Emits a new message. Throws if stream is closed.
   *
   * Triggers onNext and onMessage callbacks.
   */
  notifyMessage(message) {
    assert(!this.closed, "stream is closed");
    this.pushIt({ value: message, done: false });
    this._lis.msg.forEach((l) => l(message));
    this._lis.nxt.forEach((l) => l(message, void 0, false));
  }
  /**
   * Closes the stream with an error. Throws if stream is closed.
   *
   * Triggers onNext and onError callbacks.
   */
  notifyError(error) {
    assert(!this.closed, "stream is closed");
    this._closed = error;
    this.pushIt(error);
    this._lis.err.forEach((l) => l(error));
    this._lis.nxt.forEach((l) => l(void 0, error, false));
    this.clearLis();
  }
  /**
   * Closes the stream successfully. Throws if stream is closed.
   *
   * Triggers onNext and onComplete callbacks.
   */
  notifyComplete() {
    assert(!this.closed, "stream is closed");
    this._closed = true;
    this.pushIt({ value: null, done: true });
    this._lis.cmp.forEach((l) => l());
    this._lis.nxt.forEach((l) => l(void 0, void 0, true));
    this.clearLis();
  }
  /**
   * Creates an async iterator (that can be used with `for await {...}`)
   * to consume the stream.
   *
   * Some things to note:
   * - If an error occurs, the `for await` will throw it.
   * - If an error occurred before the `for await` was started, `for await`
   *   will re-throw it.
   * - If the stream is already complete, the `for await` will be empty.
   * - If your `for await` consumes slower than the stream produces,
   *   for example because you are relaying messages in a slow operation,
   *   messages are queued.
   */
  [Symbol.asyncIterator]() {
    if (this._closed === true)
      this.pushIt({ value: null, done: true });
    else if (this._closed !== false)
      this.pushIt(this._closed);
    return {
      next: () => {
        let state = this._itState;
        assert(state, "bad state");
        assert(!state.p, "iterator contract broken");
        let first = state.q.shift();
        if (first)
          return "value" in first ? Promise.resolve(first) : Promise.reject(first);
        state.p = new Deferred();
        return state.p.promise;
      }
    };
  }
  // "push" a new iterator result.
  // this either resolves a pending promise, or enqueues the result.
  pushIt(result) {
    let state = this._itState;
    if (state.p) {
      const p = state.p;
      assert(p.state == DeferredState.PENDING, "iterator contract broken");
      "value" in result ? p.resolve(result) : p.reject(result);
      delete state.p;
    } else {
      state.q.push(result);
    }
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/unary-call.js
var __awaiter = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var UnaryCall = class {
  constructor(method, requestHeaders, request, headers, response, status, trailers) {
    this.method = method;
    this.requestHeaders = requestHeaders;
    this.request = request;
    this.headers = headers;
    this.response = response;
    this.status = status;
    this.trailers = trailers;
  }
  /**
   * If you are only interested in the final outcome of this call,
   * you can await it to receive a `FinishedUnaryCall`.
   */
  then(onfulfilled, onrejected) {
    return this.promiseFinished().then((value) => onfulfilled ? Promise.resolve(onfulfilled(value)) : value, (reason) => onrejected ? Promise.resolve(onrejected(reason)) : Promise.reject(reason));
  }
  promiseFinished() {
    return __awaiter(this, void 0, void 0, function* () {
      let [headers, response, status, trailers] = yield Promise.all([this.headers, this.response, this.status, this.trailers]);
      return {
        method: this.method,
        requestHeaders: this.requestHeaders,
        request: this.request,
        headers,
        response,
        status,
        trailers
      };
    });
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/server-streaming-call.js
var __awaiter2 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var ServerStreamingCall = class {
  constructor(method, requestHeaders, request, headers, response, status, trailers) {
    this.method = method;
    this.requestHeaders = requestHeaders;
    this.request = request;
    this.headers = headers;
    this.responses = response;
    this.status = status;
    this.trailers = trailers;
  }
  /**
   * Instead of awaiting the response status and trailers, you can
   * just as well await this call itself to receive the server outcome.
   * You should first setup some listeners to the `request` to
   * see the actual messages the server replied with.
   */
  then(onfulfilled, onrejected) {
    return this.promiseFinished().then((value) => onfulfilled ? Promise.resolve(onfulfilled(value)) : value, (reason) => onrejected ? Promise.resolve(onrejected(reason)) : Promise.reject(reason));
  }
  promiseFinished() {
    return __awaiter2(this, void 0, void 0, function* () {
      let [headers, status, trailers] = yield Promise.all([this.headers, this.status, this.trailers]);
      return {
        method: this.method,
        requestHeaders: this.requestHeaders,
        request: this.request,
        headers,
        status,
        trailers
      };
    });
  }
};

// node_modules/.pnpm/@protobuf-ts+runtime-rpc@2.11.1/node_modules/@protobuf-ts/runtime-rpc/build/es2015/rpc-interceptor.js
function stackIntercept(kind, transport, method, options, input) {
  var _a, _b, _c, _d;
  if (kind == "unary") {
    let tail = (mtd, inp, opt) => transport.unary(mtd, inp, opt);
    for (const curr of ((_a = options.interceptors) !== null && _a !== void 0 ? _a : []).filter((i) => i.interceptUnary).reverse()) {
      const next = tail;
      tail = (mtd, inp, opt) => curr.interceptUnary(next, mtd, inp, opt);
    }
    return tail(method, input, options);
  }
  if (kind == "serverStreaming") {
    let tail = (mtd, inp, opt) => transport.serverStreaming(mtd, inp, opt);
    for (const curr of ((_b = options.interceptors) !== null && _b !== void 0 ? _b : []).filter((i) => i.interceptServerStreaming).reverse()) {
      const next = tail;
      tail = (mtd, inp, opt) => curr.interceptServerStreaming(next, mtd, inp, opt);
    }
    return tail(method, input, options);
  }
  if (kind == "clientStreaming") {
    let tail = (mtd, opt) => transport.clientStreaming(mtd, opt);
    for (const curr of ((_c = options.interceptors) !== null && _c !== void 0 ? _c : []).filter((i) => i.interceptClientStreaming).reverse()) {
      const next = tail;
      tail = (mtd, opt) => curr.interceptClientStreaming(next, mtd, opt);
    }
    return tail(method, options);
  }
  if (kind == "duplex") {
    let tail = (mtd, opt) => transport.duplex(mtd, opt);
    for (const curr of ((_d = options.interceptors) !== null && _d !== void 0 ? _d : []).filter((i) => i.interceptDuplex).reverse()) {
      const next = tail;
      tail = (mtd, opt) => curr.interceptDuplex(next, mtd, opt);
    }
    return tail(method, options);
  }
  assertNever(kind);
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/transaction_execution_service.mjs
var SimulateTransactionRequest_TransactionChecks = /* @__PURE__ */ function(SimulateTransactionRequest_TransactionChecks$1) {
  SimulateTransactionRequest_TransactionChecks$1[SimulateTransactionRequest_TransactionChecks$1["ENABLED"] = 0] = "ENABLED";
  SimulateTransactionRequest_TransactionChecks$1[SimulateTransactionRequest_TransactionChecks$1["DISABLED"] = 1] = "DISABLED";
  return SimulateTransactionRequest_TransactionChecks$1;
}({});
var ExecuteTransactionRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecuteTransactionRequest", [
      {
        no: 1,
        name: "transaction",
        kind: "message",
        T: () => Transaction
      },
      {
        no: 2,
        name: "signatures",
        kind: "message",
        repeat: 1,
        T: () => UserSignature
      },
      {
        no: 3,
        name: "read_mask",
        kind: "message",
        T: () => FieldMask
      }
    ]);
  }
};
var ExecuteTransactionRequest = new ExecuteTransactionRequest$Type();
var ExecuteTransactionResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ExecuteTransactionResponse", [{
      no: 1,
      name: "transaction",
      kind: "message",
      T: () => ExecutedTransaction
    }]);
  }
};
var ExecuteTransactionResponse = new ExecuteTransactionResponse$Type();
var SimulateTransactionRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SimulateTransactionRequest", [
      {
        no: 1,
        name: "transaction",
        kind: "message",
        T: () => Transaction
      },
      {
        no: 2,
        name: "read_mask",
        kind: "message",
        T: () => FieldMask
      },
      {
        no: 3,
        name: "checks",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.SimulateTransactionRequest.TransactionChecks", SimulateTransactionRequest_TransactionChecks]
      },
      {
        no: 4,
        name: "do_gas_selection",
        kind: "scalar",
        opt: true,
        T: 8
      }
    ]);
  }
};
var SimulateTransactionRequest = new SimulateTransactionRequest$Type();
var SimulateTransactionResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SimulateTransactionResponse", [{
      no: 1,
      name: "transaction",
      kind: "message",
      T: () => ExecutedTransaction
    }, {
      no: 2,
      name: "command_outputs",
      kind: "message",
      repeat: 1,
      T: () => CommandResult
    }]);
  }
};
var SimulateTransactionResponse = new SimulateTransactionResponse$Type();
var CommandResult$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CommandResult", [{
      no: 1,
      name: "return_values",
      kind: "message",
      repeat: 1,
      T: () => CommandOutput
    }, {
      no: 2,
      name: "mutated_by_ref",
      kind: "message",
      repeat: 1,
      T: () => CommandOutput
    }]);
  }
};
var CommandResult = new CommandResult$Type();
var CommandOutput$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CommandOutput", [
      {
        no: 1,
        name: "argument",
        kind: "message",
        T: () => Argument2
      },
      {
        no: 2,
        name: "value",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 3,
        name: "json",
        kind: "message",
        T: () => Value
      }
    ]);
  }
};
var CommandOutput = new CommandOutput$Type();
var TransactionExecutionService = new ServiceType("sui.rpc.v2.TransactionExecutionService", [{
  name: "ExecuteTransaction",
  options: {},
  I: ExecuteTransactionRequest,
  O: ExecuteTransactionResponse
}, {
  name: "SimulateTransaction",
  options: {},
  I: SimulateTransactionRequest,
  O: SimulateTransactionResponse
}]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/transaction_execution_service.client.mjs
var TransactionExecutionServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = TransactionExecutionService.typeName;
    this.methods = TransactionExecutionService.methods;
    this.options = TransactionExecutionService.options;
  }
  /**
  * @generated from protobuf rpc: ExecuteTransaction(sui.rpc.v2.ExecuteTransactionRequest) returns (sui.rpc.v2.ExecuteTransactionResponse);
  */
  executeTransaction(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: SimulateTransaction(sui.rpc.v2.SimulateTransactionRequest) returns (sui.rpc.v2.SimulateTransactionResponse);
  */
  simulateTransaction(input, options) {
    const method = this.methods[1], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/protocol_config.mjs
var ProtocolConfig$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ProtocolConfig", [
      {
        no: 1,
        name: "protocol_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "feature_flags",
        kind: "map",
        K: 9,
        V: {
          kind: "scalar",
          T: 8
        }
      },
      {
        no: 3,
        name: "attributes",
        kind: "map",
        K: 9,
        V: {
          kind: "scalar",
          T: 9
        }
      }
    ]);
  }
};
var ProtocolConfig = new ProtocolConfig$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/system_state.mjs
var SystemState$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SystemState", [
      {
        no: 1,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "protocol_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "validators",
        kind: "message",
        T: () => ValidatorSet
      },
      {
        no: 5,
        name: "storage_fund",
        kind: "message",
        T: () => StorageFund
      },
      {
        no: 6,
        name: "parameters",
        kind: "message",
        T: () => SystemParameters
      },
      {
        no: 7,
        name: "reference_gas_price",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 8,
        name: "validator_report_records",
        kind: "message",
        repeat: 1,
        T: () => ValidatorReportRecord
      },
      {
        no: 9,
        name: "stake_subsidy",
        kind: "message",
        T: () => StakeSubsidy
      },
      {
        no: 10,
        name: "safe_mode",
        kind: "scalar",
        opt: true,
        T: 8
      },
      {
        no: 11,
        name: "safe_mode_storage_rewards",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 12,
        name: "safe_mode_computation_rewards",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 13,
        name: "safe_mode_storage_rebates",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 14,
        name: "safe_mode_non_refundable_storage_fee",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 15,
        name: "epoch_start_timestamp_ms",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 16,
        name: "extra_fields",
        kind: "message",
        T: () => MoveTable
      }
    ]);
  }
};
var SystemState = new SystemState$Type();
var ValidatorReportRecord$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ValidatorReportRecord", [{
      no: 1,
      name: "reported",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "reporters",
      kind: "scalar",
      repeat: 2,
      T: 9
    }]);
  }
};
var ValidatorReportRecord = new ValidatorReportRecord$Type();
var SystemParameters$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SystemParameters", [
      {
        no: 1,
        name: "epoch_duration_ms",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "stake_subsidy_start_epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "min_validator_count",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "max_validator_count",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "min_validator_joining_stake",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "validator_low_stake_threshold",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 7,
        name: "validator_very_low_stake_threshold",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 8,
        name: "validator_low_stake_grace_period",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 9,
        name: "extra_fields",
        kind: "message",
        T: () => MoveTable
      }
    ]);
  }
};
var SystemParameters = new SystemParameters$Type();
var MoveTable$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.MoveTable", [{
      no: 1,
      name: "id",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "size",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var MoveTable = new MoveTable$Type();
var StakeSubsidy$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.StakeSubsidy", [
      {
        no: 1,
        name: "balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "distribution_counter",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "current_distribution_amount",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "stake_subsidy_period_length",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "stake_subsidy_decrease_rate",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 6,
        name: "extra_fields",
        kind: "message",
        T: () => MoveTable
      }
    ]);
  }
};
var StakeSubsidy = new StakeSubsidy$Type();
var StorageFund$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.StorageFund", [{
      no: 1,
      name: "total_object_storage_rebates",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }, {
      no: 2,
      name: "non_refundable_balance",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var StorageFund = new StorageFund$Type();
var ValidatorSet$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ValidatorSet", [
      {
        no: 1,
        name: "total_stake",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "active_validators",
        kind: "message",
        repeat: 1,
        T: () => Validator
      },
      {
        no: 3,
        name: "pending_active_validators",
        kind: "message",
        T: () => MoveTable
      },
      {
        no: 4,
        name: "pending_removals",
        kind: "scalar",
        repeat: 1,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "staking_pool_mappings",
        kind: "message",
        T: () => MoveTable
      },
      {
        no: 6,
        name: "inactive_validators",
        kind: "message",
        T: () => MoveTable
      },
      {
        no: 7,
        name: "validator_candidates",
        kind: "message",
        T: () => MoveTable
      },
      {
        no: 8,
        name: "at_risk_validators",
        kind: "map",
        K: 9,
        V: {
          kind: "scalar",
          T: 4,
          L: 0
        }
      },
      {
        no: 9,
        name: "extra_fields",
        kind: "message",
        T: () => MoveTable
      }
    ]);
  }
};
var ValidatorSet = new ValidatorSet$Type();
var Validator$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Validator", [
      {
        no: 1,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "description",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "image_url",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "project_url",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 7,
        name: "protocol_public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 8,
        name: "proof_of_possession",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 10,
        name: "network_public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 12,
        name: "worker_public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 13,
        name: "network_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 14,
        name: "p2p_address",
        kind: "scalar",
        jsonName: "p2pAddress",
        opt: true,
        T: 9
      },
      {
        no: 15,
        name: "primary_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 16,
        name: "worker_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 18,
        name: "next_epoch_protocol_public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 19,
        name: "next_epoch_proof_of_possession",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 21,
        name: "next_epoch_network_public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 23,
        name: "next_epoch_worker_public_key",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 24,
        name: "next_epoch_network_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 25,
        name: "next_epoch_p2p_address",
        kind: "scalar",
        jsonName: "nextEpochP2pAddress",
        opt: true,
        T: 9
      },
      {
        no: 26,
        name: "next_epoch_primary_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 27,
        name: "next_epoch_worker_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 28,
        name: "metadata_extra_fields",
        kind: "message",
        T: () => MoveTable
      },
      {
        no: 29,
        name: "voting_power",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 30,
        name: "operation_cap_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 31,
        name: "gas_price",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 32,
        name: "staking_pool",
        kind: "message",
        T: () => StakingPool
      },
      {
        no: 33,
        name: "commission_rate",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 34,
        name: "next_epoch_stake",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 35,
        name: "next_epoch_gas_price",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 36,
        name: "next_epoch_commission_rate",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 37,
        name: "extra_fields",
        kind: "message",
        T: () => MoveTable
      }
    ]);
  }
};
var Validator = new Validator$Type();
var StakingPool$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.StakingPool", [
      {
        no: 1,
        name: "id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "activation_epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "deactivation_epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "sui_balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "rewards_pool",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "pool_token_balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 7,
        name: "exchange_rates",
        kind: "message",
        T: () => MoveTable
      },
      {
        no: 8,
        name: "pending_stake",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 9,
        name: "pending_total_sui_withdraw",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 10,
        name: "pending_pool_token_withdraw",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 11,
        name: "extra_fields",
        kind: "message",
        T: () => MoveTable
      }
    ]);
  }
};
var StakingPool = new StakingPool$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/epoch.mjs
var Epoch$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Epoch", [
      {
        no: 1,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "committee",
        kind: "message",
        T: () => ValidatorCommittee
      },
      {
        no: 3,
        name: "system_state",
        kind: "message",
        T: () => SystemState
      },
      {
        no: 4,
        name: "first_checkpoint",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "last_checkpoint",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "start",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 7,
        name: "end",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 8,
        name: "reference_gas_price",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 9,
        name: "protocol_config",
        kind: "message",
        T: () => ProtocolConfig
      }
    ]);
  }
};
var Epoch = new Epoch$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/checkpoint_contents.mjs
var CheckpointContents$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CheckpointContents", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 5
      },
      {
        no: 4,
        name: "transactions",
        kind: "message",
        repeat: 1,
        T: () => CheckpointedTransactionInfo
      }
    ]);
  }
};
var CheckpointContents = new CheckpointContents$Type();
var CheckpointedTransactionInfo$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CheckpointedTransactionInfo", [
      {
        no: 1,
        name: "transaction",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "effects",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "signatures",
        kind: "message",
        repeat: 1,
        T: () => UserSignature
      },
      {
        no: 4,
        name: "address_aliases_versions",
        kind: "message",
        repeat: 1,
        T: () => AddressAliasesVersion
      }
    ]);
  }
};
var CheckpointedTransactionInfo = new CheckpointedTransactionInfo$Type();
var AddressAliasesVersion$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.AddressAliasesVersion", [{
      no: 1,
      name: "version",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var AddressAliasesVersion = new AddressAliasesVersion$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/checkpoint_summary.mjs
var CheckpointCommitment_CheckpointCommitmentKind = /* @__PURE__ */ function(CheckpointCommitment_CheckpointCommitmentKind$1) {
  CheckpointCommitment_CheckpointCommitmentKind$1[CheckpointCommitment_CheckpointCommitmentKind$1["CHECKPOINT_COMMITMENT_KIND_UNKNOWN"] = 0] = "CHECKPOINT_COMMITMENT_KIND_UNKNOWN";
  CheckpointCommitment_CheckpointCommitmentKind$1[CheckpointCommitment_CheckpointCommitmentKind$1["ECMH_LIVE_OBJECT_SET"] = 1] = "ECMH_LIVE_OBJECT_SET";
  CheckpointCommitment_CheckpointCommitmentKind$1[CheckpointCommitment_CheckpointCommitmentKind$1["CHECKPOINT_ARTIFACTS"] = 2] = "CHECKPOINT_ARTIFACTS";
  return CheckpointCommitment_CheckpointCommitmentKind$1;
}({});
var CheckpointSummary$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CheckpointSummary", [
      {
        no: 1,
        name: "bcs",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "sequence_number",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "total_network_transactions",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 6,
        name: "content_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 7,
        name: "previous_digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 8,
        name: "epoch_rolling_gas_cost_summary",
        kind: "message",
        T: () => GasCostSummary2
      },
      {
        no: 9,
        name: "timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 10,
        name: "commitments",
        kind: "message",
        repeat: 1,
        T: () => CheckpointCommitment
      },
      {
        no: 11,
        name: "end_of_epoch_data",
        kind: "message",
        T: () => EndOfEpochData
      },
      {
        no: 12,
        name: "version_specific_data",
        kind: "scalar",
        opt: true,
        T: 12
      }
    ]);
  }
};
var CheckpointSummary = new CheckpointSummary$Type();
var EndOfEpochData$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.EndOfEpochData", [
      {
        no: 1,
        name: "next_epoch_committee",
        kind: "message",
        repeat: 1,
        T: () => ValidatorCommitteeMember
      },
      {
        no: 2,
        name: "next_epoch_protocol_version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "epoch_commitments",
        kind: "message",
        repeat: 1,
        T: () => CheckpointCommitment
      }
    ]);
  }
};
var EndOfEpochData = new EndOfEpochData$Type();
var CheckpointCommitment$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CheckpointCommitment", [{
      no: 1,
      name: "kind",
      kind: "enum",
      opt: true,
      T: () => ["sui.rpc.v2.CheckpointCommitment.CheckpointCommitmentKind", CheckpointCommitment_CheckpointCommitmentKind]
    }, {
      no: 2,
      name: "digest",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var CheckpointCommitment = new CheckpointCommitment$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/checkpoint.mjs
var Checkpoint$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Checkpoint", [
      {
        no: 1,
        name: "sequence_number",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "summary",
        kind: "message",
        T: () => CheckpointSummary
      },
      {
        no: 4,
        name: "signature",
        kind: "message",
        T: () => ValidatorAggregatedSignature
      },
      {
        no: 5,
        name: "contents",
        kind: "message",
        T: () => CheckpointContents
      },
      {
        no: 6,
        name: "transactions",
        kind: "message",
        repeat: 1,
        T: () => ExecutedTransaction
      },
      {
        no: 7,
        name: "objects",
        kind: "message",
        T: () => ObjectSet
      }
    ]);
  }
};
var Checkpoint = new Checkpoint$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/google/protobuf/any.mjs
var Any$Type = class extends MessageType {
  constructor() {
    super("google.protobuf.Any", [{
      no: 1,
      name: "type_url",
      kind: "scalar",
      T: 9
    }, {
      no: 2,
      name: "value",
      kind: "scalar",
      T: 12
    }]);
  }
  /**
  * Pack the message into a new `Any`.
  *
  * Uses 'type.googleapis.com/full.type.name' as the type URL.
  */
  pack(message, type) {
    return {
      typeUrl: this.typeNameToUrl(type.typeName),
      value: type.toBinary(message)
    };
  }
  /**
  * Unpack the message from the `Any`.
  */
  unpack(any, type, options) {
    if (!this.contains(any, type))
      throw new Error("Cannot unpack google.protobuf.Any with typeUrl '" + any.typeUrl + "' as " + type.typeName + ".");
    return type.fromBinary(any.value, options);
  }
  /**
  * Does the given `Any` contain a packed message of the given type?
  */
  contains(any, type) {
    if (!any.typeUrl.length)
      return false;
    return (typeof type == "string" ? type : type.typeName) === this.typeUrlToName(any.typeUrl);
  }
  /**
  * Convert the message to canonical JSON value.
  *
  * You have to provide the `typeRegistry` option so that the
  * packed message can be converted to JSON.
  *
  * The `typeRegistry` option is also required to read
  * `google.protobuf.Any` from JSON format.
  */
  internalJsonWrite(any, options) {
    if (any.typeUrl === "")
      return {};
    let typeName = this.typeUrlToName(any.typeUrl);
    let opt = jsonWriteOptions(options);
    let type = opt.typeRegistry?.find((t) => t.typeName === typeName);
    if (!type)
      throw new globalThis.Error("Unable to convert google.protobuf.Any with typeUrl '" + any.typeUrl + "' to JSON. The specified type " + typeName + " is not available in the type registry.");
    let value = type.fromBinary(any.value, { readUnknownField: false });
    let json = type.internalJsonWrite(value, opt);
    if (typeName.startsWith("google.protobuf.") || !isJsonObject(json))
      json = { value: json };
    json["@type"] = any.typeUrl;
    return json;
  }
  internalJsonRead(json, options, target) {
    if (!isJsonObject(json))
      throw new globalThis.Error("Unable to parse google.protobuf.Any from JSON " + typeofJsonValue(json) + ".");
    if (typeof json["@type"] != "string" || json["@type"] == "")
      return this.create();
    let typeName = this.typeUrlToName(json["@type"]);
    let type = options?.typeRegistry?.find((t) => t.typeName == typeName);
    if (!type)
      throw new globalThis.Error("Unable to parse google.protobuf.Any from JSON. The specified type " + typeName + " is not available in the type registry.");
    let value;
    if (typeName.startsWith("google.protobuf.") && json.hasOwnProperty("value"))
      value = type.fromJson(json["value"], options);
    else {
      let copy2 = Object.assign({}, json);
      delete copy2["@type"];
      value = type.fromJson(copy2, options);
    }
    if (target === void 0)
      target = this.create();
    target.typeUrl = json["@type"];
    target.value = type.toBinary(value);
    return target;
  }
  typeNameToUrl(name) {
    if (!name.length)
      throw new Error("invalid type name: " + name);
    return "type.googleapis.com/" + name;
  }
  typeUrlToName(url) {
    if (!url.length)
      throw new Error("invalid type url: " + url);
    let slash = url.lastIndexOf("/");
    let name = slash > 0 ? url.substring(slash + 1) : url;
    if (!name.length)
      throw new Error("invalid type url: " + url);
    return name;
  }
};
var Any = new Any$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/google/rpc/status.mjs
var Status$Type = class extends MessageType {
  constructor() {
    super("google.rpc.Status", [
      {
        no: 1,
        name: "code",
        kind: "scalar",
        T: 5
      },
      {
        no: 2,
        name: "message",
        kind: "scalar",
        T: 9
      },
      {
        no: 3,
        name: "details",
        kind: "message",
        repeat: 1,
        T: () => Any
      }
    ]);
  }
};
var Status = new Status$Type();

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/ledger_service.mjs
var GetServiceInfoRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetServiceInfoRequest", []);
  }
};
var GetServiceInfoRequest = new GetServiceInfoRequest$Type();
var GetServiceInfoResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetServiceInfoResponse", [
      {
        no: 1,
        name: "chain_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "chain",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "epoch",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "checkpoint_height",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 6,
        name: "lowest_available_checkpoint",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 7,
        name: "lowest_available_checkpoint_objects",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 8,
        name: "server",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var GetServiceInfoResponse = new GetServiceInfoResponse$Type();
var GetObjectRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetObjectRequest", [
      {
        no: 1,
        name: "object_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "version",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "read_mask",
        kind: "message",
        T: () => FieldMask
      }
    ]);
  }
};
var GetObjectRequest = new GetObjectRequest$Type();
var GetObjectResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetObjectResponse", [{
      no: 1,
      name: "object",
      kind: "message",
      T: () => Object$1
    }]);
  }
};
var GetObjectResponse = new GetObjectResponse$Type();
var BatchGetObjectsRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.BatchGetObjectsRequest", [{
      no: 1,
      name: "requests",
      kind: "message",
      repeat: 1,
      T: () => GetObjectRequest
    }, {
      no: 2,
      name: "read_mask",
      kind: "message",
      T: () => FieldMask
    }]);
  }
};
var BatchGetObjectsRequest = new BatchGetObjectsRequest$Type();
var BatchGetObjectsResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.BatchGetObjectsResponse", [{
      no: 1,
      name: "objects",
      kind: "message",
      repeat: 1,
      T: () => GetObjectResult
    }]);
  }
};
var BatchGetObjectsResponse = new BatchGetObjectsResponse$Type();
var GetObjectResult$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetObjectResult", [{
      no: 1,
      name: "object",
      kind: "message",
      oneof: "result",
      T: () => Object$1
    }, {
      no: 2,
      name: "error",
      kind: "message",
      oneof: "result",
      T: () => Status
    }]);
  }
};
var GetObjectResult = new GetObjectResult$Type();
var GetTransactionRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetTransactionRequest", [{
      no: 1,
      name: "digest",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "read_mask",
      kind: "message",
      T: () => FieldMask
    }]);
  }
};
var GetTransactionRequest = new GetTransactionRequest$Type();
var GetTransactionResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetTransactionResponse", [{
      no: 1,
      name: "transaction",
      kind: "message",
      T: () => ExecutedTransaction
    }]);
  }
};
var GetTransactionResponse = new GetTransactionResponse$Type();
var BatchGetTransactionsRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.BatchGetTransactionsRequest", [{
      no: 1,
      name: "digests",
      kind: "scalar",
      repeat: 2,
      T: 9
    }, {
      no: 2,
      name: "read_mask",
      kind: "message",
      T: () => FieldMask
    }]);
  }
};
var BatchGetTransactionsRequest = new BatchGetTransactionsRequest$Type();
var BatchGetTransactionsResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.BatchGetTransactionsResponse", [{
      no: 1,
      name: "transactions",
      kind: "message",
      repeat: 1,
      T: () => GetTransactionResult
    }]);
  }
};
var BatchGetTransactionsResponse = new BatchGetTransactionsResponse$Type();
var GetTransactionResult$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetTransactionResult", [{
      no: 1,
      name: "transaction",
      kind: "message",
      oneof: "result",
      T: () => ExecutedTransaction
    }, {
      no: 2,
      name: "error",
      kind: "message",
      oneof: "result",
      T: () => Status
    }]);
  }
};
var GetTransactionResult = new GetTransactionResult$Type();
var GetCheckpointRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetCheckpointRequest", [
      {
        no: 1,
        name: "sequence_number",
        kind: "scalar",
        oneof: "checkpointId",
        T: 4,
        L: 0
      },
      {
        no: 2,
        name: "digest",
        kind: "scalar",
        oneof: "checkpointId",
        T: 9
      },
      {
        no: 3,
        name: "read_mask",
        kind: "message",
        T: () => FieldMask
      }
    ]);
  }
};
var GetCheckpointRequest = new GetCheckpointRequest$Type();
var GetCheckpointResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetCheckpointResponse", [{
      no: 1,
      name: "checkpoint",
      kind: "message",
      T: () => Checkpoint
    }]);
  }
};
var GetCheckpointResponse = new GetCheckpointResponse$Type();
var GetEpochRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetEpochRequest", [{
      no: 1,
      name: "epoch",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }, {
      no: 2,
      name: "read_mask",
      kind: "message",
      T: () => FieldMask
    }]);
  }
};
var GetEpochRequest = new GetEpochRequest$Type();
var GetEpochResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetEpochResponse", [{
      no: 1,
      name: "epoch",
      kind: "message",
      T: () => Epoch
    }]);
  }
};
var GetEpochResponse = new GetEpochResponse$Type();
var LedgerService = new ServiceType("sui.rpc.v2.LedgerService", [
  {
    name: "GetServiceInfo",
    options: {},
    I: GetServiceInfoRequest,
    O: GetServiceInfoResponse
  },
  {
    name: "GetObject",
    options: {},
    I: GetObjectRequest,
    O: GetObjectResponse
  },
  {
    name: "BatchGetObjects",
    options: {},
    I: BatchGetObjectsRequest,
    O: BatchGetObjectsResponse
  },
  {
    name: "GetTransaction",
    options: {},
    I: GetTransactionRequest,
    O: GetTransactionResponse
  },
  {
    name: "BatchGetTransactions",
    options: {},
    I: BatchGetTransactionsRequest,
    O: BatchGetTransactionsResponse
  },
  {
    name: "GetCheckpoint",
    options: {},
    I: GetCheckpointRequest,
    O: GetCheckpointResponse
  },
  {
    name: "GetEpoch",
    options: {},
    I: GetEpochRequest,
    O: GetEpochResponse
  }
]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/ledger_service.client.mjs
var LedgerServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = LedgerService.typeName;
    this.methods = LedgerService.methods;
    this.options = LedgerService.options;
  }
  /**
  * Query the service for general information about its current state.
  *
  * @generated from protobuf rpc: GetServiceInfo(sui.rpc.v2.GetServiceInfoRequest) returns (sui.rpc.v2.GetServiceInfoResponse);
  */
  getServiceInfo(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetObject(sui.rpc.v2.GetObjectRequest) returns (sui.rpc.v2.GetObjectResponse);
  */
  getObject(input, options) {
    const method = this.methods[1], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: BatchGetObjects(sui.rpc.v2.BatchGetObjectsRequest) returns (sui.rpc.v2.BatchGetObjectsResponse);
  */
  batchGetObjects(input, options) {
    const method = this.methods[2], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetTransaction(sui.rpc.v2.GetTransactionRequest) returns (sui.rpc.v2.GetTransactionResponse);
  */
  getTransaction(input, options) {
    const method = this.methods[3], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: BatchGetTransactions(sui.rpc.v2.BatchGetTransactionsRequest) returns (sui.rpc.v2.BatchGetTransactionsResponse);
  */
  batchGetTransactions(input, options) {
    const method = this.methods[4], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetCheckpoint(sui.rpc.v2.GetCheckpointRequest) returns (sui.rpc.v2.GetCheckpointResponse);
  */
  getCheckpoint(input, options) {
    const method = this.methods[5], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetEpoch(sui.rpc.v2.GetEpochRequest) returns (sui.rpc.v2.GetEpochResponse);
  */
  getEpoch(input, options) {
    const method = this.methods[6], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/move_package_service.mjs
var GetPackageRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetPackageRequest", [{
      no: 1,
      name: "package_id",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var GetPackageRequest = new GetPackageRequest$Type();
var GetPackageResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetPackageResponse", [{
      no: 1,
      name: "package",
      kind: "message",
      T: () => Package
    }]);
  }
};
var GetPackageResponse = new GetPackageResponse$Type();
var GetDatatypeRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetDatatypeRequest", [
      {
        no: 1,
        name: "package_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "module_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var GetDatatypeRequest = new GetDatatypeRequest$Type();
var GetDatatypeResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetDatatypeResponse", [{
      no: 1,
      name: "datatype",
      kind: "message",
      T: () => DatatypeDescriptor
    }]);
  }
};
var GetDatatypeResponse = new GetDatatypeResponse$Type();
var GetFunctionRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetFunctionRequest", [
      {
        no: 1,
        name: "package_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "module_name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var GetFunctionRequest = new GetFunctionRequest$Type();
var GetFunctionResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetFunctionResponse", [{
      no: 1,
      name: "function",
      kind: "message",
      T: () => FunctionDescriptor
    }]);
  }
};
var GetFunctionResponse = new GetFunctionResponse$Type();
var ListPackageVersionsRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListPackageVersionsRequest", [
      {
        no: 1,
        name: "package_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "page_size",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "page_token",
        kind: "scalar",
        opt: true,
        T: 12
      }
    ]);
  }
};
var ListPackageVersionsRequest = new ListPackageVersionsRequest$Type();
var ListPackageVersionsResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListPackageVersionsResponse", [{
      no: 1,
      name: "versions",
      kind: "message",
      repeat: 1,
      T: () => PackageVersion
    }, {
      no: 2,
      name: "next_page_token",
      kind: "scalar",
      opt: true,
      T: 12
    }]);
  }
};
var ListPackageVersionsResponse = new ListPackageVersionsResponse$Type();
var PackageVersion$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.PackageVersion", [{
      no: 1,
      name: "package_id",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "version",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }]);
  }
};
var PackageVersion = new PackageVersion$Type();
var MovePackageService = new ServiceType("sui.rpc.v2.MovePackageService", [
  {
    name: "GetPackage",
    options: {},
    I: GetPackageRequest,
    O: GetPackageResponse
  },
  {
    name: "GetDatatype",
    options: {},
    I: GetDatatypeRequest,
    O: GetDatatypeResponse
  },
  {
    name: "GetFunction",
    options: {},
    I: GetFunctionRequest,
    O: GetFunctionResponse
  },
  {
    name: "ListPackageVersions",
    options: {},
    I: ListPackageVersionsRequest,
    O: ListPackageVersionsResponse
  }
]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/move_package_service.client.mjs
var MovePackageServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = MovePackageService.typeName;
    this.methods = MovePackageService.methods;
    this.options = MovePackageService.options;
  }
  /**
  * @generated from protobuf rpc: GetPackage(sui.rpc.v2.GetPackageRequest) returns (sui.rpc.v2.GetPackageResponse);
  */
  getPackage(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetDatatype(sui.rpc.v2.GetDatatypeRequest) returns (sui.rpc.v2.GetDatatypeResponse);
  */
  getDatatype(input, options) {
    const method = this.methods[1], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetFunction(sui.rpc.v2.GetFunctionRequest) returns (sui.rpc.v2.GetFunctionResponse);
  */
  getFunction(input, options) {
    const method = this.methods[2], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: ListPackageVersions(sui.rpc.v2.ListPackageVersionsRequest) returns (sui.rpc.v2.ListPackageVersionsResponse);
  */
  listPackageVersions(input, options) {
    const method = this.methods[3], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/signature_verification_service.mjs
var VerifySignatureRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.VerifySignatureRequest", [
      {
        no: 1,
        name: "message",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 2,
        name: "signature",
        kind: "message",
        T: () => UserSignature
      },
      {
        no: 3,
        name: "address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "jwks",
        kind: "message",
        repeat: 1,
        T: () => ActiveJwk
      }
    ]);
  }
};
var VerifySignatureRequest = new VerifySignatureRequest$Type();
var VerifySignatureResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.VerifySignatureResponse", [{
      no: 1,
      name: "is_valid",
      kind: "scalar",
      opt: true,
      T: 8
    }, {
      no: 2,
      name: "reason",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var VerifySignatureResponse = new VerifySignatureResponse$Type();
var SignatureVerificationService = new ServiceType("sui.rpc.v2.SignatureVerificationService", [{
  name: "VerifySignature",
  options: {},
  I: VerifySignatureRequest,
  O: VerifySignatureResponse
}]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/signature_verification_service.client.mjs
var SignatureVerificationServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = SignatureVerificationService.typeName;
    this.methods = SignatureVerificationService.methods;
    this.options = SignatureVerificationService.options;
  }
  /**
  * Perform signature verification of a UserSignature against the provided message.
  *
  * @generated from protobuf rpc: VerifySignature(sui.rpc.v2.VerifySignatureRequest) returns (sui.rpc.v2.VerifySignatureResponse);
  */
  verifySignature(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/state_service.mjs
var CoinMetadata_MetadataCapState = /* @__PURE__ */ function(CoinMetadata_MetadataCapState$1) {
  CoinMetadata_MetadataCapState$1[CoinMetadata_MetadataCapState$1["METADATA_CAP_STATE_UNKNOWN"] = 0] = "METADATA_CAP_STATE_UNKNOWN";
  CoinMetadata_MetadataCapState$1[CoinMetadata_MetadataCapState$1["CLAIMED"] = 1] = "CLAIMED";
  CoinMetadata_MetadataCapState$1[CoinMetadata_MetadataCapState$1["UNCLAIMED"] = 2] = "UNCLAIMED";
  CoinMetadata_MetadataCapState$1[CoinMetadata_MetadataCapState$1["DELETED"] = 3] = "DELETED";
  return CoinMetadata_MetadataCapState$1;
}({});
var CoinTreasury_SupplyState = /* @__PURE__ */ function(CoinTreasury_SupplyState$1) {
  CoinTreasury_SupplyState$1[CoinTreasury_SupplyState$1["SUPPLY_STATE_UNKNOWN"] = 0] = "SUPPLY_STATE_UNKNOWN";
  CoinTreasury_SupplyState$1[CoinTreasury_SupplyState$1["FIXED"] = 1] = "FIXED";
  CoinTreasury_SupplyState$1[CoinTreasury_SupplyState$1["BURN_ONLY"] = 2] = "BURN_ONLY";
  return CoinTreasury_SupplyState$1;
}({});
var RegulatedCoinMetadata_CoinRegulatedState = /* @__PURE__ */ function(RegulatedCoinMetadata_CoinRegulatedState$1) {
  RegulatedCoinMetadata_CoinRegulatedState$1[RegulatedCoinMetadata_CoinRegulatedState$1["COIN_REGULATED_STATE_UNKNOWN"] = 0] = "COIN_REGULATED_STATE_UNKNOWN";
  RegulatedCoinMetadata_CoinRegulatedState$1[RegulatedCoinMetadata_CoinRegulatedState$1["REGULATED"] = 1] = "REGULATED";
  RegulatedCoinMetadata_CoinRegulatedState$1[RegulatedCoinMetadata_CoinRegulatedState$1["UNREGULATED"] = 2] = "UNREGULATED";
  return RegulatedCoinMetadata_CoinRegulatedState$1;
}({});
var DynamicField_DynamicFieldKind = /* @__PURE__ */ function(DynamicField_DynamicFieldKind$1) {
  DynamicField_DynamicFieldKind$1[DynamicField_DynamicFieldKind$1["DYNAMIC_FIELD_KIND_UNKNOWN"] = 0] = "DYNAMIC_FIELD_KIND_UNKNOWN";
  DynamicField_DynamicFieldKind$1[DynamicField_DynamicFieldKind$1["FIELD"] = 1] = "FIELD";
  DynamicField_DynamicFieldKind$1[DynamicField_DynamicFieldKind$1["OBJECT"] = 2] = "OBJECT";
  return DynamicField_DynamicFieldKind$1;
}({});
var GetCoinInfoRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetCoinInfoRequest", [{
      no: 1,
      name: "coin_type",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var GetCoinInfoRequest = new GetCoinInfoRequest$Type();
var GetCoinInfoResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetCoinInfoResponse", [
      {
        no: 1,
        name: "coin_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "metadata",
        kind: "message",
        T: () => CoinMetadata
      },
      {
        no: 3,
        name: "treasury",
        kind: "message",
        T: () => CoinTreasury
      },
      {
        no: 4,
        name: "regulated_metadata",
        kind: "message",
        T: () => RegulatedCoinMetadata
      }
    ]);
  }
};
var GetCoinInfoResponse = new GetCoinInfoResponse$Type();
var CoinMetadata$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CoinMetadata", [
      {
        no: 1,
        name: "id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "decimals",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "symbol",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 5,
        name: "description",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 6,
        name: "icon_url",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 7,
        name: "metadata_cap_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 8,
        name: "metadata_cap_state",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.CoinMetadata.MetadataCapState", CoinMetadata_MetadataCapState]
      }
    ]);
  }
};
var CoinMetadata = new CoinMetadata$Type();
var CoinTreasury$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.CoinTreasury", [
      {
        no: 1,
        name: "id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "total_supply",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 3,
        name: "supply_state",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.CoinTreasury.SupplyState", CoinTreasury_SupplyState]
      }
    ]);
  }
};
var CoinTreasury = new CoinTreasury$Type();
var RegulatedCoinMetadata$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.RegulatedCoinMetadata", [
      {
        no: 1,
        name: "id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "coin_metadata_object",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "deny_cap_object",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "allow_global_pause",
        kind: "scalar",
        opt: true,
        T: 8
      },
      {
        no: 5,
        name: "variant",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 6,
        name: "coin_regulated_state",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.RegulatedCoinMetadata.CoinRegulatedState", RegulatedCoinMetadata_CoinRegulatedState]
      }
    ]);
  }
};
var RegulatedCoinMetadata = new RegulatedCoinMetadata$Type();
var GetBalanceRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetBalanceRequest", [{
      no: 1,
      name: "owner",
      kind: "scalar",
      opt: true,
      T: 9
    }, {
      no: 2,
      name: "coin_type",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var GetBalanceRequest = new GetBalanceRequest$Type();
var GetBalanceResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.GetBalanceResponse", [{
      no: 1,
      name: "balance",
      kind: "message",
      T: () => Balance
    }]);
  }
};
var GetBalanceResponse = new GetBalanceResponse$Type();
var ListBalancesRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListBalancesRequest", [
      {
        no: 1,
        name: "owner",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "page_size",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "page_token",
        kind: "scalar",
        opt: true,
        T: 12
      }
    ]);
  }
};
var ListBalancesRequest = new ListBalancesRequest$Type();
var ListBalancesResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListBalancesResponse", [{
      no: 1,
      name: "balances",
      kind: "message",
      repeat: 1,
      T: () => Balance
    }, {
      no: 2,
      name: "next_page_token",
      kind: "scalar",
      opt: true,
      T: 12
    }]);
  }
};
var ListBalancesResponse = new ListBalancesResponse$Type();
var Balance$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.Balance", [
      {
        no: 1,
        name: "coin_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 4,
        name: "address_balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      },
      {
        no: 5,
        name: "coin_balance",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
      }
    ]);
  }
};
var Balance = new Balance$Type();
var ListDynamicFieldsRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListDynamicFieldsRequest", [
      {
        no: 1,
        name: "parent",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "page_size",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "page_token",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 4,
        name: "read_mask",
        kind: "message",
        T: () => FieldMask
      }
    ]);
  }
};
var ListDynamicFieldsRequest = new ListDynamicFieldsRequest$Type();
var ListDynamicFieldsResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListDynamicFieldsResponse", [{
      no: 1,
      name: "dynamic_fields",
      kind: "message",
      repeat: 1,
      T: () => DynamicField
    }, {
      no: 2,
      name: "next_page_token",
      kind: "scalar",
      opt: true,
      T: 12
    }]);
  }
};
var ListDynamicFieldsResponse = new ListDynamicFieldsResponse$Type();
var DynamicField$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.DynamicField", [
      {
        no: 1,
        name: "kind",
        kind: "enum",
        opt: true,
        T: () => ["sui.rpc.v2.DynamicField.DynamicFieldKind", DynamicField_DynamicFieldKind]
      },
      {
        no: 2,
        name: "parent",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "field_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "field_object",
        kind: "message",
        T: () => Object$1
      },
      {
        no: 5,
        name: "name",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 6,
        name: "value",
        kind: "message",
        T: () => Bcs
      },
      {
        no: 7,
        name: "value_type",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 8,
        name: "child_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 9,
        name: "child_object",
        kind: "message",
        T: () => Object$1
      }
    ]);
  }
};
var DynamicField = new DynamicField$Type();
var ListOwnedObjectsRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListOwnedObjectsRequest", [
      {
        no: 1,
        name: "owner",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "page_size",
        kind: "scalar",
        opt: true,
        T: 13
      },
      {
        no: 3,
        name: "page_token",
        kind: "scalar",
        opt: true,
        T: 12
      },
      {
        no: 4,
        name: "read_mask",
        kind: "message",
        T: () => FieldMask
      },
      {
        no: 5,
        name: "object_type",
        kind: "scalar",
        opt: true,
        T: 9
      }
    ]);
  }
};
var ListOwnedObjectsRequest = new ListOwnedObjectsRequest$Type();
var ListOwnedObjectsResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ListOwnedObjectsResponse", [{
      no: 1,
      name: "objects",
      kind: "message",
      repeat: 1,
      T: () => Object$1
    }, {
      no: 2,
      name: "next_page_token",
      kind: "scalar",
      opt: true,
      T: 12
    }]);
  }
};
var ListOwnedObjectsResponse = new ListOwnedObjectsResponse$Type();
var StateService = new ServiceType("sui.rpc.v2.StateService", [
  {
    name: "ListDynamicFields",
    options: {},
    I: ListDynamicFieldsRequest,
    O: ListDynamicFieldsResponse
  },
  {
    name: "ListOwnedObjects",
    options: {},
    I: ListOwnedObjectsRequest,
    O: ListOwnedObjectsResponse
  },
  {
    name: "GetCoinInfo",
    options: {},
    I: GetCoinInfoRequest,
    O: GetCoinInfoResponse
  },
  {
    name: "GetBalance",
    options: {},
    I: GetBalanceRequest,
    O: GetBalanceResponse
  },
  {
    name: "ListBalances",
    options: {},
    I: ListBalancesRequest,
    O: ListBalancesResponse
  }
]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/state_service.client.mjs
var StateServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = StateService.typeName;
    this.methods = StateService.methods;
    this.options = StateService.options;
  }
  /**
  * @generated from protobuf rpc: ListDynamicFields(sui.rpc.v2.ListDynamicFieldsRequest) returns (sui.rpc.v2.ListDynamicFieldsResponse);
  */
  listDynamicFields(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: ListOwnedObjects(sui.rpc.v2.ListOwnedObjectsRequest) returns (sui.rpc.v2.ListOwnedObjectsResponse);
  */
  listOwnedObjects(input, options) {
    const method = this.methods[1], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetCoinInfo(sui.rpc.v2.GetCoinInfoRequest) returns (sui.rpc.v2.GetCoinInfoResponse);
  */
  getCoinInfo(input, options) {
    const method = this.methods[2], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: GetBalance(sui.rpc.v2.GetBalanceRequest) returns (sui.rpc.v2.GetBalanceResponse);
  */
  getBalance(input, options) {
    const method = this.methods[3], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: ListBalances(sui.rpc.v2.ListBalancesRequest) returns (sui.rpc.v2.ListBalancesResponse);
  */
  listBalances(input, options) {
    const method = this.methods[4], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/subscription_service.mjs
var SubscribeCheckpointsRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SubscribeCheckpointsRequest", [{
      no: 1,
      name: "read_mask",
      kind: "message",
      T: () => FieldMask
    }]);
  }
};
var SubscribeCheckpointsRequest = new SubscribeCheckpointsRequest$Type();
var SubscribeCheckpointsResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.SubscribeCheckpointsResponse", [{
      no: 1,
      name: "cursor",
      kind: "scalar",
      opt: true,
      T: 4,
      L: 0
    }, {
      no: 2,
      name: "checkpoint",
      kind: "message",
      T: () => Checkpoint
    }]);
  }
};
var SubscribeCheckpointsResponse = new SubscribeCheckpointsResponse$Type();
var SubscriptionService = new ServiceType("sui.rpc.v2.SubscriptionService", [{
  name: "SubscribeCheckpoints",
  serverStreaming: true,
  options: {},
  I: SubscribeCheckpointsRequest,
  O: SubscribeCheckpointsResponse
}]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/subscription_service.client.mjs
var SubscriptionServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = SubscriptionService.typeName;
    this.methods = SubscriptionService.methods;
    this.options = SubscriptionService.options;
  }
  /**
  * Subscribe to the stream of checkpoints.
  *
  * This API provides a subscription to the checkpoint stream for the Sui
  * blockchain. When a subscription is initialized the stream will begin with
  * the latest executed checkpoint as seen by the server. Responses are
  * guaranteed to return checkpoints in-order and without gaps. This enables
  * clients to know exactly the last checkpoint they have processed and in the
  * event the subscription terminates (either by the client/server or by the
  * connection breaking), clients will be able to reinitialize a subscription
  * and then leverage other APIs in order to request data for the checkpoints
  * they missed.
  *
  * @generated from protobuf rpc: SubscribeCheckpoints(sui.rpc.v2.SubscribeCheckpointsRequest) returns (stream sui.rpc.v2.SubscribeCheckpointsResponse);
  */
  subscribeCheckpoints(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("serverStreaming", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/name_service.mjs
var LookupNameRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.LookupNameRequest", [{
      no: 1,
      name: "name",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var LookupNameRequest = new LookupNameRequest$Type();
var LookupNameResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.LookupNameResponse", [{
      no: 1,
      name: "record",
      kind: "message",
      T: () => NameRecord
    }]);
  }
};
var LookupNameResponse = new LookupNameResponse$Type();
var ReverseLookupNameRequest$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ReverseLookupNameRequest", [{
      no: 1,
      name: "address",
      kind: "scalar",
      opt: true,
      T: 9
    }]);
  }
};
var ReverseLookupNameRequest = new ReverseLookupNameRequest$Type();
var ReverseLookupNameResponse$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.ReverseLookupNameResponse", [{
      no: 1,
      name: "record",
      kind: "message",
      T: () => NameRecord
    }]);
  }
};
var ReverseLookupNameResponse = new ReverseLookupNameResponse$Type();
var NameRecord$Type = class extends MessageType {
  constructor() {
    super("sui.rpc.v2.NameRecord", [
      {
        no: 1,
        name: "id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 2,
        name: "name",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 3,
        name: "registration_nft_id",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 4,
        name: "expiration_timestamp",
        kind: "message",
        T: () => Timestamp
      },
      {
        no: 5,
        name: "target_address",
        kind: "scalar",
        opt: true,
        T: 9
      },
      {
        no: 6,
        name: "data",
        kind: "map",
        K: 9,
        V: {
          kind: "scalar",
          T: 9
        }
      }
    ]);
  }
};
var NameRecord = new NameRecord$Type();
var NameService = new ServiceType("sui.rpc.v2.NameService", [{
  name: "LookupName",
  options: {},
  I: LookupNameRequest,
  O: LookupNameResponse
}, {
  name: "ReverseLookupName",
  options: {},
  I: ReverseLookupNameRequest,
  O: ReverseLookupNameResponse
}]);

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/proto/sui/rpc/v2/name_service.client.mjs
var NameServiceClient = class {
  constructor(_transport) {
    this._transport = _transport;
    this.typeName = NameService.typeName;
    this.methods = NameService.methods;
    this.options = NameService.options;
  }
  /**
  * @generated from protobuf rpc: LookupName(sui.rpc.v2.LookupNameRequest) returns (sui.rpc.v2.LookupNameResponse);
  */
  lookupName(input, options) {
    const method = this.methods[0], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
  /**
  * @generated from protobuf rpc: ReverseLookupName(sui.rpc.v2.ReverseLookupNameRequest) returns (sui.rpc.v2.ReverseLookupNameResponse);
  */
  reverseLookupName(input, options) {
    const method = this.methods[1], opt = this._transport.mergeOptions(options);
    return stackIntercept("unary", this._transport, method, opt, input);
  }
};

// node_modules/.pnpm/@protobuf-ts+grpcweb-transport@2.11.1/node_modules/@protobuf-ts/grpcweb-transport/build/es2015/goog-grpc-status-code.js
var GrpcStatusCode;
(function(GrpcStatusCode2) {
  GrpcStatusCode2[GrpcStatusCode2["OK"] = 0] = "OK";
  GrpcStatusCode2[GrpcStatusCode2["CANCELLED"] = 1] = "CANCELLED";
  GrpcStatusCode2[GrpcStatusCode2["UNKNOWN"] = 2] = "UNKNOWN";
  GrpcStatusCode2[GrpcStatusCode2["INVALID_ARGUMENT"] = 3] = "INVALID_ARGUMENT";
  GrpcStatusCode2[GrpcStatusCode2["DEADLINE_EXCEEDED"] = 4] = "DEADLINE_EXCEEDED";
  GrpcStatusCode2[GrpcStatusCode2["NOT_FOUND"] = 5] = "NOT_FOUND";
  GrpcStatusCode2[GrpcStatusCode2["ALREADY_EXISTS"] = 6] = "ALREADY_EXISTS";
  GrpcStatusCode2[GrpcStatusCode2["PERMISSION_DENIED"] = 7] = "PERMISSION_DENIED";
  GrpcStatusCode2[GrpcStatusCode2["UNAUTHENTICATED"] = 16] = "UNAUTHENTICATED";
  GrpcStatusCode2[GrpcStatusCode2["RESOURCE_EXHAUSTED"] = 8] = "RESOURCE_EXHAUSTED";
  GrpcStatusCode2[GrpcStatusCode2["FAILED_PRECONDITION"] = 9] = "FAILED_PRECONDITION";
  GrpcStatusCode2[GrpcStatusCode2["ABORTED"] = 10] = "ABORTED";
  GrpcStatusCode2[GrpcStatusCode2["OUT_OF_RANGE"] = 11] = "OUT_OF_RANGE";
  GrpcStatusCode2[GrpcStatusCode2["UNIMPLEMENTED"] = 12] = "UNIMPLEMENTED";
  GrpcStatusCode2[GrpcStatusCode2["INTERNAL"] = 13] = "INTERNAL";
  GrpcStatusCode2[GrpcStatusCode2["UNAVAILABLE"] = 14] = "UNAVAILABLE";
  GrpcStatusCode2[GrpcStatusCode2["DATA_LOSS"] = 15] = "DATA_LOSS";
})(GrpcStatusCode || (GrpcStatusCode = {}));

// node_modules/.pnpm/@protobuf-ts+grpcweb-transport@2.11.1/node_modules/@protobuf-ts/grpcweb-transport/build/es2015/grpc-web-format.js
var __awaiter3 = function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
function createGrpcWebRequestHeader(headers, format, timeout, meta, userAgent) {
  if (meta) {
    for (let [k, v] of Object.entries(meta)) {
      if (typeof v == "string")
        headers.append(k, v);
      else
        for (let i of v)
          headers.append(k, i);
    }
  }
  headers.set("Content-Type", format === "text" ? "application/grpc-web-text" : "application/grpc-web+proto");
  if (format == "text") {
    headers.set("Accept", "application/grpc-web-text");
  }
  headers.set("X-Grpc-Web", "1");
  if (userAgent)
    headers.set("X-User-Agent", userAgent);
  if (typeof timeout === "number") {
    if (timeout <= 0) {
      throw new RpcError(`timeout ${timeout} ms exceeded`, GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]);
    }
    headers.set("grpc-timeout", `${timeout}m`);
  } else if (timeout) {
    const deadline = timeout.getTime();
    const now = Date.now();
    if (deadline <= now) {
      throw new RpcError(`deadline ${timeout} exceeded`, GrpcStatusCode[GrpcStatusCode.DEADLINE_EXCEEDED]);
    }
    headers.set("grpc-timeout", `${deadline - now}m`);
  }
  return headers;
}
function createGrpcWebRequestBody(message, format) {
  let body = new Uint8Array(5 + message.length);
  body[0] = GrpcWebFrame.DATA;
  for (let msgLen = message.length, i = 4; i > 0; i--) {
    body[i] = msgLen % 256;
    msgLen >>>= 8;
  }
  body.set(message, 5);
  return format === "binary" ? body : base64encode(body);
}
function readGrpcWebResponseHeader(headersOrFetchResponse, httpStatus, httpStatusText) {
  if (arguments.length === 1) {
    let fetchResponse = headersOrFetchResponse;
    let responseType;
    try {
      responseType = fetchResponse.type;
    } catch (_a) {
    }
    switch (responseType) {
      case "error":
      case "opaque":
      case "opaqueredirect":
        throw new RpcError(`fetch response type ${fetchResponse.type}`, GrpcStatusCode[GrpcStatusCode.UNKNOWN]);
    }
    return readGrpcWebResponseHeader(fetchHeadersToHttp(fetchResponse.headers), fetchResponse.status, fetchResponse.statusText);
  }
  let headers = headersOrFetchResponse, httpOk = httpStatus >= 200 && httpStatus < 300, responseMeta = parseMetadata(headers), [statusCode, statusDetail] = parseStatus(headers);
  if ((statusCode === void 0 || statusCode === GrpcStatusCode.OK) && !httpOk) {
    statusCode = httpStatusToGrpc(httpStatus);
    statusDetail = httpStatusText;
  }
  return [statusCode, statusDetail, responseMeta];
}
function readGrpcWebResponseTrailer(data) {
  let headers = parseTrailer(data), [code, detail] = parseStatus(headers), meta = parseMetadata(headers);
  return [code !== null && code !== void 0 ? code : GrpcStatusCode.OK, detail, meta];
}
var GrpcWebFrame;
(function(GrpcWebFrame2) {
  GrpcWebFrame2[GrpcWebFrame2["DATA"] = 0] = "DATA";
  GrpcWebFrame2[GrpcWebFrame2["TRAILER"] = 128] = "TRAILER";
})(GrpcWebFrame || (GrpcWebFrame = {}));
function readGrpcWebResponseBody(stream, contentType, onFrame) {
  return __awaiter3(this, void 0, void 0, function* () {
    let streamReader, base64queue = "", byteQueue = new Uint8Array(0), format = parseFormat(contentType);
    if (isReadableStream(stream)) {
      let whatWgReadableStream = stream.getReader();
      streamReader = {
        next: () => whatWgReadableStream.read()
      };
    } else {
      streamReader = stream[Symbol.asyncIterator]();
    }
    while (true) {
      let result = yield streamReader.next();
      if (result.value !== void 0) {
        if (format === "text") {
          for (let i = 0; i < result.value.length; i++)
            base64queue += String.fromCharCode(result.value[i]);
          let safeLen = base64queue.length - base64queue.length % 4;
          if (safeLen === 0)
            continue;
          byteQueue = concatBytes(byteQueue, base64decode(base64queue.substring(0, safeLen)));
          base64queue = base64queue.substring(safeLen);
        } else {
          byteQueue = concatBytes(byteQueue, result.value);
        }
        while (byteQueue.length >= 5 && byteQueue[0] === GrpcWebFrame.DATA) {
          let msgLen = 0;
          for (let i = 1; i < 5; i++)
            msgLen = (msgLen << 8) + byteQueue[i];
          if (byteQueue.length - 5 >= msgLen) {
            onFrame(GrpcWebFrame.DATA, byteQueue.subarray(5, 5 + msgLen));
            byteQueue = byteQueue.subarray(5 + msgLen);
          } else
            break;
        }
      }
      if (result.done) {
        if (byteQueue.length === 0)
          break;
        if (byteQueue[0] !== GrpcWebFrame.TRAILER || byteQueue.length < 5)
          throw new RpcError("premature EOF", GrpcStatusCode[GrpcStatusCode.DATA_LOSS]);
        onFrame(GrpcWebFrame.TRAILER, byteQueue.subarray(5));
        break;
      }
    }
  });
}
var isReadableStream = (s) => {
  return typeof s.getReader == "function";
};
function concatBytes(a, b) {
  let n = new Uint8Array(a.length + b.length);
  n.set(a);
  n.set(b, a.length);
  return n;
}
function parseFormat(contentType) {
  switch (contentType) {
    case "application/grpc-web-text":
    case "application/grpc-web-text+proto":
      return "text";
    case "application/grpc-web":
    case "application/grpc-web+proto":
      return "binary";
    case void 0:
    case null:
      throw new RpcError("missing response content type", GrpcStatusCode[GrpcStatusCode.INTERNAL]);
    default:
      throw new RpcError("unexpected response content type: " + contentType, GrpcStatusCode[GrpcStatusCode.INTERNAL]);
  }
}
function parseStatus(headers) {
  let code, message;
  let m = headers["grpc-message"];
  if (m !== void 0) {
    if (Array.isArray(m))
      return [GrpcStatusCode.INTERNAL, "invalid grpc-web message"];
    message = m;
  }
  let s = headers["grpc-status"];
  if (s !== void 0) {
    if (Array.isArray(s))
      return [GrpcStatusCode.INTERNAL, "invalid grpc-web status"];
    code = parseInt(s, 10);
    if (GrpcStatusCode[code] === void 0)
      return [GrpcStatusCode.INTERNAL, "invalid grpc-web status"];
  }
  return [code, message];
}
function parseMetadata(headers) {
  let meta = {};
  for (let [k, v] of Object.entries(headers))
    switch (k) {
      case "grpc-message":
      case "grpc-status":
      case "content-type":
        break;
      default:
        meta[k] = v;
    }
  return meta;
}
function parseTrailer(trailerData) {
  let headers = {};
  for (let chunk2 of String.fromCharCode.apply(String, trailerData).trim().split("\r\n")) {
    if (chunk2 == "")
      continue;
    let [key, ...val] = chunk2.split(":");
    const value = val.join(":").trim();
    key = key.trim();
    let e = headers[key];
    if (typeof e == "string")
      headers[key] = [e, value];
    else if (Array.isArray(e))
      e.push(value);
    else
      headers[key] = value;
  }
  return headers;
}
function fetchHeadersToHttp(fetchHeaders) {
  let headers = {};
  fetchHeaders.forEach((value, key) => {
    let e = headers[key];
    if (typeof e == "string")
      headers[key] = [e, value];
    else if (Array.isArray(e))
      e.push(value);
    else
      headers[key] = value;
  });
  return headers;
}
function httpStatusToGrpc(httpStatus) {
  switch (httpStatus) {
    case 200:
      return GrpcStatusCode.OK;
    case 400:
      return GrpcStatusCode.INVALID_ARGUMENT;
    case 401:
      return GrpcStatusCode.UNAUTHENTICATED;
    case 403:
      return GrpcStatusCode.PERMISSION_DENIED;
    case 404:
      return GrpcStatusCode.NOT_FOUND;
    case 409:
      return GrpcStatusCode.ABORTED;
    case 412:
      return GrpcStatusCode.FAILED_PRECONDITION;
    case 429:
      return GrpcStatusCode.RESOURCE_EXHAUSTED;
    case 499:
      return GrpcStatusCode.CANCELLED;
    case 500:
      return GrpcStatusCode.UNKNOWN;
    case 501:
      return GrpcStatusCode.UNIMPLEMENTED;
    case 503:
      return GrpcStatusCode.UNAVAILABLE;
    case 504:
      return GrpcStatusCode.DEADLINE_EXCEEDED;
    default:
      return GrpcStatusCode.UNKNOWN;
  }
}

// node_modules/.pnpm/@protobuf-ts+grpcweb-transport@2.11.1/node_modules/@protobuf-ts/grpcweb-transport/build/es2015/grpc-web-transport.js
var GrpcWebFetchTransport = class {
  constructor(defaultOptions) {
    this.defaultOptions = defaultOptions;
  }
  mergeOptions(options) {
    return mergeRpcOptions(this.defaultOptions, options);
  }
  /**
   * Create an URI for a gRPC web call.
   *
   * Takes the `baseUrl` option and appends:
   * - slash "/"
   * - package name
   * - dot "."
   * - service name
   * - slash "/"
   * - method name
   *
   * If the service was declared without a package, the package name and dot
   * are omitted.
   *
   * All names are used exactly like declared in .proto.
   */
  makeUrl(method, options) {
    let base = options.baseUrl;
    if (base.endsWith("/"))
      base = base.substring(0, base.length - 1);
    return `${base}/${method.service.typeName}/${method.name}`;
  }
  clientStreaming(method) {
    const e = new RpcError("Client streaming is not supported by grpc-web", GrpcStatusCode[GrpcStatusCode.UNIMPLEMENTED]);
    e.methodName = method.name;
    e.serviceName = method.service.typeName;
    throw e;
  }
  duplex(method) {
    const e = new RpcError("Duplex streaming is not supported by grpc-web", GrpcStatusCode[GrpcStatusCode.UNIMPLEMENTED]);
    e.methodName = method.name;
    e.serviceName = method.service.typeName;
    throw e;
  }
  serverStreaming(method, input, options) {
    var _a, _b, _c, _d, _e;
    let opt = options, format = (_a = opt.format) !== null && _a !== void 0 ? _a : "text", fetch2 = (_b = opt.fetch) !== null && _b !== void 0 ? _b : globalThis.fetch, fetchInit = (_c = opt.fetchInit) !== null && _c !== void 0 ? _c : {}, url = this.makeUrl(method, opt), inputBytes = method.I.toBinary(input, opt.binaryOptions), defHeader = new Deferred(), responseStream = new RpcOutputStreamController(), responseEmptyBody = true, maybeStatus, defStatus = new Deferred(), maybeTrailer, defTrailer = new Deferred();
    fetch2(url, Object.assign(Object.assign({}, fetchInit), {
      method: "POST",
      headers: createGrpcWebRequestHeader(new globalThis.Headers(), format, opt.timeout, opt.meta),
      body: createGrpcWebRequestBody(inputBytes, format),
      signal: (_d = options.abort) !== null && _d !== void 0 ? _d : null
      // node-fetch@3.0.0-beta.9 rejects `undefined`
    })).then((fetchResponse) => {
      let [code, detail, meta] = readGrpcWebResponseHeader(fetchResponse);
      defHeader.resolve(meta);
      if (code != null && code !== GrpcStatusCode.OK)
        throw new RpcError(detail !== null && detail !== void 0 ? detail : GrpcStatusCode[code], GrpcStatusCode[code], meta);
      if (code != null)
        maybeStatus = {
          code: GrpcStatusCode[code],
          detail: detail !== null && detail !== void 0 ? detail : GrpcStatusCode[code]
        };
      return fetchResponse;
    }).then((fetchResponse) => {
      if (!fetchResponse.body)
        throw new RpcError("missing response body", GrpcStatusCode[GrpcStatusCode.INTERNAL]);
      return readGrpcWebResponseBody(fetchResponse.body, fetchResponse.headers.get("content-type"), (type, data) => {
        switch (type) {
          case GrpcWebFrame.DATA:
            responseStream.notifyMessage(method.O.fromBinary(data, opt.binaryOptions));
            responseEmptyBody = false;
            break;
          case GrpcWebFrame.TRAILER:
            let code, detail;
            [code, detail, maybeTrailer] = readGrpcWebResponseTrailer(data);
            maybeStatus = {
              code: GrpcStatusCode[code],
              detail: detail !== null && detail !== void 0 ? detail : GrpcStatusCode[code]
            };
            break;
        }
      });
    }).then(() => {
      if (!maybeTrailer && !responseEmptyBody)
        throw new RpcError(`missing trailers`, GrpcStatusCode[GrpcStatusCode.DATA_LOSS]);
      if (!maybeStatus)
        throw new RpcError(`missing status`, GrpcStatusCode[GrpcStatusCode.INTERNAL]);
      if (maybeStatus.code !== "OK")
        throw new RpcError(maybeStatus.detail, maybeStatus.code, maybeTrailer);
      responseStream.notifyComplete();
      defStatus.resolve(maybeStatus);
      defTrailer.resolve(maybeTrailer || {});
    }).catch((reason) => {
      let error;
      if (reason instanceof RpcError)
        error = reason;
      else if (reason instanceof Error && reason.name === "AbortError")
        error = new RpcError(reason.message, GrpcStatusCode[GrpcStatusCode.CANCELLED]);
      else
        error = new RpcError(reason instanceof Error ? reason.message : "" + reason, GrpcStatusCode[GrpcStatusCode.INTERNAL]);
      error.methodName = method.name;
      error.serviceName = method.service.typeName;
      defHeader.rejectPending(error);
      responseStream.notifyError(error);
      defStatus.rejectPending(error);
      defTrailer.rejectPending(error);
    });
    return new ServerStreamingCall(method, (_e = opt.meta) !== null && _e !== void 0 ? _e : {}, input, defHeader.promise, responseStream, defStatus.promise, defTrailer.promise);
  }
  unary(method, input, options) {
    var _a, _b, _c, _d, _e;
    let opt = options, format = (_a = opt.format) !== null && _a !== void 0 ? _a : "text", fetch2 = (_b = opt.fetch) !== null && _b !== void 0 ? _b : globalThis.fetch, fetchInit = (_c = opt.fetchInit) !== null && _c !== void 0 ? _c : {}, url = this.makeUrl(method, opt), inputBytes = method.I.toBinary(input, opt.binaryOptions), defHeader = new Deferred(), maybeMessage, defMessage = new Deferred(), maybeStatus, defStatus = new Deferred(), maybeTrailer, defTrailer = new Deferred();
    fetch2(url, Object.assign(Object.assign({}, fetchInit), {
      method: "POST",
      headers: createGrpcWebRequestHeader(new globalThis.Headers(), format, opt.timeout, opt.meta),
      body: createGrpcWebRequestBody(inputBytes, format),
      signal: (_d = options.abort) !== null && _d !== void 0 ? _d : null
      // node-fetch@3.0.0-beta.9 rejects `undefined`
    })).then((fetchResponse) => {
      let [code, detail, meta] = readGrpcWebResponseHeader(fetchResponse);
      defHeader.resolve(meta);
      if (code != null && code !== GrpcStatusCode.OK)
        throw new RpcError(detail !== null && detail !== void 0 ? detail : GrpcStatusCode[code], GrpcStatusCode[code], meta);
      if (code != null)
        maybeStatus = {
          code: GrpcStatusCode[code],
          detail: detail !== null && detail !== void 0 ? detail : GrpcStatusCode[code]
        };
      return fetchResponse;
    }).then((fetchResponse) => {
      if (!fetchResponse.body)
        throw new RpcError("missing response body", GrpcStatusCode[GrpcStatusCode.INTERNAL]);
      return readGrpcWebResponseBody(fetchResponse.body, fetchResponse.headers.get("content-type"), (type, data) => {
        switch (type) {
          case GrpcWebFrame.DATA:
            if (maybeMessage)
              throw new RpcError(`unary call received 2nd message`, GrpcStatusCode[GrpcStatusCode.DATA_LOSS]);
            maybeMessage = method.O.fromBinary(data, opt.binaryOptions);
            break;
          case GrpcWebFrame.TRAILER:
            let code, detail;
            [code, detail, maybeTrailer] = readGrpcWebResponseTrailer(data);
            maybeStatus = {
              code: GrpcStatusCode[code],
              detail: detail !== null && detail !== void 0 ? detail : GrpcStatusCode[code]
            };
            break;
        }
      });
    }).then(() => {
      if (!maybeTrailer && maybeMessage)
        throw new RpcError(`missing trailers`, GrpcStatusCode[GrpcStatusCode.DATA_LOSS]);
      if (!maybeStatus)
        throw new RpcError(`missing status`, GrpcStatusCode[GrpcStatusCode.INTERNAL]);
      if (!maybeMessage && maybeStatus.code === "OK")
        throw new RpcError("expected error status", GrpcStatusCode[GrpcStatusCode.DATA_LOSS]);
      if (!maybeMessage)
        throw new RpcError(maybeStatus.detail, maybeStatus.code, maybeTrailer);
      defMessage.resolve(maybeMessage);
      if (maybeStatus.code !== "OK")
        throw new RpcError(maybeStatus.detail, maybeStatus.code, maybeTrailer);
      defStatus.resolve(maybeStatus);
      defTrailer.resolve(maybeTrailer || {});
    }).catch((reason) => {
      let error;
      if (reason instanceof RpcError)
        error = reason;
      else if (reason instanceof Error && reason.name === "AbortError")
        error = new RpcError(reason.message, GrpcStatusCode[GrpcStatusCode.CANCELLED]);
      else
        error = new RpcError(reason instanceof Error ? reason.message : "" + reason, GrpcStatusCode[GrpcStatusCode.INTERNAL]);
      error.methodName = method.name;
      error.serviceName = method.service.typeName;
      defHeader.rejectPending(error);
      defMessage.rejectPending(error);
      defStatus.rejectPending(error);
      defTrailer.rejectPending(error);
    });
    return new UnaryCall(method, (_e = opt.meta) !== null && _e !== void 0 ? _e : {}, input, defHeader.promise, defMessage.promise, defStatus.promise, defTrailer.promise);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/grpc/client.mjs
var SUI_CLIENT_BRAND = Symbol.for("@mysten/SuiGrpcClient");
var SuiGrpcClient = class extends BaseClient {
  get mvr() {
    return this.core.mvr;
  }
  get [SUI_CLIENT_BRAND]() {
    return true;
  }
  constructor(options) {
    super({ network: options.network });
    const transport = options.transport ?? new GrpcWebFetchTransport({
      baseUrl: options.baseUrl,
      fetchInit: options.fetchInit
    });
    this.transactionExecutionService = new TransactionExecutionServiceClient(transport);
    this.ledgerService = new LedgerServiceClient(transport);
    this.stateService = new StateServiceClient(transport);
    this.subscriptionService = new SubscriptionServiceClient(transport);
    this.movePackageService = new MovePackageServiceClient(transport);
    this.signatureVerificationService = new SignatureVerificationServiceClient(transport);
    this.nameService = new NameServiceClient(transport);
    this.core = new GrpcCoreClient({
      client: this,
      base: this,
      network: options.network,
      mvr: options.mvr
    });
  }
  getObjects(input) {
    return this.core.getObjects(input);
  }
  getObject(input) {
    return this.core.getObject(input);
  }
  listCoins(input) {
    return this.core.listCoins(input);
  }
  listOwnedObjects(input) {
    return this.core.listOwnedObjects(input);
  }
  getBalance(input) {
    return this.core.getBalance(input);
  }
  listBalances(input) {
    return this.core.listBalances(input);
  }
  getCoinMetadata(input) {
    return this.core.getCoinMetadata(input);
  }
  getTransaction(input) {
    return this.core.getTransaction(input);
  }
  executeTransaction(input) {
    return this.core.executeTransaction(input);
  }
  signAndExecuteTransaction(input) {
    return this.core.signAndExecuteTransaction(input);
  }
  waitForTransaction(input) {
    return this.core.waitForTransaction(input);
  }
  simulateTransaction(input) {
    return this.core.simulateTransaction(input);
  }
  getReferenceGasPrice() {
    return this.core.getReferenceGasPrice();
  }
  async listDynamicFields(input) {
    const includeValue = input.include?.value ?? false;
    const paths = [
      "field_id",
      "name",
      "value_type",
      "kind",
      "child_id"
    ];
    if (includeValue)
      paths.push("value");
    const response = await this.stateService.listDynamicFields({
      parent: input.parentId,
      pageToken: input.cursor ? fromBase64(input.cursor) : void 0,
      pageSize: input.limit,
      readMask: { paths }
    });
    return {
      dynamicFields: response.response.dynamicFields.map((field) => {
        const isDynamicObject = field.kind === DynamicField_DynamicFieldKind.OBJECT;
        const fieldType = isDynamicObject ? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${field.name?.name}>,0x2::object::ID>` : `0x2::dynamic_field::Field<${field.name?.name},${field.valueType}>`;
        return {
          $kind: isDynamicObject ? "DynamicObject" : "DynamicField",
          fieldId: field.fieldId,
          name: {
            type: field.name?.name,
            bcs: field.name?.value
          },
          valueType: field.valueType,
          type: normalizeStructTag(fieldType),
          childId: field.childId,
          value: includeValue ? {
            type: field.valueType,
            bcs: field.value?.value ?? new Uint8Array()
          } : void 0
        };
      }),
      cursor: response.response.nextPageToken ? toBase64(response.response.nextPageToken) : null,
      hasNextPage: response.response.nextPageToken !== void 0
    };
  }
  getDynamicField(input) {
    return this.core.getDynamicField(input);
  }
  getMoveFunction(input) {
    return this.core.getMoveFunction(input);
  }
  resolveTransactionPlugin() {
    return this.core.resolveTransactionPlugin();
  }
  verifyZkLoginSignature(input) {
    return this.core.verifyZkLoginSignature(input);
  }
  defaultNameServiceName(input) {
    return this.core.defaultNameServiceName(input);
  }
};

// ../node_modules/.pnpm/@mysten+wallet-standard@0.20.1_@mysten+sui@2.6.0_typescript@5.9.3_/node_modules/@mysten/wallet-standard/dist/features/suiSignTransaction.mjs
var SuiSignTransaction = "sui:signTransaction";

// ../node_modules/.pnpm/@wallet-standard+app@1.1.0/node_modules/@wallet-standard/app/lib/esm/wallets.js
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _AppReadyEvent_detail;
var wallets = void 0;
var registeredWalletsSet = /* @__PURE__ */ new Set();
function addRegisteredWallet(wallet) {
  cachedWalletsArray = void 0;
  registeredWalletsSet.add(wallet);
}
function removeRegisteredWallet(wallet) {
  cachedWalletsArray = void 0;
  registeredWalletsSet.delete(wallet);
}
var listeners = {};
function getWallets() {
  if (wallets)
    return wallets;
  wallets = Object.freeze({ register, get, on });
  if (typeof window === "undefined")
    return wallets;
  const api = Object.freeze({ register });
  try {
    window.addEventListener("wallet-standard:register-wallet", ({ detail: callback }) => callback(api));
  } catch (error) {
    console.error("wallet-standard:register-wallet event listener could not be added\n", error);
  }
  try {
    window.dispatchEvent(new AppReadyEvent(api));
  } catch (error) {
    console.error("wallet-standard:app-ready event could not be dispatched\n", error);
  }
  return wallets;
}
function register(...wallets2) {
  wallets2 = wallets2.filter((wallet) => !registeredWalletsSet.has(wallet));
  if (!wallets2.length)
    return () => {
    };
  wallets2.forEach((wallet) => addRegisteredWallet(wallet));
  listeners["register"]?.forEach((listener) => guard(() => listener(...wallets2)));
  return function unregister() {
    wallets2.forEach((wallet) => removeRegisteredWallet(wallet));
    listeners["unregister"]?.forEach((listener) => guard(() => listener(...wallets2)));
  };
}
var cachedWalletsArray;
function get() {
  if (!cachedWalletsArray) {
    cachedWalletsArray = [...registeredWalletsSet];
  }
  return cachedWalletsArray;
}
function on(event, listener) {
  listeners[event]?.push(listener) || (listeners[event] = [listener]);
  return function off() {
    listeners[event] = listeners[event]?.filter((existingListener) => listener !== existingListener);
  };
}
function guard(callback) {
  try {
    callback();
  } catch (error) {
    console.error(error);
  }
}
var AppReadyEvent = class extends Event {
  get detail() {
    return __classPrivateFieldGet(this, _AppReadyEvent_detail, "f");
  }
  get type() {
    return "wallet-standard:app-ready";
  }
  constructor(api) {
    super("wallet-standard:app-ready", {
      bubbles: false,
      cancelable: false,
      composed: false
    });
    _AppReadyEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _AppReadyEvent_detail, api, "f");
  }
  /** @deprecated */
  preventDefault() {
    throw new Error("preventDefault cannot be called");
  }
  /** @deprecated */
  stopImmediatePropagation() {
    throw new Error("stopImmediatePropagation cannot be called");
  }
  /** @deprecated */
  stopPropagation() {
    throw new Error("stopPropagation cannot be called");
  }
};
_AppReadyEvent_detail = /* @__PURE__ */ new WeakMap();

// ../node_modules/.pnpm/@wallet-standard+features@1.1.0/node_modules/@wallet-standard/features/lib/esm/connect.js
var StandardConnect = "standard:connect";

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/Commands.mjs
var TransactionCommands = {
  MoveCall(input) {
    const [pkg, mod = "", fn = ""] = "target" in input ? input.target.split("::") : [
      input.package,
      input.module,
      input.function
    ];
    return {
      $kind: "MoveCall",
      MoveCall: {
        package: pkg,
        module: mod,
        function: fn,
        typeArguments: input.typeArguments ?? [],
        arguments: input.arguments ?? []
      }
    };
  },
  TransferObjects(objects, address) {
    return {
      $kind: "TransferObjects",
      TransferObjects: {
        objects: objects.map((o) => parse(ArgumentSchema, o)),
        address: parse(ArgumentSchema, address)
      }
    };
  },
  SplitCoins(coin, amounts) {
    return {
      $kind: "SplitCoins",
      SplitCoins: {
        coin: parse(ArgumentSchema, coin),
        amounts: amounts.map((o) => parse(ArgumentSchema, o))
      }
    };
  },
  MergeCoins(destination, sources) {
    return {
      $kind: "MergeCoins",
      MergeCoins: {
        destination: parse(ArgumentSchema, destination),
        sources: sources.map((o) => parse(ArgumentSchema, o))
      }
    };
  },
  Publish({ modules, dependencies }) {
    return {
      $kind: "Publish",
      Publish: {
        modules: modules.map((module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))),
        dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep))
      }
    };
  },
  Upgrade({ modules, dependencies, package: packageId, ticket }) {
    return {
      $kind: "Upgrade",
      Upgrade: {
        modules: modules.map((module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))),
        dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep)),
        package: packageId,
        ticket: parse(ArgumentSchema, ticket)
      }
    };
  },
  MakeMoveVec({ type, elements }) {
    return {
      $kind: "MakeMoveVec",
      MakeMoveVec: {
        type: type ?? null,
        elements: elements.map((o) => parse(ArgumentSchema, o))
      }
    };
  },
  Intent({ name, inputs = {}, data = {} }) {
    return {
      $kind: "$Intent",
      $Intent: {
        name,
        inputs: Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Array.isArray(value) ? value.map((o) => parse(ArgumentSchema, o)) : parse(ArgumentSchema, value)])),
        data
      }
    };
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/Inputs.mjs
function Pure(data) {
  return {
    $kind: "Pure",
    Pure: { bytes: data instanceof Uint8Array ? toBase64(data) : data.toBase64() }
  };
}
var Inputs = {
  Pure,
  ObjectRef({ objectId, digest, version }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "ImmOrOwnedObject",
        ImmOrOwnedObject: {
          digest,
          version,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  SharedObjectRef({ objectId, mutable, initialSharedVersion }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "SharedObject",
        SharedObject: {
          mutable,
          initialSharedVersion,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  ReceivingRef({ objectId, digest, version }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "Receiving",
        Receiving: {
          digest,
          version,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  FundsWithdrawal({ reservation, typeArg, withdrawFrom }) {
    return {
      $kind: "FundsWithdrawal",
      FundsWithdrawal: {
        reservation,
        typeArg,
        withdrawFrom
      }
    };
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/serializer.mjs
function parseTypeName(typeName) {
  const parts = typeName.split("::");
  if (parts.length !== 3)
    throw new Error(`Invalid type name format: ${typeName}`);
  return {
    package: parts[0],
    module: parts[1],
    name: parts[2]
  };
}
function isTxContext(param) {
  if (param.body.$kind !== "datatype")
    return false;
  const { package: pkg, module, name } = parseTypeName(param.body.datatype.typeName);
  return normalizeSuiAddress(pkg) === SUI_FRAMEWORK_ADDRESS && module === "tx_context" && name === "TxContext";
}
function getPureBcsSchema(typeSignature) {
  switch (typeSignature.$kind) {
    case "address":
      return suiBcs.Address;
    case "bool":
      return suiBcs.Bool;
    case "u8":
      return suiBcs.U8;
    case "u16":
      return suiBcs.U16;
    case "u32":
      return suiBcs.U32;
    case "u64":
      return suiBcs.U64;
    case "u128":
      return suiBcs.U128;
    case "u256":
      return suiBcs.U256;
    case "vector": {
      if (typeSignature.vector.$kind === "u8")
        return suiBcs.byteVector().transform({
          input: (val) => typeof val === "string" ? new TextEncoder().encode(val) : val,
          output: (val) => val
        });
      const type = getPureBcsSchema(typeSignature.vector);
      return type ? suiBcs.vector(type) : null;
    }
    case "datatype": {
      const { package: pkg, module, name } = parseTypeName(typeSignature.datatype.typeName);
      const normalizedPkg = normalizeSuiAddress(pkg);
      if (normalizedPkg === MOVE_STDLIB_ADDRESS) {
        if (module === "ascii" && name === "String")
          return suiBcs.String;
        if (module === "string" && name === "String")
          return suiBcs.String;
        if (module === "option" && name === "Option") {
          const type = getPureBcsSchema(typeSignature.datatype.typeParameters[0]);
          return type ? suiBcs.vector(type) : null;
        }
      }
      if (normalizedPkg === SUI_FRAMEWORK_ADDRESS) {
        if (module === "object" && name === "ID")
          return suiBcs.Address;
      }
      return null;
    }
    case "typeParameter":
    case "unknown":
      return null;
  }
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/intents/CoinWithBalance.mjs
var COIN_WITH_BALANCE = "CoinWithBalance";
var SUI_TYPE = normalizeStructTag("0x2::sui::SUI");
var CoinWithBalanceData = object({
  type: string(),
  balance: bigint()
});
async function resolveCoinBalance(transactionData, buildOptions, next) {
  const coinTypes = /* @__PURE__ */ new Set();
  const totalByType = /* @__PURE__ */ new Map();
  if (!transactionData.sender)
    throw new Error("Sender must be set to resolve CoinWithBalance");
  for (const command of transactionData.commands)
    if (command.$kind === "$Intent" && command.$Intent.name === COIN_WITH_BALANCE) {
      const { type, balance } = parse(CoinWithBalanceData, command.$Intent.data);
      if (type !== "gas" && balance > 0n)
        coinTypes.add(type);
      totalByType.set(type, (totalByType.get(type) ?? 0n) + balance);
    }
  const usedIds = /* @__PURE__ */ new Set();
  for (const input of transactionData.inputs) {
    if (input.Object?.ImmOrOwnedObject)
      usedIds.add(input.Object.ImmOrOwnedObject.objectId);
    if (input.UnresolvedObject?.objectId)
      usedIds.add(input.UnresolvedObject.objectId);
  }
  const coinsByType = /* @__PURE__ */ new Map();
  const addressBalanceByType = /* @__PURE__ */ new Map();
  const client = buildOptions.client;
  if (!client)
    throw new Error("Client must be provided to build or serialize transactions with CoinWithBalance intents");
  await Promise.all([...[...coinTypes].map(async (coinType) => {
    const { coins, addressBalance } = await getCoinsAndBalanceOfType({
      coinType,
      balance: totalByType.get(coinType),
      client,
      owner: transactionData.sender,
      usedIds
    });
    coinsByType.set(coinType, coins);
    addressBalanceByType.set(coinType, addressBalance);
  }), totalByType.has("gas") ? await client.core.getBalance({
    owner: transactionData.sender,
    coinType: SUI_TYPE
  }).then(({ balance }) => {
    addressBalanceByType.set("gas", BigInt(balance.addressBalance));
  }) : null]);
  const mergedCoins = /* @__PURE__ */ new Map();
  for (const [index, transaction] of transactionData.commands.entries()) {
    if (transaction.$kind !== "$Intent" || transaction.$Intent.name !== COIN_WITH_BALANCE)
      continue;
    const { type, balance } = transaction.$Intent.data;
    if (balance === 0n) {
      transactionData.replaceCommand(index, TransactionCommands.MoveCall({
        target: "0x2::coin::zero",
        typeArguments: [type === "gas" ? SUI_TYPE : type]
      }));
      continue;
    }
    const commands = [];
    if (addressBalanceByType.get(type) >= totalByType.get(type))
      commands.push(TransactionCommands.MoveCall({
        target: "0x2::coin::redeem_funds",
        typeArguments: [type === "gas" ? SUI_TYPE : type],
        arguments: [transactionData.addInput("withdrawal", Inputs.FundsWithdrawal({
          reservation: {
            $kind: "MaxAmountU64",
            MaxAmountU64: String(balance)
          },
          typeArg: {
            $kind: "Balance",
            Balance: type === "gas" ? SUI_TYPE : type
          },
          withdrawFrom: {
            $kind: "Sender",
            Sender: true
          }
        }))]
      }));
    else {
      if (!mergedCoins.has(type)) {
        const addressBalance = addressBalanceByType.get(type) ?? 0n;
        const coinType = type === "gas" ? SUI_TYPE : type;
        let baseCoin;
        let restCoins;
        if (type === "gas") {
          baseCoin = {
            $kind: "GasCoin",
            GasCoin: true
          };
          restCoins = [];
        } else
          [baseCoin, ...restCoins] = coinsByType.get(type).map((coin) => transactionData.addInput("object", Inputs.ObjectRef({
            objectId: coin.objectId,
            digest: coin.digest,
            version: coin.version
          })));
        if (addressBalance > 0n) {
          commands.push(TransactionCommands.MoveCall({
            target: "0x2::coin::redeem_funds",
            typeArguments: [coinType],
            arguments: [transactionData.addInput("withdrawal", Inputs.FundsWithdrawal({
              reservation: {
                $kind: "MaxAmountU64",
                MaxAmountU64: String(addressBalance)
              },
              typeArg: {
                $kind: "Balance",
                Balance: coinType
              },
              withdrawFrom: {
                $kind: "Sender",
                Sender: true
              }
            }))]
          }));
          commands.push(TransactionCommands.MergeCoins(baseCoin, [{
            $kind: "Result",
            Result: index + commands.length - 1
          }, ...restCoins]));
        } else if (restCoins.length > 0)
          commands.push(TransactionCommands.MergeCoins(baseCoin, restCoins));
        mergedCoins.set(type, baseCoin);
      }
      commands.push(TransactionCommands.SplitCoins(mergedCoins.get(type), [transactionData.addInput("pure", Inputs.Pure(suiBcs.u64().serialize(balance)))]));
    }
    transactionData.replaceCommand(index, commands);
    transactionData.mapArguments((arg, _command, commandIndex) => {
      if (commandIndex >= index && commandIndex < index + commands.length)
        return arg;
      if (arg.$kind === "Result" && arg.Result === index)
        return {
          $kind: "NestedResult",
          NestedResult: [index + commands.length - 1, 0]
        };
      return arg;
    });
  }
  return next();
}
async function getCoinsAndBalanceOfType({ coinType, balance, client, owner, usedIds }) {
  let remainingBalance = balance;
  const coins = [];
  const balanceRequest = client.core.getBalance({
    owner,
    coinType
  }).then(({ balance: balance$1 }) => {
    remainingBalance -= BigInt(balance$1.addressBalance);
    return balance$1;
  });
  const [allCoins, balanceResponse] = await Promise.all([loadMoreCoins(), balanceRequest]);
  if (BigInt(balanceResponse.balance) < balance)
    throw new Error(`Insufficient balance of ${coinType} for owner ${owner}. Required: ${balance}, Available: ${balance - remainingBalance}`);
  return {
    coins: allCoins,
    balance: BigInt(balanceResponse.coinBalance),
    addressBalance: BigInt(balanceResponse.addressBalance),
    coinBalance: BigInt(balanceResponse.coinBalance)
  };
  async function loadMoreCoins(cursor = null) {
    const { objects, hasNextPage, cursor: nextCursor } = await client.core.listCoins({
      owner,
      coinType,
      cursor
    });
    await balanceRequest;
    if (remainingBalance > 0n) {
      for (const coin of objects) {
        if (usedIds.has(coin.objectId))
          continue;
        const coinBalance = BigInt(coin.balance);
        coins.push(coin);
        remainingBalance -= coinBalance;
        if (remainingBalance <= 0)
          break;
      }
      if (hasNextPage)
        return loadMoreCoins(nextCursor);
    }
    return coins;
  }
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/data/v2.mjs
function enumUnion(options) {
  return union(Object.entries(options).map(([key, value]) => object({ [key]: value })));
}
var Argument3 = enumUnion({
  GasCoin: literal(true),
  Input: pipe(number(), integer()),
  Result: pipe(number(), integer()),
  NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())])
});
var GasData2 = object({
  budget: nullable(JsonU64),
  price: nullable(JsonU64),
  owner: nullable(SuiAddress),
  payment: nullable(array(ObjectRefSchema))
});
var ProgrammableMoveCall2 = object({
  package: ObjectID,
  module: string(),
  function: string(),
  typeArguments: array(string()),
  arguments: array(Argument3)
});
var $Intent2 = object({
  name: string(),
  inputs: record(string(), union([Argument3, array(Argument3)])),
  data: record(string(), unknown())
});
var Command3 = enumUnion({
  MoveCall: ProgrammableMoveCall2,
  TransferObjects: object({
    objects: array(Argument3),
    address: Argument3
  }),
  SplitCoins: object({
    coin: Argument3,
    amounts: array(Argument3)
  }),
  MergeCoins: object({
    destination: Argument3,
    sources: array(Argument3)
  }),
  Publish: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID)
  }),
  MakeMoveVec: object({
    type: nullable(string()),
    elements: array(Argument3)
  }),
  Upgrade: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID),
    package: ObjectID,
    ticket: Argument3
  }),
  $Intent: $Intent2
});
var CallArg2 = enumUnion({
  Object: enumUnion({
    ImmOrOwnedObject: ObjectRefSchema,
    SharedObject: object({
      objectId: ObjectID,
      initialSharedVersion: JsonU64,
      mutable: boolean()
    }),
    Receiving: ObjectRefSchema
  }),
  Pure: object({ bytes: BCSBytes }),
  UnresolvedPure: object({ value: unknown() }),
  UnresolvedObject: object({
    objectId: ObjectID,
    version: optional(nullable(JsonU64)),
    digest: optional(nullable(string())),
    initialSharedVersion: optional(nullable(JsonU64)),
    mutable: optional(nullable(boolean()))
  }),
  FundsWithdrawal: FundsWithdrawalArgSchema
});
var TransactionExpiration5 = enumUnion({
  None: literal(true),
  Epoch: JsonU64,
  ValidDuring: ValidDuringSchema
});
var SerializedTransactionDataV2Schema = object({
  version: literal(2),
  sender: nullish(SuiAddress),
  expiration: nullish(TransactionExpiration5),
  gasData: GasData2,
  inputs: array(CallArg2),
  commands: array(Command3),
  digest: optional(nullable(string()))
});

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/client/core-resolver.mjs
var MAX_OBJECTS_PER_FETCH = 50;
var GAS_SAFE_OVERHEAD = 1000n;
var MAX_GAS = 5e10;
function getClient(options) {
  if (!options.client)
    throw new Error(`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`);
  return options.client;
}
async function coreClientResolveTransactionPlugin(transactionData, options, next) {
  const client = getClient(options);
  await normalizeInputs(transactionData, client);
  await resolveObjectReferences(transactionData, client);
  if (!options.onlyTransactionKind)
    await setGasData(transactionData, client);
  return await next();
}
async function setGasData(transactionData, client) {
  let systemState = null;
  if (!transactionData.gasData.price) {
    systemState = (await client.core.getCurrentSystemState()).systemState;
    transactionData.gasData.price = systemState.referenceGasPrice;
  }
  await setGasBudget(transactionData, client);
  await setGasPayment(transactionData, client);
  if (!transactionData.expiration)
    await setExpiration(transactionData, client, systemState);
}
async function setGasBudget(transactionData, client) {
  if (transactionData.gasData.budget)
    return;
  const simulateResult = await client.core.simulateTransaction({
    transaction: transactionData.build({ overrides: { gasData: {
      budget: String(MAX_GAS),
      payment: []
    } } }),
    include: { effects: true }
  });
  if (simulateResult.$kind === "FailedTransaction") {
    const executionError = simulateResult.FailedTransaction.status.error ?? void 0;
    throw new SimulationError(`Transaction resolution failed: ${executionError?.message ?? "Unknown error"}`, {
      cause: simulateResult,
      executionError
    });
  }
  const gasUsed = simulateResult.Transaction.effects.gasUsed;
  const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(transactionData.gasData.price || 1n);
  const baseComputationCostWithOverhead = BigInt(gasUsed.computationCost) + safeOverhead;
  const gasBudget = baseComputationCostWithOverhead + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);
  transactionData.gasData.budget = String(gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead);
}
async function setGasPayment(transactionData, client) {
  if (!transactionData.gasData.payment) {
    const gasPayer = transactionData.gasData.owner ?? transactionData.sender;
    if (!gasPayer)
      throw new Error("Either a gas owner or sender must be set to determine gas payment.");
    const normalizedGasPayer = normalizeSuiAddress(gasPayer);
    let usesGasCoin = false;
    let withdrawals = 0n;
    transactionData.mapArguments((arg) => {
      if (arg.$kind === "GasCoin")
        usesGasCoin = true;
      else if (arg.$kind === "Input") {
        const input = transactionData.inputs[arg.Input];
        if (input.$kind === "FundsWithdrawal") {
          const withdrawalOwner = input.FundsWithdrawal.withdrawFrom.Sender ? transactionData.sender : gasPayer;
          if (withdrawalOwner && normalizeSuiAddress(withdrawalOwner) === normalizedGasPayer) {
            if (input.FundsWithdrawal.reservation.$kind === "MaxAmountU64")
              withdrawals += BigInt(input.FundsWithdrawal.reservation.MaxAmountU64);
          }
        }
      }
      return arg;
    });
    const [suiBalance, coins] = await Promise.all([usesGasCoin ? null : client.core.getBalance({ owner: gasPayer }), client.core.listCoins({
      owner: gasPayer,
      coinType: SUI_TYPE_ARG
    })]);
    if (suiBalance?.balance.addressBalance && BigInt(suiBalance.balance.addressBalance) >= BigInt(transactionData.gasData.budget || "0") + withdrawals) {
      transactionData.gasData.payment = [];
      return;
    }
    const paymentCoins = coins.objects.filter((coin) => {
      return !transactionData.inputs.find((input) => {
        if (input.Object?.ImmOrOwnedObject)
          return coin.objectId === input.Object.ImmOrOwnedObject.objectId;
        return false;
      });
    }).map((coin) => parse(ObjectRefSchema, {
      objectId: coin.objectId,
      digest: coin.digest,
      version: coin.version
    }));
    if (!paymentCoins.length)
      throw new Error("No valid gas coins found for the transaction.");
    transactionData.gasData.payment = paymentCoins;
  }
}
async function setExpiration(transactionData, client, existingSystemState) {
  const [systemState, { chainIdentifier }] = await Promise.all([existingSystemState ?? client.core.getCurrentSystemState().then((r) => r.systemState), client.core.getChainIdentifier()]);
  const currentEpoch = BigInt(systemState.epoch);
  transactionData.expiration = {
    $kind: "ValidDuring",
    ValidDuring: {
      minEpoch: String(currentEpoch),
      maxEpoch: String(currentEpoch + 1n),
      minTimestamp: null,
      maxTimestamp: null,
      chain: chainIdentifier,
      nonce: Math.random() * 4294967296 >>> 0
    }
  };
}
async function resolveObjectReferences(transactionData, client) {
  const objectsToResolve = transactionData.inputs.filter((input) => {
    return input.UnresolvedObject && !(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion);
  });
  const dedupedIds = [...new Set(objectsToResolve.map((input) => normalizeSuiObjectId(input.UnresolvedObject.objectId)))];
  const objectChunks = dedupedIds.length ? chunk(dedupedIds, MAX_OBJECTS_PER_FETCH) : [];
  const resolved = (await Promise.all(objectChunks.map((chunkIds) => client.core.getObjects({ objectIds: chunkIds })))).flatMap((result) => result.objects);
  const responsesById = new Map(dedupedIds.map((id, index) => {
    return [id, resolved[index]];
  }));
  const invalidObjects = Array.from(responsesById).filter(([_, obj]) => obj instanceof Error).map(([_, obj]) => obj.message);
  if (invalidObjects.length)
    throw new Error(`The following input objects are invalid: ${invalidObjects.join(", ")}`);
  const objects = resolved.map((object$1) => {
    if (object$1 instanceof Error)
      throw new Error(`Failed to fetch object: ${object$1.message}`);
    const owner = object$1.owner;
    const initialSharedVersion = owner && typeof owner === "object" ? owner.$kind === "Shared" ? owner.Shared.initialSharedVersion : owner.$kind === "ConsensusAddressOwner" ? owner.ConsensusAddressOwner.startVersion : null : null;
    return {
      objectId: object$1.objectId,
      digest: object$1.digest,
      version: object$1.version,
      initialSharedVersion
    };
  });
  const objectsById = new Map(dedupedIds.map((id, index) => {
    return [id, objects[index]];
  }));
  for (const [index, input] of transactionData.inputs.entries()) {
    if (!input.UnresolvedObject)
      continue;
    let updated;
    const id = normalizeSuiAddress(input.UnresolvedObject.objectId);
    const object$1 = objectsById.get(id);
    if (input.UnresolvedObject.initialSharedVersion ?? object$1?.initialSharedVersion)
      updated = Inputs.SharedObjectRef({
        objectId: id,
        initialSharedVersion: input.UnresolvedObject.initialSharedVersion || object$1?.initialSharedVersion,
        mutable: input.UnresolvedObject.mutable || isUsedAsMutable(transactionData, index)
      });
    else if (isUsedAsReceiving(transactionData, index))
      updated = Inputs.ReceivingRef({
        objectId: id,
        digest: input.UnresolvedObject.digest ?? object$1?.digest,
        version: input.UnresolvedObject.version ?? object$1?.version
      });
    transactionData.inputs[transactionData.inputs.indexOf(input)] = updated ?? Inputs.ObjectRef({
      objectId: id,
      digest: input.UnresolvedObject.digest ?? object$1?.digest,
      version: input.UnresolvedObject.version ?? object$1?.version
    });
  }
}
async function normalizeInputs(transactionData, client) {
  const { inputs, commands } = transactionData;
  const moveCallsToResolve = [];
  const moveFunctionsToResolve = /* @__PURE__ */ new Set();
  commands.forEach((command) => {
    if (command.MoveCall) {
      if (command.MoveCall._argumentTypes)
        return;
      if (command.MoveCall.arguments.map((arg) => {
        if (arg.$kind === "Input")
          return transactionData.inputs[arg.Input];
        return null;
      }).some((input) => input?.UnresolvedPure || input?.UnresolvedObject && typeof input?.UnresolvedObject.mutable !== "boolean")) {
        const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
        moveFunctionsToResolve.add(functionName);
        moveCallsToResolve.push(command.MoveCall);
      }
    }
  });
  const moveFunctionParameters = /* @__PURE__ */ new Map();
  if (moveFunctionsToResolve.size > 0)
    await Promise.all([...moveFunctionsToResolve].map(async (functionName) => {
      const [packageId, moduleName, name] = functionName.split("::");
      const { function: def } = await client.core.getMoveFunction({
        packageId,
        moduleName,
        name
      });
      moveFunctionParameters.set(functionName, def.parameters);
    }));
  if (moveCallsToResolve.length)
    await Promise.all(moveCallsToResolve.map(async (moveCall) => {
      const parameters = moveFunctionParameters.get(`${moveCall.package}::${moveCall.module}::${moveCall.function}`);
      if (!parameters)
        return;
      moveCall._argumentTypes = parameters.length > 0 && isTxContext(parameters.at(-1)) ? parameters.slice(0, parameters.length - 1) : parameters;
    }));
  commands.forEach((command) => {
    if (!command.MoveCall)
      return;
    const moveCall = command.MoveCall;
    const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
    const params = moveCall._argumentTypes;
    if (!params)
      return;
    if (params.length !== command.MoveCall.arguments.length)
      throw new Error(`Incorrect number of arguments for ${fnName}`);
    params.forEach((param, i) => {
      const arg = moveCall.arguments[i];
      if (arg.$kind !== "Input")
        return;
      const input = inputs[arg.Input];
      if (!input.UnresolvedPure && !input.UnresolvedObject)
        return;
      const inputValue = input.UnresolvedPure?.value ?? input.UnresolvedObject?.objectId;
      const schema = getPureBcsSchema(param.body);
      if (schema) {
        arg.type = "pure";
        inputs[inputs.indexOf(input)] = Inputs.Pure(schema.serialize(inputValue));
        return;
      }
      if (typeof inputValue !== "string")
        throw new Error(`Expect the argument to be an object id string, got ${JSON.stringify(inputValue, null, 2)}`);
      arg.type = "object";
      const unresolvedObject = input.UnresolvedPure ? {
        $kind: "UnresolvedObject",
        UnresolvedObject: { objectId: inputValue }
      } : input;
      inputs[arg.Input] = unresolvedObject;
    });
  });
}
function isUsedAsMutable(transactionData, index) {
  let usedAsMutable = false;
  transactionData.getInputUses(index, (arg, tx) => {
    if (tx.MoveCall && tx.MoveCall._argumentTypes) {
      const argIndex = tx.MoveCall.arguments.indexOf(arg);
      usedAsMutable = tx.MoveCall._argumentTypes[argIndex].reference !== "immutable" || usedAsMutable;
    }
    if (tx.$kind === "MakeMoveVec" || tx.$kind === "MergeCoins" || tx.$kind === "SplitCoins" || tx.$kind === "TransferObjects")
      usedAsMutable = true;
  });
  return usedAsMutable;
}
function isUsedAsReceiving(transactionData, index) {
  let usedAsReceiving = false;
  transactionData.getInputUses(index, (arg, tx) => {
    if (tx.MoveCall && tx.MoveCall._argumentTypes) {
      const argIndex = tx.MoveCall.arguments.indexOf(arg);
      usedAsReceiving = isReceivingType(tx.MoveCall._argumentTypes[argIndex]) || usedAsReceiving;
    }
  });
  return usedAsReceiving;
}
var RECEIVING_TYPE = "0x0000000000000000000000000000000000000000000000000000000000000002::transfer::Receiving";
function isReceivingType(type) {
  if (type.body.$kind !== "datatype")
    return false;
  return type.body.datatype.typeName === RECEIVING_TYPE;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/resolve.mjs
function needsTransactionResolution(data, options) {
  if (data.inputs.some((input) => {
    return input.UnresolvedObject || input.UnresolvedPure;
  }))
    return true;
  if (!options.onlyTransactionKind) {
    if (!data.gasData.price || !data.gasData.budget || !data.gasData.payment)
      return true;
    if (data.gasData.payment.length === 0 && !data.expiration)
      return true;
  }
  return false;
}
async function resolveTransactionPlugin(transactionData, options, next) {
  normalizeRawArguments(transactionData);
  if (!needsTransactionResolution(transactionData, options)) {
    await validate(transactionData);
    return next();
  }
  return (getClient2(options).core?.resolveTransactionPlugin() ?? coreClientResolveTransactionPlugin)(transactionData, options, async () => {
    await validate(transactionData);
    await next();
  });
}
function validate(transactionData) {
  transactionData.inputs.forEach((input, index) => {
    if (input.$kind !== "Object" && input.$kind !== "Pure" && input.$kind !== "FundsWithdrawal")
      throw new Error(`Input at index ${index} has not been resolved.  Expected a Pure, Object, or FundsWithdrawal input, but found ${JSON.stringify(input)}`);
  });
}
function getClient2(options) {
  if (!options.client)
    throw new Error(`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`);
  return options.client;
}
function normalizeRawArguments(transactionData) {
  for (const command of transactionData.commands)
    switch (command.$kind) {
      case "SplitCoins":
        command.SplitCoins.amounts.forEach((amount) => {
          normalizeRawArgument(amount, suiBcs.U64, transactionData);
        });
        break;
      case "TransferObjects":
        normalizeRawArgument(command.TransferObjects.address, suiBcs.Address, transactionData);
        break;
    }
}
function normalizeRawArgument(arg, schema, transactionData) {
  if (arg.$kind !== "Input")
    return;
  const input = transactionData.inputs[arg.Input];
  if (input.$kind !== "UnresolvedPure")
    return;
  transactionData.inputs[arg.Input] = Inputs.Pure(schema.serialize(input.UnresolvedPure.value));
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/object.mjs
function createObjectMethods(makeObject) {
  function object2(value) {
    return makeObject(value);
  }
  object2.system = (options) => {
    const mutable = options?.mutable;
    if (mutable !== void 0)
      return object2(Inputs.SharedObjectRef({
        objectId: SUI_SYSTEM_STATE_OBJECT_ID,
        initialSharedVersion: 1,
        mutable
      }));
    return object2({
      $kind: "UnresolvedObject",
      UnresolvedObject: {
        objectId: SUI_SYSTEM_STATE_OBJECT_ID,
        initialSharedVersion: 1
      }
    });
  };
  object2.clock = () => object2(Inputs.SharedObjectRef({
    objectId: SUI_CLOCK_OBJECT_ID,
    initialSharedVersion: 1,
    mutable: false
  }));
  object2.random = () => object2({
    $kind: "UnresolvedObject",
    UnresolvedObject: {
      objectId: SUI_RANDOM_OBJECT_ID,
      mutable: false
    }
  });
  object2.denyList = (options) => {
    return object2({
      $kind: "UnresolvedObject",
      UnresolvedObject: {
        objectId: SUI_DENY_LIST_OBJECT_ID,
        mutable: options?.mutable
      }
    });
  };
  object2.option = ({ type, value }) => (tx) => tx.moveCall({
    typeArguments: [type],
    target: `${MOVE_STDLIB_ADDRESS}::option::${value === null ? "none" : "some"}`,
    arguments: value === null ? [] : [tx.object(value)]
  });
  return object2;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/pure.mjs
function createPure(makePure) {
  function pure(typeOrSerializedValue, value) {
    if (typeof typeOrSerializedValue === "string")
      return makePure(pureBcsSchemaFromTypeName(typeOrSerializedValue).serialize(value));
    if (typeOrSerializedValue instanceof Uint8Array || isSerializedBcs(typeOrSerializedValue))
      return makePure(typeOrSerializedValue);
    throw new Error("tx.pure must be called either a bcs type name, or a serialized bcs value");
  }
  pure.u8 = (value) => makePure(suiBcs.U8.serialize(value));
  pure.u16 = (value) => makePure(suiBcs.U16.serialize(value));
  pure.u32 = (value) => makePure(suiBcs.U32.serialize(value));
  pure.u64 = (value) => makePure(suiBcs.U64.serialize(value));
  pure.u128 = (value) => makePure(suiBcs.U128.serialize(value));
  pure.u256 = (value) => makePure(suiBcs.U256.serialize(value));
  pure.bool = (value) => makePure(suiBcs.Bool.serialize(value));
  pure.string = (value) => makePure(suiBcs.String.serialize(value));
  pure.address = (value) => makePure(suiBcs.Address.serialize(value));
  pure.id = pure.address;
  pure.vector = (type, value) => {
    return makePure(suiBcs.vector(pureBcsSchemaFromTypeName(type)).serialize(value));
  };
  pure.option = (type, value) => {
    return makePure(suiBcs.option(pureBcsSchemaFromTypeName(type)).serialize(value));
  };
  return pure;
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/plugins/NamedPackagesPlugin.mjs
function namedPackagesPlugin() {
  return async (transactionData, buildOptions, next) => {
    const names = findNamesInTransaction(transactionData);
    if (names.types.length === 0 && names.packages.length === 0)
      return next();
    if (!buildOptions.client)
      throw new Error(`Transaction contains MVR names but no client was provided to resolve them. Please pass a client to Transaction#build()`);
    replaceNames(transactionData, await buildOptions.client.core.mvr.resolve({
      types: names.types,
      packages: names.packages
    }));
    await next();
  };
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/transactions/Transaction.mjs
function createTransactionResult(index, length = Infinity) {
  const baseResult = {
    $kind: "Result",
    get Result() {
      return typeof index === "function" ? index() : index;
    }
  };
  const nestedResults = [];
  const nestedResultFor = (resultIndex) => nestedResults[resultIndex] ??= {
    $kind: "NestedResult",
    get NestedResult() {
      return [typeof index === "function" ? index() : index, resultIndex];
    }
  };
  return new Proxy(baseResult, {
    set() {
      throw new Error("The transaction result is a proxy, and does not support setting properties directly");
    },
    get(target, property) {
      if (property in target)
        return Reflect.get(target, property);
      if (property === Symbol.iterator)
        return function* () {
          let i = 0;
          while (i < length) {
            yield nestedResultFor(i);
            i++;
          }
        };
      if (typeof property === "symbol")
        return;
      const resultIndex = parseInt(property, 10);
      if (Number.isNaN(resultIndex) || resultIndex < 0)
        return;
      return nestedResultFor(resultIndex);
    }
  });
}
var TRANSACTION_BRAND = Symbol.for("@mysten/transaction");
function isTransaction(obj) {
  return !!obj && typeof obj === "object" && obj[TRANSACTION_BRAND] === true;
}
var Transaction2 = class Transaction3 {
  #serializationPlugins;
  #buildPlugins;
  #intentResolvers = /* @__PURE__ */ new Map();
  #inputSection = [];
  #commandSection = [];
  #availableResults = /* @__PURE__ */ new Set();
  #pendingPromises = /* @__PURE__ */ new Set();
  #added = /* @__PURE__ */ new Map();
  /**
  * Converts from a serialize transaction kind (built with `build({ onlyTransactionKind: true })`) to a `Transaction` class.
  * Supports either a byte array, or base64-encoded bytes.
  */
  static fromKind(serialized) {
    const tx = new Transaction3();
    tx.#data = TransactionDataBuilder.fromKindBytes(typeof serialized === "string" ? fromBase64(serialized) : serialized);
    tx.#inputSection = tx.#data.inputs.slice();
    tx.#commandSection = tx.#data.commands.slice();
    tx.#availableResults = new Set(tx.#commandSection.map((_, i) => i));
    return tx;
  }
  /**
  * Converts from a serialized transaction format to a `Transaction` class.
  * There are two supported serialized formats:
  * - A string returned from `Transaction#serialize`. The serialized format must be compatible, or it will throw an error.
  * - A byte array (or base64-encoded bytes) containing BCS transaction data.
  */
  static from(transaction) {
    const newTransaction = new Transaction3();
    if (isTransaction(transaction))
      newTransaction.#data = TransactionDataBuilder.restore(transaction.getData());
    else if (typeof transaction !== "string" || !transaction.startsWith("{"))
      newTransaction.#data = TransactionDataBuilder.fromBytes(typeof transaction === "string" ? fromBase64(transaction) : transaction);
    else
      newTransaction.#data = TransactionDataBuilder.restore(JSON.parse(transaction));
    newTransaction.#inputSection = newTransaction.#data.inputs.slice();
    newTransaction.#commandSection = newTransaction.#data.commands.slice();
    newTransaction.#availableResults = new Set(newTransaction.#commandSection.map((_, i) => i));
    if (!newTransaction.isPreparedForSerialization({ supportedIntents: [COIN_WITH_BALANCE] }))
      throw new Error("Transaction has unresolved intents or async thunks. Call `prepareForSerialization` before copying.");
    if (newTransaction.#data.commands.some((cmd) => cmd.$Intent?.name === COIN_WITH_BALANCE))
      newTransaction.addIntentResolver(COIN_WITH_BALANCE, resolveCoinBalance);
    return newTransaction;
  }
  addSerializationPlugin(step) {
    this.#serializationPlugins.push(step);
  }
  addBuildPlugin(step) {
    this.#buildPlugins.push(step);
  }
  addIntentResolver(intent, resolver) {
    if (this.#intentResolvers.has(intent) && this.#intentResolvers.get(intent) !== resolver)
      throw new Error(`Intent resolver for ${intent} already exists`);
    this.#intentResolvers.set(intent, resolver);
  }
  setSender(sender) {
    this.#data.sender = sender;
  }
  /**
  * Sets the sender only if it has not already been set.
  * This is useful for sponsored transaction flows where the sender may not be the same as the signer address.
  */
  setSenderIfNotSet(sender) {
    if (!this.#data.sender)
      this.#data.sender = sender;
  }
  setExpiration(expiration) {
    this.#data.expiration = expiration ? parse(TransactionExpiration2, expiration) : null;
  }
  setGasPrice(price) {
    this.#data.gasData.price = String(price);
  }
  setGasBudget(budget) {
    this.#data.gasData.budget = String(budget);
  }
  setGasBudgetIfNotSet(budget) {
    if (this.#data.gasData.budget == null)
      this.#data.gasData.budget = String(budget);
  }
  setGasOwner(owner) {
    this.#data.gasData.owner = owner;
  }
  setGasPayment(payments) {
    this.#data.gasData.payment = payments.map((payment) => parse(ObjectRefSchema, payment));
  }
  #data;
  /** Get a snapshot of the transaction data, in JSON form: */
  getData() {
    return this.#data.snapshot();
  }
  get [TRANSACTION_BRAND]() {
    return true;
  }
  get pure() {
    Object.defineProperty(this, "pure", {
      enumerable: false,
      value: createPure((value) => {
        if (isSerializedBcs(value))
          return this.#addInput("pure", {
            $kind: "Pure",
            Pure: { bytes: value.toBase64() }
          });
        return this.#addInput("pure", is(NormalizedCallArg, value) ? parse(NormalizedCallArg, value) : value instanceof Uint8Array ? Inputs.Pure(value) : {
          $kind: "UnresolvedPure",
          UnresolvedPure: { value }
        });
      })
    });
    return this.pure;
  }
  constructor() {
    this.object = createObjectMethods((value) => {
      if (typeof value === "function")
        return this.object(this.add(value));
      if (typeof value === "object" && is(ArgumentSchema, value))
        return value;
      const id = getIdFromCallArg(value);
      const inserted = this.#data.inputs.find((i) => id === getIdFromCallArg(i));
      if (inserted?.Object?.SharedObject && typeof value === "object" && value.Object?.SharedObject)
        inserted.Object.SharedObject.mutable = inserted.Object.SharedObject.mutable || value.Object.SharedObject.mutable;
      return inserted ? {
        $kind: "Input",
        Input: this.#data.inputs.indexOf(inserted),
        type: "object"
      } : this.#addInput("object", typeof value === "string" ? {
        $kind: "UnresolvedObject",
        UnresolvedObject: { objectId: normalizeSuiAddress(value) }
      } : value);
    });
    this.#data = new TransactionDataBuilder();
    this.#buildPlugins = [];
    this.#serializationPlugins = [];
  }
  /** Returns an argument for the gas coin, to be used in a transaction. */
  get gas() {
    return {
      $kind: "GasCoin",
      GasCoin: true
    };
  }
  /**
  * Add a new object input to the transaction using the fully-resolved object reference.
  * If you only have an object ID, use `builder.object(id)` instead.
  */
  objectRef(...args) {
    return this.object(Inputs.ObjectRef(...args));
  }
  /**
  * Add a new receiving input to the transaction using the fully-resolved object reference.
  * If you only have an object ID, use `builder.object(id)` instead.
  */
  receivingRef(...args) {
    return this.object(Inputs.ReceivingRef(...args));
  }
  /**
  * Add a new shared object input to the transaction using the fully-resolved shared object reference.
  * If you only have an object ID, use `builder.object(id)` instead.
  */
  sharedObjectRef(...args) {
    return this.object(Inputs.SharedObjectRef(...args));
  }
  #fork() {
    const fork = new Transaction3();
    fork.#data = this.#data;
    fork.#serializationPlugins = this.#serializationPlugins;
    fork.#buildPlugins = this.#buildPlugins;
    fork.#intentResolvers = this.#intentResolvers;
    fork.#pendingPromises = this.#pendingPromises;
    fork.#availableResults = new Set(this.#availableResults);
    fork.#added = this.#added;
    this.#inputSection.push(fork.#inputSection);
    this.#commandSection.push(fork.#commandSection);
    return fork;
  }
  add(command) {
    if (typeof command === "function") {
      if (this.#added.has(command))
        return this.#added.get(command);
      const fork = this.#fork();
      const result = command(fork);
      if (!(result && typeof result === "object" && "then" in result)) {
        this.#availableResults = fork.#availableResults;
        this.#added.set(command, result);
        return result;
      }
      const placeholder = this.#addCommand({
        $kind: "$Intent",
        $Intent: {
          name: "AsyncTransactionThunk",
          inputs: {},
          data: {
            resultIndex: this.#data.commands.length,
            result: null
          }
        }
      });
      this.#pendingPromises.add(Promise.resolve(result).then((result$1) => {
        placeholder.$Intent.data.result = result$1;
      }));
      const txResult = createTransactionResult(() => placeholder.$Intent.data.resultIndex);
      this.#added.set(command, txResult);
      return txResult;
    } else
      this.#addCommand(command);
    return createTransactionResult(this.#data.commands.length - 1);
  }
  #addCommand(command) {
    const resultIndex = this.#data.commands.length;
    this.#commandSection.push(command);
    this.#availableResults.add(resultIndex);
    this.#data.commands.push(command);
    this.#data.mapCommandArguments(resultIndex, (arg) => {
      if (arg.$kind === "Result" && !this.#availableResults.has(arg.Result))
        throw new Error(`Result { Result: ${arg.Result} } is not available to use in the current transaction`);
      if (arg.$kind === "NestedResult" && !this.#availableResults.has(arg.NestedResult[0]))
        throw new Error(`Result { NestedResult: [${arg.NestedResult[0]}, ${arg.NestedResult[1]}] } is not available to use in the current transaction`);
      if (arg.$kind === "Input" && arg.Input >= this.#data.inputs.length)
        throw new Error(`Input { Input: ${arg.Input} } references an input that does not exist in the current transaction`);
      return arg;
    });
    return command;
  }
  #addInput(type, input) {
    this.#inputSection.push(input);
    return this.#data.addInput(type, input);
  }
  #normalizeTransactionArgument(arg) {
    if (isSerializedBcs(arg))
      return this.pure(arg);
    return this.#resolveArgument(arg);
  }
  #resolveArgument(arg) {
    if (typeof arg === "function") {
      const resolved = this.add(arg);
      if (typeof resolved === "function")
        return this.#resolveArgument(resolved);
      return parse(ArgumentSchema, resolved);
    }
    return parse(ArgumentSchema, arg);
  }
  splitCoins(coin, amounts) {
    const command = TransactionCommands.SplitCoins(typeof coin === "string" ? this.object(coin) : this.#resolveArgument(coin), amounts.map((amount) => typeof amount === "number" || typeof amount === "bigint" || typeof amount === "string" ? this.pure.u64(amount) : this.#normalizeTransactionArgument(amount)));
    this.#addCommand(command);
    return createTransactionResult(this.#data.commands.length - 1, amounts.length);
  }
  mergeCoins(destination, sources) {
    return this.add(TransactionCommands.MergeCoins(this.object(destination), sources.map((src) => this.object(src))));
  }
  publish({ modules, dependencies }) {
    return this.add(TransactionCommands.Publish({
      modules,
      dependencies
    }));
  }
  upgrade({ modules, dependencies, package: packageId, ticket }) {
    return this.add(TransactionCommands.Upgrade({
      modules,
      dependencies,
      package: packageId,
      ticket: this.object(ticket)
    }));
  }
  moveCall({ arguments: args, ...input }) {
    return this.add(TransactionCommands.MoveCall({
      ...input,
      arguments: args?.map((arg) => this.#normalizeTransactionArgument(arg))
    }));
  }
  transferObjects(objects, address) {
    return this.add(TransactionCommands.TransferObjects(objects.map((obj) => this.object(obj)), typeof address === "string" ? this.pure.address(address) : this.#normalizeTransactionArgument(address)));
  }
  makeMoveVec({ type, elements }) {
    return this.add(TransactionCommands.MakeMoveVec({
      type,
      elements: elements.map((obj) => this.object(obj))
    }));
  }
  /**
  * Create a FundsWithdrawal input for withdrawing Balance<T> from an address balance accumulator.
  * This is used for gas payments from address balances.
  *
  * @param options.amount - The Amount to withdraw (u64).
  * @param options.type - The balance type (e.g., "0x2::sui::SUI"). Defaults to SUI.
  */
  withdrawal({ amount, type }) {
    const input = {
      $kind: "FundsWithdrawal",
      FundsWithdrawal: {
        reservation: {
          $kind: "MaxAmountU64",
          MaxAmountU64: String(amount)
        },
        typeArg: {
          $kind: "Balance",
          Balance: type ?? "0x2::sui::SUI"
        },
        withdrawFrom: {
          $kind: "Sender",
          Sender: true
        }
      }
    };
    return this.#addInput("object", input);
  }
  /**
  * @deprecated Use toJSON instead.
  * For synchronous serialization, you can use `getData()`
  * */
  serialize() {
    return JSON.stringify(serializeV1TransactionData(this.#data.snapshot()));
  }
  async toJSON(options = {}) {
    await this.prepareForSerialization(options);
    const fullyResolved = this.isFullyResolved();
    return JSON.stringify(parse(SerializedTransactionDataV2Schema, fullyResolved ? {
      ...this.#data.snapshot(),
      digest: this.#data.getDigest()
    } : this.#data.snapshot()), (_key, value) => typeof value === "bigint" ? value.toString() : value, 2);
  }
  /** Build the transaction to BCS bytes, and sign it with the provided keypair. */
  async sign(options) {
    const { signer, ...buildOptions } = options;
    const bytes = await this.build(buildOptions);
    return signer.signTransaction(bytes);
  }
  /**
  * Checks if the transaction is prepared for serialization to JSON.
  * This means:
  *  - All async thunks have been fully resolved
  *  - All transaction intents have been resolved (unless in supportedIntents)
  *
  * Unlike `isFullyResolved()`, this does not require the sender, gas payment,
  * budget, or object versions to be set.
  */
  isPreparedForSerialization(options = {}) {
    if (this.#pendingPromises.size > 0)
      return false;
    if (this.#data.commands.some((cmd) => cmd.$Intent && !options.supportedIntents?.includes(cmd.$Intent.name)))
      return false;
    return true;
  }
  /**
  *  Ensures that:
  *  - All objects have been fully resolved to a specific version
  *  - All pure inputs have been serialized to bytes
  *  - All async thunks have been fully resolved
  *  - All transaction intents have been resolved
  * 	- The gas payment, budget, and price have been set
  *  - The transaction sender has been set
  *
  *  When true, the transaction will always be built to the same bytes and digest (unless the transaction is mutated)
  */
  isFullyResolved() {
    if (!this.isPreparedForSerialization())
      return false;
    if (!this.#data.sender)
      return false;
    if (needsTransactionResolution(this.#data, {}))
      return false;
    return true;
  }
  /** Build the transaction to BCS bytes. */
  async build(options = {}) {
    await this.prepareForSerialization(options);
    await this.#prepareBuild(options);
    return this.#data.build({ onlyTransactionKind: options.onlyTransactionKind });
  }
  /** Derive transaction digest */
  async getDigest(options = {}) {
    await this.prepareForSerialization(options);
    await this.#prepareBuild(options);
    return this.#data.getDigest();
  }
  /**
  * Prepare the transaction by validating the transaction data and resolving all inputs
  * so that it can be built into bytes.
  */
  async #prepareBuild(options) {
    if (!options.onlyTransactionKind && !this.#data.sender)
      throw new Error("Missing transaction sender");
    await this.#runPlugins([...this.#buildPlugins, resolveTransactionPlugin], options);
  }
  async #runPlugins(plugins, options) {
    try {
      const createNext = (i) => {
        if (i >= plugins.length)
          return () => {
          };
        const plugin = plugins[i];
        return async () => {
          const next = createNext(i + 1);
          let calledNext = false;
          let nextResolved = false;
          await plugin(this.#data, options, async () => {
            if (calledNext)
              throw new Error(`next() was call multiple times in TransactionPlugin ${i}`);
            calledNext = true;
            await next();
            nextResolved = true;
          });
          if (!calledNext)
            throw new Error(`next() was not called in TransactionPlugin ${i}`);
          if (!nextResolved)
            throw new Error(`next() was not awaited in TransactionPlugin ${i}`);
        };
      };
      await createNext(0)();
    } finally {
      this.#inputSection = this.#data.inputs.slice();
      this.#commandSection = this.#data.commands.slice();
      this.#availableResults = new Set(this.#commandSection.map((_, i) => i));
    }
  }
  async #waitForPendingTasks() {
    while (this.#pendingPromises.size > 0) {
      const newPromise = Promise.all(this.#pendingPromises);
      this.#pendingPromises.clear();
      this.#pendingPromises.add(newPromise);
      await newPromise;
      this.#pendingPromises.delete(newPromise);
    }
  }
  #sortCommandsAndInputs() {
    const unorderedCommands = this.#data.commands;
    const unorderedInputs = this.#data.inputs;
    const orderedCommands = this.#commandSection.flat(Infinity);
    const orderedInputs = this.#inputSection.flat(Infinity);
    if (orderedCommands.length !== unorderedCommands.length)
      throw new Error("Unexpected number of commands found in transaction data");
    if (orderedInputs.length !== unorderedInputs.length)
      throw new Error("Unexpected number of inputs found in transaction data");
    const filteredCommands = orderedCommands.filter((cmd) => cmd.$Intent?.name !== "AsyncTransactionThunk");
    this.#data.commands = filteredCommands;
    this.#data.inputs = orderedInputs;
    this.#commandSection = filteredCommands;
    this.#inputSection = orderedInputs;
    this.#availableResults = new Set(filteredCommands.map((_, i) => i));
    function getOriginalIndex(index) {
      const command = unorderedCommands[index];
      if (command.$Intent?.name === "AsyncTransactionThunk") {
        const result = command.$Intent.data.result;
        if (result == null)
          throw new Error("AsyncTransactionThunk has not been resolved");
        return getOriginalIndex(result.Result);
      }
      const updated = filteredCommands.indexOf(command);
      if (updated === -1)
        throw new Error("Unable to find original index for command");
      return updated;
    }
    this.#data.mapArguments((arg) => {
      if (arg.$kind === "Input") {
        const updated = orderedInputs.indexOf(unorderedInputs[arg.Input]);
        if (updated === -1)
          throw new Error("Input has not been resolved");
        return {
          ...arg,
          Input: updated
        };
      } else if (arg.$kind === "Result") {
        const updated = getOriginalIndex(arg.Result);
        return {
          ...arg,
          Result: updated
        };
      } else if (arg.$kind === "NestedResult") {
        const updated = getOriginalIndex(arg.NestedResult[0]);
        return {
          ...arg,
          NestedResult: [updated, arg.NestedResult[1]]
        };
      }
      return arg;
    });
    for (const [i, cmd] of unorderedCommands.entries())
      if (cmd.$Intent?.name === "AsyncTransactionThunk")
        try {
          cmd.$Intent.data.resultIndex = getOriginalIndex(i);
        } catch {
        }
  }
  async prepareForSerialization(options) {
    await this.#waitForPendingTasks();
    this.#sortCommandsAndInputs();
    const intents = /* @__PURE__ */ new Set();
    for (const command of this.#data.commands)
      if (command.$Intent)
        intents.add(command.$Intent.name);
    const steps = [...this.#serializationPlugins];
    for (const intent of intents) {
      if (options.supportedIntents?.includes(intent))
        continue;
      if (!this.#intentResolvers.has(intent))
        throw new Error(`Missing intent resolver for ${intent}`);
      steps.push(this.#intentResolvers.get(intent));
    }
    steps.push(namedPackagesPlugin());
    await this.#runPlugins(steps, options);
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/jsonRpc/errors.mjs
var CODE_TO_ERROR_TYPE = {
  "-32700": "ParseError",
  "-32701": "OversizedRequest",
  "-32702": "OversizedResponse",
  "-32600": "InvalidRequest",
  "-32601": "MethodNotFound",
  "-32602": "InvalidParams",
  "-32603": "InternalError",
  "-32604": "ServerBusy",
  "-32000": "CallExecutionFailed",
  "-32001": "UnknownError",
  "-32003": "SubscriptionClosed",
  "-32004": "SubscriptionClosedWithError",
  "-32005": "BatchesNotSupported",
  "-32006": "TooManySubscriptions",
  "-32050": "TransientError",
  "-32002": "TransactionExecutionClientError"
};
var SuiHTTPTransportError = class extends Error {
};
var JsonRpcError = class extends SuiHTTPTransportError {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.type = CODE_TO_ERROR_TYPE[code] ?? "ServerError";
  }
};
var SuiHTTPStatusError = class extends SuiHTTPTransportError {
  constructor(message, status, statusText) {
    super(message);
    this.status = status;
    this.statusText = statusText;
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/jsonRpc/rpc-websocket-client.mjs
function getWebsocketUrl(httpUrl) {
  const url = new URL(httpUrl);
  url.protocol = url.protocol.replace("http", "ws");
  return url.toString();
}
var DEFAULT_CLIENT_OPTIONS = {
  WebSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : void 0,
  callTimeout: 3e4,
  reconnectTimeout: 3e3,
  maxReconnects: 5
};
var WebsocketClient = class {
  #requestId = 0;
  #disconnects = 0;
  #webSocket = null;
  #connectionPromise = null;
  #subscriptions = /* @__PURE__ */ new Set();
  #pendingRequests = /* @__PURE__ */ new Map();
  constructor(endpoint, options = {}) {
    this.endpoint = endpoint;
    this.options = {
      ...DEFAULT_CLIENT_OPTIONS,
      ...options
    };
    if (!this.options.WebSocketConstructor)
      throw new Error("Missing WebSocket constructor");
    if (this.endpoint.startsWith("http"))
      this.endpoint = getWebsocketUrl(this.endpoint);
  }
  async makeRequest(method, params, signal) {
    const webSocket = await this.#setupWebSocket();
    return new Promise((resolve, reject) => {
      this.#requestId += 1;
      this.#pendingRequests.set(this.#requestId, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.#pendingRequests.delete(this.#requestId);
          reject(/* @__PURE__ */ new Error(`Request timeout: ${method}`));
        }, this.options.callTimeout)
      });
      signal?.addEventListener("abort", () => {
        this.#pendingRequests.delete(this.#requestId);
        reject(signal.reason);
      });
      webSocket.send(JSON.stringify({
        jsonrpc: "2.0",
        id: this.#requestId,
        method,
        params
      }));
    }).then(({ error, result }) => {
      if (error)
        throw new JsonRpcError(error.message, error.code);
      return result;
    });
  }
  #setupWebSocket() {
    if (this.#connectionPromise)
      return this.#connectionPromise;
    this.#connectionPromise = new Promise((resolve) => {
      this.#webSocket?.close();
      this.#webSocket = new this.options.WebSocketConstructor(this.endpoint);
      this.#webSocket.addEventListener("open", () => {
        this.#disconnects = 0;
        resolve(this.#webSocket);
      });
      this.#webSocket.addEventListener("close", () => {
        this.#disconnects++;
        if (this.#disconnects <= this.options.maxReconnects)
          setTimeout(() => {
            this.#reconnect();
          }, this.options.reconnectTimeout);
      });
      this.#webSocket.addEventListener("message", ({ data }) => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (error) {
          console.error(new Error(`Failed to parse RPC message: ${data}`, { cause: error }));
          return;
        }
        if ("id" in json && json.id != null && this.#pendingRequests.has(json.id)) {
          const { resolve: resolve$1, timeout } = this.#pendingRequests.get(json.id);
          clearTimeout(timeout);
          resolve$1(json);
        } else if ("params" in json) {
          const { params } = json;
          this.#subscriptions.forEach((subscription) => {
            if (subscription.subscriptionId === params.subscription) {
              if (params.subscription === subscription.subscriptionId)
                subscription.onMessage(params.result);
            }
          });
        }
      });
    });
    return this.#connectionPromise;
  }
  async #reconnect() {
    this.#webSocket?.close();
    this.#connectionPromise = null;
    return Promise.allSettled([...this.#subscriptions].map((subscription) => subscription.subscribe(this)));
  }
  async subscribe(input) {
    const subscription = new RpcSubscription(input);
    this.#subscriptions.add(subscription);
    await subscription.subscribe(this);
    return () => subscription.unsubscribe(this);
  }
};
var RpcSubscription = class {
  constructor(input) {
    this.subscriptionId = null;
    this.subscribed = false;
    this.input = input;
  }
  onMessage(message) {
    if (this.subscribed)
      this.input.onMessage(message);
  }
  async unsubscribe(client) {
    const { subscriptionId } = this;
    this.subscribed = false;
    if (subscriptionId == null)
      return false;
    this.subscriptionId = null;
    return client.makeRequest(this.input.unsubscribe, [subscriptionId]);
  }
  async subscribe(client) {
    this.subscriptionId = null;
    this.subscribed = true;
    const newSubscriptionId = await client.makeRequest(this.input.method, this.input.params, this.input.signal);
    if (this.subscribed)
      this.subscriptionId = newSubscriptionId;
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/jsonRpc/http-transport.mjs
var JsonRpcHTTPTransport = class {
  #requestId = 0;
  #options;
  #websocketClient;
  constructor(options) {
    this.#options = options;
  }
  fetch(input, init2) {
    const fetchFn = this.#options.fetch ?? fetch;
    if (!fetchFn)
      throw new Error("The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport.");
    return fetchFn(input, init2);
  }
  #getWebsocketClient() {
    if (!this.#websocketClient) {
      const WebSocketConstructor = this.#options.WebSocketConstructor ?? WebSocket;
      if (!WebSocketConstructor)
        throw new Error("The current environment does not support WebSocket, you can provide a WebSocketConstructor in the options for SuiHTTPTransport.");
      this.#websocketClient = new WebsocketClient(this.#options.websocket?.url ?? this.#options.url, {
        WebSocketConstructor,
        ...this.#options.websocket
      });
    }
    return this.#websocketClient;
  }
  async request(input) {
    this.#requestId += 1;
    const res = await this.fetch(this.#options.rpc?.url ?? this.#options.url, {
      method: "POST",
      signal: input.signal,
      headers: {
        "Content-Type": "application/json",
        "Client-Sdk-Type": "typescript",
        "Client-Sdk-Version": PACKAGE_VERSION,
        "Client-Target-Api-Version": TARGETED_RPC_VERSION,
        "Client-Request-Method": input.method,
        ...this.#options.rpc?.headers
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.#requestId,
        method: input.method,
        params: input.params
      })
    });
    if (!res.ok)
      throw new SuiHTTPStatusError(`Unexpected status code: ${res.status}`, res.status, res.statusText);
    const data = await res.json();
    if ("error" in data && data.error != null)
      throw new JsonRpcError(data.error.message, data.error.code);
    return data.result;
  }
  async subscribe(input) {
    const unsubscribe = await this.#getWebsocketClient().subscribe(input);
    if (input.signal) {
      input.signal.throwIfAborted();
      input.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    }
    return async () => !!await unsubscribe();
  }
};

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/jsonRpc/core.mjs
var MAX_GAS2 = 5e10;
function parseJsonRpcExecutionStatus(status, abortError) {
  if (status.status === "success")
    return {
      success: true,
      error: null
    };
  const rawMessage = status.error ?? "Unknown";
  if (abortError) {
    const commandMatch = rawMessage.match(/in command (\d+)/);
    const command = commandMatch ? parseInt(commandMatch[1], 10) : void 0;
    const instructionMatch = rawMessage.match(/instruction:\s*(\d+)/);
    const instruction = instructionMatch ? parseInt(instructionMatch[1], 10) : void 0;
    const moduleParts = abortError.module_id?.split("::") ?? [];
    const pkg = moduleParts[0] ? normalizeSuiAddress(moduleParts[0]) : void 0;
    const module = moduleParts[1];
    return {
      success: false,
      error: {
        $kind: "MoveAbort",
        message: formatMoveAbortMessage({
          command,
          location: pkg && module ? {
            package: pkg,
            module,
            functionName: abortError.function ?? void 0,
            instruction
          } : void 0,
          abortCode: String(abortError.error_code ?? 0),
          cleverError: abortError.line != null ? { lineNumber: abortError.line } : void 0
        }),
        command,
        MoveAbort: {
          abortCode: String(abortError.error_code ?? 0),
          location: abortError.module_id ? {
            package: normalizeSuiAddress(abortError.module_id.split("::")[0] ?? ""),
            module: abortError.module_id.split("::")[1] ?? "",
            functionName: abortError.function ?? void 0,
            instruction
          } : void 0
        }
      }
    };
  }
  return {
    success: false,
    error: {
      $kind: "Unknown",
      message: rawMessage,
      Unknown: null
    }
  };
}
var JSONRpcCoreClient = class extends CoreClient {
  #jsonRpcClient;
  constructor({ jsonRpcClient, mvr }) {
    super({
      network: jsonRpcClient.network,
      base: jsonRpcClient,
      mvr
    });
    this.#jsonRpcClient = jsonRpcClient;
  }
  async getObjects(options) {
    const batches = chunk(options.objectIds, 50);
    const results = [];
    for (const batch of batches) {
      const objects = await this.#jsonRpcClient.multiGetObjects({
        ids: batch,
        options: {
          showOwner: true,
          showType: true,
          showBcs: options.include?.content || options.include?.objectBcs ? true : false,
          showPreviousTransaction: options.include?.previousTransaction || options.include?.objectBcs ? true : false,
          showStorageRebate: options.include?.objectBcs ?? false,
          showContent: options.include?.json ?? false
        },
        signal: options.signal
      });
      for (const [idx, object2] of objects.entries())
        if (object2.error)
          results.push(ObjectError.fromResponse(object2.error, batch[idx]));
        else
          results.push(parseObject(object2.data, options.include));
    }
    return { objects: results };
  }
  async listOwnedObjects(options) {
    let filter = null;
    if (options.type) {
      const parts = options.type.split("::");
      if (parts.length === 1)
        filter = { Package: options.type };
      else if (parts.length === 2)
        filter = { MoveModule: {
          package: parts[0],
          module: parts[1]
        } };
      else
        filter = { StructType: options.type };
    }
    const objects = await this.#jsonRpcClient.getOwnedObjects({
      owner: options.owner,
      limit: options.limit,
      cursor: options.cursor,
      options: {
        showOwner: true,
        showType: true,
        showBcs: options.include?.content || options.include?.objectBcs ? true : false,
        showPreviousTransaction: options.include?.previousTransaction || options.include?.objectBcs ? true : false,
        showStorageRebate: options.include?.objectBcs ?? false,
        showContent: options.include?.json ?? false
      },
      filter,
      signal: options.signal
    });
    return {
      objects: objects.data.map((result) => {
        if (result.error)
          throw ObjectError.fromResponse(result.error);
        return parseObject(result.data, options.include);
      }),
      hasNextPage: objects.hasNextPage,
      cursor: objects.nextCursor ?? null
    };
  }
  async listCoins(options) {
    const coins = await this.#jsonRpcClient.getCoins({
      owner: options.owner,
      coinType: options.coinType,
      limit: options.limit,
      cursor: options.cursor,
      signal: options.signal
    });
    return {
      objects: coins.data.map((coin) => ({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest,
        balance: coin.balance,
        type: normalizeStructTag(`0x2::coin::Coin<${coin.coinType}>`),
        owner: {
          $kind: "AddressOwner",
          AddressOwner: options.owner
        }
      })),
      hasNextPage: coins.hasNextPage,
      cursor: coins.nextCursor ?? null
    };
  }
  async getBalance(options) {
    const balance = await this.#jsonRpcClient.getBalance({
      owner: options.owner,
      coinType: options.coinType,
      signal: options.signal
    });
    const addressBalance = balance.fundsInAddressBalance ?? "0";
    const coinBalance = String(BigInt(balance.totalBalance) - BigInt(addressBalance));
    return { balance: {
      coinType: normalizeStructTag(balance.coinType),
      balance: balance.totalBalance,
      coinBalance,
      addressBalance
    } };
  }
  async getCoinMetadata(options) {
    const coinType = (await this.mvr.resolveType({ type: options.coinType })).type;
    const result = await this.#jsonRpcClient.getCoinMetadata({
      coinType,
      signal: options.signal
    });
    if (!result)
      return { coinMetadata: null };
    return { coinMetadata: {
      id: result.id ?? null,
      decimals: result.decimals,
      name: result.name,
      symbol: result.symbol,
      description: result.description,
      iconUrl: result.iconUrl ?? null
    } };
  }
  async listBalances(options) {
    return {
      balances: (await this.#jsonRpcClient.getAllBalances({
        owner: options.owner,
        signal: options.signal
      })).map((balance) => {
        const addressBalance = balance.fundsInAddressBalance ?? "0";
        const coinBalance = String(BigInt(balance.totalBalance) - BigInt(addressBalance));
        return {
          coinType: normalizeStructTag(balance.coinType),
          balance: balance.totalBalance,
          coinBalance,
          addressBalance
        };
      }),
      hasNextPage: false,
      cursor: null
    };
  }
  async getTransaction(options) {
    return parseTransaction2(await this.#jsonRpcClient.getTransactionBlock({
      digest: options.digest,
      options: {
        showRawInput: true,
        showEffects: true,
        showObjectChanges: options.include?.objectTypes ?? false,
        showRawEffects: options.include?.effects ?? false,
        showEvents: options.include?.events ?? false,
        showBalanceChanges: options.include?.balanceChanges ?? false
      },
      signal: options.signal
    }), options.include);
  }
  async executeTransaction(options) {
    return parseTransaction2(await this.#jsonRpcClient.executeTransactionBlock({
      transactionBlock: options.transaction,
      signature: options.signatures,
      options: {
        showRawInput: true,
        showEffects: true,
        showRawEffects: options.include?.effects ?? false,
        showEvents: options.include?.events ?? false,
        showObjectChanges: options.include?.objectTypes ?? false,
        showBalanceChanges: options.include?.balanceChanges ?? false
      },
      signal: options.signal
    }), options.include);
  }
  async simulateTransaction(options) {
    if (!(options.transaction instanceof Uint8Array))
      await options.transaction.prepareForSerialization({ client: this });
    const tx = Transaction2.from(options.transaction);
    const data = options.transaction instanceof Uint8Array ? null : TransactionDataBuilder.restore(options.transaction.getData());
    const transactionBytes = data ? data.build({ overrides: { gasData: {
      budget: data.gasData.budget ?? String(MAX_GAS2),
      price: data.gasData.price ?? String(await this.#jsonRpcClient.getReferenceGasPrice()),
      payment: data.gasData.payment ?? []
    } } }) : options.transaction;
    const result = await this.#jsonRpcClient.dryRunTransactionBlock({
      transactionBlock: transactionBytes,
      signal: options.signal
    });
    const { effects, objectTypes } = parseTransactionEffectsJson({
      effects: result.effects,
      objectChanges: result.objectChanges
    });
    const transactionData = {
      digest: TransactionDataBuilder.getDigestFromBytes(transactionBytes),
      epoch: null,
      status: effects.status,
      effects: options.include?.effects ? effects : void 0,
      objectTypes: options.include?.objectTypes ? objectTypes : void 0,
      signatures: [],
      transaction: options.include?.transaction ? parseTransactionBcs(options.transaction instanceof Uint8Array ? options.transaction : await options.transaction.build({ client: this }).catch(() => null)) : void 0,
      bcs: options.include?.bcs ? transactionBytes : void 0,
      balanceChanges: options.include?.balanceChanges ? result.balanceChanges.map((change) => ({
        coinType: normalizeStructTag(change.coinType),
        address: parseOwnerAddress(change.owner),
        amount: change.amount
      })) : void 0,
      events: options.include?.events ? result.events?.map((event) => ({
        packageId: event.packageId,
        module: event.transactionModule,
        sender: event.sender,
        eventType: event.type,
        bcs: "bcs" in event ? fromBase64(event.bcs) : new Uint8Array(),
        json: event.parsedJson ?? null
      })) ?? [] : void 0
    };
    let commandResults;
    if (options.include?.commandResults)
      try {
        const sender = tx.getData().sender ?? normalizeSuiAddress("0x0");
        const devInspectResult = await this.#jsonRpcClient.devInspectTransactionBlock({
          sender,
          transactionBlock: tx,
          signal: options.signal
        });
        if (devInspectResult.results)
          commandResults = devInspectResult.results.map((result$1) => ({
            returnValues: (result$1.returnValues ?? []).map(([bytes]) => ({ bcs: new Uint8Array(bytes) })),
            mutatedReferences: (result$1.mutableReferenceOutputs ?? []).map(([, bytes]) => ({ bcs: new Uint8Array(bytes) }))
          }));
      } catch {
      }
    return effects.status.success ? {
      $kind: "Transaction",
      Transaction: transactionData,
      commandResults
    } : {
      $kind: "FailedTransaction",
      FailedTransaction: transactionData,
      commandResults
    };
  }
  async getReferenceGasPrice(options) {
    const referenceGasPrice = await this.#jsonRpcClient.getReferenceGasPrice({ signal: options?.signal });
    return { referenceGasPrice: String(referenceGasPrice) };
  }
  async getCurrentSystemState(options) {
    const systemState = await this.#jsonRpcClient.getLatestSuiSystemState({ signal: options?.signal });
    return { systemState: {
      systemStateVersion: systemState.systemStateVersion,
      epoch: systemState.epoch,
      protocolVersion: systemState.protocolVersion,
      referenceGasPrice: systemState.referenceGasPrice?.toString() ?? null,
      epochStartTimestampMs: systemState.epochStartTimestampMs,
      safeMode: systemState.safeMode,
      safeModeStorageRewards: systemState.safeModeStorageRewards,
      safeModeComputationRewards: systemState.safeModeComputationRewards,
      safeModeStorageRebates: systemState.safeModeStorageRebates,
      safeModeNonRefundableStorageFee: systemState.safeModeNonRefundableStorageFee,
      parameters: {
        epochDurationMs: systemState.epochDurationMs,
        stakeSubsidyStartEpoch: systemState.stakeSubsidyStartEpoch,
        maxValidatorCount: systemState.maxValidatorCount,
        minValidatorJoiningStake: systemState.minValidatorJoiningStake,
        validatorLowStakeThreshold: systemState.validatorLowStakeThreshold,
        validatorLowStakeGracePeriod: systemState.validatorLowStakeGracePeriod
      },
      storageFund: {
        totalObjectStorageRebates: systemState.storageFundTotalObjectStorageRebates,
        nonRefundableBalance: systemState.storageFundNonRefundableBalance
      },
      stakeSubsidy: {
        balance: systemState.stakeSubsidyBalance,
        distributionCounter: systemState.stakeSubsidyDistributionCounter,
        currentDistributionAmount: systemState.stakeSubsidyCurrentDistributionAmount,
        stakeSubsidyPeriodLength: systemState.stakeSubsidyPeriodLength,
        stakeSubsidyDecreaseRate: systemState.stakeSubsidyDecreaseRate
      }
    } };
  }
  async listDynamicFields(options) {
    const dynamicFields = await this.#jsonRpcClient.getDynamicFields({
      parentId: options.parentId,
      limit: options.limit,
      cursor: options.cursor
    });
    return {
      dynamicFields: dynamicFields.data.map((dynamicField) => {
        const isDynamicObject = dynamicField.type === "DynamicObject";
        const fullType = isDynamicObject ? `0x2::dynamic_field::Field<0x2::dynamic_object_field::Wrapper<${dynamicField.name.type}>, 0x2::object::ID>` : `0x2::dynamic_field::Field<${dynamicField.name.type}, ${dynamicField.objectType}>`;
        const bcsBytes = fromBase64(dynamicField.bcsName);
        const derivedNameType = isDynamicObject ? `0x2::dynamic_object_field::Wrapper<${dynamicField.name.type}>` : dynamicField.name.type;
        return {
          $kind: isDynamicObject ? "DynamicObject" : "DynamicField",
          fieldId: deriveDynamicFieldID(options.parentId, derivedNameType, bcsBytes),
          type: normalizeStructTag(fullType),
          name: {
            type: dynamicField.name.type,
            bcs: bcsBytes
          },
          valueType: dynamicField.objectType,
          childId: isDynamicObject ? dynamicField.objectId : void 0
        };
      }),
      hasNextPage: dynamicFields.hasNextPage,
      cursor: dynamicFields.nextCursor
    };
  }
  async verifyZkLoginSignature(options) {
    const result = await this.#jsonRpcClient.verifyZkLoginSignature({
      bytes: options.bytes,
      signature: options.signature,
      intentScope: options.intentScope,
      author: options.address
    });
    return {
      success: result.success,
      errors: result.errors
    };
  }
  async defaultNameServiceName(options) {
    return { data: { name: (await this.#jsonRpcClient.resolveNameServiceNames(options)).data[0] } };
  }
  resolveTransactionPlugin() {
    return coreClientResolveTransactionPlugin;
  }
  async getMoveFunction(options) {
    const resolvedPackageId = (await this.mvr.resolvePackage({ package: options.packageId })).package;
    const result = await this.#jsonRpcClient.getNormalizedMoveFunction({
      package: resolvedPackageId,
      module: options.moduleName,
      function: options.name
    });
    return { function: {
      packageId: normalizeSuiAddress(resolvedPackageId),
      moduleName: options.moduleName,
      name: options.name,
      visibility: parseVisibility(result.visibility),
      isEntry: result.isEntry,
      typeParameters: result.typeParameters.map((abilities) => ({
        isPhantom: false,
        constraints: parseAbilities(abilities)
      })),
      parameters: result.parameters.map((param) => parseNormalizedSuiMoveType2(param)),
      returns: result.return.map((ret) => parseNormalizedSuiMoveType2(ret))
    } };
  }
  async getChainIdentifier(_options) {
    return this.cache.read(["chainIdentifier"], async () => {
      return { chainIdentifier: (await this.#jsonRpcClient.getCheckpoint({ id: "0" })).digest };
    });
  }
};
function serializeObjectToBcs(object2) {
  if (object2.bcs?.dataType !== "moveObject")
    return;
  try {
    const typeStr = normalizeStructTag(object2.bcs.type);
    let moveObjectType;
    const normalizedSuiFramework = normalizeSuiAddress(SUI_FRAMEWORK_ADDRESS);
    const gasCoinType = normalizeStructTag(`${SUI_FRAMEWORK_ADDRESS}::coin::Coin<${SUI_FRAMEWORK_ADDRESS}::sui::SUI>`);
    const stakedSuiType = normalizeStructTag(`${SUI_SYSTEM_ADDRESS}::staking_pool::StakedSui`);
    const coinPrefix = `${normalizedSuiFramework}::coin::Coin<`;
    if (typeStr === gasCoinType)
      moveObjectType = { GasCoin: null };
    else if (typeStr === stakedSuiType)
      moveObjectType = { StakedSui: null };
    else if (typeStr.startsWith(coinPrefix)) {
      const innerTypeMatch = typeStr.match(/* @__PURE__ */ new RegExp(`${normalizedSuiFramework.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}::coin::Coin<(.+)>$`));
      if (innerTypeMatch)
        moveObjectType = { Coin: TypeTagSerializer.parseFromStr(innerTypeMatch[1], true) };
      else
        throw new Error("Failed to parse Coin type");
    } else {
      const typeTag = TypeTagSerializer.parseFromStr(typeStr, true);
      if (typeof typeTag !== "object" || !("struct" in typeTag))
        throw new Error("Expected struct type tag");
      moveObjectType = { Other: typeTag.struct };
    }
    const contents = fromBase64(object2.bcs.bcsBytes);
    const owner = convertOwnerToBcs(object2.owner);
    return suiBcs.Object.serialize({
      data: { Move: {
        type: moveObjectType,
        hasPublicTransfer: object2.bcs.hasPublicTransfer,
        version: object2.bcs.version,
        contents
      } },
      owner,
      previousTransaction: object2.previousTransaction,
      storageRebate: object2.storageRebate
    }).toBytes();
  } catch {
    return;
  }
}
function parseObject(object2, include) {
  const bcsContent = object2.bcs?.dataType === "moveObject" ? fromBase64(object2.bcs.bcsBytes) : void 0;
  const objectBcs = include?.objectBcs ? serializeObjectToBcs(object2) : void 0;
  const type = object2.type && object2.type.includes("::") ? normalizeStructTag(object2.type) : object2.type ?? "";
  const jsonContent = include?.json && object2.content?.dataType === "moveObject" ? object2.content.fields : include?.json ? null : void 0;
  return {
    objectId: object2.objectId,
    version: object2.version,
    digest: object2.digest,
    type,
    content: include?.content ? bcsContent : void 0,
    owner: parseOwner(object2.owner),
    previousTransaction: include?.previousTransaction ? object2.previousTransaction ?? void 0 : void 0,
    objectBcs,
    json: jsonContent
  };
}
function parseOwner(owner) {
  if (owner === "Immutable")
    return {
      $kind: "Immutable",
      Immutable: true
    };
  if ("ConsensusAddressOwner" in owner)
    return {
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: {
        owner: owner.ConsensusAddressOwner.owner,
        startVersion: owner.ConsensusAddressOwner.start_version
      }
    };
  if ("AddressOwner" in owner)
    return {
      $kind: "AddressOwner",
      AddressOwner: owner.AddressOwner
    };
  if ("ObjectOwner" in owner)
    return {
      $kind: "ObjectOwner",
      ObjectOwner: owner.ObjectOwner
    };
  if ("Shared" in owner)
    return {
      $kind: "Shared",
      Shared: { initialSharedVersion: owner.Shared.initial_shared_version }
    };
  throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}
function convertOwnerToBcs(owner) {
  if (owner === "Immutable")
    return { Immutable: null };
  if ("AddressOwner" in owner)
    return { AddressOwner: owner.AddressOwner };
  if ("ObjectOwner" in owner)
    return { ObjectOwner: owner.ObjectOwner };
  if ("Shared" in owner)
    return { Shared: { initialSharedVersion: owner.Shared.initial_shared_version } };
  if (typeof owner === "object" && owner !== null && "ConsensusAddressOwner" in owner)
    return { ConsensusAddressOwner: {
      startVersion: owner.ConsensusAddressOwner.start_version,
      owner: owner.ConsensusAddressOwner.owner
    } };
  throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}
function parseOwnerAddress(owner) {
  if (owner === "Immutable")
    return null;
  if ("ConsensusAddressOwner" in owner)
    return owner.ConsensusAddressOwner.owner;
  if ("AddressOwner" in owner)
    return owner.AddressOwner;
  if ("ObjectOwner" in owner)
    return owner.ObjectOwner;
  if ("Shared" in owner)
    return null;
  throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}
function parseTransaction2(transaction, include) {
  const objectTypes = {};
  if (include?.objectTypes)
    transaction.objectChanges?.forEach((change) => {
      if (change.type !== "published")
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
    });
  let transactionData;
  let signatures = [];
  let bcsBytes;
  if (transaction.rawTransaction) {
    const parsedTx = suiBcs.SenderSignedData.parse(fromBase64(transaction.rawTransaction))[0];
    signatures = parsedTx.txSignatures;
    if (include?.transaction || include?.bcs) {
      const bytes = suiBcs.TransactionData.serialize(parsedTx.intentMessage.value).toBytes();
      if (include?.bcs)
        bcsBytes = bytes;
      if (include?.transaction)
        transactionData = { ...TransactionDataBuilder.restore({
          version: 2,
          sender: parsedTx.intentMessage.value.V1.sender,
          expiration: parsedTx.intentMessage.value.V1.expiration,
          gasData: parsedTx.intentMessage.value.V1.gasData,
          inputs: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction.inputs,
          commands: parsedTx.intentMessage.value.V1.kind.ProgrammableTransaction.commands
        }) };
    }
  }
  const status = transaction.effects?.status ? parseJsonRpcExecutionStatus(transaction.effects.status, transaction.effects.abortError) : {
    success: false,
    error: {
      $kind: "Unknown",
      message: "Unknown",
      Unknown: null
    }
  };
  const effectsBytes = transaction.rawEffects ? new Uint8Array(transaction.rawEffects) : null;
  const result = {
    digest: transaction.digest,
    epoch: transaction.effects?.executedEpoch ?? null,
    status,
    effects: include?.effects && effectsBytes ? parseTransactionEffectsBcs(effectsBytes) : void 0,
    objectTypes: include?.objectTypes ? objectTypes : void 0,
    transaction: transactionData,
    bcs: bcsBytes,
    signatures,
    balanceChanges: include?.balanceChanges ? transaction.balanceChanges?.map((change) => ({
      coinType: normalizeStructTag(change.coinType),
      address: parseOwnerAddress(change.owner),
      amount: change.amount
    })) ?? [] : void 0,
    events: include?.events ? transaction.events?.map((event) => ({
      packageId: event.packageId,
      module: event.transactionModule,
      sender: event.sender,
      eventType: event.type,
      bcs: "bcs" in event ? fromBase64(event.bcs) : new Uint8Array(),
      json: event.parsedJson ?? null
    })) ?? [] : void 0
  };
  return status.success ? {
    $kind: "Transaction",
    Transaction: result
  } : {
    $kind: "FailedTransaction",
    FailedTransaction: result
  };
}
function parseTransactionEffectsJson({ bytes, effects, objectChanges }) {
  const changedObjects = [];
  const unchangedConsensusObjects = [];
  const objectTypes = {};
  objectChanges?.forEach((change) => {
    switch (change.type) {
      case "published":
        changedObjects.push({
          objectId: change.packageId,
          inputState: "DoesNotExist",
          inputVersion: null,
          inputDigest: null,
          inputOwner: null,
          outputState: "PackageWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: null,
          idOperation: "Created"
        });
        break;
      case "transferred":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.version,
          inputDigest: change.digest,
          inputOwner: {
            $kind: "AddressOwner",
            AddressOwner: change.sender
          },
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: parseOwner(change.recipient),
          idOperation: "None"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "mutated":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.previousVersion,
          inputDigest: null,
          inputOwner: parseOwner(change.owner),
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: parseOwner(change.owner),
          idOperation: "None"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "deleted":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.version,
          inputDigest: effects.deleted?.find((d) => d.objectId === change.objectId)?.digest ?? null,
          inputOwner: null,
          outputState: "DoesNotExist",
          outputVersion: null,
          outputDigest: null,
          outputOwner: null,
          idOperation: "Deleted"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "wrapped":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "Exists",
          inputVersion: change.version,
          inputDigest: null,
          inputOwner: {
            $kind: "AddressOwner",
            AddressOwner: change.sender
          },
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: effects.wrapped?.find((w) => w.objectId === change.objectId)?.digest ?? null,
          outputOwner: {
            $kind: "ObjectOwner",
            ObjectOwner: change.sender
          },
          idOperation: "None"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
      case "created":
        changedObjects.push({
          objectId: change.objectId,
          inputState: "DoesNotExist",
          inputVersion: null,
          inputDigest: null,
          inputOwner: null,
          outputState: "ObjectWrite",
          outputVersion: change.version,
          outputDigest: change.digest,
          outputOwner: parseOwner(change.owner),
          idOperation: "Created"
        });
        objectTypes[change.objectId] = normalizeStructTag(change.objectType);
        break;
    }
  });
  return {
    objectTypes,
    effects: {
      bcs: bytes ?? null,
      version: 2,
      status: parseJsonRpcExecutionStatus(effects.status, effects.abortError),
      gasUsed: effects.gasUsed,
      transactionDigest: effects.transactionDigest,
      gasObject: {
        objectId: effects.gasObject?.reference.objectId,
        inputState: "Exists",
        inputVersion: null,
        inputDigest: null,
        inputOwner: null,
        outputState: "ObjectWrite",
        outputVersion: effects.gasObject.reference.version,
        outputDigest: effects.gasObject.reference.digest,
        outputOwner: parseOwner(effects.gasObject.owner),
        idOperation: "None"
      },
      eventsDigest: effects.eventsDigest ?? null,
      dependencies: effects.dependencies ?? [],
      lamportVersion: effects.gasObject.reference.version,
      changedObjects,
      unchangedConsensusObjects,
      auxiliaryDataDigest: null
    }
  };
}
function parseNormalizedSuiMoveType2(type) {
  if (typeof type !== "string") {
    if ("Reference" in type)
      return {
        reference: "immutable",
        body: parseNormalizedSuiMoveTypeBody2(type.Reference)
      };
    if ("MutableReference" in type)
      return {
        reference: "mutable",
        body: parseNormalizedSuiMoveTypeBody2(type.MutableReference)
      };
  }
  return {
    reference: null,
    body: parseNormalizedSuiMoveTypeBody2(type)
  };
}
function parseNormalizedSuiMoveTypeBody2(type) {
  switch (type) {
    case "Address":
      return { $kind: "address" };
    case "Bool":
      return { $kind: "bool" };
    case "U8":
      return { $kind: "u8" };
    case "U16":
      return { $kind: "u16" };
    case "U32":
      return { $kind: "u32" };
    case "U64":
      return { $kind: "u64" };
    case "U128":
      return { $kind: "u128" };
    case "U256":
      return { $kind: "u256" };
  }
  if (typeof type === "string")
    throw new Error(`Unknown type: ${type}`);
  if ("Vector" in type)
    return {
      $kind: "vector",
      vector: parseNormalizedSuiMoveTypeBody2(type.Vector)
    };
  if ("Struct" in type)
    return {
      $kind: "datatype",
      datatype: {
        typeName: `${normalizeSuiAddress(type.Struct.address)}::${type.Struct.module}::${type.Struct.name}`,
        typeParameters: type.Struct.typeArguments.map((t) => parseNormalizedSuiMoveTypeBody2(t))
      }
    };
  if ("TypeParameter" in type)
    return {
      $kind: "typeParameter",
      index: type.TypeParameter
    };
  throw new Error(`Unknown type: ${JSON.stringify(type)}`);
}
function parseAbilities(abilitySet) {
  return abilitySet.abilities.map((ability) => {
    switch (ability) {
      case "Copy":
        return "copy";
      case "Drop":
        return "drop";
      case "Store":
        return "store";
      case "Key":
        return "key";
      default:
        return "unknown";
    }
  });
}
function parseVisibility(visibility) {
  switch (visibility) {
    case "Public":
      return "public";
    case "Private":
      return "private";
    case "Friend":
      return "friend";
    default:
      return "unknown";
  }
}

// node_modules/.pnpm/@mysten+sui@2.6.0_typescript@5.9.3/node_modules/@mysten/sui/dist/jsonRpc/client.mjs
var SUI_CLIENT_BRAND2 = Symbol.for("@mysten/SuiJsonRpcClient");
var COIN_RESERVATION_MAGIC = new Uint8Array([
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172,
  172
]);
function isCoinReservationDigest(digestBase58) {
  return fromBase58(digestBase58).slice(12, 32).every((byte, i) => byte === COIN_RESERVATION_MAGIC[i]);
}
var SuiJsonRpcClient = class extends BaseClient {
  get [SUI_CLIENT_BRAND2]() {
    return true;
  }
  /**
  * Establish a connection to a Sui RPC endpoint
  *
  * @param options configuration options for the API Client
  */
  constructor(options) {
    super({ network: options.network });
    this.jsonRpc = this;
    this.transport = options.transport ?? new JsonRpcHTTPTransport({ url: options.url });
    this.core = new JSONRpcCoreClient({
      jsonRpcClient: this,
      mvr: options.mvr
    });
  }
  async getRpcApiVersion({ signal } = {}) {
    return (await this.transport.request({
      method: "rpc.discover",
      params: [],
      signal
    })).info.version;
  }
  /**
  * Get all Coin<`coin_type`> objects owned by an address.
  */
  async getCoins({ coinType, owner, cursor, limit, signal }) {
    if (!owner || !isValidSuiAddress(normalizeSuiAddress(owner)))
      throw new Error("Invalid Sui address");
    if (coinType && hasMvrName(coinType))
      coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    const result = await this.transport.request({
      method: "suix_getCoins",
      params: [
        owner,
        coinType,
        cursor,
        limit
      ],
      signal
    });
    return {
      ...result,
      data: result.data.filter((coin) => !isCoinReservationDigest(coin.digest))
    };
  }
  /**
  * Get all Coin objects owned by an address.
  */
  async getAllCoins(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner)))
      throw new Error("Invalid Sui address");
    const result = await this.transport.request({
      method: "suix_getAllCoins",
      params: [
        input.owner,
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
    return {
      ...result,
      data: result.data.filter((coin) => !isCoinReservationDigest(coin.digest))
    };
  }
  /**
  * Get the total coin balance for one coin type, owned by the address owner.
  */
  async getBalance({ owner, coinType, signal }) {
    if (!owner || !isValidSuiAddress(normalizeSuiAddress(owner)))
      throw new Error("Invalid Sui address");
    if (coinType && hasMvrName(coinType))
      coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    return await this.transport.request({
      method: "suix_getBalance",
      params: [owner, coinType],
      signal
    });
  }
  /**
  * Get the total coin balance for all coin types, owned by the address owner.
  */
  async getAllBalances(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner)))
      throw new Error("Invalid Sui address");
    return await this.transport.request({
      method: "suix_getAllBalances",
      params: [input.owner],
      signal: input.signal
    });
  }
  /**
  * Fetch CoinMetadata for a given coin type
  */
  async getCoinMetadata({ coinType, signal }) {
    if (coinType && hasMvrName(coinType))
      coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    return await this.transport.request({
      method: "suix_getCoinMetadata",
      params: [coinType],
      signal
    });
  }
  /**
  *  Fetch total supply for a coin
  */
  async getTotalSupply({ coinType, signal }) {
    if (coinType && hasMvrName(coinType))
      coinType = (await this.core.mvr.resolveType({ type: coinType })).type;
    return await this.transport.request({
      method: "suix_getTotalSupply",
      params: [coinType],
      signal
    });
  }
  /**
  * Invoke any RPC method
  * @param method the method to be invoked
  * @param args the arguments to be passed to the RPC request
  */
  async call(method, params, { signal } = {}) {
    return await this.transport.request({
      method,
      params,
      signal
    });
  }
  /**
  * Get Move function argument types like read, write and full access
  */
  async getMoveFunctionArgTypes({ package: pkg, module, function: fn, signal }) {
    if (pkg && isValidNamedPackage(pkg))
      pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getMoveFunctionArgTypes",
      params: [
        pkg,
        module,
        fn
      ],
      signal
    });
  }
  /**
  * Get a map from module name to
  * structured representations of Move modules
  */
  async getNormalizedMoveModulesByPackage({ package: pkg, signal }) {
    if (pkg && isValidNamedPackage(pkg))
      pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveModulesByPackage",
      params: [pkg],
      signal
    });
  }
  /**
  * Get a structured representation of Move module
  */
  async getNormalizedMoveModule({ package: pkg, module, signal }) {
    if (pkg && isValidNamedPackage(pkg))
      pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveModule",
      params: [pkg, module],
      signal
    });
  }
  /**
  * Get a structured representation of Move function
  */
  async getNormalizedMoveFunction({ package: pkg, module, function: fn, signal }) {
    if (pkg && isValidNamedPackage(pkg))
      pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveFunction",
      params: [
        pkg,
        module,
        fn
      ],
      signal
    });
  }
  /**
  * Get a structured representation of Move struct
  */
  async getNormalizedMoveStruct({ package: pkg, module, struct, signal }) {
    if (pkg && isValidNamedPackage(pkg))
      pkg = (await this.core.mvr.resolvePackage({ package: pkg })).package;
    return await this.transport.request({
      method: "sui_getNormalizedMoveStruct",
      params: [
        pkg,
        module,
        struct
      ],
      signal
    });
  }
  /**
  * Get all objects owned by an address
  */
  async getOwnedObjects(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner)))
      throw new Error("Invalid Sui address");
    const filter = input.filter ? { ...input.filter } : void 0;
    if (filter && "MoveModule" in filter && isValidNamedPackage(filter.MoveModule.package))
      filter.MoveModule = {
        module: filter.MoveModule.module,
        package: (await this.core.mvr.resolvePackage({ package: filter.MoveModule.package })).package
      };
    else if (filter && "StructType" in filter && hasMvrName(filter.StructType))
      filter.StructType = (await this.core.mvr.resolveType({ type: filter.StructType })).type;
    return await this.transport.request({
      method: "suix_getOwnedObjects",
      params: [
        input.owner,
        {
          filter,
          options: input.options
        },
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
  }
  /**
  * Get details about an object
  */
  async getObject(input) {
    if (!input.id || !isValidSuiObjectId(normalizeSuiObjectId(input.id)))
      throw new Error("Invalid Sui Object id");
    return await this.transport.request({
      method: "sui_getObject",
      params: [input.id, input.options],
      signal: input.signal
    });
  }
  async tryGetPastObject(input) {
    return await this.transport.request({
      method: "sui_tryGetPastObject",
      params: [
        input.id,
        input.version,
        input.options
      ],
      signal: input.signal
    });
  }
  /**
  * Batch get details about a list of objects. If any of the object ids are duplicates the call will fail
  */
  async multiGetObjects(input) {
    input.ids.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id)))
        throw new Error(`Invalid Sui Object id ${id}`);
    });
    if (input.ids.length !== new Set(input.ids).size)
      throw new Error(`Duplicate object ids in batch call ${input.ids}`);
    return await this.transport.request({
      method: "sui_multiGetObjects",
      params: [input.ids, input.options],
      signal: input.signal
    });
  }
  /**
  * Get transaction blocks for a given query criteria
  */
  async queryTransactionBlocks({ filter, options, cursor, limit, order, signal }) {
    if (filter && "MoveFunction" in filter && isValidNamedPackage(filter.MoveFunction.package))
      filter = {
        ...filter,
        MoveFunction: { package: (await this.core.mvr.resolvePackage({ package: filter.MoveFunction.package })).package }
      };
    return await this.transport.request({
      method: "suix_queryTransactionBlocks",
      params: [
        {
          filter,
          options
        },
        cursor,
        limit,
        (order || "descending") === "descending"
      ],
      signal
    });
  }
  async getTransactionBlock(input) {
    if (!isValidTransactionDigest(input.digest))
      throw new Error("Invalid Transaction digest");
    return await this.transport.request({
      method: "sui_getTransactionBlock",
      params: [input.digest, input.options],
      signal: input.signal
    });
  }
  async multiGetTransactionBlocks(input) {
    input.digests.forEach((d) => {
      if (!isValidTransactionDigest(d))
        throw new Error(`Invalid Transaction digest ${d}`);
    });
    if (input.digests.length !== new Set(input.digests).size)
      throw new Error(`Duplicate digests in batch call ${input.digests}`);
    return await this.transport.request({
      method: "sui_multiGetTransactionBlocks",
      params: [input.digests, input.options],
      signal: input.signal
    });
  }
  async executeTransactionBlock({ transactionBlock, signature, options, signal }) {
    return await this.transport.request({
      method: "sui_executeTransactionBlock",
      params: [
        typeof transactionBlock === "string" ? transactionBlock : toBase64(transactionBlock),
        Array.isArray(signature) ? signature : [signature],
        options
      ],
      signal
    });
  }
  async signAndExecuteTransaction({ transaction, signer, ...input }) {
    let transactionBytes;
    if (transaction instanceof Uint8Array)
      transactionBytes = transaction;
    else {
      transaction.setSenderIfNotSet(signer.toSuiAddress());
      transactionBytes = await transaction.build({ client: this });
    }
    const { signature, bytes } = await signer.signTransaction(transactionBytes);
    return this.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      ...input
    });
  }
  /**
  * Get total number of transactions
  */
  async getTotalTransactionBlocks({ signal } = {}) {
    const resp = await this.transport.request({
      method: "sui_getTotalTransactionBlocks",
      params: [],
      signal
    });
    return BigInt(resp);
  }
  /**
  * Getting the reference gas price for the network
  */
  async getReferenceGasPrice({ signal } = {}) {
    const resp = await this.transport.request({
      method: "suix_getReferenceGasPrice",
      params: [],
      signal
    });
    return BigInt(resp);
  }
  /**
  * Return the delegated stakes for an address
  */
  async getStakes(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner)))
      throw new Error("Invalid Sui address");
    return await this.transport.request({
      method: "suix_getStakes",
      params: [input.owner],
      signal: input.signal
    });
  }
  /**
  * Return the delegated stakes queried by id.
  */
  async getStakesByIds(input) {
    input.stakedSuiIds.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id)))
        throw new Error(`Invalid Sui Stake id ${id}`);
    });
    return await this.transport.request({
      method: "suix_getStakesByIds",
      params: [input.stakedSuiIds],
      signal: input.signal
    });
  }
  /**
  * Return the latest system state content.
  */
  async getLatestSuiSystemState({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getLatestSuiSystemState",
      params: [],
      signal
    });
  }
  /**
  * Get events for a given query criteria
  */
  async queryEvents({ query, cursor, limit, order, signal }) {
    if (query && "MoveEventType" in query && hasMvrName(query.MoveEventType))
      query = {
        ...query,
        MoveEventType: (await this.core.mvr.resolveType({ type: query.MoveEventType })).type
      };
    if (query && "MoveEventModule" in query && isValidNamedPackage(query.MoveEventModule.package))
      query = {
        ...query,
        MoveEventModule: {
          module: query.MoveEventModule.module,
          package: (await this.core.mvr.resolvePackage({ package: query.MoveEventModule.package })).package
        }
      };
    if ("MoveModule" in query && isValidNamedPackage(query.MoveModule.package))
      query = {
        ...query,
        MoveModule: {
          module: query.MoveModule.module,
          package: (await this.core.mvr.resolvePackage({ package: query.MoveModule.package })).package
        }
      };
    return await this.transport.request({
      method: "suix_queryEvents",
      params: [
        query,
        cursor,
        limit,
        (order || "descending") === "descending"
      ],
      signal
    });
  }
  /**
  * Runs the transaction block in dev-inspect mode. Which allows for nearly any
  * transaction (or Move call) with any arguments. Detailed results are
  * provided, including both the transaction effects and any return values.
  */
  async devInspectTransactionBlock(input) {
    let devInspectTxBytes;
    if (isTransaction(input.transactionBlock)) {
      input.transactionBlock.setSenderIfNotSet(input.sender);
      devInspectTxBytes = toBase64(await input.transactionBlock.build({
        client: this,
        onlyTransactionKind: true
      }));
    } else if (typeof input.transactionBlock === "string")
      devInspectTxBytes = input.transactionBlock;
    else if (input.transactionBlock instanceof Uint8Array)
      devInspectTxBytes = toBase64(input.transactionBlock);
    else
      throw new Error("Unknown transaction block format.");
    input.signal?.throwIfAborted();
    return await this.transport.request({
      method: "sui_devInspectTransactionBlock",
      params: [
        input.sender,
        devInspectTxBytes,
        input.gasPrice?.toString(),
        input.epoch
      ],
      signal: input.signal
    });
  }
  /**
  * Dry run a transaction block and return the result.
  */
  async dryRunTransactionBlock(input) {
    return await this.transport.request({
      method: "sui_dryRunTransactionBlock",
      params: [typeof input.transactionBlock === "string" ? input.transactionBlock : toBase64(input.transactionBlock)]
    });
  }
  /**
  * Return the list of dynamic field objects owned by an object
  */
  async getDynamicFields(input) {
    if (!input.parentId || !isValidSuiObjectId(normalizeSuiObjectId(input.parentId)))
      throw new Error("Invalid Sui Object id");
    return await this.transport.request({
      method: "suix_getDynamicFields",
      params: [
        input.parentId,
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
  }
  /**
  * Return the dynamic field object information for a specified object
  */
  async getDynamicFieldObject(input) {
    return await this.transport.request({
      method: "suix_getDynamicFieldObject",
      params: [input.parentId, input.name],
      signal: input.signal
    });
  }
  /**
  * Get the sequence number of the latest checkpoint that has been executed
  */
  async getLatestCheckpointSequenceNumber({ signal } = {}) {
    const resp = await this.transport.request({
      method: "sui_getLatestCheckpointSequenceNumber",
      params: [],
      signal
    });
    return String(resp);
  }
  /**
  * Returns information about a given checkpoint
  */
  async getCheckpoint(input) {
    return await this.transport.request({
      method: "sui_getCheckpoint",
      params: [input.id],
      signal: input.signal
    });
  }
  /**
  * Returns historical checkpoints paginated
  */
  async getCheckpoints(input) {
    return await this.transport.request({
      method: "sui_getCheckpoints",
      params: [
        input.cursor,
        input?.limit,
        input.descendingOrder
      ],
      signal: input.signal
    });
  }
  /**
  * Return the committee information for the asked epoch
  */
  async getCommitteeInfo(input) {
    return await this.transport.request({
      method: "suix_getCommitteeInfo",
      params: [input?.epoch],
      signal: input?.signal
    });
  }
  async getNetworkMetrics({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getNetworkMetrics",
      params: [],
      signal
    });
  }
  async getAddressMetrics({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getLatestAddressMetrics",
      params: [],
      signal
    });
  }
  async getEpochMetrics(input) {
    return await this.transport.request({
      method: "suix_getEpochMetrics",
      params: [
        input?.cursor,
        input?.limit,
        input?.descendingOrder
      ],
      signal: input?.signal
    });
  }
  async getAllEpochAddressMetrics(input) {
    return await this.transport.request({
      method: "suix_getAllEpochAddressMetrics",
      params: [input?.descendingOrder],
      signal: input?.signal
    });
  }
  /**
  * Return the committee information for the asked epoch
  */
  async getEpochs(input) {
    return await this.transport.request({
      method: "suix_getEpochs",
      params: [
        input?.cursor,
        input?.limit,
        input?.descendingOrder
      ],
      signal: input?.signal
    });
  }
  /**
  * Returns list of top move calls by usage
  */
  async getMoveCallMetrics({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getMoveCallMetrics",
      params: [],
      signal
    });
  }
  /**
  * Return the committee information for the asked epoch
  */
  async getCurrentEpoch({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getCurrentEpoch",
      params: [],
      signal
    });
  }
  /**
  * Return the Validators APYs
  */
  async getValidatorsApy({ signal } = {}) {
    return await this.transport.request({
      method: "suix_getValidatorsApy",
      params: [],
      signal
    });
  }
  async getChainIdentifier({ signal } = {}) {
    return toHex(fromBase58((await this.getCheckpoint({
      id: "0",
      signal
    })).digest).slice(0, 4));
  }
  async resolveNameServiceAddress(input) {
    return await this.transport.request({
      method: "suix_resolveNameServiceAddress",
      params: [input.name],
      signal: input.signal
    });
  }
  async resolveNameServiceNames({ format = "dot", ...input }) {
    const { nextCursor, hasNextPage, data } = await this.transport.request({
      method: "suix_resolveNameServiceNames",
      params: [
        input.address,
        input.cursor,
        input.limit
      ],
      signal: input.signal
    });
    return {
      hasNextPage,
      nextCursor,
      data: data.map((name) => normalizeSuiNSName(name, format))
    };
  }
  async getProtocolConfig(input) {
    return await this.transport.request({
      method: "sui_getProtocolConfig",
      params: [input?.version],
      signal: input?.signal
    });
  }
  async verifyZkLoginSignature(input) {
    return await this.transport.request({
      method: "sui_verifyZkLoginSignature",
      params: [
        input.bytes,
        input.signature,
        input.intentScope,
        input.author
      ],
      signal: input.signal
    });
  }
  /**
  * Wait for a transaction block result to be available over the API.
  * This can be used in conjunction with `executeTransactionBlock` to wait for the transaction to
  * be available via the API.
  * This currently polls the `getTransactionBlock` API to check for the transaction.
  */
  async waitForTransaction({ signal, timeout = 60 * 1e3, pollInterval = 2 * 1e3, ...input }) {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutSignal.addEventListener("abort", () => reject(timeoutSignal.reason));
    });
    timeoutPromise.catch(() => {
    });
    while (!timeoutSignal.aborted) {
      signal?.throwIfAborted();
      try {
        return await this.getTransactionBlock(input);
      } catch {
        await Promise.race([new Promise((resolve) => setTimeout(resolve, pollInterval)), timeoutPromise]);
      }
    }
    timeoutSignal.throwIfAborted();
    throw new Error("Unexpected error while waiting for transaction block.");
  }
};

// src/suiInterop.ts
var grpcClient = null;
var currentNetwork = null;
var currentRpcUrl = null;
var preferredWalletName = null;
function init(network, rpcUrl, preferredWallet) {
  currentNetwork = network;
  currentRpcUrl = rpcUrl;
  preferredWalletName = preferredWallet;
  grpcClient = new SuiGrpcClient({
    network,
    baseUrl: rpcUrl
  });
}
function requireInit() {
  if (!currentNetwork || !currentRpcUrl) {
    throw new Error("suiInterop.init(network, rpcUrl) must be called before using Sui interop.");
  }
  return {
    network: currentNetwork,
    rpcUrl: currentRpcUrl
  };
}
function c() {
  if (!grpcClient) {
    const { network, rpcUrl } = requireInit();
    grpcClient = new SuiGrpcClient({
      network,
      baseUrl: rpcUrl
    });
  }
  return grpcClient;
}
function makeJsonRpcClient() {
  const { network, rpcUrl } = requireInit();
  return new SuiJsonRpcClient({
    network,
    url: rpcUrl
  });
}
function pickWallet(preferredName = preferredWalletName) {
  const wallets2 = getWallets().get();
  if (!wallets2.length) {
    throw new Error("No Sui wallets found.");
  }
  const preferred = wallets2.find(
    (w) => w.name === preferredName && !!w.features[StandardConnect] && !!w.features[SuiSignTransaction]
  );
  if (preferred)
    return preferred;
  const compatible = wallets2.find(
    (w) => !!w.features[StandardConnect] && !!w.features[SuiSignTransaction]
  );
  if (compatible)
    return compatible;
  const legacy = wallets2.find(
    (w) => !!w.features[StandardConnect] && !!w.features["sui:signTransactionBlock"]
  );
  if (legacy) {
    throw new Error(
      `Wallet "${legacy.name}" only exposes deprecated legacy signing (sui:signTransactionBlock).`
    );
  }
  const names = wallets2.map((w) => w.name).join(", ");
  throw new Error(
    `No compatible wallet found. Detected: ${names}. Need standard:connect + sui:signTransaction.`
  );
}
async function getConnectedAccounts(wallet) {
  let accounts = wallet.accounts ?? [];
  if (!accounts.length) {
    const connectFeature = wallet.features[StandardConnect];
    if (!connectFeature) {
      throw new Error("Wallet does not support standard:connect");
    }
    const result = await connectFeature.connect();
    accounts = result.accounts ?? [];
  }
  if (!accounts.length) {
    throw new Error("No accounts returned from wallet.");
  }
  return accounts;
}
async function connectSui() {
  const wallet = pickWallet();
  const accounts = await getConnectedAccounts(wallet);
  return accounts[0].address;
}
function debugWalletFeatures() {
  return getWallets().get().map((w) => ({
    name: w.name,
    features: Object.keys(w.features),
    accounts: (w.accounts ?? []).map((a) => a.address)
  }));
}
async function getSuiBalance(owner) {
  const result = await c().getBalance({
    owner,
    coinType: "0x2::sui::SUI"
  });
  return result;
}
async function getOwnedObjects(owner) {
  const result = await c().listOwnedObjects({ owner });
  return result;
}
async function getObjectDump(objectId) {
  const resp = await c().ledgerService.getObject({
    objectId,
    readMask: {
      paths: [
        "object_id",
        "version",
        "digest",
        "owner",
        "type",
        "data",
        "content",
        "move_object",
        "bcs"
      ]
    }
  });
  const obj = resp.response;
  if (!obj) {
    return {
      objectId,
      rows: [{ name: "(error)", value: "object not found" }]
    };
  }
  const moveJson = obj.content?.fields ?? obj.moveObject?.fields ?? obj.move_object?.fields ?? obj.data?.moveObject?.fields ?? obj.data?.move_object?.fields ?? null;
  const rows = [];
  rows.push({
    name: "object_id",
    value: obj.objectId ?? obj.object_id ?? objectId
  });
  if (obj.type) {
    rows.push({ name: "type", value: String(obj.type) });
  }
  if (obj.version != null) {
    rows.push({ name: "version", value: String(obj.version) });
  }
  if (obj.digest) {
    rows.push({ name: "digest", value: String(obj.digest) });
  }
  if (obj.owner) {
    rows.push({ name: "owner", value: pretty(obj.owner) });
  }
  if (moveJson && typeof moveJson === "object") {
    for (const [k, v] of Object.entries(moveJson)) {
      rows.push({ name: k, value: pretty(v) });
    }
  } else {
    rows.push({ name: "(raw_object)", value: pretty(obj) });
  }
  return { objectId, rows };
}
function pretty(v) {
  if (v == null)
    return "null";
  if (typeof v === "string")
    return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
async function findOwnedObjectIdByType(args) {
  const wallet = pickWallet();
  const accounts = await getConnectedAccounts(wallet);
  const owner = accounts[0].address;
  const client = makeJsonRpcClient();
  const typeString = `${args.packageId}::${args.module}::${args.objectName}`;
  const resp = await client.getOwnedObjects({
    owner,
    filter: {
      StructType: typeString
    },
    options: {
      showType: true
    }
  });
  const obj = resp.data?.[0];
  if (!obj?.data?.objectId) {
    throw new Error(`No owned object of type ${typeString} found.`);
  }
  return obj.data.objectId;
}
async function signAndExecuteViaApi(network, tx) {
  const wallet = pickWallet();
  const accounts = await getConnectedAccounts(wallet);
  const account = accounts[0];
  const signFeature = wallet.features[SuiSignTransaction];
  if (!signFeature) {
    throw new Error("Wallet does not support sui:signTransaction");
  }
  const signed = await signFeature.signTransaction({
    account,
    chain: `sui:${network}`,
    transaction: tx
  });
  const response = await fetch("/api/sui/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      network,
      txBytesBase64: signed.bytes,
      signaturesBase64: [signed.signature]
    })
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(body);
    throw new Error(`Execute failed: ${response.status} ${body}`);
  }
  return await response.json();
}
async function setResourceConfig(args) {
  const { network } = requireInit();
  const tx = new Transaction2();
  tx.moveCall({
    target: `${args.packageId}::resources::set_resource_config`,
    arguments: [
      tx.object(args.extensionConfigId),
      tx.object(args.adminCapId),
      tx.pure.u64(args.typeId),
      tx.pure.u64(args.itemId),
      tx.pure.string(args.label),
      tx.pure.bool(args.enabled)
    ]
  });
  return await signAndExecuteViaApi(network, tx);
}
async function setComplianceConfig(args) {
  const { network } = requireInit();
  const tx = new Transaction2();
  tx.moveCall({
    target: `${args.packageId}::compliance::set_compliance_config`,
    arguments: [
      tx.object(args.extensionConfigId),
      tx.object(args.adminCapId),
      tx.pure.u64(args.typeId),
      tx.pure.u64(args.cpAwarded),
      tx.pure.u64(args.essentialMultiplier)
    ]
  });
  return await signAndExecuteViaApi(network, tx);
}
async function setGateCostConfig(args) {
  const { network } = requireInit();
  const tx = new Transaction2();
  tx.moveCall({
    target: `${args.packageId}::gate_costs::set_gate_cost_config`,
    arguments: [
      tx.object(args.extensionConfigId),
      tx.object(args.adminCapId),
      tx.pure.u64(args.localJumpCp),
      tx.pure.u64(args.regionalJumpCp),
      tx.pure.u64(args.longRangeJumpCp)
    ]
  });
  return await signAndExecuteViaApi(network, tx);
}
async function setFullItemConfig(args) {
  const { network } = requireInit();
  const tx = new Transaction2();
  tx.moveCall({
    target: `${args.packageId}::resources::set_resource_config`,
    arguments: [
      tx.object(args.extensionConfigId),
      tx.object(args.adminCapId),
      tx.pure.u64(args.typeId),
      tx.pure.u64(args.itemId),
      tx.pure.string(args.label),
      tx.pure.bool(args.enabled)
    ]
  });
  tx.moveCall({
    target: `${args.packageId}::compliance::set_compliance_config`,
    arguments: [
      tx.object(args.extensionConfigId),
      tx.object(args.adminCapId),
      tx.pure.u64(args.typeId),
      tx.pure.u64(args.cpAwarded),
      tx.pure.u64(args.essentialMultiplier)
    ]
  });
  return await signAndExecuteViaApi(network, tx);
}
export {
  connectSui,
  debugWalletFeatures,
  findOwnedObjectIdByType,
  getObjectDump,
  getOwnedObjects,
  getSuiBalance,
  init,
  pickWallet,
  setComplianceConfig,
  setFullItemConfig,
  setGateCostConfig,
  setResourceConfig
};
/*! Bundled license information:

@scure/base/index.js:
  (*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
