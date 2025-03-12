import { UnitConstants } from './units';

export class DiscordConstants {
  static readonly MESSAGE_CONTENT_MAX_LENGTH = 2000;
  static readonly SELECT_MENU_MAX_OPTIONS = 25;
  static readonly AUTOCOMPLETE_MAX_DATA_OPTIONS = 25;
  static readonly MS_UNTIL_INTERACTION_EXPIRES =
    UnitConstants.MS_IN_ONE_SECOND * 3;
  static readonly MAX_AUTO_COMPLETE_COMMAND_CHOICES = 25;
  static readonly UNKNOWN_INTERACTION_ERROR_CODE = 10062;
}
