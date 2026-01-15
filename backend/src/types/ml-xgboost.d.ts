declare module 'ml-xgboost' {
    interface XGBoostOptions {
        booster?: 'gbtree' | 'gblinear' | 'dart';
        objective?: string;
        max_depth?: number;
        eta?: number;
        min_child_weight?: number;
        subsample?: number;
        colsample_bytree?: number;
        silent?: number;
        iterations?: number;
    }

    class XGBoost {
        constructor(options?: XGBoostOptions);
        train(features: number[][], labels: number[]): void;
        predict(features: number[][]): number[];
        toJSON(): object;
        free(): void;
        static load(model: object): XGBoost;
    }

    // Module exports a Promise that resolves to XGBoost class
    const xgboostPromise: Promise<typeof XGBoost>;
    export = xgboostPromise;
}
