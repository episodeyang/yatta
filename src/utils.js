/** Created by ge on 1/19/18. */
import chalk from "chalk";
import request from "request";
import {parse as urlParse} from "url";
import path from "path";
import yaml from "js-yaml";
import fs from "fs-extra";
import * as backends from "./backends";
import {PDFJS} from "pdfjs-dist";
import * as os from "os";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function isArray(a) {
    return (typeof a === "object" && typeof a.length === 'number');
}

function check_path_array(path) {
    if (!isArray(path) || !path.length) throw new Error(`Path is ill-formed ${JSON.stringify(path)}`);
}

export function dot(obj, path) {
    check_path_array(path);
    let key = path[0];
    let v = obj[key];
    if (path.length === 1) return v;
    else return dot_update(v, path.slice(1));
}

export function dot_update(obj, path, value) {
    check_path_array(path);
    let key = path[0];
    let v = obj[key];
    if (path.length === 1) return ({...obj, [key]: value});
    else return ({...obj, [key]: dot_update(v, path.slice(1), value)});
}

export function url2fn(url) {
    const parsed = urlParse(url);
    let fn = path.basename(parsed.pathname).trim();
    // add pdf here.
    fn += !fn.match(/\.pdf$/) ? ".pdf" : "";
    return fn
}

const USER_AGENT = 'curl/7.52.1';
const REFERRER = "https://scholar.google.com/scholar";
// doesn't work with arxiv
// 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/604.4.7 (KHTML, like Gecko) Version/11.0.2 Safari/604.4.7';

export function curl(url, targetPath) {
    const file = fs.createWriteStream(targetPath);
    return new Promise((resolve, reject) => request({url, headers: {'User-Agent': USER_AGENT, 'Referer': REFERRER}})
        .pipe(file).on('error', reject).on('finish', resolve));
}

// curl("https://arxiv.org/pdf/1703.01988.pdf", "test.pdf");
// curl ("https://arxiv.org/pdf/1606.04460", "test.pdf");


export const RC_PATH = path.join(os.homedir(), ".yattarc.yml");
export const INDEX_PATH = "yatta.yml";
export const ENTRY_LIMIT = 15;
export const DEFAULT_DIR = "./";
export const DEFAULT_LIB = path.join(os.homedir(), "Dropbox/papers");
export const DEFAULT_FILENAME = "{YY}{MM}-{title}-{firstAuthor}-{filename}";
export const DEFAULT_CONFIG_INIT = {
    search: {}
};
export const DEFAULT_CONFIG = {
    dir: DEFAULT_DIR,
    filename: DEFAULT_FILENAME,
    search: {
        limit: ENTRY_LIMIT,
        open: true,
        source: backends.ARXIV
    },
    papers: []
};
export const DEFAULT_RC = {
    lib: DEFAULT_LIB
};

export function load_index(indexPath) {
    let index, load_default, content;
    try {
        content = fs.readFileSync(indexPath, 'utf8');
    } catch (err) {
        load_default = true;
    }
    if (!content || load_default) {
        index = DEFAULT_CONFIG;
        console.log(chalk.green(`${indexPath} yatta config file doesn't exist! Loading default.`))
    }
    else {
        index = yaml.safeLoad(content);
        if (typeof index !== 'object')
            throw new Error(`index file ${indexPath} seems to be ill-formed.`);
    }
    return index
}

export function dump(indexPath, index) {
    const content = yaml.safeDump(index, {'styles': {'!!undefined': 'null'}, 'sortKeys': true});
    fs.writeFileSync(indexPath, content);
}

export function rc_exist(){
    return fs.existsSync(RC_PATH);
}
export function init_rc() {
    dump(RC_PATH, DEFAULT_RC);
}

export function create_index(indexPath) {
    dump(indexPath, DEFAULT_CONFIG_INIT);
}

export function update_index(indexPath, entry) {
    let index;
    if (fs.existsSync(indexPath))
        fs.copySync(indexPath, indexPath.trim() + ".backup", {overwrite: true});
    else fs.ensureFileSync(indexPath);
    try {
        index = load_index(indexPath);
    } catch (err) {
        console.log(f`Failed to read index file due to ${err}`);
        throw err;
    }
    // todo: use dictionary instead;
    if (!index.papers) index.papers = [];
    if (!!entry) index.papers = [...index.papers, entry];
    dump(indexPath, index);
}


// update_index(".yatta.yml", {name: "test"});