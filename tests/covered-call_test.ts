import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const contractName = 'covered-call';
const defaultNftAssetContract = 'covered-call';
const defaultPaymentAssetContract = 'wrapped-usdc';

const contractPrincipal = (deployer: Account) => `${deployer.address}.${contractName}`;
const paymentAssetPrincipal = (deployer: Account) => `${deployer.address}.${defaultPaymentAssetContract}`;

interface Sip009NftTransferEvent {
    type: string,
    nft_transfer_event: {
        asset_identifier: any,
        sender: any,
        recipient: any,
        value: any
    }
}

function assertNftTransfer(event: Sip009NftTransferEvent, nftAssetContract: string, tokenId: number, sender: string, recipient: string) {
    assertEquals(typeof event, 'object');
    assertEquals(event.type, 'nft_transfer_event');
    assertEquals(event.nft_transfer_event.asset_identifier.split('.')[1].substr(0, nftAssetContract.length), nftAssetContract);
    event.nft_transfer_event.sender.expectPrincipal(sender);
    event.nft_transfer_event.recipient.expectPrincipal(recipient);
    event.nft_transfer_event.value.expectUint(tokenId);
}

Clarinet.test({
    name: "GetOwner::Failure::Invalid Id",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectNone();
    }
})

Clarinet.test({
    name: "Mint::Success",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100000000), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(1)], deployer.address);
        const coveredCallData: { [key: string]: any } = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
    }
})

Clarinet.test({
    name: "Mint::Fails",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        
        // non round lot underlying quantity
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(110000000), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectErr().expectUint(1016);

        // block height in past
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(110000000), types.uint(2000000), types.uint(1)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectErr().expectUint(1004); // block height in past

        // strike price is zero
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(110000000), types.uint(0), types.uint(1)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        block.receipts[0].result.expectErr().expectUint(1004); // strike price is zero
    }
})

Clarinet.test({
    name: "Mint::TwoOwners",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100000000), types.uint(2000000), types.uint(1000)], wallet1.address),            
            Tx.contractCall('covered-call', 'mint', [types.uint(200000000), types.uint(4000000), types.uint(2000)], wallet2.address)            
        ]);
        
        assertEquals(block.receipts.length, 2);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        block.receipts[1].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(2)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet2.address);

        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(1)], deployer.address);
        let coveredCallData: { [key: string]: any } = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);

        coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(2)], deployer.address);
        coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet2.address);
        coveredCallData['underlying-quantity'].expectUint(200000000);
        coveredCallData['strike-price-usdc'].expectUint(4000000);
        coveredCallData['strike-date-block-height'].expectUint(2000);
    }
})

Clarinet.test({
    name: "Exercise::Success",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100000000), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(1)], deployer.address);
        const coveredCallData: { [key: string]: any } = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [types.uint(1), types.principal(wallet1.address), types.principal(wallet2.address)], wallet1.address)            
        ])        

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);

        let emptyBlock = chain.mineEmptyBlockUntil(50);
        assertEquals(emptyBlock.block_height, 50);

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(300000000), types.principal(wallet2.address)], deployer.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 51);
        block.receipts[0].result.expectOk();
        
        let assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);
        assertEquals(assets['.wrapped-usdc.wrapped-usdc'][wallet2.address], 300000000);

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [types.principal(paymentAssetPrincipal(deployer)), types.uint(1)], wallet2.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 52);
        block.receipts[0].result.expectOk();
     
        assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);
        assertEquals(assets['STX'][wallet2.address], 100000100000000);
        assertEquals(assets['.wrapped-usdc.wrapped-usdc'][wallet1.address], 200000000);
        assertEquals(assets['.wrapped-usdc.wrapped-usdc'][wallet2.address], 100000000);
    }
})

Clarinet.test({
    name: "Exercise::Fails",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
   
        // token-id does not exist
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [types.principal(paymentAssetPrincipal(deployer)), types.uint(1)], wallet2.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectErr().expectUint(1007); // token not found

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100000000), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();

        // tx-sender does not own token-id
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [types.principal(paymentAssetPrincipal(deployer)), types.uint(1)], wallet2.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        block.receipts[0].result.expectErr().expectUint(1001); // not token owner

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [types.uint(1), types.principal(wallet1.address), types.principal(wallet2.address)], wallet1.address)            
        ])        

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 5);
        block.receipts[0].result.expectOk();

        // tx-sender insufficient funds to exercise
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [types.principal(paymentAssetPrincipal(deployer)), types.uint(1)], wallet2.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 6);
        block.receipts[0].result.expectErr().expectUint(1008); // insufficient funds

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(300000000), types.principal(wallet2.address)], deployer.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 7);
        block.receipts[0].result.expectOk();

        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);

        // contract expired
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'exercise', [types.principal(paymentAssetPrincipal(deployer)), types.uint(1)], wallet2.address)            
        ])
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 1002);
        block.receipts[0].result.expectErr().expectUint(1006); // token expired
    }
})

Clarinet.test({
    name: "UnderlyingClaim::Success",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100000000), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        let assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);

        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(1)], deployer.address);
        const coveredCallData: { [key: string]: any } = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100000000);
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [types.uint(1), types.principal(wallet1.address), types.principal(wallet2.address)], wallet1.address)            
        ])        

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);

        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);

        let claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [types.uint(1)], wallet1.address);
        assertEquals(claimableResult.result, 'true');

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [types.list([types.uint(1)])], wallet1.address)            
        ])        
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 1002);
        block.receipts[0].result.expectOk();

        assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 100000000000000);
    }
})

Clarinet.test({
    name: "UnderlyingClaim::Failures",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100000000), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        let assets = chain.getAssetsMaps().assets;
        assertEquals(assets['STX'][wallet1.address], 99999900000000);

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [types.uint(1), types.principal(wallet1.address), types.principal(wallet2.address)], wallet1.address)            
        ])        

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);

        // id not found
        let claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [types.uint(2)], wallet1.address);
        assertEquals(claimableResult.result, 'false');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [types.list([types.uint(2)])], wallet1.address)            
        ])        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 4);
        block.receipts[0].result.expectErr().expectUint(1007); // id not found

        // not expired
        claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [types.uint(1)], wallet1.address);
        assertEquals(claimableResult.result, 'false');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [types.list([types.uint(1)])], wallet1.address)            
        ])        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 5);
        block.receipts[0].result.expectErr().expectUint(1014); // not expired

        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);

        // not counterparty
        claimableResult = chain.callReadOnlyFn('covered-call', 'underlying-is-claimable', [types.uint(1)], wallet2.address);
        assertEquals(claimableResult.result, 'false');
        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'counterparty-reclaim-underlying-many', [types.list([types.uint(1)])], wallet2.address)            
        ])        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 1002);
        block.receipts[0].result.expectErr().expectUint(1015); // not counterparty
    }
})

