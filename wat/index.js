// import WabtModule from "./libwabt.js"

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

const module = WabtModule().parseWat(
  "test.wat",
  `

  (module
    (func $sum (export "sum") (param $N i32) (result i32)
      (local $n i32)
      (local $a i32)
      local.get $N
      local.set $n
      (loop $loop (result i32)
        local.get $n
        i32.eqz
        (if (result i32) (then
          local.get $a
        ) (else
          local.get $a
          local.get $n
          i32.add
          local.set $a
          local.get $n
          i32.const 1
          i32.sub
          local.set $n
          br $loop
        ))
      )
    )
  )

  `
)

// module.resolveNames()
// module.validate(Flags)
const binaryOutput = module.toBinary(
  {} /*{ log: true, write_debug_names: true }*/
)

const wasm = new WebAssembly.Module(binaryOutput.buffer)
const wasmInstance = new WebAssembly.Instance(wasm, {})
const { sum } = wasmInstance.exports

console.log(sum(10))
