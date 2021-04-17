/**
 * Methods for getting and modifying attributes.
 *
 * @module cheerio/attributes
 */

import { text } from '../static';
import { isTag, domEach, camelCase, cssCase } from '../utils';
import type { Node, Element } from 'domhandler';
import type { Cheerio } from '../cheerio';
const hasOwn = Object.prototype.hasOwnProperty;
const rspace = /\s+/;
const dataAttrPrefix = 'data-';
/*
 * Lookup table for coercing string data-* attributes to their corresponding
 * JavaScript primitives
 */
const primitives: Record<string, unknown> = {
  null: null,
  true: true,
  false: false,
};
// Attributes that are booleans
const rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
// Matches strings that look like JSON objects or arrays
const rbrace = /^(?:{[\w\W]*}|\[[\w\W]*])$/;

/**
 * Gets a node's attribute. For boolean attributes, it will return the value's
 * name should it be set.
 *
 * Also supports getting the `value` of several form elements.
 *
 * @private
 * @param elem - Elenent to get the attribute of.
 * @param name - Name of the attribute.
 * @returns The attribute's value.
 */
function getAttr(elem: Node, name: undefined): Record<string, string>;
function getAttr(elem: Node, name: string): string | undefined;
function getAttr(
  elem: Node,
  name: string | undefined
): Record<string, string> | string | undefined {
  if (!elem || !isTag(elem)) return undefined;

  elem.attribs ??= {};

  // Return the entire attribs object if no attribute specified
  if (!name) {
    return elem.attribs;
  }

  if (hasOwn.call(elem.attribs, name)) {
    // Get the (decoded) attribute
    return rboolean.test(name) ? name : elem.attribs[name];
  }

  // Mimic the DOM and return text content as value for `option's`
  if (elem.name === 'option' && name === 'value') {
    return text(elem.children);
  }

  // Mimic DOM with default value for radios/checkboxes
  if (
    elem.name === 'input' &&
    (elem.attribs.type === 'radio' || elem.attribs.type === 'checkbox') &&
    name === 'value'
  ) {
    return 'on';
  }

  return undefined;
}

/**
 * Sets the value of an attribute. The attribute will be deleted if the value is `null`.
 *
 * @private
 * @param el - The element to set the attribute on.
 * @param name - The attribute's name.
 * @param value - The attribute's value.
 */
function setAttr(el: Element, name: string, value: string | null) {
  if (value === null) {
    removeAttribute(el, name);
  } else {
    el.attribs[name] = `${value}`;
  }
}

/**
 * Method for getting attributes. Gets the attribute value for only the first
 * element in the matched set.
 *
 * @example
 *
 * ```js
 * $('ul').attr('id');
 * //=> fruits
 * ```
 *
 * @param name - Name of the attribute.
 * @returns The attribute's value.
 * @see {@link https://api.jquery.com/attr/}
 */
export function attr(name: string): string | undefined;
/**
 * Method for getting all attributes and their values of the first element in
 * the matched set.
 *
 * @example
 *
 * ```js
 * $('ul').attr();
 * //=> { id: 'fruits' }
 * ```
 *
 * @returns The attribute's values.
 * @see {@link https://api.jquery.com/attr/}
 */
export function attr(): Record<string, string>;

/**
 * Method for setting attributes. Sets the attribute value for only the first
 * element in the matched set. If you set an attribute's value to `null`, you
 * remove that attribute. You may also pass a `map` and `function`.
 *
 * @example
 *
 * ```js
 * $('.apple').attr('id', 'favorite').html();
 * //=> <li class="apple" id="favorite">Apple</li>
 * ```
 *
 * @param name - Name of the attribute.
 * @param value - The new value of the attribute.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/attr/}
 */
export function attr<T extends Node>(
  this: Cheerio<T>,
  name: string,
  value?:
    | string
    | null
    | ((this: Element, i: number, attrib: string) => string | null)
): Cheerio<T>;
/**
 * Method for setting multiple attributes at once. Sets the attribute value for
 * only the first element in the matched set. If you set an attribute's value to
 * `null`, you remove that attribute.
 *
 * @example
 *
 * ```js
 * $('.apple').attr({ id: 'favorite' }).html();
 * //=> <li class="apple" id="favorite">Apple</li>
 * ```
 *
 * @param values - Map of attribute names and values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/attr/}
 */
