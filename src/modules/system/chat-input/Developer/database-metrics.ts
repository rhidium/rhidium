import {
  modelOperations,
  ChatInputCommand,
  Database,
  ModelOperation,
  modelEntries,
  PermLevel,
} from '@core';
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js';

const displayMetrics: ModelOperation[] = [
  ...modelOperations.filter(
    (operation) =>
      !operation.endsWith('Cache') &&
      !operation.endsWith('AndReturn') &&
      !operation.endsWith('OrThrow'),
  ),
];

const modelMetricsSubcommand = new SlashCommandSubcommandGroupBuilder()
  .setName('model')
  .setDescription('View metrics for a specific database model');

for (const [key, value] of modelEntries) {
  modelMetricsSubcommand.addSubcommand(
    new SlashCommandSubcommandBuilder()
      .setName(value.toLowerCase())
      .setDescription(`View metrics for the ${key} model`),
  );
}

const DatabaseMetricsCommand = new ChatInputCommand({
  permLevel: PermLevel['Bot Administrator'],
  data: new SlashCommandBuilder()
    .setName('database')
    .setDescription('View database information and metrics')
    .addSubcommandGroup(modelMetricsSubcommand)
    .addSubcommandGroup((group) =>
      group
        .setName('metrics')
        .setDescription('View metrics for database models')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('summary')
            .setDescription('Display a summary of all database models'),
        ),
    ),
  run: async (client, interaction) => {
    const subcommandGroup = interaction.options.getSubcommandGroup(true);
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommandGroup) {
      case 'metrics': {
        switch (subcommand) {
          case 'summary': {
            const linkToSubcommand =
              await client.commandManager.commandLink('database');

            await DatabaseMetricsCommand.reply(interaction, {
              embeds: [
                client.embeds.info({
                  title: 'Database Summary',
                  description:
                    'Displaying a summary of all database models and their metrics',
                  fields: await Promise.all(
                    modelEntries.map(async ([key, value]) => {
                      const accessor = Database[value];
                      const count = await accessor.count();
                      const metricsAvgFnRuntime = Object.entries(
                        accessor.trackers,
                      )
                        .filter(([key]) =>
                          displayMetrics.includes(key as ModelOperation),
                        )
                        .reduce(
                          (acc, [, value]) => {
                            if (value.metrics.totalRuns === 0) {
                              return acc;
                            }

                            return {
                              count: acc.count + value.metrics.totalRuns,
                              total: acc.total + value.metrics.totalTime,
                            };
                          },
                          {
                            count: 0,
                            total: 0,
                          },
                        );

                      const metricsAverageFunctionRuntime =
                        metricsAvgFnRuntime.count === 0
                          ? 'No runs yet'
                          : `${(metricsAvgFnRuntime.total / metricsAvgFnRuntime.count).toFixed(2)}ms`;
                      const linkSuffix = linkToSubcommand
                        ? '\n- ' +
                          linkToSubcommand.replace(
                            ':',
                            ` model ${value.toLowerCase()}:`,
                          )
                        : '';

                      return {
                        name: key,
                        value: `- Records: ${count}\n- Average operation runtime: ${metricsAverageFunctionRuntime}${linkSuffix}`,
                      };
                    }),
                  ),
                }),
              ],
            });
            break;
          }

          default: {
            await DatabaseMetricsCommand.reply(interaction, {
              content: 'Invalid subcommand',
            });
            break;
          }
        }
        break;
      }

      case 'model': {
        const model = modelEntries.find(
          ([, value]) => value.toLowerCase() === subcommand,
        )?.[1];

        if (!model) {
          await DatabaseMetricsCommand.reply(interaction, {
            content: 'Invalid model',
          });
          return;
        }

        const accessor = Database[model];
        const count = await accessor.count();
        const metrics = Object.entries(accessor.trackers)
          .filter(([key]) => displayMetrics.includes(key as ModelOperation))
          .map(([key, value]) => {
            if (value.metrics.totalRuns === 0) {
              return `  - \`${key}\`: No runs yet`;
            }

            return `  - \`${key}\`: ${value.metrics.totalTime}ms across ${value.metrics.totalRuns} runs (${value.metrics.totalTime / value.metrics.totalRuns} avg)`;
          })
          .join('\n');

        await DatabaseMetricsCommand.reply(interaction, {
          embeds: [
            client.embeds.info({
              title: `Database Metrics for ${model}`,
              description: `- Records: ${count}\n- Metrics:\n${metrics}`,
            }),
          ],
        });
        break;
      }

      default: {
        await DatabaseMetricsCommand.reply(interaction, {
          content: 'Invalid subcommand group',
        });
        break;
      }
    }
  },
});

export default DatabaseMetricsCommand;
