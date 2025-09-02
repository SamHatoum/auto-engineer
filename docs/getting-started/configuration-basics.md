# Configuration Basics

Auto Engineer uses a configuration file, `auto.config.ts`, to define plugins and resolve command alias conflicts. This guide covers the basics of setting up the configuration.

## Creating the Configuration File

In your project root, create an `auto.config.ts` file with the following structure:

`typescript export default { plugins: \[ '@auto-engineer/flow', '@auto-engineer/server-generator-apollo-emmett', '@auto-engineer/server-implementer', '@auto-engineer/frontend-generator-react-graphql', \], aliases: { // Optional: Override command aliases if conflicts arise // 'command:name': '@auto-engineer/package-name' }, }; `

### Key Configuration Options

- **plugins**: An array of plugin package names to load. Only include the plugins required for your project.
- **aliases**: An optional object to resolve command alias conflicts by mapping a command to a specific plugin package.

## Handling Plugin Conflicts

If multiple plugins register the same command alias, Auto Engineer will display an error. To resolve this, add an alias override in the `aliases` section of `auto.config.ts`. For example:

`typescript export default { plugins: \[ '@auto-engineer/package-a', '@auto-engineer/package-b', \], aliases: { 'conflicting:command': '@auto-engineer/package-a', }, }; `

## Next Steps

- Install the plugins listed in your configuration as described in Installation.
- Learn how to use CLI commands in CLI Guide.
