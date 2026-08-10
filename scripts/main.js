import { getPartyPFSStats } from "./math.js";
import { executePartyCheckDialog } from "./dialogs.js";
import { registerPfsSettings } from "./settings.js";

Hooks.once("init", () => {
    console.log("Wolfie's Foundry Tools | Initializing");
    registerPfsSettings();

    document.addEventListener("click", (ev) => {
        const dcBtn = ev.target.closest(".wft-dc-btn");
        if (dcBtn) {
            ev.preventDefault();
            ev.stopPropagation();

            // Extract the encoded config object
            const config = JSON.parse(decodeURIComponent(dcBtn.dataset.config));
            const title = dcBtn.dataset.title;
            executePartyCheckDialog(config, title);
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

    CONFIG.TextEditor.enrichers.push({
        pattern: /@WFT\[(.*?)\]/g,
        enricher: async (match, options) => {
            const params = {};
            match[1].split("|").forEach(part => {
                const [key, value] = part.split(":");
                if (key && value) params[key.trim()] = value.trim();
            });

            const baseLevel = parseInt(params.baseLevel) || game.settings.get("wolfies-foundry-tools", "scenarioBaseLevel");
            const { cp, tier, bracket, playerCount } = getPartyPFSStats(baseLevel);
            const span = document.createElement("span");
            span.classList.add("pfs-dynamic-value");

            if (params.type === "dc") {
                let displayParts = [];
                let isMulti = "low_0" in params || "high_0" in params || "skill_0" in params;

                // Build the configuration object
                let checkConfig = {
                    secret: params.secret === "true",
                    skills: []
                };

                if (!isMulti) {
                    let finalDC = params[bracket] || params[tier] || params.low || "??";
                    checkConfig.skills.push({ name: params.skill, dc: finalDC, prof: params.prof || "untrained" });
                    let skillText = params.skill ? `${params.skill} ` : "";
                    displayParts.push(`${skillText}(DC ${finalDC})`.trim());
                } else {
                    let i = 0;
                    while (params[`low_${i}`] || params[`high_${i}`] || params[`skill_${i}`]) {
                        let finalDC = params[`${bracket}_${i}`] || params[`${tier}_${i}`] || params[`low_${i}`] || "??";
                        checkConfig.skills.push({ name: params[`skill_${i}`], dc: finalDC, prof: params[`prof_${i}`] || "untrained" });
                        let skillText = params[`skill_${i}`] ? `${params[`skill_${i}`]} ` : "";
                        displayParts.push(`${skillText}(DC ${finalDC})`.trim());
                        i++;
                    }
                }

                let combinedText = displayParts.join(" or ");
                let encodedConfig = encodeURIComponent(JSON.stringify(checkConfig));

                span.innerHTML = `<a class="content-link wft-dc-btn" data-title="${combinedText}" data-config="${encodedConfig}">
                    <i class="fas ${checkConfig.secret ? 'fa-eye-slash' : 'fa-dice-d20'}"></i> ${combinedText}
                </a>`;
                span.title = `Tier: ${tier.toUpperCase()} | CP: ${cp} (${playerCount} players) | Base Level: ${baseLevel}`;
            }
            else if (params.type === "macro") {
                let macroName = params[bracket] || params[tier] || params.low;
                if (macroName) span.innerHTML = `<a class="content-link wft-macro-btn" draggable="true" data-macro="${macroName}"><i class="fas fa-terminal"></i> ${macroName} (Tier ${tier.toUpperCase()})</a>`;
                else span.innerText = "[No Macro Configured]";
            }
            return span;
        }
    });
});