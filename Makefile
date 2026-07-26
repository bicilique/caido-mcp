.PHONY: setup build test lint doctor config verify

setup:
	corepack pnpm install --frozen-lockfile

build:
	corepack pnpm build

test:
	corepack pnpm test

lint:
	corepack pnpm lint

doctor:
	corepack pnpm run doctor

config:
	@test -n "$(CLIENT)" || (echo "Usage: make config CLIENT=codex|claude|cursor" >&2; exit 1)
	corepack pnpm config:client $(CLIENT)

verify:
	corepack pnpm verify