export function attr<T extends Node>(
  this: Cheerio<T>,
  values: Record<string, string | null>
): Cheerio<T>;
export function attr<T extends Node>(
  this: Cheerio<T>,
  name?: string | Record<string, string | null>,
  value?:
    | string
    | null
    | ((this: Element, i: number, attrib: string) => string | null)
): string | Cheerio<T> | undefined | Record<string, string> {
  // Set the value (with attr map support)
  if (typeof name === 'object' || value !== undefined) {
    if (typeof value === 'function') {
      if (typeof name !== 'string') {
        {
          throw new Error('Bad combination of parameters.');
        }
      }
      return domEach(this, (i, el) => {
        if (isTag(el)) setAttr(el, name, value.call(el, i, el.attribs[name]));
      });
    }
    return domEach(this, (_, el) => {
      if (!isTag(el)) return;

      if (typeof name === 'object') {
        Object.keys(name).forEach((objName) => {
          const objValue = name[objName];
          setAttr(el, objName, objValue);
        });
      } else {
        setAttr(el, name as string, value as string);
      }
    });
  }

  return arguments.length > 1 ? this : getAttr(this[0], name as string);
}

/**
 * Gets a node's prop.
 *
 * @private
 * @param el - Elenent to get the prop of.
 * @param name - Name of the prop.
 * @returns The prop's value.
 */
function getProp(
  el: Node | undefined,
  name: string
): string | undefined | Element[keyof Element] {
  if (!el || !isTag(el)) return;

  return name in el
    ? // @ts-ignore
      el[name]
    : rboolean.test(name)
    ? getAttr(el, name) !== undefined
    : getAttr(el, name);
}

/**
 * Sets the value of a prop.
 *
 * @private
 * @param el - The element to set the prop on.
 * @param name - The prop's name.
 * @param value - The prop's value.
 */
function setProp(el: Element, name: string, value: unknown) {
  if (name in el) {
    // @ts-expect-error Overriding value
    el[name] = value;
  } else {
    setAttr(el, name, rboolean.test(name) ? (value ? '' : null) : `${value}`);
  }
}

interface StyleProp {
  length: number;
  [key: string]: string | number;
  [index: number]: string;
}

/**
 * Method for getting and setting properties. Gets the property value for only
 * the first element in the matched set.
 *
 * @example
 *
 * ```js
 * $('input[type="checkbox"]').prop('checked');
 * //=> false
 *
 * $('input[type="checkbox"]').prop('checked', true).val();
 * //=> ok
 * ```
 *
 * @param name - Name of the property.
 * @param value - If specified set the property to this.
 * @returns If `value` is specified the instance itself, otherwise the prop's value.
 * @see {@link https://api.jquery.com/prop/}
 */
