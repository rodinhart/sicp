// import WabtModule from "./libwabt.js"

const NIL = {
  // map: (_) => [],
}
const cons = (car, cdr) => ({
  car,
  cdr,
  [Symbol.iterator]: function* () {
    for (let c = cons(car, cdr); c !== NIL; c = c.cdr) {
      yield c.car
    }
  },
  // map: (f) => {
  //   const r = []
  //   for (let c = cons(car, cdr); c !== NIL; c = c.cdr) {
  //     r.push(f(c.car, r.length))
  //   }

  //   return r
  // },
})
const isList = (x) => x === NIL || x.cdr

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

      let c = NIL
      for (let i = r.length - 1; i >= 0; i--) {
        c = cons(r[i], c)
      }

      return c
    } else if (x === "[") {
      const vector = []
      while (xs.length && xs[0] !== "]") {
        vector.push(_(xs))
      }

      if (xs.shift() !== "]") {
        throw new Error("Missing ]")
      }

      return vector
    }

    return String(Number(x)) === x ? Number(x) : x
  }

  return _(
    s
      .replace(/([\(\)\[\]])/g, " $1 ")
      .trim()
      .split(/\s+/)
  )
}

const prn = (x) => {
  if (isList(x)) {
    const r = []
    for (let c = x; c !== NIL; c = c.cdr) {
      r.push(prn(c.car))
    }

    return `(${r.join(" ")})`
  }

  if (Array.isArray(x)) {
    return `[${x.map((y) => prn(y)).join(" ")}]`
  }

  return String(x)
}

const Compiled = (l, g) => ({
  l,
  g: g ?? "",
})

const C = (strings, ...values) => {
  let l = ""
  let g = ""
  for (let i = 0; i < values.length; i++) {
    l += strings[i]
    const vals = Array.isArray(values[i]) ? values[i] : [values[i]]
    for (const val of vals) {
      if (val && val.l !== undefined) {
        l += val.l
        g += val.g
      } else {
        l += val
      }
    }
  }

  return Compiled(l + strings[strings.length - 1], g)
}

const sym = (() => {
  const lookup = {}

  return (exp) => {
    if (!(exp in lookup)) {
      lookup[exp] = Object.keys(lookup).length
    }

    return lookup[exp]
  }
})()

const fn = (() => {
  let i = 0

  return () => {
    return i++
  }
})()

const compile = (exp, locals = new Set()) => {
  if (typeof exp === "number") {
    return C`
    i32.const ${exp}
    call $alloc-int
    `
  }

  if (typeof exp === "string") {
    if (locals.has(exp)) {
      return C`
    local.get $${exp}
      `
    }

    return C`
    local.get $env
    i32.load offset=${8 + 4 * sym(exp)}
    `
  }

  if (isList(exp)) {
    const [op, ...args] = exp

    // (def x 10)
    if (op === "def") {
      const [name, val] = args

      return C`
    local.get $env
    ${compile(val, locals)}
    i32.store offset=${8 + 4 * sym(name)}
    i32.const ${sym(name)}
    call $alloc-int
      `
    }

    // (fn (x y) (+ x y))
    if (op === "fn") {
      const [names, body] = args
      const index = fn()

      const func = C`
  (func $fn${index} (param $args i32) (param $parent i32) (result i32)
    (local $env i32)
    (local $i i32)

    local.get $parent
    call $copy-vector
    local.set $env

    ${names.map((name, i) => {
      return `
    local.get $env
    local.get $args
    i32.load offset=${8 + 4 * i}
    i32.store offset=${8 + 4 * sym(name)}
        `
    })}

    ${compile(body, locals)}
  )
  (elem (i32.const ${index}) $fn${index})
      `

      return C`
    ${Compiled("", func.g + func.l)}
    i32.const ${index}
    local.get $env
    call $alloc-fn
        `
    }

    // (+ a b)
    if (op === "+" && args.length === 2) {
      return C`
    ${args.map((arg) =>
      typeof arg === "number"
        ? `
    i32.const ${arg}
    `
        : C`
    ${compile(arg, locals)}
    i32.load offset=4
    `
    )}
    i32.add
    call $alloc-int
      `
    }

    // (f x y)
    {
      return C`
    i32.const ${args.length}
    call $alloc-vector
    local.set $t

    ${args.map(
      (arg, i) => C`
    local.get $t
    ${compile(arg, locals)}
    i32.store offset=${8 + 4 * i}

    local.get $t ;; push args
    ${compile(op, locals)}
    local.tee $t
    i32.load offset=8 ;; push scope
    local.get $t
    i32.load offset=4
    call_indirect (type $fntype)
    `
    )}
      `
    }
  }

  if (Array.isArray(exp)) {
    return C`
    i32.const ${exp.length}
    call $alloc-vector
    local.set $t

    ${exp.map(
      (item, i) => C`
    local.get $t
    ${compile(item, locals)}
    i32.store offset=${8 + 4 * i}
    `
    )}

    local.get $t
    `
  }

  throw new Error(`Cannot compile ${exp}`)
}

const src = read(`[${await fetch("./core.clj").then((r) => r.text())}]`)

const compiled = C`
    ${src.map(
      (exp, i) => C`
    ${compile(exp)}
    ${i + 1 < src.length ? "drop\n" : "call $prn\n"}
`
    )}
`

const wat = (await fetch("./native.wat").then((r) => r.text()))
  .replace("${compiled[1]}", compiled.g)
  .replace("${compiled[0]}", compiled.l)
  .replace(/\n\s*\n/g, "\n\n")
console.log(wat)

//
// load wat
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
memory[0] = 256

const len = main(4)
console.log(len, new TextDecoder().decode(new Uint8Array(mem.buffer, 4, len)))
