[![Discord Online](https://img.shields.io/discord/1336421551255457846?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![Discord Users](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscord.com%2Fapi%2Finvites%2FfUn2AZsBpW%3Fwith_counts%3Dtrue&query=%24.profile.member_count&label=Total&style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/B8BKcKMRm8)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=8.15.4-orange?style=for-the-badge)](https://pnpm.io/)
[![Monorepo](https://img.shields.io/badge/monorepo-turborepo-orange?style=for-the-badge)](https://turbo.build/repo)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
[![License: EL2](https://img.shields.io/badge/License-EL2-blue.svg?style=for-the-badge)](https://www.elastic.co/licensing/elastic-license) [![Wallaby.js](https://img.shields.io/badge/wallaby.js-powered-blue.svg?style=for-the-badge&logo=github)](https://wallabyjs.com/oss/)

# Auto Engineer

> Put your SDLC on Auto, and build production-grade apps with humans and agents.

##### _EARLY PREVIEW_

- It will be buggy as you use it!
- We are working hard on making it awesome
- We are actively using Auto with real-world clients and use-cases
- We are making a lot of design decisions as we battle test the approach

Stay up to date by watching 👀 and giving us a star ⭐ - join the 💬 Discord for conversations.


## 🚀 Quick Start

### Prerequisites

Please ensure you have the following dependencies installed:

- **Node.js**: Version 20.0.0 or higher
- ***A package manager**: pnpm (recommended) / npm / yarn / bun
- **AI Provider API Key**: Anthropic (recommended) / OpenAI / Google / xAI Grok / Custom
    - For custom models and/or routers, see the .env.template

### Installation Steps

1. **Use the Create Auto App installer**

```bash
npx create-auto-app@latest # Tip: the todo example is a good start
```

2. **Configure API keys**
Copy the `.env.template` variables into a new `.env` and configure your API keys for your preferred model(s).

3. **Run the app**
Go into the generated directory `cd <project-name>` and run:

```bash
auto
```
You should see `server running on http://localhost:5555` in your console. You're ready to start exploring!

### Explore Flows
Open one of the flow files in your IDE. Flow files are located under `/flows` in the example you installed.

Next, navigate to http://localhost:5555 in your browser. Click the button to go to your sandbox, and you'll see the visual counterpart of the flow that you saw in your IDE. 🤯

With Flow, you model your apps using the flow of time. Think of flows like a user journey where you tell the story slice by slice.

Click on a slice, which are the purple boxes that you see inside the flows, and you'll see a pen icon. Click that to see the specs in plain English for that slice. You can edit them to and get as specific as you require.

As you make changes, you'll see an "sync" icon with a number in the top right. This is an indication of the number of differences between the sandbox and your IDE. You can think of the sandbox you're working in as a git remote that you need to push and pull from.

### Collaborate on your Flows
Grab the `sandbox.on.auto/...` link that you see in your browser and share it with your colleagues. They can immediately collaborate with you on your canvas! No apps to download, just instant access to the flows. Any changes they make will also appear for you in the top right sync icon. This allows you to collaborate with non-technical people and get their input, while still keeping it real. 🤘

### Build your Flows
Ok, so you've authored a flow to your liking, sliced and diced it, you've collaborated on it, and got a 👍 from  your colleagues. Now let's build your app!

On the left toolbar, you'll see a pipelines icon. Click it and you'll see a visual of a pipeline. 

Select "Export Schema" and click run, then continue reading as you marvel at cogs turning.

The pipelines are where all the magic happens. First the flows are converted into a model, which is used to scaffold a backend. AI then creates a user experience architecture, which in turn scaffolds a front end. Both the scaffolded frontend and backend are then implemented and tested by AI 🤖.

The pipeline gives you full control over how you want apps to be built. The example has a set of default that the Auto team put together, but everything is customizable to the nth degree, including the Flow DSL itself!

### Preview your Flows
Once the run is complete, you can go to `https://localhost:3000` and preview your newly created app.

Congratulations, you built your first app using Auto! 🚀

## Explore more
Let's go through some of the other features Auto provides you.

### Configuring your pipeline
The pipelines are a little bit like CI/CD pipelines, but on steroids! Just like CI/CD, you can configure the steps required to build, test, and deploy. However unlike CI/CD these pipelines have feedback loops. The output of one job can retrigger another job. Some jobs may even ask for asynchronous input from humans. This is why we call them Software Development Lifecycle pipelines. They help you automated your whole SDLC.

You can configure these pipelines in `auto.config.ts` file. In there you will find a set of reactions that read something like this: `on(SomeEvent).dispatch(SomeCommand)`. By chaining these reactions together you can build SDLC pipelines that are as simple or complex as you like.

Some jobs are procedural and deterministic, some are stochastic and non-deterministic, and some are a mix of both. 

Job are triggered by a single command and emit one or more events – of they might emit an error if they fail or timeout unexpectedly. 

You can read more about pipelines in the core-concepts section.

### Running commands from the CLI
Just like you can run commands from the UI, you can also run from them from the CLI.

If you'd like to see which commands are available, type this in your console:
```bash
auto --help
```
You'll get a list of commands based on the plugins you have configured in your `auto.config.ts` file

```
auto generate:server --schema-path=.context/schema.json --destination=.
```

If you're already running an Auto server, you run the cli commands against it by passing in the server url like this:

```
auto generate:server --schema-path=.context/schema.json --destination=. --host=localhost:5555
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

Auto Engineer is licensed under the [Elastic License 2.0 (EL2)](LICENSE.md).

## 🔗 Links

- [Discord Community](https://discord.gg/B8BKcKMRm8)
- [Documentation](https://github.com/SamHatoum/auto-engineer/wiki)
- [Issue Tracker](https://github.com/SamHatoum/auto-engineer/issues)

<img referrerpolicy="no-referrer-when-downgrade" src="https://static.on.auto/a.png?x-pxid=3e68b410-a966-4c96-887b-34102030fd15&page=README.md" />