export function prop<T extends Node>(
  this: Cheerio<T>,
  name: 'tagName' | 'nodeName'
): T extends Element ? string : undefined;
export function prop<T extends Node>(
  this: Cheerio<T>,
  name: 'innerHTML' | 'outerHTML'
): string | null;
export function prop<T extends Node>(
  this: Cheerio<T>,
  name: 'style'
): StyleProp;
export function prop<T extends Node, K extends keyof Element>(
  this: Cheerio<T>,
  name: K
): Element[K];
export function prop<T extends Node, K extends keyof Element>(
  this: Cheerio<T>,
  name: K,
  value:
    | Element[K]
    | ((this: Element, i: number, prop: K) => Element[keyof Element])
): Cheerio<T>;
export function prop<T extends Node>(
  this: Cheerio<T>,
  name: Record<string, string | Element[keyof Element] | boolean>
): Cheerio<T>;
export function prop<T extends Node>(
  this: Cheerio<T>,
  name: string,
  value:
    | string
    | boolean
    | null
    | ((this: Element, i: number, prop: string) => string | boolean)
): Cheerio<T>;
export function prop<T extends Node>(this: Cheerio<T>, name: string): string;
export function prop<T extends Node>(
  this: Cheerio<T>,
  name: string | Record<string, string | Element[keyof Element] | boolean>,
  value?:
    | ((
        this: Element,
        i: number,
        prop: string | undefined
      ) => string | Element[keyof Element] | boolean)
    | unknown
): Cheerio<T> | string | undefined | null | Element[keyof Element] | StyleProp {
  if (typeof name === 'string' && value === undefined) {
    switch (name) {
      case 'style': {
        const property = this.css() as StyleProp;
        const keys = Object.keys(property);
        keys.forEach((p, i) => {
          property[i] = p;
        });

        property.length = keys.length;

        return property;
      }
      case 'tagName':
      case 'nodeName': {
        const el = this[0];
        return isTag(el) ? el.name.toUpperCase() : undefined;
      }

      case 'outerHTML':
        return this.clone().wrap('<container />').parent().html();

      case 'innerHTML':
        return this.html();

      default:
        return getProp(this[0], name);
    }
  }

  if (typeof name === 'object' || value !== undefined) {
    if (typeof value === 'function') {
      if (typeof name === 'object') {
        throw new Error('Bad combination of parameters.');
      }
      return domEach(this, (j, el) => {
        if (isTag(el)) setProp(el, name, value.call(el, j, getProp(el, name)));
      });
    }

    return domEach(this, (__, el) => {
      if (!isTag(el)) return;

      if (typeof name === 'object') {
        Object.keys(name).forEach((key) => {
          const val = name[key];
          setProp(el, key, val);
        });
      } else {
        setProp(el, name, value);
      }
    });
  }

  return undefined;
}

interface DataElement extends Element {
  data?: Record<string, unknown>;
}

/**
 * Sets the value of a data attribute.
 *
 * @private
 * @param el - The element to set the data attribute on.
 * @param name - The data attribute's name.
 * @param value - The data attribute's value.
 */
function setData(
  el: Element,
  name: string | Record<string, unknown>,
  value?: unknown
) {
  const elem: DataElement = el;

  elem.data ??= {};

  if (typeof name === 'object') Object.assign(elem.data, name);
  else if (typeof name === 'string' && value !== undefined) {
    elem.data[name] = value;
  }
}

/**
 * Read the specified attribute from the equivalent HTML5 `data-*` attribute,
 * and (if present) cache the value in the node's internal data store. If no
 * attribute name is specified, read *all* HTML5 `data-*` attributes in this manner.
 *
 * @private
 * @param el - Elenent to get the data attribute of.
 * @param name - Name of the data attribute.
 * @returns The data attribute's value, or a map with all of the data attribute.
 */
function readData(el: DataElement, name?: string): unknown {
  let domNames;
  let jsNames;
  let value;

  if (name == null) {
    domNames = Object.keys(el.attribs).filter((attrName) =>
      attrName.startsWith(dataAttrPrefix)
    );
    jsNames = domNames.map((domName) =>
      camelCase(domName.slice(dataAttrPrefix.length))
    );
  } else {
    domNames = [dataAttrPrefix + cssCase(name)];
    jsNames = [name];
  }

  for (let idx = 0; idx < domNames.length; ++idx) {
    const domName = domNames[idx];
    const jsName = jsNames[idx];
    if (
      hasOwn.call(el.attribs, domName) &&
      !hasOwn.call((el as DataElement).data, jsName)
    ) {
      value = el.attribs[domName];

      if (hasOwn.call(primitives, value)) {
        value = primitives[value];
      } else if (value === String(Number(value))) {
        value = Number(value);
      } else if (rbrace.test(value)) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          /* Ignore */
        }
      }

      (el.data as Record<string, unknown>)[jsName] = value;
    }
  }

  return name == null ? el.data : value;
}

/**
 * Method for getting data attributes, for only the first element in the matched set.
 *
 * @example
 *
 * ```js
 * $('<div data-apple-color="red"></div>').data('apple-color');
 * //=> 'red'
 * ```
 *
 * @param name - Name of the data attribute.
 * @returns The data attribute's value.
 * @see {@link https://api.jquery.com/data/}
 */
