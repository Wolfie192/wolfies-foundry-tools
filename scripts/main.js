import { getPartyPFSStats } from "./math.js";
import { executePartyCheckDialog } from "./dialogs.js";
import { registerPfsSettings } from "./settings.js";

Hooks.once("init", () => {
    console.log("Wolfie's Foundry Tools | Initializing");

    registerPfsSettings();

    // ========================================================================
    // GLOBAL EVENT DELEGATION
    // ========================================================================
    document.addEventListener("click", (ev) => {
        const dcBtn = ev.target.closest(".wft-dc-btn");
        if (dcBtn) {
            ev.preventDefault();
            ev.stopPropagation();

            // We now grab the pre-combined title directly from the HTML
            const title = dcBtn.dataset.title;
            executePartyCheckDialog(title);
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
        }
    });

    // ========================================================================
    // TEXT ENRICHER
    // ========================================================================
    CONFIG.TextEditor.enrichers.push({
        pattern: /@WFT\[(.*?)\]/g,
        enricher: async (match, options) => {
            const tagData = match[1];

            const params = {};
            tagData.split("|").forEach(part => {
                const [key, value] = part.split(":");
                if (key && value) params[key.trim()] = value.trim();
            });

            const globalBaseLevel = game.settings.get("wolfies-foundry-tools", "scenarioBaseLevel");
            const baseLevel = parseInt(params.baseLevel) || globalBaseLevel;

            const { cp, tier, bracket, playerCount } = getPartyPFSStats(baseLevel);

            const span = document.createElement("span");
            span.classList.add("pfs-dynamic-value");

            if (params.type === "dc") {
                let displayParts = [];

                // Determine if this is a single legacy tag or a new multi-tag
                let isMulti = "low_0" in params || "high_0" in params || "skill_0" in params;

                if (!isMulti) {
                    let finalDC = params[bracket] || params[tier] || params.low || "??";
                    let skillText = params.skill ? `${params.skill} ` : "";
                    displayParts.push(`${skillText}(DC ${finalDC})`.trim());
                } else {
                    let i = 0;
                    // Loop continuously until we stop finding numbered skills/dcs
                    while (params[`low_${i}`] || params[`high_${i}`] || params[`skill_${i}`]) {
                        let finalDC = params[`${bracket}_${i}`] || params[`${tier}_${i}`] || params[`low_${i}`] || "??";
                        let skillText = params[`skill_${i}`] ? `${params[`skill_${i}`]} ` : "";
                        displayParts.push(`${skillText}(DC ${finalDC})`.trim());
                        i++;
                    }
                }

                // Join the multiple pieces together with " or "
                let combinedText = displayParts.join(" or ");

                span.innerHTML = `<a class="content-link wft-dc-btn" data-title="${combinedText}"><i class="fas fa-dice-d20"></i> ${combinedText}</a>`;
                span.title = `Tier: ${tier.toUpperCase()} | CP: ${cp} (${playerCount} players) | Base Level: ${baseLevel}`;
            }
            else if (params.type === "macro") {
                let macroName = params[bracket] || params[tier] || params.low;
                if (macroName) {
                    span.innerHTML = `<a class="content-link wft-macro-btn" draggable="true" data-macro="${macroName}">
                        <i class="fas fa-terminal"></i> ${macroName} (Tier ${tier.toUpperCase()})
                    </a>`;
                } else {
                    span.innerText = "[No Macro Configured]";
                }
            }

            return span;
        }
    });
});