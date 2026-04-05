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
    const header = button.parentElement;
    if (section.style.display === "none") {
        section.style.display = "block";
        button.textContent = "▼";
        header.scrollIntoView({behavior: "smooth", block: "start"});
    } else {
        section.style.display = "none";
        button.textContent = "►";
    }
}

function toggleSkip(button) {
    const item = button.parentElement;
    const sharedId = item.dataset.id || Symbol();
    const items = item.dataset.id
        ? document.querySelectorAll(`.item[data-id="${sharedId}"]`)
        : [item];

    items.forEach(it => {
        const text = it.querySelector("span");
        const skipButton = it.querySelector(".skip");
        text.classList.toggle("skipped");
        text.classList.remove("collected");

        let label = it.querySelector(".skip-label");
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

        if (!text.classList.contains("collected") && skipButton) skipButton.style.display = "inline-block";
    });

    items.forEach(it => sortSection(it.closest(".selection")));
    updateAllCounters();
}

function toggleCollected(button) {
    const item = button.parentElement;
    const sharedId = item.dataset.id || Symbol(); // fallback unique id if no data-id
    const items = item.dataset.id 
        ? document.querySelectorAll(`.item[data-id="${sharedId}"]`)
        : [item];

    items.forEach(it => {
        const text = it.querySelector("span");
        const skipButton = it.querySelector(".skip");
        text.classList.toggle("collected");

        if (text.classList.contains("collected")) {
            text.classList.remove("skipped");
            const label = it.querySelector(".skip-label");
            if (label) label.remove();
            if (skipButton) skipButton.style.display = "none";
        } else {
            if (skipButton) skipButton.style.display = "inline-block";
        }
    });

    items.forEach(it => sortSection(it.closest(".selection")));
    updateAllCounters();
}

function updateSharedNote(input) {
    const item = input.closest(".item");
    const sharedId = item.dataset.id;
    const items = document.querySelectorAll(`.item[data-id="${sharedId}"]`);
    items.forEach(it => {
        const noteInput = it.querySelector(".note");
        if (noteInput !== input) noteInput.value = input.value;
    });
}

function sortSection(section) {
    const items = Array.from(section.querySelectorAll(".item"));
    items.sort((a, b) => {
        const aText = a.querySelector("span");
        const bText = b.querySelector("span");
        const getPriority = el => el.classList.contains("collected") ? 0 : el.classList.contains("skipped") ? 1 : 2;
        const priorityDiff = getPriority(aText) - getPriority(bText);
        return priorityDiff === 0 ? a.dataset.originalOrder - b.dataset.originalOrder : priorityDiff;
    });
    items.forEach(item => section.appendChild(item));
}

function updateCounter(sectionId) {
    const section = document.getElementById(sectionId);
    const counter = document.getElementById(`counter-${sectionId}`);
    const seen = new Set();
    let doneCount = 0;
    section.querySelectorAll(".item").forEach(item => {
        const id = item.dataset.id || Symbol();
        if (seen.has(id)) return;
        seen.add(id);
        const text = item.querySelector("span");
        if (text.classList.contains("collected") || text.classList.contains("skipped")) doneCount++;
    });
    counter.textContent = `(${doneCount}/${seen.size})`;
}

function updateTotalCounter() {
    const allItems = document.querySelectorAll(".item");
    const seen = new Set();
    let doneCount = 0;
    allItems.forEach(item => {
        const id = item.dataset.id || Symbol();
        if (seen.has(id)) return;
        seen.add(id);
        const text = item.querySelector("span");
        if (text.classList.contains("collected") || text.classList.contains("skipped")) doneCount++;
    });
    const totalCounter = document.getElementById("total-counter");
    totalCounter.textContent = `Total: (${doneCount}/${seen.size})`;
}

function updateAllCounters() {
    document.querySelectorAll(".selection").forEach(section => updateCounter(section.id));
    updateTotalCounter();
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
            const state = text.classList.contains("collected") ? "collected" : text.classList.contains("skipped") ? "skipped" : "none";
            trackerData[sectionId].push({
                name: text.textContent.replace(/\s*\(skipped\)/, ""),
                state: state,
                note: note,
                id: item.dataset.id || null
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
    reader.onload = e => {
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
                if (info.id) item.dataset.id = info.id;
            });
            sortSection(section);
            updateCounter(sectionId);
        }
        updateTotalCounter();
    };
    reader.readAsText(file);
}

document.querySelectorAll(".tracker-item").forEach(button => {
    button.addEventListener("click", () => button.classList.toggle("collected"));
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