export function data<T extends Node>(
  this: Cheerio<T>,
  name: string
): unknown | undefined;
/**
 * Method for getting all of an element's data attributes, for only the first
 * element in the matched set.
 *
 * @example
 *
 * ```js
 * $('<div data-apple-color="red"></div>').data();
 * //=> { appleColor: 'red' }
 * ```
 *
 * @returns The data attribute's values.
 * @see {@link https://api.jquery.com/data/}
 */
export function data<T extends Node>(this: Cheerio<T>): Record<string, unknown>;
/**
 * Method for setting data attributes, for only the first element in the matched set.
 *
 * @example
 *
 * ```js
 * const apple = $('.apple').data('kind', 'mac');
 *
 * apple.data('kind');
 * //=> 'mac'
 * ```
 *
 * @param name - Name of the data attribute.
 * @param value - The new value.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/data/}
 */
export function data<T extends Node>(
  this: Cheerio<T>,
  name: string,
  value: unknown
): Cheerio<T>;
/**
 * Method for setting multiple data attributes at once, for only the first
 * element in the matched set.
 *
 * @example
 *
 * ```js
 * const apple = $('.apple').data({ kind: 'mac' });
 *
 * apple.data('kind');
 * //=> 'mac'
 * ```
 *
 * @param values - Map of names to values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/data/}
 */
export function data<T extends Node>(
  this: Cheerio<T>,
  values: Record<string, unknown>
): Cheerio<T>;
export function data<T extends Node>(
  this: Cheerio<T>,
  name?: string | Record<string, unknown>,
  value?: unknown
): unknown | Cheerio<T> | undefined | Record<string, unknown> {
  const elem = this[0];

  if (!elem || !isTag(elem)) return;

  const dataEl: DataElement = elem;
  dataEl.data ??= {};

  // Return the entire data object if no data specified
  if (!name) {
    return readData(dataEl);
  }

  // Set the value (with attr map support)
  if (typeof name === 'object' || value !== undefined) {
    domEach(this, (_, el) => {
      if (isTag(el))
        if (typeof name === 'object') setData(el, name);
        else setData(el, name, value as unknown);
    });
    return this;
  }
  if (hasOwn.call(dataEl.data, name)) {
    return dataEl.data[name];
  }

  return readData(dataEl, name);
}

/**
 * Method for getting the value of input, select, and textarea. Note: Support
 * for `map`, and `function` has not been added yet.
 *
 * @example
 *
 * ```js
 * $('input[type="text"]').val();
 * //=> input_text
 * ```
 *
 * @returns The value.
 * @see {@link https://api.jquery.com/val/}
 */
export function val<T extends Node>(
  this: Cheerio<T>
): string | undefined | string[];
/**
 * Method for setting the value of input, select, and textarea. Note: Support
 * for `map`, and `function` has not been added yet.
 *
 * @example
 *
 * ```js
 * $('input[type="text"]').val('test').html();
 * //=> <input type="text" value="test"/>
 * ```
 *
 * @param value - The new value.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/val/}
 */
export function val<T extends Node>(
  this: Cheerio<T>,
  value: string | string[]
): Cheerio<T>;
export function val<T extends Node>(
  this: Cheerio<T>,
  value?: string | string[]
): string | string[] | Cheerio<T> | undefined {
  const querying = arguments.length === 0;
  const element = this[0];

  if (!element || !isTag(element)) return querying ? undefined : this;

  switch (element.name) {
    case 'textarea':
      return this.text(value as string);
    case 'select': {
      const option = this.find('option:selected');
      if (!querying) {
        if (this.attr('multiple') == null && typeof value === 'object') {
          return this;
        }

        this.find('option').removeAttr('selected');

        const values = typeof value !== 'object' ? [value] : value;
        for (let i = 0; i < values.length; i++) {
          this.find(`option[value="${values[i]}"]`).attr('selected', '');
        }

        return this;
      }

      return this.attr('multiple')
        ? option.toArray().map((el) => getAttr(el, 'value')!)
        : option.attr('value');
    }
    case 'input':
    case 'option':
      return querying
        ? this.attr('value')
        : this.attr('value', value as string);
  }

  return undefined;
}

/**
 * Remove an attribute.
 *
 * @private
 * @param elem - Node to remove attribute from.
 * @param name - Name of the attribute to remove.
 */
