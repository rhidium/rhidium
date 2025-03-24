import { InputUtils } from '@core';

const TimezoneOption = InputUtils.DateTime.timezoneAutoCompleteOption({
  name: 'timezone',
  description: 'Select a timezone from the available options',
  required: false,
});

export default TimezoneOption;
