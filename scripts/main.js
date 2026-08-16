import { registerPfsSettings } from "./settings.js";
import { registerGlobalListeners } from "./listeners.js";
import { registerEnrichers } from "./enrichers.js";
import { registerVariables } from "./variables.js";

Hooks.once("init", () => {
    console.log("Wolfie's Foundry Tools | Initializing");

    registerPfsSettings();
    registerGlobalListeners();
    registerEnrichers();
    registerVariables();
});