import { ButtonInteraction } from 'discord.js';
import {
  ComponentCommandBase,
  ComponentCommandOptions,
  ComponentCommandType,
} from './component-command-base';

/**
 * Represents a command that is executed through a button component
 */
export class ButtonCommand<I extends ButtonInteraction = ButtonInteraction>
  extends ComponentCommandBase<I>
  implements ComponentCommandOptions<I>
{
  override type = ComponentCommandType.BUTTON;
  constructor(options: ComponentCommandOptions<I>) {
    super(options);
  }
}
