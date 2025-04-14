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

<a href="/.github/documentation/installation.md">
  <button>
    🛠️ Installation
  </button>
</a>

## 🤝 About

Rhidium is **not** a lightweight framework. It is built on top of the [discord.js](https://discord.js.org/#/) library, and aims to provide most of the core functionality required to bootstrap a powerful, modern Discord bot. Written in TypeScript, it provides the benefits of static type-checking and code completion in modern editors.

> With Rhidium, you can focus on what's really important: **Creating meaningful features**

Excited to begin? [Get started](/.github/documentation/installation.md) or try [the demo](#-support)!

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
- [ ] Add documentation for `COMPONENT_HANDLER_IDENTIFIER`
- [ ] Refactor (now-required) `(as unknown) as Command/AnyCommandApiCommand`
- [ ] Apply `data#setDefaultMemberPermissions` to relevant commands
- [ ] Implement (+ refactor) `embeds` and `placeholders` from previous version
- [ ] Implement (global) reusable command middleware, refactor from previous version

### Low Priority

- [ ] Dashboard for _command usage statistics_ and _database metrics_
- [ ] Refactor `Prompts` into a standalone, opt-in, NPM package

## 🙋 Support

Join our [support server](https://discord.gg/mirasaki) if you have any questions, feature requests or other feedback:

[![banner](https://invidget.switchblade.xyz/mirasaki)](https://discord.gg/mirasaki)

> Open-source and ISC licensed, meaning you're in full control.
