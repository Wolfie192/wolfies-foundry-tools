export async function executePartyCheckDialog(dc, skill) {
    const party = game.actors?.party;
    if (!party) return ui.notifications.warn("No active party found.");

    const members = party.members;
    if (members.length === 0) return ui.notifications.warn("The active party has no members.");

    let dialogTitle = dc !== "??" ? `Party Results: ${skill || ""} (DC ${dc})` : "Party Results";

    // Load the external HTML template and inject the party members
    const templatePath = "modules/wolfies-foundry-tools/templates/party-check.hbs";
    const templateData = { members: members };
    const formHtml = await renderTemplate(templatePath, templateData);

    new Dialog({
        title: dialogTitle,
        content: formHtml,
        buttons: {
            submit: {
                icon: "<i class='fas fa-check'></i>",
                label: "Send to GM",
                callback: (html) => {
                    let chatContent = "";
                    const htmlNode = html[0] || html;

                    members.forEach(member => {
                        const selection = htmlNode.querySelector(`select[name="${member.id}"]`)?.value || "None";
                        if (selection !== "None") {
                            let color = selection.includes("Crit Success") ? "green" :
                                selection === "Success" ? "blue" :
                                    selection === "Failure" ? "orange" : "red";
                            chatContent += `<div style="margin-bottom: 4px;"><strong>${member.name}:</strong> <span style="color: ${color}; font-weight: bold;">${selection}</span></div>`;
                        }
                    });

                    if (chatContent === "") return ui.notifications.info("No results were selected.");

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ alias: dialogTitle }),
                        content: chatContent,
                        whisper: ChatMessage.getWhisperRecipients("GM")
                    });
                }
            },
            cancel: { icon: "<i class='fas fa-times'></i>", label: "Cancel" }
        },
        default: "submit"
    }).render(true);
}