import { RepliableInteraction } from 'discord.js';
import { RunFunction } from '../base-command';
import { Client } from '../../client';
import { AvailableGuildInteraction, DMInteraction } from './interactions';

export type Controller<Params extends unknown[] = [], ReturnType = void> = (
  ...args: [...Params]
) => ReturnType;

export type CommandController<
  I extends RepliableInteraction,
  AdditionalParams extends unknown[] = [],
> = Controller<
  [...Parameters<RunFunction<I>>, ...AdditionalParams],
  ReturnType<RunFunction<I>>
>;

export type DMCommandController<
  I extends RepliableInteraction,
  AdditionalParams extends unknown[] = [],
> = Controller<
  [Client<true>, DMInteraction<I>, ...AdditionalParams],
  ReturnType<RunFunction<I>>
>;

export type GuildCommandController<
  I extends RepliableInteraction,
  AdditionalParams extends unknown[] = [],
> = Controller<
  [Client<true>, AvailableGuildInteraction<I>, ...AdditionalParams],
  ReturnType<RunFunction<I>>
>;
