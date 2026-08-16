export async function executePartyCheckDialog(config, checkTitle) {
    const party = game.actors?.party;
    if (!party) return ui.notifications.warn("No active party found.");
    const members = party.members;
    if (members.length === 0) return ui.notifications.warn("The active party has no members.");

    const processedMembers = members.map(actor => {
        let validOptionsMap = new Map();

        config.skills.forEach(s => {
            let configuredDC = parseInt(s.dc);

            if (s.name && s.name.toLowerCase() === "lore") {
                let actorGenericLore = actor.skills ? actor.skills.lore : null;
                let genericMod = actorGenericLore ? (actorGenericLore.mod ?? actorGenericLore.check?.mod ?? 0) : 0;

                let genericExisting = validOptionsMap.get("lore");
                if (!genericExisting || configuredDC < genericExisting.dc) {
                    validOptionsMap.set("lore", { slug: "lore", name: "Lore", dc: configuredDC, mod: genericMod });
                }

                if (actor.skills) {
                    for (let [skillSlug, actorSkill] of Object.entries(actor.skills)) {
                        if (actorSkill.lore || skillSlug.startsWith("lore-")) {
                            let existing = validOptionsMap.get(skillSlug);
                            if (!existing || configuredDC < existing.dc) {
                                validOptionsMap.set(skillSlug, {
                                    slug: skillSlug,
                                    name: actorSkill.label || "Lore",
                                    dc: configuredDC,
                                    mod: actorSkill.mod ?? actorSkill.check?.mod ?? 0
                                });
                            }
                        }
                    }
                }
            } else {
                let slug = s.name ? s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : "";
                let existing = validOptionsMap.get(slug);
                if (!existing || configuredDC < existing.dc) {
                    let actorSkill = actor.skills ? actor.skills[slug] : null;
                    validOptionsMap.set(slug, {
                        slug: slug,
                        name: actorSkill ? actorSkill.label : s.name,
                        dc: configuredDC,
                        mod: actorSkill ? (actorSkill.mod ?? actorSkill.check?.mod ?? 0) : 0
                    });
                }
            }
        });

        let autoRoll = Math.floor(Math.random() * 20) + 1;

        return {
            id: actor.id,
            name: actor.name,
            validOptions: Array.from(validOptionsMap.values()),
            autoRoll: autoRoll
        };
    });

    let dialogTitle = config.secret ? "Secret Party Check" : "Party Check";

    const templateData = { members: processedMembers, config: config };
    const renderEngine = foundry.applications?.handlebars?.renderTemplate || renderTemplate;
    const formHtml = await renderEngine("modules/wolfies-foundry-tools/templates/party-check.hbs", templateData);

    const { DialogV2 } = foundry.applications.api;

    class PartyCheckDialog extends DialogV2 {
        _onRender(context, options) {
            super._onRender(context, options);

            const evaluateRow = (e) => {
                const row = e.target.closest('tr');
                const rollInput = row.querySelector('.roll-input');
                const skillSelect = row.querySelector('.skill-select');
                const overrideSelect = row.querySelector('.override-select');
                const modInput = row.querySelector('.mod-input');

                const selectedOption = skillSelect.options[skillSelect.selectedIndex];
                if (!selectedOption || !rollInput.value) return;

                const dc = parseInt(selectedOption.dataset.dc);
                const isSecret = rollInput.classList.contains('d20-input');

                if (e.target === skillSelect && isSecret && modInput) {
                    modInput.value = selectedOption.dataset.mod;
                }

                const val = parseInt(rollInput.value);
                if (isNaN(val)) return;

                let total = val;

                if (isSecret) {
                    if (!modInput || modInput.value === "") return;
                    const mod = parseInt(modInput.value);
                    if (isNaN(mod)) return;
                    total = val + mod;
                }

                let degree = 0;

                if (total >= dc + 10) degree = 3;
                else if (total >= dc) degree = 2;
                else if (total <= dc - 10) degree = 0;
                else degree = 1;

                if (isSecret) {
                    if (val === 20) degree = Math.min(degree + 1, 3);
                    if (val === 1) degree = Math.max(degree - 0, 0) - 1;
                    if (val === 1 && degree < 0) degree = 0;
                }

                const degreeMap = { 0: "Crit Failure", 1: "Failure", 2: "Success", 3: "Crit Success" };
                overrideSelect.value = degreeMap[degree];
            };

            this.element.querySelectorAll('.roll-input').forEach(el => {
                evaluateRow({ target: el });
            });

            this.element.querySelectorAll('.roll-input, .mod-input, .skill-select').forEach(el => {
                el.addEventListener('input', evaluateRow);
            });
        }
    }

    PartyCheckDialog.wait({
        id: "wft-party-check-dialog",
        window: {
            title: dialogTitle,
            icon: config.secret ? "fas fa-eye-slash" : "fas fa-users",
            resizable: false
        },
        position: {
            width: 585,
            height: "auto"
        },
        content: formHtml,
        buttons: [
            {
                action: "submit",
                label: "Send to GM",
                icon: "fas fa-check",
                callback: (event, button, dialog) => {
                    let chatContent = "";

                    processedMembers.forEach(member => {
                        if (member.validOptions.length === 0) return;

                        const row = dialog.element.querySelector(`select[name="${member.id}"]`)?.closest('tr');
                        if (!row) return;

                        const selection = row.querySelector('.override-select').value;
                        if (selection !== "None") {
                            const skillSelect = row.querySelector('.skill-select');
                            const skillName = skillSelect.options[skillSelect.selectedIndex].text.split(" (")[0];

                            let color = selection.includes("Crit Success") ? "green" :
                                selection === "Success" ? "blue" :
                                    selection === "Failure" ? "orange" : "red";

                            chatContent += `<div style="margin-bottom: 4px;"><strong>${member.name} (${skillName}):</strong> <span style="color: ${color}; font-weight: bold;">${selection}</span></div>`;
                        }
                    });

                    if (chatContent === "") {
                        ui.notifications.info("No results were selected.");
                        return;
                    }

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ alias: dialogTitle }),
                        content: chatContent,
                        whisper: ChatMessage.getWhisperRecipients("GM")
                    });
                }
            },
            {
                action: "cancel",
                label: "Cancel",
                icon: "fas fa-times"
            }
        ]
    });
}