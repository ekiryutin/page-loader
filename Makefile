install:
	npm install

start:
	npx babel-node -- src/bin/page-loader.js https://hexlet.io/courses --output /var/tmp

build:
	rm -rf dist
	npm run build

publish:
	npm publish

test:
	npm test

lint:
	npx eslint .
