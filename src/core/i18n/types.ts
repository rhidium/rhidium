import type { ParseKeys } from "i18next";
import type { ns } from ".";

// @ts-expect-error - 'i18next' module augmentation
export type LocalizedLabelKey = ParseKeys<typeof ns>;
