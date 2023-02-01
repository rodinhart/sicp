// import WabtModule from "./libwabt.js"

export const loadWat = (wat) => {
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

  const { main, test } = wasmInstance.exports

  return { main, mem, test }
}
