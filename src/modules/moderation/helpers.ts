import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from 'discord.js';
import { ModerationInputServices } from './services/input';
import { InputUtils } from '@core/utils/inputs';
import { StringUtils } from '@core/utils/common/strings';
import { WarnInteractions } from './constants';

export const warnModal = (user: User | null) => {
  if (user === null) {
    return new ModalBuilder()
      .setTitle('Warn')
      .setCustomId(WarnInteractions.WARN_MODAL_ID)
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId(WarnInteractions.WARN_REASON_INPUT_ID)
            .setStyle(TextInputStyle.Paragraph)
            .setLabel('Reason')
            .setPlaceholder('The reason why you are warning this user.')
            .setMinLength(5)
            .setMaxLength(200)
            .setRequired(true),
        ]),
        ModerationInputServices.severityTextInput(),
        InputUtils.Duration.durationTextInput({
          customId: WarnInteractions.WARN_VALID_FOR_INPUT_ID,
          label: 'Valid For',
          placeholder:
            'How long this warning counts towards the auto-moderation thresholds.',
          required: false,
        }),
      ]);
  }

  const safeDisplayName = StringUtils.truncate(user.displayName, 20);

  return new ModalBuilder()
    .setTitle(`Warn ${safeDisplayName}`)
    .setCustomId(`${WarnInteractions.WARN_MODAL_ID}@${user.id}`)
    .setComponents([
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
        new TextInputBuilder()
          .setCustomId(WarnInteractions.WARN_REASON_INPUT_ID)
          .setStyle(TextInputStyle.Paragraph)
          .setLabel('Reason')
          .setPlaceholder(
            `The reason why you're warning ${safeDisplayName}. They will be notified of this reason.`,
          )
          .setMinLength(5)
          .setMaxLength(200)
          .setRequired(true),
      ]),
      ModerationInputServices.severityTextInput(),
      InputUtils.Duration.durationTextInput({
        customId: WarnInteractions.WARN_VALID_FOR_INPUT_ID,
        label: 'Valid For',
        placeholder:
          'How long this warning counts towards the auto-moderation thresholds.',
        required: false,
      }),
    ]);
};
