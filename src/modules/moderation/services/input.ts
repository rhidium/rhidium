import {
  InteractionConstants,
  severityChoices,
  severityValues,
  StringUtils,
} from '@core';
import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  SlashCommandStringOption,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const minSeverityLength = severityValues.reduce(
  (acc, curr) => Math.min(acc, curr.length),
  Infinity,
);
const maxSeverityLength = severityValues.reduce(
  (acc, curr) => Math.max(acc, curr.length),
  0,
);

class ModerationInputServices {
  static readonly displaySeverity = severityValues
    .map(StringUtils.titleCase)
    .join(', ');

  static readonly addSeverityOptionHandler = (
    option: SlashCommandStringOption,
    options?: {
      required?: boolean;
      name?: string;
      description?: string;
    },
  ) =>
    option
      .setName(options?.name ?? 'severity')
      .setDescription(
        options?.description ??
          'The severity of the warning, which counts towards the auto-moderation thresholds.',
      )
      .setRequired(options?.required ?? true)
      .addChoices(severityChoices);

  static readonly severityTextInput = (options?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  }) => {
    const {
      label = 'Severity',
      placeholder = `The severity of the warning: ${this.displaySeverity}`,
      required = false,
    } = options ?? {};

    return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      [
        new TextInputBuilder()
          .setCustomId(InteractionConstants.WARN_SEVERITY_INPUT_ID)
          .setStyle(TextInputStyle.Short)
          .setLabel(label)
          .setPlaceholder(placeholder)
          .setMinLength(minSeverityLength)
          .setMaxLength(maxSeverityLength)
          .setRequired(required),
      ],
    );
  };
}

export { ModerationInputServices };
