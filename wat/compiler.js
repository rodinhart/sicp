import { isList, isString } from "./lisp.js"

const Compiled = (l, g) => ({
  l,
  g: g ?? "",
})

export const C = (strings, ...values) => {
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

export const compile = (exp, locals = new Set()) => {
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
    local.tee $t
    i32.store offset=${8 + 4 * sym(name)}
    local.get $t
      `
    }

    // (fn [x y] (+ x y))
    // (fn "exportName" [x y] (+ x y))
    if (op === "fn") {
      let exportName, names, body
      if (isString(args[0])) {
        exportName = args[0].string
        names = args[1]
        body = args[2]
      } else {
        names = args[0]
        body = args[1]
      }

      const index = fn()

      const func = C`
  (func $fn${index}${
        exportName ? ` (export "${exportName}")` : ""
      } (param $args i32) (param $parent i32) (result i32)
    (local $env i32)
    (local $i i32)
    (local $t i32)

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
    i32.const ${(8 + (exp.string.length + 3)) & ~3}
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
