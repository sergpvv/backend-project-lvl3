install:
	npm install

run:
	npx babel-node 'src/bin/page-loader.js' -h

publish:
	npm publish --dry-run

lint:
	npx eslint .

build:
	rm -rf dist
	npm run build
test:
	npm test
testw:
	npm test -- --watch
test-coverage:
	npm test -- --coverage
