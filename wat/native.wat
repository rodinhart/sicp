(module
  (type $fntype (func (param i32) (param i32) (result i32)))

  (memory (import "js" "mem") 0)

  (table 2 anyfunc)

  (func $alloc (export "alloc") (param $c i32) (result i32)
    (local $t i32)
    i32.const 0
    i32.const 0
    i32.load
    local.tee $t
    local.get $c
    i32.add
    i32.store
    local.get $t
  )

  (func $alloc-int (param $n i32) (result i32)
    (local $r i32)

    i32.const 8
    call $alloc
    local.tee $r
    i32.const 1 ;; INT
    i32.store
    local.get $r
    local.get $n
    i32.store offset=4
    local.get $r
  )

  (func $alloc-fn (param $i i32) (result i32)
    (local $p i32)

    i32.const 8
    call $alloc
    local.tee $p
    i32.const 4 ;; FUNCTION
    i32.store
    local.get $p
    local.get $i
    i32.store offset=4
    local.get $p
  )

  (func $alloc-vector (param $n i32) (result i32)
    (local $p i32)

    i32.const 8
    local.get $n
    i32.const 4
    i32.mul
    i32.add
    call $alloc
    local.tee $p
    i32.const 5 ;; VECTOR
    i32.store
    local.get $p
    local.get $n
    i32.store offset=4
    local.get $p
  )

  (func $prn-int (param $buf i32) (param $n i32) (result i32)
    (local $t i32)

    local.get $n ;; $t = n / 10
    i32.const 10
    i32.div_s
    local.tee $t

    if (result i32) ;; $t != 0
      local.get $buf
      local.get $t
      call $prn-int
      local.tee $t
      local.get $buf
      i32.add
      local.set $buf
      local.get $t
    else
      i32.const 0
    end

    local.get $buf
    local.get $n
    i32.const 10
    i32.rem_s
    i32.const 48
    i32.add
    i32.store

    i32.const 1
    i32.add
  )

  (func $prn-fn (param $buf i32) (param $i i32) (result i32)
    local.get $buf
    local.get $buf
    i32.const 102
    i32.store8
    i32.const 110
    i32.store8 offset=1
    
    local.get $buf
    i32.const 2
    i32.add
    local.get $i
    call $prn-int

    i32.const 2
    i32.add
  )

  (func $prn-string (param $buf i32) (param $s i32) (result i32)
    (local $src i32)
    (local $i i32)

    local.get $s
    i32.const 4
    i32.add
    local.set $src

    local.get $s
    i32.load
    local.tee $i
    loop $loop
      local.get $i
      i32.const 1
      i32.sub
      local.tee $i
      
      local.get $buf
      local.get $src
      i32.load8_u
      i32.store8

      local.get $src
      i32.const 1
      i32.add
      local.set $src

      local.get $buf
      i32.const 1
      i32.add
      local.set $buf

      i32.const 0
      i32.ge_s
      br_if $loop
    end
  )

  (func $prn (param $buf i32) (param $x i32) (result i32)
    (local $t i32)

    local.get $x
    i32.load
    local.tee $t
    i32.const 1
    i32.eq
    if (result i32)
      local.get $buf
      local.get $x
      i32.load offset=4
      call $prn-int
    else
      local.get $t
      i32.const 2
      i32.eq
      if (result i32)
        local.get $buf
        local.get $x
        i32.const 4
        i32.add
        call $prn-string
      else
        local.get $t
        i32.const 4
        i32.eq
        if (result i32)
          local.get $buf
          local.get $x
          i32.load offset=4
          call $prn-fn
        else
          i32.const 0
        end
      end
    end
  )

${compiled[1]}

  (func $main (export "main") (param $buf i32) (result i32)
    (local $env i32)
    (local $t i32)

    i32.const 1024
    call $alloc
    local.set $env

    local.get $buf

${compiled[0]}
  )
)
