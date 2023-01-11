// import WabtModule from "./libwabt.js"

const read = (s) => {
  const _ = (xs) => {
    const x = xs.shift()
    if (x === "(") {
      const r = []
      while (xs.length && xs[0] !== ")") {
        r.push(_(xs))
      }

      if (xs.shift() !== ")") {
        throw new Error("Missing )")
      }

      return r
    }

    return String(Number(x)) === x ? Number(x) : x
  }

  return _(
    s
      .replace(/([\(\)])/g, " $1 ")
      .trim()
      .split(/\s+/)
  )
}

const symbols = {}
const compile = (exp) => {
  if (typeof exp === "number") {
    return `
    i32.const ${exp}
    call $alloc-int
    `
  }

  if (typeof exp === "string") {
    return `
    local.get $env
    i32.load offset=${symbols[exp]}
    `
  }

  if (Array.isArray(exp)) {
    const [op, ...args] = exp

    if (op === "def") {
      const [name, val] = args
      symbols[name] = Object.keys(symbols).length
      return `
    local.get $env
    ${compile(val)}
    i32.store offset=${symbols[name]}
    i32.const ${symbols[name]}
    call $alloc-int
      `
    }

    if (op === "+" && args.length === 2) {
      return `
    ${compile(args[0])}
    i32.load offset=4
    ${compile(args[1])}
    i32.load offset=4
    i32.add
    call $alloc-int
      `
    }
  }

  throw new Error(`Cannot compile ${exp}`)
}

const tap = (x) => console.log(x) || x
const module = WabtModule().parseWat(
  "test.wat",
  `

(module
  (memory (import "js" "mem") 0)

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
    i32.const 1
    i32.store
    local.get $r
    local.get $n
    i32.store offset=4
    local.get $r
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
        i32.const 0
      end
    end
  )

  (func $main (export "main") (param $buf i32) (result i32)
    (local $env i32)

    i32.const 1024
    call $alloc
    local.set $env

    local.get $buf

    ${read(`(

    (def x 10)

    (+ x x)
    
    )`)
      .map((exp) => compile(exp))
      .join("\ndrop\n")}

    call $prn
  )
)

  `
)

// console.log(module.toText({}))

// module.resolveNames()
const Flags = {
  exceptions: false,
  mutable_globals: true,
  sat_float_to_int: false,
  sign_extension: false,
  simd: false,
  threads: false,
  multi_value: false,
  tail_call: false,
}
// module.validate(Flags)
const binaryOutput = module.toBinary(
  {} /*{ log: true, write_debug_names: true }*/
)

const wasm = new WebAssembly.Module(binaryOutput.buffer)
const mem = new WebAssembly.Memory({
  initial: 2,
  maximum: 10,
})
const wasmInstance = new WebAssembly.Instance(wasm, { js: { mem } })
const { main } = wasmInstance.exports

const memory = new Uint32Array(mem.buffer, 0, 4)
memory[0] = 4

const len = main(100)
console.log(new TextDecoder().decode(new Uint8Array(mem.buffer, 100, len)))

/**
 * 42
 * i32.const 42
 *
 * Type
 *   type: i32 (SYMBOL, INT, REAL, STRING, FUNCTION)
 *
 * Symbol
 *   SYMBOL
 *   index: i32
 *
 * Int
 *   INT
 *   value: i32
 *
 * Real
 *   REAL
 *   value: f64
 *
 * String
 *   STRING
 *   len: i32
 *   value: len bytes
 *
 * Function
 *   FUNCTION
 *   index: i32
 *
 * Memory map:
 *   free
 *   end?
 *
 */
