import { getPartyPFSStats } from "./math.js";
import { executePartyCheckDialog } from "./dialogs.js";
import { registerPfsSettings } from "./settings.js";

Hooks.once("init", () => {
    console.log("PFS Dynamic Journals | Initializing");

    // Load the settings from settings.js
    registerPfsSettings();

    // Register the Text Editor Enricher for @PFS tags
    CONFIG.TextEditor.enrichers.push({
        pattern: /@PFS\[(.*?)\]/g,
        enricher: async (match, options) => {
            const tagData = match[1];

            const params = {};
            tagData.split("|").forEach(part => {
                const [key, value] = part.split(":");
                if (key && value) params[key.trim()] = value.trim();
            });

            const globalBaseLevel = game.settings.get("pfs-dynamic-journals", "scenarioBaseLevel");
            const baseLevel = parseInt(params.baseLevel) || globalBaseLevel;

            // Calculate math using imported function
            const { cp, tier, bracket, playerCount } = getPartyPFSStats(baseLevel);

            const span = document.createElement("span");
            span.classList.add("pfs-dynamic-value");

            if (params.type === "dc") {
                let finalDC = params[bracket] || params[tier] || params.low || "??";
                let skillText = params.skill ? ` ${params.skill}` : "";

                span.innerHTML = `<a class="content-link"><i class="fas fa-dice-d20"></i> DC ${finalDC}${skillText}</a>`;
                span.title = `Tier: ${tier.toUpperCase()} | CP: ${cp} (${playerCount} players) | Base Level: ${baseLevel}`;

                // Open dialog using imported function
                span.addEventListener("click", () => executePartyCheckDialog(finalDC, params.skill));
            }
            else if (params.type === "macro") {
                let macroName = params[bracket] || params[tier] || params.low;
                if (macroName) {
                    span.innerHTML = `<a class="content-link" draggable="true" data-type="Macro" data-id="${macroName}">
                        <i class="fas fa-terminal"></i> ${macroName} (Tier ${tier.toUpperCase()})
                    </a>`;
                    span.addEventListener("click", async () => {
                        const macro = game.macros.getName(macroName);
                        if (macro) macro.execute();
                        else ui.notifications.warn(`Macro "${macroName}" not found.`);
                    });
                } else {
                    span.innerText = "[No Macro Configured]";
                }
            }
            return span;
        }
    });
});