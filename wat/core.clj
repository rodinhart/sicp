(def x 100)

(def incby (fn [x] (fn [y] (+ x y))))

(def f (incby 3))

(f 10)

[1 [2 3] 4]
