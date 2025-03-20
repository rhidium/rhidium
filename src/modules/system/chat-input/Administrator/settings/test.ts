import { Prompts } from '@core';

export const stringTestPrompts: Prompts = [
  {
    type: 'string',
    id: 'string-required-single',
    name: 'Single Required String',
    multiple: false,
    required: true,
    defaultValue: 'Default String',
    minLength: 3,
    maxLength: 16,
  },
  {
    type: 'string',
    id: 'string-required-multiple',
    name: 'Multiple Required Strings',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 2,
    minLength: 3,
    maxLength: 16,
    defaultValue: ['Default String 1', 'Default String 2'],
  },
  {
    type: 'string',
    id: 'string-required-multiple-choices',
    name: 'Multiple Required Strings (Choices)',
    required: true,
    multiple: true,
    defaultValue: ['string3'],
    minValues: 1,
    maxValues: 2,
    choices: [
      { name: 'String Choice 1', value: 'string1' },
      { name: 'String Choice 2', value: 'string2' },
      { name: 'String Choice 3', value: 'string3' },
    ],
  },
];

export const numberTestPrompts: Prompts = [
  {
    type: 'number',
    id: 'number-required-single',
    name: 'Single Required Number',
    multiple: false,
    required: true,
    defaultValue: 8,
    minValue: 3,
    maxValue: 16,
  },
  {
    type: 'number',
    id: 'number-required-multiple',
    name: 'Multiple Required Numbers',
    required: true,
    multiple: true,
    minValues: 1,
    maxValues: 2,
    minValue: 3,
    maxValue: 16,
    defaultValue: [1, 2],
  },
  {
    type: 'number',
    id: 'number-required-multiple-choices',
    name: 'Multiple Required Numbers (Choices)',
    required: true,
    multiple: true,
    defaultValue: [3],
    minValues: 1,
    maxValues: 2,
    choices: [
      { name: 'Number 1', value: 1 },
      { name: 'Number 2', value: 2 },
      { name: 'Number 3', value: 3 },
    ],
  },
];

export const testPrompts: Prompts = [
  ...stringTestPrompts,
  ...numberTestPrompts,
  {
    type: 'role',
    id: 'role-required-single',
    name: 'Single Required Role',
    multiple: false,
    required: true,
    // defaultValue: 'Administrator',
  },
];
