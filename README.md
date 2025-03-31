<div align="center">
  <a href="https://rhidium.xyz"><img src="https://github.com/rhidium/core/assets/57721238/e6d25fa1-07cb-4284-a02a-f73fe7ef3878" width="100" alt="logo" /></a>

![Font_PNG](https://github.com/rhidium/core/assets/57721238/9ccc5763-8336-4d1e-8187-a738bafdc519)

  <p>
    <a href="https://discord.gg/mirasaki"><img src="https://img.shields.io/discord/793894728847720468?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
    <a href="https://www.npmjs.com/package/@rhidium/core"><img src="https://img.shields.io/npm/v/@rhidium/core.svg?maxAge=3600" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/@rhidium/core"><img src="https://img.shields.io/npm/dt/@rhidium/core.svg?maxAge=3600" alt="npm downloads" /></a>
  </p>

  <p align="center">
    <a href="https://github.com/rhidium/core">Core</a>
    •
    <a href="https://github.com/rhidium/template">Template</a>
    •
    <a href="https://github.com/rhidium/json-editor">JSON Editor</a>
    •
    <a href="https://github.com/rhidium/core">Placeholder</a>
  </p>
</div>

# @rhidium/template

This is a Discord bot template that fully utilizes the [rhidium framework](https://rhidium.xyz). From essential system related commands to detailed command usage/statistics and re-usable embed and placeholder integrations - this template aims to provide everything you need to develop powerful, scalable Discord bots fast and efficiently.

> With Rhidium, you can focus on what's really important: **Creating meaningful features**

Excited to begin? [Get started](#-installation) or try [the demo](#-support)!

## 🤩 Features (non-exhaustive)

We've compromised a list of some of the core functionality provided by Rhidium:

- Powerful, dynamic [middleware](https://rhidium.xyz/classes/Middleware.CommandMiddleware.html) system
- Type-safe, re-usable [controllers](https://rhidium.xyz/modules/Commands.Controllers.html)
- Dynamic [Component](https://rhidium.xyz/modules/Commands.html) Handlers/File-Loaders
- Synchronized local & API commands, automatic refreshes
- Fully localized (through [i18next](https://www.npmjs.com/package/i18next)), convenience localization for commands
- Colorful console logging & verbose, organized file logging
- Wide range of everyday utilities and functionality
- [CRON](https://crontab.guru/) and interval-based jobs

### Developer Friendly

This template focuses on simplicity and robustness for developers. The primary example of this is that components are resolved from directories, not extended from a class and imported elsewhere - as commonly seen across other templates. It's our mission to get you started on your project fast, so you can focus on the important things: implementing meaningful features.

- Check out the [API Reference](https://rhidium.xyz/)
- Made with [TypeScript](https://www.typescriptlang.org/) and [discord.js](https://discord.js.org/)
- [PM2](https://pm2.io/), [Docker](https://www.docker.com/), [docker compose](https://docs.docker.com/compose/) configurations provided

### Functionality

- Detailed command usage statistics and metrics
- User configurable embed utilities, easily extendable to new functionality
- Dynamic placeholder structure, easily extendable to new data
- Discord logging for errors, guild join/leave etc.
- Administrator and Moderator permission level roles and channels
- Member Join messages, uses both Embed and Placeholder functionality as a complete integration
- User information, and developer utility commands
- And so much more...

### Scaling

This template grows with you and your bot. Opt-in to sharding & clustering (`x` shards for `n` processes) as you reach new milestones, all functionality included is sharding + clustering friendly by design.

- Supports [sharding](https://discordjs.guide/sharding), which is required when your bot reaches 2500+ servers
- Supports [clustering](https://www.npmjs.com/package/discord-hybrid-sharding), which allows you to seamlessly run your bot over multiple processes

### RESTful API (coming soon)

This template comes with a REST API (OpenAPI spec 3.0.0). By default, this only serves the client's command data, which can be used to easily fetch your command data and build a dynamic command table/overview on your project's website. You can easily extend, and build upon this API yourself. Visit the `api` section in the `/config/config.json` file to get started.

## 💽 Database

This TypeScript project uses [Prisma](https://www.prisma.io/docs/getting-started/quickstart) TypeORM with `postgresql` adapter.

Available adapters: `cockroachdb`, `mongodb`, `postgresql`

- If you make changes to the schema, use the `prisma db push` command to push the new schema state to the database.
- If you want to use an existing database (pull the schema from existing database), use the `prisma db pull` command.
- Use `prisma migrate dev` to create migrations, apply them to the database, and generate artifacts (e.g. Prisma Client)
- When using CockroachDB, the `autoincrement()` default function is defined only on BigInt fields. Change `autoincrement()` to `sequence()` if you want an sequential Int field.

### Mongo

The MongoDB adapter can be chosen to minimize required setup for this project. Converting to Mongo adapters should (mostly) only include adding `_id` `@map`'ing and adding `@db.ObjectId` for `@id`'s (an up-to-date [mongo schema file](./prisma/schema.mongo.prisma) is included for your convenience). Do note, Prisma migrations aren't supported for the MongoDB adapter.

## 🛠️ Installation

Please note, a [Discord Application](https://wiki.mirasaki.dev/docs/discord-create-application#go-to-discord-developer-portal) is required for both installation methods.

### 📦 Run as a Docker container (preferred)

The quickest, and easiest, way to host/use this bot template is by deploying it inside of a [Docker](https://www.docker.com/) container. We recommend [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. Download the [latest release](https://github.com/rhidium/template/releases`) or `git clone git@github.com:rhidium/template.git` the repo
2. Run `pnpm setup:linux` or `pnpm setup:windows` (depending on your OS) in the project root folder
3. Edit the newly created `.env` and `/config/config.json` files and provide your configuration
4. Start the application: `docker compose up`

### 🖥️ Run as a plain NodeJS app

- Install the additional pre-requisites:
  - [Node.js](https://nodejs.org/en/) v16.6.0 or newer
  - [PostgreSQL](https://www.postgresql.org/) v13 or newer
- Download the [latest release](https://github.com/rhidium/template/releases`) or `git clone git@github.com:rhidium/template.git` the repo
- Run `pnpm setup:linux` or `pnpm setup:windows` in the project root folder
- Edit the newly created `/config/config.json` file and provide your configuration
  - Alternatively, use `pnpm setup:config` if you prefer a web-based editor
  - Hit `ctrl+c` to stop the application once you've clicked "Save"
- Edit the newly created `.env` file and provide your environmental values
- Start the application: `pnpm start`

## ⚙️ Configuration

The full configuration for this project can be found [here](./config/config.example.json), and is validated through a JSON schema file that is automatically kept up-to-date. There's quite a bit of options to explore, which is why we've included a web-based editor to keep things simple.

### dotenv

The `.env` file holds your secrets and other environmental values. Let's explain the different keys here:

```bash
# The node environment your bot is running in
# Available values: production, development
NODE_ENV=production

# The database URL Prisma uses to connect to your database.
DATABASE_URL="postgresql://<username>:<password>@<host>/<database>"

# Docker Compose uses the following environment variables to configure the database connection.
DATABASE_PASSWORD="<password>"
```

## 🧩 Component Handlers

Just a quick note on the component/command handler the underlying [@rhidium/core](https://rhidium.xyz/) implements - you don't **have** to use the built-in handlers. You can use the following (vanilla `discord.js`) code to achieve the same, but within an existing component (instead of having to create a new one) - which is useful for small commands/components.

> ⚠️ You can use `@` at the start of any `componentId`/`customId` to omit the built-in handlers. Alternatively, you can use the `suppress_unknown_interaction_warnings` configuration option.

In any scope with a valid interaction context:

```ts
import { ComponentType } = from 'discord.js';
import { UnitConstants } from '@core';

// Fetching the message attached to the received interaction
const interactionMessage = await interaction.fetchReply();

// Button reply/input collector
const collector = interactionMessage.createMessageComponentCollector({
  filter: (i) => (
    i.customId === '@customId' || i.customId === '@customIdTwo'
  ) && i.user.id === interaction.user.id,
  componentType: ComponentType.Button,
  time: UnitConstants.MS_IN_ONE_HOUR,
});

// And finally, running code when it collects an interaction (defined as "i" in this callback)
collector.on('collect', (i) => { /* The callback to run */ });
```

### Dynamic Components

You can create **dynamic** components by using multiple `@`'s in the `componentId/customId` property. For example, an id of `@close-ticket@12` will make the component handler look for a component with a `customId` of `close-ticket`. This allows for dynamic component ids, allowing you to effectively "store" data or other references in the components `customId`.

### Reserved filenames

Due to the dynamic nature of the project structure/architecture, some (file) names are reserved **when using a directory to organize your command/component**. "Reserved" here means that commands/components won't be loaded from files named either of the following:

`components`, `options`, `types`, `helpers`, `controllers`, `services`, `transformers`, and `enums`.

Check out [the `/embeds` command structure](./src/core/chat-input/Administrator/embeds) for an example of what this looks like in action.

## ⌨️ Scripts

We've also included some example scripts to get you started with your favorite runtime:

> Please note, you should run these from the **directory root**

### [PM2](https://pm2.io/)

```bash
pm2 start
pm2 stop
pm2 restart
pm2 reset
pm2 delete
```

### [Docker](https://www.docker.com/)

```bash
# Build
docker build --tag rhidium .
# Start
docker run -it -p 9000:9000 --env-file .env -d --name my-discord-bot rhidium
# Logs
docker logs my-discord-bot -f
# Stop
docker stop my-discord-bot
# Restart
docker restart my-discord-bot
# Kill
docker rm -f my-discord-bot
# Purge
docker rm -fv my-discord-bot
# Shell
docker run -it --rm my-discord-bot sh
```

## 🙋 Support

Join our [support server](https://discord.gg/mirasaki) if you have any questions, feature requests or other feedback:

[![banner](https://invidget.switchblade.xyz/mirasaki)](https://discord.gg/mirasaki)

> Open-source and ISC licensed, meaning you're in full control.
