/** @module cheerio/options */

import type { DomHandlerOptions } from 'domhandler';
import type { ParserOptions } from 'htmlparser2';

export interface InternalOptions extends DomHandlerOptions, ParserOptions {
  _useHtmlParser2?: boolean;
  /** Disable scripting in parse5, so noscript tags would be parsed. */
  scriptingEnabled?: boolean;
  /** Enable location support for parse5. */
  sourceCodeLocationInfo?: boolean;
}

export interface CheerioOptions extends InternalOptions {
  xml?: (ParserOptions & DomHandlerOptions) | boolean;
}

const defaultOpts: CheerioOptions = {
  xml: false,
  decodeEntities: true,
};

/** Cheerio default options. */
export default defaultOpts;

const xmlModeDefault: InternalOptions = {
  _useHtmlParser2: true,
  xmlMode: true,
};

export function flatten(
  options?: CheerioOptions | null
): InternalOptions | undefined {
  return options?.xml
    ? typeof options.xml === 'boolean'
      ? xmlModeDefault
      : { ...xmlModeDefault, ...options.xml }
    : options ?? undefined;
}
