#!/usr/bin/env node

var Fs = require("fs");
var Stream = require("stream");
var ChildProcess = require("child_process");

var END_OF_TEXT = Buffer.from("\u0003", "utf8");
var END_OF_FILE = Buffer.from("\u0004", "utf8");
var BACKSPACE = Buffer.from("\u0008", "utf8");
var LINE_FEED = Buffer.from("\u000a", "utf8");
var CARRIAGE_RETURN = Buffer.from("\u000d", "utf8");
var DELETE = Buffer.from("\u007f", "utf8");

function exit (message) {
  process.stderr.write(message+"\n");
  process.exit(1);
}

if (process.argv.length !== 3)
  exit("Usage: maevar path/to/encrypted/file");
if (!ChildProcess.spawnSync("which", ["vim"]).stdout.toString())
  exit("vim not found, download at: http://www.vim.org/download.php");
if (!ChildProcess.spawnSync("which", ["srm"]).stdout.toString())
  exit("srm not found, download at: https://sourceforge.net/projects/srm/");

var encrypted = process.argv[2];
var decrypted = encrypted+Math.random().toString(36).substring(2);

function check (error) {
  if (error) {
    ChildProcess.spawnSync("srm", [decrypted], {stdio:"ignore"});
    exit(String(error));
  }
}

function prompt (text, limit, callback) {
  if (process.stdin.isRaw)
    check("Concurrent prompt, this should never happen...");
  var input = "";
  function done () {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeAllListeners("data");
    process.stdout.write("\n");
    callback(input);
  }
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", function(key) {
    if (!key.compare(END_OF_TEXT) || !key.compare(END_OF_FILE))
      check("Interrupted by the user");
    if (!key.compare(BACKSPACE) || !key.compare(DELETE))
      return input = input.substring(0, input.length - 1);
    if (!key.compare(LINE_FEED) || !key.compare(CARRIAGE_RETURN))
      return done();
    input += key.toString("utf8");
    (input.length >= limit) && done();
  });
  process.stdout.write(text);
}

process.on("SIGINT", function () { check("Interrupted by the user") });

function errorify (result) {
  return result.error || (result.status ? result.status+" "+result.stderr : null);
}

function decrypt (password) {
  check(errorify(ChildProcess.spawnSync("openssl", [
    "enc",
    "-d",
    "-aes256",
    "-base64",
    "-k", password,
    "-in", encrypted,
    "-out", decrypted
  ])));
}

function edit () {
  check(errorify(ChildProcess.spawnSync("vim", ["-n", decrypted], {stdio:"inherit"})));
}

function encrypt (password) {
  check(errorify(ChildProcess.spawnSync("openssl", [
    "enc",
    "-aes256",
    "-base64",
    "-k", password,
    "-in", decrypted,
    "-out", encrypted
  ])));
  check(errorify(ChildProcess.spawnSync("srm", [decrypted])));
}

function newpassword (callback) {
  prompt("New password: ", Infinity, function (password) {
    prompt("Confirm: ", Infinity, function (confirm) {
      if (password === confirm)
        return callback(password);
      process.stdout.write("Password mismatch, please retry...\n");
      newpassword(callback);
    });
  });
}

Fs.stat(encrypted, function (error, stats) {
  if (error && error.code === "ENOENT") {
    edit()
    newpassword(encrypt);
  } else {
    check(error || (stats.isFile() ? null : encrypted+" is not a file"));
    prompt("Password: ", Infinity, function (password) {
      decrypt(password);
      edit();
      prompt("New password? [y/n]", 1, function (answer) {
        (answer === "y") ? newpassword(encrypt) : encrypt(password);
      });
    });
  }
});
