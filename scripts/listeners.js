import { executePartyCheckDialog } from "./dialogs.js";

// --- THE PLAYER DISPLAY WINDOW ---
const { ApplicationV2 } = foundry.applications.api;
class ResearchPlayerApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "wft-research-player",
        title: "Research Encounter",
        tag: "div",
        window: { icon: "fas fa-search-location", width: 600, resizable: true },
        position: { height: "auto" }
    };

    state = null;

    updateState(newState) {
        this.state = newState;
        const existing = Object.values(ui.windows).find(w => w.id === "wft-research-player");
        if (existing) {
            existing.render(false);
        } else {
            this.render(true);
        }
    }

    async _renderHTML(context, options) {
        if (!this.state) return `<div style="padding: 20px; text-align: center; font-style: italic;">Waiting for GM to initialize encounter...</div>`;
        const d = this.state;

        let roundText = d.maxRounds ? `Round ${d.round} / ${d.maxRounds}` : `Round ${d.round}`;

        let html = `
            <div style="padding: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4a8094; padding-bottom: 10px; margin-bottom: 15px;">
                    <div style="font-size: 18px; font-weight: bold; color: #4a8094;">${d.name}</div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: bold;">${roundText}</div>
                        <div style="font-size: 14px; font-weight: bold; color: #8a1a1b;">Party RP: ${d.totalRP}</div>
                    </div>
                </div>
        `;

        if (d.locations.length > 0) {
            html += `<h3 style="margin-top: 0; border-bottom: 1px solid #777;"><i class="fas fa-map-marker-alt"></i> Known Locations</h3>`;
            for (let loc of d.locations) {
                html += `
                    <div style="border: 1px solid #ccc; border-left: 4px solid #4a8094; background: rgba(74, 128, 148, 0.05); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px;">
                            <strong style="font-size: 14px;">${loc.name}</strong>
                            <span style="font-size: 13px; font-weight: bold; color: #4a8094;">RP: ${loc.currentRP} / ${loc.maxRP || "∞"}</span>
                        </div>
                        ${loc.checksHtml ? `<div style="margin-bottom: 6px;">${loc.checksHtml}</div>` : ''}
                        <div style="font-size: 13px; line-height: 1.4;">${loc.descHtml}</div>
                    </div>
                `;
            }
        } else {
            html += `<div style="font-style: italic; color: #777; margin-bottom: 15px; font-size: 12px;">No locations revealed yet.</div>`;
        }

        if (d.breakpoints.length > 0) {
            html += `<h3 style="margin-top: 15px; border-bottom: 1px solid #777;"><i class="fas fa-chart-line"></i> Breakpoints</h3>`;
            for (let bp of d.breakpoints) {
                let reachStyle = bp.isReached ? 'box-shadow: 0 0 5px rgba(74, 128, 148, 0.5);' : 'opacity: 0.7;';
                html += `
                    <div style="border: 1px solid #ccc; border-left: 4px solid #4a8094; ${reachStyle} background: rgba(74, 128, 148, 0.05); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px;">
                            <strong style="font-size: 14px;">Threshold: ${bp.threshold} RP</strong>
                            ${bp.isReached ? `<span style="font-size: 11px; font-weight: bold; color: #4a945a;"><i class="fas fa-check"></i> Reached</span>` : ''}
                        </div>
                        <div style="font-size: 13px; line-height: 1.4;">${bp.descHtml}</div>
                    </div>
                `;
            }
        }

        html += `</div>`;
        return html;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }
}
// ------------------------------------------

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

        const varBtn = ev.target.closest(".wft-var-btn");
        if (varBtn) {
            ev.preventDefault();
            ev.stopPropagation();

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
                    }
                }
            });
            return;
        }
    });
}