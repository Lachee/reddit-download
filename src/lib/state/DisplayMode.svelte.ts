export type Mode = "gallery" | "list";

type DisplayState = {
    mode: Mode;
    ready: boolean;
};

export const display = $state<DisplayState>({
    mode: "gallery",
    ready: false,
});

function isMode(value: string | null): value is Mode {
    return value === "gallery" || value === "list";
}

export function initDisplayMode() {
    if (typeof localStorage === "undefined") return;

    const stored = localStorage.getItem("display");

    display.mode = isMode(stored) ? stored : "gallery";
    display.ready = true;
}

export function setDisplayMode(mode: Mode) {
    display.mode = mode;

    if (typeof localStorage !== "undefined") {
        localStorage.setItem("display", mode);
    }
}

export function toggleDisplayMode() {
    setDisplayMode(display.mode === "gallery" ? "list" : "gallery");
}