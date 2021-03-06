"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DEFAULT_RC = exports.DEFAULT_CONFIG = exports.DEFAULT_CONFIG_INIT = exports.DEFAULT_FILENAME = exports.DEFAULT_LIB = exports.DEFAULT_DIR = exports.ENTRY_LIMIT = exports.INDEX_PATH = exports.RC_PATH = undefined;

var _toConsumableArray2 = require("babel-runtime/helpers/toConsumableArray");

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _taggedTemplateLiteral2 = require("babel-runtime/helpers/taggedTemplateLiteral");

var _taggedTemplateLiteral3 = _interopRequireDefault(_taggedTemplateLiteral2);

var _defineProperty2 = require("babel-runtime/helpers/defineProperty");

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends4 = require("babel-runtime/helpers/extends");

var _extends5 = _interopRequireDefault(_extends4);

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = require("babel-runtime/helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _templateObject = (0, _taggedTemplateLiteral3.default)(["Failed to read index file due to ", ""], ["Failed to read index file due to ", ""]); /** Created by ge on 1/19/18. */


exports.sleep = sleep;
exports.isArray = isArray;
exports.dot = dot;
exports.dot_update = dot_update;
exports.url2fn = url2fn;
exports.curl = curl;
exports.load_index = load_index;
exports.dump = dump;
exports.rc_exist = rc_exist;
exports.init_rc = init_rc;
exports.create_index = create_index;
exports.update_index = update_index;

var _chalk = require("chalk");

var _chalk2 = _interopRequireDefault(_chalk);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _url = require("url");

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _jsYaml = require("js-yaml");

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var _fsExtra = require("fs-extra");

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _backends = require("./backends");

var backends = _interopRequireWildcard(_backends);

var _pdfjsDist = require("pdfjs-dist");

var _os = require("os");

var os = _interopRequireWildcard(_os);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function sleep(ms) {
    return new _promise2.default(function (resolve) {
        return setTimeout(resolve, ms);
    });
}

function isArray(a) {
    return (typeof a === "undefined" ? "undefined" : (0, _typeof3.default)(a)) === "object" && typeof a.length === 'number';
}

function check_path_array(path) {
    if (!isArray(path) || !path.length) throw new Error("Path is ill-formed " + (0, _stringify2.default)(path));
}

function dot(obj, path) {
    check_path_array(path);
    var key = path[0];
    var v = obj[key];
    if (path.length === 1) return v;else return dot_update(v, path.slice(1));
}

function dot_update(obj, path, value) {
    check_path_array(path);
    var key = path[0];
    var v = obj[key];
    if (path.length === 1) return (0, _extends5.default)({}, obj, (0, _defineProperty3.default)({}, key, value));else return (0, _extends5.default)({}, obj, (0, _defineProperty3.default)({}, key, dot_update(v, path.slice(1), value)));
}

function url2fn(url) {
    var parsed = (0, _url.parse)(url);
    var fn = _path2.default.basename(parsed.pathname).trim();
    // add pdf here.
    fn += !fn.match(/\.pdf$/) ? ".pdf" : "";
    return fn;
}

var USER_AGENT = 'curl/7.52.1';
var REFERRER = "https://scholar.google.com/scholar";
// doesn't work with arxiv
// 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/604.4.7 (KHTML, like Gecko) Version/11.0.2 Safari/604.4.7';

function curl(url, targetPath) {
    var file = _fsExtra2.default.createWriteStream(targetPath);
    return new _promise2.default(function (resolve, reject) {
        return (0, _request2.default)({ url: url, headers: { 'User-Agent': USER_AGENT, 'Referer': REFERRER } }).pipe(file).on('error', reject).on('finish', resolve);
    });
}

// curl("https://arxiv.org/pdf/1703.01988.pdf", "test.pdf");
// curl ("https://arxiv.org/pdf/1606.04460", "test.pdf");


var RC_PATH = exports.RC_PATH = _path2.default.join(os.homedir(), ".yattarc.yml");
var INDEX_PATH = exports.INDEX_PATH = "yatta.yml";
var ENTRY_LIMIT = exports.ENTRY_LIMIT = 15;
var DEFAULT_DIR = exports.DEFAULT_DIR = "./";
var DEFAULT_LIB = exports.DEFAULT_LIB = _path2.default.join(os.homedir(), "Dropbox/papers");
var DEFAULT_FILENAME = exports.DEFAULT_FILENAME = "{YY}{MM}-{title}-{firstAuthor}-{filename}";
var DEFAULT_CONFIG_INIT = exports.DEFAULT_CONFIG_INIT = {
    search: {}
};
var DEFAULT_CONFIG = exports.DEFAULT_CONFIG = {
    dir: DEFAULT_DIR,
    filename: DEFAULT_FILENAME,
    search: {
        limit: ENTRY_LIMIT,
        open: true,
        source: backends.ARXIV
    },
    papers: []
};
var DEFAULT_RC = exports.DEFAULT_RC = {
    lib: DEFAULT_LIB
};

function load_index(indexPath) {
    var index = void 0,
        load_default = void 0,
        content = void 0;
    try {
        content = _fsExtra2.default.readFileSync(indexPath, 'utf8');
    } catch (err) {
        load_default = true;
    }
    if (!content || load_default) {
        index = DEFAULT_CONFIG;
        console.log(_chalk2.default.green(indexPath + " yatta config file doesn't exist! Loading default."));
    } else {
        index = _jsYaml2.default.safeLoad(content);
        if ((typeof index === "undefined" ? "undefined" : (0, _typeof3.default)(index)) !== 'object') throw new Error("index file " + indexPath + " seems to be ill-formed.");
    }
    return index;
}

function dump(indexPath, index) {
    var content = _jsYaml2.default.safeDump(index, { 'styles': { '!!undefined': 'null' }, 'sortKeys': true });
    _fsExtra2.default.writeFileSync(indexPath, content);
}

function rc_exist() {
    return _fsExtra2.default.existsSync(RC_PATH);
}
function init_rc() {
    dump(RC_PATH, DEFAULT_RC);
}

function create_index(indexPath) {
    dump(indexPath, DEFAULT_CONFIG_INIT);
}

function update_index(indexPath, entry) {
    var index = void 0;
    if (_fsExtra2.default.existsSync(indexPath)) _fsExtra2.default.copySync(indexPath, indexPath.trim() + ".backup", { overwrite: true });else _fsExtra2.default.ensureFileSync(indexPath);
    try {
        index = load_index(indexPath);
    } catch (err) {
        console.log(f(_templateObject, err));
        throw err;
    }
    // todo: use dictionary instead;
    if (!index.papers) index.papers = [];
    if (!!entry) index.papers = [].concat((0, _toConsumableArray3.default)(index.papers), [entry]);
    dump(indexPath, index);
}

// update_index(".yatta.yml", {name: "test"});