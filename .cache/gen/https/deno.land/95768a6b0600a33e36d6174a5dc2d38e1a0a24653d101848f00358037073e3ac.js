export * from "./types.ts";
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
        const tx = new Tx(1, sender);
        tx.transferStx = {
            recipient,
            amount
        };
        return tx;
    }
    static contractCall(contract, method, args, sender) {
        const tx = new Tx(2, sender);
        tx.contractCall = {
            contract,
            method,
            args
        };
        return tx;
    }
    static deployContract(name, code, sender) {
        const tx = new Tx(3, sender);
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
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/mine_block", {
            sessionId: this.sessionId,
            transactions: transactions
        }));
        this.blockHeight = result.block_height;
        const block = {
            height: result.block_height,
            receipts: result.receipts
        };
        return block;
    }
    mineEmptyBlock(count) {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/mine_empty_blocks", {
            sessionId: this.sessionId,
            count: count
        }));
        this.blockHeight = result.block_height;
        const emptyBlock = {
            session_id: result.session_id,
            block_height: result.block_height
        };
        return emptyBlock;
    }
    mineEmptyBlockUntil(targetBlockHeight) {
        const count = targetBlockHeight - this.blockHeight;
        if (count < 0) {
            throw new Error(`Chain tip cannot be moved from ${this.blockHeight} to ${targetBlockHeight}`);
        }
        return this.mineEmptyBlock(count);
    }
    callReadOnlyFn(contract, method, args, sender) {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/call_read_only_fn", {
            sessionId: this.sessionId,
            contract: contract,
            method: method,
            args: args,
            sender: sender
        }));
        const readOnlyFn = {
            session_id: result.session_id,
            result: result.result,
            events: result.events
        };
        return readOnlyFn;
    }
    getAssetsMaps() {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/get_assets_maps", {
            sessionId: this.sessionId
        }));
        const assetsMaps = {
            session_id: result.session_id,
            assets: result.assets
        };
        return assetsMaps;
    }
    switchEpoch(epoch) {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/switch_epoch", {
            sessionId: this.sessionId,
            epoch: epoch
        }));
        return result;
    }
}
export class Clarinet {
    static test(options) {
        // @ts-ignore
        Deno.test({
            name: options.name,
            only: options.only,
            ignore: options.ignore,
            async fn () {
                const hasPreDeploymentSteps = options.preDeployment !== undefined;
                let result = JSON.parse(// @ts-ignore
                Deno.core.opSync("api/v1/new_session", {
                    name: options.name,
                    loadDeployment: !hasPreDeploymentSteps,
                    deploymentPath: options.deploymentPath
                }));
                if (options.preDeployment) {
                    const chain = new Chain(result.session_id);
                    const accounts = new Map();
                    for (const account of result.accounts){
                        accounts.set(account.name, account);
                    }
                    await options.preDeployment(chain, accounts);
                    result = JSON.parse(// @ts-ignore
                    Deno.core.opSync("api/v1/load_deployment", {
                        sessionId: chain.sessionId,
                        deploymentPath: options.deploymentPath
                    }));
                }
                const chain1 = new Chain(result.session_id);
                const accounts1 = new Map();
                for (const account1 of result.accounts){
                    accounts1.set(account1.name, account1);
                }
                const contracts = new Map();
                for (const contract of result.contracts){
                    contracts.set(contract.contract_id, contract);
                }
                await options.fn(chain1, accounts1, contracts);
                JSON.parse(// @ts-ignore
                Deno.core.opSync("api/v1/terminate_session", {
                    sessionId: chain1.sessionId
                }));
            }
        });
    }
    static run(options) {
        // @ts-ignore
        Deno.test({
            name: "running script",
            async fn () {
                const result = JSON.parse(// @ts-ignore
                Deno.core.opSync("api/v1/new_session", {
                    name: "running script",
                    loadDeployment: true,
                    deploymentPath: undefined
                }));
                const accounts = new Map();
                for (const account of result.accounts){
                    accounts.set(account.name, account);
                }
                const contracts = new Map();
                for (const contract of result.contracts){
                    contracts.set(contract.contract_id, contract);
                }
                const stacks_node = {
                    url: result.stacks_node_url
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
        const items = [];
        for (const [key, value] of Object.entries(input)){
            if (Array.isArray(value)) {
                throw new Error("Tuple value can't be an array");
            } else if (!!value && typeof value === "object") {
                items.push(`${key}: { ${serializeTuple(value)} }`);
            } else {
                items.push(`${key}: ${value}`);
            }
        }
        return items.join(", ");
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
        return JSON.stringify(val);
    }
    types.ascii = ascii;
    function utf8(val) {
        return `u${JSON.stringify(val)}`;
    }
    types.utf8 = utf8;
    function buff(val) {
        const buff = typeof val == "string" ? new TextEncoder().encode(val) : new Uint8Array(val);
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
// deno-lint-ignore ban-types
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
    const res = dst.slice(0, expectation.length);
    if (res !== expectation) {
        throw new Error(`Expected ${green(expectation.toString())}, got ${red(src.toString())}`);
    }
    let leftPad = 0;
    if (dst.charAt(expectation.length) === " ") {
        leftPad = 1;
    }
    const remainder = dst.substring(expectation.length + leftPad);
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
    return BigInt(value);
};
String.prototype.expectInt = function(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return BigInt(value);
};
String.prototype.expectBuff = function(value) {
    const buffer = types.buff(value);
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
    const stack = [];
    const elements = [];
    let start = 1;
    for(let i = 0; i < this.length; i++){
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
    const remainder = this.substring(start, this.length - 1);
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
    const stack = [];
    const elements = [];
    for(let i = 0; i < this.length; i++){
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
    const remainder = this.substring(start, this.length - 1);
    if (remainder.length > 0) {
        elements.push(remainder);
    }
    const tuple = {};
    for (const element of elements){
        for(let i1 = 0; i1 < element.length; i1++){
            if (element.charAt(i1) === ":") {
                const key = element.substring(0, i1).trim();
                const value = element.substring(i1 + 2).trim();
                tuple[key] = value;
                break;
            }
        }
    }
    return tuple;
};
Array.prototype.expectSTXTransferEvent = function(amount, sender, recipient) {
    for (const event of this){
        try {
            const { stx_transfer_event  } = event;
            return {
                amount: stx_transfer_event.amount.expectInt(amount),
                sender: stx_transfer_event.sender.expectPrincipal(sender),
                recipient: stx_transfer_event.recipient.expectPrincipal(recipient)
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected STXTransferEvent");
};
Array.prototype.expectSTXBurnEvent = function(amount, sender) {
    for (const event of this){
        try {
            const { stx_burn_event  } = event;
            return {
                amount: stx_burn_event.amount.expectInt(amount),
                sender: stx_burn_event.sender.expectPrincipal(sender)
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected STXBurnEvent");
};
Array.prototype.expectFungibleTokenTransferEvent = function(amount, sender, recipient, assetId) {
    for (const event of this){
        try {
            const { ft_transfer_event  } = event;
            if (!ft_transfer_event.asset_identifier.endsWith(assetId)) continue;
            return {
                amount: ft_transfer_event.amount.expectInt(amount),
                sender: ft_transfer_event.sender.expectPrincipal(sender),
                recipient: ft_transfer_event.recipient.expectPrincipal(recipient),
                assetId: ft_transfer_event.asset_identifier
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error(`Unable to retrieve expected FungibleTokenTransferEvent(${amount}, ${sender}, ${recipient}, ${assetId})\n${JSON.stringify(this)}`);
};
Array.prototype.expectFungibleTokenMintEvent = function(amount, recipient, assetId) {
    for (const event of this){
        try {
            const { ft_mint_event  } = event;
            if (!ft_mint_event.asset_identifier.endsWith(assetId)) continue;
            return {
                amount: ft_mint_event.amount.expectInt(amount),
                recipient: ft_mint_event.recipient.expectPrincipal(recipient),
                assetId: ft_mint_event.asset_identifier
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected FungibleTokenMintEvent");
};
Array.prototype.expectFungibleTokenBurnEvent = function(amount, sender, assetId) {
    for (const event of this){
        try {
            const { ft_burn_event  } = event;
            if (!ft_burn_event.asset_identifier.endsWith(assetId)) continue;
            return {
                amount: ft_burn_event.amount.expectInt(amount),
                sender: ft_burn_event.sender.expectPrincipal(sender),
                assetId: ft_burn_event.asset_identifier
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected FungibleTokenBurnEvent");
};
Array.prototype.expectPrintEvent = function(contractIdentifier, value) {
    for (const event of this){
        try {
            const { contract_event  } = event;
            if (!contract_event) continue;
            if (!contract_event.topic.endsWith("print")) continue;
            if (!contract_event.value.endsWith(value)) continue;
            return {
                contract_identifier: contract_event.contract_identifier.expectPrincipal(contractIdentifier),
                topic: contract_event.topic,
                value: contract_event.value
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected PrintEvent");
};
Array.prototype.expectNonFungibleTokenTransferEvent = function(tokenId, sender, recipient, assetAddress, assetId) {
    for (const event of this){
        try {
            const { nft_transfer_event  } = event;
            if (nft_transfer_event.value !== tokenId) continue;
            if (nft_transfer_event.asset_identifier !== `${assetAddress}::${assetId}`) continue;
            return {
                tokenId: nft_transfer_event.value,
                sender: nft_transfer_event.sender.expectPrincipal(sender),
                recipient: nft_transfer_event.recipient.expectPrincipal(recipient),
                assetId: nft_transfer_event.asset_identifier
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected NonFungibleTokenTransferEvent");
};
Array.prototype.expectNonFungibleTokenMintEvent = function(tokenId, recipient, assetAddress, assetId) {
    for (const event of this){
        try {
            const { nft_mint_event  } = event;
            if (nft_mint_event.value !== tokenId) continue;
            if (nft_mint_event.asset_identifier !== `${assetAddress}::${assetId}`) continue;
            return {
                tokenId: nft_mint_event.value,
                recipient: nft_mint_event.recipient.expectPrincipal(recipient),
                assetId: nft_mint_event.asset_identifier
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected NonFungibleTokenMintEvent");
};
Array.prototype.expectNonFungibleTokenBurnEvent = function(tokenId, sender, assetAddress, assetId) {
    for (const event of this){
        try {
            if (event.nft_burn_event.value !== tokenId) continue;
            if (event.nft_burn_event.asset_identifier !== `${assetAddress}::${assetId}`) continue;
            return {
                assetId: event.nft_burn_event.asset_identifier,
                tokenId: event.nft_burn_event.value,
                sender: event.nft_burn_event.sender.expectPrincipal(sender)
            };
        } catch (_error) {
            continue;
        }
    }
    throw new Error("Unable to retrieve expected NonFungibleTokenBurnEvent");
};
const noColor = Deno.noColor ?? true;
const enabled = !noColor;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvY2xhcmluZXRAdjEuNC4yL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGRlbm8tbGludC1pZ25vcmUtZmlsZSBiYW4tdHMtY29tbWVudCBuby1uYW1lc3BhY2VcblxuaW1wb3J0IHtcbiAgRXhwZWN0RnVuZ2libGVUb2tlbkJ1cm5FdmVudCxcbiAgRXhwZWN0RnVuZ2libGVUb2tlbk1pbnRFdmVudCxcbiAgRXhwZWN0RnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQsXG4gIEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5CdXJuRXZlbnQsXG4gIEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5NaW50RXZlbnQsXG4gIEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50LFxuICBFeHBlY3RQcmludEV2ZW50LFxuICBFeHBlY3RTVFhUcmFuc2ZlckV2ZW50LFxuICBFeHBlY3RTVFhCdXJuRXZlbnQsXG59IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5cbmV4cG9ydCAqIGZyb20gXCIuL3R5cGVzLnRzXCI7XG5cbmV4cG9ydCBjbGFzcyBUeCB7XG4gIHR5cGU6IG51bWJlcjtcbiAgc2VuZGVyOiBzdHJpbmc7XG4gIGNvbnRyYWN0Q2FsbD86IFR4Q29udHJhY3RDYWxsO1xuICB0cmFuc2ZlclN0eD86IFR4VHJhbnNmZXI7XG4gIGRlcGxveUNvbnRyYWN0PzogVHhEZXBsb3lDb250cmFjdDtcblxuICBjb25zdHJ1Y3Rvcih0eXBlOiBudW1iZXIsIHNlbmRlcjogc3RyaW5nKSB7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLnNlbmRlciA9IHNlbmRlcjtcbiAgfVxuXG4gIHN0YXRpYyB0cmFuc2ZlclNUWChhbW91bnQ6IG51bWJlciwgcmVjaXBpZW50OiBzdHJpbmcsIHNlbmRlcjogc3RyaW5nKSB7XG4gICAgY29uc3QgdHggPSBuZXcgVHgoMSwgc2VuZGVyKTtcbiAgICB0eC50cmFuc2ZlclN0eCA9IHtcbiAgICAgIHJlY2lwaWVudCxcbiAgICAgIGFtb3VudCxcbiAgICB9O1xuICAgIHJldHVybiB0eDtcbiAgfVxuXG4gIHN0YXRpYyBjb250cmFjdENhbGwoXG4gICAgY29udHJhY3Q6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmdzOiBBcnJheTxzdHJpbmc+LFxuICAgIHNlbmRlcjogc3RyaW5nXG4gICkge1xuICAgIGNvbnN0IHR4ID0gbmV3IFR4KDIsIHNlbmRlcik7XG4gICAgdHguY29udHJhY3RDYWxsID0ge1xuICAgICAgY29udHJhY3QsXG4gICAgICBtZXRob2QsXG4gICAgICBhcmdzLFxuICAgIH07XG4gICAgcmV0dXJuIHR4O1xuICB9XG5cbiAgc3RhdGljIGRlcGxveUNvbnRyYWN0KG5hbWU6IHN0cmluZywgY29kZTogc3RyaW5nLCBzZW5kZXI6IHN0cmluZykge1xuICAgIGNvbnN0IHR4ID0gbmV3IFR4KDMsIHNlbmRlcik7XG4gICAgdHguZGVwbG95Q29udHJhY3QgPSB7XG4gICAgICBuYW1lLFxuICAgICAgY29kZSxcbiAgICB9O1xuICAgIHJldHVybiB0eDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR4Q29udHJhY3RDYWxsIHtcbiAgY29udHJhY3Q6IHN0cmluZztcbiAgbWV0aG9kOiBzdHJpbmc7XG4gIGFyZ3M6IEFycmF5PHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHhEZXBsb3lDb250cmFjdCB7XG4gIGNvZGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR4VHJhbnNmZXIge1xuICBhbW91bnQ6IG51bWJlcjtcbiAgcmVjaXBpZW50OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHhSZWNlaXB0IHtcbiAgcmVzdWx0OiBzdHJpbmc7XG4gIGV2ZW50czogQXJyYXk8dW5rbm93bj47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmxvY2sge1xuICBoZWlnaHQ6IG51bWJlcjtcbiAgcmVjZWlwdHM6IEFycmF5PFR4UmVjZWlwdD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWNjb3VudCB7XG4gIGFkZHJlc3M6IHN0cmluZztcbiAgYmFsYW5jZTogbnVtYmVyO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhaW4ge1xuICBzZXNzaW9uSWQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWFkT25seUZuIHtcbiAgc2Vzc2lvbl9pZDogbnVtYmVyO1xuICByZXN1bHQ6IHN0cmluZztcbiAgZXZlbnRzOiBBcnJheTx1bmtub3duPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbXB0eUJsb2NrIHtcbiAgc2Vzc2lvbl9pZDogbnVtYmVyO1xuICBibG9ja19oZWlnaHQ6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3NldHNNYXBzIHtcbiAgc2Vzc2lvbl9pZDogbnVtYmVyO1xuICBhc3NldHM6IHtcbiAgICBbbmFtZTogc3RyaW5nXToge1xuICAgICAgW293bmVyOiBzdHJpbmddOiBudW1iZXI7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIENoYWluIHtcbiAgc2Vzc2lvbklkOiBudW1iZXI7XG4gIGJsb2NrSGVpZ2h0ID0gMTtcblxuICBjb25zdHJ1Y3RvcihzZXNzaW9uSWQ6IG51bWJlcikge1xuICAgIHRoaXMuc2Vzc2lvbklkID0gc2Vzc2lvbklkO1xuICB9XG5cbiAgbWluZUJsb2NrKHRyYW5zYWN0aW9uczogQXJyYXk8VHg+KTogQmxvY2sge1xuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL21pbmVfYmxvY2tcIiwge1xuICAgICAgICBzZXNzaW9uSWQ6IHRoaXMuc2Vzc2lvbklkLFxuICAgICAgICB0cmFuc2FjdGlvbnM6IHRyYW5zYWN0aW9ucyxcbiAgICAgIH0pXG4gICAgKTtcbiAgICB0aGlzLmJsb2NrSGVpZ2h0ID0gcmVzdWx0LmJsb2NrX2hlaWdodDtcbiAgICBjb25zdCBibG9jazogQmxvY2sgPSB7XG4gICAgICBoZWlnaHQ6IHJlc3VsdC5ibG9ja19oZWlnaHQsXG4gICAgICByZWNlaXB0czogcmVzdWx0LnJlY2VpcHRzLFxuICAgIH07XG4gICAgcmV0dXJuIGJsb2NrO1xuICB9XG5cbiAgbWluZUVtcHR5QmxvY2soY291bnQ6IG51bWJlcik6IEVtcHR5QmxvY2sge1xuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL21pbmVfZW1wdHlfYmxvY2tzXCIsIHtcbiAgICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICAgICAgY291bnQ6IGNvdW50LFxuICAgICAgfSlcbiAgICApO1xuICAgIHRoaXMuYmxvY2tIZWlnaHQgPSByZXN1bHQuYmxvY2tfaGVpZ2h0O1xuICAgIGNvbnN0IGVtcHR5QmxvY2s6IEVtcHR5QmxvY2sgPSB7XG4gICAgICBzZXNzaW9uX2lkOiByZXN1bHQuc2Vzc2lvbl9pZCxcbiAgICAgIGJsb2NrX2hlaWdodDogcmVzdWx0LmJsb2NrX2hlaWdodCxcbiAgICB9O1xuICAgIHJldHVybiBlbXB0eUJsb2NrO1xuICB9XG5cbiAgbWluZUVtcHR5QmxvY2tVbnRpbCh0YXJnZXRCbG9ja0hlaWdodDogbnVtYmVyKTogRW1wdHlCbG9jayB7XG4gICAgY29uc3QgY291bnQgPSB0YXJnZXRCbG9ja0hlaWdodCAtIHRoaXMuYmxvY2tIZWlnaHQ7XG4gICAgaWYgKGNvdW50IDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQ2hhaW4gdGlwIGNhbm5vdCBiZSBtb3ZlZCBmcm9tICR7dGhpcy5ibG9ja0hlaWdodH0gdG8gJHt0YXJnZXRCbG9ja0hlaWdodH1gXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5taW5lRW1wdHlCbG9jayhjb3VudCk7XG4gIH1cblxuICBjYWxsUmVhZE9ubHlGbihcbiAgICBjb250cmFjdDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZ3M6IEFycmF5PHVua25vd24+LFxuICAgIHNlbmRlcjogc3RyaW5nXG4gICk6IFJlYWRPbmx5Rm4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL2NhbGxfcmVhZF9vbmx5X2ZuXCIsIHtcbiAgICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICAgICAgY29udHJhY3Q6IGNvbnRyYWN0LFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgYXJnczogYXJncyxcbiAgICAgICAgc2VuZGVyOiBzZW5kZXIsXG4gICAgICB9KVxuICAgICk7XG4gICAgY29uc3QgcmVhZE9ubHlGbjogUmVhZE9ubHlGbiA9IHtcbiAgICAgIHNlc3Npb25faWQ6IHJlc3VsdC5zZXNzaW9uX2lkLFxuICAgICAgcmVzdWx0OiByZXN1bHQucmVzdWx0LFxuICAgICAgZXZlbnRzOiByZXN1bHQuZXZlbnRzLFxuICAgIH07XG4gICAgcmV0dXJuIHJlYWRPbmx5Rm47XG4gIH1cblxuICBnZXRBc3NldHNNYXBzKCk6IEFzc2V0c01hcHMge1xuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL2dldF9hc3NldHNfbWFwc1wiLCB7XG4gICAgICAgIHNlc3Npb25JZDogdGhpcy5zZXNzaW9uSWQsXG4gICAgICB9KVxuICAgICk7XG4gICAgY29uc3QgYXNzZXRzTWFwczogQXNzZXRzTWFwcyA9IHtcbiAgICAgIHNlc3Npb25faWQ6IHJlc3VsdC5zZXNzaW9uX2lkLFxuICAgICAgYXNzZXRzOiByZXN1bHQuYXNzZXRzLFxuICAgIH07XG4gICAgcmV0dXJuIGFzc2V0c01hcHM7XG4gIH1cblxuICBzd2l0Y2hFcG9jaChlcG9jaDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcmVzdWx0ID0gSlNPTi5wYXJzZShcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIERlbm8uY29yZS5vcFN5bmMoXCJhcGkvdjEvc3dpdGNoX2Vwb2NoXCIsIHtcbiAgICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICAgICAgZXBvY2g6IGVwb2NoLFxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxudHlwZSBQcmVEZXBsb3ltZW50RnVuY3Rpb24gPSAoXG4gIGNoYWluOiBDaGFpbixcbiAgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+XG4pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG50eXBlIFRlc3RGdW5jdGlvbiA9IChcbiAgY2hhaW46IENoYWluLFxuICBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4sXG4gIGNvbnRyYWN0czogTWFwPHN0cmluZywgQ29udHJhY3Q+XG4pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG5pbnRlcmZhY2UgVW5pdFRlc3RPcHRpb25zIHtcbiAgbmFtZTogc3RyaW5nO1xuICBvbmx5PzogdHJ1ZTtcbiAgaWdub3JlPzogdHJ1ZTtcbiAgZGVwbG95bWVudFBhdGg/OiBzdHJpbmc7XG4gIHByZURlcGxveW1lbnQ/OiBQcmVEZXBsb3ltZW50RnVuY3Rpb247XG4gIGZuOiBUZXN0RnVuY3Rpb247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udHJhY3Qge1xuICBjb250cmFjdF9pZDogc3RyaW5nO1xuICBzb3VyY2U6IHN0cmluZztcbiAgY29udHJhY3RfaW50ZXJmYWNlOiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0YWNrc05vZGUge1xuICB1cmw6IHN0cmluZztcbn1cblxudHlwZSBTY3JpcHRGdW5jdGlvbiA9IChcbiAgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+LFxuICBjb250cmFjdHM6IE1hcDxzdHJpbmcsIENvbnRyYWN0PixcbiAgbm9kZTogU3RhY2tzTm9kZVxuKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcblxuaW50ZXJmYWNlIFNjcmlwdE9wdGlvbnMge1xuICBmbjogU2NyaXB0RnVuY3Rpb247XG59XG5cbmV4cG9ydCBjbGFzcyBDbGFyaW5ldCB7XG4gIHN0YXRpYyB0ZXN0KG9wdGlvbnM6IFVuaXRUZXN0T3B0aW9ucykge1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICBEZW5vLnRlc3Qoe1xuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgb25seTogb3B0aW9ucy5vbmx5LFxuICAgICAgaWdub3JlOiBvcHRpb25zLmlnbm9yZSxcbiAgICAgIGFzeW5jIGZuKCkge1xuICAgICAgICBjb25zdCBoYXNQcmVEZXBsb3ltZW50U3RlcHMgPSBvcHRpb25zLnByZURlcGxveW1lbnQgIT09IHVuZGVmaW5lZDtcblxuICAgICAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZShcbiAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgRGVuby5jb3JlLm9wU3luYyhcImFwaS92MS9uZXdfc2Vzc2lvblwiLCB7XG4gICAgICAgICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgICBsb2FkRGVwbG95bWVudDogIWhhc1ByZURlcGxveW1lbnRTdGVwcyxcbiAgICAgICAgICAgIGRlcGxveW1lbnRQYXRoOiBvcHRpb25zLmRlcGxveW1lbnRQYXRoLFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucHJlRGVwbG95bWVudCkge1xuICAgICAgICAgIGNvbnN0IGNoYWluID0gbmV3IENoYWluKHJlc3VsdC5zZXNzaW9uX2lkKTtcbiAgICAgICAgICBjb25zdCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4gPSBuZXcgTWFwKCk7XG4gICAgICAgICAgZm9yIChjb25zdCBhY2NvdW50IG9mIHJlc3VsdC5hY2NvdW50cykge1xuICAgICAgICAgICAgYWNjb3VudHMuc2V0KGFjY291bnQubmFtZSwgYWNjb3VudCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IG9wdGlvbnMucHJlRGVwbG95bWVudChjaGFpbiwgYWNjb3VudHMpO1xuXG4gICAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgIERlbm8uY29yZS5vcFN5bmMoXCJhcGkvdjEvbG9hZF9kZXBsb3ltZW50XCIsIHtcbiAgICAgICAgICAgICAgc2Vzc2lvbklkOiBjaGFpbi5zZXNzaW9uSWQsXG4gICAgICAgICAgICAgIGRlcGxveW1lbnRQYXRoOiBvcHRpb25zLmRlcGxveW1lbnRQYXRoLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hhaW4gPSBuZXcgQ2hhaW4ocmVzdWx0LnNlc3Npb25faWQpO1xuICAgICAgICBjb25zdCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAoY29uc3QgYWNjb3VudCBvZiByZXN1bHQuYWNjb3VudHMpIHtcbiAgICAgICAgICBhY2NvdW50cy5zZXQoYWNjb3VudC5uYW1lLCBhY2NvdW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250cmFjdHM6IE1hcDxzdHJpbmcsIENvbnRyYWN0PiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChjb25zdCBjb250cmFjdCBvZiByZXN1bHQuY29udHJhY3RzKSB7XG4gICAgICAgICAgY29udHJhY3RzLnNldChjb250cmFjdC5jb250cmFjdF9pZCwgY29udHJhY3QpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IG9wdGlvbnMuZm4oY2hhaW4sIGFjY291bnRzLCBjb250cmFjdHMpO1xuXG4gICAgICAgIEpTT04ucGFyc2UoXG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgIERlbm8uY29yZS5vcFN5bmMoXCJhcGkvdjEvdGVybWluYXRlX3Nlc3Npb25cIiwge1xuICAgICAgICAgICAgc2Vzc2lvbklkOiBjaGFpbi5zZXNzaW9uSWQsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBzdGF0aWMgcnVuKG9wdGlvbnM6IFNjcmlwdE9wdGlvbnMpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgRGVuby50ZXN0KHtcbiAgICAgIG5hbWU6IFwicnVubmluZyBzY3JpcHRcIixcbiAgICAgIGFzeW5jIGZuKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBKU09OLnBhcnNlKFxuICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL25ld19zZXNzaW9uXCIsIHtcbiAgICAgICAgICAgIG5hbWU6IFwicnVubmluZyBzY3JpcHRcIixcbiAgICAgICAgICAgIGxvYWREZXBsb3ltZW50OiB0cnVlLFxuICAgICAgICAgICAgZGVwbG95bWVudFBhdGg6IHVuZGVmaW5lZCxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICBjb25zdCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAoY29uc3QgYWNjb3VudCBvZiByZXN1bHQuYWNjb3VudHMpIHtcbiAgICAgICAgICBhY2NvdW50cy5zZXQoYWNjb3VudC5uYW1lLCBhY2NvdW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250cmFjdHM6IE1hcDxzdHJpbmcsIENvbnRyYWN0PiA9IG5ldyBNYXAoKTtcbiAgICAgICAgZm9yIChjb25zdCBjb250cmFjdCBvZiByZXN1bHQuY29udHJhY3RzKSB7XG4gICAgICAgICAgY29udHJhY3RzLnNldChjb250cmFjdC5jb250cmFjdF9pZCwgY29udHJhY3QpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YWNrc19ub2RlOiBTdGFja3NOb2RlID0ge1xuICAgICAgICAgIHVybDogcmVzdWx0LnN0YWNrc19ub2RlX3VybCxcbiAgICAgICAgfTtcbiAgICAgICAgYXdhaXQgb3B0aW9ucy5mbihhY2NvdW50cywgY29udHJhY3RzLCBzdGFja3Nfbm9kZSk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBuYW1lc3BhY2UgdHlwZXMge1xuICBjb25zdCBieXRlVG9IZXg6IHN0cmluZ1tdID0gW107XG4gIGZvciAobGV0IG4gPSAwOyBuIDw9IDB4ZmY7ICsrbikge1xuICAgIGNvbnN0IGhleE9jdGV0ID0gbi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpO1xuICAgIGJ5dGVUb0hleC5wdXNoKGhleE9jdGV0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZVR1cGxlKGlucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikge1xuICAgIGNvbnN0IGl0ZW1zOiBBcnJheTxzdHJpbmc+ID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoaW5wdXQpKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHVwbGUgdmFsdWUgY2FuJ3QgYmUgYW4gYXJyYXlcIik7XG4gICAgICB9IGVsc2UgaWYgKCEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIGl0ZW1zLnB1c2goXG4gICAgICAgICAgYCR7a2V5fTogeyAke3NlcmlhbGl6ZVR1cGxlKHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KX0gfWBcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW1zLnB1c2goYCR7a2V5fTogJHt2YWx1ZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGl0ZW1zLmpvaW4oXCIsIFwiKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBvayh2YWw6IHN0cmluZykge1xuICAgIHJldHVybiBgKG9rICR7dmFsfSlgO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGVycih2YWw6IHN0cmluZykge1xuICAgIHJldHVybiBgKGVyciAke3ZhbH0pYDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBzb21lKHZhbDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGAoc29tZSAke3ZhbH0pYDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBub25lKCkge1xuICAgIHJldHVybiBgbm9uZWA7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gYm9vbCh2YWw6IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYCR7dmFsfWA7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaW50KHZhbDogbnVtYmVyIHwgYmlnaW50KSB7XG4gICAgcmV0dXJuIGAke3ZhbH1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHVpbnQodmFsOiBudW1iZXIgfCBiaWdpbnQpIHtcbiAgICByZXR1cm4gYHUke3ZhbH1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGFzY2lpKHZhbDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gdXRmOCh2YWw6IHN0cmluZykge1xuICAgIHJldHVybiBgdSR7SlNPTi5zdHJpbmdpZnkodmFsKX1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGJ1ZmYodmFsOiBBcnJheUJ1ZmZlciB8IHN0cmluZykge1xuICAgIGNvbnN0IGJ1ZmYgPVxuICAgICAgdHlwZW9mIHZhbCA9PSBcInN0cmluZ1wiXG4gICAgICAgID8gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHZhbClcbiAgICAgICAgOiBuZXcgVWludDhBcnJheSh2YWwpO1xuXG4gICAgY29uc3QgaGV4T2N0ZXRzID0gbmV3IEFycmF5KGJ1ZmYubGVuZ3RoKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZi5sZW5ndGg7ICsraSkge1xuICAgICAgaGV4T2N0ZXRzW2ldID0gYnl0ZVRvSGV4W2J1ZmZbaV1dO1xuICAgIH1cblxuICAgIHJldHVybiBgMHgke2hleE9jdGV0cy5qb2luKFwiXCIpfWA7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gbGlzdCh2YWw6IEFycmF5PHVua25vd24+KSB7XG4gICAgcmV0dXJuIGAobGlzdCAke3ZhbC5qb2luKFwiIFwiKX0pYDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBwcmluY2lwYWwodmFsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYCcke3ZhbH1gO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHR1cGxlKHZhbDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgICByZXR1cm4gYHsgJHtzZXJpYWxpemVUdXBsZSh2YWwpfSB9YDtcbiAgfVxufVxuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBTdHJpbmcge1xuICAgIGV4cGVjdE9rKCk6IHN0cmluZztcbiAgICBleHBlY3RFcnIoKTogc3RyaW5nO1xuICAgIGV4cGVjdFNvbWUoKTogc3RyaW5nO1xuICAgIGV4cGVjdE5vbmUoKTogdm9pZDtcbiAgICBleHBlY3RCb29sKHZhbHVlOiBib29sZWFuKTogYm9vbGVhbjtcbiAgICBleHBlY3RVaW50KHZhbHVlOiBudW1iZXIgfCBiaWdpbnQpOiBiaWdpbnQ7XG4gICAgZXhwZWN0SW50KHZhbHVlOiBudW1iZXIgfCBiaWdpbnQpOiBiaWdpbnQ7XG4gICAgZXhwZWN0QnVmZih2YWx1ZTogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlcjtcbiAgICBleHBlY3RBc2NpaSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nO1xuICAgIGV4cGVjdFV0ZjgodmFsdWU6IHN0cmluZyk6IHN0cmluZztcbiAgICBleHBlY3RQcmluY2lwYWwodmFsdWU6IHN0cmluZyk6IHN0cmluZztcbiAgICBleHBlY3RMaXN0KCk6IEFycmF5PHN0cmluZz47XG4gICAgZXhwZWN0VHVwbGUoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgfVxuXG4gIGludGVyZmFjZSBBcnJheTxUPiB7XG4gICAgZXhwZWN0U1RYVHJhbnNmZXJFdmVudChcbiAgICAgIGFtb3VudDogbnVtYmVyIHwgYmlnaW50LFxuICAgICAgc2VuZGVyOiBzdHJpbmcsXG4gICAgICByZWNpcGllbnQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdFNUWFRyYW5zZmVyRXZlbnQ7XG4gICAgZXhwZWN0U1RYQnVybkV2ZW50KFxuICAgICAgYW1vdW50OiBudW1iZXIgfCBiaWdpbnQsXG4gICAgICBzZW5kZXI6IFN0cmluZ1xuICAgICk6IEV4cGVjdFNUWEJ1cm5FdmVudDtcbiAgICBleHBlY3RGdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudChcbiAgICAgIGFtb3VudDogbnVtYmVyIHwgYmlnaW50LFxuICAgICAgc2VuZGVyOiBzdHJpbmcsXG4gICAgICByZWNpcGllbnQ6IHN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdEZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50O1xuICAgIGV4cGVjdEZ1bmdpYmxlVG9rZW5NaW50RXZlbnQoXG4gICAgICBhbW91bnQ6IG51bWJlciB8IGJpZ2ludCxcbiAgICAgIHJlY2lwaWVudDogc3RyaW5nLFxuICAgICAgYXNzZXRJZDogc3RyaW5nXG4gICAgKTogRXhwZWN0RnVuZ2libGVUb2tlbk1pbnRFdmVudDtcbiAgICBleHBlY3RGdW5naWJsZVRva2VuQnVybkV2ZW50KFxuICAgICAgYW1vdW50OiBudW1iZXIgfCBiaWdpbnQsXG4gICAgICBzZW5kZXI6IHN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdEZ1bmdpYmxlVG9rZW5CdXJuRXZlbnQ7XG4gICAgZXhwZWN0UHJpbnRFdmVudChcbiAgICAgIGNvbnRyYWN0SWRlbnRpZmllcjogc3RyaW5nLFxuICAgICAgdmFsdWU6IHN0cmluZ1xuICAgICk6IEV4cGVjdFByaW50RXZlbnQ7XG4gICAgZXhwZWN0Tm9uRnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQoXG4gICAgICB0b2tlbklkOiBzdHJpbmcsXG4gICAgICBzZW5kZXI6IHN0cmluZyxcbiAgICAgIHJlY2lwaWVudDogc3RyaW5nLFxuICAgICAgYXNzZXRBZGRyZXNzOiBzdHJpbmcsXG4gICAgICBhc3NldElkOiBzdHJpbmdcbiAgICApOiBFeHBlY3ROb25GdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudDtcbiAgICBleHBlY3ROb25GdW5naWJsZVRva2VuTWludEV2ZW50KFxuICAgICAgdG9rZW5JZDogc3RyaW5nLFxuICAgICAgcmVjaXBpZW50OiBzdHJpbmcsXG4gICAgICBhc3NldEFkZHJlc3M6IHN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5NaW50RXZlbnQ7XG4gICAgZXhwZWN0Tm9uRnVuZ2libGVUb2tlbkJ1cm5FdmVudChcbiAgICAgIHRva2VuSWQ6IHN0cmluZyxcbiAgICAgIHNlbmRlcjogc3RyaW5nLFxuICAgICAgYXNzZXRBZGRyZXNzOiBzdHJpbmcsXG4gICAgICBhc3NldElkOiBzdHJpbmdcbiAgICApOiBFeHBlY3ROb25GdW5naWJsZVRva2VuQnVybkV2ZW50O1xuICB9XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgYmFuLXR5cGVzXG5mdW5jdGlvbiBjb25zdW1lKHNyYzogU3RyaW5nLCBleHBlY3RhdGlvbjogc3RyaW5nLCB3cmFwcGVkOiBib29sZWFuKSB7XG4gIGxldCBkc3QgPSAoXCIgXCIgKyBzcmMpLnNsaWNlKDEpO1xuICBsZXQgc2l6ZSA9IGV4cGVjdGF0aW9uLmxlbmd0aDtcbiAgaWYgKCF3cmFwcGVkICYmIHNyYyAhPT0gZXhwZWN0YXRpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRXhwZWN0ZWQgJHtncmVlbihleHBlY3RhdGlvbi50b1N0cmluZygpKX0sIGdvdCAke3JlZChzcmMudG9TdHJpbmcoKSl9YFxuICAgICk7XG4gIH1cbiAgaWYgKHdyYXBwZWQpIHtcbiAgICBzaXplICs9IDI7XG4gIH1cbiAgaWYgKGRzdC5sZW5ndGggPCBzaXplKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oZXhwZWN0YXRpb24udG9TdHJpbmcoKSl9LCBnb3QgJHtyZWQoc3JjLnRvU3RyaW5nKCkpfWBcbiAgICApO1xuICB9XG4gIGlmICh3cmFwcGVkKSB7XG4gICAgZHN0ID0gZHN0LnN1YnN0cmluZygxLCBkc3QubGVuZ3RoIC0gMSk7XG4gIH1cbiAgY29uc3QgcmVzID0gZHN0LnNsaWNlKDAsIGV4cGVjdGF0aW9uLmxlbmd0aCk7XG4gIGlmIChyZXMgIT09IGV4cGVjdGF0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oZXhwZWN0YXRpb24udG9TdHJpbmcoKSl9LCBnb3QgJHtyZWQoc3JjLnRvU3RyaW5nKCkpfWBcbiAgICApO1xuICB9XG4gIGxldCBsZWZ0UGFkID0gMDtcbiAgaWYgKGRzdC5jaGFyQXQoZXhwZWN0YXRpb24ubGVuZ3RoKSA9PT0gXCIgXCIpIHtcbiAgICBsZWZ0UGFkID0gMTtcbiAgfVxuICBjb25zdCByZW1haW5kZXIgPSBkc3Quc3Vic3RyaW5nKGV4cGVjdGF0aW9uLmxlbmd0aCArIGxlZnRQYWQpO1xuICByZXR1cm4gcmVtYWluZGVyO1xufVxuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdE9rID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gY29uc3VtZSh0aGlzLCBcIm9rXCIsIHRydWUpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RFcnIgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBjb25zdW1lKHRoaXMsIFwiZXJyXCIsIHRydWUpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RTb21lID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gY29uc3VtZSh0aGlzLCBcInNvbWVcIiwgdHJ1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdE5vbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBjb25zdW1lKHRoaXMsIFwibm9uZVwiLCBmYWxzZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEJvb2wgPSBmdW5jdGlvbiAodmFsdWU6IGJvb2xlYW4pIHtcbiAgdHJ5IHtcbiAgICBjb25zdW1lKHRoaXMsIGAke3ZhbHVlfWAsIGZhbHNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdFVpbnQgPSBmdW5jdGlvbiAodmFsdWU6IG51bWJlciB8IGJpZ2ludCk6IGJpZ2ludCB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgdSR7dmFsdWV9YCwgZmFsc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiBCaWdJbnQodmFsdWUpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RJbnQgPSBmdW5jdGlvbiAodmFsdWU6IG51bWJlciB8IGJpZ2ludCk6IGJpZ2ludCB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgJHt2YWx1ZX1gLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIEJpZ0ludCh2YWx1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEJ1ZmYgPSBmdW5jdGlvbiAodmFsdWU6IEFycmF5QnVmZmVyKSB7XG4gIGNvbnN0IGJ1ZmZlciA9IHR5cGVzLmJ1ZmYodmFsdWUpO1xuICBpZiAodGhpcyAhPT0gYnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCAke2dyZWVuKGJ1ZmZlcil9LCBnb3QgJHtyZWQodGhpcy50b1N0cmluZygpKX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEFzY2lpID0gZnVuY3Rpb24gKHZhbHVlOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdW1lKHRoaXMsIGBcIiR7dmFsdWV9XCJgLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RVdGY4ID0gZnVuY3Rpb24gKHZhbHVlOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdW1lKHRoaXMsIGB1XCIke3ZhbHVlfVwiYCwgZmFsc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0UHJpbmNpcGFsID0gZnVuY3Rpb24gKHZhbHVlOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdW1lKHRoaXMsIGAke3ZhbHVlfWAsIGZhbHNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdExpc3QgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmNoYXJBdCgwKSAhPT0gXCJbXCIgfHwgdGhpcy5jaGFyQXQodGhpcy5sZW5ndGggLSAxKSAhPT0gXCJdXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRXhwZWN0ZWQgJHtncmVlbihcIihsaXN0IC4uLilcIil9LCBnb3QgJHtyZWQodGhpcy50b1N0cmluZygpKX1gXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHN0YWNrID0gW107XG4gIGNvbnN0IGVsZW1lbnRzID0gW107XG4gIGxldCBzdGFydCA9IDE7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCIsXCIgJiYgc3RhY2subGVuZ3RoID09IDEpIHtcbiAgICAgIGVsZW1lbnRzLnB1c2godGhpcy5zdWJzdHJpbmcoc3RhcnQsIGkpKTtcbiAgICAgIHN0YXJ0ID0gaSArIDI7XG4gICAgfVxuICAgIGlmIChbXCIoXCIsIFwiW1wiLCBcIntcIl0uaW5jbHVkZXModGhpcy5jaGFyQXQoaSkpKSB7XG4gICAgICBzdGFjay5wdXNoKHRoaXMuY2hhckF0KGkpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIilcIiAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXSA9PT0gXCIoXCIpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGFyQXQoaSkgPT09IFwifVwiICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBcIntcIikge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCJdXCIgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gPT09IFwiW1wiKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgcmVtYWluZGVyID0gdGhpcy5zdWJzdHJpbmcoc3RhcnQsIHRoaXMubGVuZ3RoIC0gMSk7XG4gIGlmIChyZW1haW5kZXIubGVuZ3RoID4gMCkge1xuICAgIGVsZW1lbnRzLnB1c2gocmVtYWluZGVyKTtcbiAgfVxuICByZXR1cm4gZWxlbWVudHM7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdFR1cGxlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5jaGFyQXQoMCkgIT09IFwie1wiIHx8IHRoaXMuY2hhckF0KHRoaXMubGVuZ3RoIC0gMSkgIT09IFwifVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oXCIodHVwbGUgLi4uKVwiKX0sIGdvdCAke3JlZCh0aGlzLnRvU3RyaW5nKCkpfWBcbiAgICApO1xuICB9XG5cbiAgbGV0IHN0YXJ0ID0gMTtcbiAgY29uc3Qgc3RhY2sgPSBbXTtcbiAgY29uc3QgZWxlbWVudHMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIixcIiAmJiBzdGFjay5sZW5ndGggPT0gMSkge1xuICAgICAgZWxlbWVudHMucHVzaCh0aGlzLnN1YnN0cmluZyhzdGFydCwgaSkpO1xuICAgICAgc3RhcnQgPSBpICsgMjtcbiAgICB9XG4gICAgaWYgKFtcIihcIiwgXCJbXCIsIFwie1wiXS5pbmNsdWRlcyh0aGlzLmNoYXJBdChpKSkpIHtcbiAgICAgIHN0YWNrLnB1c2godGhpcy5jaGFyQXQoaSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGFyQXQoaSkgPT09IFwiKVwiICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBcIihcIikge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCJ9XCIgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gPT09IFwie1wiKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIl1cIiAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXSA9PT0gXCJbXCIpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxuICBjb25zdCByZW1haW5kZXIgPSB0aGlzLnN1YnN0cmluZyhzdGFydCwgdGhpcy5sZW5ndGggLSAxKTtcbiAgaWYgKHJlbWFpbmRlci5sZW5ndGggPiAwKSB7XG4gICAgZWxlbWVudHMucHVzaChyZW1haW5kZXIpO1xuICB9XG5cbiAgY29uc3QgdHVwbGU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZWxlbWVudC5jaGFyQXQoaSkgPT09IFwiOlwiKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IGVsZW1lbnQuc3Vic3RyaW5nKDAsIGkpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbGVtZW50LnN1YnN0cmluZyhpICsgMikudHJpbSgpO1xuICAgICAgICB0dXBsZVtrZXldID0gdmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0dXBsZTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3RTVFhUcmFuc2ZlckV2ZW50ID0gZnVuY3Rpb24gKGFtb3VudCwgc2VuZGVyLCByZWNpcGllbnQpIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc3R4X3RyYW5zZmVyX2V2ZW50IH0gPSBldmVudDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFtb3VudDogc3R4X3RyYW5zZmVyX2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KSxcbiAgICAgICAgc2VuZGVyOiBzdHhfdHJhbnNmZXJfZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpLFxuICAgICAgICByZWNpcGllbnQ6IHN0eF90cmFuc2Zlcl9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKHJlY2lwaWVudCksXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBTVFhUcmFuc2ZlckV2ZW50XCIpO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdFNUWEJ1cm5FdmVudCA9IGZ1bmN0aW9uIChhbW91bnQsIHNlbmRlcikge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBzdHhfYnVybl9ldmVudCB9ID0gZXZlbnQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbW91bnQ6IHN0eF9idXJuX2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KSxcbiAgICAgICAgc2VuZGVyOiBzdHhfYnVybl9ldmVudC5zZW5kZXIuZXhwZWN0UHJpbmNpcGFsKHNlbmRlciksXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBTVFhCdXJuRXZlbnRcIik7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0RnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQgPSBmdW5jdGlvbiAoXG4gIGFtb3VudCxcbiAgc2VuZGVyLFxuICByZWNpcGllbnQsXG4gIGFzc2V0SWRcbikge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBmdF90cmFuc2Zlcl9ldmVudCB9ID0gZXZlbnQ7XG4gICAgICBpZiAoIWZ0X3RyYW5zZmVyX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIuZW5kc1dpdGgoYXNzZXRJZCkpIGNvbnRpbnVlO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbW91bnQ6IGZ0X3RyYW5zZmVyX2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KSxcbiAgICAgICAgc2VuZGVyOiBmdF90cmFuc2Zlcl9ldmVudC5zZW5kZXIuZXhwZWN0UHJpbmNpcGFsKHNlbmRlciksXG4gICAgICAgIHJlY2lwaWVudDogZnRfdHJhbnNmZXJfZXZlbnQucmVjaXBpZW50LmV4cGVjdFByaW5jaXBhbChyZWNpcGllbnQpLFxuICAgICAgICBhc3NldElkOiBmdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgYFVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBGdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudCgke2Ftb3VudH0sICR7c2VuZGVyfSwgJHtyZWNpcGllbnR9LCAke2Fzc2V0SWR9KVxcbiR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICB0aGlzXG4gICAgKX1gXG4gICk7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0RnVuZ2libGVUb2tlbk1pbnRFdmVudCA9IGZ1bmN0aW9uIChcbiAgYW1vdW50LFxuICByZWNpcGllbnQsXG4gIGFzc2V0SWRcbikge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBmdF9taW50X2V2ZW50IH0gPSBldmVudDtcbiAgICAgIGlmICghZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyLmVuZHNXaXRoKGFzc2V0SWQpKSBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW1vdW50OiBmdF9taW50X2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KSxcbiAgICAgICAgcmVjaXBpZW50OiBmdF9taW50X2V2ZW50LnJlY2lwaWVudC5leHBlY3RQcmluY2lwYWwocmVjaXBpZW50KSxcbiAgICAgICAgYXNzZXRJZDogZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgRnVuZ2libGVUb2tlbk1pbnRFdmVudFwiKTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3RGdW5naWJsZVRva2VuQnVybkV2ZW50ID0gZnVuY3Rpb24gKFxuICBhbW91bnQsXG4gIHNlbmRlcixcbiAgYXNzZXRJZFxuKSB7XG4gIGZvciAoY29uc3QgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGZ0X2J1cm5fZXZlbnQgfSA9IGV2ZW50O1xuICAgICAgaWYgKCFmdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIuZW5kc1dpdGgoYXNzZXRJZCkpIGNvbnRpbnVlO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbW91bnQ6IGZ0X2J1cm5fZXZlbnQuYW1vdW50LmV4cGVjdEludChhbW91bnQpLFxuICAgICAgICBzZW5kZXI6IGZ0X2J1cm5fZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpLFxuICAgICAgICBhc3NldElkOiBmdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBGdW5naWJsZVRva2VuQnVybkV2ZW50XCIpO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdFByaW50RXZlbnQgPSBmdW5jdGlvbiAoY29udHJhY3RJZGVudGlmaWVyLCB2YWx1ZSkge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBjb250cmFjdF9ldmVudCB9ID0gZXZlbnQ7XG4gICAgICBpZiAoIWNvbnRyYWN0X2V2ZW50KSBjb250aW51ZTtcbiAgICAgIGlmICghY29udHJhY3RfZXZlbnQudG9waWMuZW5kc1dpdGgoXCJwcmludFwiKSkgY29udGludWU7XG4gICAgICBpZiAoIWNvbnRyYWN0X2V2ZW50LnZhbHVlLmVuZHNXaXRoKHZhbHVlKSkgY29udGludWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRyYWN0X2lkZW50aWZpZXI6XG4gICAgICAgICAgY29udHJhY3RfZXZlbnQuY29udHJhY3RfaWRlbnRpZmllci5leHBlY3RQcmluY2lwYWwoXG4gICAgICAgICAgICBjb250cmFjdElkZW50aWZpZXJcbiAgICAgICAgICApLFxuICAgICAgICB0b3BpYzogY29udHJhY3RfZXZlbnQudG9waWMsXG4gICAgICAgIHZhbHVlOiBjb250cmFjdF9ldmVudC52YWx1ZSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIHJldHJpZXZlIGV4cGVjdGVkIFByaW50RXZlbnRcIik7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0Tm9uRnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQgPSBmdW5jdGlvbiAoXG4gIHRva2VuSWQsXG4gIHNlbmRlcixcbiAgcmVjaXBpZW50LFxuICBhc3NldEFkZHJlc3MsXG4gIGFzc2V0SWRcbikge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBuZnRfdHJhbnNmZXJfZXZlbnQgfSA9IGV2ZW50O1xuICAgICAgaWYgKG5mdF90cmFuc2Zlcl9ldmVudC52YWx1ZSAhPT0gdG9rZW5JZCkgY29udGludWU7XG4gICAgICBpZiAobmZ0X3RyYW5zZmVyX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIgIT09IGAke2Fzc2V0QWRkcmVzc306OiR7YXNzZXRJZH1gKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9rZW5JZDogbmZ0X3RyYW5zZmVyX2V2ZW50LnZhbHVlLFxuICAgICAgICBzZW5kZXI6IG5mdF90cmFuc2Zlcl9ldmVudC5zZW5kZXIuZXhwZWN0UHJpbmNpcGFsKHNlbmRlciksXG4gICAgICAgIHJlY2lwaWVudDogbmZ0X3RyYW5zZmVyX2V2ZW50LnJlY2lwaWVudC5leHBlY3RQcmluY2lwYWwocmVjaXBpZW50KSxcbiAgICAgICAgYXNzZXRJZDogbmZ0X3RyYW5zZmVyX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBOb25GdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudFwiKTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3ROb25GdW5naWJsZVRva2VuTWludEV2ZW50ID0gZnVuY3Rpb24gKFxuICB0b2tlbklkLFxuICByZWNpcGllbnQsXG4gIGFzc2V0QWRkcmVzcyxcbiAgYXNzZXRJZFxuKSB7XG4gIGZvciAoY29uc3QgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IG5mdF9taW50X2V2ZW50IH0gPSBldmVudDtcbiAgICAgIGlmIChuZnRfbWludF9ldmVudC52YWx1ZSAhPT0gdG9rZW5JZCkgY29udGludWU7XG4gICAgICBpZiAobmZ0X21pbnRfZXZlbnQuYXNzZXRfaWRlbnRpZmllciAhPT0gYCR7YXNzZXRBZGRyZXNzfTo6JHthc3NldElkfWApXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b2tlbklkOiBuZnRfbWludF9ldmVudC52YWx1ZSxcbiAgICAgICAgcmVjaXBpZW50OiBuZnRfbWludF9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKHJlY2lwaWVudCksXG4gICAgICAgIGFzc2V0SWQ6IG5mdF9taW50X2V2ZW50LmFzc2V0X2lkZW50aWZpZXIsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBOb25GdW5naWJsZVRva2VuTWludEV2ZW50XCIpO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5CdXJuRXZlbnQgPSBmdW5jdGlvbiAoXG4gIHRva2VuSWQsXG4gIHNlbmRlcixcbiAgYXNzZXRBZGRyZXNzLFxuICBhc3NldElkXG4pIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChldmVudC5uZnRfYnVybl9ldmVudC52YWx1ZSAhPT0gdG9rZW5JZCkgY29udGludWU7XG4gICAgICBpZiAoXG4gICAgICAgIGV2ZW50Lm5mdF9idXJuX2V2ZW50LmFzc2V0X2lkZW50aWZpZXIgIT09IGAke2Fzc2V0QWRkcmVzc306OiR7YXNzZXRJZH1gXG4gICAgICApXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBhc3NldElkOiBldmVudC5uZnRfYnVybl9ldmVudC5hc3NldF9pZGVudGlmaWVyLFxuICAgICAgICB0b2tlbklkOiBldmVudC5uZnRfYnVybl9ldmVudC52YWx1ZSxcbiAgICAgICAgc2VuZGVyOiBldmVudC5uZnRfYnVybl9ldmVudC5zZW5kZXIuZXhwZWN0UHJpbmNpcGFsKHNlbmRlciksXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBOb25GdW5naWJsZVRva2VuQnVybkV2ZW50XCIpO1xufTtcblxuY29uc3Qgbm9Db2xvciA9IERlbm8ubm9Db2xvciA/PyB0cnVlO1xuY29uc3QgZW5hYmxlZCA9ICFub0NvbG9yO1xuXG5pbnRlcmZhY2UgQ29kZSB7XG4gIG9wZW46IHN0cmluZztcbiAgY2xvc2U6IHN0cmluZztcbiAgcmVnZXhwOiBSZWdFeHA7XG59XG5cbmZ1bmN0aW9uIGNvZGUob3BlbjogbnVtYmVyW10sIGNsb3NlOiBudW1iZXIpOiBDb2RlIHtcbiAgcmV0dXJuIHtcbiAgICBvcGVuOiBgXFx4MWJbJHtvcGVuLmpvaW4oXCI7XCIpfW1gLFxuICAgIGNsb3NlOiBgXFx4MWJbJHtjbG9zZX1tYCxcbiAgICByZWdleHA6IG5ldyBSZWdFeHAoYFxcXFx4MWJcXFxcWyR7Y2xvc2V9bWAsIFwiZ1wiKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcnVuKHN0cjogc3RyaW5nLCBjb2RlOiBDb2RlKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuYWJsZWRcbiAgICA/IGAke2NvZGUub3Blbn0ke3N0ci5yZXBsYWNlKGNvZGUucmVnZXhwLCBjb2RlLm9wZW4pfSR7Y29kZS5jbG9zZX1gXG4gICAgOiBzdHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWQoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbMzFdLCAzOSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JlZW4oc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbMzJdLCAzOSkpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWNBLGNBQWMsWUFBWSxDQUFDO0FBRTNCLE9BQU8sTUFBTSxFQUFFO0lBQ2IsSUFBSSxDQUFTO0lBQ2IsTUFBTSxDQUFTO0lBQ2YsWUFBWSxDQUFrQjtJQUM5QixXQUFXLENBQWM7SUFDekIsY0FBYyxDQUFvQjtJQUVsQyxZQUFZLElBQVksRUFBRSxNQUFjLENBQUU7UUFDeEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FDdEI7SUFFRCxPQUFPLFdBQVcsQ0FBQyxNQUFjLEVBQUUsU0FBaUIsRUFBRSxNQUFjLEVBQUU7UUFDcEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxBQUFDO1FBQzdCLEVBQUUsQ0FBQyxXQUFXLEdBQUc7WUFDZixTQUFTO1lBQ1QsTUFBTTtTQUNQLENBQUM7UUFDRixPQUFPLEVBQUUsQ0FBQztLQUNYO0lBRUQsT0FBTyxZQUFZLENBQ2pCLFFBQWdCLEVBQ2hCLE1BQWMsRUFDZCxJQUFtQixFQUNuQixNQUFjLEVBQ2Q7UUFDQSxNQUFNLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEFBQUM7UUFDN0IsRUFBRSxDQUFDLFlBQVksR0FBRztZQUNoQixRQUFRO1lBQ1IsTUFBTTtZQUNOLElBQUk7U0FDTCxDQUFDO1FBQ0YsT0FBTyxFQUFFLENBQUM7S0FDWDtJQUVELE9BQU8sY0FBYyxDQUFDLElBQVksRUFBRSxJQUFZLEVBQUUsTUFBYyxFQUFFO1FBQ2hFLE1BQU0sRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQUFBQztRQUM3QixFQUFFLENBQUMsY0FBYyxHQUFHO1lBQ2xCLElBQUk7WUFDSixJQUFJO1NBQ0wsQ0FBQztRQUNGLE9BQU8sRUFBRSxDQUFDO0tBQ1g7Q0FDRjtBQTBERCxPQUFPLE1BQU0sS0FBSztJQUNoQixTQUFTLENBQVM7SUFDbEIsV0FBVyxHQUFHLENBQUMsQ0FBQztJQUVoQixZQUFZLFNBQWlCLENBQUU7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7S0FDNUI7SUFFRCxTQUFTLENBQUMsWUFBdUIsRUFBUztRQUN4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUN2QixhQUFhO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUU7WUFDcEMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFlBQVksRUFBRSxZQUFZO1NBQzNCLENBQUMsQ0FDSCxBQUFDO1FBQ0YsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO1FBQ3ZDLE1BQU0sS0FBSyxHQUFVO1lBQ25CLE1BQU0sRUFBRSxNQUFNLENBQUMsWUFBWTtZQUMzQixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7U0FDMUIsQUFBQztRQUNGLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxjQUFjLENBQUMsS0FBYSxFQUFjO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQ3ZCLGFBQWE7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRTtZQUMzQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQ0gsQUFBQztRQUNGLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztRQUN2QyxNQUFNLFVBQVUsR0FBZTtZQUM3QixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7WUFDN0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZO1NBQ2xDLEFBQUM7UUFDRixPQUFPLFVBQVUsQ0FBQztLQUNuQjtJQUVELG1CQUFtQixDQUFDLGlCQUF5QixFQUFjO1FBQ3pELE1BQU0sS0FBSyxHQUFHLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLEFBQUM7UUFDbkQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FDYixDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FDN0UsQ0FBQztTQUNIO1FBQ0QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ25DO0lBRUQsY0FBYyxDQUNaLFFBQWdCLEVBQ2hCLE1BQWMsRUFDZCxJQUFvQixFQUNwQixNQUFjLEVBQ0Y7UUFDWixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUN2QixhQUFhO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUU7WUFDM0MsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsSUFBSSxFQUFFLElBQUk7WUFDVixNQUFNLEVBQUUsTUFBTTtTQUNmLENBQUMsQ0FDSCxBQUFDO1FBQ0YsTUFBTSxVQUFVLEdBQWU7WUFDN0IsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO1lBQzdCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07U0FDdEIsQUFBQztRQUNGLE9BQU8sVUFBVSxDQUFDO0tBQ25CO0lBRUQsYUFBYSxHQUFlO1FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQ3ZCLGFBQWE7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRTtZQUN6QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQyxDQUNILEFBQUM7UUFDRixNQUFNLFVBQVUsR0FBZTtZQUM3QixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7WUFDN0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1NBQ3RCLEFBQUM7UUFDRixPQUFPLFVBQVUsQ0FBQztLQUNuQjtJQUVELFdBQVcsQ0FBQyxLQUFhLEVBQVc7UUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDdkIsYUFBYTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFO1lBQ3RDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixLQUFLLEVBQUUsS0FBSztTQUNiLENBQUMsQ0FDSCxBQUFDO1FBQ0YsT0FBTyxNQUFNLENBQUM7S0FDZjtDQUNGO0FBMENELE9BQU8sTUFBTSxRQUFRO0lBQ25CLE9BQU8sSUFBSSxDQUFDLE9BQXdCLEVBQUU7UUFDcEMsYUFBYTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDUixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixNQUFNLEVBQUUsSUFBRztnQkFDVCxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxhQUFhLEtBQUssU0FBUyxBQUFDO2dCQUVsRSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUNyQixhQUFhO2dCQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFO29CQUNyQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7b0JBQ2xCLGNBQWMsRUFBRSxDQUFDLHFCQUFxQjtvQkFDdEMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO2lCQUN2QyxDQUFDLENBQ0gsQUFBQztnQkFFRixJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUU7b0JBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQUFBQztvQkFDM0MsTUFBTSxRQUFRLEdBQXlCLElBQUksR0FBRyxFQUFFLEFBQUM7b0JBQ2pELEtBQUssTUFBTSxPQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBRTt3QkFDckMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUNyQztvQkFDRCxNQUFNLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUU3QyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDakIsYUFBYTtvQkFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRTt3QkFDekMsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO3dCQUMxQixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7cUJBQ3ZDLENBQUMsQ0FDSCxDQUFDO2lCQUNIO2dCQUVELE1BQU0sTUFBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQUFBQztnQkFDM0MsTUFBTSxTQUFRLEdBQXlCLElBQUksR0FBRyxFQUFFLEFBQUM7Z0JBQ2pELEtBQUssTUFBTSxRQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBRTtvQkFDckMsU0FBUSxDQUFDLEdBQUcsQ0FBQyxRQUFPLENBQUMsSUFBSSxFQUFFLFFBQU8sQ0FBQyxDQUFDO2lCQUNyQztnQkFDRCxNQUFNLFNBQVMsR0FBMEIsSUFBSSxHQUFHLEVBQUUsQUFBQztnQkFDbkQsS0FBSyxNQUFNLFFBQVEsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFFO29CQUN2QyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7aUJBQy9DO2dCQUNELE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFLLEVBQUUsU0FBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUU3QyxJQUFJLENBQUMsS0FBSyxDQUNSLGFBQWE7Z0JBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUU7b0JBQzNDLFNBQVMsRUFBRSxNQUFLLENBQUMsU0FBUztpQkFDM0IsQ0FBQyxDQUNILENBQUM7YUFDSDtTQUNGLENBQUMsQ0FBQztLQUNKO0lBRUQsT0FBTyxHQUFHLENBQUMsT0FBc0IsRUFBRTtRQUNqQyxhQUFhO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNSLElBQUksRUFBRSxnQkFBZ0I7WUFDdEIsTUFBTSxFQUFFLElBQUc7Z0JBQ1QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDdkIsYUFBYTtnQkFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRTtvQkFDckMsSUFBSSxFQUFFLGdCQUFnQjtvQkFDdEIsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLGNBQWMsRUFBRSxTQUFTO2lCQUMxQixDQUFDLENBQ0gsQUFBQztnQkFDRixNQUFNLFFBQVEsR0FBeUIsSUFBSSxHQUFHLEVBQUUsQUFBQztnQkFDakQsS0FBSyxNQUFNLE9BQU8sSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFFO29CQUNyQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE1BQU0sU0FBUyxHQUEwQixJQUFJLEdBQUcsRUFBRSxBQUFDO2dCQUNuRCxLQUFLLE1BQU0sUUFBUSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUU7b0JBQ3ZDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztpQkFDL0M7Z0JBQ0QsTUFBTSxXQUFXLEdBQWU7b0JBQzlCLEdBQUcsRUFBRSxNQUFNLENBQUMsZUFBZTtpQkFDNUIsQUFBQztnQkFDRixNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQzthQUNwRDtTQUNGLENBQUMsQ0FBQztLQUNKO0NBQ0Y7QUFFRCxPQUFPLElBQVUsS0FBSyxDQXFGckI7O0lBcEZDLE1BQU0sU0FBUyxHQUFhLEVBQUUsQUFBQztJQUMvQixJQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFFO1FBQzlCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQUFBQztRQUNqRCxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQzFCO0lBRUQsU0FBUyxjQUFjLENBQUMsS0FBOEIsRUFBRTtRQUN0RCxNQUFNLEtBQUssR0FBa0IsRUFBRSxBQUFDO1FBQ2hDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFFO1lBQ2hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2FBQ2xELE1BQU0sSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtnQkFDL0MsS0FBSyxDQUFDLElBQUksQ0FDUixDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsS0FBSyxDQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUNsRSxDQUFDO2FBQ0gsTUFBTTtnQkFDTCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQztTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3pCO0lBRU0sU0FBUyxFQUFFLENBQUMsR0FBVyxFQUFFO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3RCO1VBRmUsRUFBRSxHQUFGLEVBQUU7SUFJWCxTQUFTLEdBQUcsQ0FBQyxHQUFXLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkI7VUFGZSxHQUFHLEdBQUgsR0FBRztJQUlaLFNBQVMsSUFBSSxDQUFDLEdBQVcsRUFBRTtRQUNoQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4QjtVQUZlLElBQUksR0FBSixJQUFJO0lBSWIsU0FBUyxJQUFJLEdBQUc7UUFDckIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ2Y7VUFGZSxJQUFJLEdBQUosSUFBSTtJQUliLFNBQVMsSUFBSSxDQUFDLEdBQVksRUFBRTtRQUNqQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO1VBRmUsSUFBSSxHQUFKLElBQUk7SUFJYixTQUFTLEdBQUcsQ0FBQyxHQUFvQixFQUFFO1FBQ3hDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDakI7VUFGZSxHQUFHLEdBQUgsR0FBRztJQUlaLFNBQVMsSUFBSSxDQUFDLEdBQW9CLEVBQUU7UUFDekMsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2xCO1VBRmUsSUFBSSxHQUFKLElBQUk7SUFJYixTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUU7UUFDakMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO1VBRmUsS0FBSyxHQUFMLEtBQUs7SUFJZCxTQUFTLElBQUksQ0FBQyxHQUFXLEVBQUU7UUFDaEMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsQztVQUZlLElBQUksR0FBSixJQUFJO0lBSWIsU0FBUyxJQUFJLENBQUMsR0FBeUIsRUFBRTtRQUM5QyxNQUFNLElBQUksR0FDUixPQUFPLEdBQUcsSUFBSSxRQUFRLEdBQ2xCLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUM3QixJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQUFBQztRQUUxQixNQUFNLFNBQVMsR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEFBQUM7UUFFekMsSUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUU7WUFDcEMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQztRQUVELE9BQU8sQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEM7VUFiZSxJQUFJLEdBQUosSUFBSTtJQWViLFNBQVMsSUFBSSxDQUFDLEdBQW1CLEVBQUU7UUFDeEMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xDO1VBRmUsSUFBSSxHQUFKLElBQUk7SUFJYixTQUFTLFNBQVMsQ0FBQyxHQUFXLEVBQUU7UUFDckMsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2xCO1VBRmUsU0FBUyxHQUFULFNBQVM7SUFJbEIsU0FBUyxLQUFLLENBQUMsR0FBNEIsRUFBRTtRQUNsRCxPQUFPLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNyQztVQUZlLEtBQUssR0FBTCxLQUFLO0dBbEZOLEtBQUssS0FBTCxLQUFLO0FBNEp0Qiw2QkFBNkI7QUFDN0IsU0FBUyxPQUFPLENBQUMsR0FBVyxFQUFFLFdBQW1CLEVBQUUsT0FBZ0IsRUFBRTtJQUNuRSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEFBQUM7SUFDL0IsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLE1BQU0sQUFBQztJQUM5QixJQUFJLENBQUMsT0FBTyxJQUFJLEdBQUcsS0FBSyxXQUFXLEVBQUU7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDYixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ3hFLENBQUM7S0FDSDtJQUNELElBQUksT0FBTyxFQUFFO1FBQ1gsSUFBSSxJQUFJLENBQUMsQ0FBQztLQUNYO0lBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRTtRQUNyQixNQUFNLElBQUksS0FBSyxDQUNiLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDeEUsQ0FBQztLQUNIO0lBQ0QsSUFBSSxPQUFPLEVBQUU7UUFDWCxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztLQUN4QztJQUNELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQUFBQztJQUM3QyxJQUFJLEdBQUcsS0FBSyxXQUFXLEVBQUU7UUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FDYixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ3hFLENBQUM7S0FDSDtJQUNELElBQUksT0FBTyxHQUFHLENBQUMsQUFBQztJQUNoQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRTtRQUMxQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0tBQ2I7SUFDRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEFBQUM7SUFDOUQsT0FBTyxTQUFTLENBQUM7Q0FDbEI7QUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxXQUFZO0lBQ3RDLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Q0FDbEMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLFdBQVk7SUFDdkMsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztDQUNuQyxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsV0FBWTtJQUN4QyxPQUFPLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQ3BDLENBQUM7QUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxXQUFZO0lBQ3hDLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7Q0FDckMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVUsS0FBYyxFQUFFO0lBQ3RELElBQUk7UUFDRixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ2xDLENBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxNQUFNLEtBQUssQ0FBQztLQUNiO0lBQ0QsT0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBVSxLQUFzQixFQUFVO0lBQ3RFLElBQUk7UUFDRixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbkMsQ0FBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE1BQU0sS0FBSyxDQUFDO0tBQ2I7SUFDRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUN0QixDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBVSxLQUFzQixFQUFVO0lBQ3JFLElBQUk7UUFDRixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ2xDLENBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxNQUFNLEtBQUssQ0FBQztLQUNiO0lBQ0QsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVUsS0FBa0IsRUFBRTtJQUMxRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxBQUFDO0lBQ2pDLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRTtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsT0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBVSxLQUFhLEVBQUU7SUFDdEQsSUFBSTtRQUNGLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3BDLENBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxNQUFNLEtBQUssQ0FBQztLQUNiO0lBQ0QsT0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBVSxLQUFhLEVBQUU7SUFDckQsSUFBSTtRQUNGLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3JDLENBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxNQUFNLEtBQUssQ0FBQztLQUNiO0lBQ0QsT0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsU0FBVSxLQUFhLEVBQUU7SUFDMUQsSUFBSTtRQUNGLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbEMsQ0FBQyxPQUFPLEtBQUssRUFBRTtRQUNkLE1BQU0sS0FBSyxDQUFDO0tBQ2I7SUFDRCxPQUFPLEtBQUssQ0FBQztDQUNkLENBQUM7QUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxXQUFZO0lBQ3hDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtRQUNsRSxNQUFNLElBQUksS0FBSyxDQUNiLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDL0QsQ0FBQztLQUNIO0lBRUQsTUFBTSxLQUFLLEdBQUcsRUFBRSxBQUFDO0lBQ2pCLE1BQU0sUUFBUSxHQUFHLEVBQUUsQUFBQztJQUNwQixJQUFJLEtBQUssR0FBRyxDQUFDLEFBQUM7SUFDZCxJQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBRTtRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQy9DLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNmO1FBQ0QsSUFBSTtZQUFDLEdBQUc7WUFBRSxHQUFHO1lBQUUsR0FBRztTQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1QjtRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1lBQzdELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNiO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0QsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUM3RCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDYjtLQUNGO0lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQUFBQztJQUN6RCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDMUI7SUFDRCxPQUFPLFFBQVEsQ0FBQztDQUNqQixDQUFDO0FBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBWTtJQUN6QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7UUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FDYixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ2hFLENBQUM7S0FDSDtJQUVELElBQUksS0FBSyxHQUFHLENBQUMsQUFBQztJQUNkLE1BQU0sS0FBSyxHQUFHLEVBQUUsQUFBQztJQUNqQixNQUFNLFFBQVEsR0FBRyxFQUFFLEFBQUM7SUFDcEIsSUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUU7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUMvQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDZjtRQUNELElBQUk7WUFBQyxHQUFHO1lBQUUsR0FBRztZQUFFLEdBQUc7U0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDNUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUI7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUM3RCxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDYjtRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1lBQzdELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNiO1FBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0QsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1NBQ2I7S0FDRjtJQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMs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