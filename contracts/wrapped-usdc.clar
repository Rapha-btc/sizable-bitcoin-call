(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; wrapped-usdc
;; <add a description here>

;; constants
;;
(define-constant contract-owner tx-sender)
(define-constant ERR-OWNER-ONLY (err u100))
(define-constant ERR-NOT-TOKEN-OWNER (err u101))
(define-fungible-token wrapped-usdc)

;; public functions
;;

;; #[allow(unchecked_data)]
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
        (try! (ft-transfer? wrapped-usdc amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "Wrapped USDC")
)

(define-read-only (get-symbol)
    (ok "WUSDC")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance wrapped-usdc who))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply wrapped-usdc))
)

(define-read-only (get-token-uri)
    (ok none)
)

;; #[allow(unchecked_data)]
(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
        (ft-mint? wrapped-usdc amount recipient)
    )
)