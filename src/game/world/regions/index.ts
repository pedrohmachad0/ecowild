import { registerRegion } from "../region.ts";
import { MATA } from "./mata.ts";
import { VEREDA } from "./vereda.ts";
import { PANTANAL } from "./pantanal.ts";

/** Register every region once. The first one (Mata) is the default active region. */
registerRegion(MATA);
registerRegion(VEREDA);
registerRegion(PANTANAL);

export { MATA, PANTANAL, VEREDA };
