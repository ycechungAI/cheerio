/** @module cheerio/cheerio */

import parse from './parse';
import {
  CheerioOptions,
  InternalOptions,
  default as defaultOptions,
  flatten as flattenOptions,
} from './options';
import { isHtml, isCheerio } from './utils';
import type { Node, Document, Element } from 'domhandler';
import * as Static from './static';
import type { load } from './load';
import { SelectorType } from './types';

import * as Attributes from './api/attributes';
import * as Traversing from './api/traversing';
import * as Manipulation from './api/manipulation';
import * as Css from './api/css';
import * as Forms from './api/forms';

type AttributesType = typeof Attributes;
type TraversingType = typeof Traversing;
type ManipulationType = typeof Manipulation;
type CssType = typeof Css;
type FormsType = typeof Forms;

/*
 * The API
 */
const api = [Attributes, Traversing, Manipulation, Css, Forms];

export class Cheerio<T> implements ArrayLike<T> {
  length!: number;
  [index: number]: T;

  options!: InternalOptions;
  _root: Cheerio<Document> | undefined;
  find!: typeof Traversing.find;
  _originalRoot: Document | undefined;

  static _root: Document | undefined;
  static _options: InternalOptions | undefined;
  public static html = Static.html;
  public static xml = Static.xml;
  public static text = Static.text;
  public static parseHTML = Static.parseHTML;
  public static root = Static.root;
  public static contains = Static.contains;
  public static merge = Static.merge;
  public static load: typeof load;

  // Mimic jQuery's prototype alias for plugin authors.
  public static fn = Cheerio.prototype;

  /**
   * Instance of cheerio. Methods are specified in the modules. Usage of this
   * constructor is not recommended. Please use $.load instead.
   *
   * @class
   * @param selector - The new selection.
   * @param context - Context of the selection.
   * @param root - Sets the root node.
   * @param options - Options for the instance.
   */
  constructor(
    selector?: T extends Node
      ? string | Cheerio<T> | T[] | T
      : Cheerio<T> | T[],
    context?: string | Cheerio<Node> | Node[] | Node,
    root?: string | Cheerio<Document> | Document,
    options?: CheerioOptions
  ) {
    if (!(this instanceof Cheerio)) {
      return new Cheerio(selector, context, root, options);
    }

    this.length = 0;

    this.options = {
      ...defaultOptions,
      ...this.options,
      ...flattenOptions(options),
    };

    // $(), $(null), $(undefined), $(false)
    if (!selector) return this;

    if (root) {
      if (typeof root === 'string') root = parse(root, this.options, false);
      this._root = (Cheerio as any).call(this, root);
    }

    // $($)
    if (isCheerio<T>(selector)) return selector;

    const elements =
      typeof selector === 'string' && isHtml(selector)
        ? // $(<html>)
          parse(selector, this.options, false).children
        : isNode(selector)
        ? // $(dom)
          [selector]
        : Array.isArray(selector)
        ? // $([dom])
          selector
        : null;

    if (elements) {
      elements.forEach((elem, idx) => {
        this[idx] = elem;
      });
      this.length = elements.length;
      return this;
    }

    // We know that our selector is a string now.
    let search = selector as string;

    const searchContext: Cheerio<Node> | undefined = !context
      ? // If we don't have a context, maybe we have a root, from loading
        this._root
      : typeof context === 'string'
      ? isHtml(context)
        ? // $('li', '<ul>...</ul>')
          new Cheerio(parse(context, this.options, false))
        : // $('li', 'ul')
          ((search = `${context} ${search}`), this._root)
      : isCheerio(context)
      ? // $('li', $)
        context
      : // $('li', node), $('li', [nodes])
        new Cheerio(context);

    // If we still don't have a context, return
    if (!searchContext) return this;

    /*
     * #id, .class, tag
     */
    // @ts-expect-error No good way to type this — we will always return `Cheerio<Element>` here.
    return searchContext.find(search);
  }

  prevObject: Cheerio<Node> | undefined;
  /**
   * Make a cheerio object.
   *
   * @private
   * @param dom - The contents of the new object.
   * @param context - The context of the new object.
   * @returns The new cheerio object.
   */
  _make<T>(
    dom: string | ArrayLike<T> | T,
    context?: ArrayLike<T> | string | null,
    root: Cheerio<Document> | Document | undefined = this._root
  ): Cheerio<T> {
    const cheerio = new (this.constructor as any)(
      dom,
      context,
      root,
      this.options
    );
    cheerio.prevObject = this;
    return cheerio;
  }

  /**
   * Retrieve all the DOM elements contained in the jQuery set as an array.
   *
   * @example
   *
   * ```js
   * $('li').toArray();
   * //=> [ {...}, {...}, {...} ]
   * ```
   *
   * @returns The contained items.
   */
  toArray(): T[] {
    return this.get();
  }
}

export interface Cheerio<T>
  extends AttributesType,
    TraversingType,
    ManipulationType,
    CssType,
    FormsType {
  cheerio: string;

  splice: typeof Array.prototype.slice;
  [Symbol.iterator](): Iterator<T>;
}

/** Set a signature of the object. */
Cheerio.prototype.cheerio = '[cheerio object]';

/*
 * Make cheerio an array-like object
 */
Cheerio.prototype.splice = Array.prototype.splice;

// Support for (const element of $(...)) iteration:
Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];

// Plug in the API
api.forEach((mod) => Object.assign(Cheerio.prototype, mod));

function isNode(obj: any): obj is Node {
  return (
    !!obj.name ||
    obj.type === 'root' ||
    obj.type === 'text' ||
    obj.type === 'comment'
  );
}

type CheerioClassType = typeof Cheerio;

export interface CheerioAPI extends CheerioClassType {
  <T extends Node, S extends string>(
    selector?: S | ArrayLike<T> | T,
    context?: string | ArrayLike<T> | T | null,
    root?: string | ArrayLike<T> | T,
    options?: CheerioOptions
  ): Cheerio<S extends SelectorType ? Element : T>;
}

// Make it possible to call Cheerio without using `new`.
export default (Cheerio as unknown) as CheerioAPI;
