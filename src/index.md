[![Literate programming][literate-image]][literate-url]

# Screen Router as Finite State Machine

**StateMachineRouter** allows you to describe the "history-driven" screens transitions in declarative manner.

To achieve this, it does two things:
  - generates configuration for the underline fsm engine

  - connects fsm instance to History API to provide synchronization betwen fsm state and screen URL.

<!--+ [index.js](#Structure "save:") -->

## Structure

    _"Imports"

    _"Constants"

    _"Router constructor"

    _"Helpers"


## Imports

```javascript
import { Automaton, EVENTS } from 'kristi';
import { named } from 'named-regexp';
import format from 'string-format';

export { EVENTS } from 'kristi';
```

## Constants

```javascript
const NAMED_RE_START = '(:<';

const STATES = {
	ROUTING: '--routing--'
};

const ROUTING_REQUESTED = '--routing_requested--';
```

## Router constructor

```javascript
export function Router(schema) {
    let self       = this;
    let fullSchema = addRoutingHoles(schema);
    let fsm        = new Automaton(fullSchema);

    _"Public API"
};
```

### Public API

    _"Router.start()"

    _"Router.process()"

    _"others"


#### Router.start()

`Router.start()` does two things. First, it runs underlining fsm in special "routing" state, and then transits it to the state, that is matched to current `window.location.pathname` value. Second, it subscribes to `popstate` events, to synchronize fsm state with location changes, when user clicks on "Backward" or "Forward" buttons in browser navigation bar.

```javascript
this.start = function () {
    let [stateId, data, meta] = matchLocationToState(schema) || [];

	window.addEventListener('popstate', function (e) {
        let historyData     = e.state;
        let meta            = { query: window.location.search };
        let [eventId, data] = matchLocationToState(schema) || [];
        let fullData        = Object.assign(data, historyData);

        fsm
            .process(ROUTING_REQUESTED)
            .then(() => fsm.process(eventId, self, fullData, meta))
	});

    return fsm
        .startWith(STATES.ROUTING)
        .then(() => fsm.process(stateId, self, data, meta));
};
```

#### Router.process()

`Router.process()` provides processing of input events, that leads (or not) to state transition. All state transitions are achieved trough intermediate "routing" state. It allows to make transitions from "state A" to "state A".
For example, you have state with URL `/users/(:<userId>[0-9]+)/`. Thanks to mechanism, described above, you can make transition from `/users/111/` to `/users/222/`.

```javascript
this.process = function (eventId, data={}, meta={}) {
    let currentStateId = fsm.currentState();
    let currentState   = schema[currentStateId];
    let targetStateId  = currentState.transitions[eventId];

    if (!targetStateId) {
        throw new Error(
            `Input "${eventId}" could not be processed in state "${currentStateId}"`
        );
    }


    return fsm
        .process(ROUTING_REQUESTED)
        .then(() => fsm.process(targetStateId, self, data, meta))
        .then(() => {
            let state = schema[targetStateId];

            updateURL(state.url, state.title, data, meta.query);
        });
};
```

#### others
```javascript
this.toString = function () {
    return JSON ? JSON.stringify(fullSchema) : fullSchema;
}


this.currentState = function () {
    return fsm.currentState();
};

this.on = function (...args) {
    return fsm.on.apply(fsm, args);
}

this.off = function (...args) {
    return fsm.off.apply(fsm, args);
}
```

## Helpers

    _"matchLocationToState"

    _"stateByUrl"

    _"flatCaptures"

    _"addRoutingHoles"

    _"updateURL"

    _"urlRegExpToTemplate"


### matchLocationToState

Matches current `window.location` value to router's state.
Result of matching is array of target `stateId`, `data` object, and `meta` object.


```javascript
/**
 * @param {Object} schema
 * @returns {Object[]}
 */
export function matchLocationToState(schema) {
	let pathname = window.location.pathname;
	let query    = window.location.search;
    let result   = stateByUrl(pathname, schema);

    return result ? result.concat({ query }) : null;
}
```

### stateByUrl

This function is used in `matchLocationToState`. It exists as separated function only to separate impure part of `window.href` getting from pure url-to-state calculation.


```javascript
/**
 * @param {string} urlToMatch
 * @param {Object} schema
 * @returns {Object}
 */
export function stateByUrl(urlToMatch, schema) {
    for (var stateId in schema) {
        if (!schema.hasOwnProperty(stateId)) continue;

        let state   = schema[stateId];
        let urlData = matchState(state.url);

        if (urlData) return [stateId, urlData];
    }


    function matchState(stateUrl) {
        if (stateUrl.indexOf(NAMED_RE_START) === -1) {
            return (stateUrl === urlToMatch) ? { /*data*/ } : null;
        }

        let regExp    = named(new RegExp(stateUrl));
        let result    = regExp.exec(urlToMatch) || [];
        let captures  = result.captures;
        let isMatched = captures && (Object.keys(captures).length === (result.length - 1));

        return isMatched ? flatCaptures(captures) : null;
    };
}
```


### flatCaptures

```javascript
/**
 * pure
 *
 * TODO: добавить в объявление урлов сахар вида /users/:userId/
 *
 * Библиотека named-regexp позволяет использовать имя группы
 * несколько раз в одном и том же рег. выражении:
 *
 * var re = named(/(:<foo>[a-z]+) (:<foo>[a-z]+) (:<bar>[a-z]+)/ig);
 * var matched = re.exec('aaa bbb ccc');
 * console.log(matched.captures); //=> { foo: [ 'aaa', 'bbb' ], bar: [ 'ccc' ] }
 *
 * В отличие от named-regexp, в StateMachineRouter такая
 * возможность отсутствует, т.к. позволяет создавать
 * мало-вразумительные URI.
 *
 * Вместо этого, результирующий объект имеет вид:
 * { foo: 'aaa', bar: 'ccc' }
 *
 * @param {Object} captures
 * @returns {Object}
 */
export function flatCaptures(captures) {
    return Object
        .keys(captures)
        .reduce((acc, key) => Object.assign(acc, { [key]: captures[key][0] }), {});
};
```


### addRoutingHoles

```javascript
export function addRoutingHoles(schema) {
    return Object.assign({}, extendTransitions(schema), {
        [STATES.ROUTING]: {
            'transitions': transitions(schema)
        }
    });


    function transitions(schema) {
        return Object
            .keys(schema)
            .reduce((acc, stateId) => Object.assign(acc, { [stateId]: stateId }), {});
    }


    function extendTransitions(schema) {
        return Object
            .keys(schema)
            .reduce((acc, stateId) => {
                acc[stateId] = Object.assign({}, schema[stateId]);
                acc[stateId].transitions[ROUTING_REQUESTED] = STATES.ROUTING;

                return acc;
            }, {});
    }
}
```

### updateURL

```javascript
function updateURL(urlReStr, title, data={}, query='') {
	let urlTemplate = urlRegExpToTemplate(urlReStr); // TODO: add caching?
	let fullUrl     = format(urlTemplate, data) + query;

    if (fullUrl !== window.location.href) {
    	history.pushState(data, title, fullUrl);
    }

    if (title) document.title = title;
}
```


### urlRegExpToTemplate

```javascript
/**
 * pure
 *
 * @param {string} urlRe - URL's stringified regexp.
 * @returns {string}
 */
export function urlRegExpToTemplate(urlRe) {
    // For simple (non-regexp) URLs - just return string
    if (urlRe.indexOf(NAMED_RE_START) === -1) return urlRe;

    let replaced = urlRe.replace(/\(:<(\w+)>.+?\)/gi, function(substr, matched) {
    	return '{' + matched + '}';
    });

    return replaced;
}
```

[literate-image]: https://img.shields.io/badge/literate%20programming--brightgreen.svg
[literate-url]: https://en.wikipedia.org/wiki/Literate_programming
