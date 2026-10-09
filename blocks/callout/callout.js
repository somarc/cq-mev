/** Callout: a highlighted statement. The authored markup is kept; the look is in callout.css. */
export default function decorate(block) {
  block.setAttribute('role', 'note');
}
