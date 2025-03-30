import { ClientJob, CommandThrottleType } from '@client/commands';
import { Command } from '@client/commands/base';
import { CommandType } from '@client/commands/types';
import { Embeds } from '@client/config';
import { UnitConstants } from '@client/constants';
import { Logger } from '@client/logger';
import { PermLevel } from '@client/commands/permissions';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const testMap: Map<string, number> = new Map();

const choices = Array.from({ length: 10 }, (_, i) => ({
  label: `Test select ${i + 1}`,
  value: `test_select_${i + 1}`,
  description: `Test select ${i + 1}`,
  emoji: '✅',
}));

const TestAutoComplete = new Command({
  type: CommandType.AutoComplete,
  data: (builder) =>
    builder.setName('test-autocomplete').setDescription('Test command'),
  run: async (_client, interaction) => {
    const query = interaction.options.getFocused();
    const filtered = choices.filter((choice) =>
      choice.label.toLowerCase().includes(query.toLowerCase()),
    );
    const options = filtered.map((choice) => ({
      name: choice.label,
      value: choice.value,
    }));
    await interaction.respond(options);
  },
});

const TestChatInput = new Command({
  type: CommandType.ChatInput,
  permissions: {
    level: PermLevel.Developer,
    client: [PermissionFlagsBits.SendMessages],
    user: [PermissionFlagsBits.ViewAuditLog],
    whitelist: {
      guilds: ['1148585850007994388'],
      categories: ['1222669266113921116'],
      channels: ['1182012252715499591'],
      users: ['1148597817498140774'],
      roles: ['1222898693498470502'],
    },
  },
  throttle: {
    enabled: true,
    type: CommandThrottleType.User,
    duration: UnitConstants.MS_IN_ONE_SECOND * 5,
    limit: 1,
  },
  enabled: {
    global: true,
    guildOnly: true,
    guilds: ['1148585850007994388'],
  },
  interactions: {
    replyEphemeral: true,
    refuseUncached: true,
  },
  data: (builder) =>
    builder
      .setName('test')
      .setDescription('Test command')
      .addSubcommandGroup((group) =>
        group
          .setName('group')
          .setDescription('Test subcommand group')
          .addSubcommand((subcommand) =>
            subcommand
              .setName('subcommand')
              .setDescription('Test subcommand')
              .addStringOption(TestAutoComplete.data),
          ),
      ),
  controllers: {
    group: {
      subcommand: async (client, interaction) => {
        Logger.debug(client.user.username, TestChatInput.data.name);

        await TestChatInput.reply(interaction, {
          embeds: [Embeds.primary('Test command')],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              TestButton.data,
            ),
          ],
        });

        return ['TEST'] as const;
      },
    },
  },
});

// Note: Inherit the TestChatInput options and register as a child command
TestAutoComplete.extends(TestChatInput);

const TestButton = TestChatInput.extend({
  type: CommandType.Button,
  data: new ButtonBuilder()
    .setCustomId('Test button')
    .setLabel('Test button')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('✅')
    .setDisabled(false),
  run: async (_client, interaction) => {
    const currentCount = testMap.get(interaction.user.id) ?? 0;
    const isPrompt =
      currentCount !== 0 && (currentCount % 3 === 0 || currentCount % 5 === 0);
    const newCount = currentCount + (isPrompt ? 0 : 1);

    testMap.set(interaction.user.id, newCount);

    const ctx = {
      content: 'Test button',
      embeds: [Embeds.primary(`You have clicked the button ${newCount} times`)],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          TestButton.data.setLabel(`Clicked ${newCount} times`),
        ),
      ],
    };

    if (!isPrompt) {
      await interaction.update(ctx);
    } else if (currentCount % 3 === 0) {
      await interaction.showModal(TestModal.data);
    } else {
      await interaction.reply({
        ...ctx,
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            TestSelect.data.setPlaceholder(
              `Test select (${currentCount} times)`,
            ),
          ),
        ],
      });
    }
  },
});

const TestModal = TestChatInput.extend({
  type: CommandType.ModalSubmit,
  data: new ModalBuilder()
    .setCustomId('Test modal')
    .setTitle('Test modal')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('Test input')
          .setLabel('Test input')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Test input')
          .setMinLength(1)
          .setMaxLength(100)
          .setRequired(true),
      ),
    ),
  run: async (_client, interaction) => {
    const input = interaction.fields.getTextInputValue('Test input');
    const currentCount = testMap.get(interaction.user.id) ?? 0;
    const newCount = currentCount + 1;

    testMap.set(interaction.user.id, newCount);

    return TestChatInput.response({
      content: 'Test modal',
      embeds: [
        Embeds.primary(
          `You have clicked the button ${newCount} times`,
        ).addFields({
          name: 'Input',
          value: input,
        }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          TestButton.data.setLabel(`Clicked ${newCount} times`),
        ),
      ],
    });
  },
});

const TestSelect = TestChatInput.extend({
  type: CommandType.StringSelect,
  data: new StringSelectMenuBuilder()
    .setCustomId('Test select')
    .setPlaceholder('Test select')
    .setMinValues(1)
    .setMaxValues(1)
    .setDisabled(false)
    .setOptions(choices),
  run: async (_client, interaction) => {
    const selected = interaction.values[0];
    const currentCount = testMap.get(interaction.user.id) ?? 0;
    const newCount = currentCount + 1;

    testMap.set(interaction.user.id, newCount);

    return TestChatInput.response({
      content: 'Test select',
      embeds: [
        Embeds.primary(
          `You have clicked the button ${newCount} times`,
        ).addFields({
          name: 'Selected',
          value: `${selected ?? 'None'}`,
        }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          TestButton.data.setLabel(`Clicked ${newCount} times`),
        ),
      ],
    });
  },
});

TestChatInput.extend({
  type: CommandType.PrimaryEntryPoint,
  enabled: {
    global: false,
  },
  data: (builder) =>
    builder
      .setName('test-entry-point-1')
      .setDescription('Test command, Primary Entry Point'),
  run: async () => {
    return ['TEST'] as const;
  },
});

const everyFiveSeconds = '*/5 * * * * *';

export const TestJob = new ClientJob({
  id: 'test-job',
  cronTime: everyFiveSeconds,
  runOnInit: true,
  start: true,
  async onTick() {},
});

export default TestChatInput;
