# Overview

A web extention to automate checking large amount of music files via YouTube
music policy web-page. Extention adds to the page the controls to select
multiple files, check them and show results.

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
