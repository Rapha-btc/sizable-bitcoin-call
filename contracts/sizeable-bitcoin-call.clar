(use-trait wrapped-btc-trait .sip010-ft-trait.sip010-ft-trait) ;; any wrapped btc that is a sip-10 token can be collateralized, and we are testing it here with sbtc.clar but I should have called it not-not-btc.clar in reference to Doctor $uss cultural meme
(impl-trait .sip009-nft-trait.sip009-nft-trait) ;; covered-calls are nfts + a map
;; title: sizeable-bitcoin-call.clar
;; version 1
;; let's take the code from bitcoin-call, and now add the possibility for a user to 
;; print 100 call options of 3m sats each, at a strike price measure and exercised in STX
;; MEV concerns for this project - fingers crossed blockchain engineers at work on Stakcs!
;; so the user has 3 bitcoin in the form of a wraped-btc-trait, and decides to lock them in this contract to receive 100 bitfcoin calls
;; in the form of an "bitcoin-call" NFT from this contract

;; Idea from Rafa at the airport while waiting a flight:
;; A private function called helper-quite-a-few that takes a number N between 1 and 100 
;; and spits out 0 if item is above number N, and last-token-Id + item otherwise. 
;; Map quite-a-few u1, u2, u100
;; Spits out last token id + 1, last token id + 2, last token id + N, u0 ... u0
;; and perform the set mapping / deleting + token burning

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
(define-constant ERR-TOO-MANY-CALLS (err "err-too-many-calls")) 

(define-constant ERR-TOKEN-ID-NOT-FOUND (err u1007)) ;; clarity wants the same type in all path which is something I am trying to get familiar with
(define-constant ERR-INVALID-PRINCIPAL (err u1008))
(define-constant ERR-TOKEN-EXPIRED (err u1009))
(define-constant ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE (err u1010)) 
(define-constant ERR-UNABLE-TO-MINT (err u1011))

;; (define-constant SBTC_DISPLAY_FACTOR u300000)
(define-constant SBTC_ROUND_LOT_FACTOR u3000000)
(define-constant DISPLAY_FACTOR u100000000) ;; 100m sats = 1 btc
(define-constant call-LENGTH u2100) ;; 2100 blocks in the future

(define-constant SBTC-PRINCIPAL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc) ;; ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM is the 1rst address in the simulated environment

;; data vars
;;
(define-non-fungible-token bitcoin-call uint) ;; a 'call' is simply an NFT that represents the right to buy 3m sats at a strike date in 2100 blocks for a strike price of 1000 stx
(define-data-var last-call-id uint u0)
(define-data-var next-call-id uint u0)
(define-data-var helper-uint uint u0) ;; number of calls
(define-data-var strike-helper uint u0) ;; number of calls

;; data maps
;;
(define-map call-data uint { 
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

(define-public (mint (wrapped-btc-contract <wrapped-btc-trait>) (btc-locked uint) (strike-price uint)) 
   (let
        (
            (token-id (+ (var-get last-call-id) u1)) ;; increment the last call id before creating it
            (sbtc-get-balance (unwrap! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc get-balance tx-sender) ERROR-GETTING-BALANCE));; get the balance of the sender in the sbtc contract
            (strike-height (+ block-height call-LENGTH)) ;; the strike date is 2100 blocks in the future
            (number-of-calls (/ btc-locked SBTC_ROUND_LOT_FACTOR))
            ;; (list-user-output (map helper-quite-a-few indices))
        )
        (asserts! (>= btc-locked SBTC_ROUND_LOT_FACTOR) ERR-MIN-QUANTITY-NOT-MET) ;; modulo will return the tested number if it is lesser than the divider, hence exit in that case
        (asserts! (is-eq (mod btc-locked SBTC_ROUND_LOT_FACTOR) u0) ERR-QUANTITY-NOT-ROUND-LOT) ;; let's print call options representing 3m sats per call, user needs to give a factor of 3m sats sBTC
        (asserts! (>= sbtc-get-balance btc-locked) ERR-INSUFFICIENT-UNDERLYING-BALANCE)
        (asserts! (> strike-price u0) ERR-STRIKE-PRICE-IS-ZERO)
        
        ;; now we need to mint as many NFTs as there are lots to lock
        ;; clarity doesn't support recursion, 
        ;; so we need to use a helper function / fold / map / can someone suggest something?
        (var-set helper-uint number-of-calls)
        (var-set strike-helper strike-price)

        ;; (map helper-quite-a-few user-options) ;; where user-options is a list of call options tokens
        ;; and in the helper-quite-a-few is set the options data map

        ;; (var-set last-call-id token-id );; outside of the while loop, increment as many times as there are lots to lock
        (unwrap! (contract-call? wrapped-btc-contract transfer btc-locked tx-sender (as-contract tx-sender) none) ERR-UNABLE-TO-LOCK-UNDERLYING-ASSET) ;; outside of the loop, lock all the lots at once
        ;; (ok (var-get last-call-id))

        (if (is-eq (var-get user-calls) (list ))
            (begin
            ;; (var-set helper-list (map helper-quite-a-few indices)) ;; this has the ok u1, ok u2, ok u3, ok u4, ok u5, err u1101) and we want to map this to get u1, ... u5 and assert out if there is an error
            (var-set user-calls (filter is-null (map helper-quite-a-few indices))) ;; this spits out a list of call options token ids and updates the next-call-id
            )
            (var-set user-calls (unwrap! (as-max-len? (concat (var-get user-calls) (filter is-null (map helper-quite-a-few indices))) u100) ERR-TOO-MANY-CALLS))
        )
        
        ;; here we can fold on the user-calls and try before it to exit control flow if there is an error
        ;; (asserts! boolean-expr (err thrown)) 
        (unwrap! (fold check-minting-err (var-get user-calls) (ok u0)) (err "unable-to-mint"));; ERR-UNABLE-TO-MINT)

        (var-set last-call-id (var-get next-call-id)) ;; this allows me to keep track of the last call id 

        (ok (var-get user-calls))
    )
)

