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
    yield this.x
    let c = this.y
    while (!isNil(c)) {
      yield car(c)
      c = cdr(c)
    }
  }
}

const nil = null
const cons = (x, y) => new Cons(x, y)
const car = (p) => p.x
const cdr = (p) => p.y
const setCdr = (p, y) => (p.y = y)
const isPair = (p) => p instanceof Cons
const isNil = (p) => p === nil

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
      xs.shift()

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

const eval = (exp, env) => {
  if (typeof exp === "number") {
    return exp
  }

  if (typeof exp === "symbol") {
    const key = Symbol.keyFor(exp)
    if (!(key in env)) {
      // need env with parent
      throw new Error(`Unknown symbol ${key}`)
    }

    return env[key]
  }

  if (isPair(exp)) {
    const [op, ...args] = [...exp].map((x) => eval(x, env))

    return op(...args)
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
    return `[PROC ${exp.name}]`
  }

  return exp
}

const core = {
  "+": (...ns) => ns.reduce((r, n) => r + n, 0),
}

const _ = () => {
  rl.question("\n  > ", (answer) => {
    if (answer === ":q") {
      rl.close()
      // console.log("Bye bye")
      return
    }

    try {
      console.log(prn(eval(read(answer), core)))
    } catch (e) {
      console.error(e)
    }

    _()
  })
}
_()
