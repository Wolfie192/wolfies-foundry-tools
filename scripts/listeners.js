import { executePartyCheckDialog } from "./apps/party-check.js";
import { ResearchPlayerApp } from "./apps/research-player.js";

export function registerGlobalListeners() {

    Hooks.on("updateUser", (user, changes) => {
        if (user.isGM && foundry.utils.hasProperty(changes, "flags.wolfies-foundry-tools.researchSync")) {
            if (game.user.isGM) return;

            const data = user.getFlag("wolfies-foundry-tools", "researchSync");
            if (data) {
                if (!window.wftResearchPlayerApp) {
                    window.wftResearchPlayerApp = new ResearchPlayerApp();
                }
                window.wftResearchPlayerApp.updateState(data);
            }
        }
    });

    Hooks.on("renderJournalTextPageSheet", (app, html, data) => {
        if (!game.user.isGM) return;

        html[0].querySelectorAll(".wft-var-display").forEach(el => {
            el.addEventListener("click", async (ev) => {
                let id = ev.currentTarget.dataset.varId;
                let vars = game.settings.get("wolfies-foundry-tools", "variables") || {};
                let varData = vars[id];

                if (!varData) return;

                let d = new Dialog({
                    title: `Edit Variable: ${varData.name}`,
                    content: `<p>New value for <b>${varData.name}</b> [${varData.type}]:</p><input type="text" id="wft-var-quick-input" value="${varData.value}" autofocus>`,
                    buttons: {
                        save: {
                            icon: '<i class="fas fa-save"></i>',
                            label: "Save",
                            callback: async (h) => {
                                let newVal = h.find("#wft-var-quick-input").val().trim();

                                if (varData.type === "bool") newVal = (newVal.toLowerCase() === "true");
                                else if (varData.type === "int") newVal = parseInt(newVal) || 0;
                                else if (varData.type === "float") newVal = parseFloat(newVal) || 0;
                                else newVal = h.find("#wft-var-quick-input").val();

                                varData.value = newVal;
                                vars[id] = varData;

                                await game.settings.set("wolfies-foundry-tools", "variables", vars);
                                ui.notifications.info(`Updated WFT Variable: ${varData.name}`);

                                Object.values(ui.windows).forEach(w => {
                                    if (w.document?.documentName === "JournalEntry") w.render(false);
                                });
                            }
                        }
                    },
                    default: "save"
                });
                d.render(true);
            });
        });
    });

    document.addEventListener("click", async (ev) => {

        const dcBtn = ev.target.closest(".wft-dc-btn");
        if (dcBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            const config = JSON.parse(decodeURIComponent(dcBtn.dataset.config));
            executePartyCheckDialog(config, dcBtn.dataset.title);
            return;
        }

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

        const treasureBtn = ev.target.closest(".wft-treasure-btn");
        if (treasureBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            const uuid = treasureBtn.dataset.uuid;
            if (uuid) {
                fromUuid(uuid).then(item => {
                    if (item) item.sheet.render(true);
                    else ui.notifications.warn("Item not found.");
                });
            }
            return;
        }

        const varClick = ev.target.closest(".wft-var-btn") || ev.target.closest(".wft-var-display");
        if (varClick) {
            ev.preventDefault();
            ev.stopPropagation();

            if (!game.user.isGM) return ui.notifications.warn("Only the GM can edit variables.");

            const id = varClick.dataset.id || varClick.dataset.varId;
            let vars = foundry.utils.deepClone(game.settings.get("wolfies-foundry-tools", "variables") || {});
            const v = vars[id];

            if (!v) return;

            let inputHtml = "";
            if (v.type === "bool") {
                inputHtml = `<select id="wft-var-edit" style="width: 100%; height: 28px;"><option value="true" ${v.value === true ? "selected" : ""}>True</option><option value="false" ${v.value === false ? "selected" : ""}>False</option></select>`;
            } else if (v.type === "int") {
                inputHtml = `<input type="number" step="1" id="wft-var-edit" value="${v.value}" style="width: 100%; height: 28px;" autofocus>`;
            } else if (v.type === "float") {
                inputHtml = `<input type="number" step="any" id="wft-var-edit" value="${v.value}" style="width: 100%; height: 28px;" autofocus>`;
            } else {
                inputHtml = `<input type="text" id="wft-var-edit" value="${v.value}" style="width: 100%; height: 28px;" autofocus>`;
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
                        const input = dialog.querySelector("#wft-var-edit");
                        if (!input) return;

                        let newVal = input.value;

                        if (v.type === "bool") newVal = (newVal === "true");
                        else if (v.type === "int") newVal = parseInt(newVal) || 0;
                        else if (v.type === "float") newVal = parseFloat(newVal) || 0;

                        vars[id].value = newVal;
                        await game.settings.set("wolfies-foundry-tools", "variables", vars);

                        let displayVal = newVal;
                        if (v.type === "bool") displayVal = newVal ? "True" : "False";

                        document.querySelectorAll(`.wft-var-btn[data-id="${id}"]`).forEach(btn => {
                            btn.innerHTML = `<i class="fas fa-calculator" style="color: #4a8094;"></i> <strong>${v.name}:</strong> ${displayVal}`;
                        });

                        Object.values(ui.windows).forEach(w => {
                            if (w.document?.documentName === "JournalEntry") w.render(false);
                        });
                    }
                }
            });
            return;
        }
    });
}