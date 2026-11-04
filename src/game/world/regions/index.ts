import { registerRegion } from "../region.ts";
import { MATA } from "./mata.ts";
import { VEREDA } from "./vereda.ts";

/** Register every region once. The first one (Mata) is the default active region. */
registerRegion(MATA);
registerRegion(VEREDA);

export { MATA, VEREDA };
