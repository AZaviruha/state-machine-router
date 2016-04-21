'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.EVENTS = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _kristi = require('kristi');

Object.defineProperty(exports, 'EVENTS', {
    enumerable: true,
    get: function get() {
        return _kristi.EVENTS;
    }
});
exports.Router = Router;
exports.matchLocationToState = matchLocationToState;
exports.stateByUrl = stateByUrl;
exports.flatCaptures = flatCaptures;
exports.addRoutingHoles = addRoutingHoles;
exports.urlRegExpToTemplate = urlRegExpToTemplate;

var _namedRegexp = require('named-regexp');

var _stringFormat = require('string-format');

var _stringFormat2 = _interopRequireDefault(_stringFormat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var NAMED_RE_START = '(:<';

var STATES = {
    ROUTING: '--routing--'
};

var ROUTING_REQUESTED = '--routing_requested--';

function Router(schema) {
    var self = this;
    var fullSchema = addRoutingHoles(schema);
    var fsm = new _kristi.Automaton(fullSchema);

    this.start = function () {
        var _ref = matchLocationToState(schema) || [];

        var _ref2 = _slicedToArray(_ref, 3);

        var stateId = _ref2[0];
        var data = _ref2[1];
        var meta = _ref2[2];


        window.addEventListener('popstate', function (e) {
            var historyData = e.state;
            var meta = { query: window.location.search };

            var _ref3 = matchLocationToState(schema) || [];

            var _ref4 = _slicedToArray(_ref3, 2);

            var eventId = _ref4[0];
            var data = _ref4[1];

            var fullData = Object.assign(data, historyData);

            fsm.process(ROUTING_REQUESTED).then(function () {
                return fsm.process(eventId, self, fullData, meta);
            });
        });

        return fsm.startWith(STATES.ROUTING).then(function () {
            return fsm.process(stateId, self, data, meta);
        });
    };

    this.process = function (eventId) {
        var data = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var meta = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var currentStateId = fsm.currentState();
        var currentState = schema[currentStateId];
        var targetStateId = currentState.transitions[eventId];

        if (!targetStateId) {
            throw new Error('Input "' + eventId + '" could not be processed in state "' + currentStateId + '"');
        }

        return fsm.process(ROUTING_REQUESTED).then(function () {
            return fsm.process(targetStateId, self, data, meta);
        }).then(function () {
            var state = schema[targetStateId];

            updateURL(state.url, state.title, data, meta.query);
        });
    };

    this.toString = function () {
        return JSON ? JSON.stringify(fullSchema) : fullSchema;
    };

    this.currentState = function () {
        return fsm.currentState();
    };

    this.on = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        return fsm.on.apply(fsm, args);
    };

    this.off = function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
        }

        return fsm.off.apply(fsm, args);
    };
};

/**
 * @param {Object} schema
 * @returns {Object[]}
 */
function matchLocationToState(schema) {
    var pathname = window.location.pathname;
    var query = window.location.search;
    var result = stateByUrl(pathname, schema);

    return result ? result.concat({ query: query }) : null;
}

/**
 * @param {string} urlToMatch
 * @param {Object} schema
 * @returns {Object}
 */
function stateByUrl(urlToMatch, schema) {
    for (var stateId in schema) {
        if (!schema.hasOwnProperty(stateId)) continue;

        var state = schema[stateId];
        var urlData = matchState(state.url);

        if (urlData) return [stateId, urlData];
    }

    function matchState(stateUrl) {
        if (stateUrl.indexOf(NAMED_RE_START) === -1) {
            return stateUrl === urlToMatch ? {/*data*/} : null;
        }

        var regExp = (0, _namedRegexp.named)(new RegExp(stateUrl));
        var result = regExp.exec(urlToMatch) || [];
        var captures = result.captures;
        var isMatched = captures && Object.keys(captures).length === result.length - 1;

        return isMatched ? flatCaptures(captures) : null;
    };
}

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
function flatCaptures(captures) {
    return Object.keys(captures).reduce(function (acc, key) {
        return Object.assign(acc, _defineProperty({}, key, captures[key][0]));
    }, {});
};

function addRoutingHoles(schema) {
    return Object.assign({}, extendTransitions(schema), _defineProperty({}, STATES.ROUTING, {
        'transitions': transitions(schema)
    }));

    function transitions(schema) {
        return Object.keys(schema).reduce(function (acc, stateId) {
            return Object.assign(acc, _defineProperty({}, stateId, stateId));
        }, {});
    }

    function extendTransitions(schema) {
        return Object.keys(schema).reduce(function (acc, stateId) {
            acc[stateId] = Object.assign({}, schema[stateId]);
            acc[stateId].transitions[ROUTING_REQUESTED] = STATES.ROUTING;

            return acc;
        }, {});
    }
}

function updateURL(urlReStr, title) {
    var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
    var query = arguments.length <= 3 || arguments[3] === undefined ? '' : arguments[3];

    var urlTemplate = urlRegExpToTemplate(urlReStr); // TODO: add caching?
    var fullUrl = (0, _stringFormat2.default)(urlTemplate, data) + query;

    if (fullUrl !== window.location.href) {
        history.pushState(data, title, fullUrl);
    }

    if (title) document.title = title;
}

/**
 * pure
 *
 * @param {string} urlRe - URL's stringified regexp.
 * @returns {string}
 */
function urlRegExpToTemplate(urlRe) {
    // For simple (non-regexp) URLs - just return string
    if (urlRe.indexOf(NAMED_RE_START) === -1) return urlRe;

    var replaced = urlRe.replace(/\(:<(\w+)>.+?\)/gi, function (substr, matched) {
        return '{' + matched + '}';
    });

    return replaced;
}