import {
  CommandMiddlewareFunction,
  Database,
  InteractionUtils,
  PermissionUtils,
  PermLevel,
} from '@core';

export const checkCommandDisabled: CommandMiddlewareFunction = async ({
  client,
  interaction,
  next,
}) => {
  if (!interaction.inGuild()) {
    return next();
  }

  const memberPermLevel = await PermissionUtils.resolveMemberPermissionLevel(
    client,
    interaction.member,
    interaction.guild,
  );

  if (memberPermLevel > PermLevel['Server Owner']) {
    return next();
  }

  const commandId = client.commandManager.resolveCommandId(interaction);
  const command = client.commandManager.commandById(commandId);

  if (!command) {
    return next();
  }

  const guild = await Database.Guild.resolve(interaction.guildId);
  if (guild.disabledCommands.includes(command.data.name)) {
    await InteractionUtils.replyEphemeral(interaction, {
      embeds: [
        client.embeds.error(
          `The command **\`${command.data.name}\`** has been disabled by an administrator, and cannot be used in this server.`,
        ),
      ],
    });
    return; // We don't call next, and therefor don't continue to the command
  }

  next();
};
