(use-trait wrapped-btc-trait .sip010-ft-trait.sip010-ft-trait) ;; to be able to pass an NFT as param in exercise function, this necessary?
(impl-trait .sip009-nft-trait.sip009-nft-trait) ;; covered-puts are nfts
;; title: covered-put.clar
;; version: 1.0
;; author: @rapha.btc
;; summary:
;; If the option expires in the money, there is no cash-settlement mechanism.  
;; The call owner would need to exercise the option and then sell the underlying asset on a market before the strike date.
;; SIP-018 could be used to facilitate a cash-settlement mechanism in the future. 

;; Note to self: designing an sBTC-covered put on the price of STX/BTC would be a good next step.  
;; Counterparty creates a put on the price of STX/BTC by locking up in the contract the sBTC amount equivalent to 100 STX.
;; Countterparty receives a SIP-009 token representing the put.
;; Strike is 1000 blocks in the future.
;; Then we can offer Bitcoiners to farm stacking rewards while being hedged against a drop in the price of STX/BTC.

;; USDA is now a more viable option compared to wrapped USDC, which was initially used due to its wider availability. 
;; This is because the launch of a stable swap on ALEX has stabilized the peg of USDA, while using wrapped USDC could actually hinder our efforts to mitigate counterparty risk.

;; The USDA token is a SIP-010 fungible token that is backed by the Arkadiko protocol. 
;; Collaterals backing USDA currently include STX, auto-Alex and xBTC.

;; description:

;; 1000 stx = 0.03051000 btc 
;; 1000 stx = 0.03050000 btc 
;; I want to buy a put on the price of STX such that if the price of STX drops to 0.03050000 BTC I will be able to exercise the put and receive 0.03050000 BTC.
;; currently 1000 stx = 0.03051000 btc (https://www.coingecko.com/en/coins/stacks/btc)

;; let's take lots of 0.03000000 BTC (3m sats)

;; traits
;;

;; token definitions
;; 

;; constants
;;
(define-constant ERR-INSUFFICIENT-UNDERLYING-BALANCE (err "err-insufficient-underlying-balance"))
(define-constant ERR-STRIKE-PRICE-IS-ZERO (err "err-strike-price-cannot-be-zero"))
(define-constant ERR-QUANTITY-NOT-ROUND-LOT (err "err-quantity-not-round-lot"))
(define-constant ERR-MIN-QUANTITY-NOT-MET (err "err-min-quantity-not-met"))
(define-constant ERR-UNABLE-TO-TRANSFER (err u2004))
(define-constant ERR-UNABLE-TO-LOCK (err u2005))
(define-constant ERR-UNABLE-TO-UNLOCK (err u2006))
(define-constant ERR-NOT-TOKEN-OWNER (err u2007))
(define-constant ERROR-GETTING-BALANCE (err "err-getting-balance"))
(define-constant ERR-UNABLE-TO-LOCK-UNDERLYING-ASSET (err "err-unable-to-lock-underlying-asset"))

(define-constant ERR-TOKEN-ID-NOT-FOUND (err u1007)) ;; clarity wants the same type in all path which is something I am trying to get familiar with
(define-constant ERR-INVALID-PRINCIPAL (err u1008))
(define-constant ERR-TOKEN-EXPIRED (err u1009))
(define-constant ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE (err u1010))

;; (define-constant SBTC_DISPLAY_FACTOR u300000)
(define-constant SBTC_ROUND_LOT_FACTOR u3000000)
(define-constant DISPLAY_FACTOR u100000000) ;; 100m sats = 1 btc
(define-constant PUT-LENGTH u2100) ;; 2100 blocks in the future

(define-constant SBTC-PRINCIPAL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc) ;; ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM is the 1rst address in the simulated environment

;; data vars
;;
(define-non-fungible-token sbtc-covered-put uint) ;; a 'put' is simply an NFT that represents the right to sell 100 STX at a strike date in 2100 blocks for 0.00305100 BTC
(define-data-var last-put-id uint u0)

;; data maps
;;
(define-map put-data uint { 
        counterparty: principal,
        btc-locked: uint, ;; this is always 3m sats sBTC
        strike-price: uint, ;; 1000 stx? 950 stx? protect me against a drop below 950 stx per 3m sats sBTC
        strike-height: uint,
    }
)
;; ./.......................................
;; try an use fold here or map instead of the while loop?

;;..........................................................................
;;public functions

(define-public (mint (btc-locked uint) (strike-price uint)) 
   (let
        (
            (token-id (+ (var-get last-put-id) u1)) ;; increment the last call id before creating it
            (sbtc-get-balance (unwrap! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc get-balance tx-sender) ERROR-GETTING-BALANCE));; get the balance of the sender in the sbtc contract
            (strike-height (+ block-height PUT-LENGTH)) ;; the strike date is 2100 blocks in the future
            (number-of-lots-to-lock (/ btc-locked SBTC_ROUND_LOT_FACTOR))
        )
        (asserts! (>= btc-locked SBTC_ROUND_LOT_FACTOR) ERR-MIN-QUANTITY-NOT-MET) ;; modulo will return the tested number if it is lesser than the divider, hence exit in that case
        (asserts! (is-eq (mod btc-locked SBTC_ROUND_LOT_FACTOR) u0) ERR-QUANTITY-NOT-ROUND-LOT) ;; let's print put options representing 3m sats per put, user needs to give a factor of 3m sats sBTC
        (asserts! (>= sbtc-get-balance btc-locked) ERR-INSUFFICIENT-UNDERLYING-BALANCE)
        (asserts! (> strike-price u0) ERR-STRIKE-PRICE-IS-ZERO)
        
        ;; now we need to mint as many NFTs as there are lots to lock
        ;; clarity doesn't support recursion, 
        ;; so we need to use a helper function / fold / map / can someone suggest something?
        (unwrap! (nft-mint? sbtc-covered-put token-id tx-sender) (err "err-minting-nft"))
        (map-set put-data token-id
                { 
                    counterparty : tx-sender,
                    btc-locked : SBTC_ROUND_LOT_FACTOR, ;; this is 3m sats sBTC
                    strike-price: strike-price, ;; this is the only user variable, whether I can buy the 3m sats sBTC lot at 950 stx or 1000 stx or whatever stx amount?
                    strike-height: strike-height ;; this is just block-height + u2100 (1 cycle)
                }
        )
        ;; (var-set last-put-id (+ token-id u1) );; outside of the while loop, increment as many times as there are lots to lock
        (unwrap! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc transfer btc-locked tx-sender (as-contract tx-sender) none) ERR-UNABLE-TO-LOCK-UNDERLYING-ASSET) ;; outside of the loop, lock all the lots at once
        (ok true)
    )
)

