
const END_OF_TEXT = "\u0003";
const END_OF_FILE = "\u0004";
const BACKSPACE = "\u0008";
const LINE_FEED = "\u000a";
const CARRIAGE_RETURN = "\u000d";
const DELETE = "\u007f";

let input = "";

const limit = Number(process.argv[2]);

process.stdin.setRawMode(true);

process.stdin.resume();

const done = (error) => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeAllListeners("data");
  if (error) {
    process.stderr.write(error);
    process.exit(1);
  } else {
    process.stdout.write(input);
    process.exit(0);
  }
}

const onchar = (char) => {
  if (char === END_OF_TEXT || char === END_OF_FILE)
    done("interupted by the user");
  if (char === LINE_FEED || char === CARRIAGE_RETURN)
    done(null);
  if (char === BACKSPACE || char === DELETE) {
    input = input.substring(0, input.length - 1);
  } else {
    input += char;
  }
  if (input.length >= limit) {
    done(null);
  }
}

process.stdin.on("data", (buffer) => {
  buffer.toString("utf8").split("").forEach(onchar);
});
