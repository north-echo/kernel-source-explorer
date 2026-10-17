// Positions belong to browsed URLs, independently of deliberately saved book/lab state.
const positions = new Map<string, { x: number; y: number }>();
let current = window.location.hash;
window.history.scrollRestoration = "manual";
window.addEventListener(
  "scroll",
  () => positions.set(current, { x: window.scrollX, y: window.scrollY }),
  { passive: true },
);
window.addEventListener("hashchange", () => {
  positions.set(current, { x: window.scrollX, y: window.scrollY });
  current = window.location.hash;
});
export function showActivity(heading: HTMLElement | null) {
  const position = positions.get(window.location.hash);
  heading?.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    if (position) window.scrollTo(position.x, position.y);
    else heading?.scrollIntoView({ block: "start" });
  });
}
