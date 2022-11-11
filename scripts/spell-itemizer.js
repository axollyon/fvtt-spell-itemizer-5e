import { MODULE_ID } from "./const.js";

Hooks.on("dnd5e.itemUsageConsumption", (item, config, options, usage) => {
    const itemize = item.parent.getFlag(MODULE_ID, "itemize");
    if (!itemize) return true;
    else {
        Itemize(item, config, options, usage).then();
        return false;
    }
});

async function Itemize(item, config, options, usage) {
    // Commit pending data updates
    const { actorUpdates, itemUpdates, resourceUpdates } = usage;
    if ( !foundry.utils.isEmpty(itemUpdates) ) await item.update(itemUpdates);
    if ( config.consumeQuantity && (item.system.quantity === 0) ) await item.delete();
    if ( !foundry.utils.isEmpty(actorUpdates) ) await item.parent.update(actorUpdates);
    if ( resourceUpdates.length ) await item.parent.updateEmbeddedDocuments("Item", resourceUpdates);

    
}