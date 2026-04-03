document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".item").forEach((item, index) => {
        item.dataset.originalOrder = index;
    });
    document.querySelectorAll(".selection").forEach(section => {
        updateCounter(section.id);
        updateTotalCounter();
    });
});

function toggleSection(sectionId, button) {
    const section = document.getElementById(sectionId);

    if (section.style.display === "none") {
        section.style.display = "block";
        button.textContent = "▼";
    } else {
        section.style.display = "none";
        button.textContent = "►";
    }
}
function toggleSkip(button) {
    const item = button.parentElement;
    const section = item.parentElement;
    const text = item.querySelector("span");

    text.classList.toggle("skipped");
    text.classList.remove("collected");

    let label = item.querySelector(".skip-label");

    if (text.classList.contains("skipped")) {
        if (!label) {
            label = document.createElement("span");
            label.textContent = " (skipped)";
            label.classList.add("skip-label");
            text.after(label);
        }
    } else {
        if (label) label.remove();
    }

    sortSection(section);
    updateCounter(section.id); 
    updateTotalCounter();
}
function toggleCollected(button) {
    const item = button.parentElement;
    const section = item.parentElement;
    const text = item.querySelector("span");
    const skipButton = item.querySelector(".skip");

    text.classList.toggle("collected");

    if (text.classList.contains("collected")) {
        text.classList.remove("skipped");

        const label = item.querySelector(".skip-label");
        if (label) label.remove();

        skipButton.style.display = "none";
    } else {
        skipButton.style.display = "inline-block";
    }

    sortSection(section);
    updateCounter(section.id); 
    updateTotalCounter();
}

function sortSection(section) {
    const items = Array.from(section.querySelectorAll(".item"));

    items.sort((a, b) => {
        const aText = a.querySelector("span");
        const bText = b.querySelector("span");

        const getPriority = (el) => {
            if (el.classList.contains("collected")) return 0;
            if (el.classList.contains("skipped")) return 1;
            return 2;
        };

        const priorityDiff = getPriority(aText) - getPriority(bText);

        if (priorityDiff === 0) {
            return a.dataset.originalOrder - b.dataset.originalOrder;
        }

        return priorityDiff;
    });

    items.forEach(item => section.appendChild(item));
}
function updateCounter(sectionId) {
    const section = document.getElementById(sectionId);
    const counter = document.getElementById(`counter-${sectionId}`);

    const items = section.querySelectorAll(".item");
    let doneCount = 0;

    items.forEach(item => {
        const text = item.querySelector("span");
        if (text.classList.contains("collected") || text.classList.contains("skipped")) {
            doneCount++;
        }
    });

    counter.textContent = `(${doneCount}/${items.length})`;
}
function updateTotalCounter() {
    const allItems = document.querySelectorAll(".item");
    const total = allItems.length;

    let doneCount = 0;
    allItems.forEach(item => {
        const text = item.querySelector("span");
        if (text.classList.contains("collected") || text.classList.contains("skipped")) {
            doneCount++;
        }
    });

    const totalCounter = document.getElementById("total-counter");
    totalCounter.textContent = `Total: (${doneCount}/${total})`;
}
function downloadTracker() {
    const allSections = document.querySelectorAll(".selection");
    const trackerData = {};

    allSections.forEach(section => {
        const sectionId = section.id;
        trackerData[sectionId] = [];

        section.querySelectorAll(".item").forEach(item => {
            const text = item.querySelector("span");
            const note = item.querySelector(".note").value || "";
            const state = text.classList.contains("collected") ? "collected"
                        : text.classList.contains("skipped") ? "skipped"
                        : "none";

            trackerData[sectionId].push({
                name: text.textContent.replace(/\s*\(skipped\)/, ""),
                state: state,
                note: note
            });
        });
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trackerData, null, 2));

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Kiw1-Tracker-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}
function uploadTracker(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);

        for (const sectionId in data) {
            const section = document.getElementById(sectionId);
            if (!section) continue;

            section.querySelectorAll(".item").forEach((item, index) => {
                const info = data[sectionId][index];
                const text = item.querySelector("span");
                const note = item.querySelector(".note");
                const skipButton = item.querySelector(".skip");

                text.classList.remove("collected", "skipped");
                const label = item.querySelector(".skip-label");
                if (label) label.remove();
                skipButton.style.display = "inline-block";

                if (info.state === "collected") {
                    text.classList.add("collected");
                    skipButton.style.display = "none";
                } else if (info.state === "skipped") {
                    text.classList.add("skipped");
                    const skipLabel = document.createElement("span");
                    skipLabel.textContent = " (skipped)";
                    skipLabel.classList.add("skip-label");
                    text.after(skipLabel);
                }

                note.value = info.note || "";
            });

            sortSection(section);
            updateCounter(sectionId);
        }

        updateTotalCounter();
    };

    reader.readAsText(file);
}
document.querySelectorAll(".tracker-item").forEach(button => {
    button.addEventListener("click", () => {
        button.classList.toggle("collected");
    });
});
function filterTracker() {
    const query = document.getElementById("filter-input").value.toLowerCase();

    document.querySelectorAll(".selection").forEach(section => {
        const sectionHeader = section.previousElementSibling;
        const headerText = sectionHeader.textContent.toLowerCase();

        const sectionMatches = headerText.includes(query);

        let anyItemMatches = false;

        section.querySelectorAll(".item").forEach(item => {
            const text = item.querySelector("span").textContent.toLowerCase();

            if (sectionMatches) {
                item.style.display = "";
            } else if (text.includes(query)) {
                item.style.display = "";
                anyItemMatches = true;
            } else {
                item.style.display = "none";
            }
        });

        if (sectionMatches || anyItemMatches) {
            sectionHeader.style.display = "";
            section.style.display = "";
        } else {
            sectionHeader.style.display = "none";
            section.style.display = "none";
        }
    });
}