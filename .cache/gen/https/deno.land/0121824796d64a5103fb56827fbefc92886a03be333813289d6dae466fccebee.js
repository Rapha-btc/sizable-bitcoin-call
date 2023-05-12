export class Tx {
    type;
    sender;
    contractCall;
    transferStx;
    deployContract;
    constructor(type, sender){
        this.type = type;
        this.sender = sender;
    }
    static transferSTX(amount, recipient, sender) {
        let tx = new Tx(1, sender);
        tx.transferStx = {
            recipient,
            amount
        };
        return tx;
    }
    static contractCall(contract, method, args, sender) {
        let tx = new Tx(2, sender);
        tx.contractCall = {
            contract,
            method,
            args
        };
        return tx;
    }
    static deployContract(name, code, sender) {
        let tx = new Tx(3, sender);
        tx.deployContract = {
            name,
            code
        };
        return tx;
    }
}
export class Chain {
    sessionId;
    blockHeight = 1;
    constructor(sessionId){
        this.sessionId = sessionId;
    }
    mineBlock(transactions) {
        let result = JSON.parse(Deno.core.opSync("mine_block", {
            sessionId: this.sessionId,
            transactions: transactions
        }));
        this.blockHeight = result.block_height;
        let block = {
            height: result.block_height,
            receipts: result.receipts
        };
        return block;
    }
    mineEmptyBlock(count) {
        let result = JSON.parse(Deno.core.opSync("mine_empty_blocks", {
            sessionId: this.sessionId,
            count: count
        }));
        this.blockHeight = result.block_height;
        let emptyBlock = {
            session_id: result.session_id,
            block_height: result.block_height
        };
        return emptyBlock;
    }
    mineEmptyBlockUntil(targetBlockHeight) {
        let count = targetBlockHeight - this.blockHeight;
        if (count < 0) {
            throw new Error(`Chain tip cannot be moved from ${this.blockHeight} to ${targetBlockHeight}`);
        }
        return this.mineEmptyBlock(count);
    }
    callReadOnlyFn(contract, method, args, sender) {
        let result = JSON.parse(Deno.core.opSync("call_read_only_fn", {
            sessionId: this.sessionId,
            contract: contract,
            method: method,
            args: args,
            sender: sender
        }));
        let readOnlyFn = {
            session_id: result.session_id,
            result: result.result,
            events: result.events
        };
        return readOnlyFn;
    }
    getAssetsMaps() {
        let result = JSON.parse(Deno.core.opSync("get_assets_maps", {
            sessionId: this.sessionId
        }));
        let assetsMaps = {
            session_id: result.session_id,
            assets: result.assets
        };
        return assetsMaps;
    }
}
export class Clarinet {
    static test(options) {
        Deno.test({
            name: options.name,
            async fn () {
                Deno.core.ops();
                var transactions = [];
                if (options.preSetup) {
                    transactions = options.preSetup();
                }
                let result = JSON.parse(Deno.core.opSync("setup_chain", {
                    name: options.name,
                    transactions: transactions
                }));
                let chain = new Chain(result["session_id"]);
                let accounts = new Map();
                for (let account of result["accounts"]){
                    accounts.set(account.name, account);
                }
                let contracts = new Map();
                for (let contract of result["contracts"]){
                    contracts.set(contract.contract_id, contract);
                }
                await options.fn(chain, accounts, contracts);
            }
        });
    }
    static run(options) {
        Deno.test({
            name: "running script",
            async fn () {
                Deno.core.ops();
                let result = JSON.parse(Deno.core.opSync("setup_chain", {
                    name: "running script",
                    transactions: []
                }));
                let accounts = new Map();
                for (let account of result["accounts"]){
                    accounts.set(account.name, account);
                }
                let contracts = new Map();
                for (let contract of result["contracts"]){
                    contracts.set(contract.contract_id, contract);
                }
                let stacks_node = {
                    url: result["stacks_node_url"]
                };
                await options.fn(accounts, contracts, stacks_node);
            }
        });
    }
}
export var types;
(function(types) {
    const byteToHex = [];
    for(let n = 0; n <= 0xff; ++n){
        const hexOctet = n.toString(16).padStart(2, "0");
        byteToHex.push(hexOctet);
    }
    function serializeTuple(input) {
        let items = [];
        for (var [key, value] of Object.entries(input)){
            if (typeof value === "object") {
                items.push(`${key}: { ${serializeTuple(value)} }`);
            } else if (Array.isArray(value)) {
            // todo(ludo): not supported, should panic
            } else {
                items.push(`${key}: ${value}`);
            }
        }
        return items.join(", ");
    }
    function isObject(obj) {
        return typeof obj === "object" && !Array.isArray(obj);
    }
    function ok(val) {
        return `(ok ${val})`;
    }
    types.ok = ok;
    function err(val) {
        return `(err ${val})`;
    }
    types.err = err;
    function some(val) {
        return `(some ${val})`;
    }
    types.some = some;
    function none() {
        return `none`;
    }
    types.none = none;
    function bool(val) {
        return `${val}`;
    }
    types.bool = bool;
    function int(val) {
        return `${val}`;
    }
    types.int = int;
    function uint(val) {
        return `u${val}`;
    }
    types.uint = uint;
    function ascii(val) {
        return `"${val}"`;
    }
    types.ascii = ascii;
    function utf8(val) {
        return `u"${val}"`;
    }
    types.utf8 = utf8;
    function buff(val) {
        const buff = new Uint8Array(val);
        const hexOctets = new Array(buff.length);
        for(let i = 0; i < buff.length; ++i){
            hexOctets[i] = byteToHex[buff[i]];
        }
        return `0x${hexOctets.join("")}`;
    }
    types.buff = buff;
    function list(val) {
        return `(list ${val.join(" ")})`;
    }
    types.list = list;
    function principal(val) {
        return `'${val}`;
    }
    types.principal = principal;
    function tuple(val) {
        return `{ ${serializeTuple(val)} }`;
    }
    types.tuple = tuple;
})(types || (types = {}));
function consume(src, expectation, wrapped) {
    let dst = (" " + src).slice(1);
    let size = expectation.length;
    if (!wrapped && src !== expectation) {
        throw new Error(`Expected ${green(expectation.toString())}, got ${red(src.toString())}`);
    }
    if (wrapped) {
        size += 2;
    }
    if (dst.length < size) {
        throw new Error(`Expected ${green(expectation.toString())}, got ${red(src.toString())}`);
    }
    if (wrapped) {
        dst = dst.substring(1, dst.length - 1);
    }
    let res = dst.slice(0, expectation.length);
    if (res !== expectation) {
        throw new Error(`Expected ${green(expectation.toString())}, got ${red(src.toString())}`);
    }
    let leftPad = 0;
    if (dst.charAt(expectation.length) === " ") {
        leftPad = 1;
    }
    let remainder = dst.substring(expectation.length + leftPad);
    return remainder;
}
String.prototype.expectOk = function() {
    return consume(this, "ok", true);
};
String.prototype.expectErr = function() {
    return consume(this, "err", true);
};
String.prototype.expectSome = function() {
    return consume(this, "some", true);
};
String.prototype.expectNone = function() {
    return consume(this, "none", false);
};
String.prototype.expectBool = function(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectUint = function(value) {
    try {
        consume(this, `u${value}`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectInt = function(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectBuff = function(value) {
    let buffer = types.buff(value);
    if (this !== buffer) {
        throw new Error(`Expected ${green(buffer)}, got ${red(this.toString())}`);
    }
    return value;
};
String.prototype.expectAscii = function(value) {
    try {
        consume(this, `"${value}"`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectUtf8 = function(value) {
    try {
        consume(this, `u"${value}"`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectPrincipal = function(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectList = function() {
    if (this.charAt(0) !== "[" || this.charAt(this.length - 1) !== "]") {
        throw new Error(`Expected ${green("(list ...)")}, got ${red(this.toString())}`);
    }
    let stack = [];
    let elements = [];
    let start = 1;
    for(var i = 0; i < this.length; i++){
        if (this.charAt(i) === "," && stack.length == 1) {
            elements.push(this.substring(start, i));
            start = i + 2;
        }
        if ([
            "(",
            "[",
            "{"
        ].includes(this.charAt(i))) {
            stack.push(this.charAt(i));
        }
        if (this.charAt(i) === ")" && stack[stack.length - 1] === "(") {
            stack.pop();
        }
        if (this.charAt(i) === "}" && stack[stack.length - 1] === "{") {
            stack.pop();
        }
        if (this.charAt(i) === "]" && stack[stack.length - 1] === "[") {
            stack.pop();
        }
    }
    let remainder = this.substring(start, this.length - 1);
    if (remainder.length > 0) {
        elements.push(remainder);
    }
    return elements;
};
String.prototype.expectTuple = function() {
    if (this.charAt(0) !== "{" || this.charAt(this.length - 1) !== "}") {
        throw new Error(`Expected ${green("(tuple ...)")}, got ${red(this.toString())}`);
    }
    let start = 1;
    let stack = [];
    let elements = [];
    for(var i = 0; i < this.length; i++){
        if (this.charAt(i) === "," && stack.length == 1) {
            elements.push(this.substring(start, i));
            start = i + 2;
        }
        if ([
            "(",
            "[",
            "{"
        ].includes(this.charAt(i))) {
            stack.push(this.charAt(i));
        }
        if (this.charAt(i) === ")" && stack[stack.length - 1] === "(") {
            stack.pop();
        }
        if (this.charAt(i) === "}" && stack[stack.length - 1] === "{") {
            stack.pop();
        }
        if (this.charAt(i) === "]" && stack[stack.length - 1] === "[") {
            stack.pop();
        }
    }
    let remainder = this.substring(start, this.length - 1);
    if (remainder.length > 0) {
        elements.push(remainder);
    }
    let tuple = {};
    for (let element of elements){
        for(var i = 0; i < element.length; i++){
            if (element.charAt(i) === ":") {
                let key = element.substring(0, i);
                let value = element.substring(i + 2, element.length);
                tuple[key] = value;
                break;
            }
        }
    }
    return tuple;
};
Array.prototype.expectSTXTransferEvent = function(amount, sender, recipient) {
    for (let event of this){
        try {
            let e = {};
            e["amount"] = event.stx_transfer_event.amount.expectInt(amount);
            e["sender"] = event.stx_transfer_event.sender.expectPrincipal(sender);
            e["recipient"] = event.stx_transfer_event.recipient.expectPrincipal(recipient);
            return e;
        } catch (error) {
            continue;
        }
    }
    throw new Error(`Unable to retrieve expected NonFungibleTokenTransferEvent`);
};
Array.prototype.expectFungibleTokenTransferEvent = function(amount, sender, recipient, assetId) {
    for (let event of this){
        try {
            let e = {};
            e["amount"] = event.ft_transfer_event.amount.expectInt(amount);
            e["sender"] = event.ft_transfer_event.sender.expectPrincipal(sender);
            e["recipient"] = event.ft_transfer_event.recipient.expectPrincipal(recipient);
            if (event.ft_transfer_event.asset_identifier.endsWith(assetId)) {
                e["assetId"] = event.ft_transfer_event.asset_identifier;
            } else {
                continue;
            }
            return e;
        } catch (error) {
            continue;
        }
    }
    throw new Error(`Unable to retrieve expected FungibleTokenTransferEvent(${amount}, ${sender}, ${recipient}, ${assetId})\n${JSON.stringify(this)}`);
};
Array.prototype.expectFungibleTokenMintEvent = function(amount, recipient, assetId) {
    for (let event of this){
        try {
            let e = {};
            e["amount"] = event.ft_mint_event.amount.expectInt(amount);
            e["recipient"] = event.ft_mint_event.recipient.expectPrincipal(recipient);
            if (event.ft_mint_event.asset_identifier.endsWith(assetId)) {
                e["assetId"] = event.ft_mint_event.asset_identifier;
            } else {
                continue;
            }
            return e;
        } catch (error) {
            continue;
        }
    }
    throw new Error(`Unable to retrieve expected FungibleTokenMintEvent`);
};
Array.prototype.expectFungibleTokenBurnEvent = function(amount, sender, assetId) {
    for (let event of this){
        try {
            let e = {};
            e["amount"] = event.ft_burn_event.amount.expectInt(amount);
            e["sender"] = event.ft_burn_event.sender.expectPrincipal(sender);
            if (event.ft_burn_event.asset_identifier.endsWith(assetId)) {
                e["assetId"] = event.ft_burn_event.asset_identifier;
            } else {
                continue;
            }
            return e;
        } catch (error) {
            continue;
        }
    }
    throw new Error(`Unable to retrieve expected FungibleTokenBurnEvent`);
};
// Array.prototype.expectEvent = function(sel: (e: Object) => Object) {
//     for (let event of this) {
//         try {
//             sel(event);
//             return event as Object;
//         } catch (error) {
//             continue;
//         }
//     }
//     throw new Error(`Unable to retrieve expected PrintEvent`);
// }
// Array.prototype.expectNonFungibleTokenTransferEvent = function(token: String, sender: String, recipient: String, assetId: String) {
//     for (let event of this) {
//         try {
//             let e: any = {};
//             e["token"] = event.nft_transfer_event.amount.expectInt(token);
//             e["sender"] = event.nft_transfer_event.sender.expectPrincipal(sender);
//             e["recipient"] = event.nft_transfer_event.recipient.expectPrincipal(recipient);
//             if (event.nft_transfer_event.asset_identifier.endsWith(assetId)) {
//                 e["assetId"] = event.nft_transfer_event.asset_identifier;
//             } else {
//                 continue;
//             }
//             return e;
//         } catch (error) {
//             continue;
//         }
//     }
//     throw new Error(`Unable to retrieve expected NonFungibleTokenTransferEvent`);
// }
// Array.prototype.expectNonFungibleTokenMintEvent = function(token: String, recipient: String, assetId: String) {
//     for (let event of this) {
//         try {
//             let e: any = {};
//             e["token"] = event.nft_mint_event.amount.expectInt(token);
//             e["recipient"] = event.nft_mint_event.recipient.expectPrincipal(recipient);
//             if (event.nft_mint_event.asset_identifier.endsWith(assetId)) {
//                 e["assetId"] = event.nft_mint_event.asset_identifier;
//             } else {
//                 continue;
//             }
//             return e;
//         } catch (error) {
//             continue;
//         }
//     }
//     throw new Error(`Unable to retrieve expected NonFungibleTokenTransferEvent`);
// }
// Array.prototype.expectNonFungibleTokenBurnEvent = function(token: String, sender: String, assetId: String) {
//     for (let event of this) {
//         try {
//             let e: any = {};
//             e["token"] = event.nft_burn_event.amount.expectInt(token);
//             e["sender"] = event.nft_burn_event.sender.expectPrincipal(sender);
//             if (event.nft_burn_event.asset_identifier.endsWith(assetId)) {
//                 e["assetId"] = event.nft_burn_event.asset_identifier;
//             } else {
//                 continue;
//             }
//             return e;
//         } catch (error) {
//             continue;
//         }
//     }
//     throw new Error(`Unable to retrieve expected NonFungibleTokenTransferEvent`);
// }
const noColor = globalThis.Deno?.noColor ?? true;
let enabled = !noColor;
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code) {
    return enabled ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}` : str;
}
export function red(str) {
    return run(str, code([
        31
    ], 39));
}
export function green(str) {
    return run(str, code([
        32
    ], 39));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvY2xhcmluZXRAdjAuMTQuMC9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgVHgge1xuICB0eXBlOiBudW1iZXI7XG4gIHNlbmRlcjogc3RyaW5nO1xuICBjb250cmFjdENhbGw/OiBUeENvbnRyYWN0Q2FsbDtcbiAgdHJhbnNmZXJTdHg/OiBUeFRyYW5zZmVyO1xuICBkZXBsb3lDb250cmFjdD86IFR4RGVwbG95Q29udHJhY3Q7XG5cbiAgY29uc3RydWN0b3IodHlwZTogbnVtYmVyLCBzZW5kZXI6IHN0cmluZykge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5zZW5kZXIgPSBzZW5kZXI7XG4gIH1cblxuICBzdGF0aWMgdHJhbnNmZXJTVFgoYW1vdW50OiBudW1iZXIsIHJlY2lwaWVudDogc3RyaW5nLCBzZW5kZXI6IHN0cmluZykge1xuICAgIGxldCB0eCA9IG5ldyBUeCgxLCBzZW5kZXIpO1xuICAgIHR4LnRyYW5zZmVyU3R4ID0ge1xuICAgICAgcmVjaXBpZW50LFxuICAgICAgYW1vdW50LFxuICAgIH07XG4gICAgcmV0dXJuIHR4O1xuICB9XG5cbiAgc3RhdGljIGNvbnRyYWN0Q2FsbChcbiAgICBjb250cmFjdDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZ3M6IEFycmF5PHN0cmluZz4sXG4gICAgc2VuZGVyOiBzdHJpbmcsXG4gICkge1xuICAgIGxldCB0eCA9IG5ldyBUeCgyLCBzZW5kZXIpO1xuICAgIHR4LmNvbnRyYWN0Q2FsbCA9IHtcbiAgICAgIGNvbnRyYWN0LFxuICAgICAgbWV0aG9kLFxuICAgICAgYXJncyxcbiAgICB9O1xuICAgIHJldHVybiB0eDtcbiAgfVxuXG4gIHN0YXRpYyBkZXBsb3lDb250cmFjdChuYW1lOiBzdHJpbmcsIGNvZGU6IHN0cmluZywgc2VuZGVyOiBzdHJpbmcpIHtcbiAgICBsZXQgdHggPSBuZXcgVHgoMywgc2VuZGVyKTtcbiAgICB0eC5kZXBsb3lDb250cmFjdCA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBjb2RlLFxuICAgIH07XG4gICAgcmV0dXJuIHR4O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHhDb250cmFjdENhbGwge1xuICBjb250cmFjdDogc3RyaW5nO1xuICBtZXRob2Q6IHN0cmluZztcbiAgYXJnczogQXJyYXk8c3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUeERlcGxveUNvbnRyYWN0IHtcbiAgY29kZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHhUcmFuc2ZlciB7XG4gIGFtb3VudDogbnVtYmVyO1xuICByZWNpcGllbnQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUeFJlY2VpcHQge1xuICByZXN1bHQ6IHN0cmluZztcbiAgZXZlbnRzOiBBcnJheTxhbnk+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEJsb2NrIHtcbiAgaGVpZ2h0OiBudW1iZXI7XG4gIHJlY2VpcHRzOiBBcnJheTxUeFJlY2VpcHQ+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjY291bnQge1xuICBhZGRyZXNzOiBzdHJpbmc7XG4gIGJhbGFuY2U6IG51bWJlcjtcbiAgbmFtZTogc3RyaW5nO1xuICBtbmVtb25pYzogc3RyaW5nO1xuICBkZXJpdmF0aW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhaW4ge1xuICBzZXNzaW9uSWQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWFkT25seUZuIHtcbiAgc2Vzc2lvbl9pZDogbnVtYmVyO1xuICByZXN1bHQ6IHN0cmluZztcbiAgZXZlbnRzOiBBcnJheTxhbnk+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVtcHR5QmxvY2sge1xuICBzZXNzaW9uX2lkOiBudW1iZXI7XG4gIGJsb2NrX2hlaWdodDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzc2V0c01hcHMge1xuICBzZXNzaW9uX2lkOiBudW1iZXIsXG4gIGFzc2V0czoge1xuICAgIFtuYW1lOiBzdHJpbmddOiB7XG4gICAgICBbb3duZXI6IHN0cmluZ106IG51bWJlclxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2hhaW4ge1xuICBzZXNzaW9uSWQ6IG51bWJlcjtcbiAgYmxvY2tIZWlnaHQ6IG51bWJlciA9IDE7XG5cbiAgY29uc3RydWN0b3Ioc2Vzc2lvbklkOiBudW1iZXIpIHtcbiAgICB0aGlzLnNlc3Npb25JZCA9IHNlc3Npb25JZDtcbiAgfVxuXG4gIG1pbmVCbG9jayh0cmFuc2FjdGlvbnM6IEFycmF5PFR4Pik6IEJsb2NrIHtcbiAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZSgoRGVubyBhcyBhbnkpLmNvcmUub3BTeW5jKFwibWluZV9ibG9ja1wiLCB7XG4gICAgICBzZXNzaW9uSWQ6IHRoaXMuc2Vzc2lvbklkLFxuICAgICAgdHJhbnNhY3Rpb25zOiB0cmFuc2FjdGlvbnMsXG4gICAgfSkpO1xuICAgIHRoaXMuYmxvY2tIZWlnaHQgPSByZXN1bHQuYmxvY2tfaGVpZ2h0O1xuICAgIGxldCBibG9jazogQmxvY2sgPSB7XG4gICAgICBoZWlnaHQ6IHJlc3VsdC5ibG9ja19oZWlnaHQsXG4gICAgICByZWNlaXB0czogcmVzdWx0LnJlY2VpcHRzLFxuICAgIH07XG4gICAgcmV0dXJuIGJsb2NrO1xuICB9XG5cbiAgbWluZUVtcHR5QmxvY2soY291bnQ6IG51bWJlcik6IEVtcHR5QmxvY2sge1xuICAgIGxldCByZXN1bHQgPSBKU09OLnBhcnNlKChEZW5vIGFzIGFueSkuY29yZS5vcFN5bmMoXCJtaW5lX2VtcHR5X2Jsb2Nrc1wiLCB7XG4gICAgICBzZXNzaW9uSWQ6IHRoaXMuc2Vzc2lvbklkLFxuICAgICAgY291bnQ6IGNvdW50LFxuICAgIH0pKTtcbiAgICB0aGlzLmJsb2NrSGVpZ2h0ID0gcmVzdWx0LmJsb2NrX2hlaWdodDtcbiAgICBsZXQgZW1wdHlCbG9jazogRW1wdHlCbG9jayA9IHtcbiAgICAgIHNlc3Npb25faWQ6IHJlc3VsdC5zZXNzaW9uX2lkLFxuICAgICAgYmxvY2tfaGVpZ2h0OiByZXN1bHQuYmxvY2tfaGVpZ2h0XG4gICAgfVxuICAgIHJldHVybiBlbXB0eUJsb2NrO1xuICB9XG5cbiAgbWluZUVtcHR5QmxvY2tVbnRpbCh0YXJnZXRCbG9ja0hlaWdodDogbnVtYmVyKTogRW1wdHlCbG9jayB7XG4gICAgbGV0IGNvdW50ID0gdGFyZ2V0QmxvY2tIZWlnaHQgLSB0aGlzLmJsb2NrSGVpZ2h0O1xuICAgIGlmIChjb3VudCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2hhaW4gdGlwIGNhbm5vdCBiZSBtb3ZlZCBmcm9tICR7dGhpcy5ibG9ja0hlaWdodH0gdG8gJHt0YXJnZXRCbG9ja0hlaWdodH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWluZUVtcHR5QmxvY2soY291bnQpO1xuICB9XG5cbiAgY2FsbFJlYWRPbmx5Rm4oXG4gICAgY29udHJhY3Q6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmdzOiBBcnJheTxhbnk+LFxuICAgIHNlbmRlcjogc3RyaW5nLFxuICApOiBSZWFkT25seUZuIHtcbiAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZSgoRGVubyBhcyBhbnkpLmNvcmUub3BTeW5jKFwiY2FsbF9yZWFkX29ubHlfZm5cIiwge1xuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICAgIGNvbnRyYWN0OiBjb250cmFjdCxcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgYXJnczogYXJncyxcbiAgICAgIHNlbmRlcjogc2VuZGVyLFxuICAgIH0pKTsgIFxuICAgIGxldCByZWFkT25seUZuOiBSZWFkT25seUZuID0ge1xuICAgICAgc2Vzc2lvbl9pZDogcmVzdWx0LnNlc3Npb25faWQsXG4gICAgICByZXN1bHQ6IHJlc3VsdC5yZXN1bHQsXG4gICAgICBldmVudHM6IHJlc3VsdC5ldmVudHNcbiAgICB9XG4gICAgcmV0dXJuIHJlYWRPbmx5Rm47XG4gIH1cblxuICBnZXRBc3NldHNNYXBzKCk6IEFzc2V0c01hcHMge1xuICAgIGxldCByZXN1bHQgPSBKU09OLnBhcnNlKChEZW5vIGFzIGFueSkuY29yZS5vcFN5bmMoXCJnZXRfYXNzZXRzX21hcHNcIiwge1xuICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICB9KSk7XG4gICAgbGV0IGFzc2V0c01hcHM6IEFzc2V0c01hcHMgPSB7XG4gICAgICBzZXNzaW9uX2lkOiByZXN1bHQuc2Vzc2lvbl9pZCxcbiAgICAgIGFzc2V0czogcmVzdWx0LmFzc2V0c1xuICAgIH1cbiAgICByZXR1cm4gYXNzZXRzTWFwcztcbiAgfVxufVxuXG50eXBlIFRlc3RGdW5jdGlvbiA9IChcbiAgY2hhaW46IENoYWluLFxuICBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4sXG4gIGNvbnRyYWN0czogTWFwPHN0cmluZywgQ29udHJhY3Q+LFxuKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbnR5cGUgUHJlU2V0dXBGdW5jdGlvbiA9ICgpID0+IEFycmF5PFR4PjtcblxuaW50ZXJmYWNlIFVuaXRUZXN0T3B0aW9ucyB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJlU2V0dXA/OiBQcmVTZXR1cEZ1bmN0aW9uO1xuICBmbjogVGVzdEZ1bmN0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnRyYWN0IHtcbiAgY29udHJhY3RfaWQ6IHN0cmluZztcbiAgc291cmNlOiBzdHJpbmc7XG4gIGNvbnRyYWN0X2ludGVyZmFjZTogYW55XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RhY2tzTm9kZSB7XG4gIHVybDogc3RyaW5nO1xufVxuXG50eXBlIFNjcmlwdEZ1bmN0aW9uID0gKFxuICBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4sXG4gIGNvbnRyYWN0czogTWFwPHN0cmluZywgQ29udHJhY3Q+LFxuICBub2RlOiBTdGFja3NOb2RlLFxuKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcblxuaW50ZXJmYWNlIFNjcmlwdE9wdGlvbnMge1xuICBmbjogU2NyaXB0RnVuY3Rpb247XG59XG5cbmV4cG9ydCBjbGFzcyBDbGFyaW5ldCB7XG4gIHN0YXRpYyB0ZXN0KG9wdGlvbnM6IFVuaXRUZXN0T3B0aW9ucykge1xuICAgIERlbm8udGVzdCh7XG4gICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICBhc3luYyBmbigpIHtcbiAgICAgICAgKERlbm8gYXMgYW55KS5jb3JlLm9wcygpO1xuXG4gICAgICAgIHZhciB0cmFuc2FjdGlvbnM6IEFycmF5PFR4PiA9IFtdO1xuICAgICAgICBpZiAob3B0aW9ucy5wcmVTZXR1cCkge1xuICAgICAgICAgIHRyYW5zYWN0aW9ucyA9IG9wdGlvbnMucHJlU2V0dXAoKSE7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJlc3VsdCA9IEpTT04ucGFyc2UoKERlbm8gYXMgYW55KS5jb3JlLm9wU3luYyhcInNldHVwX2NoYWluXCIsIHtcbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgdHJhbnNhY3Rpb25zOiB0cmFuc2FjdGlvbnMsXG4gICAgICAgIH0pKTtcbiAgICAgICAgbGV0IGNoYWluID0gbmV3IENoYWluKHJlc3VsdFtcInNlc3Npb25faWRcIl0pO1xuICAgICAgICBsZXQgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+ID0gbmV3IE1hcCgpO1xuICAgICAgICBmb3IgKGxldCBhY2NvdW50IG9mIHJlc3VsdFtcImFjY291bnRzXCJdKSB7XG4gICAgICAgICAgYWNjb3VudHMuc2V0KGFjY291bnQubmFtZSwgYWNjb3VudCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGNvbnRyYWN0czogTWFwPHN0cmluZywgYW55PiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChsZXQgY29udHJhY3Qgb2YgcmVzdWx0W1wiY29udHJhY3RzXCJdKSB7XG4gICAgICAgICAgY29udHJhY3RzLnNldChjb250cmFjdC5jb250cmFjdF9pZCwgY29udHJhY3QpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IG9wdGlvbnMuZm4oY2hhaW4sIGFjY291bnRzLCBjb250cmFjdHMpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHN0YXRpYyBydW4ob3B0aW9uczogU2NyaXB0T3B0aW9ucykge1xuICAgIERlbm8udGVzdCh7XG4gICAgICBuYW1lOiBcInJ1bm5pbmcgc2NyaXB0XCIsXG4gICAgICBhc3luYyBmbigpIHtcbiAgICAgICAgKERlbm8gYXMgYW55KS5jb3JlLm9wcygpO1xuICAgICAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZSgoRGVubyBhcyBhbnkpLmNvcmUub3BTeW5jKFwic2V0dXBfY2hhaW5cIiwge1xuICAgICAgICAgIG5hbWU6IFwicnVubmluZyBzY3JpcHRcIixcbiAgICAgICAgICB0cmFuc2FjdGlvbnM6IFtdLFxuICAgICAgICB9KSk7XG4gICAgICAgIGxldCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgcmVzdWx0W1wiYWNjb3VudHNcIl0pIHtcbiAgICAgICAgICBhY2NvdW50cy5zZXQoYWNjb3VudC5uYW1lLCBhY2NvdW50KTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY29udHJhY3RzOiBNYXA8c3RyaW5nLCBhbnk+ID0gbmV3IE1hcCgpO1xuICAgICAgICBmb3IgKGxldCBjb250cmFjdCBvZiByZXN1bHRbXCJjb250cmFjdHNcIl0pIHtcbiAgICAgICAgICBjb250cmFjdHMuc2V0KGNvbnRyYWN0LmNvbnRyYWN0X2lkLCBjb250cmFjdCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0YWNrc19ub2RlOiBTdGFja3NOb2RlID0ge1xuICAgICAgICAgIHVybDogcmVzdWx0W1wic3RhY2tzX25vZGVfdXJsXCJdXG4gICAgICAgIH07XG4gICAgICAgIGF3YWl0IG9wdGlvbnMuZm4oYWNjb3VudHMsIGNvbnRyYWN0cywgc3RhY2tzX25vZGUpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG59XG5cbmV4cG9ydCBuYW1lc3BhY2UgdHlwZXMge1xuICBjb25zdCBieXRlVG9IZXg6IGFueSA9IFtdO1xuICBmb3IgKGxldCBuID0gMDsgbiA8PSAweGZmOyArK24pIHtcbiAgICBjb25zdCBoZXhPY3RldCA9IG4udG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcbiAgICBieXRlVG9IZXgucHVzaChoZXhPY3RldCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXJpYWxpemVUdXBsZShpbnB1dDogT2JqZWN0KSB7XG4gICAgbGV0IGl0ZW1zOiBBcnJheTxzdHJpbmc+ID0gW107XG4gICAgZm9yICh2YXIgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGlucHV0KSkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBpdGVtcy5wdXNoKGAke2tleX06IHsgJHtzZXJpYWxpemVUdXBsZSh2YWx1ZSl9IH1gKTtcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgLy8gdG9kbyhsdWRvKTogbm90IHN1cHBvcnRlZCwgc2hvdWxkIHBhbmljXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpdGVtcy5wdXNoKGAke2tleX06ICR7dmFsdWV9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpdGVtcy5qb2luKFwiLCBcIik7XG4gIH1cblxuICBmdW5jdGlvbiBpc09iamVjdChvYmo6IGFueSkge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KG9iaik7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gb2sodmFsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYChvayAke3ZhbH0pYDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBlcnIodmFsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYChlcnIgJHt2YWx9KWA7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gc29tZSh2YWw6IHN0cmluZykge1xuICAgIHJldHVybiBgKHNvbWUgJHt2YWx9KWA7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gbm9uZSgpIHtcbiAgICByZXR1cm4gYG5vbmVgO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGJvb2wodmFsOiBib29sZWFuKSB7XG4gICAgcmV0dXJuIGAke3ZhbH1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGludCh2YWw6IG51bWJlcikge1xuICAgIHJldHVybiBgJHt2YWx9YDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB1aW50KHZhbDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGB1JHt2YWx9YDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBhc2NpaSh2YWw6IHN0cmluZykge1xuICAgIHJldHVybiBgXCIke3ZhbH1cImA7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdXRmOCh2YWw6IHN0cmluZykge1xuICAgIHJldHVybiBgdVwiJHt2YWx9XCJgO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGJ1ZmYodmFsOiBBcnJheUJ1ZmZlcikge1xuICAgIGNvbnN0IGJ1ZmYgPSBuZXcgVWludDhBcnJheSh2YWwpO1xuICAgIGNvbnN0IGhleE9jdGV0cyA9IG5ldyBBcnJheShidWZmLmxlbmd0aCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmYubGVuZ3RoOyArK2kpIHtcbiAgICAgIGhleE9jdGV0c1tpXSA9IGJ5dGVUb0hleFtidWZmW2ldXTtcbiAgICB9XG5cbiAgICByZXR1cm4gYDB4JHtoZXhPY3RldHMuam9pbihcIlwiKX1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGxpc3QodmFsOiBBcnJheTxhbnk+KSB7XG4gICAgcmV0dXJuIGAobGlzdCAke3ZhbC5qb2luKFwiIFwiKX0pYDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBwcmluY2lwYWwodmFsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYCcke3ZhbH1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHR1cGxlKHZhbDogT2JqZWN0KSB7XG4gICAgcmV0dXJuIGB7ICR7c2VyaWFsaXplVHVwbGUodmFsKX0gfWA7XG4gIH1cbn1cblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgU3RyaW5nIHtcbiAgICBleHBlY3RPaygpOiBTdHJpbmc7XG4gICAgZXhwZWN0RXJyKCk6IFN0cmluZztcbiAgICBleHBlY3RTb21lKCk6IFN0cmluZztcbiAgICBleHBlY3ROb25lKCk6IHZvaWQ7XG4gICAgZXhwZWN0Qm9vbCh2YWx1ZTogYm9vbGVhbik6IGJvb2xlYW47XG4gICAgZXhwZWN0VWludCh2YWx1ZTogbnVtYmVyKTogbnVtYmVyO1xuICAgIGV4cGVjdEludCh2YWx1ZTogbnVtYmVyKTogbnVtYmVyO1xuICAgIGV4cGVjdEJ1ZmYodmFsdWU6IEFycmF5QnVmZmVyKTogQXJyYXlCdWZmZXI7XG4gICAgZXhwZWN0QXNjaWkodmFsdWU6IFN0cmluZyk6IFN0cmluZztcbiAgICBleHBlY3RVdGY4KHZhbHVlOiBTdHJpbmcpOiBTdHJpbmc7XG4gICAgZXhwZWN0UHJpbmNpcGFsKHZhbHVlOiBTdHJpbmcpOiBTdHJpbmc7XG4gICAgZXhwZWN0TGlzdCgpOiBBcnJheTxTdHJpbmc+O1xuICAgIGV4cGVjdFR1cGxlKCk6IE9iamVjdDtcbiAgfVxuXG4gIGludGVyZmFjZSBBcnJheTxUPiB7XG4gICAgZXhwZWN0U1RYVHJhbnNmZXJFdmVudChcbiAgICAgIGFtb3VudDogTnVtYmVyLFxuICAgICAgc2VuZGVyOiBTdHJpbmcsXG4gICAgICByZWNpcGllbnQ6IFN0cmluZyxcbiAgICApOiBPYmplY3Q7XG4gICAgZXhwZWN0RnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQoXG4gICAgICBhbW91bnQ6IE51bWJlcixcbiAgICAgIHNlbmRlcjogU3RyaW5nLFxuICAgICAgcmVjaXBpZW50OiBTdHJpbmcsXG4gICAgICBhc3NldElkOiBTdHJpbmcsXG4gICAgKTogT2JqZWN0O1xuICAgIGV4cGVjdEZ1bmdpYmxlVG9rZW5NaW50RXZlbnQoXG4gICAgICBhbW91bnQ6IE51bWJlcixcbiAgICAgIHJlY2lwaWVudDogU3RyaW5nLFxuICAgICAgYXNzZXRJZDogU3RyaW5nLFxuICAgICk6IE9iamVjdDtcbiAgICBleHBlY3RGdW5naWJsZVRva2VuQnVybkV2ZW50KFxuICAgICAgYW1vdW50OiBOdW1iZXIsXG4gICAgICBzZW5kZXI6IFN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IFN0cmluZyxcbiAgICApOiBPYmplY3Q7XG4gICAgLy8gQWJzZW5jZSBvZiB0ZXN0IHZlY3RvcnMgYXQgdGhlIG1vbWVudCAtIHRva2VuIGZpZWxkIGNvdWxkIHByZXNlbnQgc29tZSBjaGFsbGVuZ2VzLlxuICAgIC8vIGV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50KHRva2VuOiBTdHJpbmcsIHNlbmRlcjogU3RyaW5nLCByZWNpcGllbnQ6IFN0cmluZywgYXNzZXRJZDogU3RyaW5nKTogT2JqZWN0O1xuICAgIC8vIGV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5NaW50RXZlbnQodG9rZW46IFN0cmluZywgcmVjaXBpZW50OiBTdHJpbmcsIGFzc2V0SWQ6IFN0cmluZyk6IE9iamVjdDtcbiAgICAvLyBleHBlY3ROb25GdW5naWJsZVRva2VuQnVybkV2ZW50KHRva2VuOiBTdHJpbmcsIHNlbmRlcjogU3RyaW5nLCBhc3NldElkOiBTdHJpbmcpOiBPYmplY3Q7XG4gICAgLy8gZXhwZWN0RXZlbnQoc2VsOiAoZTogT2JqZWN0KSA9PiBPYmplY3QpOiBPYmplY3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29uc3VtZShzcmM6IFN0cmluZywgZXhwZWN0YXRpb246IFN0cmluZywgd3JhcHBlZDogYm9vbGVhbikge1xuICBsZXQgZHN0ID0gKFwiIFwiICsgc3JjKS5zbGljZSgxKTtcbiAgbGV0IHNpemUgPSBleHBlY3RhdGlvbi5sZW5ndGg7XG4gIGlmICghd3JhcHBlZCAmJiBzcmMgIT09IGV4cGVjdGF0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oZXhwZWN0YXRpb24udG9TdHJpbmcoKSl9LCBnb3QgJHtyZWQoc3JjLnRvU3RyaW5nKCkpfWAsXG4gICAgKTtcbiAgfVxuICBpZiAod3JhcHBlZCkge1xuICAgIHNpemUgKz0gMjtcbiAgfVxuICBpZiAoZHN0Lmxlbmd0aCA8IHNpemUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRXhwZWN0ZWQgJHtncmVlbihleHBlY3RhdGlvbi50b1N0cmluZygpKX0sIGdvdCAke3JlZChzcmMudG9TdHJpbmcoKSl9YCxcbiAgICApO1xuICB9XG4gIGlmICh3cmFwcGVkKSB7XG4gICAgZHN0ID0gZHN0LnN1YnN0cmluZygxLCBkc3QubGVuZ3RoIC0gMSk7XG4gIH1cbiAgbGV0IHJlcyA9IGRzdC5zbGljZSgwLCBleHBlY3RhdGlvbi5sZW5ndGgpO1xuICBpZiAocmVzICE9PSBleHBlY3RhdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBFeHBlY3RlZCAke2dyZWVuKGV4cGVjdGF0aW9uLnRvU3RyaW5nKCkpfSwgZ290ICR7cmVkKHNyYy50b1N0cmluZygpKX1gLFxuICAgICk7XG4gIH1cbiAgbGV0IGxlZnRQYWQgPSAwO1xuICBpZiAoZHN0LmNoYXJBdChleHBlY3RhdGlvbi5sZW5ndGgpID09PSBcIiBcIikge1xuICAgIGxlZnRQYWQgPSAxO1xuICB9XG4gIGxldCByZW1haW5kZXIgPSBkc3Quc3Vic3RyaW5nKGV4cGVjdGF0aW9uLmxlbmd0aCArIGxlZnRQYWQpO1xuICByZXR1cm4gcmVtYWluZGVyO1xufVxuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdE9rID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gY29uc3VtZSh0aGlzLCBcIm9rXCIsIHRydWUpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RFcnIgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBjb25zdW1lKHRoaXMsIFwiZXJyXCIsIHRydWUpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RTb21lID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gY29uc3VtZSh0aGlzLCBcInNvbWVcIiwgdHJ1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdE5vbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBjb25zdW1lKHRoaXMsIFwibm9uZVwiLCBmYWxzZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEJvb2wgPSBmdW5jdGlvbiAodmFsdWU6IGJvb2xlYW4pIHtcbiAgdHJ5IHtcbiAgICBjb25zdW1lKHRoaXMsIGAke3ZhbHVlfWAsIGZhbHNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdFVpbnQgPSBmdW5jdGlvbiAodmFsdWU6IG51bWJlcikge1xuICB0cnkge1xuICAgIGNvbnN1bWUodGhpcywgYHUke3ZhbHVlfWAsIGZhbHNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEludCA9IGZ1bmN0aW9uICh2YWx1ZTogbnVtYmVyKSB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgJHt2YWx1ZX1gLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RCdWZmID0gZnVuY3Rpb24gKHZhbHVlOiBBcnJheUJ1ZmZlcikge1xuICBsZXQgYnVmZmVyID0gdHlwZXMuYnVmZih2YWx1ZSk7XG4gIGlmICh0aGlzICE9PSBidWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkICR7Z3JlZW4oYnVmZmVyKX0sIGdvdCAke3JlZCh0aGlzLnRvU3RyaW5nKCkpfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0QXNjaWkgPSBmdW5jdGlvbiAodmFsdWU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN1bWUodGhpcywgYFwiJHt2YWx1ZX1cImAsIGZhbHNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdFV0ZjggPSBmdW5jdGlvbiAodmFsdWU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN1bWUodGhpcywgYHVcIiR7dmFsdWV9XCJgLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RQcmluY2lwYWwgPSBmdW5jdGlvbiAodmFsdWU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN1bWUodGhpcywgYCR7dmFsdWV9YCwgZmFsc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuY2hhckF0KDApICE9PSBcIltcIiB8fCB0aGlzLmNoYXJBdCh0aGlzLmxlbmd0aCAtIDEpICE9PSBcIl1cIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBFeHBlY3RlZCAke2dyZWVuKFwiKGxpc3QgLi4uKVwiKX0sIGdvdCAke3JlZCh0aGlzLnRvU3RyaW5nKCkpfWAsXG4gICAgKTtcbiAgfVxuXG4gIGxldCBzdGFjayA9IFtdO1xuICBsZXQgZWxlbWVudHMgPSBbXTtcbiAgbGV0IHN0YXJ0ID0gMTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIixcIiAmJiBzdGFjay5sZW5ndGggPT0gMSkge1xuICAgICAgZWxlbWVudHMucHVzaCh0aGlzLnN1YnN0cmluZyhzdGFydCwgaSkpO1xuICAgICAgc3RhcnQgPSBpICsgMjtcbiAgICB9XG4gICAgaWYgKFtcIihcIiwgXCJbXCIsIFwie1wiXS5pbmNsdWRlcyh0aGlzLmNoYXJBdChpKSkpIHtcbiAgICAgIHN0YWNrLnB1c2godGhpcy5jaGFyQXQoaSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGFyQXQoaSkgPT09IFwiKVwiICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBcIihcIikge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCJ9XCIgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gPT09IFwie1wiKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIl1cIiAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXSA9PT0gXCJbXCIpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxuICBsZXQgcmVtYWluZGVyID0gdGhpcy5zdWJzdHJpbmcoc3RhcnQsIHRoaXMubGVuZ3RoIC0gMSk7XG4gIGlmIChyZW1haW5kZXIubGVuZ3RoID4gMCkge1xuICAgIGVsZW1lbnRzLnB1c2gocmVtYWluZGVyKTtcbiAgfVxuICByZXR1cm4gZWxlbWVudHM7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdFR1cGxlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5jaGFyQXQoMCkgIT09IFwie1wiIHx8IHRoaXMuY2hhckF0KHRoaXMubGVuZ3RoIC0gMSkgIT09IFwifVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oXCIodHVwbGUgLi4uKVwiKX0sIGdvdCAke3JlZCh0aGlzLnRvU3RyaW5nKCkpfWAsXG4gICAgKTtcbiAgfVxuXG4gIGxldCBzdGFydCA9IDE7XG4gIGxldCBzdGFjayA9IFtdO1xuICBsZXQgZWxlbWVudHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIixcIiAmJiBzdGFjay5sZW5ndGggPT0gMSkge1xuICAgICAgZWxlbWVudHMucHVzaCh0aGlzLnN1YnN0cmluZyhzdGFydCwgaSkpO1xuICAgICAgc3RhcnQgPSBpICsgMjtcbiAgICB9XG4gICAgaWYgKFtcIihcIiwgXCJbXCIsIFwie1wiXS5pbmNsdWRlcyh0aGlzLmNoYXJBdChpKSkpIHtcbiAgICAgIHN0YWNrLnB1c2godGhpcy5jaGFyQXQoaSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGFyQXQoaSkgPT09IFwiKVwiICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBcIihcIikge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCJ9XCIgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gPT09IFwie1wiKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIl1cIiAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXSA9PT0gXCJbXCIpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxuICBsZXQgcmVtYWluZGVyID0gdGhpcy5zdWJzdHJpbmcoc3RhcnQsIHRoaXMubGVuZ3RoIC0gMSk7XG4gIGlmIChyZW1haW5kZXIubGVuZ3RoID4gMCkge1xuICAgIGVsZW1lbnRzLnB1c2gocmVtYWluZGVyKTtcbiAgfVxuXG4gIGxldCB0dXBsZTogeyBba2V5OiBzdHJpbmddOiBTdHJpbmcgfSA9IHt9O1xuICBmb3IgKGxldCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZWxlbWVudC5jaGFyQXQoaSkgPT09IFwiOlwiKSB7XG4gICAgICAgIGxldCBrZXk6IHN0cmluZyA9IGVsZW1lbnQuc3Vic3RyaW5nKDAsIGkpO1xuICAgICAgICBsZXQgdmFsdWU6IHN0cmluZyA9IGVsZW1lbnQuc3Vic3RyaW5nKGkgKyAyLCBlbGVtZW50Lmxlbmd0aCk7XG4gICAgICAgIHR1cGxlW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHR1cGxlO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdFNUWFRyYW5zZmVyRXZlbnQgPSBmdW5jdGlvbiAoXG4gIGFtb3VudDogTnVtYmVyLFxuICBzZW5kZXI6IFN0cmluZyxcbiAgcmVjaXBpZW50OiBTdHJpbmcsXG4pIHtcbiAgZm9yIChsZXQgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBsZXQgZTogYW55ID0ge307XG4gICAgICBlW1wiYW1vdW50XCJdID0gZXZlbnQuc3R4X3RyYW5zZmVyX2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KTtcbiAgICAgIGVbXCJzZW5kZXJcIl0gPSBldmVudC5zdHhfdHJhbnNmZXJfZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpO1xuICAgICAgZVtcInJlY2lwaWVudFwiXSA9IGV2ZW50LnN0eF90cmFuc2Zlcl9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKFxuICAgICAgICByZWNpcGllbnQsXG4gICAgICApO1xuICAgICAgcmV0dXJuIGU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBOb25GdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudGApO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdEZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50ID0gZnVuY3Rpb24gKFxuICBhbW91bnQ6IE51bWJlcixcbiAgc2VuZGVyOiBTdHJpbmcsXG4gIHJlY2lwaWVudDogU3RyaW5nLFxuICBhc3NldElkOiBTdHJpbmcsXG4pIHtcbiAgZm9yIChsZXQgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBsZXQgZTogYW55ID0ge307XG4gICAgICBlW1wiYW1vdW50XCJdID0gZXZlbnQuZnRfdHJhbnNmZXJfZXZlbnQuYW1vdW50LmV4cGVjdEludChhbW91bnQpO1xuICAgICAgZVtcInNlbmRlclwiXSA9IGV2ZW50LmZ0X3RyYW5zZmVyX2V2ZW50LnNlbmRlci5leHBlY3RQcmluY2lwYWwoc2VuZGVyKTtcbiAgICAgIGVbXCJyZWNpcGllbnRcIl0gPSBldmVudC5mdF90cmFuc2Zlcl9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKFxuICAgICAgICByZWNpcGllbnQsXG4gICAgICApO1xuICAgICAgaWYgKGV2ZW50LmZ0X3RyYW5zZmVyX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIuZW5kc1dpdGgoYXNzZXRJZCkpIHtcbiAgICAgICAgZVtcImFzc2V0SWRcIl0gPSBldmVudC5mdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICBgVW5hYmxlIHRvIHJldHJpZXZlIGV4cGVjdGVkIEZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50KCR7YW1vdW50fSwgJHtzZW5kZXJ9LCAke3JlY2lwaWVudH0sICR7YXNzZXRJZH0pXFxuJHtcbiAgICAgIEpTT04uc3RyaW5naWZ5KHRoaXMpXG4gICAgfWAsXG4gICk7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0RnVuZ2libGVUb2tlbk1pbnRFdmVudCA9IGZ1bmN0aW9uIChcbiAgYW1vdW50OiBOdW1iZXIsXG4gIHJlY2lwaWVudDogU3RyaW5nLFxuICBhc3NldElkOiBTdHJpbmcsXG4pIHtcbiAgZm9yIChsZXQgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBsZXQgZTogYW55ID0ge307XG4gICAgICBlW1wiYW1vdW50XCJdID0gZXZlbnQuZnRfbWludF9ldmVudC5hbW91bnQuZXhwZWN0SW50KGFtb3VudCk7XG4gICAgICBlW1wicmVjaXBpZW50XCJdID0gZXZlbnQuZnRfbWludF9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKHJlY2lwaWVudCk7XG4gICAgICBpZiAoZXZlbnQuZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyLmVuZHNXaXRoKGFzc2V0SWQpKSB7XG4gICAgICAgIGVbXCJhc3NldElkXCJdID0gZXZlbnQuZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIHJldHJpZXZlIGV4cGVjdGVkIEZ1bmdpYmxlVG9rZW5NaW50RXZlbnRgKTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3RGdW5naWJsZVRva2VuQnVybkV2ZW50ID0gZnVuY3Rpb24gKFxuICBhbW91bnQ6IE51bWJlcixcbiAgc2VuZGVyOiBTdHJpbmcsXG4gIGFzc2V0SWQ6IFN0cmluZyxcbikge1xuICBmb3IgKGxldCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGxldCBlOiBhbnkgPSB7fTtcbiAgICAgIGVbXCJhbW91bnRcIl0gPSBldmVudC5mdF9idXJuX2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KTtcbiAgICAgIGVbXCJzZW5kZXJcIl0gPSBldmVudC5mdF9idXJuX2V2ZW50LnNlbmRlci5leHBlY3RQcmluY2lwYWwoc2VuZGVyKTtcbiAgICAgIGlmIChldmVudC5mdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIuZW5kc1dpdGgoYXNzZXRJZCkpIHtcbiAgICAgICAgZVtcImFzc2V0SWRcIl0gPSBldmVudC5mdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgRnVuZ2libGVUb2tlbkJ1cm5FdmVudGApO1xufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLmV4cGVjdEV2ZW50ID0gZnVuY3Rpb24oc2VsOiAoZTogT2JqZWN0KSA9PiBPYmplY3QpIHtcbi8vICAgICBmb3IgKGxldCBldmVudCBvZiB0aGlzKSB7XG4vLyAgICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgICBzZWwoZXZlbnQpO1xuLy8gICAgICAgICAgICAgcmV0dXJuIGV2ZW50IGFzIE9iamVjdDtcbi8vICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgIGNvbnRpbnVlO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIHJldHJpZXZlIGV4cGVjdGVkIFByaW50RXZlbnRgKTtcbi8vIH1cblxuLy8gQXJyYXkucHJvdG90eXBlLmV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50ID0gZnVuY3Rpb24odG9rZW46IFN0cmluZywgc2VuZGVyOiBTdHJpbmcsIHJlY2lwaWVudDogU3RyaW5nLCBhc3NldElkOiBTdHJpbmcpIHtcbi8vICAgICBmb3IgKGxldCBldmVudCBvZiB0aGlzKSB7XG4vLyAgICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgICBsZXQgZTogYW55ID0ge307XG4vLyAgICAgICAgICAgICBlW1widG9rZW5cIl0gPSBldmVudC5uZnRfdHJhbnNmZXJfZXZlbnQuYW1vdW50LmV4cGVjdEludCh0b2tlbik7XG4vLyAgICAgICAgICAgICBlW1wic2VuZGVyXCJdID0gZXZlbnQubmZ0X3RyYW5zZmVyX2V2ZW50LnNlbmRlci5leHBlY3RQcmluY2lwYWwoc2VuZGVyKTtcbi8vICAgICAgICAgICAgIGVbXCJyZWNpcGllbnRcIl0gPSBldmVudC5uZnRfdHJhbnNmZXJfZXZlbnQucmVjaXBpZW50LmV4cGVjdFByaW5jaXBhbChyZWNpcGllbnQpO1xuLy8gICAgICAgICAgICAgaWYgKGV2ZW50Lm5mdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyLmVuZHNXaXRoKGFzc2V0SWQpKSB7XG4vLyAgICAgICAgICAgICAgICAgZVtcImFzc2V0SWRcIl0gPSBldmVudC5uZnRfdHJhbnNmZXJfZXZlbnQuYXNzZXRfaWRlbnRpZmllcjtcbi8vICAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICAgY29udGludWU7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICByZXR1cm4gZTtcbi8vICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgIGNvbnRpbnVlO1xuLy8gICAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIHJldHJpZXZlIGV4cGVjdGVkIE5vbkZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50YCk7XG4vLyB9XG5cbi8vIEFycmF5LnByb3RvdHlwZS5leHBlY3ROb25GdW5naWJsZVRva2VuTWludEV2ZW50ID0gZnVuY3Rpb24odG9rZW46IFN0cmluZywgcmVjaXBpZW50OiBTdHJpbmcsIGFzc2V0SWQ6IFN0cmluZykge1xuLy8gICAgIGZvciAobGV0IGV2ZW50IG9mIHRoaXMpIHtcbi8vICAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgIGxldCBlOiBhbnkgPSB7fTtcbi8vICAgICAgICAgICAgIGVbXCJ0b2tlblwiXSA9IGV2ZW50Lm5mdF9taW50X2V2ZW50LmFtb3VudC5leHBlY3RJbnQodG9rZW4pO1xuLy8gICAgICAgICAgICAgZVtcInJlY2lwaWVudFwiXSA9IGV2ZW50Lm5mdF9taW50X2V2ZW50LnJlY2lwaWVudC5leHBlY3RQcmluY2lwYWwocmVjaXBpZW50KTtcbi8vICAgICAgICAgICAgIGlmIChldmVudC5uZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyLmVuZHNXaXRoKGFzc2V0SWQpKSB7XG4vLyAgICAgICAgICAgICAgICAgZVtcImFzc2V0SWRcIl0gPSBldmVudC5uZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyO1xuLy8gICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgICAgICBjb250aW51ZTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgIHJldHVybiBlO1xuLy8gICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuLy8gICAgICAgICAgICAgY29udGludWU7XG4vLyAgICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgTm9uRnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnRgKTtcbi8vIH1cblxuLy8gQXJyYXkucHJvdG90eXBlLmV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5CdXJuRXZlbnQgPSBmdW5jdGlvbih0b2tlbjogU3RyaW5nLCBzZW5kZXI6IFN0cmluZywgYXNzZXRJZDogU3RyaW5nKSB7XG4vLyAgICAgZm9yIChsZXQgZXZlbnQgb2YgdGhpcykge1xuLy8gICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICAgbGV0IGU6IGFueSA9IHt9O1xuLy8gICAgICAgICAgICAgZVtcInRva2VuXCJdID0gZXZlbnQubmZ0X2J1cm5fZXZlbnQuYW1vdW50LmV4cGVjdEludCh0b2tlbik7XG4vLyAgICAgICAgICAgICBlW1wic2VuZGVyXCJdID0gZXZlbnQubmZ0X2J1cm5fZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpO1xuLy8gICAgICAgICAgICAgaWYgKGV2ZW50Lm5mdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIuZW5kc1dpdGgoYXNzZXRJZCkpIHtcbi8vICAgICAgICAgICAgICAgICBlW1wiYXNzZXRJZFwiXSA9IGV2ZW50Lm5mdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXI7XG4vLyAgICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgcmV0dXJuIGU7XG4vLyAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4vLyAgICAgICAgICAgICBjb250aW51ZTtcbi8vICAgICAgICAgfVxuLy8gICAgIH1cbi8vICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBOb25GdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudGApO1xuLy8gfVxuXG5jb25zdCBub0NvbG9yID0gZ2xvYmFsVGhpcy5EZW5vPy5ub0NvbG9yID8/IHRydWU7XG5cbmludGVyZmFjZSBDb2RlIHtcbiAgb3Blbjogc3RyaW5nO1xuICBjbG9zZTogc3RyaW5nO1xuICByZWdleHA6IFJlZ0V4cDtcbn1cblxubGV0IGVuYWJsZWQgPSAhbm9Db2xvcjtcblxuZnVuY3Rpb24gY29kZShvcGVuOiBudW1iZXJbXSwgY2xvc2U6IG51bWJlcik6IENvZGUge1xuICByZXR1cm4ge1xuICAgIG9wZW46IGBcXHgxYlske29wZW4uam9pbihcIjtcIil9bWAsXG4gICAgY2xvc2U6IGBcXHgxYlske2Nsb3NlfW1gLFxuICAgIHJlZ2V4cDogbmV3IFJlZ0V4cChgXFxcXHgxYlxcXFxbJHtjbG9zZX1tYCwgXCJnXCIpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBydW4oc3RyOiBzdHJpbmcsIGNvZGU6IENvZGUpOiBzdHJpbmcge1xuICByZXR1cm4gZW5hYmxlZFxuICAgID8gYCR7Y29kZS5vcGVufSR7c3RyLnJlcGxhY2UoY29kZS5yZWdleHAsIGNvZGUub3Blbil9JHtjb2RlLmNsb3NlfWBcbiAgICA6IHN0cjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszMV0sIDM5KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBncmVlbihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszMl0sIDM5KSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxNQUFNLEVBQUU7SUFDYixJQUFJLENBQVM7SUFDYixNQUFNLENBQVM7SUFDZixZQUFZLENBQWtCO0lBQzlCLFdBQVcsQ0FBYztJQUN6QixjQUFjLENBQW9CO0lBRWxDLFlBQVksSUFBWSxFQUFFLE1BQWMsQ0FBRTtRQUN4QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUN0QjtJQUVELE9BQU8sV0FBVyxDQUFDLE1BQWMsRUFBRSxTQUFpQixFQUFFLE1BQWMsRUFBRTtRQUNwRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEFBQUM7UUFDM0IsRUFBRSxDQUFDLFdBQVcsR0FBRztZQUNmLFNBQVM7WUFDVCxNQUFNO1NBQ1AsQ0FBQztRQUNGLE9BQU8sRUFBRSxDQUFDO0tB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QUNsRSxNQUFNLElBQUksS0FBSyxDQUNiLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDL0QsQ0FBQztLQUNIO0lBRUQsSUFBSSxLQUFLLEdBQUcsRUFBRSxBQUFDO0lBQ2YsSUFBSSxRQUFRLEdBQUcsRUFBRSxBQUFDO0lBQ2xCLElBQUksS0FBSyxHQUFHLENBQUMsQUFBQztJQUNkLElBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFFO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2Y7UUFDRCxJQUFJO1lBQUMsR0FBRztZQUFFLEdBQUc7WUFBRSxHQUFHO1NBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzVDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0QsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUM3RCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDYjtRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1lBQzdELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNiO0tBQ0Y7SUFDRCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFDO0lBQ3ZELElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUMxQjtJQUNELE9BQU8sUUFBUSxDQUFDO0NBQ2pCLENBQUM7QUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxXQUFZO0lBQ3pDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtRQUNsRSxNQUFNLElBQUksS0FBSyxDQUNiLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDaEUsQ0FBQztLQUNIO0lBRUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxBQUFDO0lBQ2QsSUFBSSxLQUFLLEdBQUcsRUFBRSxBQUFDO0lBQ2YsSUFBSSxRQUFRLEdBQUcsRUFBRSxBQUFDO0lBQ2xCLElBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFFO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2Y7UUFDRCxJQUFJO1lBQUMsR0FBRztZQUFFLEdBQUc7WUFBRSxHQUFHO1NBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzVDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0QsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUM3RCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDYjtRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1lBQzdELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNiO0tBQ0Y7SUFDRCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxBQUFD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