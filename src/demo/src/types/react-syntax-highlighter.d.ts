declare module 'react-syntax-highlighter' {
  import { ComponentType, ReactNode } from 'react';

  export interface SyntaxHighlighterProps {
    language?: string;
    style?: object;
    children?: string | ReactNode;
    className?: string;
    customStyle?: object;
    codeTagProps?: object;
    useInlineStyles?: boolean;
    showLineNumbers?: boolean;
    startingLineNumber?: number;
    lineNumberStyle?: object;
    wrapLines?: boolean;
    wrapLongLines?: boolean;
    lineProps?: object | ((lineNumber: number) => object);
    renderer?: (props: object) => ReactNode;
    PreTag?: ComponentType<any> | string;
    CodeTag?: ComponentType<any> | string;
    [key: string]: any;
  }

  declare const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/cjs/index' {
  export * from 'react-syntax-highlighter';
  export { default } from 'react-syntax-highlighter';
}