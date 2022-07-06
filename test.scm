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
