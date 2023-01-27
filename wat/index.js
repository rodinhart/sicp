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

const { main, mem } = loadWat(wat)

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

document.getElementById("app").innerHTML = jsonml2xml(html)

console.log(len, jsonml2xml(html))
