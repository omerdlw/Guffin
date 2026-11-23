import { Z_INDEX } from "@/design/foundations/z-index";
import { beat } from "@/design/theme/motion";

const LAYER = Z_INDEX.UI_ELEMENT;
const LIFETIME_MS = beat(0) * 1000;

// A detached copy of a leaving route skeleton ([data-loading]) that fades out
// over the arriving page ([data-loading-ghost] in effects.css). Self-contained
// because it is also inlined as a string: plain loops, no outer references.
export function ghost(
  element: Element,
  boxes: readonly DOMRect[],
  layer: number = LAYER,
  lifetime: number = LIFETIME_MS,
): () => void {
  const layerEl = document.createElement("div");
  const remove = function () {
    layerEl.remove();
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return remove;
  layerEl.setAttribute("aria-hidden", "true");
  layerEl.setAttribute("data-loading-ghost", "");
  layerEl.style.cssText =
    "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:" +
    layer;
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    const box = boxes[i];
    if (!box) continue;
    const copy = child.cloneNode(true) as HTMLElement;
    copy.removeAttribute("id");
    const named = copy.querySelectorAll("[id]");
    for (let k = 0; k < named.length; k++) named[k].removeAttribute("id");
    copy.style.position = "absolute";
    copy.style.margin = "0";
    copy.style.left = box.left + "px";
    copy.style.top = box.top + "px";
    copy.style.width = box.width + "px";
    layerEl.appendChild(copy);
  }
  document.body.appendChild(layerEl);
  layerEl.addEventListener("animationend", remove, { once: true });
  setTimeout(remove, lifetime);
  return remove;
}

// First load: the streamed page replaces the skeleton before hydration, so no
// React cleanup runs. Keep each un-hydrated skeleton's boxes every frame and
// copy it when it leaves the DOM; stop once the document has loaded and no
// such skeleton is left. Rendered once by the root layout (server only).
export const LOADING_HANDOFF_SCRIPT = `(function(){var g=${ghost.toString()},k=new WeakMap(),q="[data-loading]:not([data-hydrated])";var o=new MutationObserver(function(r){for(var i=0;i<r.length;i++){var d=r[i].removedNodes;for(var j=0;j<d.length;j++){var n=d[j];if(n.nodeType!==1)continue;var l=n.matches(q)?[n]:n.querySelectorAll(q);for(var m=0;m<l.length;m++){var b=k.get(l[m]);if(b)g(l[m],b,${LAYER},${LIFETIME_MS})}}}});o.observe(document.documentElement,{childList:true,subtree:true});function t(){var e=document.querySelectorAll(q);for(var i=0;i<e.length;i++)k.set(e[i],Array.from(e[i].children,function(c){return c.getBoundingClientRect()}));if(e.length||document.readyState!=="complete")requestAnimationFrame(t);else o.disconnect()}requestAnimationFrame(t)})()`;
