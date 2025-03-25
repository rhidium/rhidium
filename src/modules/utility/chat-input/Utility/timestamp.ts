import { ChatInputCommand, Database, InputUtils, UnitConstants } from '@core';
import { SlashCommandBuilder, TimestampStylesString } from 'discord.js';
import TimezoneOption from '../../auto-completes/timezone';
import { stripIndents } from 'common-tags';

const timestampStyle = {
  relative: 'R',
  short_time: 't',
  long_time: 'T',
  short_date: 'd',
  long_date: 'D',
  long_date_with_short_time: 'f',
  long_date_with_day_of_week: 'F',
  full: ['f', 'R'],
} as const;

type TimestampType = keyof typeof timestampStyle;

type TimestampStyle =
  | TimestampStylesString
  | readonly [TimestampStylesString, TimestampStylesString];

const timestampStyleFromType = (type: TimestampType): TimestampStyle => {
  return timestampStyle[type];
};

const formatDateWithStyle = (utcDate: Date, style: TimestampStyle) => {
  return typeof style === 'string'
    ? `<t:${Math.floor(utcDate.getTime() / UnitConstants.MS_IN_ONE_SECOND)}:${style}>`
    : `<t:${Math.floor(utcDate.getTime() / UnitConstants.MS_IN_ONE_SECOND)}:${style[0]}> (<t:${Math.floor(utcDate.getTime() / UnitConstants.MS_IN_ONE_SECOND)}:${style[1]}>)`;
};

const timestampStyleChoices = [
  { name: 'Relative', value: 'relative' },
  { name: 'Short Time', value: 'short_time' },
  { name: 'Long Time', value: 'long_time' },
  { name: 'Short Date', value: 'short_date' },
  { name: 'Long Date', value: 'long_date' },
  {
    name: 'Long Date with Short Time',
    value: 'long_date_with_short_time',
  },
  {
    name: 'Long Date with Day of the Week',
    value: 'long_date_with_day_of_week',
  },
  {
    name: 'Full (Relative + Long Date with Short Time)',
    value: 'full',
  },
];

