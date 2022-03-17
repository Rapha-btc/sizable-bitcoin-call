Created for 2022 Clarity Universe Hackathon https://devpost.com/software/stacks-covered-calls

![Options involve price and time!](https://user-images.githubusercontent.com/28972498/158882895-421eaad3-5ad6-42e5-96a4-faf7111292db.jpg)

<h1>Inspiration</h1>
The Stacks ecosystem is a vibrant community that is quickly adding necessary systems and primitives to allow for a multitude of decentralized financial actions. For example decentralized exchanges are only months old. While NFT marketplaces have been very quick to fill a need of buying and selling NFTs, they do not allow holders of NFTs to make a more nuanced decisions about their assets other than a price to buy or sell.

The introduction of options will significantly change the landscape of financial assets on the Stacks ecosystem. Rather than simply allowing an asset owner to place and offer to buy or sell, they incorporate a time premium into these offers to buy or sell. For both the buyer and seller of options, they potentially gain greater capital efficiency. Furthermore since we will use the blockchain as a clearing mechanism, settlement no longer has the counterparty risk that exists in traditional financial derivative markets.

Recently the issue of counterparty risk has once again come to the forefront with a multibillion dollar LME scandal

<h1>A Crash Course On Options</h1>
An option is a contract involving and underlying asset. For this project we will only concern ourselves with Stacks as an underlying asset though it should be noted that we can use any SIP-009 or SIP-010 for the underlying asset of an options contract.

When you consider an option there are always two parties (principals). There is the principal that sold the contract - we will call this person the counterparty. This person is also said to be short the option contract. Similarly there is a person who purchased the option contract. This person is said to be long the option contact. We will refer to this person as the contract owner.

There are two types of options: calls and puts. A call option confers to the contract owner the right (but not obligation) to purchase the underlying asset at a predetermined price at or before a predetermined date. Conversely a put option confers to the contract owner the right (but not obligation) to sell the underlying asset at a predetermined price at or before a predetermined date.

For both calls and puts, the predetermined date is referred to as the strike price. For this project we will denominate strike price in United States Dollar terms. We will create a SIP-010 coin called "Wrapped USDC" which is meant to have a stable peg to the United States Dollar to serve as our on-chain asset to serve in this capacity.

For both calls and puts, the predetermined date is referred to as the strike date. For this project, as it is on-chain, we will use the stacks chain block height rather than a calendar date and time.

The act of the contract owner using the contract they own is referred to as exercising the contract.

It should be noted that since the contract owner has the right but not obligation to buy (call) or sell (put) by virtue of owning the contact, the counterparty has the obligation to sell (call) or buy (put) should the contract owner wish to exercise their contract.

<h1>Stacks Covered Calls - what does it do?</h1>
For this project, we will narrow the scope of what type of options we are dealing with. We will limit our area of focus to calls. Additionally we will only allow counterparties (those that create and sell an option) to do so if they have the full underlying asset to commit to the contract for settlement should the call owner wish to exercise the contract. This type of underlying asset secured call is referred to as a covered call.

<h2>Example</h2>
UserA owns 100 Stacks. Lets say that Stacks is currently trading at 1.50 USDC. UserA does not wish to sell at 1.50 USDC but would love to sell at 2.00 USDC. Through the use of call options, UserA is able to create and sell a call with a strike price of 2.00 USDC at a strike date of their choosing. For this example, lets use block height of 1000 blocks (~ 7 days) from the current block height. UserA is potentially giving up any price appreciation over 2.00 USDC should it occur before the strike date. This is the value that the option contract represents to whomever may purchase it from UserA. The value and cost of purchasing the option is called the option premium, and is UserA's to keep regardless of what occurs.

UserB will represent the purchaser of UserA's option contact. They do not own any Stacks but thinks Stacks has the potential to go higher than 2.00 USDC in the next 1000 blocks. Therefore they are willing to purchase UserA's contract for a premium so that they can buy UserA's stacks at 2.00 USDC should such a price increase occur. UserA and UserB agree on a premium price of 15 USDC. This represents 10% of the underlying asset value (100 stacks X 1.50 USDC)

<h2>Create the contract</h2>
UserA will call into our contract supplying the 100 stacks, a strike price of 2.00 USDC, and a strike date of 1000 blocks from current block height. The contract will lock (move from UserA's wallet to the contract itself) the Stacks. The contract will issue UserA a SIP-009 token that represents the covered call.

<h2>Sell the contract</h2>
Since a SIP-009 token is a NFT, it can be traded exactly as an NFT in an existing marketplace. We will not implement market place functionality for this project as this is out of scope. In this case, UserA will sell their SIP-009 NFT that represents the covered call to UserB for 15 USDC. After this transaction is complete UserB will have the SIP-009 token in their wallet and UserA will have 15 USDC in their wallet.

<h2>What happens next</h2>
From this point forward UserB will be hoping that they are right about the price of Stacks going above 2.00 USD before the strike date. (An option cannot be used after the strike date)

There are two possibilities: the price stays below the strike price of the option or price climbs above the strike price.

<h2>Scenario A: Price stays below the strike price through expiration date</h2>
In this case UserB will not exercise the call option they own because the effective price they pay is 2.00 USDC per Stack and the price is below that amount. If UserB wanted to purchase stacks they would be better off going through an exchange and paying market price. In this case the call expires after the strike date, worthless. UserA keeps their call premium (15 USDC) and can redeem their stacks from the contract after the strike date.

<h2>Scenario B: Price rises above the strike price before or on the expiration date</h2>
In this case UserB will exercise the call option. They will do so by initiating a transaction to the contract providing a numeric id assigned to the SIP-009 token that they own. They will also supply the amount of USDC necessary to purchase the underlying asset at the _strike price _. In our example that will be 100 * 2.00 USDC for a total of 200 USDC. The 200 USDC will be transferred to UserA (the counterparty) and the 100 stacks will be transferred to UserB. Once this is complete UserB will have 100 Stacks. They will have spent 200 USDC to exercise the call option and they paid 15 USDC for the contact itself. Therefore their net cost is 215 USDC for 100 Stacks. UserA will have not be able to redeem the 100 Stacks from the Clarify contact since the contract transferred these to UserB. Instead they will keep the 15 USDC that UserB paid them for the call option and the 200 USDC that UserB pays to exercise the option. As we can see - UserA effectively has sold his Stacks for 2.15 USDC per Stack.
