.PHONY: dev test deploy

dev:
	API_KEY=xxx DATABASE_URL=postgres://test:supralocal@localhost:5432/test ./node_modules/.bin/ts-node src/server.ts

test:
	DATABASE_URL=postgres://test:supralocal@localhost:5432/test ./node_modules/.bin/mocha -r ts-node/register test/*.js

deploy:
	git push heroku master

docker-up:
	 docker compose -f stack.yml up -d

docker-stop:
	 docker compose -f stack.yml stop
