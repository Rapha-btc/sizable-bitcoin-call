async function createCallOption() {
    const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sizeable-bitcoin-call';  // replace with your contract address
    const wrappedBtcContractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc';  // replace with your contract address
    const contractName = 'sizeable-bitcoin-call';  // replace with your contract name
    const network = new stacks.transactions.StacksTestnet();
    const privateKey = 'twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw';  // replace with the user's private key
    const numContractsInput = document.getElementById('numContracts'); // 5;  // replace with the actual number of contracts
    const numContracts = numContractsInput.value; //Remember that numContracts will be a string, because that's what element.value gives you. 
    //const stacksPrice = 1000000000;  // replace with the actual stacks price
    const stacksPriceInput = document.getElementById('stacksPrice');
    const stacksPrice = Number(stacksPriceInput.value);
    
    //(define-public (mint (wrapped-btc-contract <wrapped-btc-trait>) (btc-locked uint) (strike-price uint)) 
    const txOptions = {
        contractAddress,
        contractName,
        functionName: 'mint',  // replace with your actual function name
        functionArgs: [// add the wrapped-btc-contract argument
            // stacks.transactions.contractPrincipalCV(contractAddress, wrappedBtcContractAddress, 'wrapped-btc-trait'),
            stacks.transactions.contractPrincipalCV(wrappedBtcContractAddress),
            stacks.transactions.uintCV(numContracts*0.03),
            stacks.transactions.uintCV(stacksPrice),
        ],
        senderKey: privateKey,
        network
    };

    const transaction = await stacks.transactions.makeContractCall(txOptions);
    const response = await stacks.blockchainApiClient.broadcastTransaction(transaction, network);

    // TODO: Handle the response
}

document.getElementById('lockForm').addEventListener('submit', (event) => {
    event.preventDefault();
    createCallOption();
});

