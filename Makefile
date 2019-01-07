install:
	npm-install

develop:
	npm run webpack-dev-server

start:
	npm run babel-node -- src/bin/gendiff.js

build:
	rm -rf dist
	NODE_ENV=production npm run webpack

publish:
	npm publish

test:
	npm test
	
lint:
	npm run eslint .