## 🛠️ Installation

Please note, a [Discord Application](https://wiki.mirasaki.dev/docs/discord-create-application#go-to-discord-developer-portal) is required for both installation methods.

### 📦 Run as a Docker container (preferred)

The quickest, and easiest, way to host/use this bot template is by deploying it inside of a [Docker](https://www.docker.com/) container. We recommend [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. Download the [latest release](https://github.com/rhidium/rhidium/releases`) or `git clone git@github.com:rhidium/rhidium.git` the repo
2. Run `pnpm setup:linux` or `pnpm setup:windows` (depending on your OS) in the project root folder
3. Edit the newly created `.env` and `/config/config.json` files and provide your configuration
4. Start the application: `docker compose up`

### 🖥️ Run as a plain NodeJS app

- Install the additional pre-requisites:
  - [Node.js](https://nodejs.org/en/) v16.6.0 or newer
  - [PostgreSQL](https://www.postgresql.org/) v13 or newer
- Download the [latest release](https://github.com/rhidium/rhidium/releases`) or `git clone git@github.com:rhidium/rhidium.git` the repo
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
