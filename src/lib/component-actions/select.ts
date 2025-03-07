import { ActionOptionsNoType, ActionTypes, BaseAction } from '.';

export type SelectOption = {
  label: string;
  value: string;
};

export type SelectActionOptions = ActionOptionsNoType & {
  options: SelectOption[];
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
};

export class SelectAction extends BaseAction {
  type: ActionTypes = ActionTypes.Select;
}
