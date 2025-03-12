import { ButtonBuilder, ButtonStyle } from 'discord.js';
import {
  ActionOptionsNoType,
  ActionTypes,
  BaseAction,
  ButtonColor,
  resolveButtonColor,
} from '.';

export type ButtonActionOptions = ActionOptionsNoType & {
  color: ButtonColor;
  disabled?: boolean;
  url?: string;
};

export class ButtonAction extends BaseAction {
  type: ActionTypes = ActionTypes.Button;
  buttonStyle: ButtonStyle;
  disabled: boolean;
  url: string | null;

  constructor(action: ButtonActionOptions) {
    super(action);
    this.buttonStyle = resolveButtonColor(action.color);
    this.disabled = action.disabled ?? false;
    this.url = action.url ?? null;
    if (this.url) this.buttonStyle = ButtonStyle.Link;
  }

  get button() {
    return this.build();
  }

  build = () => {
    const button = new ButtonBuilder()
      .setCustomId(this.resolvedComponentId())
      .setDisabled(this.disabled)
      .setStyle(this.buttonStyle);
    if (this.data.emoji) button.setEmoji(this.data.emoji);
    if (this.data.text) button.setLabel(this.data.text);
    if (this.url) button.setURL(this.url);
    return button;
  };
}
