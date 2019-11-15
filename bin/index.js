#!/usr/bin/env node
/**
 * @since 2017-05-31 19:32:36
 * @author vivaxy
 */
const yargs = require('yargs');
const updateNotifier = require('update-notifier');

const pkg = require('../package.json');

const configureYargs = () => {
  return yargs
    .commandDir('../commands')
    .demandCommand()
    .help()
    .version().argv._;
};

configureYargs();
updateNotifier({ pkg }).notify();
