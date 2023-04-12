(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; wrapped-usdc
;; We will use Wrapped sBTC as the currency in which strike price is denominated 
;; sBTC is not reliant on a fixed federation or other points of centralization. (https://www.stacks.co/learn/sbtc)

;; constants
;;
(define-constant contract-owner tx-sender)
(define-constant ERR-OWNER-ONLY (err u100))
(define-constant ERR-NOT-TOKEN-OWNER (err u101))
(define-fungible-token sbtc) ;; this is the sbtc simulated token

;; public functions
;;

;; #[allow(unchecked_data)]
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
        (try! (ft-transfer? sbtc amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "sBTC")
)

(define-read-only (get-symbol)
    (ok "sBTC")
)

(define-read-only (get-decimals)
    (ok u8)
)

(define-read-only (get-balance (user principal))
    (ok (ft-get-balance sbtc user))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply sbtc))
)

(define-read-only (get-token-uri)
    (ok none)
)

(define-read-only (get-contract-owner)
    (ok contract-owner)
)
;; #[allow(unchecked_data)]
(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY) ;; only the contract owner can mint
        (ft-mint? sbtc amount recipient)
    )
)