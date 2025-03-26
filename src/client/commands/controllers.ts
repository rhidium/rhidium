import { BaseInteraction } from 'discord.js';
import { CommandRunFunction } from './types';

type Controller<Params extends unknown[] = [], ReturnType = void> = (
  ...args: [...Params]
) => ReturnType;

type CommandController<
  ReturnType,
  I extends BaseInteraction,
  Params extends unknown[] = [],
> = Controller<
  [...Parameters<CommandRunFunction<ReturnType, I>>, ...Params],
  ReturnType
>;

export { type Controller, type CommandController };
