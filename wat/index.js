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

const src = read(`(${await fetch("./core.clj").then((r) => r.text())})`)

const compiled = ["", ""]
for (let i = 0; i < src.length; i++) {
  const [l, g] = compile(src[i])
  compiled[0] += "\n" + l + (i + 1 < src.length ? "drop" : "call $prn")
  compiled[1] += "\n" + (g ?? "")
}

const wat = (await fetch("./native.wat").then((r) => r.text()))
  .replace("${compiled[1]}", compiled[1])
  .replace("${compiled[0]}", compiled[0])
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
