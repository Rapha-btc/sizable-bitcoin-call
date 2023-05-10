
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.5.4/index.ts';
import { assertEquals } from 'https://deno.land/std@0.170.0/testing/asserts.ts';
// import { ClarityValue } from '@stacks/transactions';

// Define the createResponse function
// function createResponse(isOk: boolean): ClarityValue {
//   if (isOk) {
//     return {
//       type: 'response',
//       success: true,
//       value: { type: 'bool', value: true },
//     };
//   } else {
//     return {
//       type: 'response',
//       success: false,
//       value: { type: 'uint', value: 1 },
//     };
//   }
// }

Clarinet.test({
    name: "First few tests - need to catch errors - deployer transfers u5 - wallet1 exercises u5 - advance - Deployer re-claims u2",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!;
        let wallet1 = accounts.get("wallet_1")!;
        let wallet2 = accounts.get("wallet_2")!;
        const contractAddress = deployer.address + '.sbtc';
        const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';

        let block1 = chain.mineBlock([
            // print myself 0.19 SBTC, a call option locks 0.03 sBTC
Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
                    // print 5 sBTC call options strike 1000 STX each
Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
            // Transfer u1 u3 and u5 to wallet 1
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
            // Idea: create a function that transfers a list of tokens in 1 go!
        ]);
        // // print the munitions sBTC
        // console.log("printing 19m sats........", block1.receipts[0].events);
        // console.log("result of printing........", block1.receipts[0].result);
        // // print the calls
        // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
        // transfer u1 u3 and u5 to wallet 1
        console.log("1 - 22222222222222........", block1.receipts[2].events);
        console.log("3 - 333333333333333........", block1.receipts[3].events);
        console.log("5 - 44444444444444........", block1.receipts[4].events);

        // console.log("print the height...", block1.height);
        // assertEquals(block1.height, 3);

        let block2 = chain.mineBlock([
        // exercise u5
Tx.contractCall('sizeable-bitcoin-call', 'exercise', [types.principal(contractAddress), types.uint(5)], wallet1.address)
 // where is the Xbtc contract?
        ]); 
        console.log("printing exercising u5........", block2.receipts[0].events);
        console.log("printing exercising u5........", block2.receipts[0].result);
        
        // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
        // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market

        console.log("Print the height of block 2...", block2.height);

        chain.mineEmptyBlock(2100); // options expired now!
        let block3 = chain.mineBlock([
        // reclaim u2 baby!
// Tx.contractCall('sizeable-bitcoin-call', 'reclaim-yy', [types.uint(2), "(ok true)"], deployer.address)
// not able to run the line above?
Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(2)], deployer.address)
        ]); 
        console.log("reclaiming u2........", block3.receipts[0].events);
        console.log("reclaiming u2 result........", block3.receipts[0].result);
        console.log("Print the height of block 3...", block3.height);
        // // act: perform actions related to the current test
        // let block = chain.mineBlock([
        //     /*
        //      * Add transactions with:
        //      * Tx.contractCall(...)
        //     */
        // ]);

        // // assert: review returned data, contract state, and other requirements
        // assertEquals(block.receipts.length, 0);
        // assertEquals(block.height, 2);

        // // TODO
        // assertEquals("TODO", "a complete test");
    },
});


