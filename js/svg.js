const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function svgElement(tag, attributes = {}, text = "") {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  if (text) element.textContent = text;
  return element;
}

export function curvedPath(start, end, index = 0) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const bend = (0.08 + (index % 4) * 0.04) * (index % 2 === 0 ? 1 : -1);
  return quadraticPath(start, end, [-dy * bend, dx * bend]);
}

export function quadraticPath(start, end, offset = [60, -60]) {
  const x = (start[0] + end[0]) / 2 + offset[0];
  const y = (start[1] + end[1]) / 2 + offset[1];
  return `M ${start[0]} ${start[1]} Q ${x} ${y} ${end[0]} ${end[1]}`;
}

export const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
