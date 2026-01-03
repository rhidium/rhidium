import type { APICommand } from "@core/commands/base";
import { SlashCommandStringOption } from "discord.js";

type CommandOrCategory = APICommand | string;

const data = new SlashCommandStringOption()
  .setName('command-or-category')
  .setDescription('Select a command or category')
  .setRequired(true)
  .setAutocomplete(true);

export {
  type CommandOrCategory,
  data as CommandOrCategoryData,
};
