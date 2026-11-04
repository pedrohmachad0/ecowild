import { registerRegion } from "../region.ts";
import { MATA } from "./mata.ts";
import { VEREDA } from "./vereda.ts";
import { PANTANAL } from "./pantanal.ts";
import { GRUTA } from "./gruta.ts";

/** Register every region once. The first one (Mata) is the default active region. */
registerRegion(MATA);
registerRegion(VEREDA);
registerRegion(PANTANAL);
registerRegion(GRUTA);

export { GRUTA, MATA, PANTANAL, VEREDA };
