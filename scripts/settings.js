export function registerPfsSettings() {
    game.settings.register("wolfies-foundry-tools", "scenarioBaseLevel", {
        name: "Scenario Base Level",
        hint: "The lowest level of the scenario's level range (e.g., set to 1 for a Tier 1-4 scenario).",
        scope: "world",
        config: true,
        type: Number,
        default: 1
    });

    game.settings.register("wolfies-foundry-tools", "variables", {
        name: "Global Variables",
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

    game.settings.register("wolfies-foundry-tools", "activeResearchEncounter", {
        scope: "world",
        config: false,
        type: Object,
        default: null
    });
}