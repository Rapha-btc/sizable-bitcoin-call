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
(define-constant ERR-TOO-MANY-CALLS-2 (err u2008)) 
(define-constant ERR-NO-EXERCISER-CALLS (err u2009))

(define-constant ERR-TOKEN-ID-NOT-FOUND (err u1007)) ;; clarity wants the same type in all path which is something I am trying to get familiar with
(define-constant ERR-INVALID-PRINCIPAL (err u1008))
(define-constant ERR-TOKEN-EXPIRED (err u1009))
(define-constant ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE (err u1010)) 
(define-constant ERR-UNABLE-TO-MINT (err u1011))
(define-constant ERR-NOT-EXPIRED (err u1012))
(define-constant ERR-CLAIMABLE-ONLY-BY-COUNTERPARTY (err u1013))
(define-constant ERR-IN-RECLAIM-CAPITAL (err u1014))
(define-constant ERR-NFT-OWNER (err u1015))
(define-constant ERR-NO-CONTRACT (err u1016))

;; (define-constant SBTC_DISPLAY_FACTOR u300000)
(define-constant SBTC_ROUND_LOT_FACTOR u3000000)
(define-constant DISPLAY_FACTOR u100000000) ;; 100m sats = 1 btc
(define-constant call-LENGTH u2100) ;; 2100 blocks in the future

(define-constant SBTC-PRINCIPAL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc) ;; ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM is the 1rst address in the simulated environment
(define-constant YIN-YANG 'SP000000000000000000002Q6VF78)

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

;; data vars
;;
(define-data-var last-call-id uint u0)
(define-data-var next-call-id uint u0)
(define-data-var helper-uint uint u0) ;; number of calls
(define-data-var strike-helper uint u0) ;; number of calls

(define-data-var user-calls (list 100 (response uint uint)) (list )) ;; initialized at an empty list // this is counterparty-calls who originates a call
(define-data-var helper-list (list 100 (response uint uint)) (list ))
(define-data-var helper-btc-contract principal SBTC-PRINCIPAL) ;; this is the principal of the contract that holds the underlying asset

;; maybe they should be able to buy a whole bunch at once?

;; a sizeable-bitcoin call is represented by an NFT token id bitcoin-call and data stored in call-data map
(define-non-fungible-token bitcoin-call uint) ;; a 'call' is simply an NFT that represents the right to buy 3m sats at a strike date in 2100 blocks for a strike price of 1000 stx
;; data maps
;;
(define-map call-data uint { 
        counterparty: principal,
        btc-locked: uint, ;; this is always 3m sats sBTC
        strike-price: uint, ;; 1000 stx? 950 stx? protect me against a drop below 950 stx per 3m sats sBTC
        strike-height: uint,
        was-transferred-once: bool ;; this is to keep track of whether we have the token-id in a buyer-call list or not?
    }
)
;; define a map called exos where the key is a principal and the value is a list of uints of maximum lenght 100
(define-map exerciser-calls principal {exos: (list 100 uint)}) ;; a list of calls owned by a user who is not a counterparty of these token-ids
;; a list of calls owned by a user who is not a counterparty of these token-ids

;;public and private functions
;;

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
            (var-set user-calls (filter is-null (map helper-quite-a-few indices))) ;; this spits out a list of call options token ids and updates the next-call-id
            (var-set user-calls (unwrap! (as-max-len? (concat (var-get user-calls) (filter is-null (map helper-quite-a-few indices))) u100) ERR-TOO-MANY-CALLS))
        )
        
        ;; here we can fold on the user-calls and try before it to exit control flow if there is an error
        ;; (asserts! boolean-expr (err thrown)) 
        (unwrap! (fold check-minting-err (var-get user-calls) (ok u0)) (err "unable-to-mint"));; ERR-UNABLE-TO-MINT)

        (var-set last-call-id (var-get next-call-id)) ;; this allows me to keep track of the last call id 

        (ok (var-get user-calls))
    )
)

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
        ;; if asserts returns an error it exits the control flow

        ;; (unwrap-panic (contract-call? wrapped-btc-contract get-balance tx-sender))

        ;; owner gets sBTC, counterparty gets STX => hence it's a call option
        (try! (as-contract (contract-call? wrapped-btc-contract transfer btc-locked tx-sender owner none))) ;; the bitcoin-call contract has the sbtc balance and sends it to the owner
        (try! (stx-transfer? strike-price owner counterparty)) ;; the owner sends the STX to the counterparty
        ;; if try is an error or none it exits the control flow
        
        ;; burn the call
        (try! (nft-burn? bitcoin-call token-id tx-sender))
        (ok (map-delete call-data token-id)) ;; this cannot return false because call-info in let would have thrown an error and exit if call-data token-id doesn't exist
    )
)

