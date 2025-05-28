declare module 'zod' {
  export declare const z: any;
  export declare class ZodType<T> {}
  export declare class ZodString extends ZodType<string> {
    _def: any;
  }
  export declare class ZodNumber extends ZodType<number> {
    _def: any;
  }
  export declare class ZodBoolean extends ZodType<boolean> {
    _def: any;
  }
  export declare class ZodArray<T> extends ZodType<T[]> {
    _def: any;
  }
  export declare class ZodObject<T> extends ZodType<T> {
    _def: any;
  }
  export declare class ZodEnum<T> extends ZodType<T> {
    _def: any;
  }
  export declare class ZodOptional<T> extends ZodType<T | undefined> {
    _def: any;
  }
  export declare class ZodNullable<T> extends ZodType<T | null> {
    _def: any;
  }
  export declare class ZodError {
    errors: { path: string[]; message: string }[];
  }
  export declare type ZodTypeAny = ZodType<any>;
}