function removeAttribute(elem: Element, name: string) {
  if (!elem.attribs || !hasOwn.call(elem.attribs, name)) return;

  delete elem.attribs[name];
}

/**
 * Splits a space-separated list of names to individual names.
 *
 * @param names - Names to split.
 * @returns - Split names.
 */
function splitNames(names?: string): string[] {
  return names ? names.trim().split(rspace) : [];
}

/**
 * Method for removing attributes by `name`.
 *
 * @example
 *
 * ```js
 * $('.pear').removeAttr('class').html();
 * //=> <li>Pear</li>
 *
 * $('.apple').attr('id', 'favorite');
 * $('.apple').removeAttr('id class').html();
 * //=> <li>Apple</li>
 * ```
 *
 * @param name - Name of the attribute.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeAttr/}
 */
export function removeAttr<T extends Node>(
  this: Cheerio<T>,
  name: string
): Cheerio<T> {
  const attrNames = splitNames(name);

  for (let i = 0; i < attrNames.length; i++) {
    domEach(this, (_, elem) => {
      if (isTag(elem)) removeAttribute(elem, attrNames[i]);
    });
  }

  return this;
}

/**
 * Check to see if *any* of the matched elements have the given `className`.
 *
 * @example
 *
 * ```js
 * $('.pear').hasClass('pear');
 * //=> true
 *
 * $('apple').hasClass('fruit');
 * //=> false
 *
 * $('li').hasClass('pear');
 * //=> true
 * ```
 *
 * @param className - Name of the class.
 * @returns Indicates if an element has the given `className`.
 * @see {@link https://api.jquery.com/hasClass/}
 */
