#!/bin/bash
# cleanup
rm -f -R ./build > /dev/null 2>&1
# plugin directory
mkdir -p ./build/plugins/ipfs/files > /dev/null 2>&1
# wiki directory
mkdir -p ./build/tiddlers > /dev/null 2>&1
# ipfs scripts
cp -R ./src/* ./build/plugins/ipfs > /dev/null 2>&1
# plugin tiddlers
cp -R ./tiddlers/plugin/* ./build/plugins/ipfs > /dev/null 2>&1
# wiki tiddlers
cp -R ./tiddlers/wiki/* ./build/tiddlers > /dev/null 2>&1
# metadata
cp ./metadata/tiddlywiki.info ./build > /dev/null 2>&1
# modules
cp ./metadata/tiddlywiki.files ./build/plugins/ipfs/files > /dev/null 2>&1
# loglevel
mkdir -p ./build/plugins/ipfs/files/loglevel > /dev/null 2>&1
cp -R ./node_modules/loglevel/lib/loglevel.js ./build/plugins/ipfs/files/loglevel > /dev/null 2>&1
cp -R ./node_modules/loglevel/LICENSE-MIT ./build/plugins/ipfs/files/loglevel > /dev/null 2>&1
# babel-polyfill
mkdir -p ./build/plugins/ipfs/files/babel-polyfill > /dev/null 2>&1
cp -R ./node_modules/@babel/polyfill/dist/polyfill.min.js ./build/plugins/ipfs/files/babel-polyfill > /dev/null 2>&1
cp -R ./node_modules/@babel/polyfill/LICENSE ./build/plugins/ipfs/files/babel-polyfill > /dev/null 2>&1
# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1
# generate build number
./scripts/run-build-number.sh || exit 1

exit 0