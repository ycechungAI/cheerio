/** @module cheerio/types */

type LowercaseLetters =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';

type AlphaNumeric =
  | LowercaseLetters
  | Uppercase<LowercaseLetters>
  | `${number}`;

type SelectorSpecial = '.' | '#' | ':' | '|' | '>' | '+' | '~' | '[';
/**
 * Type for identifying selectors. Allows us to "upgrade" queries using
 * selectors to return `Element`s.
 */
export type SelectorType =
  | `${SelectorSpecial}${AlphaNumeric}${string}`
  | `${AlphaNumeric}${string}`;

import type { Cheerio } from './cheerio';
import type { Node } from 'domhandler';

export type BasicAcceptedElems<T extends Node> = Cheerio<T> | T[] | T | string;
export type AcceptedElems<T extends Node> =
  | BasicAcceptedElems<T>
  | ((this: T, i: number, el: T) => BasicAcceptedElems<T>);
