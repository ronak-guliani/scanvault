export interface OutputOptions {
    json?: boolean;
    quiet?: boolean;
}
export declare function shouldUseJson(flag?: boolean): boolean;
export declare function printOutput(data: unknown, options?: OutputOptions): void;