(define-public (exercise-all-of-my-exerciser-calls (wrapped-btc-contract <wrapped-btc-trait>))
    (let 
        (
            (tx-exerciser-calls (unwrap! (map-get? exerciser-calls tx-sender) (err "err-no-exercisable-calls")))
            (exos (get exos tx-exerciser-calls))
            ;; (next-exos (list ))

            ;; maybe we need to filter out the calls that have expired here before folding them all?
            ;; the expired ones don't need to be in exerciser-calls for "exercisable calls"
            (mint-em-all (asserts! (fold check-exercise exos true) (err "err-exercising-all"))) ;; I don't know if this appropriate but it seems to work :P)
        )
        ;; (var-set helper-btc-contract wrapped-btc-contract) ;; it's already the good principal and throws an error here for the trait?!
        
        ;; (map-set exerciser-calls tx-sender {exos: next-exos})
        (map-delete exerciser-calls tx-sender)
        ;; (ok (var-get next-exos))
        ;; (ok mint-em-all)
        (ok tx-exerciser-calls)
    )
)
;; I don't know what unchecked data is, probably not tested - #[allow(unchecked_data)]
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    
        ;; let's fetch was-transfered-once from the call-data
        (let 
            (
                (recipient-calls (default-to {exos: (list )} (map-get? exerciser-calls recipient))) ;; i default to list u0...
                (recipient-exos (get exos recipient-calls))
                (next-recipient-exos (unwrap! (as-max-len? (append recipient-exos token-id) u100) ERR-TOO-MANY-CALLS-2))
                (sender-calls (default-to {exos: (list )} (map-get? exerciser-calls sender)))
                (sender-exos (get exos sender-calls))
                
                (call-info (unwrap! (map-get? call-data token-id) ERR-TOKEN-ID-NOT-FOUND))
                (originator (get counterparty call-info))
                (was-transferred (get was-transferred-once call-info))
            )
            
            (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER) ;; only the owner can transfer the token

            ;; if was-transfered-once is none, and if exerciser-recipient is none, 
            ;; then map-set exerciser-calls from recipient to a list with token-id 
            (if (not was-transferred) ;; no sender-calls so no need to filter it out with token-id
                (begin
                    (map-set call-data token-id (merge call-info {was-transferred-once: true})) 
                    ;; if recipient is not the originator
                    (if (not (is-eq recipient originator))
                    (map-set exerciser-calls recipient {exos: next-recipient-exos})
                    true
                    )
                )
                (begin
                    ;; if recipient is not the originator
                    (if (not (is-eq recipient originator))
                    (map-set exerciser-calls recipient {exos: next-recipient-exos})
                    true
                    )
                    ;; filter out sender-exos with token-id
                    (var-set helper-uint token-id)
                    (map-set exerciser-calls sender {exos: (filter is-not-token sender-exos)})
                )
            )
           (nft-transfer? bitcoin-call token-id sender recipient)  
            ;; (ok was-transferred)
        )
)

(define-private (is-not-token (item uint)) 
    (not (is-eq item (var-get helper-uint)))
)

;; private functions
;;
(define-private (check-minting-err (current (response uint uint)) (result (response uint uint)))
   (if (is-err result) result current)  
)
(define-private (check-exercise (current uint) (result bool ))
    (begin
    (if (> (get strike-height (default-to  { 
        counterparty: tx-sender,
        btc-locked: u1, 
        strike-price: u1,  
        strike-height: (+ block-height u1), ;; is superior to block-height
        was-transferred-once: true  
    };; I just want to default to something that is higher than block-height if map-get doesn't find anything
    (map-get? call-data current))) block-height) ;; if block-height is less than striek-height then exercise and spit true, else just spit true
    (if result 
    (let 
    ((result-mint-i (exercise SBTC-PRINCIPAL current))) ;; this never returns an error/none/or false because exercise exits control flow if there's an error
    ;; (var-get helper-btc-contract)
    (if (is-ok result-mint-i) true false) ;; hence this is always true? but if it returns false, there is no change to the logic and the exit is taken care inside the exercise function
    ;; thought of changing the functioning of this if false arrives at any point but seems unnecessary?
    ;; and then exit control flow in main function if false is the final result
    ;; (if (is-err result) result current)    
    )
    false)
    true) ;; do nothing if block-height is more than strike-height, and inside the "true" wrapped with a begin do we want to burn the NFT, probably not, we do that in the redeem function when the counterparty re-claims sBTC from contract
    )
)
;; idea: test whether result is false, and stop calling exercise if it is and return false forever in fold
;; else return true
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
                    was-transferred-once: false ;; verify if this doesn't cause any problems
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

