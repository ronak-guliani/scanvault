export function withErrorHandling(action) {
    return async (...args) => {
        try {
            await action(...args);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            process.exitCode = 1;
        }
    };
}
//# sourceMappingURL=command.js.map