- optimize pure functions with local vars
- syntax for vector
- gc

```txt
Type
  type: i32 (SYMBOL=0, INT=1, REAL=2, STRING=3, FUNCTION=4, VECTOR=5)

Symbol
  SYMBOL
  index: i32

Int
  INT
  value: i32

Real
  REAL
  value: f64

String
  STRING
  len: i32
  value: len bytes

Function
  FUNCTION
  index: i32
  env: i32

Vector
  VECTOR
  len: i32
  items: len i32 bytes

Memory map:
  free
  end?
```
