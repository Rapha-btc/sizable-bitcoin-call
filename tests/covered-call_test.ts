import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const contractName = 'covered-call';
const defaultNftAssetContract = 'covered-call';
const defaultPaymentAssetContract = 'wrapped-usdc';

const contractPrincipal = (deployer: Account) => `${deployer.address}.${contractName}`;

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
    console.log(event.nft_transfer_event.asset_identifier);
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
            Tx.contractCall('covered-call', 'mint', [types.uint(100), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(1)], deployer.address);
        const coveredCallData: { [key: string]: any } = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100);
        coveredCallData['strike-price-wrapped-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
        coveredCallData['is-exercised'].expectBool(false);

        let counterPartyTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-token-ids', [types.principal(wallet1.address)], deployer.address);
        const counterPartyTokenIds: any[ ] = counterPartyTokenIdsResult.result.expectSome().expectList();
        assertEquals(counterPartyTokenIds.length, 1);
        counterPartyTokenIds[0].expectUint(1);
    }
})

Clarinet.test({
    name: "Mint::TwoOwners",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100), types.uint(2000000), types.uint(1000)], wallet1.address),            
            Tx.contractCall('covered-call', 'mint', [types.uint(200), types.uint(4000000), types.uint(2000)], wallet2.address)            
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
        coveredCallData['underlying-quantity'].expectUint(100);
        coveredCallData['strike-price-wrapped-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
        coveredCallData['is-exercised'].expectBool(false);

        let counterPartyTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-token-ids', [types.principal(wallet1.address)], deployer.address);
        let counterPartyTokenIds: any[ ] = counterPartyTokenIdsResult.result.expectSome().expectList();
        assertEquals(counterPartyTokenIds.length, 1);
        counterPartyTokenIds[0].expectUint(1);

        coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(2)], deployer.address);
        coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet2.address);
        coveredCallData['underlying-quantity'].expectUint(200);
        coveredCallData['strike-price-wrapped-usdc'].expectUint(4000000);
        coveredCallData['strike-date-block-height'].expectUint(2000);
        coveredCallData['is-exercised'].expectBool(false);

        counterPartyTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-token-ids', [types.principal(wallet2.address)], deployer.address);
        counterPartyTokenIds = counterPartyTokenIdsResult.result.expectSome().expectList();
        assertEquals(counterPartyTokenIds.length, 1);
        counterPartyTokenIds[0].expectUint(2);
    }
})

Clarinet.test({
    name: "Mint::DifferentExpirations",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100), types.uint(2000000), types.uint(2)], wallet1.address),
            Tx.contractCall('covered-call', 'mint', [types.uint(100), types.uint(3000000), types.uint(2)], wallet2.address)            
        ]);
        
        assertEquals(block.receipts.length, 2);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100), types.uint(2000000), types.uint(4)], wallet1.address)
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();

        let counterPartyTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-token-ids', [types.principal(wallet1.address)], deployer.address);
        const counterPartyTokenIds: any[ ] = counterPartyTokenIdsResult.result.expectSome().expectList();
        assertEquals(counterPartyTokenIds.length, 2);
        counterPartyTokenIds[0].expectUint(1);
        counterPartyTokenIds[1].expectUint(3); // wallet2 minted token-id 2 so it is not in list

        let counterPartyExpiredTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-expired-token-ids', [types.principal(wallet1.address)], deployer.address);
        let counterPartyExpiredTokenIds: any[ ] = counterPartyExpiredTokenIdsResult.result.expectList();
        assertEquals(counterPartyExpiredTokenIds.length, 1);
        counterPartyExpiredTokenIds[0].expectUint(1);

        let emptyBlock = chain.mineEmptyBlock(1);
        assertEquals(emptyBlock.block_height, 4); // no change to exired list, we have not advanced far enough

        counterPartyExpiredTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-expired-token-ids', [types.principal(wallet1.address)], deployer.address);
        counterPartyExpiredTokenIds = counterPartyExpiredTokenIdsResult.result.expectList();
        assertEquals(counterPartyExpiredTokenIds.length, 1); // only first token in list
        counterPartyExpiredTokenIds[0].expectUint(1);

        emptyBlock = chain.mineEmptyBlock(1);
        assertEquals(emptyBlock.block_height, 5); // second token now expired

        counterPartyExpiredTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-expired-token-ids', [types.principal(wallet1.address)], deployer.address);
        counterPartyExpiredTokenIds = counterPartyExpiredTokenIdsResult.result.expectList();
        assertEquals(counterPartyExpiredTokenIds.length, 2); // both tokens now in list
        counterPartyExpiredTokenIds[0].expectUint(1);
        counterPartyExpiredTokenIds[1].expectUint(3);
    }
})


Clarinet.test({
    name: "Mint::SuccessTransferAndExercise",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('covered-call', 'mint', [types.uint(100), types.uint(2000000), types.uint(1000)], wallet1.address)            
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();
        
        let coveredCallOwnerResult = chain.callReadOnlyFn('covered-call', 'get-owner', [types.uint(1)], deployer.address);
        coveredCallOwnerResult.result.expectOk().expectSome().expectPrincipal(wallet1.address);

        let coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(1)], deployer.address);
        const coveredCallData: { [key: string]: any } = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet1.address);
        coveredCallData['underlying-quantity'].expectUint(100);
        coveredCallData['strike-price-wrapped-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
        coveredCallData['is-exercised'].expectBool(false);

        let counterPartyTokenIdsResult = chain.callReadOnlyFn('covered-call', 'get-counterparty-token-ids', [types.principal(wallet1.address)], deployer.address);
        const counterPartyTokenIds: any[ ] = counterPartyTokenIdsResult.result.expectSome().expectList();
        assertEquals(counterPartyTokenIds.length, 1);
        counterPartyTokenIds[0].expectUint(1);

        block = chain.mineBlock([
            Tx.contractCall('covered-call', 'transfer', [types.uint(1), types.principal(wallet1.address), types.principal(wallet2.address)], wallet1.address)            
        ])        

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();
        
        assertNftTransfer(block.receipts[0].events[0], defaultNftAssetContract, 1, wallet1.address, wallet2.address);

        let emptyBlock = chain.mineEmptyBlockUntil(1001);
        assertEquals(emptyBlock.block_height, 1001);

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(300000000), types.principal(wallet2.address)], deployer.address)            
        ])
        
        assertEquals(chain.getAssetsMaps().assets['.wrapped-usdc.wrapped-usdc']['ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'], 300000000);
    }
})


