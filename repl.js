// TODO
// (lambda (x y.z) z)

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
  while (true) {
    if (typeof exp === "number") {
      return exp
    }

    if (typeof exp === "symbol") {
      return getVar(Symbol.keyFor(exp))
    }

    if (isPair(exp)) {
      const arr = [...exp]
      const prim =
        typeof arr[0] === "symbol" ? Symbol.keyFor(arr[0]) : undefined
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
        exp = undefined
        for (const clause of clauses) {
          const [p, c] = [...clause]
          const r =
            typeof p === "symbol" && Symbol.keyFor(p) === "else"
              ? true
              : evaluate(p, getVar, setVar)
          if (r !== false) {
            exp = c
            break
          }
        }

        if (exp === undefined) {
          return nil
        }
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

        const r = evaluate(p, getVar, setVar)
        if (r !== false) {
          exp = c
        } else if (a !== undefined) {
          exp = a
        } else {
          return nil
        }
      } else if (prim === "lambda") {
        return {
          names: [...arr[1]],
          body: arr.slice(2),
          getVar,
        }
      } else if (prim === "let") {
        const bindings = [...arr[1]]
        const body = arr.slice(2)

        return evaluate(
          list(
            list(Symbol.for("lambda"), list(...bindings.map(car)), ...body),
            ...bindings.map((x) => evaluate(car(cdr(x))))
          ),
          getVar,
          setVar
        )
      } else if (prim === "or") {
        const [, ...terms] = arr

        for (const x of terms) {
          if (evaluate(x, getVar, setVar) !== false) {
            return true
          }
        }

        return false
      } else {
        const [op, ...args] = arr.map((x) => evaluate(x, getVar, setVar))
        if (typeof op === "function") {
          return op(...args)
        }

        const { names, body } = op
        if (body.length === 0) {
          return nil
        }

        const newEnv = createEnv(op.getVar)
        names.forEach((name, i) => {
          newEnv.setVar(Symbol.keyFor(name), args[i])
        })

        for (let i = 0; i + 1 < body.length; i += 1) {
          evaluate(body[i], newEnv.getVar, newEnv.setVar)
        }

        exp = body[body.length - 1]
        getVar = newEnv.getVar
        setVar = newEnv.setVar
      }
    }
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
  identity: (x) => x,
  inc: (x) => x + 1,
  dec: (x) => x - 1,
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
