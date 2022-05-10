.PHONY: dev test deploy

dev:
	API_KEY=xxx DATABASE_URL=postgres://test:supralocal@localhost:5432/test node index.js

test:
	DATABASE_URL=postgres://test:supralocal@localhost:5432/test ./node_modules/.bin/mocha

deploy:
	git push heroku master

docker-up:
	 docker compose -f stack.yml up -d

docker-stop:
	 docker compose -f stack.yml stop
