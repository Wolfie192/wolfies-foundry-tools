export async function executePartyCheckDialog(config, checkTitle) {
    const party = game.actors?.party;
    if (!party) return ui.notifications.warn("No active party found.");
    const members = party.members;
    if (members.length === 0) return ui.notifications.warn("The active party has no members.");

    // Map string proficiencies to PF2e Rank numbers
    const profMap = { "untrained": 0, "trained": 1, "expert": 2, "master": 3, "legendary": 4 };

    const processedMembers = members.map(actor => {
        let validOptions = [];

        config.skills.forEach(s => {
            let slug = s.name ? s.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : "";
            // Find the skill on the actor (works for both standard skills and lore)
            let actorSkill = actor.skills ? actor.skills[slug] : null;

            if (actorSkill) {
                let requiredRank = profMap[(s.prof || "untrained").toLowerCase()] || 0;
                if (actorSkill.rank >= requiredRank) {
                    validOptions.push({
                        slug: slug,
                        name: s.name,
                        mod: actorSkill.mod ?? actorSkill.check?.mod ?? 0,
                        dc: parseInt(s.dc)
                    });
                }
            }
        });

        return { id: actor.id, name: actor.name, validOptions: validOptions };
    });

    let dialogTitle = checkTitle ? `${config.secret ? 'Secret ' : ''}Check: ${checkTitle}` : "Party Results";

    const templateData = { members: processedMembers, config: config };
    const renderEngine = foundry.applications?.handlebars?.renderTemplate || renderTemplate;
    const formHtml = await renderEngine("modules/wolfies-foundry-tools/templates/party-check.hbs", templateData);

    const { DialogV2 } = foundry.applications.api;

    // We create a tiny custom class to securely attach our math listeners
    class PartyCheckDialog extends DialogV2 {
        _onRender(context, options) {
            super._onRender(context, options);

            const evaluateRow = (e) => {
                const row = e.target.closest('tr');
                const rollInput = row.querySelector('.roll-input');
                const skillSelect = row.querySelector('.skill-select');
                const overrideSelect = row.querySelector('.override-select');

                const selectedOption = skillSelect.options[skillSelect.selectedIndex];
                if (!selectedOption || !rollInput.value) return;

                const dc = parseInt(selectedOption.dataset.dc);
                const mod = parseInt(selectedOption.dataset.mod);
                const isSecret = rollInput.classList.contains('d20-input');
                const val = parseInt(rollInput.value);

                if (isNaN(val)) return;

                let total = isSecret ? val + mod : val;
                let degree = 0; // 0: CF, 1: F, 2: S, 3: CS

                // Standard success margins
                if (total >= dc + 10) degree = 3;
                else if (total >= dc) degree = 2;
                else if (total <= dc - 10) degree = 0;
                else degree = 1;

                // Adjust for Natural 1 and Natural 20
                if (isSecret) {
                    if (val === 20) degree = Math.min(degree + 1, 3);
                    if (val === 1) degree = Math.max(degree - 0, 0) - 1;
                    if (val === 1 && degree < 0) degree = 0;
                }

                const degreeMap = { 0: "Crit Failure", 1: "Failure", 2: "Success", 3: "Crit Success" };
                overrideSelect.value = degreeMap[degree];
            };

            // Attach the math listeners directly to the rendered HTML elements
            this.element.querySelectorAll('.roll-input, .skill-select').forEach(el => {
                el.addEventListener('input', evaluateRow);
            });
        }
    }

    // Launch the window, strictly passing ONE combined configuration object
    PartyCheckDialog.wait({
        id: "wft-party-check-dialog",
        window: {
            title: dialogTitle,
            icon: config.secret ? "fas fa-eye-slash" : "fas fa-users",
            resizable: false
        },
        position: {
            width: 525,
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
                            const skillName = skillSelect.options[skillSelect.selectedIndex].text.split(" ")[0];

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