Clarinet.test({
    name: " Wallet1 exercises them all in 1 go (1, 3 and 5) ",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!;
        let wallet1 = accounts.get("wallet_1")!;
        let wallet2 = accounts.get("wallet_2")!;
        const contractAddress = deployer.address + '.sbtc';
        const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';

        let block1 = chain.mineBlock([
            // print myself 0.19 SBTC, a call option locks 0.03 sBTC
Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
                    // print 5 sBTC call options strike 1000 STX each
Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
            // Transfer u1 u3 and u5 to wallet 1
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
            // Idea: create a function that transfers a list of tokens in 1 go!
        ]);
        // // print the munitions sBTC
        // console.log("printing 19m sats........", block1.receipts[0].events);
        // console.log("result of printing........", block1.receipts[0].result);
        // // print the calls
        // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
        // transfer u1 u3 and u5 to wallet 1
        // console.log("1 - 22222222222222........", block1.receipts[2].events);
        // console.log("3 - 333333333333333........", block1.receipts[3].events);
        // console.log("5 - 44444444444444........", block1.receipts[4].events);

        // console.log("print the height...", block1.height);
        // assertEquals(block1.height, 3);

        let block2 = chain.mineBlock([
        // exercise u5
Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
 // where is the Xbtc contract?
        ]); 
        console.log("printing exercising u1........", block2.receipts[0].events);
        // console.log("printing exercising u3........", block2.receipts[1].events);
        // console.log("printing exercising u5........", block2.receipts[2].events);
        
        // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
        // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market

        console.log("Print the height of block 2...", block2.height);

        chain.mineEmptyBlock(2100); // options expired now!
        let block3 = chain.mineBlock([
Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(1)], deployer.address)
]); 
        block3.receipts[0].result.expectErr().expectUint(1007); // token id not found because it was exercised and burnt so deployer cannot reclaim it
},
});

Clarinet.test({
    name: " Deployer cannot reclaim option which is not expired ",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!;
        let wallet1 = accounts.get("wallet_1")!;
        let wallet2 = accounts.get("wallet_2")!;
        const contractAddress = deployer.address + '.sbtc';
        const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';

        let block1 = chain.mineBlock([
            // print myself 0.19 SBTC, a call option locks 0.03 sBTC
Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
                    // print 5 sBTC call options strike 1000 STX each
Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
            // Transfer u1 u3 and u5 to wallet 1
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
            // Idea: create a function that transfers a list of tokens in 1 go!
        ]);
        // // print the munitions sBTC
        // console.log("printing 19m sats........", block1.receipts[0].events);
        // console.log("result of printing........", block1.receipts[0].result);
        // // print the calls
        // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
        // transfer u1 u3 and u5 to wallet 1
        // console.log("1 - 22222222222222........", block1.receipts[2].events);
        // console.log("3 - 333333333333333........", block1.receipts[3].events);
        // console.log("5 - 44444444444444........", block1.receipts[4].events);

        // console.log("print the height...", block1.height);
        // assertEquals(block1.height, 3);

//         let block2 = chain.mineBlock([
//         // exercise u5
// Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
//  // where is the Xbtc contract?
//         ]); 
//         console.log("printing exercising u1........", block2.receipts[0].events);
        // console.log("printing exercising u3........", block2.receipts[1].events);
        // console.log("printing exercising u5........", block2.receipts[2].events);
        
        // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
        // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market

        // console.log("Print the height of block 2...", block2.height);

        // chain.mineEmptyBlock(2100); // options expired now!
        let block3 = chain.mineBlock([
Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(1)], deployer.address)
]); 
        block3.receipts[0].result.expectErr().expectUint(1012); // deployer cannot reclaim it as it desn't belong to him and it's not expired
},
});

