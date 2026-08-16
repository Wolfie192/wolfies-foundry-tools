const { ApplicationV2 } = foundry.applications.api;

export class ResearchPlayerApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "wft-research-player",
        tag: "div",
        window: {
            title: "Research Encounter",
            icon: "fas fa-search-location",
            width: 600,
            resizable: true
        },
        position: { height: "auto" }
    };

    appState = null;

    updateState(newState) {
        this.appState = newState;
        const existing = Object.values(ui.windows).find(w => w.id === "wft-research-player");
        if (existing) {
            existing.render(false);
        } else {
            this.render(true);
        }
    }

    async _renderHTML(context, options) {
        if (!this.appState) return `<div style="padding: 20px; text-align: center; font-style: italic;">Waiting for GM to initialize encounter...</div>`;
        const d = this.appState;

        let roundText = d.maxRounds ? `Round ${d.round} / ${d.maxRounds}` : `Round ${d.round}`;

        let html = `
            <div style="padding: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4a8094; padding-bottom: 10px; margin-bottom: 15px;">
                    <div style="font-size: 18px; font-weight: bold; color: #4a8094;">${d.name}</div>
                    <div style="text-align: right;">
                        <div style="font-size: 14px; font-weight: bold;">${roundText}</div>
                        <div style="font-size: 14px; font-weight: bold; color: #8a1a1b;">Party RP: ${d.totalRP}</div>
                    </div>
                </div>
        `;

        if (d.locations.length > 0) {
            html += `<h3 style="margin-top: 0; border-bottom: 1px solid #777;"><i class="fas fa-map-marker-alt"></i> Known Locations</h3>`;
            for (let loc of d.locations) {
                html += `
                    <div style="border: 1px solid #ccc; border-left: 4px solid #4a8094; background: rgba(74, 128, 148, 0.05); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px;">
                            <strong style="font-size: 14px;">${loc.name}</strong>
                            <span style="font-size: 13px; font-weight: bold; color: #4a8094;">RP: ${loc.currentRP} / ${loc.maxRP || "∞"}</span>
                        </div>
                        ${loc.checksHtml ? `<div style="margin-bottom: 6px;">${loc.checksHtml}</div>` : ''}
                        <div style="font-size: 13px; line-height: 1.4;">${loc.descHtml}</div>
                    </div>
                `;
            }
        } else {
            html += `<div style="font-style: italic; color: #777; margin-bottom: 15px; font-size: 12px;">No locations revealed yet.</div>`;
        }

        if (d.breakpoints.length > 0) {
            html += `<h3 style="margin-top: 15px; border-bottom: 1px solid #777;"><i class="fas fa-chart-line"></i> Breakpoints</h3>`;
            for (let bp of d.breakpoints) {
                let reachStyle = bp.isReached ? 'box-shadow: 0 0 5px rgba(74, 128, 148, 0.5);' : 'opacity: 0.7;';
                html += `
                    <div style="border: 1px solid #ccc; border-left: 4px solid #4a8094; ${reachStyle} background: rgba(74, 128, 148, 0.05); border-radius: 4px; padding: 8px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px;">
                            <strong style="font-size: 14px;">Threshold: ${bp.threshold} RP</strong>
                            ${bp.isReached ? `<span style="font-size: 11px; font-weight: bold; color: #4a945a;"><i class="fas fa-check"></i> Reached</span>` : ''}
                        </div>
                        <div style="font-size: 13px; line-height: 1.4;">${bp.descHtml}</div>
                    </div>
                `;
            }
        }

        html += `</div>`;
        return html;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
    }
}