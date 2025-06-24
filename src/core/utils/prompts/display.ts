import { Prompt } from './types';

class PromptDisplay {
  private constructor() {}

  public static readonly sortByCategory = <P extends Prompt>(a: P, b: P) => {
    return a.display?.category === b.display?.category
      ? 0
      : a.display?.category === undefined
        ? 1
        : b.display?.category === undefined
          ? -1
          : a.display.category.localeCompare(b.display.category);
  };

  public static readonly groupByCategory = <P extends Prompt>(prompts: P[]) => {
    const grouped: Record<string, P[]> = {};

    prompts.forEach((prompt) => {
      const category = prompt.display?.category ?? 'Uncategorized';

      if (!grouped[category]) grouped[category] = [];

      grouped[category].push(prompt);
    });

    const alphabetical = Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return Object.fromEntries(alphabetical) as { [k: string]: P[] };
  };

  public static readonly getCategoryIndex = <P extends Prompt>(
    prompt: P,
    groupedPrompts: { [k: string]: P[] },
  ): number => {
    const category = prompt.display?.category ?? 'Uncategorized';

    return Object.keys(groupedPrompts).findIndex((c) => c === category);
  };
}

export { PromptDisplay };
