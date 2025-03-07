import { AnySelectMenuInteraction } from 'discord.js';
import {
  ComponentCommandBase,
  ComponentCommandOptions,
  ComponentCommandType,
} from './component-command-base';

/**
 * Represents a command that is executed through a Select Menu component
 */
export class SelectMenuCommand<
    I extends AnySelectMenuInteraction = AnySelectMenuInteraction,
  >
  extends ComponentCommandBase<I>
  implements ComponentCommandOptions<I>
{
  override type = ComponentCommandType.SELECT_MENU;
  constructor(options: ComponentCommandOptions<I>) {
    super(options);
  }
}
