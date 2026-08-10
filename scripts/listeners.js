import { executePartyCheckDialog } from "./dialogs.js";

export function registerGlobalListeners() {
    document.addEventListener("click", (ev) => {
        // 1. Party Checks
        const dcBtn = ev.target.closest(".wft-dc-btn");
        if (dcBtn) {
            ev.preventDefault();
            ev.stopPropagation();

            const config = JSON.parse(decodeURIComponent(dcBtn.dataset.config));
            const title = dcBtn.dataset.title;
            executePartyCheckDialog(config, title);
            return;
        }

        // 2. Encounter Macros
        const macroBtn = ev.target.closest(".wft-macro-btn");
        if (macroBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            const macroName = macroBtn.dataset.macro;
            const macro = game.macros.getName(macroName);
            if (macro) macro.execute();
            else ui.notifications.warn(`Macro "${macroName}" not found.`);
            return;
        }

        // 3. Treasure Links
        const treasureBtn = ev.target.closest(".wft-treasure-btn");
        if (treasureBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            const uuid = treasureBtn.dataset.uuid;

            if (uuid) {
                fromUuid(uuid).then(item => {
                    if (item) item.sheet.render(true);
                    else ui.notifications.warn("Item not found. It may have been deleted or the UUID is incorrect.");
                });
            }
            return;
        }
    });
}