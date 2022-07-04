const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

class Cons {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  *[Symbol.iterator]() {
    if (this.x === undefined) {
      return
    }

    yield this.x
    let c = this.y
    while (!isNil(c)) {
      yield car(c)
      c = cdr(c)
    }
  }
}

const nil = new Cons()
const cons = (x, y) => new Cons(x, y)
const car = (p) => p.x
const cdr = (p) => p.y
const setCdr = (p, y) => (p.y = y)
const isPair = (p) => p instanceof Cons
const isNil = (p) => p === nil
const list = (...xs) => {
  let r = nil
  for (let i = xs.length - 1; i >= 0; i -= 1) {
    r = cons(xs[i], r)
  }

  return r
}

const read = (s) => {
  const _ = (xs) => {
    const x = xs.shift()
    if (x === "(") {
      const r = cons(nil, nil)
      let c = r
      while (xs.length && xs[0] !== ")") {
        setCdr(c, cons(_(xs), nil))
        c = cdr(c)
      }
      if (xs.shift() !== ")") {
        throw new Error("Missing )")
      }

      return cdr(r)
    }

    return String(Number(x)) === x ? Number(x) : Symbol.for(x)
  }

  return _(
    s
      .replace(/([()])/g, " $1 ")
      .trim()
      .split(/\s+/)
  )
}

// need env with parent
const evaluate = (exp, locals) => {
  if (typeof exp === "number") {
    return String(exp)
  }

  if (typeof exp === "symbol") {
    const key = Symbol.keyFor(exp)

    return locals.has(key) ? key : `getVar("${key}")`
  }

  if (isPair(exp)) {
    const arr = [...exp]
    const prim = typeof arr[0] === "symbol" ? Symbol.keyFor(arr[0]) : undefined
    if (prim === "define") {
      if (isPair(arr[1])) {
        return evaluate(
          list(
            arr[0],
            car(arr[1]),
            list(Symbol.for("lambda"), cdr(arr[1]), arr[2])
          ),
          locals
        )
      }

      const name = Symbol.keyFor(arr[1])
      const val = evaluate(arr[2], locals)

      return `(setVar("${name}", ${val}),Symbol.for("${name}"))`
    } else if (prim === "lambda") {
      const params = [...arr[1]].map((x) => Symbol.keyFor(x))
      const newLocals = new Set([...locals, ...params])
      const body = evaluate(arr[2], newLocals)

      return `((${params.join(",")})=>${body})`
    }

    const [op, ...args] = arr.map((x) => evaluate(x, locals))

    return `${op}(${args.join(",")})`
  }

  return exp
}

const prn = (exp) => {
  if (exp === null) {
    return "nil"
  }

  if (typeof exp === "symbol") {
    return Symbol.keyFor(exp)
  }

  if (isPair(exp)) {
    const r = []
    let c = exp
    while (!isNil(c)) {
      r.push(prn(car(c)))
      c = cdr(c)
    }

    return "(" + r.join(" ") + ")"
  }

  if (typeof exp === "function") {
    return `[PROC ${exp.name || "LAMBDA"}]`
  }

  return exp
}

const core = {
  "+": (...ns) => ns.reduce((r, n) => r + n, 0),
  "-": (n, ...ns) => (ns.length === 0 ? -n : ns.reduce((r, n) => r - n, n)),
  "/": (n, ...ns) => ns.reduce((r, n) => r / n, n),
  "*": (...ns) => ns.reduce((r, n) => r * n, 1),
}

const getVar = (key) => {
  if (!(key in core)) {
    throw new Error(`Unknown symbol ${key}`)
  }

  return core[key]
}

const setVar = (key, val) => {
  core[key] = val
}

const _ = () => {
  rl.question("\n  > ", (answer) => {
    if (answer === ":q") {
      rl.close()
      // console.log("Bye bye")
      return
    } else if (answer === "") {
      _()

      return
    }

    try {
      const compiled = evaluate(read(answer), new Set())
      // console.log(compiled)
      console.log(prn(eval(compiled)))
    } catch (e) {
      console.error(e)
    }

    _()
  })
}
_()
