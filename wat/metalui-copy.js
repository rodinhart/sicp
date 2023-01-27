export const jsonml2xml = (el) => {
  if (Array.isArray(el)) {
    const [tag, props, ...children] = el

    return `<${tag}${Object.entries(props).map(
      ([key, val]) => ` ${key}="${val}"`
    )}>${children.map((child) => jsonml2xml(child)).join("\n")}</${tag}>`
  }

  return String(el)
}
