(use-trait wrapped-usdc-trait .sip010-ft-trait.sip010-ft-trait) ;; why defining a trait here? so that any NFT can be passed as a parameter of exercise function? ask @Cargo
(impl-trait .sip009-nft-trait.sip009-nft-trait)

;; covered-call
;; This is a proof of concept contract to show how a covered call might be implemented such that the contract eliminates counterparty risk
;; For more information about what a covered call represents, please see the README.md 

;; We have put in place a number of restrictions on the covered call
;; * underlying currency can only be STX
;; * underlying quantity is multiples of 100 STX
;; * strike price currency is USDC
;; * strike date is represented as a block height
;; all of these constraints could be potentially relaxed in a more genereal implementation

;; Standard options typically have a fixed underlying quantity of 100 units and predefined strike price increments.  
;; While we have not imposed those restrictions that may make sense to add to improve call liquidity and fungibility.

;; There are 4 basic functions that this contract facilitates
;; Allow a principal to create a call - this is represented as minting an SIP-009 token and locking the underlying asset in the contract
;; As the call is represented as a SIP-009 token this provides:
;; * call creator to transfer the call 
;; * call creator to list call on SIP-009 marketplace
;; Allow the call owner to exercise the option - this will require that contract sends underlying asset to call owner and exercise USDC sent to call creator
;; Allow the call creator to reclaim underlying capital once strike date has elapsed and call owner did not elect to exercise 

;; Currently exercising / underlying reclamation is required to be done by the relevant principals.  This could potentially be improved with SIP-018 and the addition of a price oracle

;; Additonally, block height may be better expressed as a wall clock datetime.  If so an oracle would also be needed.

;; If the option expires in the money, there is no cash-settlement mechanism.  
;; The call owner would need to exercise the option and then sell the underlying asset on a market before the strike date.
;; SIP-018 could be used to facilitate a cash-settlement mechanism in the future. 

;; Note to self: designing an sBTC-covered put on the price of BTC would be a good next step.  
;; Counterparty creates a put on the price of STX/BTC by locking up in the contract the sBTC amount equivalent to 100 STX.
;; Countterparty receives a SIP-009 token representing the put.
;; Strike is 1000 blocks in the future.
;; Then we can offer Bitcoiners to farm stacking rewards while being hedged against a drop in the price of STX/BTC.

;; USDA is now a more viable option compared to wrapped USDC, which was initially used due to its wider availability. 
;; This is because the launch of a stable swap on ALEX has stabilized the peg of USDA, while using wrapped USDC could actually hinder our efforts to mitigate counterparty risk.

;; constants
;;
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-OWNER-ONLY (err u1000))
(define-constant ERR-NOT-TOKEN-OWNER (err u1001))
(define-constant ERR-INSUFFICIENT-UNDERLYING-BALANCE (err u1002))
(define-constant ERR-UNABLE-TO-LOCK-UNDERLYING-ASSET (err u1003))
(define-constant ERR-STRIKE-DATE-BLOCK-HEIGHT-IN-PAST (err u1004))
(define-constant ERR-STRIKE-PRICE-IS-ZERO (err u1005))
(define-constant ERR-TOKEN-EXPIRED (err u1006))
(define-constant ERR-TOKEN-ID-NOT-FOUND (err u1007))
(define-constant ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE (err u1008))
(define-constant ERR-UNABLE-TO-TRANSFER-CAPITAL-TO-EXERCISE (err u1009))
(define-constant ERR-INVALID-USDC-PRINCIPAL (err u1010))
(define-constant ERR-UNABLE-TO-TRANSFER-EXERCISING-ASSET (err u1011))
(define-constant ERR-UNABLE-TO-TRANSFER-UNDERLYING-ASSET (err u1012))
(define-constant ERR-UNABLE-TO-CLAIM-UNDERLYING-NOT-EXPIRED (err u1013))
(define-constant ERR-UNABLE-TO-CLAIM-UNDERLYING-NOT-COUNTERPARTY (err u1014))
(define-constant ERR-QUANTITY-NOT-ROUND-LOT (err u1015)) ;; ROUND-LOT means multiple of 100

;; NOTE: creating wrapped STX SIP-010 may be desirable to handle decimal scaling implicitly
(define-constant STX_DISPLAY_FACTOR u1000000)
(define-constant STX_ROUND_LOT_FACTOR u100000000)
(define-constant WRAPPED-USDC-PRINCIPAL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.wrapped-usdc)

;; data maps and vars
;;
(define-non-fungible-token stx-covered-call uint)
(define-data-var last-call-id uint u0)

(define-map call-id-to-call-data uint { 
        counterparty: principal,
        underlying-quantity: uint,
        strike-price-usdc: uint,
        strike-date-block-height: uint,
    }
)

;; private functions
;;

;; public functions
;;

(define-read-only (quantity-is-round-lot (quantity uint))
    (is-eq quantity (* (/ quantity STX_ROUND_LOT_FACTOR) STX_ROUND_LOT_FACTOR))
)

