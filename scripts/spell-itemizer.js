import { MODULE_ID } from "./const.js";

Hooks.on("dnd5e.itemUsageConsumption", (item, config, options, usage) => {
    const itemize = item.parent.getFlag(MODULE_ID, "itemize");
    if (!itemize) return true;
    else {
        return false;
    }
});