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

;; 1.9
; (+ 4 5)
; (inc (+ 3 5))
; (inc (inc (+ 2 5)))
; (inc (inc (inc (+ 1 5))))
; (inc (inc (inc (inc (+ 0 5)))))

; (+ 4 5)
; (+ 3 6)
; (+ 2 7)
; (+ 1 8)
; (+ 0 9)

;; 1.10
1024
65536
65536
(define (f n) (* 2 n))
(define (g n) (if (= n 0) 0 (pow 2 n)))
?

;; 1.11
(define (f n)
  (if (< n 3)
    n
    (+ (f (- n 1)) (* 2 (f (- n 2))) (* 3 (f (- n 3))))))

(define (f2 n)
  (define (iter a b c count)
    (if (= count 0) a (iter b c (+ c (* 2 b) (* 3 a)) (- count 1))))
  (iter 0 1 2 n))

;; 1.12
(define (pascal row col) (cond
  ((= col 0) 1)
  ((= col row) 1)
  (else (+ (pascal (- row 1) (- col 1)) (pascal (- row 1) col)))))

;; 1.13
?

;; 1.14
?

;; 1.15
;a  12.15 4.5 1.5 0.5 0.167   5 times
;b  space=th(a)  time=th(a)

;; 1.16
(define (fast-expt b n)
  (cond ((= n 0) 1)
  ((even? n) (square (fast-expt b (/ n 2))))
  (else (* b (fast-expt b (- n 1))))))

(define (expt b n)
  (define (iter b n a) (cond
  ((= n 0) a)
  ((even? n) (iter (square b) (/ n 2) a))
  (else (iter b (- n 1) (* b a))) ))
  (iter b n 1))

;; 1.17
(define (double n) (+ n n))
(define (halve n) (/ n 2))

(define (** a b) (cond
  ((= b 0) 0)
  ((even? b) (** (double a) (halve b)))
  (else (+ a (** a (- b 1)))) ))

;; 1.18
(define (** a b)
  (define (iter a b r) (cond
    ((= b 0) r)
    ((even? b) (iter (double a) (halve b) r))
    (else (iter a (- b 1) (+ a r)))))
  (iter a b 0))

;; 1.19
; a <- bq + aq + ap
; b <- bp + aq

; a <- (bp + aq)q + (bq + aq + ap)q + (bq + aq + ap)p
; b <- (bp + aq)p + (bq + aq + ap)q

; a <- bpq + aqq + bqq + aqq + apq + bpq + apq + app
; b <- bpp + aqp + bqq + aqq + apq

; a <- (b + a)(2pq + qq) + a(pp + qq)
; b <- b(pp + qq) + a(2pq + qq) 

; p' = pp + qq
; q' = 2pq + qq

(define (fib n)
  (fib-iter 1 0 0 1 n))
(define (fib-iter a b p q count)
  (log count)
  (cond ((= count 0) b)
    ((even? count) (fib-iter a b (+ (* p p) (* q q)) (+ (* 2 p q) (* q q)) (/ count 2)))
    (else (fib-iter (+ (* b q) (* a q) (* a p)) (+ (* b p) (* a q)) p q (- count 1)))))

;; 1.20
; (gcd 206 40)
; (gcd 40 (remainder 206 40))
; (gcd 6 (remainder 40 6))     2x
; (gcd 4 (remainder 6 4))      2x
; (gcd 2 (remainder 4 2))      2x
; 2                            1x = 7 total

; (gcd 206 40)
; (gcd 40 6)                   1x
; (gcd 6 4)                    1x
; (gcd 4 2)                    1x
; (gcd 2 0)                    1x
; 2                               = 4 total

;; 1.21
; 199
; 1999
; 7

;; 1.22
(define (smallest_divisor n) (find_divisor n 2))

(define (find_divisor n test_divisor)
  (cond ((> (square test_divisor) n) n)
        ((divides? test_divisor n) test_divisor)
        (else (find_divisor n (+ test_divisor 1)))))

(define (divides? a b) (= (remainder b a) 0))

(define (prime? n)
  (= n (smallest_divisor n)))

(define (timed_prime_test n)
  (start_prime_test n (runtime)))

(define (start_prime_test n start_time)
  (if (prime? n)
    (report_prime n (- (runtime) start_time)) #f))

(define (report_prime n elapsed_time)
  (newline)
  (display n)
  (display elapsed_time)
  #t)

(define (search_for_primes a n)
  (if (> n 0)
    (if (timed_prime_test a) (search_for_primes (+ a 2) (- n 1)) (search_for_primes (+ a 2) n))
    nil))

;; 1.23
;; 1.24

;; 1.25
; the number get too big, very quickly: i.e. testing 561 requires 300**561

;; 1.26
; the sub expression (expmod base ...) is evaluated twice

;; 1.27  ;561 1105 1729 2465
(define (expmod base exp m) (cond
  ((= exp 0) 1)
  ((even? exp) (remainder (square (expmod base (/ exp 2) m)) m))
  (else (remainder (* base (expmod base (- exp 1) m)) m))))

(define (carmichael? n)
  (define (iter n a) (cond
    ((not (< a n)) #t)
    ((not (= (expmod a n n) a)) #f)
    (else (iter n (+ a 1)))))
    
  (iter n 1))

;; 1.28

;; 1.29
(define (sum term a next b) (if (> a b)
  0
  (+ (term a) (sum term (next a) next b))))

(define (integral f a b dx)
  (define (add-dx x)
    (+ x dx))
  (* (sum f (+ a (/ dx 2.0)) add-dx b) dx))

(define (cube x) (* x x x))

(define (simpson f a b n)
  (define h (/ (- b a) n))
  (* h (/ (sum (lambda (k) (* (if (= k 0) 1 (if (even? k) 2 4)) (cube (+ a (* k h))))) 0 inc n) 3)))

; doesn't seem that much more accurate, just overestimates

;; 1.30
(define (sum term a next b)
  (define (iter a result)
    (if (> a b)
      result
      (iter (next a) (+ result (term a)))))
  (iter a 0))

;; 1.31
(define (product term a next b) (if (> a b)
  1
  (* (term a) (product term (next a) next b))))

(define (factorial n) (product identity 1 inc n))

(define (pi n) (* 4 (product
  (lambda (k) (if (even? k)
    (/ k (inc k))
    (/ (inc k) k))) 2 inc n)))

(define (product term a next b)
  (define (iter a result)
    (if (> a b)
      result
      (iter (next a) (* result (term a)))))
  (iter a 1))

;; 1.32
(define (accumulate combiner null-value term a next b)
  (if (> a b)
    null-value
    (combiner (term a) (accumulate combiner null-value term (next a) next b))))

(define (product term a next b) (accumulate * 1 term a next b))

(define (accumulate combiner null-value term a next b)
  (define (iter a result)
    (if (> a b)
      result
      (iter (next a) (combiner (term a) result))))
  (iter a null-value))

;; 1.33

