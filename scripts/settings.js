export function registerPfsSettings() {
    game.settings.registerMenu("wolfies-foundry-tools", "cheatSheetMenu", {
        name: "PFS Tags Cheat Sheet",
        label: "View Tag Examples",
        hint: "Click here to view and copy the formatting templates for your journal entries.",
        icon: "fas fa-book",
        type: class extends FormApplication {
            render() {
                const renderEngine = foundry.applications?.handlebars?.renderTemplate || renderTemplate;
                const { DialogV2 } = foundry.applications.api;

                renderEngine("modules/wolfies-foundry-tools/templates/cheat-sheet.hbs", {}).then(html => {
                    DialogV2.wait({
                        window: {
                            title: "PFS Tags Cheat Sheet",
                            icon: "fas fa-book"
                        },
                        content: html,
                        buttons: [{
                            action: "close",
                            label: "Close",
                            icon: "fas fa-times"
                        }]
                    });
                });
            }
        },
        restricted: true
    });

    game.settings.register("wolfies-foundry-tools", "scenarioBaseLevel", {
        name: "Scenario Base Level",
        hint: "The lowest level of the scenario's level range (e.g., set to 1 for a Tier 1-4 scenario).",
        scope: "world",
        config: true,
        type: Number,
        default: 1
    });
}