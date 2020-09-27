all: misspell lint

misspell:
	misspell -error docs/*.md

lint:
	yarn lint:wording
