;; 1.1
10
12
8
3
6
a
b
19
#f
4
16
6
16

;; 1.2
(/ (+ 5 4 (- 2 (- 3 (+ 6 (/ 4 5))))) (* 3 (- 6 2) (- 2 7)))

;; 1.3
(define (f a b c) (if (> a b) (if (> b c) (sos a b) (sos a c)) (if (> a c) (sos b a) (sos b c))))

;; 1.4
; if b is positive, the result is a + b, if b is negative, the result is a - b
; hence it always adds the absolute value of b to a

;; 1.5
; applicative-order would first evaluate (p) before passing it to test, but
; (p) would create infinite loop, resulting in stack overflow
; normal order would just pass 0 and (p) to test, where the if would
; pass, and 0 returned. y would never need to be evaluated.

;; 1.6
; because of applicative-order the next guess is always calculated, hence infinite loop

;; 1.7
; if the input is smaller than our tolerance, the error will dominate the result
; (square (sqrt 0.0001)) ; 0.0010438
; the larger the number, the less decimals you have left.
; (square (sqrt 123456789123456)) ; stack overflow

;; 1.8
(define (sqrt-iter guess x) (if (good-enough? guess x) guess (sqrt-iter (improve guess x) x)))
(define (improve guess x) (/ (+ (/ x (* guess guess)) (* 2 guess)) 3))
(define (good-enough? guess x) (< (abs (- (* guess guess guess) x)) 0.001))

