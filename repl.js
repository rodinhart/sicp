// TODO
// proper recursion
// (lambda (x y.z) z)
// (lambda (hello-world) hello-world)

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

    return Number.isFinite(Number(x)) ? Number(x) : Symbol.for(x)
  }

  return _(
    s
      .replace(/([()])/g, " $1 ")
      .trim()
      .split(/\s+/)
  )
}

const evaluate = (exp, getVar, setVar) => {
  if (typeof exp === "number") {
    return exp
  }

  if (typeof exp === "symbol") {
    return getVar(Symbol.keyFor(exp))
  }

  if (isPair(exp)) {
    const arr = [...exp]
    const prim = typeof arr[0] === "symbol" ? Symbol.keyFor(arr[0]) : undefined
    if (prim === "and") {
      const [, ...terms] = arr

      for (const x of terms) {
        if (evaluate(x, getVar, setVar) === false) {
          return false
        }
      }

      return true
    } else if (prim === "cond") {
      const [, ...clauses] = arr
      for (const clause of clauses) {
        const [p, c] = [...clause]
        const r =
          typeof p === "symbol" && Symbol.keyFor(p) === "else"
            ? true
            : evaluate(p, getVar, setVar)
        if (r !== false) {
          return evaluate(c, getVar, setVar)
        }
      }

      return nil
    } else if (prim === "define") {
      if (isPair(arr[1])) {
        return evaluate(
          list(
            arr[0],
            car(arr[1]),
            list(Symbol.for("lambda"), cdr(arr[1]), ...arr.slice(2))
          ),
          getVar,
          setVar
        )
      }

      const name = Symbol.keyFor(arr[1])
      const val = evaluate(arr[2], getVar, setVar)

      setVar(name, val)

      return arr[1]
    } else if (prim === "if") {
      const [, p, c, a] = arr

      return evaluate(
        list(
          Symbol.for("cond"),
          list(p, c),
          ...(a !== undefined ? [list(Symbol.for("else"), a)] : [])
        ),
        getVar,
        setVar
      )
    } else if (prim === "lambda") {
      return {
        names: [...arr[1]],
        body: arr.slice(2),
        getVar,
      }
    } else if (prim === "or") {
      const [, ...terms] = arr

      for (const x of terms) {
        if (evaluate(x, getVar, setVar) !== false) {
          return true
        }
      }

      return false
    }

    const [op, ...args] = arr.map((x) => evaluate(x, getVar, setVar))
    if (typeof op === "function") {
      return op(...args)
    }

    const { names, body } = op
    console.log(names, body)
    const { getVar, setVar } = createEnv(op.getVar)
    names.forEach((name, i) => {
      setVar(Symbol.keyFor(name), args[i])
    })

    return body.reduce((_, x) => evaluate(x, getVar, setVar), nil)
  }
}

const prn = (exp) => {
  if (exp === null) {
    return "nil"
  }

  if (typeof exp === "symbol") {
    return Symbol.keyFor(exp)
  }

  if (typeof exp === "boolean") {
    return exp ? "#t" : "#f"
  }

  if (typeof exp === "number") {
    return String(exp)
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

  if (typeof exp === "function" || "body" in exp) {
    return `[PROC ${exp.name || "LAMBDA"}]`
  }
}

const core = {
  nil: nil,
  "#t": true,
  "#f": false,
  "+": (...ns) => ns.reduce((r, n) => r + n, 0),
  "-": (n, ...ns) => (ns.length === 0 ? -n : ns.reduce((r, n) => r - n, n)),
  "/": (n, ...ns) => ns.reduce((r, n) => r / n, n),
  "*": (...ns) => ns.reduce((r, n) => r * n, 1),
  "=": (a, b) => a === b,
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  not: (x) => !x,
  abs: (x) => (x < 0 ? -x : x),
  exp: (x) => Math.exp(x),
  log: (x) => Math.log(x),
  display: (...xs) => (console.log(...xs), nil),
  newline: () => console.log(),
  "even?": (n) => n % 2 === 0,
  "odd?": (n) => n % 2 === 1,
  remainder: (a, b) => a % b,
  square: (x) => x * x,
  runtime: () => Date.now(),
  power: (a, b) => a ** b, // is this scheme?
}

const createEnv = (getVar) => {
  const env = {}

  return {
    getVar: (key) => {
      if (!(key in env)) {
        return getVar(key)
      }

      return env[key]
    },
    setVar: (key, val) => {
      env[key] = val
    },
  }
}

const { getVar, setVar } = createEnv((key) => {
  if (!(key in core)) {
    throw new Error(`Unknown symbol ${key}`)
  }

  return core[key]
})

const _ = (prev) => {
  rl.question("\n  > ", (answer) => {
    if (answer === ":q") {
      rl.close()
      return
    } else if (answer === "") {
      _(prev)

      return
    }

    try {
      console.log(prn(evaluate(read(prev + " " + answer), getVar, setVar)))
      _("")
    } catch (e) {
      if (e.message.includes("Missing )")) {
        _(prev + " " + answer)
      } else {
        console.error(e)
        _("")
      }
    }
  })
}
_("")
