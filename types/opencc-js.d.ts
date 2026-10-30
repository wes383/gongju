/**
 * opencc-js ships its typings under types/ but does not point package.json at
 * them, so declare the slice of the API this project uses.
 */
declare module "opencc-js" {
  export type LocaleCode = "cn" | "tw" | "twp" | "hk" | "jp";

  export interface ConverterOptions {
    from: LocaleCode;
    to: LocaleCode;
  }

  export type ConverterFunction = (text: string) => string;

  export function Converter(options: ConverterOptions): ConverterFunction;
}
