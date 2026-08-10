// Accepts the single combined title string
export async function executePartyCheckDialog(checkTitle) {
    const party = game.actors?.party;
    if (!party) return ui.notifications.warn("No active party found.");

    const members = party.members;
    if (members.length === 0) return ui.notifications.warn("The active party has no members.");

    // Inject the combined string directly into the Dialog Title
    let dialogTitle = checkTitle ? `Party Results: ${checkTitle}` : "Party Results";

    const templatePath = "modules/wolfies-foundry-tools/templates/party-check.hbs";
    const templateData = { members: members };

    const renderEngine = foundry.applications?.handlebars?.renderTemplate || renderTemplate;
    const formHtml = await renderEngine(templatePath, templateData);

    const { DialogV2 } = foundry.applications.api;

    DialogV2.wait({
        window: {
            title: dialogTitle,
            icon: "fas fa-users"
        },
        content: formHtml,
        buttons: [
            {
                action: "submit",
                label: "Send to GM",
                icon: "fas fa-check",
                callback: (event, button, dialog) => {
                    let chatContent = "";

                    members.forEach(member => {
                        const selection = dialog.element.querySelector(`select[name="${member.id}"]`)?.value || "None";
                        if (selection !== "None") {
                            let color = selection.includes("Crit Success") ? "green" :
                                selection === "Success" ? "blue" :
                                    selection === "Failure" ? "orange" : "red";
                            chatContent += `<div style="margin-bottom: 4px;"><strong>${member.name}:</strong> <span style="color: ${color}; font-weight: bold;">${selection}</span></div>`;
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