import { registerPfsSettings } from "./settings.js";
import { registerGlobalListeners } from "./listeners.js";
import { registerEnrichers } from "./enrichers.js";

Hooks.once("init", () => {
    console.log("Wolfie's Foundry Tools | Initializing");

    registerPfsSettings();
    registerGlobalListeners();
    registerEnrichers();
});