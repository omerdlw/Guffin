import { Signal } from "../signal";

// How many things stand in front of the page right now (a modal, a sheet).
// While any do, the house lights go down.
export const house = new Signal(0);

export const houseDown = () => house.get() > 0;

export function show(): () => void {
  house.set(house.get() + 1);
  let shown = true;
  return () => {
    if (!shown) return;
    shown = false;
    house.set(house.get() - 1);
  };
}
