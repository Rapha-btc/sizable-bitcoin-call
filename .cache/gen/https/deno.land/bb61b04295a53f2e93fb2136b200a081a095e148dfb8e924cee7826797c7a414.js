import * as types from "./clarityTypes.ts";
export * from "./eventTypes.ts";
export * as types from "./clarityTypes.ts";
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
        return {
            height: result.block_height,
            receipts: result.receipts
        };
    }
    mineEmptyBlock(count) {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/mine_empty_blocks", {
            sessionId: this.sessionId,
            count
        }));
        this.blockHeight = result.block_height;
        return {
            session_id: result.session_id,
            block_height: result.block_height
        };
    }
    mineEmptyBlockUntil(targetBlockHeight) {
        const count = targetBlockHeight - this.blockHeight;
        if (count < 0) {
            throw new Error(`Chain tip cannot be moved from ${this.blockHeight} to ${targetBlockHeight}`);
        }
        return this.mineEmptyBlock(count);
    }
    /**
   * Call a read-only function
   * @param contract Address of the contract implementing the function
   * @param method The read-only function to call
   * @param args Arguments to pass as clarity values
   * @param sender Address of the caller
   * @returns The result of th
   */ callReadOnlyFn(contract, method, args, sender) {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/call_read_only_fn", {
            sessionId: this.sessionId,
            contract,
            method,
            args,
            sender
        }));
        return {
            session_id: result.session_id,
            result: result.result,
            events: result.events
        };
    }
    getAssetsMaps() {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/get_assets_maps", {
            sessionId: this.sessionId
        }));
        return {
            session_id: result.session_id,
            assets: result.assets
        };
    }
    switchEpoch(epoch) {
        const result = JSON.parse(// @ts-ignore
        Deno.core.opSync("api/v1/switch_epoch", {
            sessionId: this.sessionId,
            epoch
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
String.prototype.expectOk = function expectOk() {
    return consume(this, "ok", true);
};
String.prototype.expectErr = function expectErr() {
    return consume(this, "err", true);
};
String.prototype.expectSome = function expectSome() {
    return consume(this, "some", true);
};
String.prototype.expectNone = function expectNone() {
    return consume(this, "none", false);
};
String.prototype.expectBool = function expectBool(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectUint = function expectUint(value) {
    try {
        consume(this, `u${value}`, false);
    } catch (error) {
        throw error;
    }
    return BigInt(value);
};
String.prototype.expectInt = function expectInt(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return BigInt(value);
};
String.prototype.expectBuff = function expectBuff(value) {
    const buffer = types.buff(new Uint8Array(value));
    if (this !== buffer) {
        throw new Error(`Expected ${green(buffer)}, got ${red(this.toString())}`);
    }
    return value;
};
String.prototype.expectAscii = function expectAscii(value) {
    try {
        consume(this, `"${value}"`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectUtf8 = function expectUtf8(value) {
    try {
        consume(this, `u"${value}"`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectPrincipal = function expectPrincicipal(value) {
    try {
        consume(this, `${value}`, false);
    } catch (error) {
        throw error;
    }
    return value;
};
String.prototype.expectList = function expectList() {
    if (!this.startsWith("[") || !this.endsWith("]")) {
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
String.prototype.expectTuple = function expectTuple() {
    if (!this.startsWith("{") || !this.endsWith("}")) {
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
function red(str) {
    return run(str, code([
        31
    ], 39));
}
function green(str) {
    return run(str, code([
        32
    ], 39));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvY2xhcmluZXRAdjEuNS40L2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGRlbm8tbGludC1pZ25vcmUtZmlsZSBiYW4tdHMtY29tbWVudFxuaW1wb3J0IHtcbiAgRXhwZWN0RnVuZ2libGVUb2tlbkJ1cm5FdmVudCxcbiAgRXhwZWN0RnVuZ2libGVUb2tlbk1pbnRFdmVudCxcbiAgRXhwZWN0RnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQsXG4gIEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5CdXJuRXZlbnQsXG4gIEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5NaW50RXZlbnQsXG4gIEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50LFxuICBFeHBlY3RQcmludEV2ZW50LFxuICBFeHBlY3RTVFhUcmFuc2ZlckV2ZW50LFxuICBFeHBlY3RTVFhCdXJuRXZlbnQsXG59IGZyb20gXCIuL2V2ZW50VHlwZXMudHNcIjtcbmltcG9ydCAqIGFzIHR5cGVzIGZyb20gXCIuL2NsYXJpdHlUeXBlcy50c1wiO1xuXG5leHBvcnQgKiBmcm9tIFwiLi9ldmVudFR5cGVzLnRzXCI7XG5leHBvcnQgKiBhcyB0eXBlcyBmcm9tIFwiLi9jbGFyaXR5VHlwZXMudHNcIjtcblxuZXhwb3J0IGNsYXNzIFR4IHtcbiAgdHlwZTogbnVtYmVyO1xuICBzZW5kZXI6IHN0cmluZztcbiAgY29udHJhY3RDYWxsPzogVHhDb250cmFjdENhbGw7XG4gIHRyYW5zZmVyU3R4PzogVHhUcmFuc2ZlcjtcbiAgZGVwbG95Q29udHJhY3Q/OiBUeERlcGxveUNvbnRyYWN0O1xuXG4gIGNvbnN0cnVjdG9yKHR5cGU6IG51bWJlciwgc2VuZGVyOiBzdHJpbmcpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuc2VuZGVyID0gc2VuZGVyO1xuICB9XG5cbiAgc3RhdGljIHRyYW5zZmVyU1RYKGFtb3VudDogbnVtYmVyLCByZWNpcGllbnQ6IHN0cmluZywgc2VuZGVyOiBzdHJpbmcpIHtcbiAgICBjb25zdCB0eCA9IG5ldyBUeCgxLCBzZW5kZXIpO1xuICAgIHR4LnRyYW5zZmVyU3R4ID0ge1xuICAgICAgcmVjaXBpZW50LFxuICAgICAgYW1vdW50LFxuICAgIH07XG4gICAgcmV0dXJuIHR4O1xuICB9XG5cbiAgc3RhdGljIGNvbnRyYWN0Q2FsbChcbiAgICBjb250cmFjdDogc3RyaW5nLFxuICAgIG1ldGhvZDogc3RyaW5nLFxuICAgIGFyZ3M6IEFycmF5PHN0cmluZz4sXG4gICAgc2VuZGVyOiBzdHJpbmdcbiAgKSB7XG4gICAgY29uc3QgdHggPSBuZXcgVHgoMiwgc2VuZGVyKTtcbiAgICB0eC5jb250cmFjdENhbGwgPSB7XG4gICAgICBjb250cmFjdCxcbiAgICAgIG1ldGhvZCxcbiAgICAgIGFyZ3MsXG4gICAgfTtcbiAgICByZXR1cm4gdHg7XG4gIH1cblxuICBzdGF0aWMgZGVwbG95Q29udHJhY3QobmFtZTogc3RyaW5nLCBjb2RlOiBzdHJpbmcsIHNlbmRlcjogc3RyaW5nKSB7XG4gICAgY29uc3QgdHggPSBuZXcgVHgoMywgc2VuZGVyKTtcbiAgICB0eC5kZXBsb3lDb250cmFjdCA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBjb2RlLFxuICAgIH07XG4gICAgcmV0dXJuIHR4O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHhDb250cmFjdENhbGwge1xuICBjb250cmFjdDogc3RyaW5nO1xuICBtZXRob2Q6IHN0cmluZztcbiAgYXJnczogQXJyYXk8c3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUeERlcGxveUNvbnRyYWN0IHtcbiAgY29kZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHhUcmFuc2ZlciB7XG4gIGFtb3VudDogbnVtYmVyO1xuICByZWNpcGllbnQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUeFJlY2VpcHQge1xuICByZXN1bHQ6IHN0cmluZztcbiAgZXZlbnRzOiBBcnJheTx1bmtub3duPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCbG9jayB7XG4gIGhlaWdodDogbnVtYmVyO1xuICByZWNlaXB0czogQXJyYXk8VHhSZWNlaXB0Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBY2NvdW50IHtcbiAgYWRkcmVzczogc3RyaW5nO1xuICBiYWxhbmNlOiBudW1iZXI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFpbiB7XG4gIHNlc3Npb25JZDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlYWRPbmx5Rm4ge1xuICBzZXNzaW9uX2lkOiBudW1iZXI7XG4gIHJlc3VsdDogc3RyaW5nO1xuICBldmVudHM6IEFycmF5PHVua25vd24+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVtcHR5QmxvY2sge1xuICBzZXNzaW9uX2lkOiBudW1iZXI7XG4gIGJsb2NrX2hlaWdodDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzc2V0c01hcHMge1xuICBzZXNzaW9uX2lkOiBudW1iZXI7XG4gIGFzc2V0czoge1xuICAgIFtuYW1lOiBzdHJpbmddOiB7XG4gICAgICBbb3duZXI6IHN0cmluZ106IG51bWJlcjtcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgQ2hhaW4ge1xuICBzZXNzaW9uSWQ6IG51bWJlcjtcbiAgYmxvY2tIZWlnaHQgPSAxO1xuXG4gIGNvbnN0cnVjdG9yKHNlc3Npb25JZDogbnVtYmVyKSB7XG4gICAgdGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XG4gIH1cblxuICBtaW5lQmxvY2sodHJhbnNhY3Rpb25zOiBBcnJheTxUeD4pOiBCbG9jayB7XG4gICAgY29uc3QgcmVzdWx0ID0gSlNPTi5wYXJzZShcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIERlbm8uY29yZS5vcFN5bmMoXCJhcGkvdjEvbWluZV9ibG9ja1wiLCB7XG4gICAgICAgIHNlc3Npb25JZDogdGhpcy5zZXNzaW9uSWQsXG4gICAgICAgIHRyYW5zYWN0aW9uczogdHJhbnNhY3Rpb25zLFxuICAgICAgfSlcbiAgICApO1xuICAgIHRoaXMuYmxvY2tIZWlnaHQgPSByZXN1bHQuYmxvY2tfaGVpZ2h0O1xuICAgIHJldHVybiB7XG4gICAgICBoZWlnaHQ6IHJlc3VsdC5ibG9ja19oZWlnaHQsXG4gICAgICByZWNlaXB0czogcmVzdWx0LnJlY2VpcHRzLFxuICAgIH07XG4gIH1cblxuICBtaW5lRW1wdHlCbG9jayhjb3VudDogbnVtYmVyKTogRW1wdHlCbG9jayB7XG4gICAgY29uc3QgcmVzdWx0ID0gSlNPTi5wYXJzZShcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIERlbm8uY29yZS5vcFN5bmMoXCJhcGkvdjEvbWluZV9lbXB0eV9ibG9ja3NcIiwge1xuICAgICAgICBzZXNzaW9uSWQ6IHRoaXMuc2Vzc2lvbklkLFxuICAgICAgICBjb3VudCxcbiAgICAgIH0pXG4gICAgKTtcbiAgICB0aGlzLmJsb2NrSGVpZ2h0ID0gcmVzdWx0LmJsb2NrX2hlaWdodDtcbiAgICByZXR1cm4ge1xuICAgICAgc2Vzc2lvbl9pZDogcmVzdWx0LnNlc3Npb25faWQsXG4gICAgICBibG9ja19oZWlnaHQ6IHJlc3VsdC5ibG9ja19oZWlnaHQsXG4gICAgfTtcbiAgfVxuXG4gIG1pbmVFbXB0eUJsb2NrVW50aWwodGFyZ2V0QmxvY2tIZWlnaHQ6IG51bWJlcik6IEVtcHR5QmxvY2sge1xuICAgIGNvbnN0IGNvdW50ID0gdGFyZ2V0QmxvY2tIZWlnaHQgLSB0aGlzLmJsb2NrSGVpZ2h0O1xuICAgIGlmIChjb3VudCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYENoYWluIHRpcCBjYW5ub3QgYmUgbW92ZWQgZnJvbSAke3RoaXMuYmxvY2tIZWlnaHR9IHRvICR7dGFyZ2V0QmxvY2tIZWlnaHR9YFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWluZUVtcHR5QmxvY2soY291bnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGwgYSByZWFkLW9ubHkgZnVuY3Rpb25cbiAgICogQHBhcmFtIGNvbnRyYWN0IEFkZHJlc3Mgb2YgdGhlIGNvbnRyYWN0IGltcGxlbWVudGluZyB0aGUgZnVuY3Rpb25cbiAgICogQHBhcmFtIG1ldGhvZCBUaGUgcmVhZC1vbmx5IGZ1bmN0aW9uIHRvIGNhbGxcbiAgICogQHBhcmFtIGFyZ3MgQXJndW1lbnRzIHRvIHBhc3MgYXMgY2xhcml0eSB2YWx1ZXNcbiAgICogQHBhcmFtIHNlbmRlciBBZGRyZXNzIG9mIHRoZSBjYWxsZXJcbiAgICogQHJldHVybnMgVGhlIHJlc3VsdCBvZiB0aFxuICAgKi9cbiAgY2FsbFJlYWRPbmx5Rm4oXG4gICAgY29udHJhY3Q6IHN0cmluZyxcbiAgICBtZXRob2Q6IHN0cmluZyxcbiAgICBhcmdzOiBBcnJheTxzdHJpbmc+LFxuICAgIHNlbmRlcjogc3RyaW5nXG4gICk6IFJlYWRPbmx5Rm4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL2NhbGxfcmVhZF9vbmx5X2ZuXCIsIHtcbiAgICAgICAgc2Vzc2lvbklkOiB0aGlzLnNlc3Npb25JZCxcbiAgICAgICAgY29udHJhY3QsXG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgYXJncyxcbiAgICAgICAgc2VuZGVyLFxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBzZXNzaW9uX2lkOiByZXN1bHQuc2Vzc2lvbl9pZCxcbiAgICAgIHJlc3VsdDogcmVzdWx0LnJlc3VsdCxcbiAgICAgIGV2ZW50czogcmVzdWx0LmV2ZW50cyxcbiAgICB9O1xuICB9XG5cbiAgZ2V0QXNzZXRzTWFwcygpOiBBc3NldHNNYXBzIHtcbiAgICBjb25zdCByZXN1bHQgPSBKU09OLnBhcnNlKFxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgRGVuby5jb3JlLm9wU3luYyhcImFwaS92MS9nZXRfYXNzZXRzX21hcHNcIiwge1xuICAgICAgICBzZXNzaW9uSWQ6IHRoaXMuc2Vzc2lvbklkLFxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiB7XG4gICAgICBzZXNzaW9uX2lkOiByZXN1bHQuc2Vzc2lvbl9pZCxcbiAgICAgIGFzc2V0czogcmVzdWx0LmFzc2V0cyxcbiAgICB9O1xuICB9XG5cbiAgc3dpdGNoRXBvY2goZXBvY2g6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL3N3aXRjaF9lcG9jaFwiLCB7XG4gICAgICAgIHNlc3Npb25JZDogdGhpcy5zZXNzaW9uSWQsXG4gICAgICAgIGVwb2NoLFxuICAgICAgfSlcbiAgICApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxudHlwZSBQcmVEZXBsb3ltZW50RnVuY3Rpb24gPSAoXG4gIGNoYWluOiBDaGFpbixcbiAgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+XG4pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG50eXBlIFRlc3RGdW5jdGlvbiA9IChcbiAgY2hhaW46IENoYWluLFxuICBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4sXG4gIGNvbnRyYWN0czogTWFwPHN0cmluZywgQ29udHJhY3Q+XG4pID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG5pbnRlcmZhY2UgVW5pdFRlc3RPcHRpb25zIHtcbiAgbmFtZTogc3RyaW5nO1xuICBvbmx5PzogdHJ1ZTtcbiAgaWdub3JlPzogdHJ1ZTtcbiAgZGVwbG95bWVudFBhdGg/OiBzdHJpbmc7XG4gIHByZURlcGxveW1lbnQ/OiBQcmVEZXBsb3ltZW50RnVuY3Rpb247XG4gIGZuOiBUZXN0RnVuY3Rpb247XG59XG5cbmludGVyZmFjZSBGdW5jdGlvbkludGVyZmFjZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgYWNjZXNzOiBcInJlYWRfb25seVwiIHwgXCJwdWJsaWNcIiB8IFwicHJpdmF0ZVwiO1xuICBhcmdzOiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHR5cGU6IHN0cmluZztcbiAgfVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnRyYWN0IHtcbiAgY29udHJhY3RfaWQ6IHN0cmluZztcbiAgc291cmNlOiBzdHJpbmc7XG4gIGNvbnRyYWN0X2ludGVyZmFjZToge1xuICAgIGZ1bmN0aW9uczogRnVuY3Rpb25JbnRlcmZhY2VbXTtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdGFja3NOb2RlIHtcbiAgdXJsOiBzdHJpbmc7XG59XG5cbnR5cGUgU2NyaXB0RnVuY3Rpb24gPSAoXG4gIGFjY291bnRzOiBNYXA8c3RyaW5nLCBBY2NvdW50PixcbiAgY29udHJhY3RzOiBNYXA8c3RyaW5nLCBDb250cmFjdD4sXG4gIG5vZGU6IFN0YWNrc05vZGVcbikgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbmludGVyZmFjZSBTY3JpcHRPcHRpb25zIHtcbiAgZm46IFNjcmlwdEZ1bmN0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgQ2xhcmluZXQge1xuICBzdGF0aWMgdGVzdChvcHRpb25zOiBVbml0VGVzdE9wdGlvbnMpIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgRGVuby50ZXN0KHtcbiAgICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgIG9ubHk6IG9wdGlvbnMub25seSxcbiAgICAgIGlnbm9yZTogb3B0aW9ucy5pZ25vcmUsXG4gICAgICBhc3luYyBmbigpIHtcbiAgICAgICAgY29uc3QgaGFzUHJlRGVwbG95bWVudFN0ZXBzID0gb3B0aW9ucy5wcmVEZXBsb3ltZW50ICE9PSB1bmRlZmluZWQ7XG5cbiAgICAgICAgbGV0IHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgIERlbm8uY29yZS5vcFN5bmMoXCJhcGkvdjEvbmV3X3Nlc3Npb25cIiwge1xuICAgICAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgICAgbG9hZERlcGxveW1lbnQ6ICFoYXNQcmVEZXBsb3ltZW50U3RlcHMsXG4gICAgICAgICAgICBkZXBsb3ltZW50UGF0aDogb3B0aW9ucy5kZXBsb3ltZW50UGF0aCxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnByZURlcGxveW1lbnQpIHtcbiAgICAgICAgICBjb25zdCBjaGFpbiA9IG5ldyBDaGFpbihyZXN1bHQuc2Vzc2lvbl9pZCk7XG4gICAgICAgICAgY29uc3QgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+ID0gbmV3IE1hcCgpO1xuICAgICAgICAgIGZvciAoY29uc3QgYWNjb3VudCBvZiByZXN1bHQuYWNjb3VudHMpIHtcbiAgICAgICAgICAgIGFjY291bnRzLnNldChhY2NvdW50Lm5hbWUsIGFjY291bnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhd2FpdCBvcHRpb25zLnByZURlcGxveW1lbnQoY2hhaW4sIGFjY291bnRzKTtcblxuICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL2xvYWRfZGVwbG95bWVudFwiLCB7XG4gICAgICAgICAgICAgIHNlc3Npb25JZDogY2hhaW4uc2Vzc2lvbklkLFxuICAgICAgICAgICAgICBkZXBsb3ltZW50UGF0aDogb3B0aW9ucy5kZXBsb3ltZW50UGF0aCxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoYWluID0gbmV3IENoYWluKHJlc3VsdC5zZXNzaW9uX2lkKTtcbiAgICAgICAgY29uc3QgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+ID0gbmV3IE1hcCgpO1xuICAgICAgICBmb3IgKGNvbnN0IGFjY291bnQgb2YgcmVzdWx0LmFjY291bnRzKSB7XG4gICAgICAgICAgYWNjb3VudHMuc2V0KGFjY291bnQubmFtZSwgYWNjb3VudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udHJhY3RzOiBNYXA8c3RyaW5nLCBDb250cmFjdD4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAoY29uc3QgY29udHJhY3Qgb2YgcmVzdWx0LmNvbnRyYWN0cykge1xuICAgICAgICAgIGNvbnRyYWN0cy5zZXQoY29udHJhY3QuY29udHJhY3RfaWQsIGNvbnRyYWN0KTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBvcHRpb25zLmZuKGNoYWluLCBhY2NvdW50cywgY29udHJhY3RzKTtcblxuICAgICAgICBKU09OLnBhcnNlKFxuICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICBEZW5vLmNvcmUub3BTeW5jKFwiYXBpL3YxL3Rlcm1pbmF0ZV9zZXNzaW9uXCIsIHtcbiAgICAgICAgICAgIHNlc3Npb25JZDogY2hhaW4uc2Vzc2lvbklkLFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgc3RhdGljIHJ1bihvcHRpb25zOiBTY3JpcHRPcHRpb25zKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIERlbm8udGVzdCh7XG4gICAgICBuYW1lOiBcInJ1bm5pbmcgc2NyaXB0XCIsXG4gICAgICBhc3luYyBmbigpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gSlNPTi5wYXJzZShcbiAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgRGVuby5jb3JlLm9wU3luYyhcImFwaS92MS9uZXdfc2Vzc2lvblwiLCB7XG4gICAgICAgICAgICBuYW1lOiBcInJ1bm5pbmcgc2NyaXB0XCIsXG4gICAgICAgICAgICBsb2FkRGVwbG95bWVudDogdHJ1ZSxcbiAgICAgICAgICAgIGRlcGxveW1lbnRQYXRoOiB1bmRlZmluZWQsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+ID0gbmV3IE1hcCgpO1xuICAgICAgICBmb3IgKGNvbnN0IGFjY291bnQgb2YgcmVzdWx0LmFjY291bnRzKSB7XG4gICAgICAgICAgYWNjb3VudHMuc2V0KGFjY291bnQubmFtZSwgYWNjb3VudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udHJhY3RzOiBNYXA8c3RyaW5nLCBDb250cmFjdD4gPSBuZXcgTWFwKCk7XG4gICAgICAgIGZvciAoY29uc3QgY29udHJhY3Qgb2YgcmVzdWx0LmNvbnRyYWN0cykge1xuICAgICAgICAgIGNvbnRyYWN0cy5zZXQoY29udHJhY3QuY29udHJhY3RfaWQsIGNvbnRyYWN0KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdGFja3Nfbm9kZTogU3RhY2tzTm9kZSA9IHtcbiAgICAgICAgICB1cmw6IHJlc3VsdC5zdGFja3Nfbm9kZV91cmwsXG4gICAgICAgIH07XG4gICAgICAgIGF3YWl0IG9wdGlvbnMuZm4oYWNjb3VudHMsIGNvbnRyYWN0cywgc3RhY2tzX25vZGUpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxufVxuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBTdHJpbmcge1xuICAgIGV4cGVjdE9rKCk6IHN0cmluZztcbiAgICBleHBlY3RFcnIoKTogc3RyaW5nO1xuICAgIGV4cGVjdFNvbWUoKTogc3RyaW5nO1xuICAgIGV4cGVjdE5vbmUoKTogdm9pZDtcbiAgICBleHBlY3RCb29sKHZhbHVlOiBib29sZWFuKTogYm9vbGVhbjtcbiAgICBleHBlY3RVaW50KHZhbHVlOiBudW1iZXIgfCBiaWdpbnQpOiBiaWdpbnQ7XG4gICAgZXhwZWN0SW50KHZhbHVlOiBudW1iZXIgfCBiaWdpbnQpOiBiaWdpbnQ7XG4gICAgZXhwZWN0QnVmZih2YWx1ZTogVWludDhBcnJheSk6IEFycmF5QnVmZmVyO1xuICAgIC8qKlxuICAgICAqIEBkZXByZWNhdGVkIGB2YWx1ZWBzaG91bGQgYmUgYSBVaW50OEFycmF5XG4gICAgICovXG4gICAgZXhwZWN0QnVmZih2YWx1ZTogQXJyYXlCdWZmZXIpOiBBcnJheUJ1ZmZlcjtcbiAgICBleHBlY3RBc2NpaSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nO1xuICAgIGV4cGVjdFV0ZjgodmFsdWU6IHN0cmluZyk6IHN0cmluZztcbiAgICBleHBlY3RQcmluY2lwYWwodmFsdWU6IHN0cmluZyk6IHN0cmluZztcbiAgICBleHBlY3RMaXN0KCk6IEFycmF5PHN0cmluZz47XG4gICAgZXhwZWN0VHVwbGUoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgfVxuXG4gIGludGVyZmFjZSBBcnJheTxUPiB7XG4gICAgZXhwZWN0U1RYVHJhbnNmZXJFdmVudChcbiAgICAgIGFtb3VudDogbnVtYmVyIHwgYmlnaW50LFxuICAgICAgc2VuZGVyOiBzdHJpbmcsXG4gICAgICByZWNpcGllbnQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdFNUWFRyYW5zZmVyRXZlbnQ7XG4gICAgZXhwZWN0U1RYQnVybkV2ZW50KFxuICAgICAgYW1vdW50OiBudW1iZXIgfCBiaWdpbnQsXG4gICAgICBzZW5kZXI6IFN0cmluZ1xuICAgICk6IEV4cGVjdFNUWEJ1cm5FdmVudDtcbiAgICBleHBlY3RGdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudChcbiAgICAgIGFtb3VudDogbnVtYmVyIHwgYmlnaW50LFxuICAgICAgc2VuZGVyOiBzdHJpbmcsXG4gICAgICByZWNpcGllbnQ6IHN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdEZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50O1xuICAgIGV4cGVjdEZ1bmdpYmxlVG9rZW5NaW50RXZlbnQoXG4gICAgICBhbW91bnQ6IG51bWJlciB8IGJpZ2ludCxcbiAgICAgIHJlY2lwaWVudDogc3RyaW5nLFxuICAgICAgYXNzZXRJZDogc3RyaW5nXG4gICAgKTogRXhwZWN0RnVuZ2libGVUb2tlbk1pbnRFdmVudDtcbiAgICBleHBlY3RGdW5naWJsZVRva2VuQnVybkV2ZW50KFxuICAgICAgYW1vdW50OiBudW1iZXIgfCBiaWdpbnQsXG4gICAgICBzZW5kZXI6IHN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdEZ1bmdpYmxlVG9rZW5CdXJuRXZlbnQ7XG4gICAgZXhwZWN0UHJpbnRFdmVudChcbiAgICAgIGNvbnRyYWN0SWRlbnRpZmllcjogc3RyaW5nLFxuICAgICAgdmFsdWU6IHN0cmluZ1xuICAgICk6IEV4cGVjdFByaW50RXZlbnQ7XG4gICAgZXhwZWN0Tm9uRnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQoXG4gICAgICB0b2tlbklkOiBzdHJpbmcsXG4gICAgICBzZW5kZXI6IHN0cmluZyxcbiAgICAgIHJlY2lwaWVudDogc3RyaW5nLFxuICAgICAgYXNzZXRBZGRyZXNzOiBzdHJpbmcsXG4gICAgICBhc3NldElkOiBzdHJpbmdcbiAgICApOiBFeHBlY3ROb25GdW5naWJsZVRva2VuVHJhbnNmZXJFdmVudDtcbiAgICBleHBlY3ROb25GdW5naWJsZVRva2VuTWludEV2ZW50KFxuICAgICAgdG9rZW5JZDogc3RyaW5nLFxuICAgICAgcmVjaXBpZW50OiBzdHJpbmcsXG4gICAgICBhc3NldEFkZHJlc3M6IHN0cmluZyxcbiAgICAgIGFzc2V0SWQ6IHN0cmluZ1xuICAgICk6IEV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5NaW50RXZlbnQ7XG4gICAgZXhwZWN0Tm9uRnVuZ2libGVUb2tlbkJ1cm5FdmVudChcbiAgICAgIHRva2VuSWQ6IHN0cmluZyxcbiAgICAgIHNlbmRlcjogc3RyaW5nLFxuICAgICAgYXNzZXRBZGRyZXNzOiBzdHJpbmcsXG4gICAgICBhc3NldElkOiBzdHJpbmdcbiAgICApOiBFeHBlY3ROb25GdW5naWJsZVRva2VuQnVybkV2ZW50O1xuICB9XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgYmFuLXR5cGVzXG5mdW5jdGlvbiBjb25zdW1lKHNyYzogU3RyaW5nLCBleHBlY3RhdGlvbjogc3RyaW5nLCB3cmFwcGVkOiBib29sZWFuKSB7XG4gIGxldCBkc3QgPSAoXCIgXCIgKyBzcmMpLnNsaWNlKDEpO1xuICBsZXQgc2l6ZSA9IGV4cGVjdGF0aW9uLmxlbmd0aDtcbiAgaWYgKCF3cmFwcGVkICYmIHNyYyAhPT0gZXhwZWN0YXRpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgRXhwZWN0ZWQgJHtncmVlbihleHBlY3RhdGlvbi50b1N0cmluZygpKX0sIGdvdCAke3JlZChzcmMudG9TdHJpbmcoKSl9YFxuICAgICk7XG4gIH1cbiAgaWYgKHdyYXBwZWQpIHtcbiAgICBzaXplICs9IDI7XG4gIH1cbiAgaWYgKGRzdC5sZW5ndGggPCBzaXplKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oZXhwZWN0YXRpb24udG9TdHJpbmcoKSl9LCBnb3QgJHtyZWQoc3JjLnRvU3RyaW5nKCkpfWBcbiAgICApO1xuICB9XG4gIGlmICh3cmFwcGVkKSB7XG4gICAgZHN0ID0gZHN0LnN1YnN0cmluZygxLCBkc3QubGVuZ3RoIC0gMSk7XG4gIH1cbiAgY29uc3QgcmVzID0gZHN0LnNsaWNlKDAsIGV4cGVjdGF0aW9uLmxlbmd0aCk7XG4gIGlmIChyZXMgIT09IGV4cGVjdGF0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEV4cGVjdGVkICR7Z3JlZW4oZXhwZWN0YXRpb24udG9TdHJpbmcoKSl9LCBnb3QgJHtyZWQoc3JjLnRvU3RyaW5nKCkpfWBcbiAgICApO1xuICB9XG4gIGxldCBsZWZ0UGFkID0gMDtcbiAgaWYgKGRzdC5jaGFyQXQoZXhwZWN0YXRpb24ubGVuZ3RoKSA9PT0gXCIgXCIpIHtcbiAgICBsZWZ0UGFkID0gMTtcbiAgfVxuICBjb25zdCByZW1haW5kZXIgPSBkc3Quc3Vic3RyaW5nKGV4cGVjdGF0aW9uLmxlbmd0aCArIGxlZnRQYWQpO1xuICByZXR1cm4gcmVtYWluZGVyO1xufVxuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdE9rID0gZnVuY3Rpb24gZXhwZWN0T2soKSB7XG4gIHJldHVybiBjb25zdW1lKHRoaXMsIFwib2tcIiwgdHJ1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEVyciA9IGZ1bmN0aW9uIGV4cGVjdEVycigpIHtcbiAgcmV0dXJuIGNvbnN1bWUodGhpcywgXCJlcnJcIiwgdHJ1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdFNvbWUgPSBmdW5jdGlvbiBleHBlY3RTb21lKCkge1xuICByZXR1cm4gY29uc3VtZSh0aGlzLCBcInNvbWVcIiwgdHJ1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdE5vbmUgPSBmdW5jdGlvbiBleHBlY3ROb25lKCkge1xuICByZXR1cm4gY29uc3VtZSh0aGlzLCBcIm5vbmVcIiwgZmFsc2UpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RCb29sID0gZnVuY3Rpb24gZXhwZWN0Qm9vbCh2YWx1ZTogYm9vbGVhbikge1xuICB0cnkge1xuICAgIGNvbnN1bWUodGhpcywgYCR7dmFsdWV9YCwgZmFsc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0VWludCA9IGZ1bmN0aW9uIGV4cGVjdFVpbnQoXG4gIHZhbHVlOiBudW1iZXIgfCBiaWdpbnRcbik6IGJpZ2ludCB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgdSR7dmFsdWV9YCwgZmFsc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiBCaWdJbnQodmFsdWUpO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RJbnQgPSBmdW5jdGlvbiBleHBlY3RJbnQoXG4gIHZhbHVlOiBudW1iZXIgfCBiaWdpbnRcbik6IGJpZ2ludCB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgJHt2YWx1ZX1gLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIEJpZ0ludCh2YWx1ZSk7XG59O1xuXG5TdHJpbmcucHJvdG90eXBlLmV4cGVjdEJ1ZmYgPSBmdW5jdGlvbiBleHBlY3RCdWZmKHZhbHVlOiBBcnJheUJ1ZmZlcikge1xuICBjb25zdCBidWZmZXIgPSB0eXBlcy5idWZmKG5ldyBVaW50OEFycmF5KHZhbHVlKSk7XG4gIGlmICh0aGlzICE9PSBidWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkICR7Z3JlZW4oYnVmZmVyKX0sIGdvdCAke3JlZCh0aGlzLnRvU3RyaW5nKCkpfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0QXNjaWkgPSBmdW5jdGlvbiBleHBlY3RBc2NpaSh2YWx1ZTogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgXCIke3ZhbHVlfVwiYCwgZmFsc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0VXRmOCA9IGZ1bmN0aW9uIGV4cGVjdFV0ZjgodmFsdWU6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN1bWUodGhpcywgYHVcIiR7dmFsdWV9XCJgLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RQcmluY2lwYWwgPSBmdW5jdGlvbiBleHBlY3RQcmluY2ljaXBhbCh2YWx1ZTogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3VtZSh0aGlzLCBgJHt2YWx1ZX1gLCBmYWxzZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuU3RyaW5nLnByb3RvdHlwZS5leHBlY3RMaXN0ID0gZnVuY3Rpb24gZXhwZWN0TGlzdCgpIHtcbiAgaWYgKCF0aGlzLnN0YXJ0c1dpdGgoXCJbXCIpIHx8ICF0aGlzLmVuZHNXaXRoKFwiXVwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBFeHBlY3RlZCAke2dyZWVuKFwiKGxpc3QgLi4uKVwiKX0sIGdvdCAke3JlZCh0aGlzLnRvU3RyaW5nKCkpfWBcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgc3RhY2sgPSBbXTtcbiAgY29uc3QgZWxlbWVudHMgPSBbXTtcbiAgbGV0IHN0YXJ0ID0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIixcIiAmJiBzdGFjay5sZW5ndGggPT0gMSkge1xuICAgICAgZWxlbWVudHMucHVzaCh0aGlzLnN1YnN0cmluZyhzdGFydCwgaSkpO1xuICAgICAgc3RhcnQgPSBpICsgMjtcbiAgICB9XG4gICAgaWYgKFtcIihcIiwgXCJbXCIsIFwie1wiXS5pbmNsdWRlcyh0aGlzLmNoYXJBdChpKSkpIHtcbiAgICAgIHN0YWNrLnB1c2godGhpcy5jaGFyQXQoaSkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGFyQXQoaSkgPT09IFwiKVwiICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBcIihcIikge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCJ9XCIgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gPT09IFwie1wiKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIl1cIiAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXSA9PT0gXCJbXCIpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxuICBjb25zdCByZW1haW5kZXIgPSB0aGlzLnN1YnN0cmluZyhzdGFydCwgdGhpcy5sZW5ndGggLSAxKTtcbiAgaWYgKHJlbWFpbmRlci5sZW5ndGggPiAwKSB7XG4gICAgZWxlbWVudHMucHVzaChyZW1haW5kZXIpO1xuICB9XG4gIHJldHVybiBlbGVtZW50cztcbn07XG5cblN0cmluZy5wcm90b3R5cGUuZXhwZWN0VHVwbGUgPSBmdW5jdGlvbiBleHBlY3RUdXBsZSgpIHtcbiAgaWYgKCF0aGlzLnN0YXJ0c1dpdGgoXCJ7XCIpIHx8ICF0aGlzLmVuZHNXaXRoKFwifVwiKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBFeHBlY3RlZCAke2dyZWVuKFwiKHR1cGxlIC4uLilcIil9LCBnb3QgJHtyZWQodGhpcy50b1N0cmluZygpKX1gXG4gICAgKTtcbiAgfVxuXG4gIGxldCBzdGFydCA9IDE7XG4gIGNvbnN0IHN0YWNrID0gW107XG4gIGNvbnN0IGVsZW1lbnRzID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCIsXCIgJiYgc3RhY2subGVuZ3RoID09IDEpIHtcbiAgICAgIGVsZW1lbnRzLnB1c2godGhpcy5zdWJzdHJpbmcoc3RhcnQsIGkpKTtcbiAgICAgIHN0YXJ0ID0gaSArIDI7XG4gICAgfVxuICAgIGlmIChbXCIoXCIsIFwiW1wiLCBcIntcIl0uaW5jbHVkZXModGhpcy5jaGFyQXQoaSkpKSB7XG4gICAgICBzdGFjay5wdXNoKHRoaXMuY2hhckF0KGkpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2hhckF0KGkpID09PSBcIilcIiAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXSA9PT0gXCIoXCIpIHtcbiAgICAgIHN0YWNrLnBvcCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jaGFyQXQoaSkgPT09IFwifVwiICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdID09PSBcIntcIikge1xuICAgICAgc3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNoYXJBdChpKSA9PT0gXCJdXCIgJiYgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gPT09IFwiW1wiKSB7XG4gICAgICBzdGFjay5wb3AoKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgcmVtYWluZGVyID0gdGhpcy5zdWJzdHJpbmcoc3RhcnQsIHRoaXMubGVuZ3RoIC0gMSk7XG4gIGlmIChyZW1haW5kZXIubGVuZ3RoID4gMCkge1xuICAgIGVsZW1lbnRzLnB1c2gocmVtYWluZGVyKTtcbiAgfVxuXG4gIGNvbnN0IHR1cGxlOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGVsZW1lbnQuY2hhckF0KGkpID09PSBcIjpcIikge1xuICAgICAgICBjb25zdCBrZXkgPSBlbGVtZW50LnN1YnN0cmluZygwLCBpKS50cmltKCk7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZWxlbWVudC5zdWJzdHJpbmcoaSArIDIpLnRyaW0oKTtcbiAgICAgICAgdHVwbGVba2V5XSA9IHZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHVwbGU7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0U1RYVHJhbnNmZXJFdmVudCA9IGZ1bmN0aW9uIChhbW91bnQsIHNlbmRlciwgcmVjaXBpZW50KSB7XG4gIGZvciAoY29uc3QgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHN0eF90cmFuc2Zlcl9ldmVudCB9ID0gZXZlbnQ7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbW91bnQ6IHN0eF90cmFuc2Zlcl9ldmVudC5hbW91bnQuZXhwZWN0SW50KGFtb3VudCksXG4gICAgICAgIHNlbmRlcjogc3R4X3RyYW5zZmVyX2V2ZW50LnNlbmRlci5leHBlY3RQcmluY2lwYWwoc2VuZGVyKSxcbiAgICAgICAgcmVjaXBpZW50OiBzdHhfdHJhbnNmZXJfZXZlbnQucmVjaXBpZW50LmV4cGVjdFByaW5jaXBhbChyZWNpcGllbnQpLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgU1RYVHJhbnNmZXJFdmVudFwiKTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3RTVFhCdXJuRXZlbnQgPSBmdW5jdGlvbiAoYW1vdW50LCBzZW5kZXIpIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc3R4X2J1cm5fZXZlbnQgfSA9IGV2ZW50O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW1vdW50OiBzdHhfYnVybl9ldmVudC5hbW91bnQuZXhwZWN0SW50KGFtb3VudCksXG4gICAgICAgIHNlbmRlcjogc3R4X2J1cm5fZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgU1RYQnVybkV2ZW50XCIpO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdEZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50ID0gZnVuY3Rpb24gKFxuICBhbW91bnQsXG4gIHNlbmRlcixcbiAgcmVjaXBpZW50LFxuICBhc3NldElkXG4pIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgZnRfdHJhbnNmZXJfZXZlbnQgfSA9IGV2ZW50O1xuICAgICAgaWYgKCFmdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyLmVuZHNXaXRoKGFzc2V0SWQpKSBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW1vdW50OiBmdF90cmFuc2Zlcl9ldmVudC5hbW91bnQuZXhwZWN0SW50KGFtb3VudCksXG4gICAgICAgIHNlbmRlcjogZnRfdHJhbnNmZXJfZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpLFxuICAgICAgICByZWNpcGllbnQ6IGZ0X3RyYW5zZmVyX2V2ZW50LnJlY2lwaWVudC5leHBlY3RQcmluY2lwYWwocmVjaXBpZW50KSxcbiAgICAgICAgYXNzZXRJZDogZnRfdHJhbnNmZXJfZXZlbnQuYXNzZXRfaWRlbnRpZmllcixcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgRnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnQoJHthbW91bnR9LCAke3NlbmRlcn0sICR7cmVjaXBpZW50fSwgJHthc3NldElkfSlcXG4ke0pTT04uc3RyaW5naWZ5KFxuICAgICAgdGhpc1xuICAgICl9YFxuICApO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdEZ1bmdpYmxlVG9rZW5NaW50RXZlbnQgPSBmdW5jdGlvbiAoXG4gIGFtb3VudCxcbiAgcmVjaXBpZW50LFxuICBhc3NldElkXG4pIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgZnRfbWludF9ldmVudCB9ID0gZXZlbnQ7XG4gICAgICBpZiAoIWZ0X21pbnRfZXZlbnQuYXNzZXRfaWRlbnRpZmllci5lbmRzV2l0aChhc3NldElkKSkgY29udGludWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFtb3VudDogZnRfbWludF9ldmVudC5hbW91bnQuZXhwZWN0SW50KGFtb3VudCksXG4gICAgICAgIHJlY2lwaWVudDogZnRfbWludF9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKHJlY2lwaWVudCksXG4gICAgICAgIGFzc2V0SWQ6IGZ0X21pbnRfZXZlbnQuYXNzZXRfaWRlbnRpZmllcixcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoX2Vycm9yKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFwiVW5hYmxlIHRvIHJldHJpZXZlIGV4cGVjdGVkIEZ1bmdpYmxlVG9rZW5NaW50RXZlbnRcIik7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0RnVuZ2libGVUb2tlbkJ1cm5FdmVudCA9IGZ1bmN0aW9uIChcbiAgYW1vdW50LFxuICBzZW5kZXIsXG4gIGFzc2V0SWRcbikge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBmdF9idXJuX2V2ZW50IH0gPSBldmVudDtcbiAgICAgIGlmICghZnRfYnVybl9ldmVudC5hc3NldF9pZGVudGlmaWVyLmVuZHNXaXRoKGFzc2V0SWQpKSBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYW1vdW50OiBmdF9idXJuX2V2ZW50LmFtb3VudC5leHBlY3RJbnQoYW1vdW50KSxcbiAgICAgICAgc2VuZGVyOiBmdF9idXJuX2V2ZW50LnNlbmRlci5leHBlY3RQcmluY2lwYWwoc2VuZGVyKSxcbiAgICAgICAgYXNzZXRJZDogZnRfYnVybl9ldmVudC5hc3NldF9pZGVudGlmaWVyLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgRnVuZ2libGVUb2tlbkJ1cm5FdmVudFwiKTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3RQcmludEV2ZW50ID0gZnVuY3Rpb24gKGNvbnRyYWN0SWRlbnRpZmllciwgdmFsdWUpIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgY29udHJhY3RfZXZlbnQgfSA9IGV2ZW50O1xuICAgICAgaWYgKCFjb250cmFjdF9ldmVudCkgY29udGludWU7XG4gICAgICBpZiAoIWNvbnRyYWN0X2V2ZW50LnRvcGljLmVuZHNXaXRoKFwicHJpbnRcIikpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFjb250cmFjdF9ldmVudC52YWx1ZS5lbmRzV2l0aCh2YWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250cmFjdF9pZGVudGlmaWVyOlxuICAgICAgICAgIGNvbnRyYWN0X2V2ZW50LmNvbnRyYWN0X2lkZW50aWZpZXIuZXhwZWN0UHJpbmNpcGFsKFxuICAgICAgICAgICAgY29udHJhY3RJZGVudGlmaWVyXG4gICAgICAgICAgKSxcbiAgICAgICAgdG9waWM6IGNvbnRyYWN0X2V2ZW50LnRvcGljLFxuICAgICAgICB2YWx1ZTogY29udHJhY3RfZXZlbnQudmFsdWUsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSBleHBlY3RlZCBQcmludEV2ZW50XCIpO1xufTtcblxuQXJyYXkucHJvdG90eXBlLmV4cGVjdE5vbkZ1bmdpYmxlVG9rZW5UcmFuc2ZlckV2ZW50ID0gZnVuY3Rpb24gKFxuICB0b2tlbklkLFxuICBzZW5kZXIsXG4gIHJlY2lwaWVudCxcbiAgYXNzZXRBZGRyZXNzLFxuICBhc3NldElkXG4pIHtcbiAgZm9yIChjb25zdCBldmVudCBvZiB0aGlzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbmZ0X3RyYW5zZmVyX2V2ZW50IH0gPSBldmVudDtcbiAgICAgIGlmIChuZnRfdHJhbnNmZXJfZXZlbnQudmFsdWUgIT09IHRva2VuSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKG5mdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyICE9PSBgJHthc3NldEFkZHJlc3N9Ojoke2Fzc2V0SWR9YClcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRva2VuSWQ6IG5mdF90cmFuc2Zlcl9ldmVudC52YWx1ZSxcbiAgICAgICAgc2VuZGVyOiBuZnRfdHJhbnNmZXJfZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpLFxuICAgICAgICByZWNpcGllbnQ6IG5mdF90cmFuc2Zlcl9ldmVudC5yZWNpcGllbnQuZXhwZWN0UHJpbmNpcGFsKHJlY2lwaWVudCksXG4gICAgICAgIGFzc2V0SWQ6IG5mdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgTm9uRnVuZ2libGVUb2tlblRyYW5zZmVyRXZlbnRcIik7XG59O1xuXG5BcnJheS5wcm90b3R5cGUuZXhwZWN0Tm9uRnVuZ2libGVUb2tlbk1pbnRFdmVudCA9IGZ1bmN0aW9uIChcbiAgdG9rZW5JZCxcbiAgcmVjaXBpZW50LFxuICBhc3NldEFkZHJlc3MsXG4gIGFzc2V0SWRcbikge1xuICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRoaXMpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBuZnRfbWludF9ldmVudCB9ID0gZXZlbnQ7XG4gICAgICBpZiAobmZ0X21pbnRfZXZlbnQudmFsdWUgIT09IHRva2VuSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKG5mdF9taW50X2V2ZW50LmFzc2V0X2lkZW50aWZpZXIgIT09IGAke2Fzc2V0QWRkcmVzc306OiR7YXNzZXRJZH1gKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9rZW5JZDogbmZ0X21pbnRfZXZlbnQudmFsdWUsXG4gICAgICAgIHJlY2lwaWVudDogbmZ0X21pbnRfZXZlbnQucmVjaXBpZW50LmV4cGVjdFByaW5jaXBhbChyZWNpcGllbnQpLFxuICAgICAgICBhc3NldElkOiBuZnRfbWludF9ldmVudC5hc3NldF9pZGVudGlmaWVyLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgTm9uRnVuZ2libGVUb2tlbk1pbnRFdmVudFwiKTtcbn07XG5cbkFycmF5LnByb3RvdHlwZS5leHBlY3ROb25GdW5naWJsZVRva2VuQnVybkV2ZW50ID0gZnVuY3Rpb24gKFxuICB0b2tlbklkLFxuICBzZW5kZXIsXG4gIGFzc2V0QWRkcmVzcyxcbiAgYXNzZXRJZFxuKSB7XG4gIGZvciAoY29uc3QgZXZlbnQgb2YgdGhpcykge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZXZlbnQubmZ0X2J1cm5fZXZlbnQudmFsdWUgIT09IHRva2VuSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKFxuICAgICAgICBldmVudC5uZnRfYnVybl9ldmVudC5hc3NldF9pZGVudGlmaWVyICE9PSBgJHthc3NldEFkZHJlc3N9Ojoke2Fzc2V0SWR9YFxuICAgICAgKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYXNzZXRJZDogZXZlbnQubmZ0X2J1cm5fZXZlbnQuYXNzZXRfaWRlbnRpZmllcixcbiAgICAgICAgdG9rZW5JZDogZXZlbnQubmZ0X2J1cm5fZXZlbnQudmFsdWUsXG4gICAgICAgIHNlbmRlcjogZXZlbnQubmZ0X2J1cm5fZXZlbnQuc2VuZGVyLmV4cGVjdFByaW5jaXBhbChzZW5kZXIpLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJVbmFibGUgdG8gcmV0cmlldmUgZXhwZWN0ZWQgTm9uRnVuZ2libGVUb2tlbkJ1cm5FdmVudFwiKTtcbn07XG5cbmNvbnN0IG5vQ29sb3IgPSBEZW5vLm5vQ29sb3IgPz8gdHJ1ZTtcbmNvbnN0IGVuYWJsZWQgPSAhbm9Db2xvcjtcblxuaW50ZXJmYWNlIENvZGUge1xuICBvcGVuOiBzdHJpbmc7XG4gIGNsb3NlOiBzdHJpbmc7XG4gIHJlZ2V4cDogUmVnRXhwO1xufVxuXG5mdW5jdGlvbiBjb2RlKG9wZW46IG51bWJlcltdLCBjbG9zZTogbnVtYmVyKTogQ29kZSB7XG4gIHJldHVybiB7XG4gICAgb3BlbjogYFxceDFiWyR7b3Blbi5qb2luKFwiO1wiKX1tYCxcbiAgICBjbG9zZTogYFxceDFiWyR7Y2xvc2V9bWAsXG4gICAgcmVnZXhwOiBuZXcgUmVnRXhwKGBcXFxceDFiXFxcXFske2Nsb3NlfW1gLCBcImdcIiksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJ1bihzdHI6IHN0cmluZywgY29kZTogQ29kZSk6IHN0cmluZyB7XG4gIHJldHVybiBlbmFibGVkXG4gICAgPyBgJHtjb2RlLm9wZW59JHtzdHIucmVwbGFjZShjb2RlLnJlZ2V4cCwgY29kZS5vcGVuKX0ke2NvZGUuY2xvc2V9YFxuICAgIDogc3RyO1xufVxuXG5mdW5jdGlvbiByZWQoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcnVuKHN0ciwgY29kZShbMzFdLCAzOSkpO1xufVxuXG5mdW5jdGlvbiBncmVlbihzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBydW4oc3RyLCBjb2RlKFszMl0sIDM5KSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBWUEsWUFBWSxLQUFLLE1BQU0sbUJBQW1CLENBQUM7QUFFM0MsY0FBYyxpQkFBaUIsQ0FBQztB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