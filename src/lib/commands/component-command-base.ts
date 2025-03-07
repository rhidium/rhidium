import { BaseInteraction } from 'discord.js';
import { BaseCommand, BaseCommandOptions } from './base-command';
import { ButtonCommand, ModalCommand, SelectMenuCommand } from '.';

export enum ComponentCommandType {
  BUTTON = 900,
  SELECT_MENU = 901,
  MODAL = 902,
}

export type ComponentCommand =
  | ComponentCommandBase
  | ButtonCommand
  | ModalCommand
  | SelectMenuCommand;

export const isComponentCommand = (item: unknown): item is ComponentCommand =>
  item instanceof ComponentCommandBase ||
  item instanceof ButtonCommand ||
  item instanceof ModalCommand ||
  item instanceof SelectMenuCommand;

export interface ComponentCommandOptions<
  I extends BaseInteraction = BaseInteraction,
> extends BaseCommandOptions<I>,
    ComponentCommandDataOptions {
  /**
   * Indicates if the Component is only usable by the member who initiated it, or everyone that can view the component
   * @default true
   */
  isUserComponent?: boolean;
}

export interface ComponentCommandDataOptions {
  /** The custom ID of the component */
  customId: string;
  type?: ComponentCommandType;
}

/**
 * Represents a command that is executed through a component, a button, modal, select-menu, etc.
 */
export class ComponentCommandBase<I extends BaseInteraction = BaseInteraction>
  extends BaseCommand<I>
  implements ComponentCommandOptions<I>
{
  isUserComponent: boolean;
  customId: string;
  type: ComponentCommandType;
  constructor(options: ComponentCommandOptions<I>) {
    super(options);
    this.isUserComponent = options.isUserComponent ?? true;
    this.data = { name: options.customId };
    this.customId = options.customId;
    this.type = options.type ?? ComponentCommandType.BUTTON;
  }
}