(define-private (check-minting-err (current (response uint uint)) (result (response uint uint)))
   (if (is-err result) result current)  
)


;; now I don't want to override in user-calls when item is >u0

;; private functions
;;
;; A private function called helper-quite-a-few that takes a number N between 1 and 100 
;; and spits out 0 if item is above number N, and last-token-Id + item otherwise. 

(define-private (helper-quite-a-few (item uint))
        (if (<= item (var-get helper-uint))
            (begin
            (var-set next-call-id (+ (var-get next-call-id) u1)) ;; for some reason the last lines of the branches of if must match in type! 
            (map-set call-data (+ (var-get last-call-id) item)
                { 
                    counterparty : tx-sender,
                    btc-locked : SBTC_ROUND_LOT_FACTOR, ;; this is 3m sats sBTC
                    strike-price: (var-get strike-helper),
                    strike-height: (+ block-height call-LENGTH),
                }
            )
            ;; Mint the bitcoin-call NFT with the token-id last-call-id + item
            (unwrap! (nft-mint? bitcoin-call (+ (var-get last-call-id) item) tx-sender) ERR-UNABLE-TO-MINT) ;; I wasn't able to unrwap this, so I improvised with this unwrap-panic and I get no error message!
            (ok (+ (var-get last-call-id) item)) ;; spit this out in the list (f(item1), ...f(item100))
            )
            (ok u0)) ;; spits out u0 if item is above
)

(define-private (is-null (item (response uint uint))) ;; it's (ok u1),(ok u2) ... (err u1011) (ok u0)
    (not (is-eq item (ok u0)))
)



(define-constant indices
  (list
    u1 u2 u3 u4 u5 u6 u7 u8 u9 u10
    u11 u12 u13 u14 u15 u16 u17 u18 u19 u20
    u21 u22 u23 u24 u25 u26 u27 u28 u29 u30
    u31 u32 u33 u34 u35 u36 u37 u38 u39 u40
    u41 u42 u43 u44 u45 u46 u47 u48 u49 u50
    u51 u52 u53 u54 u55 u56 u57 u58 u59 u60
    u61 u62 u63 u64 u65 u66 u67 u68 u69 u70
    u71 u72 u73 u74 u75 u76 u77 u78 u79 u80
    u81 u82 u83 u84 u85 u86 u87 u88 u89 u90
    u91 u92 u93 u94 u95 u96 u97 u98 u99 u100))


(define-data-var user-calls (list 100 (response uint uint)) (list )) ;; initialized at an empty list
(define-data-var helper-list (list 100 (response uint uint)) (list ))
;; ///////////////////////////////////////////////////////////////////////////////////////

(define-public (exercise (wrapped-btc-contract <wrapped-btc-trait>) (token-id uint))
    (let 
        (
            (call-info (unwrap! (get-call-data token-id) ERR-TOKEN-ID-NOT-FOUND))
            (counterparty (get counterparty call-info))
            (btc-locked (get btc-locked call-info))
            (strike-height (get strike-height call-info))
            (strike-price (get strike-price call-info))
            ;; (exercise-quantity-stx (* (/ btc-locked DISPLAY_FACTOR) strike-price)) ;; price = STX / BTC, so this gives me some STX
            (owner tx-sender) ;; the owner exercises the option, and the counterparty complies
            (stx-balance (stx-get-balance tx-sender))
        )
        
        ;; (asserts! (is-eq (contract-of wrapped-btc-contract) SBTC-PRINCIPAL) ERR-INVALID-PRINCIPAL);; only the contract owner can call this function, well the NFT owner should be able to do so?
        (asserts! (is-eq (unwrap! (nft-get-owner? bitcoin-call token-id) ERR-TOKEN-ID-NOT-FOUND) tx-sender) ERR-NOT-TOKEN-OWNER) ;; only the owner of the call can exercise it
        (asserts! (>= strike-height block-height) ERR-TOKEN-EXPIRED) ;; the call expires and can be exercised only before the strike date
        (asserts! (>=  stx-balance strike-price) ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE)
        
        ;; (unwrap-panic (contract-call? wrapped-btc-contract get-balance tx-sender))

        ;; owner gets sBTC, counterparty gets STX => hence it's a call option
        (try! (as-contract (contract-call? wrapped-btc-contract transfer btc-locked tx-sender owner none))) ;; the bitcoin-call contract has the sbtc balance and sends it to the owner
        (try! (stx-transfer? strike-price owner counterparty)) ;; the owner sends the STX to the counterparty
        ;; burn the call
        (try! (nft-burn? bitcoin-call token-id tx-sender))
        (ok (map-delete call-data token-id))
    )
)


;; read only functions
;;
(define-read-only (get-last-token-id)
    (ok (var-get last-call-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok none) ;; (some https://stx.is/sbtc-pdf)
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? bitcoin-call token-id))
)

(define-read-only (get-call-data (token-id uint))
    (map-get? call-data token-id)
)

;; #[allow(unchecked_data)]
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER) ;; only the owner can transfer the token
        (nft-transfer? bitcoin-call token-id sender recipient)
    )
)



