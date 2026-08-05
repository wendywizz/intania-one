/**
 * "This module is switched off", carried from the gateway to the screen.
 *
 * The gateway answers 503 with error.name = 'ModuleDisabled' when a module's
 * App row has `active` unticked (scooba-service/src/middlewares/module-gate.js).
 * Every screen here stores its failure as a plain string, so the marker travels
 * as a prefix on that string rather than as a custom error type — that is what
 * lets ErrorState tell "somebody turned this off" apart from "something broke"
 * without each screen having to be taught the difference.
 */
export const MODULE_DISABLED = "MODULE_DISABLED";

export function isModuleDisabledText(text?: string | null) {
  return typeof text === "string" && text.startsWith(MODULE_DISABLED);
}

/** The server's wording, with the marker stripped off. */
export function moduleDisabledText(text?: string | null) {
  if (!isModuleDisabledText(text)) return text ?? "";
  return (text as string).slice(MODULE_DISABLED.length).trim();
}
