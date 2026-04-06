function getItemId(item) {
    return item.dataset.id || item.querySelector("span").textContent.trim();
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".item").forEach((item, index) => {
        item.dataset.originalOrder = index;
    });

    document.querySelectorAll(".selection").forEach(section => {
        updateCounter(section.id);
    });

    updateTotalCounter();
});

function toggleSection(sectionId, button) {
    const section = document.getElementById(sectionId);
    const header = button.parentElement;

    if (section.style.display === "none") {
        section.style.display = "block";
        button.textContent = "▼";
        header.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        section.style.display = "none";
        button.textContent = "►";
    }
}

function toggleCollected(button) {
    const item = button.parentElement;

    const items = item.dataset.id
        ? document.querySelectorAll(`.item[data-id="${item.dataset.id}"]`)
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

function toggleSkip(button) {
    const item = button.parentElement;

    const items = item.dataset.id
        ? document.querySelectorAll(`.item[data-id="${item.dataset.id}"]`)
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

        if (!text.classList.contains("collected") && skipButton) {
            skipButton.style.display = "inline-block";
        }
    });

    items.forEach(it => sortSection(it.closest(".selection")));
    updateAllCounters();
}

function updateSharedNote(input) {
    const item = input.closest(".item");

    if (!item.dataset.id) return;

    const items = document.querySelectorAll(`.item[data-id="${item.dataset.id}"]`);

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

        const getPriority = el => {
            if (el.classList.contains("skipped")) return 2;   // bottom
            if (el.classList.contains("collected")) return 1; // middle
            return 0; // unchanged = top
        };

        const diff = getPriority(aText) - getPriority(bText);

        if (diff === 0) {
            return a.dataset.originalOrder - b.dataset.originalOrder;
        }

        return diff;
    });

    items.forEach(item => section.appendChild(item));
}

function updateCounter(sectionId) {
    const section = document.getElementById(sectionId);
    const counter = document.getElementById(`counter-${sectionId}`);

    const seen = new Set();
    let done = 0;

    section.querySelectorAll(".item").forEach(item => {
        const id = getItemId(item);
        if (seen.has(id)) return;

        seen.add(id);

        const text = item.querySelector("span");
        if (text.classList.contains("collected") || text.classList.contains("skipped")) {
            done++;
        }
    });

    counter.textContent = `(${done}/${seen.size})`;
}

function updateTotalCounter() {
    const seen = new Set();
    let done = 0;

    document.querySelectorAll(".item").forEach(item => {
        const id = getItemId(item);
        if (seen.has(id)) return;

        seen.add(id);

        const text = item.querySelector("span");
        if (text.classList.contains("collected") || text.classList.contains("skipped")) {
            done++;
        }
    });

    document.getElementById("total-counter").textContent = `Total: (${done}/${seen.size})`;
}

function updateAllCounters() {
    document.querySelectorAll(".selection").forEach(section => {
        updateCounter(section.id);
    });
    updateTotalCounter();
}

function downloadTracker() {
    const data = {};

    document.querySelectorAll(".item").forEach(item => {
        const id = getItemId(item);
        const text = item.querySelector("span");
        const note = item.querySelector(".note").value || "";

        const state =
            text.classList.contains("collected") ? "collected" :
            text.classList.contains("skipped") ? "skipped" : "none";

        data[id] = { state, note };
    });

    const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const date = new Date().toISOString().split("T")[0];

    const a = document.createElement("a");
    a.href = str;
    a.download = `Kiw1-Tracker-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function uploadTracker(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        const data = JSON.parse(e.target.result);

        document.querySelectorAll(".item").forEach(item => {
            const id = getItemId(item);
            const info = data[id];
            if (!info) return;

            const text = item.querySelector("span");
            const note = item.querySelector(".note");
            const skipButton = item.querySelector(".skip");

            text.classList.remove("collected", "skipped");

            const label = item.querySelector(".skip-label");
            if (label) label.remove();

            if (skipButton) skipButton.style.display = "inline-block";

            if (info.state === "collected") {
                text.classList.add("collected");
                if (skipButton) skipButton.style.display = "none";
            } else if (info.state === "skipped") {
                text.classList.add("skipped");

                const skipLabel = document.createElement("span");
                skipLabel.textContent = " (skipped)";
                skipLabel.classList.add("skip-label");
                text.after(skipLabel);
            }

            note.value = info.note || "";
        });

        document.querySelectorAll(".selection").forEach(sortSection);
        updateAllCounters();
    };

    reader.readAsText(file);
}

function filterTracker() {
    const query = document.getElementById("filter-input").value.toLowerCase();

    document.querySelectorAll(".selection").forEach(section => {
        const header = section.previousElementSibling;
        const headerMatch = header.textContent.toLowerCase().includes(query);

        let anyMatch = false;

        section.querySelectorAll(".item").forEach(item => {
            const text = item.querySelector("span").textContent.toLowerCase();

            if (headerMatch || text.includes(query)) {
                item.style.display = "";
                if (!headerMatch && text.includes(query)) anyMatch = true;
            } else {
                item.style.display = "none";
            }
        });

        if (headerMatch || anyMatch) {
            section.style.display = "";
            header.style.display = "";
        } else {
            section.style.display = "none";
            header.style.display = "none";
        }
    });
}