import { cooldownFromCache, prisma, updateCooldown } from '@client/database';
import {
  Lang,
  CommandCooldownType,
  CommandMiddlewareFunction,
  InteractionUtils,
  TimeUtils,
  cooldownResourceId,
} from '@lib';
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
  let cooldownEntry = await cooldownFromCache(cooldownId);
  if (!cooldownEntry) {
    cooldownEntry = await prisma.commandCooldown.create({
      data: { cooldownId, usages: [], duration: durationInMS },
    });
  }

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
    const expiresIn = TimeUtils.msToHumanReadableTime(remaining);
    const relativeOutput = expiresIn === '0 seconds' ? '1 second' : expiresIn;
    await InteractionUtils.replyDynamic(client, interaction, {
      content: Lang.t('lib:commands.onCooldown', {
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
  await updateCooldown(cooldownEntry, {
    data: { usages: cooldownEntry.usages },
  });

  next();
};
