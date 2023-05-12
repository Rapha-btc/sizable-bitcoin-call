import { Clarinet, Tx, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';
const contractName = 'covered-call';
const defaultNftAssetContract = 'covered-call';
const defaultPaymentAssetContract = 'wrapped-usdc';
const contractPrincipal = (deployer)=>`${deployer.address}.${contractName}`;
const paymentAssetPrincipal = (deployer)=>`${deployer.address}.${defaultPaymentAssetContract}`;
function assertNftTransfer(event, nftAssetContract, tokenId, sender, recipient) {
    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'nft_transfer_event');
    assertEquals(event.nft_transfer_event.asset_identifier.split('.')[1].substr(0, nftAssetContract.length), nftAssetContract);
    event.nft_transfer_event.sender.expectPrincipal(sender);
    event.nft_transfer_event.recipient.expectPrincipal(recipient);
    event.nft_transfer_event.value.expectUint(tokenId);
}
Clarinet.test({
    name: "GetOwner::Failure::Invalid Id",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(1)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectNone();
    }
});
Clarinet.test({
    name: "Mint::Success",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(100000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(1)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);
        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [
            types.uint(1)
        ], deployer.address);
        const coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
    }
});
Clarinet.test({
    name: "Mint::Fails",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        // non round lot underlying quantity
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(110000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectErr().expectUint(1016);
        // block height in past
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(110000000),
                types.uint(2000000),
                types.uint(1)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectErr().expectUint(1004); // block height in past
        // strike price is zero
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(110000000),
                types.uint(0),
                types.uint(1)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        block.receipts[0].result.expectErr().expectUint(1004); // strike price is zero
    }
});
Clarinet.test({
    name: "Mint::TwoOwners",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        let wallet2 = accounts.get('wallet_2');
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(100000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address),
            Tx.contractCall('covered-call', 'mint', [
                types.uint(200000000),
                types.uint(4000000),
                types.uint(2000)
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 2);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectOk();
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(1)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);
        coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(2)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet2.address);
        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [
            types.uint(1)
        ], deployer.address);
        let coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
        coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [
            types.uint(2)
        ], deployer.address);
        coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet2.address);
        coveredCallData['underlying-quantity'].expectUint(200000000);
        coveredCallData['strike-price-usdc'].expectUint(4000000);
        coveredCallData['strike-date-block-height'].expectUint(2000);
    }
});
Clarinet.test({
    name: "Exercise::Success",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        let wallet2 = accounts.get('wallet_2');
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(100000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(1)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);
        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [
            types.uint(1)
        ], deployer.address);
        const coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);
        let emptyBlock = chain.mineEmptyBlockUntil(50);
        assertEquals(emptyBlock.block_height, 50);
        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [
                types.uint(300000000),
                types.principal(wallet2.address)
            ], deployer.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 51);
        block.receipts[0].result.expectOk();
        let assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);
        assertEquals(assets['.wrapped-usdc.wrapped-usdc'][wallet2.address], 300000000);
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [
                types.principal(paymentAssetPrincipal(deployer)),
                types.uint(1)
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 52);
        block.receipts[0].result.expectOk();
        assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);
        assertEquals(assets['STX'][wallet2.address], 100000100000000);
        assertEquals(assets['.wrapped-usdc.wrapped-usdc'][wallet1.address], 200000000);
        assertEquals(assets['.wrapped-usdc.wrapped-usdc'][wallet2.address], 100000000);
    }
});
Clarinet.test({
    name: "Exercise::Fails",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        let wallet2 = accounts.get('wallet_2');
        // token-id does not exist
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [
                types.principal(paymentAssetPrincipal(deployer)),
                types.uint(1)
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectErr().expectUint(1007); // token not found
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(100000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        // tx-sender does not own token-id
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [
                types.principal(paymentAssetPrincipal(deployer)),
                types.uint(1)
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        block.receipts[0].result.expectErr().expectUint(1001); // not token owner
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 5);
        block.receipts[0].result.expectOk();
        // tx-sender insufficient funds to exercise
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [
                types.principal(paymentAssetPrincipal(deployer)),
                types.uint(1)
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 6);
        block.receipts[0].result.expectErr().expectUint(1008); // insufficient funds
        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [
                types.uint(300000000),
                types.principal(wallet2.address)
            ], deployer.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 7);
        block.receipts[0].result.expectOk();
        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);
        // contract expired
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [
                types.principal(paymentAssetPrincipal(deployer)),
                types.uint(1)
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 1002);
        block.receipts[0].result.expectErr().expectUint(1006); // token expired
    }
});
Clarinet.test({
    name: "UnderlyingClaim::Success",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        let wallet2 = accounts.get('wallet_2');
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(100000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(1)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);
        let assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);
        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [
            types.uint(1)
        ], deployer.address);
        const coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);
        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);
        let claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [
            types.uint(1)
        ], wallet1.address);
        assertEquals(claimableResult.result, 'true');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [
                types.list([
                    types.uint(1)
                ])
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 1002);
        block.receipts[0].result.expectOk();
        assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 100000000000000);
    }
});
Clarinet.test({
    name: "UnderlyingClaim::Failures",
    async fn (chain, accounts) {
        let deployer = accounts.get('deployer');
        let wallet1 = accounts.get('wallet_1');
        let wallet2 = accounts.get('wallet_2');
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [
                types.uint(100000000),
                types.uint(2000000),
                types.uint(1000)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [
            types.uint(1)
        ], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);
        let assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [
                types.uint(1),
                types.principal(wallet1.address),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);
        // id not found
        let claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [
            types.uint(2)
        ], wallet1.address);
        assertEquals(claimableResult.result, 'false');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [
                types.list([
                    types.uint(2)
                ])
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        block.receipts[0].result.expectErr().expectUint(1007); // id not found
        // not expired
        claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [
            types.uint(1)
        ], wallet1.address);
        assertEquals(claimableResult.result, 'false');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [
                types.list([
                    types.uint(1)
                ])
            ], wallet1.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 5);
        block.receipts[0].result.expectErr().expectUint(1014); // not expired
        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);
        // not counterparty
        claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [
            types.uint(1)
        ], wallet2.address);
        assertEquals(claimableResult.result, 'false');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [
                types.list([
                    types.uint(1)
                ])
            ], wallet2.address)
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 1002);
        block.receipts[0].result.expectErr().expectUint(1015); // not counterparty
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vbW50L2MvVXNlcnMvT3duZXIvRG9jdW1lbnRzL0NsYXJpdHkvY2xhcml0eV91bml2ZXJzZV9jb3ZlcmVkX2NhbGwtUmFmYS90ZXN0cy9jb3ZlcmVkLWNhbGxfdGVzdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbGFyaW5ldCwgVHgsIENoYWluLCBBY2NvdW50LCB0eXBlcyB9IGZyb20gJ2h0dHBzOi8vZGVuby5sYW5kL3gvY2xhcmluZXRAdjAuMTQuMC9pbmRleC50cyc7XG5pbXBvcnQgeyBhc3NlcnRFcXVhbHMgfSBmcm9tICdodHRwczovL2Rlbm8ubGFuZC9zdGRAMC45MC4wL3Rlc3RpbmcvYXNzZXJ0cy50cyc7XG5cbmNvbnN0IGNvbnRyYWN0TmFtZSA9ICdjb3ZlcmVkLWNhbGwnO1xuY29uc3QgZGVmYXVsdE5mdEFzc2V0Q29udHJhY3QgPSAnY292ZXJlZC1jYWxsJztcbmNvbnN0IGRlZmF1bHRQYXltZW50QXNzZXRDb250cmFjdCA9ICd3cmFwcGVkLXVzZGMnO1xuXG5jb25zdCBjb250cmFjdFByaW5jaXBhbCA9IChkZXBsb3llcjogQWNjb3VudCkgPT4gYCR7ZGVwbG95ZXIuYWRkcmVzc30uJHtjb250cmFjdE5hbWV9YDtcbmNvbnN0IHBheW1lbnRBc3NldFByaW5jaXBhbCA9IChkZXBsb3llcjogQWNjb3VudCkgPT4gYCR7ZGVwbG95ZXIuYWRkcmVzc30uJHtkZWZhdWx0UGF5bWVudEFzc2V0Q29udHJhY3R9YDtcblxuaW50ZXJmYWNlIFNpcDAwOU5mdFRyYW5zZmVyRXZlbnQge1xuICAgIHR5cGU6IHN0cmluZyxcbiAgICBuZnRfdHJhbnNmZXJfZXZlbnQ6IHtcbiAgICAgICAgYXNzZXRfaWRlbnRpZmllcjogYW55LFxuICAgICAgICBzZW5kZXI6IGFueSxcbiAgICAgICAgcmVjaXBpZW50OiBhbnksXG4gICAgICAgIHZhbHVlOiBhbnlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydE5mdFRyYW5zZmVyKGV2ZW50OiBTaXAwMDlOZnRUcmFuc2ZlckV2ZW50LCBuZnRBc3NldENvbnRyYWN0OiBzdHJpbmcsIHRva2VuSWQ6IG51bWJlciwgc2VuZGVyOiBzdHJpbmcsIHJlY2lwaWVudDogc3RyaW5nKSB7XG4gICAgYXNzZXJ0RXF1YWxzKHR5cGVvZiBldmVudCwgJ29iamVjdCcpO1xuICAgIGFzc2VydEVxdWFscyhldmVudC50eXBlLCAnbmZ0X3RyYW5zZmVyX2V2ZW50Jyk7XG4gICAgYXNzZXJ0RXF1YWxzKGV2ZW50Lm5mdF90cmFuc2Zlcl9ldmVudC5hc3NldF9pZGVudGlmaWVyLnNwbGl0KCcuJylbMV0uc3Vic3RyKDAsIG5mdEFzc2V0Q29udHJhY3QubGVuZ3RoKSwgbmZ0QXNzZXRDb250cmFjdCk7XG4gICAgZXZlbnQubmZ0X3RyYW5zZmVyX2V2ZW50LnNlbmRlci5leHBlY3RQcmluY2lwYWwoc2VuZGVyKTtcbiAgICBldmVudC5uZnRfdHJhbnNmZXJfZXZlbnQucmVjaXBpZW50LmV4cGVjdFByaW5jaXBhbChyZWNpcGllbnQpO1xuICAgIGV2ZW50Lm5mdF90cmFuc2Zlcl9ldmVudC52YWx1ZS5leHBlY3RVaW50KHRva2VuSWQpO1xufVxuXG5DbGFyaW5ldC50ZXN0KHtcbiAgICBuYW1lOiBcIkdldE93bmVyOjpGYWlsdXJlOjpJbnZhbGlkIElkXCIsXG4gICAgYXN5bmMgZm4oY2hhaW46IENoYWluLCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4pIHtcbiAgICAgICAgbGV0IGRlcGxveWVyID0gYWNjb3VudHMuZ2V0KCdkZXBsb3llcicpITtcbiAgICAgICAgbGV0IGNvdmVyZWRDYWxsT3duZXJSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1vd25lcicsIFt0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGNvdmVyZWRDYWxsT3duZXJSZXN1bHQucmVzdWx0LmV4cGVjdE9rKCkuZXhwZWN0Tm9uZSgpO1xuICAgIH1cbn0pXG5cbkNsYXJpbmV0LnRlc3Qoe1xuICAgIG5hbWU6IFwiTWludDo6U3VjY2Vzc1wiLFxuICAgIGFzeW5jIGZuKGNoYWluOiBDaGFpbiwgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+KSB7XG4gICAgICAgIGxldCBkZXBsb3llciA9IGFjY291bnRzLmdldCgnZGVwbG95ZXInKSE7XG4gICAgICAgIGxldCB3YWxsZXQxID0gYWNjb3VudHMuZ2V0KCd3YWxsZXRfMScpITtcbiAgICAgICAgXG4gICAgICAgIGxldCBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdtaW50JywgW3R5cGVzLnVpbnQoMTAwMDAwMDAwKSwgdHlwZXMudWludCgyMDAwMDAwKSwgdHlwZXMudWludCgxMDAwKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSk7XG4gICAgICAgIFxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMik7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RPaygpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvdmVyZWRDYWxsT3duZXJSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1vd25lcicsIFt0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGNvdmVyZWRDYWxsT3duZXJSZXN1bHQucmVzdWx0LmV4cGVjdE9rKCkuZXhwZWN0U29tZSgpLmV4cGVjdFByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpO1xuXG4gICAgICAgIGxldCBjb3ZlcmVkQ2FsbERhdGFSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1jb3ZlcmVkLWNhbGwtZGF0YScsIFt0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGNvbnN0IGNvdmVyZWRDYWxsRGF0YTogeyBba2V5OiBzdHJpbmddOiBhbnkgfSA9IGNvdmVyZWRDYWxsRGF0YVJlc3VsdC5yZXN1bHQuZXhwZWN0U29tZSgpLmV4cGVjdFR1cGxlKCk7XG4gICAgICAgIGNvdmVyZWRDYWxsRGF0YVsnY291bnRlcnBhcnR5J10uZXhwZWN0UHJpbmNpcGFsKHdhbGxldDEuYWRkcmVzcyk7XG4gICAgICAgIGNvdmVyZWRDYWxsRGF0YVsndW5kZXJseWluZy1xdWFudGl0eSddLmV4cGVjdFVpbnQoMTAwMDAwMDAwKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWydzdHJpa2UtcHJpY2UtdXNkYyddLmV4cGVjdFVpbnQoMjAwMDAwMCk7XG4gICAgICAgIGNvdmVyZWRDYWxsRGF0YVsnc3RyaWtlLWRhdGUtYmxvY2staGVpZ2h0J10uZXhwZWN0VWludCgxMDAwKTtcbiAgICB9XG59KVxuXG5DbGFyaW5ldC50ZXN0KHtcbiAgICBuYW1lOiBcIk1pbnQ6OkZhaWxzXCIsXG4gICAgYXN5bmMgZm4oY2hhaW46IENoYWluLCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4pIHtcbiAgICAgICAgbGV0IGRlcGxveWVyID0gYWNjb3VudHMuZ2V0KCdkZXBsb3llcicpITtcbiAgICAgICAgbGV0IHdhbGxldDEgPSBhY2NvdW50cy5nZXQoJ3dhbGxldF8xJykhO1xuICAgICAgICBcbiAgICAgICAgLy8gbm9uIHJvdW5kIGxvdCB1bmRlcmx5aW5nIHF1YW50aXR5XG4gICAgICAgIGxldCBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdtaW50JywgW3R5cGVzLnVpbnQoMTEwMDAwMDAwKSwgdHlwZXMudWludCgyMDAwMDAwKSwgdHlwZXMudWludCgxMDAwKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSk7XG4gICAgICAgIFxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMik7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RFcnIoKS5leHBlY3RVaW50KDEwMTYpO1xuXG4gICAgICAgIC8vIGJsb2NrIGhlaWdodCBpbiBwYXN0XG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ21pbnQnLCBbdHlwZXMudWludCgxMTAwMDAwMDApLCB0eXBlcy51aW50KDIwMDAwMDApLCB0eXBlcy51aW50KDEpXSwgd2FsbGV0MS5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKTtcbiAgICAgICAgXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAzKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdEVycigpLmV4cGVjdFVpbnQoMTAwNCk7IC8vIGJsb2NrIGhlaWdodCBpbiBwYXN0XG5cbiAgICAgICAgLy8gc3RyaWtlIHByaWNlIGlzIHplcm9cbiAgICAgICAgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuICAgICAgICAgICAgVHguY29udHJhY3RDYWxsKCdjb3ZlcmVkLWNhbGwnLCAnbWludCcsIFt0eXBlcy51aW50KDExMDAwMDAwMCksIHR5cGVzLnVpbnQoMCksIHR5cGVzLnVpbnQoMSldLCB3YWxsZXQxLmFkZHJlc3MpICAgICAgICAgICAgXG4gICAgICAgIF0pO1xuICAgICAgICBcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLnJlY2VpcHRzLmxlbmd0aCwgMSk7XG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5oZWlnaHQsIDQpO1xuICAgICAgICBibG9jay5yZWNlaXB0c1swXS5yZXN1bHQuZXhwZWN0RXJyKCkuZXhwZWN0VWludCgxMDA0KTsgLy8gc3RyaWtlIHByaWNlIGlzIHplcm9cbiAgICB9XG59KVxuXG5DbGFyaW5ldC50ZXN0KHtcbiAgICBuYW1lOiBcIk1pbnQ6OlR3b093bmVyc1wiLFxuICAgIGFzeW5jIGZuKGNoYWluOiBDaGFpbiwgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+KSB7XG4gICAgICAgIGxldCBkZXBsb3llciA9IGFjY291bnRzLmdldCgnZGVwbG95ZXInKSE7XG4gICAgICAgIGxldCB3YWxsZXQxID0gYWNjb3VudHMuZ2V0KCd3YWxsZXRfMScpITtcbiAgICAgICAgbGV0IHdhbGxldDIgPSBhY2NvdW50cy5nZXQoJ3dhbGxldF8yJykhO1xuICAgICAgICBcbiAgICAgICAgbGV0IGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ21pbnQnLCBbdHlwZXMudWludCgxMDAwMDAwMDApLCB0eXBlcy51aW50KDIwMDAwMDApLCB0eXBlcy51aW50KDEwMDApXSwgd2FsbGV0MS5hZGRyZXNzKSwgICAgICAgICAgICBcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ21pbnQnLCBbdHlwZXMudWludCgyMDAwMDAwMDApLCB0eXBlcy51aW50KDQwMDAwMDApLCB0eXBlcy51aW50KDIwMDApXSwgd2FsbGV0Mi5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKTtcbiAgICAgICAgXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDIpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAyKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzFdLnJlc3VsdC5leHBlY3RPaygpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvdmVyZWRDYWxsT3duZXJSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1vd25lcicsIFt0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGNvdmVyZWRDYWxsT3duZXJSZXN1bHQucmVzdWx0LmV4cGVjdE9rKCkuZXhwZWN0U29tZSgpLmV4cGVjdFByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpO1xuXG4gICAgICAgIGNvdmVyZWRDYWxsT3duZXJSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1vd25lcicsIFt0eXBlcy51aW50KDIpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGNvdmVyZWRDYWxsT3duZXJSZXN1bHQucmVzdWx0LmV4cGVjdE9rKCkuZXhwZWN0U29tZSgpLmV4cGVjdFByaW5jaXBhbCh3YWxsZXQyLmFkZHJlc3MpO1xuXG4gICAgICAgIGxldCBjb3ZlcmVkQ2FsbERhdGFSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1jb3ZlcmVkLWNhbGwtZGF0YScsIFt0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGxldCBjb3ZlcmVkQ2FsbERhdGE6IHsgW2tleTogc3RyaW5nXTogYW55IH0gPSBjb3ZlcmVkQ2FsbERhdGFSZXN1bHQucmVzdWx0LmV4cGVjdFNvbWUoKS5leHBlY3RUdXBsZSgpO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ2NvdW50ZXJwYXJ0eSddLmV4cGVjdFByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ3VuZGVybHlpbmctcXVhbnRpdHknXS5leHBlY3RVaW50KDEwMDAwMDAwMCk7XG4gICAgICAgIGNvdmVyZWRDYWxsRGF0YVsnc3RyaWtlLXByaWNlLXVzZGMnXS5leHBlY3RVaW50KDIwMDAwMDApO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ3N0cmlrZS1kYXRlLWJsb2NrLWhlaWdodCddLmV4cGVjdFVpbnQoMTAwMCk7XG5cbiAgICAgICAgY292ZXJlZENhbGxEYXRhUmVzdWx0ID0gY2hhaW4uY2FsbFJlYWRPbmx5Rm4oJ2NvdmVyZWQtY2FsbCcsICdnZXQtY292ZXJlZC1jYWxsLWRhdGEnLCBbdHlwZXMudWludCgyKV0sIGRlcGxveWVyLmFkZHJlc3MpO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGEgPSBjb3ZlcmVkQ2FsbERhdGFSZXN1bHQucmVzdWx0LmV4cGVjdFNvbWUoKS5leHBlY3RUdXBsZSgpO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ2NvdW50ZXJwYXJ0eSddLmV4cGVjdFByaW5jaXBhbCh3YWxsZXQyLmFkZHJlc3MpO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ3VuZGVybHlpbmctcXVhbnRpdHknXS5leHBlY3RVaW50KDIwMDAwMDAwMCk7XG4gICAgICAgIGNvdmVyZWRDYWxsRGF0YVsnc3RyaWtlLXByaWNlLXVzZGMnXS5leHBlY3RVaW50KDQwMDAwMDApO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ3N0cmlrZS1kYXRlLWJsb2NrLWhlaWdodCddLmV4cGVjdFVpbnQoMjAwMCk7XG4gICAgfVxufSlcblxuQ2xhcmluZXQudGVzdCh7XG4gICAgbmFtZTogXCJFeGVyY2lzZTo6U3VjY2Vzc1wiLFxuICAgIGFzeW5jIGZuKGNoYWluOiBDaGFpbiwgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+KSB7XG4gICAgICAgIGxldCBkZXBsb3llciA9IGFjY291bnRzLmdldCgnZGVwbG95ZXInKSE7XG4gICAgICAgIGxldCB3YWxsZXQxID0gYWNjb3VudHMuZ2V0KCd3YWxsZXRfMScpITtcbiAgICAgICAgbGV0IHdhbGxldDIgPSBhY2NvdW50cy5nZXQoJ3dhbGxldF8yJykhO1xuICAgICAgICBcbiAgICAgICAgbGV0IGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ21pbnQnLCBbdHlwZXMudWludCgxMDAwMDAwMDApLCB0eXBlcy51aW50KDIwMDAwMDApLCB0eXBlcy51aW50KDEwMDApXSwgd2FsbGV0MS5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKTtcbiAgICAgICAgXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAyKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgY292ZXJlZENhbGxPd25lclJlc3VsdCA9IGNoYWluLmNhbGxSZWFkT25seUZuKCdjb3ZlcmVkLWNhbGwnLCAnZ2V0LW93bmVyJywgW3R5cGVzLnVpbnQoMSldLCBkZXBsb3llci5hZGRyZXNzKTtcbiAgICAgICAgY292ZXJlZENhbGxPd25lclJlc3VsdC5yZXN1bHQuZXhwZWN0T2soKS5leHBlY3RTb21lKCkuZXhwZWN0UHJpbmNpcGFsKHdhbGxldDEuYWRkcmVzcyk7XG5cbiAgICAgICAgbGV0IGNvdmVyZWRDYWxsRGF0YVJlc3VsdCA9IGNoYWluLmNhbGxSZWFkT25seUZuKCdjb3ZlcmVkLWNhbGwnLCAnZ2V0LWNvdmVyZWQtY2FsbC1kYXRhJywgW3R5cGVzLnVpbnQoMSldLCBkZXBsb3llci5hZGRyZXNzKTtcbiAgICAgICAgY29uc3QgY292ZXJlZENhbGxEYXRhOiB7IFtrZXk6IHN0cmluZ106IGFueSB9ID0gY292ZXJlZENhbGxEYXRhUmVzdWx0LnJlc3VsdC5leHBlY3RTb21lKCkuZXhwZWN0VHVwbGUoKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWydjb3VudGVycGFydHknXS5leHBlY3RQcmluY2lwYWwod2FsbGV0MS5hZGRyZXNzKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWyd1bmRlcmx5aW5nLXF1YW50aXR5J10uZXhwZWN0VWludCgxMDAwMDAwMDApO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ3N0cmlrZS1wcmljZS11c2RjJ10uZXhwZWN0VWludCgyMDAwMDAwKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWydzdHJpa2UtZGF0ZS1ibG9jay1oZWlnaHQnXS5leHBlY3RVaW50KDEwMDApO1xuXG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoMSksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0Mi5hZGRyZXNzKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSkgICAgICAgIFxuXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAzKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG4gICAgICAgIFxuICAgICAgICBhc3NlcnROZnRUcmFuc2ZlcihibG9jay5yZWNlaXB0c1swXS5ldmVudHNbMF0sIGRlZmF1bHROZnRBc3NldENvbnRyYWN0LCAxLCB3YWxsZXQxLmFkZHJlc3MsIHdhbGxldDIuYWRkcmVzcyk7XG5cbiAgICAgICAgbGV0IGVtcHR5QmxvY2sgPSBjaGFpbi5taW5lRW1wdHlCbG9ja1VudGlsKDUwKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGVtcHR5QmxvY2suYmxvY2tfaGVpZ2h0LCA1MCk7XG5cbiAgICAgICAgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuICAgICAgICAgICAgVHguY29udHJhY3RDYWxsKCd3cmFwcGVkLXVzZGMnLCAnbWludCcsIFt0eXBlcy51aW50KDMwMDAwMDAwMCksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQyLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSlcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLnJlY2VpcHRzLmxlbmd0aCwgMSk7XG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5oZWlnaHQsIDUxKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgYXNzZXRzID0gY2hhaW4uZ2V0QXNzZXRzTWFwcygpLmFzc2V0cztcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGFzc2V0c1snU1RYJ11bd2FsbGV0MS5hZGRyZXNzXSwgOTk5OTk5MDAwMDAwMDApO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYXNzZXRzWycud3JhcHBlZC11c2RjLndyYXBwZWQtdXNkYyddW3dhbGxldDIuYWRkcmVzc10sIDMwMDAwMDAwMCk7XG5cbiAgICAgICAgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuICAgICAgICAgICAgVHguY29udHJhY3RDYWxsKCdjb3ZlcmVkLWNhbGwnLCAnZXhlcmNpc2UnLCBbdHlwZXMucHJpbmNpcGFsKHBheW1lbnRBc3NldFByaW5jaXBhbChkZXBsb3llcikpLCB0eXBlcy51aW50KDEpXSwgd2FsbGV0Mi5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKVxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgNTIpO1xuICAgICAgICBibG9jay5yZWNlaXB0c1swXS5yZXN1bHQuZXhwZWN0T2soKTtcbiAgICAgXG4gICAgICAgIGFzc2V0cyA9IGNoYWluLmdldEFzc2V0c01hcHMoKS5hc3NldHM7XG4gICAgICAgIGFzc2VydEVxdWFscyhhc3NldHNbJ1NUWCddW3dhbGxldDEuYWRkcmVzc10sIDk5OTk5OTAwMDAwMDAwKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGFzc2V0c1snU1RYJ11bd2FsbGV0Mi5hZGRyZXNzXSwgMTAwMDAwMTAwMDAwMDAwKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGFzc2V0c1snLndyYXBwZWQtdXNkYy53cmFwcGVkLXVzZGMnXVt3YWxsZXQxLmFkZHJlc3NdLCAyMDAwMDAwMDApO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYXNzZXRzWycud3JhcHBlZC11c2RjLndyYXBwZWQtdXNkYyddW3dhbGxldDIuYWRkcmVzc10sIDEwMDAwMDAwMCk7XG4gICAgfVxufSlcblxuQ2xhcmluZXQudGVzdCh7XG4gICAgbmFtZTogXCJFeGVyY2lzZTo6RmFpbHNcIixcbiAgICBhc3luYyBmbihjaGFpbjogQ2hhaW4sIGFjY291bnRzOiBNYXA8c3RyaW5nLCBBY2NvdW50Pikge1xuICAgICAgICBsZXQgZGVwbG95ZXIgPSBhY2NvdW50cy5nZXQoJ2RlcGxveWVyJykhO1xuICAgICAgICBsZXQgd2FsbGV0MSA9IGFjY291bnRzLmdldCgnd2FsbGV0XzEnKSE7XG4gICAgICAgIGxldCB3YWxsZXQyID0gYWNjb3VudHMuZ2V0KCd3YWxsZXRfMicpITtcbiAgIFxuICAgICAgICAvLyB0b2tlbi1pZCBkb2VzIG5vdCBleGlzdFxuICAgICAgICBsZXQgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuICAgICAgICAgICAgVHguY29udHJhY3RDYWxsKCdjb3ZlcmVkLWNhbGwnLCAnZXhlcmNpc2UnLCBbdHlwZXMucHJpbmNpcGFsKHBheW1lbnRBc3NldFByaW5jaXBhbChkZXBsb3llcikpLCB0eXBlcy51aW50KDEpXSwgd2FsbGV0Mi5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKVxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMik7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RFcnIoKS5leHBlY3RVaW50KDEwMDcpOyAvLyB0b2tlbiBub3QgZm91bmRcblxuICAgICAgICBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdtaW50JywgW3R5cGVzLnVpbnQoMTAwMDAwMDAwKSwgdHlwZXMudWludCgyMDAwMDAwKSwgdHlwZXMudWludCgxMDAwKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSk7XG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAzKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG5cbiAgICAgICAgLy8gdHgtc2VuZGVyIGRvZXMgbm90IG93biB0b2tlbi1pZFxuICAgICAgICBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdleGVyY2lzZScsIFt0eXBlcy5wcmluY2lwYWwocGF5bWVudEFzc2V0UHJpbmNpcGFsKGRlcGxveWVyKSksIHR5cGVzLnVpbnQoMSldLCB3YWxsZXQyLmFkZHJlc3MpICAgICAgICAgICAgXG4gICAgICAgIF0pXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCA0KTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdEVycigpLmV4cGVjdFVpbnQoMTAwMSk7IC8vIG5vdCB0b2tlbiBvd25lclxuXG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoMSksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0Mi5hZGRyZXNzKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSkgICAgICAgIFxuXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCA1KTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG5cbiAgICAgICAgLy8gdHgtc2VuZGVyIGluc3VmZmljaWVudCBmdW5kcyB0byBleGVyY2lzZVxuICAgICAgICBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdleGVyY2lzZScsIFt0eXBlcy5wcmluY2lwYWwocGF5bWVudEFzc2V0UHJpbmNpcGFsKGRlcGxveWVyKSksIHR5cGVzLnVpbnQoMSldLCB3YWxsZXQyLmFkZHJlc3MpICAgICAgICAgICAgXG4gICAgICAgIF0pXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCA2KTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdEVycigpLmV4cGVjdFVpbnQoMTAwOCk7IC8vIGluc3VmZmljaWVudCBmdW5kc1xuXG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnd3JhcHBlZC11c2RjJywgJ21pbnQnLCBbdHlwZXMudWludCgzMDAwMDAwMDApLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0Mi5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpICAgICAgICAgICAgXG4gICAgICAgIF0pXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCA3KTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG5cbiAgICAgICAgbGV0IGVtcHR5QmxvY2sgPSBjaGFpbi5taW5lRW1wdHlCbG9ja1VudGlsKDEwMDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoZW1wdHlCbG9jay5ibG9ja19oZWlnaHQsIDEwMDEpO1xuXG4gICAgICAgIC8vIGNvbnRyYWN0IGV4cGlyZWRcbiAgICAgICAgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuICAgICAgICAgICAgVHguY29udHJhY3RDYWxsKCdjb3ZlcmVkLWNhbGwnLCAnZXhlcmNpc2UnLCBbdHlwZXMucHJpbmNpcGFsKHBheW1lbnRBc3NldFByaW5jaXBhbChkZXBsb3llcikpLCB0eXBlcy51aW50KDEpXSwgd2FsbGV0Mi5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKVxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMTAwMik7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RFcnIoKS5leHBlY3RVaW50KDEwMDYpOyAvLyB0b2tlbiBleHBpcmVkXG4gICAgfVxufSlcblxuQ2xhcmluZXQudGVzdCh7XG4gICAgbmFtZTogXCJVbmRlcmx5aW5nQ2xhaW06OlN1Y2Nlc3NcIixcbiAgICBhc3luYyBmbihjaGFpbjogQ2hhaW4sIGFjY291bnRzOiBNYXA8c3RyaW5nLCBBY2NvdW50Pikge1xuICAgICAgICBsZXQgZGVwbG95ZXIgPSBhY2NvdW50cy5nZXQoJ2RlcGxveWVyJykhO1xuICAgICAgICBsZXQgd2FsbGV0MSA9IGFjY291bnRzLmdldCgnd2FsbGV0XzEnKSE7XG4gICAgICAgIGxldCB3YWxsZXQyID0gYWNjb3VudHMuZ2V0KCd3YWxsZXRfMicpITtcbiAgICAgICAgXG4gICAgICAgIGxldCBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdtaW50JywgW3R5cGVzLnVpbnQoMTAwMDAwMDAwKSwgdHlwZXMudWludCgyMDAwMDAwKSwgdHlwZXMudWludCgxMDAwKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSk7XG4gICAgICAgIFxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMik7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RPaygpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvdmVyZWRDYWxsT3duZXJSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ2dldC1vd25lcicsIFt0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcyk7XG4gICAgICAgIGNvdmVyZWRDYWxsT3duZXJSZXN1bHQucmVzdWx0LmV4cGVjdE9rKCkuZXhwZWN0U29tZSgpLmV4cGVjdFByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpO1xuXG4gICAgICAgIGxldCBhc3NldHMgPSBjaGFpbi5nZXRBc3NldHNNYXBzKCkuYXNzZXRzO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYXNzZXRzWydTVFgnXVt3YWxsZXQxLmFkZHJlc3NdLCA5OTk5OTkwMDAwMDAwMCk7XG5cbiAgICAgICAgbGV0IGNvdmVyZWRDYWxsRGF0YVJlc3VsdCA9IGNoYWluLmNhbGxSZWFkT25seUZuKCdjb3ZlcmVkLWNhbGwnLCAnZ2V0LWNvdmVyZWQtY2FsbC1kYXRhJywgW3R5cGVzLnVpbnQoMSldLCBkZXBsb3llci5hZGRyZXNzKTtcbiAgICAgICAgY29uc3QgY292ZXJlZENhbGxEYXRhOiB7IFtrZXk6IHN0cmluZ106IGFueSB9ID0gY292ZXJlZENhbGxEYXRhUmVzdWx0LnJlc3VsdC5leHBlY3RTb21lKCkuZXhwZWN0VHVwbGUoKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWydjb3VudGVycGFydHknXS5leHBlY3RQcmluY2lwYWwod2FsbGV0MS5hZGRyZXNzKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWyd1bmRlcmx5aW5nLXF1YW50aXR5J10uZXhwZWN0VWludCgxMDAwMDAwMDApO1xuICAgICAgICBjb3ZlcmVkQ2FsbERhdGFbJ3N0cmlrZS1wcmljZS11c2RjJ10uZXhwZWN0VWludCgyMDAwMDAwKTtcbiAgICAgICAgY292ZXJlZENhbGxEYXRhWydzdHJpa2UtZGF0ZS1ibG9jay1oZWlnaHQnXS5leHBlY3RVaW50KDEwMDApO1xuXG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoMSksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0Mi5hZGRyZXNzKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSkgICAgICAgIFxuXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAzKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG4gICAgICAgIFxuICAgICAgICBhc3NlcnROZnRUcmFuc2ZlcihibG9jay5yZWNlaXB0c1swXS5ldmVudHNbMF0sIGRlZmF1bHROZnRBc3NldENvbnRyYWN0LCAxLCB3YWxsZXQxLmFkZHJlc3MsIHdhbGxldDIuYWRkcmVzcyk7XG5cbiAgICAgICAgbGV0IGVtcHR5QmxvY2sgPSBjaGFpbi5taW5lRW1wdHlCbG9ja1VudGlsKDEwMDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoZW1wdHlCbG9jay5ibG9ja19oZWlnaHQsIDEwMDEpO1xuXG4gICAgICAgIGxldCBjbGFpbWFibGVSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ3VuZGVybHlpbmctaXMtY2xhaW1hYmxlJywgW3R5cGVzLnVpbnQoMSldLCB3YWxsZXQxLmFkZHJlc3MpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoY2xhaW1hYmxlUmVzdWx0LnJlc3VsdCwgJ3RydWUnKTtcblxuICAgICAgICBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdjb3VudGVycGFydHktcmVjbGFpbS11bmRlcmx5aW5nLW1hbnknLCBbdHlwZXMubGlzdChbdHlwZXMudWludCgxKV0pXSwgd2FsbGV0MS5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKSAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAxKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMTAwMik7XG4gICAgICAgIGJsb2NrLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RPaygpO1xuXG4gICAgICAgIGFzc2V0cyA9IGNoYWluLmdldEFzc2V0c01hcHMoKS5hc3NldHM7XG4gICAgICAgIGFzc2VydEVxdWFscyhhc3NldHNbJ1NUWCddW3dhbGxldDEuYWRkcmVzc10sIDEwMDAwMDAwMDAwMDAwMCk7XG4gICAgfVxufSlcblxuQ2xhcmluZXQudGVzdCh7XG4gICAgbmFtZTogXCJVbmRlcmx5aW5nQ2xhaW06OkZhaWx1cmVzXCIsXG4gICAgYXN5bmMgZm4oY2hhaW46IENoYWluLCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4pIHtcbiAgICAgICAgbGV0IGRlcGxveWVyID0gYWNjb3VudHMuZ2V0KCdkZXBsb3llcicpITtcbiAgICAgICAgbGV0IHdhbGxldDEgPSBhY2NvdW50cy5nZXQoJ3dhbGxldF8xJykhO1xuICAgICAgICBsZXQgd2FsbGV0MiA9IGFjY291bnRzLmdldCgnd2FsbGV0XzInKSE7XG4gICAgICAgIFxuICAgICAgICBsZXQgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuICAgICAgICAgICAgVHguY29udHJhY3RDYWxsKCdjb3ZlcmVkLWNhbGwnLCAnbWludCcsIFt0eXBlcy51aW50KDEwMDAwMDAwMCksIHR5cGVzLnVpbnQoMjAwMDAwMCksIHR5cGVzLnVpbnQoMTAwMCldLCB3YWxsZXQxLmFkZHJlc3MpICAgICAgICAgICAgXG4gICAgICAgIF0pO1xuICAgICAgICBcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLnJlY2VpcHRzLmxlbmd0aCwgMSk7XG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5oZWlnaHQsIDIpO1xuICAgICAgICBibG9jay5yZWNlaXB0c1swXS5yZXN1bHQuZXhwZWN0T2soKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb3ZlcmVkQ2FsbE93bmVyUmVzdWx0ID0gY2hhaW4uY2FsbFJlYWRPbmx5Rm4oJ2NvdmVyZWQtY2FsbCcsICdnZXQtb3duZXInLCBbdHlwZXMudWludCgxKV0sIGRlcGxveWVyLmFkZHJlc3MpO1xuICAgICAgICBjb3ZlcmVkQ2FsbE93bmVyUmVzdWx0LnJlc3VsdC5leHBlY3RPaygpLmV4cGVjdFNvbWUoKS5leHBlY3RQcmluY2lwYWwod2FsbGV0MS5hZGRyZXNzKTtcblxuICAgICAgICBsZXQgYXNzZXRzID0gY2hhaW4uZ2V0QXNzZXRzTWFwcygpLmFzc2V0cztcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGFzc2V0c1snU1RYJ11bd2FsbGV0MS5hZGRyZXNzXSwgOTk5OTk5MDAwMDAwMDApO1xuXG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoMSksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0Mi5hZGRyZXNzKV0sIHdhbGxldDEuYWRkcmVzcykgICAgICAgICAgICBcbiAgICAgICAgXSkgICAgICAgIFxuXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAzKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdE9rKCk7XG4gICAgICAgIFxuICAgICAgICBhc3NlcnROZnRUcmFuc2ZlcihibG9jay5yZWNlaXB0c1swXS5ldmVudHNbMF0sIGRlZmF1bHROZnRBc3NldENvbnRyYWN0LCAxLCB3YWxsZXQxLmFkZHJlc3MsIHdhbGxldDIuYWRkcmVzcyk7XG5cbiAgICAgICAgLy8gaWQgbm90IGZvdW5kXG4gICAgICAgIGxldCBjbGFpbWFibGVSZXN1bHQgPSBjaGFpbi5jYWxsUmVhZE9ubHlGbignY292ZXJlZC1jYWxsJywgJ3VuZGVybHlpbmctaXMtY2xhaW1hYmxlJywgW3R5cGVzLnVpbnQoMildLCB3YWxsZXQxLmFkZHJlc3MpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoY2xhaW1hYmxlUmVzdWx0LnJlc3VsdCwgJ2ZhbHNlJyk7XG4gICAgICAgIGJsb2NrID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIFR4LmNvbnRyYWN0Q2FsbCgnY292ZXJlZC1jYWxsJywgJ2NvdW50ZXJwYXJ0eS1yZWNsYWltLXVuZGVybHlpbmctbWFueScsIFt0eXBlcy5saXN0KFt0eXBlcy51aW50KDIpXSldLCB3YWxsZXQxLmFkZHJlc3MpICAgICAgICAgICAgXG4gICAgICAgIF0pICAgICAgICBcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGJsb2NrLnJlY2VpcHRzLmxlbmd0aCwgMSk7XG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5oZWlnaHQsIDQpO1xuICAgICAgICBibG9jay5yZWNlaXB0c1swXS5yZXN1bHQuZXhwZWN0RXJyKCkuZXhwZWN0VWludCgxMDA3KTsgLy8gaWQgbm90IGZvdW5kXG5cbiAgICAgICAgLy8gbm90IGV4cGlyZWRcbiAgICAgICAgY2xhaW1hYmxlUmVzdWx0ID0gY2hhaW4uY2FsbFJlYWRPbmx5Rm4oJ2NvdmVyZWQtY2FsbCcsICd1bmRlcmx5aW5nLWlzLWNsYWltYWJsZScsIFt0eXBlcy51aW50KDEpXSwgd2FsbGV0MS5hZGRyZXNzKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGNsYWltYWJsZVJlc3VsdC5yZXN1bHQsICdmYWxzZScpO1xuICAgICAgICBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdjb3VudGVycGFydHktcmVjbGFpbS11bmRlcmx5aW5nLW1hbnknLCBbdHlwZXMubGlzdChbdHlwZXMudWludCgxKV0pXSwgd2FsbGV0MS5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKSAgICAgICAgXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCA1KTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdEVycigpLmV4cGVjdFVpbnQoMTAxNCk7IC8vIG5vdCBleHBpcmVkXG5cbiAgICAgICAgbGV0IGVtcHR5QmxvY2sgPSBjaGFpbi5taW5lRW1wdHlCbG9ja1VudGlsKDEwMDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoZW1wdHlCbG9jay5ibG9ja19oZWlnaHQsIDEwMDEpO1xuXG4gICAgICAgIC8vIG5vdCBjb3VudGVycGFydHlcbiAgICAgICAgY2xhaW1hYmxlUmVzdWx0ID0gY2hhaW4uY2FsbFJlYWRPbmx5Rm4oJ2NvdmVyZWQtY2FsbCcsICd1bmRlcmx5aW5nLWlzLWNsYWltYWJsZScsIFt0eXBlcy51aW50KDEpXSwgd2FsbGV0Mi5hZGRyZXNzKTtcbiAgICAgICAgYXNzZXJ0RXF1YWxzKGNsYWltYWJsZVJlc3VsdC5yZXN1bHQsICdmYWxzZScpO1xuICAgICAgICBibG9jayA9IGNoYWluLm1pbmVCbG9jayhbXG4gICAgICAgICAgICBUeC5jb250cmFjdENhbGwoJ2NvdmVyZWQtY2FsbCcsICdjb3VudGVycGFydHktcmVjbGFpbS11bmRlcmx5aW5nLW1hbnknLCBbdHlwZXMubGlzdChbdHlwZXMudWludCgxKV0pXSwgd2FsbGV0Mi5hZGRyZXNzKSAgICAgICAgICAgIFxuICAgICAgICBdKSAgICAgICAgXG4gICAgICAgIGFzc2VydEVxdWFscyhibG9jay5yZWNlaXB0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnRFcXVhbHMoYmxvY2suaGVpZ2h0LCAxMDAyKTtcbiAgICAgICAgYmxvY2sucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdEVycigpLmV4cGVjdFVpbnQoMTAxNSk7IC8vIG5vdCBjb3VudGVycGFydHlcbiAgICB9XG59KVxuXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxRQUFRLEVBQUUsRUFBRSxFQUFrQixLQUFLLFFBQVEsK0NBQStDLENBQUM7QUFDcEcsU0FBUyxZQUFZLFFBQVEsaURBQWlELENBQUM7QUFFL0UsTUFBTSxZQUFZLEdBQUcsY0FBYyxBQUFDO0FBQ3BDLE1BQU0sdUJBQXVCLEdBQUcsY0FBYyxBQUFDO0FBQy9DLE1BQU0sMkJBQTJCLEdBQUcsY0FBYyxBQUFDO0FBRW5ELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxRQUFpQixHQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxBQUFDO0FBQ3ZGLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxRQUFpQixHQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxD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