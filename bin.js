var ChildProcess = require("child_process");
var Fs = require("fs");
var Read = require("read");

if (process.argv.length !== 3) {
  process.stderr.write("Usage: node.js edit.js path/to/encrypted\n");
  process.exit(1);
}

var encrypted = process.argv[2];
var decrypted = __dirname+"/tmp.txt";

function check (error) {
  if (error) {
    ChildProcess.spawnSync("srm", [decrypted], {stdio:"inherit"});
    throw error;
  }
}

function execute (command, arguments) {
  var result = ChildProcess.spawnSync(command, arguments, {
    stdio: ["ignore", "ignore", "pipe"],
    encoding: "utf8"
  });
  check(result.error || (result.status !== 0 && result.stderr));

}

function edit () { ChildProcess.spawnSync("vim", [decrypted], {stdio:"inherit"}) }

function encrypt (password) {
  execute("openssl", [
    "enc",
    "-aes256",
    "-base64",
    "-k", password,
    "-in", decrypted,
    "-out", encrypted
  ]);
  execute("srm", [decrypted]);
}

function decrypt (password) {
  execute("openssl", [
    "enc",
    "-d",
    "-aes256",
    "-base64",
    "-k", password,
    "-in", encrypted,
    "-out", decrypted
  ]);
}

function newpassword (callback) {
  Read({prompt:"New password...", silent:true}, function (error, password) {
    check(error);
    if (password.length >= 4)
      return Read({prompt:"Confirm...", silent:true}, function (error, confirm) {
        check(error);
        if (confirm === password)
          return callback(password);
        process.stdout.write("Password mismatch, please retype.\n")
        ask(callback);
      });
    process.stdout.write("Password too short, please retype.\n");
    newpassword(callback);
  });
}

Fs.stat(encrypted, function (error, stats) {
  if (error && error.code === "ENOENT")
    return (edit(), newpassword(encrypt));
  check(error || (stats.isFile() ? null : new Error(encrypted+" is not a file")));
  Read({prompt:"Password...", silent:true}, function (error, password) {
    check(error);
    decrypt(password);
    edit();
    Read({prompt: "New password? [y/n]"}, function (error, answer) {
      (answer === "y") ? newpassword(encrypt) : encrypt(password);
    });
  });
});
