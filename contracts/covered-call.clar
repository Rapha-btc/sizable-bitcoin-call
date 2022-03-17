(use-trait wrapped-usdc-trait .sip010-ft-trait.sip010-ft-trait)
(impl-trait .sip009-nft-trait.sip009-nft-trait)

;; covered-call
;; <add a description here>

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
(define-constant ERR-ALREADY-EXERCISED (err u1011))

(define-constant ERR-UNABLE-TO-TRANSFER-EXERCISING-ASSET (err u1012))
(define-constant ERR-UNABLE-TO-TRANSFER-UNDERLYING-ASSET (err u1013))

(define-constant WRAPPED-USDC-OWNER 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
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
(define-private (is-expired (token-id uint))
    (let 
        (
            (call-data (unwrap-panic (map-get? call-id-to-call-data token-id)))
        )
        (> block-height (get strike-date-block-height call-data))
    )    
)

(define-private (is-underlying-claimable (token-id uint))
    (let 
        (
            (call-data (unwrap-panic (map-get? call-id-to-call-data token-id)))
        )
        (> block-height (get strike-date-block-height call-data))
    )    
)

;; public functions
;;

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
;;      (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
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

(define-public (exercise 
    (wrapped-usdc-contract <wrapped-usdc-trait>)
    (covered-call-token-id uint)
    )
    (let 
        (
            (covered-call-data (unwrap-panic (get-covered-call-data covered-call-token-id)))
            (counterparty (get counterparty covered-call-data))
            (underlying-quantity (get underlying-quantity covered-call-data))
            (strike-date-block-height (get strike-date-block-height covered-call-data))
            (strike-price-usdc (get strike-price-usdc covered-call-data))
            (exercise-quantity-wrapped-usdc (* underlying-quantity strike-price-usdc))
            (exercise-principal tx-sender)
        )
        ;; TODO - is this check sufficient to ensure that we do not have an imposter coin?
        ;;(asserts! (is-eq (contract-of wrapped-usdc-contract) WRAPPED-USDC-OWNER) ERR-INVALID-USDC-PRINCIPAL)
        (asserts! (is-eq (unwrap! (nft-get-owner? stx-covered-call covered-call-token-id) ERR-TOKEN-ID-NOT-FOUND) tx-sender) ERR-NOT-TOKEN-OWNER)
        (asserts! (>= strike-date-block-height block-height) ERR-TOKEN-EXPIRED)
        (asserts! (>= (unwrap-panic (contract-call? wrapped-usdc-contract get-balance tx-sender)) exercise-quantity-wrapped-usdc) ERR-INSUFFICIENT-CAPITAL-TO-EXERCISE)
        
        ;; transfer the needed capital to exercise from the tx-sender to the contract counterparty
        (try! (contract-call? wrapped-usdc-contract transfer exercise-quantity-wrapped-usdc tx-sender counterparty none))
        
        ;; transfer the underlying asset to the exercising party, tx-sender
        ;; TODO should I be using (as-contract tx-sender) as the storage for all of the underlying assets?
        (try! (as-contract (stx-transfer? underlying-quantity tx-sender exercise-principal)))
        
        ;; mark the call as exercised
        (map-delete call-id-to-call-data covered-call-token-id)
        (ok true)
    )
)