import { ButtonStyle } from 'discord.js';

export type ButtonColor = 'blurple' | 'grey' | 'green' | 'red' | 'url'; // [DEV] Rename 'blurple' to 'blue'

export enum ActionTypes {
  Button = 0,
  Select = 1,
}

export type CommonActionProps = {
  type?: ActionTypes;
  componentId: string | ComponentIdCallback;
};

export type ActionWithText = {
  text: string;
  emoji: never;
};

export type ActionWithEmoji = {
  text: never;
  emoji: string;
};

export type ActionWithBoth = {
  text: string;
  emoji: string;
};

export type ComponentIdCallback = () => string;

export type ActionOptions = CommonActionProps &
  (ActionWithText | ActionWithEmoji | ActionWithBoth);

export type ActionOptionsNoType = Omit<ActionOptions, 'type'>;

export const resolveActionLabel = ({ emoji, text }: ActionOptions) =>
  `${emoji ?? ''}${emoji ? ' ' : ''}${text ?? ''}`;

export const resolveButtonColor = (color: string) =>
  color === 'blurple'
    ? ButtonStyle.Primary
    : color === 'green'
      ? ButtonStyle.Success
      : color === 'grey'
        ? ButtonStyle.Secondary
        : color === 'red'
          ? ButtonStyle.Danger
          : ButtonStyle.Primary;

export class BaseAction {
  label: string;
  data: ActionOptions;
  componentId: string | ComponentIdCallback;

  constructor(action: ActionOptions) {
    this.data = action;
    this.label = resolveActionLabel(action);
    this.componentId = action.componentId;
  }

  isButton = () => this.data.type === ActionTypes.Button;

  isSelect = () => this.data.type === ActionTypes.Select;

  resolvedComponentId = () => {
    if (typeof this.componentId === 'function') {
      return this.componentId();
    }
    return this.componentId;
  };
}
