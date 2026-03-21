// Custom type declarations for sql.js to avoid ES2023 Uint8Array<ArrayBuffer> generic issues
declare module 'sql.js' {
  export interface ParamsObject {
    [key: string]: number | string | null | Uint8Array;
  }

  export type BindingParams = ParamsObject | (number | string | null | Uint8Array)[];

  export interface QueryExecResult {
    columns: string[];
    values: (number | string | null | Uint8Array)[][];
  }

  export interface Statement {
    bind(params?: BindingParams): boolean;
    step(): boolean;
    getAsObject(params?: BindingParams): Record<string, number | string | null | Uint8Array>;
    get(params?: BindingParams): (number | string | null | Uint8Array)[];
    getColumnNames(): string[];
    reset(): void;
    free(): boolean;
    run(params?: BindingParams): void;
  }

  export interface Database {
    run(sql: string, params?: BindingParams): Database;
    exec(sql: string, params?: BindingParams): QueryExecResult[];
    prepare(sql: string, params?: BindingParams): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
    create_function(name: string, func: (...args: unknown[]) => unknown): void;
  }

  export interface SqlJsStatic {
    Database: {
      new(): Database;
      new(data: ArrayLike<number>): Database;
    };
  }

  export interface SqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export default initSqlJs;
}