(define-read-only (get-exerciser-calls (buyer-owner principal))
    (map-get? exerciser-calls buyer-owner)
)

;; Reclaiming capital from contract
(define-public (counterparty-reclaim (wrapped-btc-contract <wrapped-btc-trait>) (token-id uint))
    (let 
        (
            (call-info (unwrap! (get-call-data token-id) ERR-TOKEN-ID-NOT-FOUND))
            (counterparty (get counterparty call-info))
            (sbtc-quantity (get btc-locked call-info))
            (strike-height-token (get strike-height call-info))
            (token-owner (unwrap! (nft-get-owner? bitcoin-call token-id) ERR-NFT-OWNER))
            (t-sender tx-sender)
        )
        (asserts! (< strike-height-token block-height) ERR-NOT-EXPIRED)
        (asserts! (is-eq counterparty tx-sender) ERR-CLAIMABLE-ONLY-BY-COUNTERPARTY)
        ;; (unwrap! (contract-call? wrapped-btc-contract transfer sbtc-quantity (as-contract tx-sender) tx-sender none) ERR-IN-RECLAIM-CAPITAL) ;; reclaim sBTC capital from contract
        (try! (as-contract (contract-call? wrapped-btc-contract transfer sbtc-quantity tx-sender t-sender none)))
        (try! (nft-burn? bitcoin-call token-id token-owner))
        (ok (map-delete call-data token-id))
    )    
)

;; (define-data-var sBTC-contract-helper <wrapped-btc-trait> SBTC-PRINCIPAL)
;; error: trait references can not be stored
;; x 1 error detected
(define-data-var sBTC-contract-helper principal SBTC-PRINCIPAL)

(define-private (reclaim-yy (token-id uint) (result (response bool uint)))
    (let 
        (
            (call-info (unwrap! (get-call-data token-id) ERR-TOKEN-ID-NOT-FOUND))
            (counterparty (get counterparty call-info))
            (sbtc-quantity (get btc-locked call-info))
            (strike-height-token (get strike-height call-info))
            (token-owner (unwrap! (nft-get-owner? bitcoin-call token-id) ERR-NFT-OWNER))
            (the-sbtc (var-get sBTC-contract-helper))
        )
        (asserts! (< strike-height-token block-height) ERR-NOT-EXPIRED)
        (asserts! (is-eq counterparty tx-sender) ERR-CLAIMABLE-ONLY-BY-COUNTERPARTY)
        ;; (unwrap! (contract-call? the-sbtc transfer sbtc-quantity (as-contract tx-sender) tx-sender none) ERR-IN-RECLAIM-CAPITAL) ;; reclaim sBTC capital from contract
        ;; the line above won't work! because we can't store a trait reference in a data-var?
        (unwrap! (contract-call? SBTC-PRINCIPAL transfer sbtc-quantity (as-contract tx-sender) tx-sender none) ERR-IN-RECLAIM-CAPITAL) ;; reclaim sBTC capital from contract
        (try! (nft-burn? bitcoin-call token-id token-owner))
        (ok (map-delete call-data token-id))
    )    
)

(define-public (reclaiming)
    (let
    (
    (tx-sender-exos (default-to {exos: (list )} (map-get? exerciser-calls tx-sender)))
    (exo-list (get exos tx-sender-exos))
    )
    (fold reclaim-yy exo-list (ok true)) ;; for some reason I don't get my capital back and it spits out ok true!
    )
)


(define-public (reclaiming-yy-capital (wrapped-btc-contract <wrapped-btc-trait>) (list-tokens (list 100 uint)))
    (fold reclaim-yy list-tokens (ok true)) ;; if one of the reclaim-yy fails, it retro-actively undo all prior transactions
    ;; (begin 
    ;; (var-set sBTC-contract-helper wrapped-btc-contract) 
    ;; the line above won't work! because we can't store a trait reference in a data-var?
)

;; would be great to transfer a list of tokens at once