Clarinet.test({
    name: " Testing the reclaim them all",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!;
        let wallet1 = accounts.get("wallet_1")!;
        let wallet2 = accounts.get("wallet_2")!;
        const contractAddress = deployer.address + '.sbtc';
        const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';

        let block1 = chain.mineBlock([
            // print myself 0.19 SBTC, a call option locks 0.03 sBTC
Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
                    // print 5 sBTC call options strike 1000 STX each
Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
            // Transfer u1 u3 and u5 to wallet 1
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
            // Idea: create a function that transfers a list of tokens in 1 go!
        ]);
        // // print the munitions sBTC
        // console.log("printing 19m sats........", block1.receipts[0].events);
        // console.log("result of printing........", block1.receipts[0].result);
        // // print the calls
        // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
        // transfer u1 u3 and u5 to wallet 1
        // console.log("1 - 22222222222222........", block1.receipts[2].events);
        // console.log("3 - 333333333333333........", block1.receipts[3].events);
        // console.log("5 - 44444444444444........", block1.receipts[4].events);

        // console.log("print the height...", block1.height);
        // assertEquals(block1.height, 3);

        let block2 = chain.mineBlock([
        // exercise u5
Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
 // where is the Xbtc contract?
        ]); 
        console.log("printing exercising u1........", block2.receipts[0].events);
        // console.log("printing exercising u3........", block2.receipts[1].events);
        // console.log("printing exercising u5........", block2.receipts[2].events);
        
        // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
        // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market

        // console.log("Print the height of block 2...", block2.height);

        chain.mineEmptyBlock(4200); // options expired now!

        let deployerReclaim = chain.callReadOnlyFn('sizeable-bitcoin-call', 'get-reclaimable-calls', [types.principal(deployer.address)], deployer.address);
        console.log("Get deployer reclaimable calls.. ", deployerReclaim);
        // wallet1Balance.result.expectOk().expectUint(123456); 

        let block3 = chain.mineBlock([

Tx.contractCall(contractAddressCall, 'reclaiming', [], deployer.address) // such a waste of time, but if I don't pass empty params [] then I get "error: TypeError: Error parsing args at position 0: invalid length 0, expected struct TransactionArgs with 4 elements"
]); 
    console.log("deployer reclaims all expired options.......", block3.receipts[0].events);
    console.log("print the height...", block3.height);
    //     // block3.receipts[0].result.expectErr().expectUint(1007); // token id not found because it was exercised and burnt so deployer cannot reclaim it
},
});

// review all the fold function and exit out if error

Clarinet.test({
    name: " Transferring a list of token of similar calls (strike/expiration) and then exercising/reclaiming them all",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer")!;
        let wallet1 = accounts.get("wallet_1")!;
        let wallet2 = accounts.get("wallet_2")!;
        const contractAddress = deployer.address + '.sbtc';
        const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';
        
        let myList = types.list([types.uint(1), types.uint(2)]);

        console.log("myList is...", myList);

        let block1 = chain.mineBlock([
            // print myself 0.19 SBTC, a call option locks 0.03 sBTC
Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
            // print 5 sBTC call options strike 1000 STX each
Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
            // Transfer-same-strikes
Tx.contractCall('sizeable-bitcoin-call', 'transfer-same-strikes', [myList, types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)

        ]);

        // console.log("transfer same strikes........", block1);
        // console.log("mint sBTC........", block1.receipts[0].events);
        // console.log("mint 5 Bitcoin calls u1... u5........", block1.receipts[1].events);
        // console.log("transfer u1 and u2 of same strikes........", block1.receipts[2].events);
        // console.log("Exercise them all...u1 and u2 wallet1 owns....", block1.receipts[3].events);

        chain.mineEmptyBlock(2121); // options expired now!
        let block3 = chain.mineBlock([
Tx.contractCall('sizeable-bitcoin-call', 'reclaiming', [], deployer.address)
]); 
        console.log("reclaim them all........", block3.receipts);
        console.log("reclaim them all........", block3.receipts[0].events);

    },
});
        // // print the munitions sBTC
        // console.log("printing 19m sats........", block1.receipts[0].events);
        // console.log("result of printing........", block1.receipts[0].result);
        // // print the calls
        // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
        // transfer u1 u3 and u5 to wallet 1
        // console.log("1 - 22222222222222........", block1.receipts[2].events);
        // console.log("3 - 333333333333333........", block1.receipts[3].events);
        // console.log("5 - 44444444444444........", block1.receipts[4].events);

        // console.log("print the height...", block1.height);
        // assertEquals(block1.height, 3);

//         let block2 = chain.mineBlock([
//         // exercise u5
// Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
//  // where is the Xbtc contract?
//         ]); 
//         console.log("printing exercising u1........", block2.receipts[0].events);
        // console.log("printing exercising u3........", block2.receipts[1].events);
        // console.log("printing exercising u5........", block2.receipts[2].events);
        
        // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
        // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market

        // console.log("Print the height of block 2...", block2.height);

        // chain.mineEmptyBlock(2100); // options expired now!
//         let block3 = chain.mineBlock([
// Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(1)], deployer.address)
// ]); 
//         block3.receipts[0].result.expectErr().expectUint(1012); // deployer cannot reclaim it as it desn't belong to him and it's not expired
// },
// });
