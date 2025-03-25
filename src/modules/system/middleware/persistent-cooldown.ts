import {
  Lang,
  CommandCooldownType,
  CommandMiddlewareFunction,
  InteractionUtils,
  TimeUtils,
  cooldownResourceId,
  Database,
} from '@core';

export const persistentCooldownMiddleware: CommandMiddlewareFunction = async ({
  client,
  interaction,
  next,
}) => {
  const { commandManager } = client;
  const commandId = commandManager.resolveCommandId(interaction);
  const command = commandManager.commandById(commandId);

  if (!command) return next();
  if (
    !command.cooldown ||
    !command.cooldown.enabled ||
    !command.cooldown.persistent
  )
    return next();

  if (interaction.isRepliable()) {
    await command.deferReplyInternal(interaction);
  }

  const now = Date.now();
  const { cooldown } = command;
  const resourceId = cooldownResourceId(cooldown.type, interaction);
  const cooldownId = `${command.sourceHash}@${resourceId}`;
  const durationInMs = cooldown.duration;

  // Not cached because we have an expired-usage cleaning job
  const cooldownEntry =
    (await Database.CommandCooldown.byCooldownId(cooldownId)) ??
    (await Database.CommandCooldown.create({
      cooldownId,
      usages: [],
      duration: durationInMs,
    }));

  // Is on cooldown
  const nonExpiredUsages = cooldownEntry.usages.filter(
    (e) => e.valueOf() + durationInMs > now,
  );
  const activeUsages = nonExpiredUsages.length;
  if (nonExpiredUsages.length >= 1 && activeUsages >= cooldown.usages) {
    const firstNonExpired = nonExpiredUsages[0] as Date;
    const firstUsageExpires = new Date(
      firstNonExpired.valueOf() + durationInMs,
    );
    const remaining = firstUsageExpires.valueOf() - now;
    const expiresIn = TimeUtils.humanReadableMs(remaining);
    const relativeOutput = expiresIn === '0 seconds' ? '1 second' : expiresIn;
    if (interaction.isRepliable()) {
      await InteractionUtils.replyDynamic(interaction, {
        content: Lang.t('core:commands.onCooldown', {
          type: CommandCooldownType[cooldown.type],
          expiresIn: relativeOutput,
        }),
      });
    }
    // Don't go next =)
    // Doesn't continue to next middleware, command is not executed
    return;
  }

  // Increment usages
  cooldownEntry.usages.push(new Date(now));
  await Database.CommandCooldown.update({
    where: { id: cooldownEntry.id },
    data: { usages: cooldownEntry.usages },
  });

  next();
};
