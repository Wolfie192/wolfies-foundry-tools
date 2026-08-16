export function getPartyPFSStats(baseLevel) {
    const party = game.actors?.party;
    if (!party) return { cp: 8, tier: "low", bracket: "low_0_9", playerCount: 4 };

    let totalCP = 0;
    const members = party.members;
    const playerCount = members.length;

    members.forEach(actor => {
        const level = actor.system.details.level.value;
        const levelDiff = level - baseLevel;

        if (levelDiff <= 0) totalCP += 2;
        else if (levelDiff === 1) totalCP += 3;
        else if (levelDiff === 2) totalCP += 4;
        else totalCP += 6;
    });

    let tier = "low";
    if (totalCP >= 19) {
        tier = "high";
    } else if (totalCP >= 16 && totalCP <= 18) {
        tier = (playerCount >= 5) ? "low" : "high";
    }

    let bracket = "";
    if (tier === "low") {
        if (totalCP <= 9) bracket = "low_0_9";
        else if (totalCP <= 11) bracket = "low_10_11";
        else if (totalCP <= 13) bracket = "low_12_13";
        else if (totalCP <= 15) bracket = "low_14_15";
        else bracket = "low_16_18";
    } else {
        if (totalCP <= 18) bracket = "high_0_18";
        else if (totalCP <= 22) bracket = "high_19_22";
        else if (totalCP <= 27) bracket = "high_23_27";
        else if (totalCP <= 32) bracket = "high_28_32";
        else bracket = "high_33_36";
    }

    return { cp: totalCP, tier: tier, bracket: bracket, playerCount: playerCount };
}