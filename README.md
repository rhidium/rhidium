<div align="center">
  <a href="https://rhidium.xyz"><img src="https://github.com/rhidium/core/assets/57721238/e6d25fa1-07cb-4284-a02a-f73fe7ef3878" width="100" alt="logo" /></a>

![Font_PNG](https://github.com/rhidium/core/assets/57721238/9ccc5763-8336-4d1e-8187-a738bafdc519)

[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
![GitHub Release](https://img.shields.io/github/v/release/rhidium/rhidium)
![GitHub License](https://img.shields.io/github/license/rhidium/rhidium)

  <p>
    <a href="https://discord.gg/mirasaki"><img src="https://img.shields.io/discord/793894728847720468?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
  </p>

</div>

# 👋 Introduction

Rhidium is built out of love for Discord bot development, and has 1 primary goal: to make your life easier. Whether you're just getting started or a seasoned developer, Rhidium is designed to simplify your workflow and help you create bots you can be proud of.

## 🤝 About

Rhidium is **not** a lightweight framework. It is built on top of the [discord.js](https://discord.js.org/#/) library, and aims to provide most of the core functionality required to bootstrap a powerful, modern Discord bot. Written in TypeScript, it provides the benefits of static type-checking and code completion in modern editors.

> With Rhidium, you can focus on what's really important: **Creating meaningful features**

Excited to begin? [Get started](#-installation) or try [the demo](#-support)!

## 🤩 Features (non-exhaustive)

We've compromised a list of some of the core functionality provided by Rhidium:

- [x] Type-safe, re-usable [controllers](https://rhidium.xyz/modules/Commands.Controllers.html)
- [x] Dynamic [component](https://rhidium.xyz/modules/Commands.html) handlers
- [x] Synchronized local & API commands, automatic refreshes
- [x] Fully localized (through [i18next](https://www.npmjs.com/package/i18next)), convenience localization for commands
- [x] Colorful console logging & verbose, organized file logging
- [x] Wide range of everyday utilities and functionality
- [x] [CRON](https://crontab.guru/) and interval-based jobs

## 💽 Database

This TypeScript project uses [Prisma](https://www.prisma.io/docs/getting-started/quickstart) TypeORM using the `postgresql` adapter.

Available adapters: `cockroachdb`, `mongodb`, `postgresql`

> **Note**: When using CockroachDB, the `autoincrement()` default function is defined only on BigInt fields. Change `autoincrement()` to `sequence()` if you want an sequential Int field.

## 🛠️ Installation

<details>

<summary>Collapse/Expand</summary>

Please note, a [Discord Application](https://wiki.mirasaki.dev/docs/discord-create-application#go-to-discord-developer-portal) is required for both installation methods.

### 📦 Run as a Docker container (preferred)

The quickest, and easiest, way to host/use this bot template is by deploying it inside of a [Docker](https://www.docker.com/) container. We recommend [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. Download the [latest release](https://github.com/rhidium/rhidium/releases`) or `git clone git@github.com:rhidium/rhidium.git` the repo
2. Run `pnpm setup:linux` or `pnpm setup:windows` (depending on your OS) in the project root folder
3. Edit the newly created `.env` and `/config/config.json` files and provide your configuration
4. Sync the database: `docker compose run --rm client sh -c "npx prisma db push"`
5. Start the application: `docker compose up -d client` (you can view logs with `docker compose logs -f client`)

### 🖥️ Run as a plain NodeJS app

1. Install the additional pre-requisites:
   - [pnpm](https://pnpm.io/installation) v9.15.4
   - [Node.js](https://nodejs.org/en/) v16.6.0 or newer
   - [PostgreSQL](https://www.postgresql.org/) v13 or newer
2. Download the [latest release](https://github.com/rhidium/rhidium/releases`) or `git clone git@github.com:rhidium/rhidium.git` the repo
3. Run `pnpm setup:linux` or `pnpm setup:windows` in the project root folder
4. Edit the newly created `.env` and `/config/config.json` files and provide your configuration
5. Sync the database: `pnpm db:push`
6. Start the application: `pnpm start` for production, and `pnpm dev` for local development

## ⚙️ Configuration

The configuration for this project can be found [here](/config/config.example.json), and should be very straight-forward.

```json
{
  "client": {
    "id": "", // Client id from https://discord.dev/application
    "token": "", // Client/bot token from https://discord.dev/application
    "development_server_id": "" // Only needed for developers/development environments
  },
  "permissions": {
    "owner_id": "1148597817498140774", // The discord user id of the bot owner
    "system_administrator_ids": [], // List of discord user ids for system administrators
    "developer_ids": [] // List of discord user ids for developers
  }
}
```

> Additionally, feel free to explore the [personalization options](/config/extended-config.example.json).

### dotenv

The `.env` file holds your secrets and other environmental values. Let's explain the different keys here:

```bash
NODE_ENV=production # The node environment your bot is running in. Available values: production, development

# ---------------------------------- Database ---------------------------------- #
POSTGRES_HOST=localhost # Change to "database" if using docker (compose)
POSTGRES_PORT=5432 # The port your PostgreSQL server is running on. Default is 5432.
POSTGRES_USER=postgres # The username for your PostgreSQL server. Default is "postgres".
POSTGRES_PASSWORD=CHANGE_ME # The password for your PostgreSQL server.
POSTGRES_DB=rhidium # The name of the database to connect to. Default is "rhidium".

# The database URL for connecting to the (PostgreSQL) database. You generally don't
# need to change this, but you can if you want to use a different database or schema.
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

```

</details>

## 📚 Documentation

We provide multiple resources to help get you started on your project quickly:

- Explore the [Template / Example](https://github.com/rhidium/rhidium) - If you're new here, the best way to determine if Rhidium is a fit for you is by exploring this complete example.
- Check out the [API Documentation](https://rhidium.xyz/modules.html) - Once you're convinced, clone the example/template and check out the API docs to learn more about the inner workings and possibilities.
- Made with [TypeScript](https://www.typescriptlang.org/) and [discord.js](https://discord.js.org/) - comes with [PM2](https://pm2.io/), [Docker](https://www.docker.com/), [docker compose](https://docs.docker.com/compose/) configurations

## 🙋 Support

Join our [support server](https://discord.gg/mirasaki) if you have any questions, feature requests or other feedback:

[![banner](https://invidget.switchblade.xyz/mirasaki)](https://discord.gg/mirasaki)

## 🗺️ Roadmap / To-Do

### High Priority

- [ ] Localization for `prompts/interactions`
- [ ] Resolve or otherwise review Typedoc warnings
- [ ] Add documentation for `COMPONENT_HANDLER_IDENTIFIER`
- [ ] Apply `data#setDefaultMemberPermissions` to relevant commands
- [ ] Refactor (now-required) `(as unknown) as (Any)(Typed/API)Command`
- [ ] Implement (+ refactor) `embeds` and `placeholders` from previous version
- [ ] Implement (global) reusable command middleware, refactor from previous version
- [ ] Command **deployment** currently doesn't respect `enabled#guilds`, meaning they are registered as global commands

### Low Priority

- [ ] Dashboard for _command usage statistics_ and _database metrics_
- [ ] Refactor `Prompts` into a standalone, opt-in, NPM package

## 🙋 Support

Join our [support server](https://discord.gg/mirasaki) if you have any questions, feature requests or other feedback:

[![banner](https://invidget.switchblade.xyz/mirasaki)](https://discord.gg/mirasaki)

> Open-source and ISC licensed, meaning you're in full control.
