export declare function withErrorHandling<TArgs extends unknown[]>(action: (...args: TArgs) => Promise<void>): (...args: TArgs) => Promise<void>;
