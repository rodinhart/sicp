// import WabtModule from "./libwabt.js"

const NIL = {}
const cons = (car, cdr) => ({
  car,
  cdr,
  [Symbol.iterator]: function* () {
    for (let c = cons(car, cdr); c !== NIL; c = c.cdr) {
      yield c.car
    }
  },
})
const isList = (x) => x === NIL || x.cdr
const isString = (x) => x && x.string !== undefined

const read = (s, tx = (x) => x) => {
  let _ = (xs) => {
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
    } else if (x === "{") {
      const r = []
      while (xs.length && xs[0] !== "}") {
        r.push(_(xs))
      }

      if (xs.shift() !== "}") {
        throw new Error("Missing }")
      }

      return [{ string: "#" }, ...r]
    }

    const match = x.match(/^"([^"]*)"$/)
    if (match) {
      return {
        string: match[1].replace(/👽/g, " "),
      }
    }

    return String(Number(x)) === x ? Number(x) : x
  }

  const $ = _
  _ = (x) => tx($(x))

  return _(
    s
      .replace(/\s+(?=(?:(?:[^"]*"){2})*[^"]*"[^"]*$)/g, "👽")
      .replace(/([\(\)\[\]{}])/g, " $1 ")
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

  if (isString(x)) {
    return `"${x.string}"`
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

    // (if p c a)
    if (op === "if") {
      const [predicate, consequent, alternative] = args

      return C`
    ${compile(predicate, locals)}
    i32.load offset=4
    i32.const 0
    i32.ne
    if (result i32)
      ${compile(consequent, locals)}
    else
      ${compile(alternative, locals)}
    end
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

    ${args.map(
      (arg, i) => C`
    local.tee $t
    local.get $t
    ${compile(arg, locals)}
    i32.store offset=${8 + 4 * i}

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

    ${exp.map(
      (item, i) => C`
    local.tee $t
    local.get $t
    ${compile(item, locals)}
    i32.store offset=${8 + 4 * i}
    `
    )}
    `
  }

  if (isString(exp)) {
    return C`
    i32.const ${8 + exp.string.length}
    call $alloc
    local.tee $t
    i32.const 3 ;; STRING
    i32.store
    local.get $t
    i32.const ${exp.string.length}
    i32.store offset=4
    ${exp.string.split("").map(
      (c, i) => C`
    local.get $t
    i32.const ${c.charCodeAt(0)}
    i32.store offset=${8 + i}
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
// console.log(wat)

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
memory[0] = 1024

const len = main(4)
const result = new TextDecoder().decode(new Uint8Array(mem.buffer, 4, len))
const html = read(result, (x) =>
  x && x.string !== undefined
    ? x.string
    : Array.isArray(x) && x[0] === "#"
    ? x.slice(1).reduce((r, _, i, arr) => {
        if (i % 2 === 0) {
          r[arr[i]] = arr[i + 1]
        }

        return r
      }, {})
    : x
)

const jsonml2xml = (el) => {
  if (Array.isArray(el)) {
    const [tag, props, ...children] = el

    return `<${tag}${Object.entries(props).map(
      ([key, val]) => ` ${key}="${val}"`
    )}>${children.map((child) => jsonml2xml(child)).join("\n")}</${tag}>`
  }

  return String(el)
}

document.getElementById("app").innerHTML = jsonml2xml(html)

console.log(len, jsonml2xml(html))
