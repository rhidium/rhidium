import {
  Lang,
  CommandCooldownType,
  CommandMiddlewareFunction,
  InteractionUtils,
  TimeUtils,
  cooldownResourceId,
  Database,
} from '@core';
import { MessageFlags } from 'discord.js';

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

  await command.deferReplyInternal(interaction);

  const now = Date.now();
  const { cooldown } = command;
  const resourceId = cooldownResourceId(cooldown.type, interaction);
  const cooldownId = `${command.sourceHash}@${resourceId}`;
  const durationInMS = cooldown.duration;

  // Not cached because we have an expired-usage cleaning job
  const cooldownEntry =
    (await Database.CommandCooldown.byCooldownId(cooldownId)) ??
    (await Database.CommandCooldown.create({
      cooldownId,
      usages: [],
      duration: durationInMS,
    }));

  // [DEV] Cache keys legit don't include query LMAOOO
  // [DEV] !this.useCache || !cacheResult does NOT make sense
  // [DEV] The result of the operation.

  // Is on cooldown
  const nonExpiredUsages = cooldownEntry.usages.filter(
    (e) => e.valueOf() + durationInMS > now,
  );
  const activeUsages = nonExpiredUsages.length;
  if (nonExpiredUsages.length >= 1 && activeUsages >= cooldown.usages) {
    const firstNonExpired = nonExpiredUsages[0] as Date;
    const firstUsageExpires = new Date(
      firstNonExpired.valueOf() + durationInMS,
    );
    const remaining = firstUsageExpires.valueOf() - now;
    const expiresIn = TimeUtils.msToHumanReadable(remaining);
    const relativeOutput = expiresIn === '0 seconds' ? '1 second' : expiresIn;
    await InteractionUtils.replyDynamic(client, interaction, {
      content: Lang.t('core:commands.onCooldown', {
        type: CommandCooldownType[cooldown.type],
        expiresIn: relativeOutput,
      }),
      flags: [MessageFlags.Ephemeral],
    });
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
