import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Mint::Success",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet2 = accounts.get('wallet_2')!;

        let totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(0)

        let block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(123456), types.principal(wallet2.address)], deployer.address)            
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();

        totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(123456); 

        let wallet2Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(123456); 
    }
})

Clarinet.test({
    name: "Mint::Failure::NotContractOwner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet2 = accounts.get('wallet_2')!;

        let totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(0)

        let block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(123456), types.principal(wallet2.address)], wallet2.address)            
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectErr().expectUint(100);

        totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(0); 
    }
})

Clarinet.test({
    name: "Transfer::Success",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;

        let totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(0)

        let block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(123456), types.principal(wallet1.address)], deployer.address)            
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();

        totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(123456); 

        let wallet1Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(123456); 

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'transfer', [types.uint(7337), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet1.address)            
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectOk();

        wallet1Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(123456-7337); 

        let wallet2Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(7337); 
    }
});

Clarinet.test({
    name: "Transfer::Failure::Invalid Owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;

        let totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(0)

        let block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(123456), types.principal(wallet1.address)], deployer.address)            
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();

        totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(123456); 

        let wallet1Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(123456); 

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'transfer', [types.uint(7337), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet2.address)            
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        block.receipts[0].result.expectErr().expectUint(101);

        wallet1Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(123456); 

        let wallet2Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(0); 
    }
});

Clarinet.test({
    name: "Transfer::Failure::Insufficient Balace",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get('deployer')!;
        let wallet1 = accounts.get('wallet_1')!;
        let wallet2 = accounts.get('wallet_2')!;

        let totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(0)

        let block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'mint', [types.uint(123456), types.principal(wallet1.address)], deployer.address)            
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        block.receipts[0].result.expectOk();

        totalSupply = chain.callReadOnlyFn('wrapped-usdc', 'get-total-supply', [], deployer.address);
        totalSupply.result.expectOk().expectUint(123456); 

        let wallet1Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(123456); 

        block = chain.mineBlock([
            Tx.contractCall('wrapped-usdc', 'transfer', [types.uint(73377337), types.principal(wallet1.address), types.principal(wallet2.address), types.none()], wallet1.address)            
        ]);
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 3);
        ;;https://docs.stacks.co/references/language-functions#ft-transfer
        block.receipts[0].result.expectErr().expectUint(1);  

        wallet1Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet1.address)], wallet1.address);
        wallet1Balance.result.expectOk().expectUint(123456); 

        let wallet2Balance = chain.callReadOnlyFn('wrapped-usdc', 'get-balance', [types.principal(wallet2.address)], wallet2.address);
        wallet2Balance.result.expectOk().expectUint(0); 
    }
});
