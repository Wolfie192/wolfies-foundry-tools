export function registerVariables() {
    game.settings.register("wolfies-foundry-tools", "variables", {
        name: "World Variables",
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

    CONFIG.TextEditor.enrichers.push({
        pattern: /@WFT\[type:var\|id:(.+?)\]/g,
        enricher: async (match, options) => {
            let id = match[1];
            let vars = game.settings.get("wolfies-foundry-tools", "variables") || {};
            let varData = vars[id];

            if (!varData) {
                if (game.user.isGM) {
                    let err = document.createElement("span");
                    err.style.color = "red"; err.style.fontSize = "10px"; err.innerText = `[Missing Var: ${id}]`;
                    return err;
                }
                return document.createTextNode("");
            }

            if (varData.conditions && varData.conditions.rules && varData.conditions.rules.length > 0) {
                let results = varData.conditions.rules.map(rule => {
                    let targetVar = vars[rule.varId];
                    if (!targetVar) return false;

                    let a = targetVar.value;
                    let b = rule.val;

                    if (targetVar.type === "int" || targetVar.type === "float") b = Number(b);
                    if (targetVar.type === "bool") b = (b === "true" || b === true);

                    if (rule.op === "==") return a == b;
                    if (rule.op === "!=") return a != b;
                    if (rule.op === ">=") return a >= b;
                    if (rule.op === "<=") return a <= b;
                    if (rule.op === ">") return a > b;
                    if (rule.op === "<") return a < b;
                    return false;
                });

                let isTrue = varData.conditions.logicMode === "&&"
                    ? results.every(r => r === true)
                    : results.some(r => r === true);

                if (!isTrue) return document.createTextNode("");
            }

            const span = document.createElement("span");
            span.classList.add("wft-var-display");
            span.dataset.varId = id;

            if (varData.type === "text") {
                span.innerHTML = await TextEditor.enrichHTML(varData.value, { async: true });
            } else {
                span.innerText = varData.value;
                span.style.fontWeight = "bold";
                span.style.color = "#4a8094";
                span.style.padding = "0 4px";
                span.style.background = "rgba(74, 128, 148, 0.1)";
                span.style.borderRadius = "3px";
            }

            if (game.user.isGM) {
                span.style.cursor = "pointer";
                span.title = `GM: Click to edit ${varData.name}`;
            }
            return span;
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
}