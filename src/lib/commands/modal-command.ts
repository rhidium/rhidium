import { ModalSubmitInteraction } from 'discord.js';
import {
  ComponentCommandBase,
  ComponentCommandOptions,
  ComponentCommandType,
} from './component-command-base';

/**
 * Represents a command that is executed through a modal component
 */
export class ModalCommand<
    I extends ModalSubmitInteraction = ModalSubmitInteraction,
  >
  extends ComponentCommandBase<I>
  implements ComponentCommandOptions<I>
{
  override type = ComponentCommandType.MODAL;
  constructor(options: ComponentCommandOptions<I>) {
    super(options);
  }
}
