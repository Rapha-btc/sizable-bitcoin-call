// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
/** A library of assertion functions.
 * If the assertion is false an `AssertionError` will be thrown which will
 * result in pretty-printed diff of failing assertion.
 *
 * This module is browser compatible, but do not rely on good formatting of
 * values for AssertionError messages in browsers.
 *
 * @module
 */ import { red, stripColor } from "../fmt/colors.ts";
import { buildMessage, diff, diffstr } from "./_diff.ts";
import { format } from "./_format.ts";
const CAN_NOT_DISPLAY = "[Cannot display]";
export class AssertionError extends Error {
    name = "AssertionError";
    constructor(message){
        super(message);
    }
}
function isKeyedCollection(x) {
    return [
        Symbol.iterator,
        "size"
    ].every((k)=>k in x);
}
/**
 * Deep equality comparison used in assertions
 * @param c actual value
 * @param d expected value
 */ export function equal(c, d) {
    const seen = new Map();
    return function compare(a, b) {
        // Have to render RegExp & Date for string comparison
        // unless it's mistreated as object
        if (a && b && (a instanceof RegExp && b instanceof RegExp || a instanceof URL && b instanceof URL)) {
            return String(a) === String(b);
        }
        if (a instanceof Date && b instanceof Date) {
            const aTime = a.getTime();
            const bTime = b.getTime();
            // Check for NaN equality manually since NaN is not
            // equal to itself.
            if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                return true;
            }
            return aTime === bTime;
        }
        if (typeof a === "number" && typeof b === "number") {
            return Number.isNaN(a) && Number.isNaN(b) || a === b;
        }
        if (Object.is(a, b)) {
            return true;
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
            if (a && b && !constructorsEqual(a, b)) {
                return false;
            }
            if (a instanceof WeakMap || b instanceof WeakMap) {
                if (!(a instanceof WeakMap && b instanceof WeakMap)) return false;
                throw new TypeError("cannot compare WeakMap instances");
            }
            if (a instanceof WeakSet || b instanceof WeakSet) {
                if (!(a instanceof WeakSet && b instanceof WeakSet)) return false;
                throw new TypeError("cannot compare WeakSet instances");
            }
            if (seen.get(a) === b) {
                return true;
            }
            if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
                return false;
            }
            seen.set(a, b);
            if (isKeyedCollection(a) && isKeyedCollection(b)) {
                if (a.size !== b.size) {
                    return false;
                }
                let unmatchedEntries = a.size;
                for (const [aKey, aValue] of a.entries()){
                    for (const [bKey, bValue] of b.entries()){
                        /* Given that Map keys can be references, we need
             * to ensure that they are also deeply equal */ if (aKey === aValue && bKey === bValue && compare(aKey, bKey) || compare(aKey, bKey) && compare(aValue, bValue)) {
                            unmatchedEntries--;
                            break;
                        }
                    }
                }
                return unmatchedEntries === 0;
            }
            const merged = {
                ...a,
                ...b
            };
            for (const key of [
                ...Object.getOwnPropertyNames(merged),
                ...Object.getOwnPropertySymbols(merged), 
            ]){
                if (!compare(a && a[key], b && b[key])) {
                    return false;
                }
                if (key in a && !(key in b) || key in b && !(key in a)) {
                    return false;
                }
            }
            if (a instanceof WeakRef || b instanceof WeakRef) {
                if (!(a instanceof WeakRef && b instanceof WeakRef)) return false;
                return compare(a.deref(), b.deref());
            }
            return true;
        }
        return false;
    }(c, d);
}
// deno-lint-ignore ban-types
function constructorsEqual(a, b) {
    return a.constructor === b.constructor || a.constructor === Object && !b.constructor || !a.constructor && b.constructor === Object;
}
/** Make an assertion, error will be thrown if `expr` does not have truthy value. */ export function assert(expr, msg = "") {
    if (!expr) {
        throw new AssertionError(msg);
    }
}
export function assertFalse(expr, msg = "") {
    if (expr) {
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` and `expected` are equal, deeply. If not
 * deeply equal, then throw.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 *
 * @example
 * ```ts
 * import { assertEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * Deno.test("example", function (): void {
 *   assertEquals("world", "world");
 *   assertEquals({ hello: "world" }, { hello: "world" });
 * });
 * ```
 */ export function assertEquals(actual, expected, msg) {
    if (equal(actual, expected)) {
        return;
    }
    let message = "";
    const actualString = format(actual);
    const expectedString = format(expected);
    try {
        const stringDiff = typeof actual === "string" && typeof expected === "string";
        const diffResult = stringDiff ? diffstr(actual, expected) : diff(actualString.split("\n"), expectedString.split("\n"));
        const diffMsg = buildMessage(diffResult, {
            stringDiff
        }).join("\n");
        message = `Values are not equal:\n${diffMsg}`;
    } catch  {
        message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
    }
    if (msg) {
        message = msg;
    }
    throw new AssertionError(message);
}
/**
 * Make an assertion that `actual` and `expected` are not equal, deeply.
 * If not then throw.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 *
 * @example
 * ```ts
 * import { assertNotEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * assertNotEquals<number>(1, 2)
 * ```
 */ export function assertNotEquals(actual, expected, msg) {
    if (!equal(actual, expected)) {
        return;
    }
    let actualString;
    let expectedString;
    try {
        actualString = String(actual);
    } catch  {
        actualString = "[Cannot display]";
    }
    try {
        expectedString = String(expected);
    } catch  {
        expectedString = "[Cannot display]";
    }
    if (!msg) {
        msg = `actual: ${actualString} expected not to be: ${expectedString}`;
    }
    throw new AssertionError(msg);
}
/**
 * Make an assertion that `actual` and `expected` are strictly equal. If
 * not then throw.
 *
 * @example
 * ```ts
 * import { assertStrictEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * Deno.test("isStrictlyEqual", function (): void {
 *   const a = {};
 *   const b = a;
 *   assertStrictEquals(a, b);
 * });
 *
 * // This test fails
 * Deno.test("isNotStrictlyEqual", function (): void {
 *   const a = {};
 *   const b = {};
 *   assertStrictEquals(a, b);
 * });
 * ```
 */ export function assertStrictEquals(actual, expected, msg) {
    if (Object.is(actual, expected)) {
        return;
    }
    let message;
    if (msg) {
        message = msg;
    } else {
        const actualString = format(actual);
        const expectedString = format(expected);
        if (actualString === expectedString) {
            const withOffset = actualString.split("\n").map((l)=>`    ${l}`).join("\n");
            message = `Values have the same structure but are not reference-equal:\n\n${red(withOffset)}\n`;
        } else {
            try {
                const stringDiff = typeof actual === "string" && typeof expected === "string";
                const diffResult = stringDiff ? diffstr(actual, expected) : diff(actualString.split("\n"), expectedString.split("\n"));
                const diffMsg = buildMessage(diffResult, {
                    stringDiff
                }).join("\n");
                message = `Values are not strictly equal:\n${diffMsg}`;
            } catch  {
                message = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
            }
        }
    }
    throw new AssertionError(message);
}
/**
 * Make an assertion that `actual` and `expected` are not strictly equal.
 * If the values are strictly equal then throw.
 *
 * ```ts
 * import { assertNotStrictEquals } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * assertNotStrictEquals(1, 1)
 * ```
 */ export function assertNotStrictEquals(actual, expected, msg) {
    if (!Object.is(actual, expected)) {
        return;
    }
    throw new AssertionError(msg ?? `Expected "actual" to be strictly unequal to: ${format(actual)}\n`);
}
/**
 * Make an assertion that `actual` and `expected` are almost equal numbers through
 * a given tolerance. It can be used to take into account IEEE-754 double-precision
 * floating-point representation limitations.
 * If the values are not almost equal then throw.
 *
 * @example
 * ```ts
 * import { assertAlmostEquals, assertThrows } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * assertAlmostEquals(0.1, 0.2);
 *
 * // Using a custom tolerance value
 * assertAlmostEquals(0.1 + 0.2, 0.3, 1e-16);
 * assertThrows(() => assertAlmostEquals(0.1 + 0.2, 0.3, 1e-17));
 * ```
 */ export function assertAlmostEquals(actual, expected, tolerance = 1e-7, msg) {
    if (Object.is(actual, expected)) {
        return;
    }
    const delta = Math.abs(expected - actual);
    if (delta <= tolerance) {
        return;
    }
    const f = (n)=>Number.isInteger(n) ? n : n.toExponential();
    throw new AssertionError(msg ?? `actual: "${f(actual)}" expected to be close to "${f(expected)}": \
delta "${f(delta)}" is greater than "${f(tolerance)}"`);
}
/**
 * Make an assertion that `obj` is an instance of `type`.
 * If not then throw.
 */ export function assertInstanceOf(actual, expectedType, msg = "") {
    if (!msg) {
        const expectedTypeStr = expectedType.name;
        let actualTypeStr = "";
        if (actual === null) {
            actualTypeStr = "null";
        } else if (actual === undefined) {
            actualTypeStr = "undefined";
        } else if (typeof actual === "object") {
            actualTypeStr = actual.constructor?.name ?? "Object";
        } else {
            actualTypeStr = typeof actual;
        }
        if (expectedTypeStr == actualTypeStr) {
            msg = `Expected object to be an instance of "${expectedTypeStr}".`;
        } else if (actualTypeStr == "function") {
            msg = `Expected object to be an instance of "${expectedTypeStr}" but was not an instanced object.`;
        } else {
            msg = `Expected object to be an instance of "${expectedTypeStr}" but was "${actualTypeStr}".`;
        }
    }
    assert(actual instanceof expectedType, msg);
}
/**
 * Make an assertion that `obj` is not an instance of `type`.
 * If so, then throw.
 */ export function assertNotInstanceOf(actual, // deno-lint-ignore no-explicit-any
unexpectedType, msg = `Expected object to not be an instance of "${typeof unexpectedType}"`) {
    assertFalse(actual instanceof unexpectedType, msg);
}
/**
 * Make an assertion that actual is not null or undefined.
 * If not then throw.
 */ export function assertExists(actual, msg) {
    if (actual === undefined || actual === null) {
        if (!msg) {
            msg = `actual: "${actual}" expected to not be null or undefined`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that actual includes expected. If not
 * then throw.
 */ export function assertStringIncludes(actual, expected, msg) {
    if (!actual.includes(expected)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to contain: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` includes the `expected` values.
 * If not then an error will be thrown.
 *
 * Type parameter can be specified to ensure values under comparison have the same type.
 *
 * @example
 * ```ts
 * import { assertArrayIncludes } from "https://deno.land/std@$STD_VERSION/testing/asserts.ts";
 *
 * assertArrayIncludes<number>([1, 2], [2])
 * ```
 */ export function assertArrayIncludes(actual, expected, msg) {
    const missing = [];
    for(let i = 0; i < expected.length; i++){
        let found = false;
        for(let j = 0; j < actual.length; j++){
            if (equal(expected[i], actual[j])) {
                found = true;
                break;
            }
        }
        if (!found) {
            missing.push(expected[i]);
        }
    }
    if (missing.length === 0) {
        return;
    }
    if (!msg) {
        msg = `actual: "${format(actual)}" expected to include: "${format(expected)}"\nmissing: ${format(missing)}`;
    }
    throw new AssertionError(msg);
}
/**
 * Make an assertion that `actual` match RegExp `expected`. If not
 * then throw.
 */ export function assertMatch(actual, expected, msg) {
    if (!expected.test(actual)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to match: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` not match RegExp `expected`. If match
 * then throw.
 */ export function assertNotMatch(actual, expected, msg) {
    if (expected.test(actual)) {
        if (!msg) {
            msg = `actual: "${actual}" expected to not match: "${expected}"`;
        }
        throw new AssertionError(msg);
    }
}
/**
 * Make an assertion that `actual` object is a subset of `expected` object, deeply.
 * If not, then throw.
 */ export function assertObjectMatch(// deno-lint-ignore no-explicit-any
actual, expected) {
    function filter(a, b) {
        const seen = new WeakMap();
        return fn(a, b);
        function fn(a, b) {
            // Prevent infinite loop with circular references with same filter
            if (seen.has(a) && seen.get(a) === b) {
                return a;
            }
            seen.set(a, b);
            // Filter keys and symbols which are present in both actual and expected
            const filtered = {};
            const entries = [
                ...Object.getOwnPropertyNames(a),
                ...Object.getOwnPropertySymbols(a), 
            ].filter((key)=>key in b).map((key)=>[
                    key,
                    a[key]
                ]);
            for (const [key, value] of entries){
                // On array references, build a filtered array and filter nested objects inside
                if (Array.isArray(value)) {
                    const subset = b[key];
                    if (Array.isArray(subset)) {
                        filtered[key] = fn({
                            ...value
                        }, {
                            ...subset
                        });
                        continue;
                    }
                } else if (value instanceof RegExp) {
                    filtered[key] = value;
                    continue;
                } else if (typeof value === "object") {
                    const subset1 = b[key];
                    if (typeof subset1 === "object" && subset1) {
                        // When both operands are maps, build a filtered map with common keys and filter nested objects inside
                        if (value instanceof Map && subset1 instanceof Map) {
                            filtered[key] = new Map([
                                ...value
                            ].filter(([k])=>subset1.has(k)).map(([k, v])=>[
                                    k,
                                    typeof v === "object" ? fn(v, subset1.get(k)) : v
                                ]));
                            continue;
                        }
                        // When both operands are set, build a filtered set with common values
                        if (value instanceof Set && subset1 instanceof Set) {
                            filtered[key] = new Set([
                                ...value
                            ].filter((v)=>subset1.has(v)));
                            continue;
                        }
                        filtered[key] = fn(value, subset1);
                        continue;
                    }
                }
                filtered[key] = value;
            }
            return filtered;
        }
    }
    return assertEquals(// get the intersection of "actual" and "expected"
    // side effect: all the instances' constructor field is "Object" now.
    filter(actual, expected), // set (nested) instances' constructor field to be "Object" without changing expected value.
    // see https://github.com/denoland/deno_std/pull/1419
    filter(expected, expected));
}
/**
 * Forcefully throws a failed assertion
 */ export function fail(msg) {
    assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}
/**
 * Make an assertion that `error` is an `Error`.
 * If not then an error will be thrown.
 * An error class and a string that should be included in the
 * error message can also be asserted.
 */ export function assertIsError(error, // deno-lint-ignore no-explicit-any
ErrorClass, msgIncludes, msg) {
    if (error instanceof Error === false) {
        throw new AssertionError(`Expected "error" to be an Error object.`);
    }
    if (ErrorClass && !(error instanceof ErrorClass)) {
        msg = `Expected error to be instance of "${ErrorClass.name}", but was "${typeof error === "object" ? error?.constructor?.name : "[not an object]"}"${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
    if (msgIncludes && (!(error instanceof Error) || !stripColor(error.message).includes(stripColor(msgIncludes)))) {
        msg = `Expected error message to include "${msgIncludes}", but got "${error instanceof Error ? error.message : "[not an Error]"}"${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
    }
}
export function assertThrows(fn, errorClassOrMsg, msgIncludesOrMsg, msg) {
    // deno-lint-ignore no-explicit-any
    let ErrorClass = undefined;
    let msgIncludes = undefined;
    let err;
    if (typeof errorClassOrMsg !== "string") {
        if (errorClassOrMsg === undefined || errorClassOrMsg.prototype instanceof Error || errorClassOrMsg.prototype === Error.prototype) {
            // deno-lint-ignore no-explicit-any
            ErrorClass = errorClassOrMsg;
            msgIncludes = msgIncludesOrMsg;
        } else {
            msg = msgIncludesOrMsg;
        }
    } else {
        msg = errorClassOrMsg;
    }
    let doesThrow = false;
    const msgToAppendToError = msg ? `: ${msg}` : ".";
    try {
        fn();
    } catch (error) {
        if (ErrorClass) {
            if (error instanceof Error === false) {
                throw new AssertionError("A non-Error object was thrown.");
            }
            assertIsError(error, ErrorClass, msgIncludes, msg);
        }
        err = error;
        doesThrow = true;
    }
    if (!doesThrow) {
        msg = `Expected function to throw${msgToAppendToError}`;
        throw new AssertionError(msg);
    }
    return err;
}
export async function assertRejects(fn, errorClassOrMsg, msgIncludesOrMsg, msg) {
    // deno-lint-ignore no-explicit-any
    let ErrorClass = undefined;
    let msgIncludes = undefined;
    let err;
    if (typeof errorClassOrMsg !== "string") {
        if (errorClassOrMsg === undefined || errorClassOrMsg.prototype instanceof Error || errorClassOrMsg.prototype === Error.prototype) {
            // deno-lint-ignore no-explicit-any
            ErrorClass = errorClassOrMsg;
            msgIncludes = msgIncludesOrMsg;
        }
    } else {
        msg = errorClassOrMsg;
    }
    let doesThrow = false;
    let isPromiseReturned = false;
    const msgToAppendToError = msg ? `: ${msg}` : ".";
    try {
        const possiblePromise = fn();
        if (possiblePromise && typeof possiblePromise === "object" && typeof possiblePromise.then === "function") {
            isPromiseReturned = true;
            await possiblePromise;
        }
    } catch (error) {
        if (!isPromiseReturned) {
            throw new AssertionError(`Function throws when expected to reject${msgToAppendToError}`);
        }
        if (ErrorClass) {
            if (error instanceof Error === false) {
                throw new AssertionError("A non-Error object was rejected.");
            }
            assertIsError(error, ErrorClass, msgIncludes, msg);
        }
        err = error;
        doesThrow = true;
    }
    if (!doesThrow) {
        throw new AssertionError(`Expected function to reject${msgToAppendToError}`);
    }
    return err;
}
/** Use this to stub out methods that will throw when invoked. */ export function unimplemented(msg) {
    throw new AssertionError(msg || "unimplemented");
}
/** Use this to assert unreachable code. */ export function unreachable() {
    throw new AssertionError("unreachable");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE3MC4wL3Rlc3RpbmcvYXNzZXJ0cy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIyIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vKiogQSBsaWJyYXJ5IG9mIGFzc2VydGlvbiBmdW5jdGlvbnMuXG4gKiBJZiB0aGUgYXNzZXJ0aW9uIGlzIGZhbHNlIGFuIGBBc3NlcnRpb25FcnJvcmAgd2lsbCBiZSB0aHJvd24gd2hpY2ggd2lsbFxuICogcmVzdWx0IGluIHByZXR0eS1wcmludGVkIGRpZmYgb2YgZmFpbGluZyBhc3NlcnRpb24uXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLCBidXQgZG8gbm90IHJlbHkgb24gZ29vZCBmb3JtYXR0aW5nIG9mXG4gKiB2YWx1ZXMgZm9yIEFzc2VydGlvbkVycm9yIG1lc3NhZ2VzIGluIGJyb3dzZXJzLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWQsIHN0cmlwQ29sb3IgfSBmcm9tIFwiLi4vZm10L2NvbG9ycy50c1wiO1xuaW1wb3J0IHsgYnVpbGRNZXNzYWdlLCBkaWZmLCBkaWZmc3RyIH0gZnJvbSBcIi4vX2RpZmYudHNcIjtcbmltcG9ydCB7IGZvcm1hdCB9IGZyb20gXCIuL19mb3JtYXQudHNcIjtcblxuY29uc3QgQ0FOX05PVF9ESVNQTEFZID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG5cbmV4cG9ydCBjbGFzcyBBc3NlcnRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgbmFtZSA9IFwiQXNzZXJ0aW9uRXJyb3JcIjtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNLZXllZENvbGxlY3Rpb24oeDogdW5rbm93bik6IHggaXMgU2V0PHVua25vd24+IHtcbiAgcmV0dXJuIFtTeW1ib2wuaXRlcmF0b3IsIFwic2l6ZVwiXS5ldmVyeSgoaykgPT4gayBpbiAoeCBhcyBTZXQ8dW5rbm93bj4pKTtcbn1cblxuLyoqXG4gKiBEZWVwIGVxdWFsaXR5IGNvbXBhcmlzb24gdXNlZCBpbiBhc3NlcnRpb25zXG4gKiBAcGFyYW0gYyBhY3R1YWwgdmFsdWVcbiAqIEBwYXJhbSBkIGV4cGVjdGVkIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbChjOiB1bmtub3duLCBkOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIGNvbnN0IHNlZW4gPSBuZXcgTWFwKCk7XG4gIHJldHVybiAoZnVuY3Rpb24gY29tcGFyZShhOiB1bmtub3duLCBiOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgLy8gSGF2ZSB0byByZW5kZXIgUmVnRXhwICYgRGF0ZSBmb3Igc3RyaW5nIGNvbXBhcmlzb25cbiAgICAvLyB1bmxlc3MgaXQncyBtaXN0cmVhdGVkIGFzIG9iamVjdFxuICAgIGlmIChcbiAgICAgIGEgJiZcbiAgICAgIGIgJiZcbiAgICAgICgoYSBpbnN0YW5jZW9mIFJlZ0V4cCAmJiBiIGluc3RhbmNlb2YgUmVnRXhwKSB8fFxuICAgICAgICAoYSBpbnN0YW5jZW9mIFVSTCAmJiBiIGluc3RhbmNlb2YgVVJMKSlcbiAgICApIHtcbiAgICAgIHJldHVybiBTdHJpbmcoYSkgPT09IFN0cmluZyhiKTtcbiAgICB9XG4gICAgaWYgKGEgaW5zdGFuY2VvZiBEYXRlICYmIGIgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICBjb25zdCBhVGltZSA9IGEuZ2V0VGltZSgpO1xuICAgICAgY29uc3QgYlRpbWUgPSBiLmdldFRpbWUoKTtcbiAgICAgIC8vIENoZWNrIGZvciBOYU4gZXF1YWxpdHkgbWFudWFsbHkgc2luY2UgTmFOIGlzIG5vdFxuICAgICAgLy8gZXF1YWwgdG8gaXRzZWxmLlxuICAgICAgaWYgKE51bWJlci5pc05hTihhVGltZSkgJiYgTnVtYmVyLmlzTmFOKGJUaW1lKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhVGltZSA9PT0gYlRpbWU7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSA9PT0gXCJudW1iZXJcIiAmJiB0eXBlb2YgYiA9PT0gXCJudW1iZXJcIikge1xuICAgICAgcmV0dXJuIE51bWJlci5pc05hTihhKSAmJiBOdW1iZXIuaXNOYU4oYikgfHwgYSA9PT0gYjtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pcyhhLCBiKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChhICYmIHR5cGVvZiBhID09PSBcIm9iamVjdFwiICYmIGIgJiYgdHlwZW9mIGIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGlmIChhICYmIGIgJiYgIWNvbnN0cnVjdG9yc0VxdWFsKGEsIGIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChhIGluc3RhbmNlb2YgV2Vha01hcCB8fCBiIGluc3RhbmNlb2YgV2Vha01hcCkge1xuICAgICAgICBpZiAoIShhIGluc3RhbmNlb2YgV2Vha01hcCAmJiBiIGluc3RhbmNlb2YgV2Vha01hcCkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBjb21wYXJlIFdlYWtNYXAgaW5zdGFuY2VzXCIpO1xuICAgICAgfVxuICAgICAgaWYgKGEgaW5zdGFuY2VvZiBXZWFrU2V0IHx8IGIgaW5zdGFuY2VvZiBXZWFrU2V0KSB7XG4gICAgICAgIGlmICghKGEgaW5zdGFuY2VvZiBXZWFrU2V0ICYmIGIgaW5zdGFuY2VvZiBXZWFrU2V0KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IGNvbXBhcmUgV2Vha1NldCBpbnN0YW5jZXNcIik7XG4gICAgICB9XG4gICAgICBpZiAoc2Vlbi5nZXQoYSkgPT09IGIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoT2JqZWN0LmtleXMoYSB8fCB7fSkubGVuZ3RoICE9PSBPYmplY3Qua2V5cyhiIHx8IHt9KS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgc2Vlbi5zZXQoYSwgYik7XG4gICAgICBpZiAoaXNLZXllZENvbGxlY3Rpb24oYSkgJiYgaXNLZXllZENvbGxlY3Rpb24oYikpIHtcbiAgICAgICAgaWYgKGEuc2l6ZSAhPT0gYi5zaXplKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHVubWF0Y2hlZEVudHJpZXMgPSBhLnNpemU7XG5cbiAgICAgICAgZm9yIChjb25zdCBbYUtleSwgYVZhbHVlXSBvZiBhLmVudHJpZXMoKSkge1xuICAgICAgICAgIGZvciAoY29uc3QgW2JLZXksIGJWYWx1ZV0gb2YgYi5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8qIEdpdmVuIHRoYXQgTWFwIGtleXMgY2FuIGJlIHJlZmVyZW5jZXMsIHdlIG5lZWRcbiAgICAgICAgICAgICAqIHRvIGVuc3VyZSB0aGF0IHRoZXkgYXJlIGFsc28gZGVlcGx5IGVxdWFsICovXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIChhS2V5ID09PSBhVmFsdWUgJiYgYktleSA9PT0gYlZhbHVlICYmIGNvbXBhcmUoYUtleSwgYktleSkpIHx8XG4gICAgICAgICAgICAgIChjb21wYXJlKGFLZXksIGJLZXkpICYmIGNvbXBhcmUoYVZhbHVlLCBiVmFsdWUpKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHVubWF0Y2hlZEVudHJpZXMtLTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVubWF0Y2hlZEVudHJpZXMgPT09IDA7XG4gICAgICB9XG4gICAgICBjb25zdCBtZXJnZWQgPSB7IC4uLmEsIC4uLmIgfTtcbiAgICAgIGZvciAoXG4gICAgICAgIGNvbnN0IGtleSBvZiBbXG4gICAgICAgICAgLi4uT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWVyZ2VkKSxcbiAgICAgICAgICAuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG1lcmdlZCksXG4gICAgICAgIF1cbiAgICAgICkge1xuICAgICAgICB0eXBlIEtleSA9IGtleW9mIHR5cGVvZiBtZXJnZWQ7XG4gICAgICAgIGlmICghY29tcGFyZShhICYmIGFba2V5IGFzIEtleV0sIGIgJiYgYltrZXkgYXMgS2V5XSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgoa2V5IGluIGEpICYmICghKGtleSBpbiBiKSkpIHx8ICgoa2V5IGluIGIpICYmICghKGtleSBpbiBhKSkpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoYSBpbnN0YW5jZW9mIFdlYWtSZWYgfHwgYiBpbnN0YW5jZW9mIFdlYWtSZWYpIHtcbiAgICAgICAgaWYgKCEoYSBpbnN0YW5jZW9mIFdlYWtSZWYgJiYgYiBpbnN0YW5jZW9mIFdlYWtSZWYpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjb21wYXJlKGEuZGVyZWYoKSwgYi5kZXJlZigpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pKGMsIGQpO1xufVxuXG4vLyBkZW5vLWxpbnQtaWdub3JlIGJhbi10eXBlc1xuZnVuY3Rpb24gY29uc3RydWN0b3JzRXF1YWwoYTogb2JqZWN0LCBiOiBvYmplY3QpIHtcbiAgcmV0dXJuIGEuY29uc3RydWN0b3IgPT09IGIuY29uc3RydWN0b3IgfHxcbiAgICBhLmNvbnN0cnVjdG9yID09PSBPYmplY3QgJiYgIWIuY29uc3RydWN0b3IgfHxcbiAgICAhYS5jb25zdHJ1Y3RvciAmJiBiLmNvbnN0cnVjdG9yID09PSBPYmplY3Q7XG59XG5cbi8qKiBNYWtlIGFuIGFzc2VydGlvbiwgZXJyb3Igd2lsbCBiZSB0aHJvd24gaWYgYGV4cHJgIGRvZXMgbm90IGhhdmUgdHJ1dGh5IHZhbHVlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydChleHByOiB1bmtub3duLCBtc2cgPSBcIlwiKTogYXNzZXJ0cyBleHByIHtcbiAgaWYgKCFleHByKSB7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqIE1ha2UgYW4gYXNzZXJ0aW9uLCBlcnJvciB3aWxsIGJlIHRocm93biBpZiBgZXhwcmAgaGF2ZSB0cnV0aHkgdmFsdWUuICovXG50eXBlIEZhbHN5ID0gZmFsc2UgfCAwIHwgMG4gfCBcIlwiIHwgbnVsbCB8IHVuZGVmaW5lZDtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRGYWxzZShleHByOiB1bmtub3duLCBtc2cgPSBcIlwiKTogYXNzZXJ0cyBleHByIGlzIEZhbHN5IHtcbiAgaWYgKGV4cHIpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgYW5kIGBleHBlY3RlZGAgYXJlIGVxdWFsLCBkZWVwbHkuIElmIG5vdFxuICogZGVlcGx5IGVxdWFsLCB0aGVuIHRocm93LlxuICpcbiAqIFR5cGUgcGFyYW1ldGVyIGNhbiBiZSBzcGVjaWZpZWQgdG8gZW5zdXJlIHZhbHVlcyB1bmRlciBjb21wYXJpc29uIGhhdmUgdGhlIHNhbWUgdHlwZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGFzc2VydEVxdWFscyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL3Rlc3RpbmcvYXNzZXJ0cy50c1wiO1xuICpcbiAqIERlbm8udGVzdChcImV4YW1wbGVcIiwgZnVuY3Rpb24gKCk6IHZvaWQge1xuICogICBhc3NlcnRFcXVhbHMoXCJ3b3JsZFwiLCBcIndvcmxkXCIpO1xuICogICBhc3NlcnRFcXVhbHMoeyBoZWxsbzogXCJ3b3JsZFwiIH0sIHsgaGVsbG86IFwid29ybGRcIiB9KTtcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRFcXVhbHM8VD4oYWN0dWFsOiBULCBleHBlY3RlZDogVCwgbXNnPzogc3RyaW5nKSB7XG4gIGlmIChlcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgbWVzc2FnZSA9IFwiXCI7XG4gIGNvbnN0IGFjdHVhbFN0cmluZyA9IGZvcm1hdChhY3R1YWwpO1xuICBjb25zdCBleHBlY3RlZFN0cmluZyA9IGZvcm1hdChleHBlY3RlZCk7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3RyaW5nRGlmZiA9ICh0eXBlb2YgYWN0dWFsID09PSBcInN0cmluZ1wiKSAmJlxuICAgICAgKHR5cGVvZiBleHBlY3RlZCA9PT0gXCJzdHJpbmdcIik7XG4gICAgY29uc3QgZGlmZlJlc3VsdCA9IHN0cmluZ0RpZmZcbiAgICAgID8gZGlmZnN0cihhY3R1YWwgYXMgc3RyaW5nLCBleHBlY3RlZCBhcyBzdHJpbmcpXG4gICAgICA6IGRpZmYoYWN0dWFsU3RyaW5nLnNwbGl0KFwiXFxuXCIpLCBleHBlY3RlZFN0cmluZy5zcGxpdChcIlxcblwiKSk7XG4gICAgY29uc3QgZGlmZk1zZyA9IGJ1aWxkTWVzc2FnZShkaWZmUmVzdWx0LCB7IHN0cmluZ0RpZmYgfSkuam9pbihcIlxcblwiKTtcbiAgICBtZXNzYWdlID0gYFZhbHVlcyBhcmUgbm90IGVxdWFsOlxcbiR7ZGlmZk1zZ31gO1xuICB9IGNhdGNoIHtcbiAgICBtZXNzYWdlID0gYFxcbiR7cmVkKENBTl9OT1RfRElTUExBWSl9ICsgXFxuXFxuYDtcbiAgfVxuICBpZiAobXNnKSB7XG4gICAgbWVzc2FnZSA9IG1zZztcbiAgfVxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgbm90IGVxdWFsLCBkZWVwbHkuXG4gKiBJZiBub3QgdGhlbiB0aHJvdy5cbiAqXG4gKiBUeXBlIHBhcmFtZXRlciBjYW4gYmUgc3BlY2lmaWVkIHRvIGVuc3VyZSB2YWx1ZXMgdW5kZXIgY29tcGFyaXNvbiBoYXZlIHRoZSBzYW1lIHR5cGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBhc3NlcnROb3RFcXVhbHMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBhc3NlcnROb3RFcXVhbHM8bnVtYmVyPigxLCAyKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RFcXVhbHM8VD4oYWN0dWFsOiBULCBleHBlY3RlZDogVCwgbXNnPzogc3RyaW5nKSB7XG4gIGlmICghZXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IGFjdHVhbFN0cmluZzogc3RyaW5nO1xuICBsZXQgZXhwZWN0ZWRTdHJpbmc6IHN0cmluZztcbiAgdHJ5IHtcbiAgICBhY3R1YWxTdHJpbmcgPSBTdHJpbmcoYWN0dWFsKTtcbiAgfSBjYXRjaCB7XG4gICAgYWN0dWFsU3RyaW5nID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG4gIH1cbiAgdHJ5IHtcbiAgICBleHBlY3RlZFN0cmluZyA9IFN0cmluZyhleHBlY3RlZCk7XG4gIH0gY2F0Y2gge1xuICAgIGV4cGVjdGVkU3RyaW5nID0gXCJbQ2Fubm90IGRpc3BsYXldXCI7XG4gIH1cbiAgaWYgKCFtc2cpIHtcbiAgICBtc2cgPSBgYWN0dWFsOiAke2FjdHVhbFN0cmluZ30gZXhwZWN0ZWQgbm90IHRvIGJlOiAke2V4cGVjdGVkU3RyaW5nfWA7XG4gIH1cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgc3RyaWN0bHkgZXF1YWwuIElmXG4gKiBub3QgdGhlbiB0aHJvdy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGFzc2VydFN0cmljdEVxdWFscyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL3Rlc3RpbmcvYXNzZXJ0cy50c1wiO1xuICpcbiAqIERlbm8udGVzdChcImlzU3RyaWN0bHlFcXVhbFwiLCBmdW5jdGlvbiAoKTogdm9pZCB7XG4gKiAgIGNvbnN0IGEgPSB7fTtcbiAqICAgY29uc3QgYiA9IGE7XG4gKiAgIGFzc2VydFN0cmljdEVxdWFscyhhLCBiKTtcbiAqIH0pO1xuICpcbiAqIC8vIFRoaXMgdGVzdCBmYWlsc1xuICogRGVuby50ZXN0KFwiaXNOb3RTdHJpY3RseUVxdWFsXCIsIGZ1bmN0aW9uICgpOiB2b2lkIHtcbiAqICAgY29uc3QgYSA9IHt9O1xuICogICBjb25zdCBiID0ge307XG4gKiAgIGFzc2VydFN0cmljdEVxdWFscyhhLCBiKTtcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdHJpY3RFcXVhbHM8VD4oXG4gIGFjdHVhbDogdW5rbm93bixcbiAgZXhwZWN0ZWQ6IFQsXG4gIG1zZz86IHN0cmluZyxcbik6IGFzc2VydHMgYWN0dWFsIGlzIFQge1xuICBpZiAoT2JqZWN0LmlzKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IG1lc3NhZ2U6IHN0cmluZztcblxuICBpZiAobXNnKSB7XG4gICAgbWVzc2FnZSA9IG1zZztcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhY3R1YWxTdHJpbmcgPSBmb3JtYXQoYWN0dWFsKTtcbiAgICBjb25zdCBleHBlY3RlZFN0cmluZyA9IGZvcm1hdChleHBlY3RlZCk7XG5cbiAgICBpZiAoYWN0dWFsU3RyaW5nID09PSBleHBlY3RlZFN0cmluZykge1xuICAgICAgY29uc3Qgd2l0aE9mZnNldCA9IGFjdHVhbFN0cmluZ1xuICAgICAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAgICAgLm1hcCgobCkgPT4gYCAgICAke2x9YClcbiAgICAgICAgLmpvaW4oXCJcXG5cIik7XG4gICAgICBtZXNzYWdlID1cbiAgICAgICAgYFZhbHVlcyBoYXZlIHRoZSBzYW1lIHN0cnVjdHVyZSBidXQgYXJlIG5vdCByZWZlcmVuY2UtZXF1YWw6XFxuXFxuJHtcbiAgICAgICAgICByZWQod2l0aE9mZnNldClcbiAgICAgICAgfVxcbmA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHN0cmluZ0RpZmYgPSAodHlwZW9mIGFjdHVhbCA9PT0gXCJzdHJpbmdcIikgJiZcbiAgICAgICAgICAodHlwZW9mIGV4cGVjdGVkID09PSBcInN0cmluZ1wiKTtcbiAgICAgICAgY29uc3QgZGlmZlJlc3VsdCA9IHN0cmluZ0RpZmZcbiAgICAgICAgICA/IGRpZmZzdHIoYWN0dWFsIGFzIHN0cmluZywgZXhwZWN0ZWQgYXMgc3RyaW5nKVxuICAgICAgICAgIDogZGlmZihhY3R1YWxTdHJpbmcuc3BsaXQoXCJcXG5cIiksIGV4cGVjdGVkU3RyaW5nLnNwbGl0KFwiXFxuXCIpKTtcbiAgICAgICAgY29uc3QgZGlmZk1zZyA9IGJ1aWxkTWVzc2FnZShkaWZmUmVzdWx0LCB7IHN0cmluZ0RpZmYgfSkuam9pbihcIlxcblwiKTtcbiAgICAgICAgbWVzc2FnZSA9IGBWYWx1ZXMgYXJlIG5vdCBzdHJpY3RseSBlcXVhbDpcXG4ke2RpZmZNc2d9YDtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBtZXNzYWdlID0gYFxcbiR7cmVkKENBTl9OT1RfRElTUExBWSl9ICsgXFxuXFxuYDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgbm90IHN0cmljdGx5IGVxdWFsLlxuICogSWYgdGhlIHZhbHVlcyBhcmUgc3RyaWN0bHkgZXF1YWwgdGhlbiB0aHJvdy5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgYXNzZXJ0Tm90U3RyaWN0RXF1YWxzIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vdGVzdGluZy9hc3NlcnRzLnRzXCI7XG4gKlxuICogYXNzZXJ0Tm90U3RyaWN0RXF1YWxzKDEsIDEpXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdFN0cmljdEVxdWFsczxUPihcbiAgYWN0dWFsOiBULFxuICBleHBlY3RlZDogVCxcbiAgbXNnPzogc3RyaW5nLFxuKSB7XG4gIGlmICghT2JqZWN0LmlzKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFxuICAgIG1zZyA/PyBgRXhwZWN0ZWQgXCJhY3R1YWxcIiB0byBiZSBzdHJpY3RseSB1bmVxdWFsIHRvOiAke2Zvcm1hdChhY3R1YWwpfVxcbmAsXG4gICk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBhbmQgYGV4cGVjdGVkYCBhcmUgYWxtb3N0IGVxdWFsIG51bWJlcnMgdGhyb3VnaFxuICogYSBnaXZlbiB0b2xlcmFuY2UuIEl0IGNhbiBiZSB1c2VkIHRvIHRha2UgaW50byBhY2NvdW50IElFRUUtNzU0IGRvdWJsZS1wcmVjaXNpb25cbiAqIGZsb2F0aW5nLXBvaW50IHJlcHJlc2VudGF0aW9uIGxpbWl0YXRpb25zLlxuICogSWYgdGhlIHZhbHVlcyBhcmUgbm90IGFsbW9zdCBlcXVhbCB0aGVuIHRocm93LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgYXNzZXJ0QWxtb3N0RXF1YWxzLCBhc3NlcnRUaHJvd3MgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBhc3NlcnRBbG1vc3RFcXVhbHMoMC4xLCAwLjIpO1xuICpcbiAqIC8vIFVzaW5nIGEgY3VzdG9tIHRvbGVyYW5jZSB2YWx1ZVxuICogYXNzZXJ0QWxtb3N0RXF1YWxzKDAuMSArIDAuMiwgMC4zLCAxZS0xNik7XG4gKiBhc3NlcnRUaHJvd3MoKCkgPT4gYXNzZXJ0QWxtb3N0RXF1YWxzKDAuMSArIDAuMiwgMC4zLCAxZS0xNykpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRBbG1vc3RFcXVhbHMoXG4gIGFjdHVhbDogbnVtYmVyLFxuICBleHBlY3RlZDogbnVtYmVyLFxuICB0b2xlcmFuY2UgPSAxZS03LFxuICBtc2c/OiBzdHJpbmcsXG4pIHtcbiAgaWYgKE9iamVjdC5pcyhhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBkZWx0YSA9IE1hdGguYWJzKGV4cGVjdGVkIC0gYWN0dWFsKTtcbiAgaWYgKGRlbHRhIDw9IHRvbGVyYW5jZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBmID0gKG46IG51bWJlcikgPT4gTnVtYmVyLmlzSW50ZWdlcihuKSA/IG4gOiBuLnRvRXhwb25lbnRpYWwoKTtcbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFxuICAgIG1zZyA/P1xuICAgICAgYGFjdHVhbDogXCIke2YoYWN0dWFsKX1cIiBleHBlY3RlZCB0byBiZSBjbG9zZSB0byBcIiR7ZihleHBlY3RlZCl9XCI6IFxcXG5kZWx0YSBcIiR7ZihkZWx0YSl9XCIgaXMgZ3JlYXRlciB0aGFuIFwiJHtmKHRvbGVyYW5jZSl9XCJgLFxuICApO1xufVxuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxudHlwZSBBbnlDb25zdHJ1Y3RvciA9IG5ldyAoLi4uYXJnczogYW55W10pID0+IGFueTtcbnR5cGUgR2V0Q29uc3RydWN0b3JUeXBlPFQgZXh0ZW5kcyBBbnlDb25zdHJ1Y3Rvcj4gPSBUIGV4dGVuZHMgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbm5ldyAoLi4uYXJnczogYW55KSA9PiBpbmZlciBDID8gQ1xuICA6IG5ldmVyO1xuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYG9iamAgaXMgYW4gaW5zdGFuY2Ugb2YgYHR5cGVgLlxuICogSWYgbm90IHRoZW4gdGhyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRJbnN0YW5jZU9mPFQgZXh0ZW5kcyBBbnlDb25zdHJ1Y3Rvcj4oXG4gIGFjdHVhbDogdW5rbm93bixcbiAgZXhwZWN0ZWRUeXBlOiBULFxuICBtc2cgPSBcIlwiLFxuKTogYXNzZXJ0cyBhY3R1YWwgaXMgR2V0Q29uc3RydWN0b3JUeXBlPFQ+IHtcbiAgaWYgKCFtc2cpIHtcbiAgICBjb25zdCBleHBlY3RlZFR5cGVTdHIgPSBleHBlY3RlZFR5cGUubmFtZTtcblxuICAgIGxldCBhY3R1YWxUeXBlU3RyID0gXCJcIjtcbiAgICBpZiAoYWN0dWFsID09PSBudWxsKSB7XG4gICAgICBhY3R1YWxUeXBlU3RyID0gXCJudWxsXCI7XG4gICAgfSBlbHNlIGlmIChhY3R1YWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYWN0dWFsVHlwZVN0ciA9IFwidW5kZWZpbmVkXCI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYWN0dWFsID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBhY3R1YWxUeXBlU3RyID0gYWN0dWFsLmNvbnN0cnVjdG9yPy5uYW1lID8/IFwiT2JqZWN0XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFjdHVhbFR5cGVTdHIgPSB0eXBlb2YgYWN0dWFsO1xuICAgIH1cblxuICAgIGlmIChleHBlY3RlZFR5cGVTdHIgPT0gYWN0dWFsVHlwZVN0cikge1xuICAgICAgbXNnID0gYEV4cGVjdGVkIG9iamVjdCB0byBiZSBhbiBpbnN0YW5jZSBvZiBcIiR7ZXhwZWN0ZWRUeXBlU3RyfVwiLmA7XG4gICAgfSBlbHNlIGlmIChhY3R1YWxUeXBlU3RyID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgbXNnID1cbiAgICAgICAgYEV4cGVjdGVkIG9iamVjdCB0byBiZSBhbiBpbnN0YW5jZSBvZiBcIiR7ZXhwZWN0ZWRUeXBlU3RyfVwiIGJ1dCB3YXMgbm90IGFuIGluc3RhbmNlZCBvYmplY3QuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgbXNnID1cbiAgICAgICAgYEV4cGVjdGVkIG9iamVjdCB0byBiZSBhbiBpbnN0YW5jZSBvZiBcIiR7ZXhwZWN0ZWRUeXBlU3RyfVwiIGJ1dCB3YXMgXCIke2FjdHVhbFR5cGVTdHJ9XCIuYDtcbiAgICB9XG4gIH1cbiAgYXNzZXJ0KGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkVHlwZSwgbXNnKTtcbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBvYmpgIGlzIG5vdCBhbiBpbnN0YW5jZSBvZiBgdHlwZWAuXG4gKiBJZiBzbywgdGhlbiB0aHJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5vdEluc3RhbmNlT2Y8QSwgVD4oXG4gIGFjdHVhbDogQSxcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgdW5leHBlY3RlZFR5cGU6IG5ldyAoLi4uYXJnczogYW55W10pID0+IFQsXG4gIG1zZyA9IGBFeHBlY3RlZCBvYmplY3QgdG8gbm90IGJlIGFuIGluc3RhbmNlIG9mIFwiJHt0eXBlb2YgdW5leHBlY3RlZFR5cGV9XCJgLFxuKTogYXNzZXJ0cyBhY3R1YWwgaXMgRXhjbHVkZTxBLCBUPiB7XG4gIGFzc2VydEZhbHNlKGFjdHVhbCBpbnN0YW5jZW9mIHVuZXhwZWN0ZWRUeXBlLCBtc2cpO1xufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYWN0dWFsIGlzIG5vdCBudWxsIG9yIHVuZGVmaW5lZC5cbiAqIElmIG5vdCB0aGVuIHRocm93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RXhpc3RzPFQ+KFxuICBhY3R1YWw6IFQsXG4gIG1zZz86IHN0cmluZyxcbik6IGFzc2VydHMgYWN0dWFsIGlzIE5vbk51bGxhYmxlPFQ+IHtcbiAgaWYgKGFjdHVhbCA9PT0gdW5kZWZpbmVkIHx8IGFjdHVhbCA9PT0gbnVsbCkge1xuICAgIGlmICghbXNnKSB7XG4gICAgICBtc2cgPSBgYWN0dWFsOiBcIiR7YWN0dWFsfVwiIGV4cGVjdGVkIHRvIG5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZGA7XG4gICAgfVxuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBhY3R1YWwgaW5jbHVkZXMgZXhwZWN0ZWQuIElmIG5vdFxuICogdGhlbiB0aHJvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFN0cmluZ0luY2x1ZGVzKFxuICBhY3R1YWw6IHN0cmluZyxcbiAgZXhwZWN0ZWQ6IHN0cmluZyxcbiAgbXNnPzogc3RyaW5nLFxuKSB7XG4gIGlmICghYWN0dWFsLmluY2x1ZGVzKGV4cGVjdGVkKSkge1xuICAgIGlmICghbXNnKSB7XG4gICAgICBtc2cgPSBgYWN0dWFsOiBcIiR7YWN0dWFsfVwiIGV4cGVjdGVkIHRvIGNvbnRhaW46IFwiJHtleHBlY3RlZH1cImA7XG4gICAgfVxuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBpbmNsdWRlcyB0aGUgYGV4cGVjdGVkYCB2YWx1ZXMuXG4gKiBJZiBub3QgdGhlbiBhbiBlcnJvciB3aWxsIGJlIHRocm93bi5cbiAqXG4gKiBUeXBlIHBhcmFtZXRlciBjYW4gYmUgc3BlY2lmaWVkIHRvIGVuc3VyZSB2YWx1ZXMgdW5kZXIgY29tcGFyaXNvbiBoYXZlIHRoZSBzYW1lIHR5cGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBhc3NlcnRBcnJheUluY2x1ZGVzIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vdGVzdGluZy9hc3NlcnRzLnRzXCI7XG4gKlxuICogYXNzZXJ0QXJyYXlJbmNsdWRlczxudW1iZXI+KFsxLCAyXSwgWzJdKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRBcnJheUluY2x1ZGVzPFQ+KFxuICBhY3R1YWw6IEFycmF5TGlrZTxUPixcbiAgZXhwZWN0ZWQ6IEFycmF5TGlrZTxUPixcbiAgbXNnPzogc3RyaW5nLFxuKSB7XG4gIGNvbnN0IG1pc3Npbmc6IHVua25vd25bXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cGVjdGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBhY3R1YWwubGVuZ3RoOyBqKyspIHtcbiAgICAgIGlmIChlcXVhbChleHBlY3RlZFtpXSwgYWN0dWFsW2pdKSkge1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBtaXNzaW5nLnB1c2goZXhwZWN0ZWRbaV0pO1xuICAgIH1cbiAgfVxuICBpZiAobWlzc2luZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFtc2cpIHtcbiAgICBtc2cgPSBgYWN0dWFsOiBcIiR7Zm9ybWF0KGFjdHVhbCl9XCIgZXhwZWN0ZWQgdG8gaW5jbHVkZTogXCIke1xuICAgICAgZm9ybWF0KGV4cGVjdGVkKVxuICAgIH1cIlxcbm1pc3Npbmc6ICR7Zm9ybWF0KG1pc3NpbmcpfWA7XG4gIH1cbiAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG59XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24gdGhhdCBgYWN0dWFsYCBtYXRjaCBSZWdFeHAgYGV4cGVjdGVkYC4gSWYgbm90XG4gKiB0aGVuIHRocm93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0TWF0Y2goXG4gIGFjdHVhbDogc3RyaW5nLFxuICBleHBlY3RlZDogUmVnRXhwLFxuICBtc2c/OiBzdHJpbmcsXG4pIHtcbiAgaWYgKCFleHBlY3RlZC50ZXN0KGFjdHVhbCkpIHtcbiAgICBpZiAoIW1zZykge1xuICAgICAgbXNnID0gYGFjdHVhbDogXCIke2FjdHVhbH1cIiBleHBlY3RlZCB0byBtYXRjaDogXCIke2V4cGVjdGVkfVwiYDtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1zZyk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlIGFuIGFzc2VydGlvbiB0aGF0IGBhY3R1YWxgIG5vdCBtYXRjaCBSZWdFeHAgYGV4cGVjdGVkYC4gSWYgbWF0Y2hcbiAqIHRoZW4gdGhyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROb3RNYXRjaChcbiAgYWN0dWFsOiBzdHJpbmcsXG4gIGV4cGVjdGVkOiBSZWdFeHAsXG4gIG1zZz86IHN0cmluZyxcbikge1xuICBpZiAoZXhwZWN0ZWQudGVzdChhY3R1YWwpKSB7XG4gICAgaWYgKCFtc2cpIHtcbiAgICAgIG1zZyA9IGBhY3R1YWw6IFwiJHthY3R1YWx9XCIgZXhwZWN0ZWQgdG8gbm90IG1hdGNoOiBcIiR7ZXhwZWN0ZWR9XCJgO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGFjdHVhbGAgb2JqZWN0IGlzIGEgc3Vic2V0IG9mIGBleHBlY3RlZGAgb2JqZWN0LCBkZWVwbHkuXG4gKiBJZiBub3QsIHRoZW4gdGhyb3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRPYmplY3RNYXRjaChcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgYWN0dWFsOiBSZWNvcmQ8UHJvcGVydHlLZXksIGFueT4sXG4gIGV4cGVjdGVkOiBSZWNvcmQ8UHJvcGVydHlLZXksIHVua25vd24+LFxuKSB7XG4gIHR5cGUgbG9vc2UgPSBSZWNvcmQ8UHJvcGVydHlLZXksIHVua25vd24+O1xuXG4gIGZ1bmN0aW9uIGZpbHRlcihhOiBsb29zZSwgYjogbG9vc2UpIHtcbiAgICBjb25zdCBzZWVuID0gbmV3IFdlYWtNYXAoKTtcbiAgICByZXR1cm4gZm4oYSwgYik7XG5cbiAgICBmdW5jdGlvbiBmbihhOiBsb29zZSwgYjogbG9vc2UpOiBsb29zZSB7XG4gICAgICAvLyBQcmV2ZW50IGluZmluaXRlIGxvb3Agd2l0aCBjaXJjdWxhciByZWZlcmVuY2VzIHdpdGggc2FtZSBmaWx0ZXJcbiAgICAgIGlmICgoc2Vlbi5oYXMoYSkpICYmIChzZWVuLmdldChhKSA9PT0gYikpIHtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICB9XG4gICAgICBzZWVuLnNldChhLCBiKTtcbiAgICAgIC8vIEZpbHRlciBrZXlzIGFuZCBzeW1ib2xzIHdoaWNoIGFyZSBwcmVzZW50IGluIGJvdGggYWN0dWFsIGFuZCBleHBlY3RlZFxuICAgICAgY29uc3QgZmlsdGVyZWQgPSB7fSBhcyBsb29zZTtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBbXG4gICAgICAgIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGEpLFxuICAgICAgICAuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGEpLFxuICAgICAgXVxuICAgICAgICAuZmlsdGVyKChrZXkpID0+IGtleSBpbiBiKVxuICAgICAgICAubWFwKChrZXkpID0+IFtrZXksIGFba2V5IGFzIHN0cmluZ11dKSBhcyBBcnJheTxbc3RyaW5nLCB1bmtub3duXT47XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIC8vIE9uIGFycmF5IHJlZmVyZW5jZXMsIGJ1aWxkIGEgZmlsdGVyZWQgYXJyYXkgYW5kIGZpbHRlciBuZXN0ZWQgb2JqZWN0cyBpbnNpZGVcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgY29uc3Qgc3Vic2V0ID0gKGIgYXMgbG9vc2UpW2tleV07XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3Vic2V0KSkge1xuICAgICAgICAgICAgZmlsdGVyZWRba2V5XSA9IGZuKHsgLi4udmFsdWUgfSwgeyAuLi5zdWJzZXQgfSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gLy8gT24gcmVnZXhwIHJlZmVyZW5jZXMsIGtlZXAgdmFsdWUgYXMgaXQgdG8gYXZvaWQgbG9vc2luZyBwYXR0ZXJuIGFuZCBmbGFnc1xuICAgICAgICBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgIGZpbHRlcmVkW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSAvLyBPbiBuZXN0ZWQgb2JqZWN0cyByZWZlcmVuY2VzLCBidWlsZCBhIGZpbHRlcmVkIG9iamVjdCByZWN1cnNpdmVseVxuICAgICAgICBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBjb25zdCBzdWJzZXQgPSAoYiBhcyBsb29zZSlba2V5XTtcbiAgICAgICAgICBpZiAoKHR5cGVvZiBzdWJzZXQgPT09IFwib2JqZWN0XCIpICYmIChzdWJzZXQpKSB7XG4gICAgICAgICAgICAvLyBXaGVuIGJvdGggb3BlcmFuZHMgYXJlIG1hcHMsIGJ1aWxkIGEgZmlsdGVyZWQgbWFwIHdpdGggY29tbW9uIGtleXMgYW5kIGZpbHRlciBuZXN0ZWQgb2JqZWN0cyBpbnNpZGVcbiAgICAgICAgICAgIGlmICgodmFsdWUgaW5zdGFuY2VvZiBNYXApICYmIChzdWJzZXQgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgICAgIGZpbHRlcmVkW2tleV0gPSBuZXcgTWFwKFxuICAgICAgICAgICAgICAgIFsuLi52YWx1ZV0uZmlsdGVyKChba10pID0+IHN1YnNldC5oYXMoaykpLm1hcCgoXG4gICAgICAgICAgICAgICAgICBbaywgdl0sXG4gICAgICAgICAgICAgICAgKSA9PiBbaywgdHlwZW9mIHYgPT09IFwib2JqZWN0XCIgPyBmbih2LCBzdWJzZXQuZ2V0KGspKSA6IHZdKSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBXaGVuIGJvdGggb3BlcmFuZHMgYXJlIHNldCwgYnVpbGQgYSBmaWx0ZXJlZCBzZXQgd2l0aCBjb21tb24gdmFsdWVzXG4gICAgICAgICAgICBpZiAoKHZhbHVlIGluc3RhbmNlb2YgU2V0KSAmJiAoc3Vic2V0IGluc3RhbmNlb2YgU2V0KSkge1xuICAgICAgICAgICAgICBmaWx0ZXJlZFtrZXldID0gbmV3IFNldChbLi4udmFsdWVdLmZpbHRlcigodikgPT4gc3Vic2V0Lmhhcyh2KSkpO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbHRlcmVkW2tleV0gPSBmbih2YWx1ZSBhcyBsb29zZSwgc3Vic2V0IGFzIGxvb3NlKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmaWx0ZXJlZFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgfVxuICB9XG4gIHJldHVybiBhc3NlcnRFcXVhbHMoXG4gICAgLy8gZ2V0IHRoZSBpbnRlcnNlY3Rpb24gb2YgXCJhY3R1YWxcIiBhbmQgXCJleHBlY3RlZFwiXG4gICAgLy8gc2lkZSBlZmZlY3Q6IGFsbCB0aGUgaW5zdGFuY2VzJyBjb25zdHJ1Y3RvciBmaWVsZCBpcyBcIk9iamVjdFwiIG5vdy5cbiAgICBmaWx0ZXIoYWN0dWFsLCBleHBlY3RlZCksXG4gICAgLy8gc2V0IChuZXN0ZWQpIGluc3RhbmNlcycgY29uc3RydWN0b3IgZmllbGQgdG8gYmUgXCJPYmplY3RcIiB3aXRob3V0IGNoYW5naW5nIGV4cGVjdGVkIHZhbHVlLlxuICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZGVub2xhbmQvZGVub19zdGQvcHVsbC8xNDE5XG4gICAgZmlsdGVyKGV4cGVjdGVkLCBleHBlY3RlZCksXG4gICk7XG59XG5cbi8qKlxuICogRm9yY2VmdWxseSB0aHJvd3MgYSBmYWlsZWQgYXNzZXJ0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmYWlsKG1zZz86IHN0cmluZyk6IG5ldmVyIHtcbiAgYXNzZXJ0KGZhbHNlLCBgRmFpbGVkIGFzc2VydGlvbiR7bXNnID8gYDogJHttc2d9YCA6IFwiLlwifWApO1xufVxuXG4vKipcbiAqIE1ha2UgYW4gYXNzZXJ0aW9uIHRoYXQgYGVycm9yYCBpcyBhbiBgRXJyb3JgLlxuICogSWYgbm90IHRoZW4gYW4gZXJyb3Igd2lsbCBiZSB0aHJvd24uXG4gKiBBbiBlcnJvciBjbGFzcyBhbmQgYSBzdHJpbmcgdGhhdCBzaG91bGQgYmUgaW5jbHVkZWQgaW4gdGhlXG4gKiBlcnJvciBtZXNzYWdlIGNhbiBhbHNvIGJlIGFzc2VydGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0SXNFcnJvcjxFIGV4dGVuZHMgRXJyb3IgPSBFcnJvcj4oXG4gIGVycm9yOiB1bmtub3duLFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBFcnJvckNsYXNzPzogbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRSxcbiAgbXNnSW5jbHVkZXM/OiBzdHJpbmcsXG4gIG1zZz86IHN0cmluZyxcbik6IGFzc2VydHMgZXJyb3IgaXMgRSB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yID09PSBmYWxzZSkge1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihgRXhwZWN0ZWQgXCJlcnJvclwiIHRvIGJlIGFuIEVycm9yIG9iamVjdC5gKTtcbiAgfVxuICBpZiAoRXJyb3JDbGFzcyAmJiAhKGVycm9yIGluc3RhbmNlb2YgRXJyb3JDbGFzcykpIHtcbiAgICBtc2cgPSBgRXhwZWN0ZWQgZXJyb3IgdG8gYmUgaW5zdGFuY2Ugb2YgXCIke0Vycm9yQ2xhc3MubmFtZX1cIiwgYnV0IHdhcyBcIiR7XG4gICAgICB0eXBlb2YgZXJyb3IgPT09IFwib2JqZWN0XCIgPyBlcnJvcj8uY29uc3RydWN0b3I/Lm5hbWUgOiBcIltub3QgYW4gb2JqZWN0XVwiXG4gICAgfVwiJHttc2cgPyBgOiAke21zZ31gIDogXCIuXCJ9YDtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxuICBpZiAoXG4gICAgbXNnSW5jbHVkZXMgJiYgKCEoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikgfHxcbiAgICAgICFzdHJpcENvbG9yKGVycm9yLm1lc3NhZ2UpLmluY2x1ZGVzKHN0cmlwQ29sb3IobXNnSW5jbHVkZXMpKSlcbiAgKSB7XG4gICAgbXNnID0gYEV4cGVjdGVkIGVycm9yIG1lc3NhZ2UgdG8gaW5jbHVkZSBcIiR7bXNnSW5jbHVkZXN9XCIsIGJ1dCBnb3QgXCIke1xuICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIltub3QgYW4gRXJyb3JdXCJcbiAgICB9XCIke21zZyA/IGA6ICR7bXNnfWAgOiBcIi5cIn1gO1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBmdW5jdGlvbiwgZXhwZWN0aW5nIGl0IHRvIHRocm93LiBJZiBpdCBkb2VzIG5vdCwgdGhlbiBpdFxuICogdGhyb3dzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgYXNzZXJ0VGhyb3dzIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vdGVzdGluZy9hc3NlcnRzLnRzXCI7XG4gKlxuICogRGVuby50ZXN0KFwiZG9lc1Rocm93XCIsIGZ1bmN0aW9uICgpOiB2b2lkIHtcbiAqICAgYXNzZXJ0VGhyb3dzKCgpOiB2b2lkID0+IHtcbiAqICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiaGVsbG8gd29ybGQhXCIpO1xuICogICB9KTtcbiAqIH0pO1xuICpcbiAqIC8vIFRoaXMgdGVzdCB3aWxsIG5vdCBwYXNzLlxuICogRGVuby50ZXN0KFwiZmFpbHNcIiwgZnVuY3Rpb24gKCk6IHZvaWQge1xuICogICBhc3NlcnRUaHJvd3MoKCk6IHZvaWQgPT4ge1xuICogICAgIGNvbnNvbGUubG9nKFwiSGVsbG8gd29ybGRcIik7XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFRocm93cyhcbiAgZm46ICgpID0+IHVua25vd24sXG4gIG1zZz86IHN0cmluZyxcbik6IHVua25vd247XG4vKipcbiAqIEV4ZWN1dGVzIGEgZnVuY3Rpb24sIGV4cGVjdGluZyBpdCB0byB0aHJvdy4gSWYgaXQgZG9lcyBub3QsIHRoZW4gaXRcbiAqIHRocm93cy4gQW4gZXJyb3IgY2xhc3MgYW5kIGEgc3RyaW5nIHRoYXQgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHRoZVxuICogZXJyb3IgbWVzc2FnZSBjYW4gYWxzbyBiZSBhc3NlcnRlZC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBhc3NlcnRUaHJvd3MgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBEZW5vLnRlc3QoXCJkb2VzVGhyb3dcIiwgZnVuY3Rpb24gKCk6IHZvaWQge1xuICogICBhc3NlcnRUaHJvd3MoKCk6IHZvaWQgPT4ge1xuICogICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJoZWxsbyB3b3JsZCFcIik7XG4gKiAgIH0sIFR5cGVFcnJvcik7XG4gKiAgIGFzc2VydFRocm93cyhcbiAqICAgICAoKTogdm9pZCA9PiB7XG4gKiAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiaGVsbG8gd29ybGQhXCIpO1xuICogICAgIH0sXG4gKiAgICAgVHlwZUVycm9yLFxuICogICAgIFwiaGVsbG9cIixcbiAqICAgKTtcbiAqIH0pO1xuICpcbiAqIC8vIFRoaXMgdGVzdCB3aWxsIG5vdCBwYXNzLlxuICogRGVuby50ZXN0KFwiZmFpbHNcIiwgZnVuY3Rpb24gKCk6IHZvaWQge1xuICogICBhc3NlcnRUaHJvd3MoKCk6IHZvaWQgPT4ge1xuICogICAgIGNvbnNvbGUubG9nKFwiSGVsbG8gd29ybGRcIik7XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFRocm93czxFIGV4dGVuZHMgRXJyb3IgPSBFcnJvcj4oXG4gIGZuOiAoKSA9PiB1bmtub3duLFxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBFcnJvckNsYXNzOiBuZXcgKC4uLmFyZ3M6IGFueVtdKSA9PiBFLFxuICBtc2dJbmNsdWRlcz86IHN0cmluZyxcbiAgbXNnPzogc3RyaW5nLFxuKTogRTtcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUaHJvd3M8RSBleHRlbmRzIEVycm9yID0gRXJyb3I+KFxuICBmbjogKCkgPT4gdW5rbm93bixcbiAgZXJyb3JDbGFzc09yTXNnPzpcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHwgKG5ldyAoLi4uYXJnczogYW55W10pID0+IEUpXG4gICAgfCBzdHJpbmcsXG4gIG1zZ0luY2x1ZGVzT3JNc2c/OiBzdHJpbmcsXG4gIG1zZz86IHN0cmluZyxcbik6IEUgfCBFcnJvciB8IHVua25vd24ge1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBsZXQgRXJyb3JDbGFzczogKG5ldyAoLi4uYXJnczogYW55W10pID0+IEUpIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgbXNnSW5jbHVkZXM6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IGVycjtcblxuICBpZiAodHlwZW9mIGVycm9yQ2xhc3NPck1zZyAhPT0gXCJzdHJpbmdcIikge1xuICAgIGlmIChcbiAgICAgIGVycm9yQ2xhc3NPck1zZyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICBlcnJvckNsYXNzT3JNc2cucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3IgfHxcbiAgICAgIGVycm9yQ2xhc3NPck1zZy5wcm90b3R5cGUgPT09IEVycm9yLnByb3RvdHlwZVxuICAgICkge1xuICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgIEVycm9yQ2xhc3MgPSBlcnJvckNsYXNzT3JNc2cgYXMgbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRTtcbiAgICAgIG1zZ0luY2x1ZGVzID0gbXNnSW5jbHVkZXNPck1zZztcbiAgICB9IGVsc2Uge1xuICAgICAgbXNnID0gbXNnSW5jbHVkZXNPck1zZztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbXNnID0gZXJyb3JDbGFzc09yTXNnO1xuICB9XG4gIGxldCBkb2VzVGhyb3cgPSBmYWxzZTtcbiAgY29uc3QgbXNnVG9BcHBlbmRUb0Vycm9yID0gbXNnID8gYDogJHttc2d9YCA6IFwiLlwiO1xuICB0cnkge1xuICAgIGZuKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKEVycm9yQ2xhc3MpIHtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yID09PSBmYWxzZSkge1xuICAgICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXCJBIG5vbi1FcnJvciBvYmplY3Qgd2FzIHRocm93bi5cIik7XG4gICAgICB9XG4gICAgICBhc3NlcnRJc0Vycm9yKFxuICAgICAgICBlcnJvcixcbiAgICAgICAgRXJyb3JDbGFzcyxcbiAgICAgICAgbXNnSW5jbHVkZXMsXG4gICAgICAgIG1zZyxcbiAgICAgICk7XG4gICAgfVxuICAgIGVyciA9IGVycm9yO1xuICAgIGRvZXNUaHJvdyA9IHRydWU7XG4gIH1cbiAgaWYgKCFkb2VzVGhyb3cpIHtcbiAgICBtc2cgPSBgRXhwZWN0ZWQgZnVuY3Rpb24gdG8gdGhyb3cke21zZ1RvQXBwZW5kVG9FcnJvcn1gO1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cpO1xuICB9XG4gIHJldHVybiBlcnI7XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgcHJvbWlzZSwgZXhwZWN0aW5nIGl0IHRvIHJlamVjdC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGFzc2VydFJlamVjdHMgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQCRTVERfVkVSU0lPTi90ZXN0aW5nL2Fzc2VydHMudHNcIjtcbiAqXG4gKiBEZW5vLnRlc3QoXCJkb2VzVGhyb3dcIiwgYXN5bmMgZnVuY3Rpb24gKCkge1xuICogICBhd2FpdCBhc3NlcnRSZWplY3RzKFxuICogICAgIGFzeW5jICgpID0+IHtcbiAqICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJoZWxsbyB3b3JsZCFcIik7XG4gKiAgICAgfSxcbiAqICAgKTtcbiAqICAgYXdhaXQgYXNzZXJ0UmVqZWN0cyhcbiAqICAgICBhc3luYyAoKSA9PiB7XG4gKiAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCkpO1xuICogICAgIH0sXG4gKiAgICk7XG4gKiB9KTtcbiAqXG4gKiAvLyBUaGlzIHRlc3Qgd2lsbCBub3QgcGFzcy5cbiAqIERlbm8udGVzdChcImZhaWxzXCIsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAqICAgYXdhaXQgYXNzZXJ0UmVqZWN0cyhcbiAqICAgICBhc3luYyAoKSA9PiB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhcIkhlbGxvIHdvcmxkXCIpO1xuICogICAgIH0sXG4gKiAgICk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0UmVqZWN0cyhcbiAgZm46ICgpID0+IFByb21pc2VMaWtlPHVua25vd24+LFxuICBtc2c/OiBzdHJpbmcsXG4pOiBQcm9taXNlPHVua25vd24+O1xuLyoqXG4gKiBFeGVjdXRlcyBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBwcm9taXNlLCBleHBlY3RpbmcgaXQgdG8gcmVqZWN0LlxuICogSWYgaXQgZG9lcyBub3QsIHRoZW4gaXQgdGhyb3dzLiBBbiBlcnJvciBjbGFzcyBhbmQgYSBzdHJpbmcgdGhhdCBzaG91bGQgYmVcbiAqIGluY2x1ZGVkIGluIHRoZSBlcnJvciBtZXNzYWdlIGNhbiBhbHNvIGJlIGFzc2VydGVkLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgYXNzZXJ0UmVqZWN0cyB9IGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAJFNURF9WRVJTSU9OL3Rlc3RpbmcvYXNzZXJ0cy50c1wiO1xuICpcbiAqIERlbm8udGVzdChcImRvZXNUaHJvd1wiLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gKiAgIGF3YWl0IGFzc2VydFJlamVjdHMoYXN5bmMgKCkgPT4ge1xuICogICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJoZWxsbyB3b3JsZCFcIik7XG4gKiAgIH0sIFR5cGVFcnJvcik7XG4gKiAgIGF3YWl0IGFzc2VydFJlamVjdHMoXG4gKiAgICAgYXN5bmMgKCkgPT4ge1xuICogICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImhlbGxvIHdvcmxkIVwiKTtcbiAqICAgICB9LFxuICogICAgIFR5cGVFcnJvcixcbiAqICAgICBcImhlbGxvXCIsXG4gKiAgICk7XG4gKiB9KTtcbiAqXG4gKiAvLyBUaGlzIHRlc3Qgd2lsbCBub3QgcGFzcy5cbiAqIERlbm8udGVzdChcImZhaWxzXCIsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAqICAgYXdhaXQgYXNzZXJ0UmVqZWN0cyhcbiAqICAgICBhc3luYyAoKSA9PiB7XG4gKiAgICAgICBjb25zb2xlLmxvZyhcIkhlbGxvIHdvcmxkXCIpO1xuICogICAgIH0sXG4gKiAgICk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0UmVqZWN0czxFIGV4dGVuZHMgRXJyb3IgPSBFcnJvcj4oXG4gIGZuOiAoKSA9PiBQcm9taXNlTGlrZTx1bmtub3duPixcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgRXJyb3JDbGFzczogbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRSxcbiAgbXNnSW5jbHVkZXM/OiBzdHJpbmcsXG4gIG1zZz86IHN0cmluZyxcbik6IFByb21pc2U8RT47XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNzZXJ0UmVqZWN0czxFIGV4dGVuZHMgRXJyb3IgPSBFcnJvcj4oXG4gIGZuOiAoKSA9PiBQcm9taXNlTGlrZTx1bmtub3duPixcbiAgZXJyb3JDbGFzc09yTXNnPzpcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHwgKG5ldyAoLi4uYXJnczogYW55W10pID0+IEUpXG4gICAgfCBzdHJpbmcsXG4gIG1zZ0luY2x1ZGVzT3JNc2c/OiBzdHJpbmcsXG4gIG1zZz86IHN0cmluZyxcbik6IFByb21pc2U8RSB8IEVycm9yIHwgdW5rbm93bj4ge1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBsZXQgRXJyb3JDbGFzczogKG5ldyAoLi4uYXJnczogYW55W10pID0+IEUpIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBsZXQgbXNnSW5jbHVkZXM6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgbGV0IGVycjtcblxuICBpZiAodHlwZW9mIGVycm9yQ2xhc3NPck1zZyAhPT0gXCJzdHJpbmdcIikge1xuICAgIGlmIChcbiAgICAgIGVycm9yQ2xhc3NPck1zZyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICBlcnJvckNsYXNzT3JNc2cucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3IgfHxcbiAgICAgIGVycm9yQ2xhc3NPck1zZy5wcm90b3R5cGUgPT09IEVycm9yLnByb3RvdHlwZVxuICAgICkge1xuICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgIEVycm9yQ2xhc3MgPSBlcnJvckNsYXNzT3JNc2cgYXMgbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gRTtcbiAgICAgIG1zZ0luY2x1ZGVzID0gbXNnSW5jbHVkZXNPck1zZztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbXNnID0gZXJyb3JDbGFzc09yTXNnO1xuICB9XG4gIGxldCBkb2VzVGhyb3cgPSBmYWxzZTtcbiAgbGV0IGlzUHJvbWlzZVJldHVybmVkID0gZmFsc2U7XG4gIGNvbnN0IG1zZ1RvQXBwZW5kVG9FcnJvciA9IG1zZyA/IGA6ICR7bXNnfWAgOiBcIi5cIjtcbiAgdHJ5IHtcbiAgICBjb25zdCBwb3NzaWJsZVByb21pc2UgPSBmbigpO1xuICAgIGlmIChcbiAgICAgIHBvc3NpYmxlUHJvbWlzZSAmJlxuICAgICAgdHlwZW9mIHBvc3NpYmxlUHJvbWlzZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgdHlwZW9mIHBvc3NpYmxlUHJvbWlzZS50aGVuID09PSBcImZ1bmN0aW9uXCJcbiAgICApIHtcbiAgICAgIGlzUHJvbWlzZVJldHVybmVkID0gdHJ1ZTtcbiAgICAgIGF3YWl0IHBvc3NpYmxlUHJvbWlzZTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFpc1Byb21pc2VSZXR1cm5lZCkge1xuICAgICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFxuICAgICAgICBgRnVuY3Rpb24gdGhyb3dzIHdoZW4gZXhwZWN0ZWQgdG8gcmVqZWN0JHttc2dUb0FwcGVuZFRvRXJyb3J9YCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChFcnJvckNsYXNzKSB7XG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKFwiQSBub24tRXJyb3Igb2JqZWN0IHdhcyByZWplY3RlZC5cIik7XG4gICAgICB9XG4gICAgICBhc3NlcnRJc0Vycm9yKFxuICAgICAgICBlcnJvcixcbiAgICAgICAgRXJyb3JDbGFzcyxcbiAgICAgICAgbXNnSW5jbHVkZXMsXG4gICAgICAgIG1zZyxcbiAgICAgICk7XG4gICAgfVxuICAgIGVyciA9IGVycm9yO1xuICAgIGRvZXNUaHJvdyA9IHRydWU7XG4gIH1cbiAgaWYgKCFkb2VzVGhyb3cpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXG4gICAgICBgRXhwZWN0ZWQgZnVuY3Rpb24gdG8gcmVqZWN0JHttc2dUb0FwcGVuZFRvRXJyb3J9YCxcbiAgICApO1xuICB9XG4gIHJldHVybiBlcnI7XG59XG5cbi8qKiBVc2UgdGhpcyB0byBzdHViIG91dCBtZXRob2RzIHRoYXQgd2lsbCB0aHJvdyB3aGVuIGludm9rZWQuICovXG5leHBvcnQgZnVuY3Rpb24gdW5pbXBsZW1lbnRlZChtc2c/OiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtc2cgfHwgXCJ1bmltcGxlbWVudGVkXCIpO1xufVxuXG4vKiogVXNlIHRoaXMgdG8gYXNzZXJ0IHVucmVhY2hhYmxlIGNvZGUuICovXG5leHBvcnQgZnVuY3Rpb24gdW5yZWFjaGFibGUoKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IoXCJ1bnJlYWNoYWJsZVwiKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFFMUU7Ozs7Ozs7O0dBUUcsQ0FFSCxTQUFTLEdBQUcsRUFBRSxVQUFVLFFBQVEsa0JBQWtCLENBQUM7QUFDbkQsU0FBUyxZQUFZLEVBQUUsSUFBSSxFQUFFLE9BQU8sUUFBUSxZQUFZLENBQUM7QUFDekQsU0FBUyxNQUFNLFFBQVEsY0FBYyxDQUFDO0FBRXRDLE1BQU0sZUFBZSxHQUFHLGtCQUFrQixBQUFDO0FBRTND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