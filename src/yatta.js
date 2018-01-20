#!/usr/bin/env node

import {curl, load_index, simple, update_index, url2fn} from "./utils";
import {sleep} from "../dist/utils";
import * as backends from "./backends";
import {ERR_BOT} from "./backends/google-scholar";

const ora = require("ora");
const fs = require("fs");
const chalk = require('chalk');
const program = require('commander');
const package_config = require('../package.json');
const inquirer = require('inquirer');
const {Subject} = require('rxjs');
const open = require('opn');

// take a look at: https://scotch.io/tutorials/build-an-interactive-command-line-application-with-nodejs


const EXIT_KEYS = ["escape", "q"];
const ENTRY_LIMIT = 15;
const INDEX_PATH = "yatta.yml";

/** yatta init --index-path ".yatta" */
async function init(options) {
    const {indexPath = INDEX_PATH, ...restOpts} = options;
    if (fs.existsSync(indexPath))
        console.error(`index file ${indexPath} already exists.`);
    else
        update_index(indexPath);
    return process.exit()
}

/** Setting yatta configurations
 * yatta set search.open true
 * yatta set search.limit 100
 * */
async function set(key, value, options) {
    const {indexPath = INDEX_PATH, ...restOpts} = options;
    if (fs.existsSync(indexPath))
        console.error(`index file ${indexPath} already exists.`);
    else
        update_index(indexPath);
}

async function search(query, options) {
    const index = load_index(options.indexPath);
    options = {...(index.search || {}), ...options};
    if (!options.limit)
        return console.error(chalk.red('OPTION_ERROR: options.limit is not specified or 0'));
    // add options.backend
    const search = backends.SOURCES[options.source];
    const sourceName = backends.NAMES[options.source];
    if (!search && typeof search === "function")
        return console.error(chalk.red(`OPTION_ERROR: options.source is not in the white list ${backends.SOURCES}`));

    const search_prompt = {
        message: `Results by ${sourceName}`,
        type: "list",
        default: 0,
        pageSize: options.limit * 2 // when this is less than the real screen estate, it gets very ugly.
        // todo: measure the actual height of the screen.
    };

    let spinner = ora(`searching google scholar for ${chalk.green(query)}`).start();
    let results;
    try {
        ({results} = await search(query, options.limit));
    } catch (e) {
        spinner.stop();
        if (e.code === ERR_BOT)
            console.error(chalk.green("\nYou are detected as a bot\n"), e);
        else
            console.error(chalk.red('\nsomething went wrong during search\n'), e);
        process.exit();
    }
    spinner.stop();
    let choices = results.map(simple).slice(0, options.limit);

    function exit(ch, key) {
        if (key && EXIT_KEYS.indexOf(key.name) === -1) return;
        prompt.ui.close();
        console.log(chalk.green(`\nExit on <${key.name}> key~`));
        process.stdin.removeListener('keypress', exit);
    }

    let prompt = inquirer.prompt({
        ...search_prompt,
        name: "selection",
        choices
    });

    process.stdin.on('keypress', exit);
    const {selection} = await prompt;
    process.stdin.removeListener('keypress', exit);
    let i = choices.indexOf(selection);
    const selected = results[i];

    const fn = url2fn(selected.pdfUrl);
    try {
        if (fs.existsSync(fn)) {
            console.log(chalk.yellow("!"), "pdf file already exist! Skipping the download.");
        } else {
            curl(selected.pdfUrl, fn);
            console.log(chalk.green("✓"), "pdf file is saved");
        }
        if (options.open) {
            console.log(chalk.info("opening the pdf file."),
                "You can change this setting using either\n\t1. the `-O` flag or \n\t2. the `yatta.yml` config file.");
            await sleep(200);
            open(fn)
        }
    } catch (e) {
        console.log(chalk.red("✘"), "pdf file saving failed due to", e);
    }
    try {
        selected.files = [...(selected.files || []), fn];
        update_index(options.indexPath, selected);
        console.log(chalk.green("✓"), "bib entry attached");
    } catch (e) {
        console.log(chalk.red("✘"), "failed to append bib entry due to", e);
    }
    process.exit();
}

program
    .version(package_config.version)
    .option('-d, --directory', 'the directory to apply yatta. Default to ')
    .option('-R, --recursive', 'flag to apply yatta recursively');

program
    .command('init', {isDefault: true})
    .option('--index-path <index path>', "path for the yatta.yml index file", INDEX_PATH)
    // we DO NOT offer config option to keep it simple
    // .option('-O --open', "open the downloaded pdf file")
    .action(init);

program
    .command('search <query>', {isDefault: true})
    .description('Search for papers with the specified search engine.')
    // todo: do validation here in the spec.
    .option(`-s --source <${Object.keys(backends.SOURCES)}>`,
        `The search backend to use, choose among ${Object.keys(backends.SOURCES)}`,
        (s) => s.toLowerCase(), backends.GOOGLE_SCHOLAR)
    .option('--limit <limit>', "limit for the number of results to show on each search", parseInt, ENTRY_LIMIT)
    .option('--index-path <index path>', "path for the yatta.yml index file", INDEX_PATH)
    .option('-O --open', "open the downloaded pdf file")
    .action(search);

program
    .parse(process.argv);
