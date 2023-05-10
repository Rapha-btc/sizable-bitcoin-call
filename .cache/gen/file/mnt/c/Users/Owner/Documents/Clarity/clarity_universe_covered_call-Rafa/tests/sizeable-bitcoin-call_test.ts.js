import { Clarinet, Tx, types } from 'https://deno.land/x/clarinet@v1.5.4/index.ts';
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
// Clarinet.test({
//     name: "First few tests - need to catch errors - deployer transfers u5 - wallet1 exercises u5 - advance - Deployer re-claims u2",
//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         // arrange: set up the chain, state, and other required elements
//         let deployer = accounts.get("deployer")!;
//         let wallet1 = accounts.get("wallet_1")!;
//         let wallet2 = accounts.get("wallet_2")!;
//         const contractAddress = deployer.address + '.sbtc';
//         const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';
//         let block1 = chain.mineBlock([
//             // print myself 0.19 SBTC, a call option locks 0.03 sBTC
// Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
//                     // print 5 sBTC call options strike 1000 STX each
// Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
//             // Transfer u1 u3 and u5 to wallet 1
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
//             // Idea: create a function that transfers a list of tokens in 1 go!
//         ]);
//         // // print the munitions sBTC
//         // console.log("printing 19m sats........", block1.receipts[0].events);
//         // console.log("result of printing........", block1.receipts[0].result);
//         // // print the calls
//         // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
//         // transfer u1 u3 and u5 to wallet 1
//         console.log("1 - 22222222222222........", block1.receipts[2].events);
//         console.log("3 - 333333333333333........", block1.receipts[3].events);
//         console.log("5 - 44444444444444........", block1.receipts[4].events);
//         // console.log("print the height...", block1.height);
//         // assertEquals(block1.height, 3);
//         let block2 = chain.mineBlock([
//         // exercise u5
// Tx.contractCall('sizeable-bitcoin-call', 'exercise', [types.principal(contractAddress), types.uint(5)], wallet1.address)
//  // where is the Xbtc contract?
//         ]); 
//         console.log("printing exercising u5........", block2.receipts[0].events);
//         console.log("printing exercising u5........", block2.receipts[0].result);
//         // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
//         // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market
//         console.log("Print the height of block 2...", block2.height);
//         chain.mineEmptyBlock(2100); // options expired now!
//         let block3 = chain.mineBlock([
//         // reclaim u2 baby!
// // Tx.contractCall('sizeable-bitcoin-call', 'reclaim-yy', [types.uint(2), "(ok true)"], deployer.address)
// // not able to run the line above?
// Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(2)], deployer.address)
//         ]); 
//         console.log("reclaiming u2........", block3.receipts[0].events);
//         console.log("reclaiming u2 result........", block3.receipts[0].result);
//         console.log("Print the height of block 3...", block3.height);
//         // // act: perform actions related to the current test
//         // let block = chain.mineBlock([
//         //     /*
//         //      * Add transactions with:
//         //      * Tx.contractCall(...)
//         //     */
//         // ]);
//         // // assert: review returned data, contract state, and other requirements
//         // assertEquals(block.receipts.length, 0);
//         // assertEquals(block.height, 2);
//         // // TODO
//         // assertEquals("TODO", "a complete test");
//     },
// });
// Clarinet.test({
//     name: " Wallet1 exercises them all in 1 go (1, 3 and 5) ",
//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         // arrange: set up the chain, state, and other required elements
//         let deployer = accounts.get("deployer")!;
//         let wallet1 = accounts.get("wallet_1")!;
//         let wallet2 = accounts.get("wallet_2")!;
//         const contractAddress = deployer.address + '.sbtc';
//         const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';
//         let block1 = chain.mineBlock([
//             // print myself 0.19 SBTC, a call option locks 0.03 sBTC
// Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
//                     // print 5 sBTC call options strike 1000 STX each
// Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
//             // Transfer u1 u3 and u5 to wallet 1
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
//             // Idea: create a function that transfers a list of tokens in 1 go!
//         ]);
//         // // print the munitions sBTC
//         // console.log("printing 19m sats........", block1.receipts[0].events);
//         // console.log("result of printing........", block1.receipts[0].result);
//         // // print the calls
//         // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
//         // transfer u1 u3 and u5 to wallet 1
//         // console.log("1 - 22222222222222........", block1.receipts[2].events);
//         // console.log("3 - 333333333333333........", block1.receipts[3].events);
//         // console.log("5 - 44444444444444........", block1.receipts[4].events);
//         // console.log("print the height...", block1.height);
//         // assertEquals(block1.height, 3);
//         let block2 = chain.mineBlock([
//         // exercise u5
// Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
//  // where is the Xbtc contract?
//         ]); 
//         console.log("printing exercising u1........", block2.receipts[0].events);
//         // console.log("printing exercising u3........", block2.receipts[1].events);
//         // console.log("printing exercising u5........", block2.receipts[2].events);
//         // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
//         // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market
//         console.log("Print the height of block 2...", block2.height);
//         chain.mineEmptyBlock(2100); // options expired now!
//         let block3 = chain.mineBlock([
// Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(1)], deployer.address)
// ]); 
//         block3.receipts[0].result.expectErr().expectUint(1007); // token id not found because it was exercised and burnt so deployer cannot reclaim it
// },
// });
// Clarinet.test({
//     name: " Deployer cannot reclaim option which is not expired ",
//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         // arrange: set up the chain, state, and other required elements
//         let deployer = accounts.get("deployer")!;
//         let wallet1 = accounts.get("wallet_1")!;
//         let wallet2 = accounts.get("wallet_2")!;
//         const contractAddress = deployer.address + '.sbtc';
//         const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';
//         let block1 = chain.mineBlock([
//             // print myself 0.19 SBTC, a call option locks 0.03 sBTC
// Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
//                     // print 5 sBTC call options strike 1000 STX each
// Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
//             // Transfer u1 u3 and u5 to wallet 1
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
//             // Idea: create a function that transfers a list of tokens in 1 go!
//         ]);
//         // // print the munitions sBTC
//         // console.log("printing 19m sats........", block1.receipts[0].events);
//         // console.log("result of printing........", block1.receipts[0].result);
//         // // print the calls
//         // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
//         // transfer u1 u3 and u5 to wallet 1
//         // console.log("1 - 22222222222222........", block1.receipts[2].events);
//         // console.log("3 - 333333333333333........", block1.receipts[3].events);
//         // console.log("5 - 44444444444444........", block1.receipts[4].events);
//         // console.log("print the height...", block1.height);
//         // assertEquals(block1.height, 3);
// //         let block2 = chain.mineBlock([
// //         // exercise u5
// // Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
// //  // where is the Xbtc contract?
// //         ]); 
// //         console.log("printing exercising u1........", block2.receipts[0].events);
//         // console.log("printing exercising u3........", block2.receipts[1].events);
//         // console.log("printing exercising u5........", block2.receipts[2].events);
//         // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
//         // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market
//         // console.log("Print the height of block 2...", block2.height);
//         // chain.mineEmptyBlock(2100); // options expired now!
//         let block3 = chain.mineBlock([
// Tx.contractCall('sizeable-bitcoin-call', 'counterparty-reclaim', [types.principal(contractAddress), types.uint(1)], deployer.address)
// ]); 
//         block3.receipts[0].result.expectErr().expectUint(1012); // deployer cannot reclaim it as it desn't belong to him and it's not expired
// },
// });
// Clarinet.test({
//     name: " Testing the reclaim them all",
//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         // arrange: set up the chain, state, and other required elements
//         let deployer = accounts.get("deployer")!;
//         let wallet1 = accounts.get("wallet_1")!;
//         let wallet2 = accounts.get("wallet_2")!;
//         const contractAddress = deployer.address + '.sbtc';
//         const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';
//         let block1 = chain.mineBlock([
//             // print myself 0.19 SBTC, a call option locks 0.03 sBTC
// Tx.contractCall('sbtc', 'mint', [types.uint(19000000), types.principal(deployer.address)], deployer.address),
//                     // print 5 sBTC call options strike 1000 STX each
// Tx.contractCall('sizeable-bitcoin-call', 'mint', [types.principal(contractAddress), types.uint(15000000), types.uint(1000000000)], deployer.address),
//             // Transfer u1 u3 and u5 to wallet 1
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(1), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(3), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address),
// Tx.contractCall('sizeable-bitcoin-call', 'transfer', [types.uint(5), types.principal(deployer.address), types.principal(wallet1.address)], deployer.address)
//             // Idea: create a function that transfers a list of tokens in 1 go!
//         ]);
//         // // print the munitions sBTC
//         // console.log("printing 19m sats........", block1.receipts[0].events);
//         // console.log("result of printing........", block1.receipts[0].result);
//         // // print the calls
//         // console.log("printing 5 call options........ is 3 tokens and 1 ft sBTC transfer", block1.receipts[1].events);
//         // transfer u1 u3 and u5 to wallet 1
//         // console.log("1 - 22222222222222........", block1.receipts[2].events);
//         // console.log("3 - 333333333333333........", block1.receipts[3].events);
//         // console.log("5 - 44444444444444........", block1.receipts[4].events);
//         // console.log("print the height...", block1.height);
//         // assertEquals(block1.height, 3);
//         let block2 = chain.mineBlock([
//         // exercise u5
// Tx.contractCall('sizeable-bitcoin-call', 'exercise-all-of-my-exerciser-calls', [types.principal(contractAddress)], wallet1.address)
//  // where is the Xbtc contract?
//         ]); 
//         console.log("printing exercising u1........", block2.receipts[0].events);
//         // console.log("printing exercising u3........", block2.receipts[1].events);
//         // console.log("printing exercising u5........", block2.receipts[2].events);
//         // open AI is incredible! it will advance and allow me to learn so quickly... being early is a huge advantage with  open AI on my side and this amazing community
//         // let's work, compound and deploy common goods for a better DeFi world and squeeze those wall garden gatekeepers out of the market
//         // console.log("Print the height of block 2...", block2.height);
//         chain.mineEmptyBlock(4200); // options expired now!
//         let deployerReclaim = chain.callReadOnlyFn('sizeable-bitcoin-call', 'get-reclaimable-calls', [types.principal(deployer.address)], deployer.address);
//         console.log("Get deployer reclaimable calls.. ", deployerReclaim);
//         // wallet1Balance.result.expectOk().expectUint(123456); 
//         let block3 = chain.mineBlock([
// Tx.contractCall(contractAddressCall, 'reclaiming', [], deployer.address) // such a waste of time, but if I don't pass empty params [] then I get "error: TypeError: Error parsing args at position 0: invalid length 0, expected struct TransactionArgs with 4 elements"
// ]); 
//     console.log("deployer reclaims all expired options.......", block3.receipts[0].events);
//     console.log("print the height...", block3.height);
//     //     // block3.receipts[0].result.expectErr().expectUint(1007); // token id not found because it was exercised and burnt so deployer cannot reclaim it
// },
// });
// we have to filter items out of reclaimable (from counterparty) when it is exercised!
// no because when token is not found, 
// before that let's just test it when none are exercised!
// revise if I need a list for all calls, and a map for exercisable calls - yes I do because of what?
// I probably don't so I need to merge the 2?
Clarinet.test({
    name: " Transferring a list of token with same strikes and expirations from within 7 blocks ",
    async fn (chain, accounts) {
        // arrange: set up the chain, state, and other required elements
        let deployer = accounts.get("deployer");
        let wallet1 = accounts.get("wallet_1");
        let wallet2 = accounts.get("wallet_2");
        const contractAddress = deployer.address + '.sbtc';
        const contractAddressCall = deployer.address + '.sizeable-bitcoin-call';
        let myList = types.list([
            types.uint(1),
            types.uint(2)
        ]);
        console.log("myList is...", myList);
        let block1 = chain.mineBlock([
            // print myself 0.19 SBTC, a call option locks 0.03 sBTC
            Tx.contractCall('sbtc', 'mint', [
                types.uint(19000000),
                types.principal(deployer.address)
            ], deployer.address),
            // print 5 sBTC call options strike 1000 STX each
            Tx.contractCall('sizeable-bitcoin-call', 'mint', [
                types.principal(contractAddress),
                types.uint(15000000),
                types.uint(1000000000)
            ], deployer.address),
            // Transfer-same-strikes
            Tx.contractCall('sizeable-bitcoin-call', 'transfer-same-strikes', [
                myList,
                types.principal(deployer.address),
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        console.log("transfer same strikes........", block1.events);
    // console.log("transfer same strikes........", block1.events[2]);
    // console.log("transfer same strikes........", block1.events[3]);
    }
}); // // print the munitions sBTC
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vbW50L2MvVXNlcnMvT3duZXIvRG9jdW1lbnRzL0NsYXJpdHkvY2xhcml0eV91bml2ZXJzZV9jb3ZlcmVkX2NhbGwtUmFmYS90ZXN0cy9zaXplYWJsZS1iaXRjb2luLWNhbGxfdGVzdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IENsYXJpbmV0LCBUeCwgQ2hhaW4sIEFjY291bnQsIHR5cGVzIH0gZnJvbSAnaHR0cHM6Ly9kZW5vLmxhbmQveC9jbGFyaW5ldEB2MS41LjQvaW5kZXgudHMnO1xuaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSAnaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQDAuMTcwLjAvdGVzdGluZy9hc3NlcnRzLnRzJztcbi8vIGltcG9ydCB7IENsYXJpdHlWYWx1ZSB9IGZyb20gJ0BzdGFja3MvdHJhbnNhY3Rpb25zJztcblxuLy8gRGVmaW5lIHRoZSBjcmVhdGVSZXNwb25zZSBmdW5jdGlvblxuLy8gZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2UoaXNPazogYm9vbGVhbik6IENsYXJpdHlWYWx1ZSB7XG4vLyAgIGlmIChpc09rKSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHR5cGU6ICdyZXNwb25zZScsXG4vLyAgICAgICBzdWNjZXNzOiB0cnVlLFxuLy8gICAgICAgdmFsdWU6IHsgdHlwZTogJ2Jvb2wnLCB2YWx1ZTogdHJ1ZSB9LFxuLy8gICAgIH07XG4vLyAgIH0gZWxzZSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHR5cGU6ICdyZXNwb25zZScsXG4vLyAgICAgICBzdWNjZXNzOiBmYWxzZSxcbi8vICAgICAgIHZhbHVlOiB7IHR5cGU6ICd1aW50JywgdmFsdWU6IDEgfSxcbi8vICAgICB9O1xuLy8gICB9XG4vLyB9XG5cbi8vIENsYXJpbmV0LnRlc3Qoe1xuLy8gICAgIG5hbWU6IFwiRmlyc3QgZmV3IHRlc3RzIC0gbmVlZCB0byBjYXRjaCBlcnJvcnMgLSBkZXBsb3llciB0cmFuc2ZlcnMgdTUgLSB3YWxsZXQxIGV4ZXJjaXNlcyB1NSAtIGFkdmFuY2UgLSBEZXBsb3llciByZS1jbGFpbXMgdTJcIixcbi8vICAgICBhc3luYyBmbihjaGFpbjogQ2hhaW4sIGFjY291bnRzOiBNYXA8c3RyaW5nLCBBY2NvdW50Pikge1xuLy8gICAgICAgICAvLyBhcnJhbmdlOiBzZXQgdXAgdGhlIGNoYWluLCBzdGF0ZSwgYW5kIG90aGVyIHJlcXVpcmVkIGVsZW1lbnRzXG4vLyAgICAgICAgIGxldCBkZXBsb3llciA9IGFjY291bnRzLmdldChcImRlcGxveWVyXCIpITtcbi8vICAgICAgICAgbGV0IHdhbGxldDEgPSBhY2NvdW50cy5nZXQoXCJ3YWxsZXRfMVwiKSE7XG4vLyAgICAgICAgIGxldCB3YWxsZXQyID0gYWNjb3VudHMuZ2V0KFwid2FsbGV0XzJcIikhO1xuLy8gICAgICAgICBjb25zdCBjb250cmFjdEFkZHJlc3MgPSBkZXBsb3llci5hZGRyZXNzICsgJy5zYnRjJztcbi8vICAgICAgICAgY29uc3QgY29udHJhY3RBZGRyZXNzQ2FsbCA9IGRlcGxveWVyLmFkZHJlc3MgKyAnLnNpemVhYmxlLWJpdGNvaW4tY2FsbCc7XG5cbi8vICAgICAgICAgbGV0IGJsb2NrMSA9IGNoYWluLm1pbmVCbG9jayhbXG4vLyAgICAgICAgICAgICAvLyBwcmludCBteXNlbGYgMC4xOSBTQlRDLCBhIGNhbGwgb3B0aW9uIGxvY2tzIDAuMDMgc0JUQ1xuLy8gVHguY29udHJhY3RDYWxsKCdzYnRjJywgJ21pbnQnLCBbdHlwZXMudWludCgxOTAwMDAwMCksIHR5cGVzLnByaW5jaXBhbChkZXBsb3llci5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuLy8gICAgICAgICAgICAgICAgICAgICAvLyBwcmludCA1IHNCVEMgY2FsbCBvcHRpb25zIHN0cmlrZSAxMDAwIFNUWCBlYWNoXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdtaW50JywgW3R5cGVzLnByaW5jaXBhbChjb250cmFjdEFkZHJlc3MpLCB0eXBlcy51aW50KDE1MDAwMDAwKSwgdHlwZXMudWludCgxMDAwMDAwMDAwKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuLy8gICAgICAgICAgICAgLy8gVHJhbnNmZXIgdTEgdTMgYW5kIHU1IHRvIHdhbGxldCAxXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2ZlcicsIFt0eXBlcy51aW50KDEpLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2ZlcicsIFt0eXBlcy51aW50KDMpLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2ZlcicsIFt0eXBlcy51aW50KDUpLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcylcbi8vICAgICAgICAgICAgIC8vIElkZWE6IGNyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgdHJhbnNmZXJzIGEgbGlzdCBvZiB0b2tlbnMgaW4gMSBnbyFcbi8vICAgICAgICAgXSk7XG4vLyAgICAgICAgIC8vIC8vIHByaW50IHRoZSBtdW5pdGlvbnMgc0JUQ1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIDE5bSBzYXRzLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicmVzdWx0IG9mIHByaW50aW5nLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzBdLnJlc3VsdCk7XG4vLyAgICAgICAgIC8vIC8vIHByaW50IHRoZSBjYWxsc1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIDUgY2FsbCBvcHRpb25zLi4uLi4uLi4gaXMgMyB0b2tlbnMgYW5kIDEgZnQgc0JUQyB0cmFuc2ZlclwiLCBibG9jazEucmVjZWlwdHNbMV0uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gdHJhbnNmZXIgdTEgdTMgYW5kIHU1IHRvIHdhbGxldCAxXG4vLyAgICAgICAgIGNvbnNvbGUubG9nKFwiMSAtIDIyMjIyMjIyMjIyMjIyLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzJdLmV2ZW50cyk7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKFwiMyAtIDMzMzMzMzMzMzMzMzMzMy4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1szXS5ldmVudHMpO1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhcIjUgLSA0NDQ0NDQ0NDQ0NDQ0NC4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1s0XS5ldmVudHMpO1xuXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnQgdGhlIGhlaWdodC4uLlwiLCBibG9jazEuaGVpZ2h0KTtcbi8vICAgICAgICAgLy8gYXNzZXJ0RXF1YWxzKGJsb2NrMS5oZWlnaHQsIDMpO1xuXG4vLyAgICAgICAgIGxldCBibG9jazIgPSBjaGFpbi5taW5lQmxvY2soW1xuLy8gICAgICAgICAvLyBleGVyY2lzZSB1NVxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAnZXhlcmNpc2UnLCBbdHlwZXMucHJpbmNpcGFsKGNvbnRyYWN0QWRkcmVzcyksIHR5cGVzLnVpbnQoNSldLCB3YWxsZXQxLmFkZHJlc3MpXG4vLyAgLy8gd2hlcmUgaXMgdGhlIFhidGMgY29udHJhY3Q/XG4vLyAgICAgICAgIF0pOyBcbi8vICAgICAgICAgY29uc29sZS5sb2coXCJwcmludGluZyBleGVyY2lzaW5nIHU1Li4uLi4uLi5cIiwgYmxvY2syLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgZXhlcmNpc2luZyB1NS4uLi4uLi4uXCIsIGJsb2NrMi5yZWNlaXB0c1swXS5yZXN1bHQpO1xuICAgICAgICBcbi8vICAgICAgICAgLy8gb3BlbiBBSSBpcyBpbmNyZWRpYmxlISBpdCB3aWxsIGFkdmFuY2UgYW5kIGFsbG93IG1lIHRvIGxlYXJuIHNvIHF1aWNrbHkuLi4gYmVpbmcgZWFybHkgaXMgYSBodWdlIGFkdmFudGFnZSB3aXRoICBvcGVuIEFJIG9uIG15IHNpZGUgYW5kIHRoaXMgYW1hemluZyBjb21tdW5pdHlcbi8vICAgICAgICAgLy8gbGV0J3Mgd29yaywgY29tcG91bmQgYW5kIGRlcGxveSBjb21tb24gZ29vZHMgZm9yIGEgYmV0dGVyIERlRmkgd29ybGQgYW5kIHNxdWVlemUgdGhvc2Ugd2FsbCBnYXJkZW4gZ2F0ZWtlZXBlcnMgb3V0IG9mIHRoZSBtYXJrZXRcblxuLy8gICAgICAgICBjb25zb2xlLmxvZyhcIlByaW50IHRoZSBoZWlnaHQgb2YgYmxvY2sgMi4uLlwiLCBibG9jazIuaGVpZ2h0KTtcblxuLy8gICAgICAgICBjaGFpbi5taW5lRW1wdHlCbG9jaygyMTAwKTsgLy8gb3B0aW9ucyBleHBpcmVkIG5vdyFcbi8vICAgICAgICAgbGV0IGJsb2NrMyA9IGNoYWluLm1pbmVCbG9jayhbXG4vLyAgICAgICAgIC8vIHJlY2xhaW0gdTIgYmFieSFcbi8vIC8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ3JlY2xhaW0teXknLCBbdHlwZXMudWludCgyKSwgXCIob2sgdHJ1ZSlcIl0sIGRlcGxveWVyLmFkZHJlc3MpXG4vLyAvLyBub3QgYWJsZSB0byBydW4gdGhlIGxpbmUgYWJvdmU/XG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdjb3VudGVycGFydHktcmVjbGFpbScsIFt0eXBlcy5wcmluY2lwYWwoY29udHJhY3RBZGRyZXNzKSwgdHlwZXMudWludCgyKV0sIGRlcGxveWVyLmFkZHJlc3MpXG4vLyAgICAgICAgIF0pOyBcbi8vICAgICAgICAgY29uc29sZS5sb2coXCJyZWNsYWltaW5nIHUyLi4uLi4uLi5cIiwgYmxvY2szLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKFwicmVjbGFpbWluZyB1MiByZXN1bHQuLi4uLi4uLlwiLCBibG9jazMucmVjZWlwdHNbMF0ucmVzdWx0KTtcbi8vICAgICAgICAgY29uc29sZS5sb2coXCJQcmludCB0aGUgaGVpZ2h0IG9mIGJsb2NrIDMuLi5cIiwgYmxvY2szLmhlaWdodCk7XG4vLyAgICAgICAgIC8vIC8vIGFjdDogcGVyZm9ybSBhY3Rpb25zIHJlbGF0ZWQgdG8gdGhlIGN1cnJlbnQgdGVzdFxuLy8gICAgICAgICAvLyBsZXQgYmxvY2sgPSBjaGFpbi5taW5lQmxvY2soW1xuLy8gICAgICAgICAvLyAgICAgLypcbi8vICAgICAgICAgLy8gICAgICAqIEFkZCB0cmFuc2FjdGlvbnMgd2l0aDpcbi8vICAgICAgICAgLy8gICAgICAqIFR4LmNvbnRyYWN0Q2FsbCguLi4pXG4vLyAgICAgICAgIC8vICAgICAqL1xuLy8gICAgICAgICAvLyBdKTtcblxuLy8gICAgICAgICAvLyAvLyBhc3NlcnQ6IHJldmlldyByZXR1cm5lZCBkYXRhLCBjb250cmFjdCBzdGF0ZSwgYW5kIG90aGVyIHJlcXVpcmVtZW50c1xuLy8gICAgICAgICAvLyBhc3NlcnRFcXVhbHMoYmxvY2sucmVjZWlwdHMubGVuZ3RoLCAwKTtcbi8vICAgICAgICAgLy8gYXNzZXJ0RXF1YWxzKGJsb2NrLmhlaWdodCwgMik7XG5cbi8vICAgICAgICAgLy8gLy8gVE9ET1xuLy8gICAgICAgICAvLyBhc3NlcnRFcXVhbHMoXCJUT0RPXCIsIFwiYSBjb21wbGV0ZSB0ZXN0XCIpO1xuLy8gICAgIH0sXG4vLyB9KTtcblxuXG4vLyBDbGFyaW5ldC50ZXN0KHtcbi8vICAgICBuYW1lOiBcIiBXYWxsZXQxIGV4ZXJjaXNlcyB0aGVtIGFsbCBpbiAxIGdvICgxLCAzIGFuZCA1KSBcIixcbi8vICAgICBhc3luYyBmbihjaGFpbjogQ2hhaW4sIGFjY291bnRzOiBNYXA8c3RyaW5nLCBBY2NvdW50Pikge1xuLy8gICAgICAgICAvLyBhcnJhbmdlOiBzZXQgdXAgdGhlIGNoYWluLCBzdGF0ZSwgYW5kIG90aGVyIHJlcXVpcmVkIGVsZW1lbnRzXG4vLyAgICAgICAgIGxldCBkZXBsb3llciA9IGFjY291bnRzLmdldChcImRlcGxveWVyXCIpITtcbi8vICAgICAgICAgbGV0IHdhbGxldDEgPSBhY2NvdW50cy5nZXQoXCJ3YWxsZXRfMVwiKSE7XG4vLyAgICAgICAgIGxldCB3YWxsZXQyID0gYWNjb3VudHMuZ2V0KFwid2FsbGV0XzJcIikhO1xuLy8gICAgICAgICBjb25zdCBjb250cmFjdEFkZHJlc3MgPSBkZXBsb3llci5hZGRyZXNzICsgJy5zYnRjJztcbi8vICAgICAgICAgY29uc3QgY29udHJhY3RBZGRyZXNzQ2FsbCA9IGRlcGxveWVyLmFkZHJlc3MgKyAnLnNpemVhYmxlLWJpdGNvaW4tY2FsbCc7XG5cbi8vICAgICAgICAgbGV0IGJsb2NrMSA9IGNoYWluLm1pbmVCbG9jayhbXG4vLyAgICAgICAgICAgICAvLyBwcmludCBteXNlbGYgMC4xOSBTQlRDLCBhIGNhbGwgb3B0aW9uIGxvY2tzIDAuMDMgc0JUQ1xuLy8gVHguY29udHJhY3RDYWxsKCdzYnRjJywgJ21pbnQnLCBbdHlwZXMudWludCgxOTAwMDAwMCksIHR5cGVzLnByaW5jaXBhbChkZXBsb3llci5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuLy8gICAgICAgICAgICAgICAgICAgICAvLyBwcmludCA1IHNCVEMgY2FsbCBvcHRpb25zIHN0cmlrZSAxMDAwIFNUWCBlYWNoXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdtaW50JywgW3R5cGVzLnByaW5jaXBhbChjb250cmFjdEFkZHJlc3MpLCB0eXBlcy51aW50KDE1MDAwMDAwKSwgdHlwZXMudWludCgxMDAwMDAwMDAwKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuLy8gICAgICAgICAgICAgLy8gVHJhbnNmZXIgdTEgdTMgYW5kIHU1IHRvIHdhbGxldCAxXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2ZlcicsIFt0eXBlcy51aW50KDEpLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2ZlcicsIFt0eXBlcy51aW50KDMpLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2ZlcicsIFt0eXBlcy51aW50KDUpLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcylcbi8vICAgICAgICAgICAgIC8vIElkZWE6IGNyZWF0ZSBhIGZ1bmN0aW9uIHRoYXQgdHJhbnNmZXJzIGEgbGlzdCBvZiB0b2tlbnMgaW4gMSBnbyFcbi8vICAgICAgICAgXSk7XG4vLyAgICAgICAgIC8vIC8vIHByaW50IHRoZSBtdW5pdGlvbnMgc0JUQ1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIDE5bSBzYXRzLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicmVzdWx0IG9mIHByaW50aW5nLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzBdLnJlc3VsdCk7XG4vLyAgICAgICAgIC8vIC8vIHByaW50IHRoZSBjYWxsc1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIDUgY2FsbCBvcHRpb25zLi4uLi4uLi4gaXMgMyB0b2tlbnMgYW5kIDEgZnQgc0JUQyB0cmFuc2ZlclwiLCBibG9jazEucmVjZWlwdHNbMV0uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gdHJhbnNmZXIgdTEgdTMgYW5kIHU1IHRvIHdhbGxldCAxXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiMSAtIDIyMjIyMjIyMjIyMjIyLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzJdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiMyAtIDMzMzMzMzMzMzMzMzMzMy4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1szXS5ldmVudHMpO1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcIjUgLSA0NDQ0NDQ0NDQ0NDQ0NC4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1s0XS5ldmVudHMpO1xuXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnQgdGhlIGhlaWdodC4uLlwiLCBibG9jazEuaGVpZ2h0KTtcbi8vICAgICAgICAgLy8gYXNzZXJ0RXF1YWxzKGJsb2NrMS5oZWlnaHQsIDMpO1xuXG4vLyAgICAgICAgIGxldCBibG9jazIgPSBjaGFpbi5taW5lQmxvY2soW1xuLy8gICAgICAgICAvLyBleGVyY2lzZSB1NVxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAnZXhlcmNpc2UtYWxsLW9mLW15LWV4ZXJjaXNlci1jYWxscycsIFt0eXBlcy5wcmluY2lwYWwoY29udHJhY3RBZGRyZXNzKV0sIHdhbGxldDEuYWRkcmVzcylcbi8vICAvLyB3aGVyZSBpcyB0aGUgWGJ0YyBjb250cmFjdD9cbi8vICAgICAgICAgXSk7IFxuLy8gICAgICAgICBjb25zb2xlLmxvZyhcInByaW50aW5nIGV4ZXJjaXNpbmcgdTEuLi4uLi4uLlwiLCBibG9jazIucmVjZWlwdHNbMF0uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcmludGluZyBleGVyY2lzaW5nIHUzLi4uLi4uLi5cIiwgYmxvY2syLnJlY2VpcHRzWzFdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgZXhlcmNpc2luZyB1NS4uLi4uLi4uXCIsIGJsb2NrMi5yZWNlaXB0c1syXS5ldmVudHMpO1xuICAgICAgICBcbi8vICAgICAgICAgLy8gb3BlbiBBSSBpcyBpbmNyZWRpYmxlISBpdCB3aWxsIGFkdmFuY2UgYW5kIGFsbG93IG1lIHRvIGxlYXJuIHNvIHF1aWNrbHkuLi4gYmVpbmcgZWFybHkgaXMgYSBodWdlIGFkdmFudGFnZSB3aXRoICBvcGVuIEFJIG9uIG15IHNpZGUgYW5kIHRoaXMgYW1hemluZyBjb21tdW5pdHlcbi8vICAgICAgICAgLy8gbGV0J3Mgd29yaywgY29tcG91bmQgYW5kIGRlcGxveSBjb21tb24gZ29vZHMgZm9yIGEgYmV0dGVyIERlRmkgd29ybGQgYW5kIHNxdWVlemUgdGhvc2Ugd2FsbCBnYXJkZW4gZ2F0ZWtlZXBlcnMgb3V0IG9mIHRoZSBtYXJrZXRcblxuLy8gICAgICAgICBjb25zb2xlLmxvZyhcIlByaW50IHRoZSBoZWlnaHQgb2YgYmxvY2sgMi4uLlwiLCBibG9jazIuaGVpZ2h0KTtcblxuLy8gICAgICAgICBjaGFpbi5taW5lRW1wdHlCbG9jaygyMTAwKTsgLy8gb3B0aW9ucyBleHBpcmVkIG5vdyFcbi8vICAgICAgICAgbGV0IGJsb2NrMyA9IGNoYWluLm1pbmVCbG9jayhbXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdjb3VudGVycGFydHktcmVjbGFpbScsIFt0eXBlcy5wcmluY2lwYWwoY29udHJhY3RBZGRyZXNzKSwgdHlwZXMudWludCgxKV0sIGRlcGxveWVyLmFkZHJlc3MpXG4vLyBdKTsgXG4vLyAgICAgICAgIGJsb2NrMy5yZWNlaXB0c1swXS5yZXN1bHQuZXhwZWN0RXJyKCkuZXhwZWN0VWludCgxMDA3KTsgLy8gdG9rZW4gaWQgbm90IGZvdW5kIGJlY2F1c2UgaXQgd2FzIGV4ZXJjaXNlZCBhbmQgYnVybnQgc28gZGVwbG95ZXIgY2Fubm90IHJlY2xhaW0gaXRcbi8vIH0sXG4vLyB9KTtcblxuLy8gQ2xhcmluZXQudGVzdCh7XG4vLyAgICAgbmFtZTogXCIgRGVwbG95ZXIgY2Fubm90IHJlY2xhaW0gb3B0aW9uIHdoaWNoIGlzIG5vdCBleHBpcmVkIFwiLFxuLy8gICAgIGFzeW5jIGZuKGNoYWluOiBDaGFpbiwgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+KSB7XG4vLyAgICAgICAgIC8vIGFycmFuZ2U6IHNldCB1cCB0aGUgY2hhaW4sIHN0YXRlLCBhbmQgb3RoZXIgcmVxdWlyZWQgZWxlbWVudHNcbi8vICAgICAgICAgbGV0IGRlcGxveWVyID0gYWNjb3VudHMuZ2V0KFwiZGVwbG95ZXJcIikhO1xuLy8gICAgICAgICBsZXQgd2FsbGV0MSA9IGFjY291bnRzLmdldChcIndhbGxldF8xXCIpITtcbi8vICAgICAgICAgbGV0IHdhbGxldDIgPSBhY2NvdW50cy5nZXQoXCJ3YWxsZXRfMlwiKSE7XG4vLyAgICAgICAgIGNvbnN0IGNvbnRyYWN0QWRkcmVzcyA9IGRlcGxveWVyLmFkZHJlc3MgKyAnLnNidGMnO1xuLy8gICAgICAgICBjb25zdCBjb250cmFjdEFkZHJlc3NDYWxsID0gZGVwbG95ZXIuYWRkcmVzcyArICcuc2l6ZWFibGUtYml0Y29pbi1jYWxsJztcblxuLy8gICAgICAgICBsZXQgYmxvY2sxID0gY2hhaW4ubWluZUJsb2NrKFtcbi8vICAgICAgICAgICAgIC8vIHByaW50IG15c2VsZiAwLjE5IFNCVEMsIGEgY2FsbCBvcHRpb24gbG9ja3MgMC4wMyBzQlRDXG4vLyBUeC5jb250cmFjdENhbGwoJ3NidGMnLCAnbWludCcsIFt0eXBlcy51aW50KDE5MDAwMDAwKSwgdHlwZXMucHJpbmNpcGFsKGRlcGxveWVyLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4vLyAgICAgICAgICAgICAgICAgICAgIC8vIHByaW50IDUgc0JUQyBjYWxsIG9wdGlvbnMgc3RyaWtlIDEwMDAgU1RYIGVhY2hcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ21pbnQnLCBbdHlwZXMucHJpbmNpcGFsKGNvbnRyYWN0QWRkcmVzcyksIHR5cGVzLnVpbnQoMTUwMDAwMDApLCB0eXBlcy51aW50KDEwMDAwMDAwMDApXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4vLyAgICAgICAgICAgICAvLyBUcmFuc2ZlciB1MSB1MyBhbmQgdTUgdG8gd2FsbGV0IDFcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoMSksIHR5cGVzLnByaW5jaXBhbChkZXBsb3llci5hZGRyZXNzKSwgdHlwZXMucHJpbmNpcGFsKHdhbGxldDEuYWRkcmVzcyldLCBkZXBsb3llci5hZGRyZXNzKSxcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoMyksIHR5cGVzLnByaW5jaXBhbChkZXBsb3llci5hZGRyZXNzKSwgdHlwZXMucHJpbmNpcGFsKHdhbGxldDEuYWRkcmVzcyldLCBkZXBsb3llci5hZGRyZXNzKSxcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ3RyYW5zZmVyJywgW3R5cGVzLnVpbnQoNSksIHR5cGVzLnByaW5jaXBhbChkZXBsb3llci5hZGRyZXNzKSwgdHlwZXMucHJpbmNpcGFsKHdhbGxldDEuYWRkcmVzcyldLCBkZXBsb3llci5hZGRyZXNzKVxuLy8gICAgICAgICAgICAgLy8gSWRlYTogY3JlYXRlIGEgZnVuY3Rpb24gdGhhdCB0cmFuc2ZlcnMgYSBsaXN0IG9mIHRva2VucyBpbiAxIGdvIVxuLy8gICAgICAgICBdKTtcbi8vICAgICAgICAgLy8gLy8gcHJpbnQgdGhlIG11bml0aW9ucyBzQlRDXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgMTltIHNhdHMuLi4uLi4uLlwiLCBibG9jazEucmVjZWlwdHNbMF0uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJyZXN1bHQgb2YgcHJpbnRpbmcuLi4uLi4uLlwiLCBibG9jazEucmVjZWlwdHNbMF0ucmVzdWx0KTtcbi8vICAgICAgICAgLy8gLy8gcHJpbnQgdGhlIGNhbGxzXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgNSBjYWxsIG9wdGlvbnMuLi4uLi4uLiBpcyAzIHRva2VucyBhbmQgMSBmdCBzQlRDIHRyYW5zZmVyXCIsIGJsb2NrMS5yZWNlaXB0c1sxXS5ldmVudHMpO1xuLy8gICAgICAgICAvLyB0cmFuc2ZlciB1MSB1MyBhbmQgdTUgdG8gd2FsbGV0IDFcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCIxIC0gMjIyMjIyMjIyMjIyMjIuLi4uLi4uLlwiLCBibG9jazEucmVjZWlwdHNbMl0uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCIzIC0gMzMzMzMzMzMzMzMzMzMzLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzNdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiNSAtIDQ0NDQ0NDQ0NDQ0NDQ0Li4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzRdLmV2ZW50cyk7XG5cbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcmludCB0aGUgaGVpZ2h0Li4uXCIsIGJsb2NrMS5oZWlnaHQpO1xuLy8gICAgICAgICAvLyBhc3NlcnRFcXVhbHMoYmxvY2sxLmhlaWdodCwgMyk7XG5cbi8vIC8vICAgICAgICAgbGV0IGJsb2NrMiA9IGNoYWluLm1pbmVCbG9jayhbXG4vLyAvLyAgICAgICAgIC8vIGV4ZXJjaXNlIHU1XG4vLyAvLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdleGVyY2lzZS1hbGwtb2YtbXktZXhlcmNpc2VyLWNhbGxzJywgW3R5cGVzLnByaW5jaXBhbChjb250cmFjdEFkZHJlc3MpXSwgd2FsbGV0MS5hZGRyZXNzKVxuLy8gLy8gIC8vIHdoZXJlIGlzIHRoZSBYYnRjIGNvbnRyYWN0P1xuLy8gLy8gICAgICAgICBdKTsgXG4vLyAvLyAgICAgICAgIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgZXhlcmNpc2luZyB1MS4uLi4uLi4uXCIsIGJsb2NrMi5yZWNlaXB0c1swXS5ldmVudHMpO1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIGV4ZXJjaXNpbmcgdTMuLi4uLi4uLlwiLCBibG9jazIucmVjZWlwdHNbMV0uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcmludGluZyBleGVyY2lzaW5nIHU1Li4uLi4uLi5cIiwgYmxvY2syLnJlY2VpcHRzWzJdLmV2ZW50cyk7XG4gICAgICAgIFxuLy8gICAgICAgICAvLyBvcGVuIEFJIGlzIGluY3JlZGlibGUhIGl0IHdpbGwgYWR2YW5jZSBhbmQgYWxsb3cgbWUgdG8gbGVhcm4gc28gcXVpY2tseS4uLiBiZWluZyBlYXJseSBpcyBhIGh1Z2UgYWR2YW50YWdlIHdpdGggIG9wZW4gQUkgb24gbXkgc2lkZSBhbmQgdGhpcyBhbWF6aW5nIGNvbW11bml0eVxuLy8gICAgICAgICAvLyBsZXQncyB3b3JrLCBjb21wb3VuZCBhbmQgZGVwbG95IGNvbW1vbiBnb29kcyBmb3IgYSBiZXR0ZXIgRGVGaSB3b3JsZCBhbmQgc3F1ZWV6ZSB0aG9zZSB3YWxsIGdhcmRlbiBnYXRla2VlcGVycyBvdXQgb2YgdGhlIG1hcmtldFxuXG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiUHJpbnQgdGhlIGhlaWdodCBvZiBibG9jayAyLi4uXCIsIGJsb2NrMi5oZWlnaHQpO1xuXG4vLyAgICAgICAgIC8vIGNoYWluLm1pbmVFbXB0eUJsb2NrKDIxMDApOyAvLyBvcHRpb25zIGV4cGlyZWQgbm93IVxuLy8gICAgICAgICBsZXQgYmxvY2szID0gY2hhaW4ubWluZUJsb2NrKFtcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ2NvdW50ZXJwYXJ0eS1yZWNsYWltJywgW3R5cGVzLnByaW5jaXBhbChjb250cmFjdEFkZHJlc3MpLCB0eXBlcy51aW50KDEpXSwgZGVwbG95ZXIuYWRkcmVzcylcbi8vIF0pOyBcbi8vICAgICAgICAgYmxvY2szLnJlY2VpcHRzWzBdLnJlc3VsdC5leHBlY3RFcnIoKS5leHBlY3RVaW50KDEwMTIpOyAvLyBkZXBsb3llciBjYW5ub3QgcmVjbGFpbSBpdCBhcyBpdCBkZXNuJ3QgYmVsb25nIHRvIGhpbSBhbmQgaXQncyBub3QgZXhwaXJlZFxuLy8gfSxcbi8vIH0pO1xuXG4vLyBDbGFyaW5ldC50ZXN0KHtcbi8vICAgICBuYW1lOiBcIiBUZXN0aW5nIHRoZSByZWNsYWltIHRoZW0gYWxsXCIsXG4vLyAgICAgYXN5bmMgZm4oY2hhaW46IENoYWluLCBhY2NvdW50czogTWFwPHN0cmluZywgQWNjb3VudD4pIHtcbi8vICAgICAgICAgLy8gYXJyYW5nZTogc2V0IHVwIHRoZSBjaGFpbiwgc3RhdGUsIGFuZCBvdGhlciByZXF1aXJlZCBlbGVtZW50c1xuLy8gICAgICAgICBsZXQgZGVwbG95ZXIgPSBhY2NvdW50cy5nZXQoXCJkZXBsb3llclwiKSE7XG4vLyAgICAgICAgIGxldCB3YWxsZXQxID0gYWNjb3VudHMuZ2V0KFwid2FsbGV0XzFcIikhO1xuLy8gICAgICAgICBsZXQgd2FsbGV0MiA9IGFjY291bnRzLmdldChcIndhbGxldF8yXCIpITtcbi8vICAgICAgICAgY29uc3QgY29udHJhY3RBZGRyZXNzID0gZGVwbG95ZXIuYWRkcmVzcyArICcuc2J0Yyc7XG4vLyAgICAgICAgIGNvbnN0IGNvbnRyYWN0QWRkcmVzc0NhbGwgPSBkZXBsb3llci5hZGRyZXNzICsgJy5zaXplYWJsZS1iaXRjb2luLWNhbGwnO1xuXG4vLyAgICAgICAgIGxldCBibG9jazEgPSBjaGFpbi5taW5lQmxvY2soW1xuLy8gICAgICAgICAgICAgLy8gcHJpbnQgbXlzZWxmIDAuMTkgU0JUQywgYSBjYWxsIG9wdGlvbiBsb2NrcyAwLjAzIHNCVENcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2J0YycsICdtaW50JywgW3R5cGVzLnVpbnQoMTkwMDAwMDApLCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyldLCBkZXBsb3llci5hZGRyZXNzKSxcbi8vICAgICAgICAgICAgICAgICAgICAgLy8gcHJpbnQgNSBzQlRDIGNhbGwgb3B0aW9ucyBzdHJpa2UgMTAwMCBTVFggZWFjaFxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAnbWludCcsIFt0eXBlcy5wcmluY2lwYWwoY29udHJhY3RBZGRyZXNzKSwgdHlwZXMudWludCgxNTAwMDAwMCksIHR5cGVzLnVpbnQoMTAwMDAwMDAwMCldLCBkZXBsb3llci5hZGRyZXNzKSxcbi8vICAgICAgICAgICAgIC8vIFRyYW5zZmVyIHUxIHUzIGFuZCB1NSB0byB3YWxsZXQgMVxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAndHJhbnNmZXInLCBbdHlwZXMudWludCgxKSwgdHlwZXMucHJpbmNpcGFsKGRlcGxveWVyLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0MS5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAndHJhbnNmZXInLCBbdHlwZXMudWludCgzKSwgdHlwZXMucHJpbmNpcGFsKGRlcGxveWVyLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0MS5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAndHJhbnNmZXInLCBbdHlwZXMudWludCg1KSwgdHlwZXMucHJpbmNpcGFsKGRlcGxveWVyLmFkZHJlc3MpLCB0eXBlcy5wcmluY2lwYWwod2FsbGV0MS5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpXG4vLyAgICAgICAgICAgICAvLyBJZGVhOiBjcmVhdGUgYSBmdW5jdGlvbiB0aGF0IHRyYW5zZmVycyBhIGxpc3Qgb2YgdG9rZW5zIGluIDEgZ28hXG4vLyAgICAgICAgIF0pO1xuLy8gICAgICAgICAvLyAvLyBwcmludCB0aGUgbXVuaXRpb25zIHNCVENcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcmludGluZyAxOW0gc2F0cy4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1swXS5ldmVudHMpO1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInJlc3VsdCBvZiBwcmludGluZy4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1swXS5yZXN1bHQpO1xuLy8gICAgICAgICAvLyAvLyBwcmludCB0aGUgY2FsbHNcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcmludGluZyA1IGNhbGwgb3B0aW9ucy4uLi4uLi4uIGlzIDMgdG9rZW5zIGFuZCAxIGZ0IHNCVEMgdHJhbnNmZXJcIiwgYmxvY2sxLnJlY2VpcHRzWzFdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIHRyYW5zZmVyIHUxIHUzIGFuZCB1NSB0byB3YWxsZXQgMVxuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcIjEgLSAyMjIyMjIyMjIyMjIyMi4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1syXS5ldmVudHMpO1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcIjMgLSAzMzMzMzMzMzMzMzMzMzMuLi4uLi4uLlwiLCBibG9jazEucmVjZWlwdHNbM10uZXZlbnRzKTtcbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCI1IC0gNDQ0NDQ0NDQ0NDQ0NDQuLi4uLi4uLlwiLCBibG9jazEucmVjZWlwdHNbNF0uZXZlbnRzKTtcblxuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50IHRoZSBoZWlnaHQuLi5cIiwgYmxvY2sxLmhlaWdodCk7XG4vLyAgICAgICAgIC8vIGFzc2VydEVxdWFscyhibG9jazEuaGVpZ2h0LCAzKTtcblxuLy8gICAgICAgICBsZXQgYmxvY2syID0gY2hhaW4ubWluZUJsb2NrKFtcbi8vICAgICAgICAgLy8gZXhlcmNpc2UgdTVcbi8vIFR4LmNvbnRyYWN0Q2FsbCgnc2l6ZWFibGUtYml0Y29pbi1jYWxsJywgJ2V4ZXJjaXNlLWFsbC1vZi1teS1leGVyY2lzZXItY2FsbHMnLCBbdHlwZXMucHJpbmNpcGFsKGNvbnRyYWN0QWRkcmVzcyldLCB3YWxsZXQxLmFkZHJlc3MpXG4vLyAgLy8gd2hlcmUgaXMgdGhlIFhidGMgY29udHJhY3Q/XG4vLyAgICAgICAgIF0pOyBcbi8vICAgICAgICAgY29uc29sZS5sb2coXCJwcmludGluZyBleGVyY2lzaW5nIHUxLi4uLi4uLi5cIiwgYmxvY2syLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4vLyAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgZXhlcmNpc2luZyB1My4uLi4uLi4uXCIsIGJsb2NrMi5yZWNlaXB0c1sxXS5ldmVudHMpO1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIGV4ZXJjaXNpbmcgdTUuLi4uLi4uLlwiLCBibG9jazIucmVjZWlwdHNbMl0uZXZlbnRzKTtcbiAgICAgICAgXG4vLyAgICAgICAgIC8vIG9wZW4gQUkgaXMgaW5jcmVkaWJsZSEgaXQgd2lsbCBhZHZhbmNlIGFuZCBhbGxvdyBtZSB0byBsZWFybiBzbyBxdWlja2x5Li4uIGJlaW5nIGVhcmx5IGlzIGEgaHVnZSBhZHZhbnRhZ2Ugd2l0aCAgb3BlbiBBSSBvbiBteSBzaWRlIGFuZCB0aGlzIGFtYXppbmcgY29tbXVuaXR5XG4vLyAgICAgICAgIC8vIGxldCdzIHdvcmssIGNvbXBvdW5kIGFuZCBkZXBsb3kgY29tbW9uIGdvb2RzIGZvciBhIGJldHRlciBEZUZpIHdvcmxkIGFuZCBzcXVlZXplIHRob3NlIHdhbGwgZ2FyZGVuIGdhdGVrZWVwZXJzIG91dCBvZiB0aGUgbWFya2V0XG5cbi8vICAgICAgICAgLy8gY29uc29sZS5sb2coXCJQcmludCB0aGUgaGVpZ2h0IG9mIGJsb2NrIDIuLi5cIiwgYmxvY2syLmhlaWdodCk7XG5cbi8vICAgICAgICAgY2hhaW4ubWluZUVtcHR5QmxvY2soNDIwMCk7IC8vIG9wdGlvbnMgZXhwaXJlZCBub3chXG5cbi8vICAgICAgICAgbGV0IGRlcGxveWVyUmVjbGFpbSA9IGNoYWluLmNhbGxSZWFkT25seUZuKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAnZ2V0LXJlY2xhaW1hYmxlLWNhbGxzJywgW3R5cGVzLnByaW5jaXBhbChkZXBsb3llci5hZGRyZXNzKV0sIGRlcGxveWVyLmFkZHJlc3MpO1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhcIkdldCBkZXBsb3llciByZWNsYWltYWJsZSBjYWxscy4uIFwiLCBkZXBsb3llclJlY2xhaW0pO1xuLy8gICAgICAgICAvLyB3YWxsZXQxQmFsYW5jZS5yZXN1bHQuZXhwZWN0T2soKS5leHBlY3RVaW50KDEyMzQ1Nik7IFxuXG4vLyAgICAgICAgIGxldCBibG9jazMgPSBjaGFpbi5taW5lQmxvY2soW1xuXG4vLyBUeC5jb250cmFjdENhbGwoY29udHJhY3RBZGRyZXNzQ2FsbCwgJ3JlY2xhaW1pbmcnLCBbXSwgZGVwbG95ZXIuYWRkcmVzcykgLy8gc3VjaCBhIHdhc3RlIG9mIHRpbWUsIGJ1dCBpZiBJIGRvbid0IHBhc3MgZW1wdHkgcGFyYW1zIFtdIHRoZW4gSSBnZXQgXCJlcnJvcjogVHlwZUVycm9yOiBFcnJvciBwYXJzaW5nIGFyZ3MgYXQgcG9zaXRpb24gMDogaW52YWxpZCBsZW5ndGggMCwgZXhwZWN0ZWQgc3RydWN0IFRyYW5zYWN0aW9uQXJncyB3aXRoIDQgZWxlbWVudHNcIlxuLy8gXSk7IFxuLy8gICAgIGNvbnNvbGUubG9nKFwiZGVwbG95ZXIgcmVjbGFpbXMgYWxsIGV4cGlyZWQgb3B0aW9ucy4uLi4uLi5cIiwgYmxvY2szLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4vLyAgICAgY29uc29sZS5sb2coXCJwcmludCB0aGUgaGVpZ2h0Li4uXCIsIGJsb2NrMy5oZWlnaHQpO1xuLy8gICAgIC8vICAgICAvLyBibG9jazMucmVjZWlwdHNbMF0ucmVzdWx0LmV4cGVjdEVycigpLmV4cGVjdFVpbnQoMTAwNyk7IC8vIHRva2VuIGlkIG5vdCBmb3VuZCBiZWNhdXNlIGl0IHdhcyBleGVyY2lzZWQgYW5kIGJ1cm50IHNvIGRlcGxveWVyIGNhbm5vdCByZWNsYWltIGl0XG4vLyB9LFxuLy8gfSk7XG5cbi8vIHdlIGhhdmUgdG8gZmlsdGVyIGl0ZW1zIG91dCBvZiByZWNsYWltYWJsZSAoZnJvbSBjb3VudGVycGFydHkpIHdoZW4gaXQgaXMgZXhlcmNpc2VkIVxuLy8gbm8gYmVjYXVzZSB3aGVuIHRva2VuIGlzIG5vdCBmb3VuZCwgXG4vLyBiZWZvcmUgdGhhdCBsZXQncyBqdXN0IHRlc3QgaXQgd2hlbiBub25lIGFyZSBleGVyY2lzZWQhXG4vLyByZXZpc2UgaWYgSSBuZWVkIGEgbGlzdCBmb3IgYWxsIGNhbGxzLCBhbmQgYSBtYXAgZm9yIGV4ZXJjaXNhYmxlIGNhbGxzIC0geWVzIEkgZG8gYmVjYXVzZSBvZiB3aGF0P1xuLy8gSSBwcm9iYWJseSBkb24ndCBzbyBJIG5lZWQgdG8gbWVyZ2UgdGhlIDI/XG5cbkNsYXJpbmV0LnRlc3Qoe1xuICAgIG5hbWU6IFwiIFRyYW5zZmVycmluZyBhIGxpc3Qgb2YgdG9rZW4gd2l0aCBzYW1lIHN0cmlrZXMgYW5kIGV4cGlyYXRpb25zIGZyb20gd2l0aGluIDcgYmxvY2tzIFwiLFxuICAgIGFzeW5jIGZuKGNoYWluOiBDaGFpbiwgYWNjb3VudHM6IE1hcDxzdHJpbmcsIEFjY291bnQ+KSB7XG4gICAgICAgIC8vIGFycmFuZ2U6IHNldCB1cCB0aGUgY2hhaW4sIHN0YXRlLCBhbmQgb3RoZXIgcmVxdWlyZWQgZWxlbWVudHNcbiAgICAgICAgbGV0IGRlcGxveWVyID0gYWNjb3VudHMuZ2V0KFwiZGVwbG95ZXJcIikhO1xuICAgICAgICBsZXQgd2FsbGV0MSA9IGFjY291bnRzLmdldChcIndhbGxldF8xXCIpITtcbiAgICAgICAgbGV0IHdhbGxldDIgPSBhY2NvdW50cy5nZXQoXCJ3YWxsZXRfMlwiKSE7XG4gICAgICAgIGNvbnN0IGNvbnRyYWN0QWRkcmVzcyA9IGRlcGxveWVyLmFkZHJlc3MgKyAnLnNidGMnO1xuICAgICAgICBjb25zdCBjb250cmFjdEFkZHJlc3NDYWxsID0gZGVwbG95ZXIuYWRkcmVzcyArICcuc2l6ZWFibGUtYml0Y29pbi1jYWxsJztcbiAgICAgICAgXG4gICAgICAgIGxldCBteUxpc3QgPSB0eXBlcy5saXN0KFt0eXBlcy51aW50KDEpLCB0eXBlcy51aW50KDIpXSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJteUxpc3QgaXMuLi5cIiwgbXlMaXN0KTtcblxuICAgICAgICBsZXQgYmxvY2sxID0gY2hhaW4ubWluZUJsb2NrKFtcbiAgICAgICAgICAgIC8vIHByaW50IG15c2VsZiAwLjE5IFNCVEMsIGEgY2FsbCBvcHRpb24gbG9ja3MgMC4wMyBzQlRDXG5UeC5jb250cmFjdENhbGwoJ3NidGMnLCAnbWludCcsIFt0eXBlcy51aW50KDE5MDAwMDAwKSwgdHlwZXMucHJpbmNpcGFsKGRlcGxveWVyLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcyksXG4gICAgICAgICAgICAvLyBwcmludCA1IHNCVEMgY2FsbCBvcHRpb25zIHN0cmlrZSAxMDAwIFNUWCBlYWNoXG5UeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdtaW50JywgW3R5cGVzLnByaW5jaXBhbChjb250cmFjdEFkZHJlc3MpLCB0eXBlcy51aW50KDE1MDAwMDAwKSwgdHlwZXMudWludCgxMDAwMDAwMDAwKV0sIGRlcGxveWVyLmFkZHJlc3MpLFxuICAgICAgICAgICAgLy8gVHJhbnNmZXItc2FtZS1zdHJpa2VzXG5UeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICd0cmFuc2Zlci1zYW1lLXN0cmlrZXMnLCBbbXlMaXN0LCB0eXBlcy5wcmluY2lwYWwoZGVwbG95ZXIuYWRkcmVzcyksIHR5cGVzLnByaW5jaXBhbCh3YWxsZXQxLmFkZHJlc3MpXSwgZGVwbG95ZXIuYWRkcmVzcylcblxuICAgICAgICBdKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRyYW5zZmVyIHNhbWUgc3RyaWtlcy4uLi4uLi4uXCIsIGJsb2NrMS5ldmVudHMpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcInRyYW5zZmVyIHNhbWUgc3RyaWtlcy4uLi4uLi4uXCIsIGJsb2NrMS5ldmVudHNbMl0pO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcInRyYW5zZmVyIHNhbWUgc3RyaWtlcy4uLi4uLi4uXCIsIGJsb2NrMS5ldmVudHNbM10pO1xuXG5cbiAgICB9LFxufSk7XG4gICAgICAgIC8vIC8vIHByaW50IHRoZSBtdW5pdGlvbnMgc0JUQ1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIDE5bSBzYXRzLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzBdLmV2ZW50cyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwicmVzdWx0IG9mIHByaW50aW5nLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzBdLnJlc3VsdCk7XG4gICAgICAgIC8vIC8vIHByaW50IHRoZSBjYWxsc1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcInByaW50aW5nIDUgY2FsbCBvcHRpb25zLi4uLi4uLi4gaXMgMyB0b2tlbnMgYW5kIDEgZnQgc0JUQyB0cmFuc2ZlclwiLCBibG9jazEucmVjZWlwdHNbMV0uZXZlbnRzKTtcbiAgICAgICAgLy8gdHJhbnNmZXIgdTEgdTMgYW5kIHU1IHRvIHdhbGxldCAxXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiMSAtIDIyMjIyMjIyMjIyMjIyLi4uLi4uLi5cIiwgYmxvY2sxLnJlY2VpcHRzWzJdLmV2ZW50cyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiMyAtIDMzMzMzMzMzMzMzMzMzMy4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1szXS5ldmVudHMpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIjUgLSA0NDQ0NDQ0NDQ0NDQ0NC4uLi4uLi4uXCIsIGJsb2NrMS5yZWNlaXB0c1s0XS5ldmVudHMpO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnQgdGhlIGhlaWdodC4uLlwiLCBibG9jazEuaGVpZ2h0KTtcbiAgICAgICAgLy8gYXNzZXJ0RXF1YWxzKGJsb2NrMS5oZWlnaHQsIDMpO1xuXG4vLyAgICAgICAgIGxldCBibG9jazIgPSBjaGFpbi5taW5lQmxvY2soW1xuLy8gICAgICAgICAvLyBleGVyY2lzZSB1NVxuLy8gVHguY29udHJhY3RDYWxsKCdzaXplYWJsZS1iaXRjb2luLWNhbGwnLCAnZXhlcmNpc2UtYWxsLW9mLW15LWV4ZXJjaXNlci1jYWxscycsIFt0eXBlcy5wcmluY2lwYWwoY29udHJhY3RBZGRyZXNzKV0sIHdhbGxldDEuYWRkcmVzcylcbi8vICAvLyB3aGVyZSBpcyB0aGUgWGJ0YyBjb250cmFjdD9cbi8vICAgICAgICAgXSk7IFxuLy8gICAgICAgICBjb25zb2xlLmxvZyhcInByaW50aW5nIGV4ZXJjaXNpbmcgdTEuLi4uLi4uLlwiLCBibG9jazIucmVjZWlwdHNbMF0uZXZlbnRzKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcmludGluZyBleGVyY2lzaW5nIHUzLi4uLi4uLi5cIiwgYmxvY2syLnJlY2VpcHRzWzFdLmV2ZW50cyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJpbnRpbmcgZXhlcmNpc2luZyB1NS4uLi4uLi4uXCIsIGJsb2NrMi5yZWNlaXB0c1syXS5ldmVudHMpO1xuICAgICAgICBcbiAgICAgICAgLy8gb3BlbiBBSSBpcyBpbmNyZWRpYmxlISBpdCB3aWxsIGFkdmFuY2UgYW5kIGFsbG93IG1lIHRvIGxlYXJuIHNvIHF1aWNrbHkuLi4gYmVpbmcgZWFybHkgaXMgYSBodWdlIGFkdmFudGFnZSB3aXRoICBvcGVuIEFJIG9uIG15IHNpZGUgYW5kIHRoaXMgYW1hemluZyBjb21tdW5pdHlcbiAgICAgICAgLy8gbGV0J3Mgd29yaywgY29tcG91bmQgYW5kIGRlcGxveSBjb21tb24gZ29vZHMgZm9yIGEgYmV0dGVyIERlRmkgd29ybGQgYW5kIHNxdWVlemUgdGhvc2Ugd2FsbCBnYXJkZW4gZ2F0ZWtlZXBlcnMgb3V0IG9mIHRoZSBtYXJrZXRcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlByaW50IHRoZSBoZWlnaHQgb2YgYmxvY2sgMi4uLlwiLCBibG9jazIuaGVpZ2h0KTtcblxuICAgICAgICAvLyBjaGFpbi5taW5lRW1wdHlCbG9jaygyMTAwKTsgLy8gb3B0aW9ucyBleHBpcmVkIG5vdyFcbi8vICAgICAgICAgbGV0IGJsb2NrMyA9IGNoYWluLm1pbmVCbG9jayhbXG4vLyBUeC5jb250cmFjdENhbGwoJ3NpemVhYmxlLWJpdGNvaW4tY2FsbCcsICdjb3VudGVycGFydHktcmVjbGFpbScsIFt0eXBlcy5wcmluY2lwYWwoY29udHJhY3RBZGRyZXNzKSwgdHlwZXMudWludCgxKV0sIGRlcGxveWVyLmFkZHJlc3MpXG4vLyBdKTsgXG4vLyAgICAgICAgIGJsb2NrMy5yZWNlaXB0c1swXS5yZXN1bHQuZXhwZWN0RXJyKCkuZXhwZWN0VWludCgxMDEyKTsgLy8gZGVwbG95ZXIgY2Fubm90IHJlY2xhaW0gaXQgYXMgaXQgZGVzbid0IGJlbG9uZyB0byBoaW0gYW5kIGl0J3Mgbm90IGV4cGlyZWRcbi8vIH0sXG4vLyB9KTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxTQUFTLFFBQVEsRUFBRSxFQUFFLEVBQWtCLEtBQUssUUFBUSw4Q0FBOEMsQ0FBQztBQUVuRyx1REFBdUQ7QUFFdkQscUNBQXFD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