(define-read-only (underlying-is-claimable (call-id uint))
    (let 
        (
            (call-data (unwrap! (map-get? call-id-to-call-data call-id) false))
            (counterparty (get counterparty call-data))
            (strike-date-block-height (get strike-date-block-height call-data))
        )
        (and (> block-height strike-date-block-height) (is-eq counterparty tx-sender))
    )    
)

(define-read-only (get-last-token-id)
    (ok (var-get last-call-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok none)
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? stx-covered-call token-id))
)

(define-read-only (get-covered-call-data (token-id uint))
    (map-get? call-id-to-call-data token-id)
)

;; #[allow(unchecked_data)]
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
        (nft-transfer? stx-covered-call token-id sender recipient)
    )
)

(define-public (mint
   (underlying-quantity uint) 
   (strike-price-usdc uint) 
   (strike-date-block-height uint)) 
   (let
        (
            (token-id (+ (var-get last-call-id) u1))
        )
        (asserts! (>= (stx-get-balance tx-sender) underlying-quantity) ERR-INSUFFICIENT-UNDERLYING-BALANCE)
        (asserts! (>= strike-date-block-height block-height) ERR-STRIKE-DATE-BLOCK-HEIGHT-IN-PAST)
        (asserts! (> strike-price-usdc u0) ERR-STRIKE-PRICE-IS-ZERO)
        (asserts! (quantity-is-round-lot underlying-quantity) ERR-QUANTITY-NOT-ROUND-LOT)
        (try! (nft-mint? stx-covered-call token-id tx-sender))
        (map-set call-id-to-call-data token-id
            { 
                counterparty : tx-sender,
                underlying-quantity : underlying-quantity,
                strike-price-usdc: strike-price-usdc,
                strike-date-block-height: strike-date-block-height
            }
        )
        (var-set last-call-id token-id)
        (unwrap! (stx-transfer? underlying-quantity tx-sender (as-contract tx-sender)) ERR-UNABLE-TO-LOCK-UNDERLYING-ASSET)
        (ok token-id)
    )
)

(define-public (exercise (wrapped-usdc-contract <wrapped-usdc-trait>) (call-id uint))
    (let 
        (
            (covered-call-data (unwrap! (get-covered-call-data call-id) ERR-TOKEN-ID-NOT-FOUND))
            (counterparty (get counterparty covered-call-data))
            (underlying-quantity (get underlying-quantity covered-call-data))
            (strike-date-block-height (get strike-date-block-height covered-call-data))
            (strike-price-usdc (get strike-price-usdc covered-call-data))
            (exercise-quantity-usdc (* (/ underlying-quantity STX_DISPLAY_FACTOR) strike-price-usdc))
            (exercise-principal tx-sender)
        )
        (asserts! (is-eq (contract-of wrapped-usdc-contract) WRAPPED-USDC-PRINCIPAL) ERR-INVALID-USDC-PRINCIPAL)
        (asserts! (is-eq (unwrap! (nft-get-owner? stx-covered-call call-id) ERR-TOKEN-ID-NOT-FOUND) tx-sender) ERR-NOT-TOKEN-OWNER)
        (asserts! (>= strike-date-block-height block-height) ERR-TOKEN-EXPIRED)
        (asserts! (>= (unwrap-panic (contract-call? wrapped-usdc-contract get-balance tx-sender)) exercise-quantity-usdc) ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE)
        
        ;; transfer the needed capital to exercise from the tx-sender to the contract counterparty
        (try! (contract-call? wrapped-usdc-contract transfer exercise-quantity-usdc tx-sender counterparty none))
        
        ;; transfer the underlying asset to the exercising party, tx-sender
        (try! (as-contract (stx-transfer? underlying-quantity tx-sender exercise-principal)))
        (try! (nft-burn? stx-covered-call call-id tx-sender))
        (ok (map-delete call-id-to-call-data call-id))
    )
)

;; #[allow(unchecked_data)]
(define-private (counterparty-reclaim-underlying (call-id uint) (previous (response bool uint)))
    (let 
        (
            (covered-call-data (unwrap! (get-covered-call-data call-id) ERR-TOKEN-ID-NOT-FOUND))
            (counterparty (get counterparty covered-call-data))
            (underlying-quantity (get underlying-quantity covered-call-data))
            (strike-date-block-height (get strike-date-block-height covered-call-data))
        )
        (asserts! (< strike-date-block-height block-height) ERR-UNABLE-TO-CLAIM-UNDERLYING-NOT-EXPIRED)
        (asserts! (is-eq counterparty tx-sender) ERR-UNABLE-TO-CLAIM-UNDERLYING-NOT-COUNTERPARTY)
        (try! (as-contract (stx-transfer? underlying-quantity tx-sender counterparty)))
        (try! (nft-burn? stx-covered-call call-id (unwrap-panic (nft-get-owner? stx-covered-call call-id))))
        (ok (map-delete call-id-to-call-data call-id))
    )    
)

(define-public (counterparty-reclaim-underlying-many (call-ids (list 200 uint)))
   (fold counterparty-reclaim-underlying call-ids (ok true))
)