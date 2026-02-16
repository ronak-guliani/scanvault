export function shouldUseJson(flag) {
    return Boolean(flag) || !process.stdout.isTTY;
}
function toQuietValue(data) {
    if (typeof data === "string") {
        return data;
    }
    if (Array.isArray(data)) {
        return data
            .map((item) => {
            if (typeof item === "object" && item && "id" in item) {
                return String(item.id);
            }
            return JSON.stringify(item);
        })
            .join("\n");
    }
    if (typeof data === "object" && data && "id" in data) {
        return String(data.id);
    }
    return JSON.stringify(data);
}
export function printOutput(data, options = {}) {
    if (options.quiet) {
        process.stdout.write(`${toQuietValue(data)}\n`);
        return;
    }
    if (shouldUseJson(options.json)) {
        process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
        return;
    }
    if (Array.isArray(data)) {
        console.table(data);
        return;
    }
    if (typeof data === "string") {
        process.stdout.write(`${data}\n`);
        return;
    }
    console.dir(data, { depth: null, colors: true });
}
//# sourceMappingURL=output.js.map