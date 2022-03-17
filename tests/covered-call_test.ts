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
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);
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
        coveredCallData['strike-price-usdc'].expectUint(2000000);
        coveredCallData['strike-date-block-height'].expectUint(1000);

        coveredCallDataResult = chain.callReadOnlyFn('covered-call', 'get-covered-call-data', [types.uint(2)], deployer.address);
        coveredCallData = coveredCallDataResult.result.expectSome().expectTuple();
        coveredCallData['counterparty'].expectPrincipal(wallet2.address);
        coveredCallData['underlying-quantity'].expectUint(200);
        coveredCallData['strike-price-usdc'].expectUint(4000000);
        coveredCallData['strike-date-block-height'].expectUint(2000);
    }
})

Clarinet.test({
    name: "Mint::SuccessTransfer",
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

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(300000000), types.principal(wallet2.address)], deployer.address)            
        ])
        
        assertEquals(chain.getAssetsMaps().assets['.wrapped-usdc.wrapped-usdc']['ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'], 300000000);
    }
})


