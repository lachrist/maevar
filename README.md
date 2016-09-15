# Mae'var

Maevar is a simple command-line tool to edit aes256 encrypted files.
To install, run: `npm install -g maevar`.
You need to have `openssl` and `vim` in your `PATH`.
Usage:

```sh
maevar path/to/encrypted/file
```

```
> maevar sensitive/encrypted.aes 
Password...
<< VIM EDIT >>
New password? [y/n] y
New password... 
Confirm... 
>
```
