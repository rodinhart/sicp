import { C, compile } from "./compiler.js"
import { read } from "./lisp.js"
import { jsonml2xml } from "./metalui-copy.js"
import { loadWat } from "./wasm-util.js"

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

const { main, mem, test } = loadWat(wat)

const memory = new Uint32Array(mem.buffer, 0, 1)
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

document.getElementById("app").innerHTML = jsonml2xml(html)

console.log(len, jsonml2xml(html))

const marshall = (x) => {
  const p = memory[0]
  const m = new Uint32Array(mem.buffer, p)
  switch (typeof x) {
    case "number":
      m[0] = 1 // INT
      m[1] = x

      memory[0] += 8
      break

    case "string":
      m[0] = 3 // STRING
      m[1] = x.length
      new TextEncoder().encodeInto(x, new Uint8Array(mem.buffer, memory[0] + 8))
      memory[0] += 8 + ((x.length + 3) & ~3)
      break

    case "object":
      if (Array.isArray(x)) {
        m[0] = 5 // VECTOR
        m[1] = x.length
        memory[0] += 8 + 4 * x.length
        for (let i = 0; i < x.length; i += 1) {
          m[2 + i] = marshall(x[i])
        }

        break
      } else if (x !== null) {
        return marshall(["#", ...Object.entries(x).flat()])
      } else {
        m[0] = 6 // NIL

        memory[0] += 4
        break
      }
  }

  return p
}

const unmarshal = (buffer, p) => {
  const m = new Uint32Array(buffer, p)
  switch (m[0]) {
    case 1: // INT
      return m[1]

    case 3: // STRING
      return new TextDecoder().decode(new Uint8Array(buffer, p + 8, m[1]))

    case 4: // FUNCTION
      return `$fn${m[1]}`

    case 5: {
      // VECTOR
      const r = []
      for (let i = 0; i < m[1]; i++) {
        r.push(unmarshal(buffer, m[2 + i]))
      }

      if (r[0] !== "#") {
        return r
      }

      const o = {}
      for (let i = 1; i < r.length; i += 2) {
        o[r[i]] = r[i + 1]
      }

      return o
    }

    case 6: // NIL
      return null
  }
}

const p = marshall([[2, "hello", null, 5, { a: 7, bob: 11 }]])
const testresult = test(p, 2048) // should be multple of 4
const r = unmarshal(mem.buffer, testresult)
console.log(JSON.stringify(r))
