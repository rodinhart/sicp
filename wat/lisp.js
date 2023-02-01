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

export const isList = (x) => x === NIL || x.cdr
export const isString = (x) => x && x.string !== undefined

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

export const read = (s, tx = (x) => x) => {
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
      .replace(/[\s,]+(?=(?:(?:[^"]*"){2})*[^"]*"[^"]*$)/g, "👽")
      .replace(/([\(\)\[\]{}])/g, " $1 ")
      .trim()
      .split(/[\s,]+/)
  )
}