export function hasClass<T extends Node>(
  this: Cheerio<T>,
  className: string
): boolean {
  return this.toArray().some((elem) => {
    const clazz = isTag(elem) && elem.attribs.class;
    let idx = -1;

    if (clazz && className.length) {
      while ((idx = clazz.indexOf(className, idx + 1)) > -1) {
        const end = idx + className.length;

        if (
          (idx === 0 || rspace.test(clazz[idx - 1])) &&
          (end === clazz.length || rspace.test(clazz[end]))
        ) {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Adds class(es) to all of the matched elements. Also accepts a `function`.
 *
 * @example
 *
 * ```js
 * $('.pear').addClass('fruit').html();
 * //=> <li class="pear fruit">Pear</li>
 *
 * $('.apple').addClass('fruit red').html();
 * //=> <li class="apple fruit red">Apple</li>
 * ```
 *
 * @param value - Name of new class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/addClass/}
 */
export function addClass<T extends Node, R extends ArrayLike<T>>(
  this: R,
  value?:
    | string
    | ((this: Element, i: number, className: string) => string | undefined)
): R {
  // Support functions
  if (typeof value === 'function') {
    return domEach(this, (i, el) => {
      if (isTag(el)) {
        const className = el.attribs.class || '';
        addClass.call([el], value.call(el, i, className));
      }
    });
  }

  // Return if no value or not a string or function
  if (!value || typeof value !== 'string') return this;

  const classNames = value.split(rspace);
  const numElements = this.length;

  for (let i = 0; i < numElements; i++) {
    const el = this[i];
    // If selected element isn't a tag, move on
    if (!isTag(el)) continue;

    // If we don't already have classes
    const className = getAttr(el, 'class');

    if (!className) {
      setAttr(el, 'class', classNames.join(' ').trim());
    } else {
      let setClass = ` ${className} `;

      // Check if class already exists
      for (let j = 0; j < classNames.length; j++) {
        const appendClass = `${classNames[j]} `;
        if (!setClass.includes(` ${appendClass}`)) setClass += appendClass;
      }

      setAttr(el, 'class', setClass.trim());
    }
  }

  return this;
}

/**
 * Removes one or more space-separated classes from the selected elements. If no
 * `className` is defined, all classes will be removed. Also accepts a `function`.
 *
 * @example
 *
 * ```js
 * $('.pear').removeClass('pear').html();
 * //=> <li class="">Pear</li>
 *
 * $('.apple').addClass('red').removeClass().html();
 * //=> <li class="">Apple</li>
 * ```
 *
 * @param name - Name of the class. If not specified, removes all elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeClass/}
 */
export function removeClass<T extends Node, R extends ArrayLike<T>>(
  this: R,
  name?:
    | string
    | ((this: Element, i: number, className: string) => string | undefined)
): R {
  // Handle if value is a function
  if (typeof name === 'function') {
    return domEach(this, (i, el) => {
      if (isTag(el))
        removeClass.call([el], name.call(el, i, el.attribs.class || ''));
    });
  }

  const classes = splitNames(name);
  const numClasses = classes.length;
  const removeAll = arguments.length === 0;

  return domEach(this, (_, el) => {
    if (!isTag(el)) return;

    if (removeAll) {
      // Short circuit the remove all case as this is the nice one
      el.attribs.class = '';
    } else {
      const elClasses = splitNames(el.attribs.class);
      let changed = false;

      for (let j = 0; j < numClasses; j++) {
        const index = elClasses.indexOf(classes[j]);

        if (index >= 0) {
          elClasses.splice(index, 1);
          changed = true;

          /*
           * We have to do another pass to ensure that there are not duplicate
           * classes listed
           */
          j--;
        }
      }
      if (changed) {
        el.attribs.class = elClasses.join(' ');
      }
    }
  });
}

/**
 * Add or remove class(es) from the matched elements, depending on either the
 * class's presence or the value of the switch argument. Also accepts a `function`.
 *
 * @example
 *
 * ```js
 * $('.apple.green').toggleClass('fruit green red').html();
 * //=> <li class="apple fruit red">Apple</li>
 *
 * $('.apple.green').toggleClass('fruit green red', true).html();
 * //=> <li class="apple green fruit red">Apple</li>
 * ```
 *
 * @param value - Name of the class. Can also be a function.
 * @param stateVal - If specified the state of the class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/toggleClass/}
 */
export function toggleClass<T extends Node, R extends ArrayLike<T>>(
  this: R,
  value?:
    | string
    | ((
        this: Element,
        i: number,
        className: string,
        stateVal?: boolean
      ) => string),
  stateVal?: boolean
): R {
  // Support functions
  if (typeof value === 'function') {
    return domEach(this, (i, el) => {
      if (isTag(el)) {
        toggleClass.call(
          [el],
          value.call(el, i, el.attribs.class || '', stateVal),
          stateVal
        );
      }
    });
  }

  // Return if no value or not a string or function
  if (!value || typeof value !== 'string') return this;

  const classNames = value.split(rspace);
  const numClasses = classNames.length;
  const state = typeof stateVal === 'boolean' ? (stateVal ? 1 : -1) : 0;
  const numElements = this.length;

  for (let i = 0; i < numElements; i++) {
    const el = this[i];
    // If selected element isn't a tag, move on
    if (!isTag(el)) continue;

    const elementClasses = splitNames(el.attribs.class);

    // Check if class already exists
    for (let j = 0; j < numClasses; j++) {
      // Check if the class name is currently defined
      const index = elementClasses.indexOf(classNames[j]);

      // Add if stateValue === true or we are toggling and there is no value
      if (state >= 0 && index < 0) {
        elementClasses.push(classNames[j]);
      } else if (state <= 0 && index >= 0) {
        // Otherwise remove but only if the item exists
        elementClasses.splice(index, 1);
      }
    }

    el.attribs.class = elementClasses.join(' ');
  }

  return this;
}

/**
 * Checks the current list of elements and returns `true` if _any_ of the
 * elements match the selector. If using an element or Cheerio selection,
 * returns `true` if _any_ of the elements match. If using a predicate function,
 * the function is executed in the context of the selected element, so `this`
 * refers to the current element.
 *
 * @param selector - Selector for the selection.
 * @returns Whether or not the selector matches an element of the instance.
 * @see {@link https://api.jquery.com/is/}
 */
export function is<T extends Node>(
  this: Cheerio<T>,
  selector?:
    | string
    | ((this: Element, i: number, el: Element) => boolean)
    | Cheerio<T>
    | T
    | null
): boolean {
  if (selector) {
    return this.filter(selector).length > 0;
  }
  return false;
}
