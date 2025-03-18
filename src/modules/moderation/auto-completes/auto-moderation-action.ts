import {
  AutoCompleteOption,
  Database,
  InteractionUtils,
  PopulatedAutoModerationAction,
} from '@core';
import { ModerationServices } from '../services/moderation';

const AutoModerationActionOption =
  new AutoCompleteOption<PopulatedAutoModerationAction>({
    name: 'auto-moderation-action',
    description: 'Select an auto-moderation action',
    required: true,
    run: async (query, client, interaction) => {
      if (!InteractionUtils.requireAvailableGuild(client, interaction)) {
        return [];
      }

      const { guild: discordGuild } = interaction;
      const guild = await Database.Guild.resolve(discordGuild.id);
      const actions = guild.AutoModerationActions;

      if (!actions.length) {
        return [
          {
            name: 'No auto-moderation actions configured',
            value: 'null',
          },
        ];
      }

      const filtered = actions.filter(
        (action) =>
          action.action.toLowerCase().includes(query.toLowerCase()) ||
          action.actionDurationMs?.toString().includes(query) ||
          action.triggerThreshold.toString().includes(query),
      );

      if (!filtered.length) {
        return [
          {
            name: 'No auto-moderation actions found matching query',
            value: 'null',
          },
        ];
      }

      const options = filtered.map((action) => ({
        name: ModerationServices.stringifyAutoModerationAction(action),
        value: action.id.toString(),
      }));

      return options;
    },
    resolveValue: async (value, _client, interaction) => {
      const { guild: discordGuild } = interaction;

      if (!discordGuild || !discordGuild.available) {
        return null;
      }

      const guild = await Database.Guild.resolve(discordGuild.id);

      const action = guild.AutoModerationActions.find(
        (action) => action.id === Number(value),
      );

      return action ?? null;
    },
  });

export default AutoModerationActionOption;