const TimestampCommand = new ChatInputCommand({
  guildOnly: false,
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription(
      'Display a timestamp for a given date with timezone (UTC by default)',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription(
          'Display general information about the timestamp command',
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('convert')
        .setDescription('Convert a given date to a timestamp')
        .addStringOption((option) =>
          option
            .setName('date')
            .setDescription(
              'The date(s) to convert, any human-like date format (e.g. "tomorrow from 3pm to 5pm")',
            )
            .setRequired(true),
        )
        .addStringOption(TimezoneOption.addOptionHandler)
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('The type of output to display, defaults to "Full"')
            .addChoices(timestampStyleChoices),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('timezone')
        .setDescription('Set your timezone for the timestamp command')
        .addStringOption(TimezoneOption.addOptionHandler),
    ),
  run: async (client, interaction) => {
    const { options, channel } = interaction;
    const subcommand = options.getSubcommand();

    switch (subcommand) {
      case 'timezone': {
        const [user, timezone] = await Promise.all([
          Database.User.resolve(interaction.user.id),
          TimezoneOption.getValue(interaction, false),
          TimestampCommand.deferReplyInternal(interaction),
        ]);

        if (timezone === null) {
          await TimestampCommand.reply(interaction, {
            embeds: [
              client.embeds.info({
                title: 'Timezone',
                description: stripIndents`
                  Your timezone is ${
                    user.timezone
                      ? `currently set to **\`${user.timezone}\`**.`
                      : `not set. You can set your timezone using the timezone sub-command: ${await client.commandManager.commandLink(
                          'timestamp',
                          'timezone',
                        )}`
                  }
                `,
              }),
            ],
          });
          return;
        }

        await Promise.all([
          Database.User.update({
            where: { id: interaction.user.id },
            data: { timezone },
          }),
          TimestampCommand.reply(interaction, {
            embeds: [
              client.embeds.success({
                title: 'Timezone Set',
                description: stripIndents`
                  Your timezone has been set to **\`${timezone}\`**. The timestamp command will now use this timezone by default. You can still provide a timezone when using the command to override this setting.
                `,
              }),
            ],
          }),
        ]);
        break;
      }

      case 'convert': {
        const date = options.getString('date') ?? 'now';
        let [timezone] = await Promise.all([
          TimezoneOption.getValue(interaction, false),
          TimestampCommand.deferReplyInternal(interaction),
        ]);
        const type = (options.getString('type') ?? 'full') as TimestampType;

        if (timezone === null) {
          const user = await Database.User.resolve(interaction.user.id);

          if (!user.timezone) {
            await TimestampCommand.reply(interaction, {
              embeds: [
                client.embeds.error({
                  title: 'No Timezone Set',
                  description: stripIndents`
                    You have not configured a timezone. Please set a timezone using ${await client.commandManager.commandLink('timestamp', 'timezone')}, or provide a timezone while using the command.
                  `,
                }),
              ],
            });
            return;
          }

          timezone = user.timezone;
        }

        const resolved = InputUtils.DateTime.parseHumanDateTimeInput({
          input: date,
          timezone,
          referenceDate: new Date(),
        });

        if (typeof resolved === 'undefined' || !resolved.length) {
          await TimestampCommand.reply(interaction, {
            embeds: [
              client.embeds.error({
                title: 'Invalid Date',
                description: stripIndents`
                  Please provide a valid date (or date range) to convert to a timestamp. The following formats are supported:
                  - *Today, Tomorrow, Yesterday, Last Friday, etc*
                  - *17 August 2013 - 19 August 2013*
                  - *This Friday from 13:00 - 16.00*
                  - *From 2PM to 5PM*
                  - *2 weeks from now*
                  - *in 5 minutes*
                  - *Sat Aug 17 2013 18:40:39 GMT+0900 (JST)*
                  - *2014-11-30T08:15:30-05:30*
                `,
              }),
            ],
          });
          return;
        }

        let referenceDate: Date | null = null;
        let outputString = '';
        const timestampStyle = timestampStyleFromType(type);

        for (const [_referenceDate, startDateUTC, endDateUTC] of resolved) {
          referenceDate = _referenceDate;

          let formatted;
          if (endDateUTC) {
            formatted = `**From:** ${formatDateWithStyle(startDateUTC, timestampStyle)}\n**To:** ${formatDateWithStyle(endDateUTC, timestampStyle)}`;
          } else {
            formatted = formatDateWithStyle(startDateUTC, timestampStyle);
          }

          outputString += `\n\n${formatted}`;
        }

        await TimestampCommand.reply(interaction, {
          embeds: [
            client.embeds.success({
              title: 'Timestamp Conversion',
              description: stripIndents`
                The date **\`${date}\`** has been converted to the following timestamp(s):${outputString}
                
                **Type:** \`${type}\`
                **Timezone:** \`${timezone}\`
                **Reference Date (Timezone Now):** ${referenceDate ? referenceDate.toLocaleString('en-US', { timeZone: timezone }) : 'Unknown'}
              `,
            }),
          ],
        });

        outputString +=
          '\n\n> *The above timestamp(s) are displayed in your local timezone, you do not need to convert them. When replying with a local time, make sure to include your time-zone.*';

        if (channel && !channel.isDMBased()) {
          await channel.send({
            content: outputString,
          });
        }

        break;
      }

      case 'info':
      default: {
        await TimestampCommand.reply(interaction, {
          embeds: [
            client.embeds.info({
              title: 'Timestamp Command',
              description: stripIndents`
                The timestamp command allows you to convert a given date to a timestamp.
                By default, the timezone is set to UTC. You can change the timezone by providing a valid timezone (UTC, GMT, etc).
    
                The command uses [\`wanasit/chrono\`](https://github.com/wanasit/chrono), a natural language date parser, which supports the following formats:
                - *Today, Tomorrow, Yesterday, Last Friday, etc*
                - *17 August 2013 - 19 August 2013*
                - *This Friday from 13:00 - 16.00*
                - *5 days ago*
                - *2 weeks from now*
                - *in 5 minutes*
                - *Sat Aug 17 2013 18:40:39 GMT+0900 (JST)*
                - *2014-11-30T08:15:30-05:30*
                - ... And other (human) date(-time) formats
            `,
            }),
          ],
        });
        break;
      }
    }
  },
});

export default TimestampCommand;
