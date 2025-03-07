import { BaseInteraction } from 'discord.js';
import { RunFunction } from '../base-command';
import { Client } from 'lib/client';
import { AvailableGuildInteraction, DMInteraction } from './interactions';

export type Controller<Params extends unknown[] = [], ReturnType = void> = (
  ...args: [...Params]
) => ReturnType;

export type CommandController<
  I extends BaseInteraction,
  AdditionalParams extends unknown[] = [],
> = Controller<
  [...Parameters<RunFunction<I>>, ...AdditionalParams],
  ReturnType<RunFunction<I>>
>;

export type DMCommandController<
  I extends BaseInteraction,
  AdditionalParams extends unknown[] = [],
> = Controller<
  [Client, DMInteraction<I>, ...AdditionalParams],
  ReturnType<RunFunction<I>>
>;

export type GuildCommandController<
  I extends BaseInteraction,
  AdditionalParams extends unknown[] = [],
> = Controller<
  [Client, AvailableGuildInteraction<I>, ...AdditionalParams],
  ReturnType<RunFunction<I>>
>;
