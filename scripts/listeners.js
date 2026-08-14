import { executePartyCheckDialog } from "./dialogs.js";

export function registerGlobalListeners() {
    document.addEventListener("click", async (ev) => {
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

        // 4. Variables
        const varBtn = ev.target.closest(".wft-var-btn");
        if (varBtn) {
            ev.preventDefault();
            ev.stopPropagation();

            // Only GMs can write to "world" scoped settings
            if (!game.user.isGM) return ui.notifications.warn("Only the GM can edit variables.");

            const id = varBtn.dataset.id;

            let vars = foundry.utils.deepClone(game.settings.get("wolfies-foundry-tools", "variables") || {});
            const v = vars[id];

            if (!v) return;

            let inputHtml = "";
            if (v.type === "bool") {
                inputHtml = `<select id="wft-var-edit" style="width: 100%; height: 28px;"><option value="true" ${v.value === true ? "selected" : ""}>True</option><option value="false" ${v.value === false ? "selected" : ""}>False</option></select>`;
            } else if (v.type === "int") {
                inputHtml = `<input type="number" step="1" id="wft-var-edit" value="${v.value}" style="width: 100%; height: 28px;">`;
            } else if (v.type === "float") {
                inputHtml = `<input type="number" step="any" id="wft-var-edit" value="${v.value}" style="width: 100%; height: 28px;">`;
            } else {
                inputHtml = `<input type="text" id="wft-var-edit" value="${v.value}" style="width: 100%; height: 28px;">`;
            }

            const { DialogV2 } = foundry.applications.api;
            DialogV2.prompt({
                window: { title: `Update: ${v.name}` },
                position: { width: 300 },
                content: `<div style="margin-bottom: 10px;">${inputHtml}</div>`,
                ok: {
                    label: "Save",
                    icon: "fas fa-save",
                    callback: async (event, button, dialog) => {
                        const input = document.getElementById("wft-var-edit");
                        if (!input) return;

                        let newVal = input.value;

                        // Enforce data types
                        if (v.type === "bool") newVal = (newVal === "true");
                        else if (v.type === "int") newVal = parseInt(newVal) || 0;
                        else if (v.type === "float") newVal = parseFloat(newVal) || 0;

                        // Save the newly mutated object back into the database
                        vars[id].value = newVal;
                        await game.settings.set("wolfies-foundry-tools", "variables", vars);

                        // INSTANT UI UPDATE: Format the display string and rewrite the HTML of all active buttons
                        let displayVal = newVal;
                        if (v.type === "bool") displayVal = newVal ? "True" : "False";

                        document.querySelectorAll(`.wft-var-btn[data-id="${id}"]`).forEach(btn => {
                            btn.innerHTML = `<i class="fas fa-calculator" style="color: #4a8094;"></i> <strong>${v.name}:</strong> ${displayVal}`;
                        });
                    }
                }
            });
            return;
        }
    });
}