export function registerPfsSettings() {
    // Register the Cheat Sheet Button
    game.settings.registerMenu("wolfies-foundry-tools", "cheatSheetMenu", {
        name: "WFT Tags Cheat Sheet",
        label: "View Tag Examples",
        hint: "Click here to view and copy the formatting templates for your journal entries.",
        icon: "fas fa-book",
        type: class extends FormApplication {
            render() {
                // Fetch the external cheat sheet HTML
                renderTemplate("modules/wolfies-foundry-tools/templates/cheat-sheet.hbs", {}).then(html => {
                    new Dialog({
                        title: "PFS Tags Cheat Sheet",
                        content: html,
                        buttons: { close: { icon: '<i class="fas fa-times"></i>', label: "Close" } },
                        default: "close"
                    }, { width: 450 }).render(true);
                });
            }
        },
        restricted: true
    });

    // Register the Global Base Level
    game.settings.register("wolfies-foundry-tools", "scenarioBaseLevel", {
        name: "Scenario Base Level",
        hint: "The lowest level of the scenario's level range (e.g., set to 1 for a Tier 1-4 scenario).",
        scope: "world",
        config: true,
        type: Number,
        default: 1
    });
}