;; this is one of the reason why a non pro will have a head start, pros don't want to learn how to deal with loops in Clarity
;; non-pros like me have everything to learn, so can start from scratch and why not a powerful and secured language like Clarity?

        ;; ;; now we need to mint as many tokens as there are lots to lock, first we mint and then we define the data
        ;; (while (>= number-of-lots-to-lock u0)
        ;;     (try! (nft-mint? sbtc-covered-put token-id tx-sender))
        ;;     (map-set put-data token-id
        ;;         { 
        ;;             counterparty : tx-sender,
        ;;             btc-locked : SBTC_ROUND_LOT_FACTOR, ;; this is 3m sats sBTC
        ;;             strike-price: strike-price, ;; this is the only user variable, whether I can buy the 3m sats sBTC lot at 950 stx or 1000 stx or whatever stx amount?
        ;;             strike-height: strike-height ;; this is just block-height + u2100 (1 cycle)
        ;;         }
        ;;     )
        ;;     (set token-id (+ token-id u1))
        ;;     (set number-of-lots-to-lock (- number-of-lots-to-lock u1))
        ;; )

(define-public (exercise (wrapped-btc-contract <wrapped-btc-trait>) (token-id uint))
    (let 
        (
            (put-info (unwrap! (get-put-data token-id) ERR-TOKEN-ID-NOT-FOUND))
            (counterparty (get counterparty put-info))
            (btc-locked (get btc-locked put-info))
            (strike-height (get strike-height put-info))
            (strike-price (get strike-price put-info))
            (exercise-quantity-stx (* (/ btc-locked DISPLAY_FACTOR) strike-price)) ;; price = STX / BTC, so this gives me some STX
            (owner tx-sender) ;; the owner exercises the option, and the counterparty complies
        )
        ;; (asserts! (is-eq (contract-of wrapped-btc-contract) SBTC-PRINCIPAL) ERR-INVALID-PRINCIPAL);; only the contract owner can call this function, well the NFT owner should be able to do so?
        (asserts! (is-eq (unwrap! (nft-get-owner? sbtc-covered-put token-id) ERR-TOKEN-ID-NOT-FOUND) tx-sender) ERR-NOT-TOKEN-OWNER) ;; only the owner of the put can exercise it
        (asserts! (>= strike-height block-height) ERR-TOKEN-EXPIRED) ;; the put expires and can be exercised only before the strike date
        (asserts! (>= (unwrap-panic (contract-call? wrapped-btc-contract get-balance tx-sender)) exercise-quantity-stx) ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE)
        
        ;; owner gets sBTC, counterparty gets STX
        (try! (contract-call? wrapped-btc-contract transfer btc-locked counterparty tx-sender none))
        (try! (as-contract (stx-transfer? exercise-quantity-stx tx-sender counterparty)))
        ;; burn the put
        (try! (nft-burn? sbtc-covered-put token-id tx-sender))
        (ok (map-delete put-data token-id))
    )
)
;; Self note: need to think if this trait doesn't mess with this contract?

;; read only functions
;;
(define-read-only (get-last-token-id)
    (ok (var-get last-put-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok none) ;; (some https://stx.is/sbtc-pdf)
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? sbtc-covered-put token-id))
)

(define-read-only (get-put-data (token-id uint))
    (map-get? put-data token-id)
)

;; #[allow(unchecked_data)]
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER) ;; only the owner can transfer the token
        (nft-transfer? sbtc-covered-put token-id sender recipient)
    )
)

;; private functions
;;

