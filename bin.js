#!/usr/bin/env node

const Fs = require("fs");
const Path = require("path");
const ChildProcess = require("child_process");
const encrypted = process.argv[2];
const decrypted = encrypted+Math.random().toString(36).substring(2);

if (process.argv.length !== 3) {
  process.stderr.write("usage: maevar path/to/encrypted/file");
  process.exit(1);
}

const check = (result) => {
  if (result.error)
    throw result.error;
  if (result.status)
    throw new Error(result.stderr+" ("+result.status+")");
  return result.stdout;
}

const prompt = (text, limit) => {
  process.stdout.write(text);
  const stdout = check(ChildProcess.spawnSync("node", [Path.join(__dirname, "prompt.js"), limit], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"]
  }));
  return stdout;
}

const newpassword = () => {
  const password = prompt("New password:\n", Infinity);
  if (password === prompt("Confirm:\n", Infinity))
    return password;
  process.stdout.write("Password mismatch, please retry...\n")
  newpassword();
};

const decrypt = (password) => {
  check(ChildProcess.spawnSync("openssl", [
    "enc",
    "-d",
    "-aes256",
    "-base64",
    "-k", password,
    "-in", encrypted,
    "-out", decrypted
  ]));
}

const edit = () => {
  check(ChildProcess.spawnSync("vim", ["-n", decrypted], {stdio:"inherit"}));
}

const encrypt = (password) => {
  check(ChildProcess.spawnSync("openssl", [
    "enc",
    "-aes256",
    "-base64",
    "-k", password,
    "-in", decrypted,
    "-out", encrypted
  ]));
}

try {
  try {
    const stat = Fs.statSync(encrypted);
    if (!stat.isFile())
      throw new Error("first argument must be a path to a file");
    let password = prompt("Password:\n", Infinity);
    decrypt(password);
    edit();
    const answer = prompt("New password? [y/N]\n", 1);
    if (answer === "y")
      password = newpassword();
    encrypt(password);
  } catch (error) {
    if (error.code !== "ENOENT")
      throw error;
    edit();
    encrypt(newpassword());
  }
} catch (error) {
  process.stderr.write(error.message+"\n");
} finally {
  try {
    Fs.statSync(decrypted);
  } catch (error) {
    if (error.code !== "ENOENT")
      throw error;
    process.exit(0);
  }
  // Not 100% secure (file may have been moved to an other physical place)
  const buffer = Fs.readFileSync(decrypted);
  for (let index = 0, length = buffer.length; index < length; index++)
    buffer.writeUInt8(0, index);
  Fs.writeFileSync(decrypted, buffer);
  Fs.unlinkSync(decrypted);
}
