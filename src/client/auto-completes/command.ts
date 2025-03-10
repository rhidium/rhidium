import { Lang } from 'lib/i18n';
import {
  APICommandType,
  AutoCompleteOption,
  PermissionUtils,
} from '@rhidium/core';

export enum CommandAutoCompleteQueryType {
  CATEGORY = 'category',
  SLASH = 'slash',
  USER_CONTEXT = 'user_context',
  MESSAGE_CONTEXT = 'message_context',
}

const CommandOption = new AutoCompleteOption<APICommandType>({
  name: 'command',
  description: 'Select a command',
  required: true,
  run: async (query, client, interaction) => {
    const { member, guild } = interaction;
    const memberPermLevel = await PermissionUtils.resolveMemberPermLevel(
      client,
      member,
      guild,
    );
    const commands = client.commandManager.chatInput.filter(
      (c) =>
        c.data.name.indexOf(query) >= 0 &&
        client.commandManager.isAppropriateCommandFilter(
          c,
          member,
          memberPermLevel,
        ),
    );
    const userCtxCommands = client.commandManager.userContextMenus.filter(
      (c) =>
        c.data.name.indexOf(query) >= 0 &&
        client.commandManager.isAppropriateCommandFilter(
          c,
          member,
          memberPermLevel,
        ),
    );
    const messageCtxCommands = client.commandManager.messageContextMenus.filter(
      (c) =>
        c.data.name.indexOf(query) >= 0 &&
        client.commandManager.isAppropriateCommandFilter(
          c,
          member,
          memberPermLevel,
        ),
    );

    const categories = [...new Set(commands.map((c) => c.category))].filter(
      (e) => e !== null && e.indexOf(query) >= 0,
    );

    return [
      ...categories.map((c) => ({
        name: `${Lang.t('general:componentNames.category')}: ${c}`,
        value: `${CommandAutoCompleteQueryType.CATEGORY}@${c}`,
      })),
      ...commands.map((c) => ({
        name: `${Lang.t('general:componentNames.slash')} ${Lang.t('general:componentNames.command')}: ${c.data.name}`,
        value: `${CommandAutoCompleteQueryType.SLASH}@${c.data.name}`,
      })),
      ...userCtxCommands.map((c) => ({
        name: `${Lang.t('general:componentNames.userContext')}: ${c.data.name}`,
        value: `${CommandAutoCompleteQueryType.USER_CONTEXT}@${c.data.name}`,
      })),
      ...messageCtxCommands.map((c) => ({
        name: `${Lang.t('general:componentNames.messageContext')}: ${c.data.name}`,
        value: `${CommandAutoCompleteQueryType.MESSAGE_CONTEXT}@${c.data.name}`,
      })),
    ];
  },
});

export default CommandOption;
