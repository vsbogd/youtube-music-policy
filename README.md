# Overview

This is a web extention to automate checking large number of your music files
via YouTube music policy web-page.  Extention adds to the page controls to
select multiple files and check them.

# Build

Execute:

```sh
npm install
./node_modules/.bin/web-ext build --artifacts-dir ./build --source-dir ./src
```
Results are placed into `./build` directory.

# Third party

Thirdparty resources and libraries used:
- [jQuery](https://jquery.com/)
- [JavaScript ID3 reader](https://github.com/aadsm/JavaScript-ID3-Reader)
