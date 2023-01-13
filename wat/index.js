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
const compile = (exp, locals = new Set()) => {
  if (typeof exp === "number") {
    return [
      `
    i32.const ${exp}
    call $alloc-int
    `,
    ]
  }

  if (typeof exp === "string") {
    if (locals.has(exp)) {
      return [
        `
    local.get $${exp}
      `,
      ]
    }

    return [
      `
    local.get $env
    i32.load offset=${symbols[exp]}
    `,
    ]
  }

  if (Array.isArray(exp)) {
    const [op, ...args] = exp

    if (op === "def") {
      const [name, val] = args
      symbols[name] = Object.keys(symbols).length
      const [l, g] = compile(val, locals)

      return [
        `
    local.get $env
    ${l}
    i32.store offset=${symbols[name]}
    i32.const ${symbols[name]}
    call $alloc-int
      `,
        g ?? "",
      ]
    }

    if (op === "fn") {
      const [names, body] = args
      const [l, g] = compile(body, new Set([...locals, ...names]))

      return [
        `
    i32.const 0
    call $alloc-fn
        `,
        (g ?? "") +
          `
    (func $tmpfn ${names
      .map((name) => `(param $${name} i32)`)
      .join(" ")} (result i32)
      ${l}
    )
    (elem (i32.const 0) $tmpfn)
      `,
      ]
    }

    if (op === "+" && args.length === 2) {
      const [l1, g1] = compile(args[0], locals)
      const [l2, g2] = compile(args[1], locals)

      return [
        `
    ${l1}
    i32.load offset=4
    ${l2}
    i32.load offset=4
    i32.add
    call $alloc-int
      `,
        (g1 ?? "") + (g2 ?? ""),
      ]
    }

    {
      const apply = ["", "(type $fntype (func (param i32) (result i32)))"]
      for (const arg of args) {
        const [l, g] = compile(arg, locals)
        apply[0] += "\n" + l
        apply[1] += "\n" + (g ?? "")
      }

      const [l, g] = compile(op, locals)
      apply[0] += "\n" + l
      apply[1] += "\n" + (g ?? "")

      return [
        `
    ${apply[0]}
    i32.load offset=4
    call_indirect (type $fntype)
      `,
        apply[1],
      ]
    }
  }

  throw new Error(`Cannot compile ${exp}`)
}

const src = read(`(

((fn (x) (+ x x)) 4)
  
  )`)

const compiled = ["", ""]
for (let i = 0; i < src.length; i++) {
  const [l, g] = compile(src[i])
  compiled[0] += "\n" + l + (i + 1 < src.length ? "drop" : "call $prn")
  compiled[1] += "\n" + (g ?? "")
}

const wat = `
(module
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
    i32.const 1
    i32.store
    local.get $r
    local.get $n
    i32.store offset=4
    local.get $r
  )

  (func $alloc-fn (param $i i32) (result i32)
    (local $r i32)

    i32.const 8
    local.tee $r
    i32.const 4
    i32.store
    local.get $r
    local.get $i
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

    i32.const 1024
    call $alloc
    local.set $env

    local.get $buf

    ${compiled[0]}
  )
)

`
console.log(wat)

const module = WabtModule().parseWat("test.wat", wat)
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
 *   type: i32 (SYMBOL=0, INT=1, REAL=2, STRING=3, FUNCTION=4, VECTOR=5)
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
 * Vector
 *   VECTOR
 *   len: i32
 *   items: len i32 bytes
 *
 * Memory map:
 *   free
 *   end?
 *
 */
