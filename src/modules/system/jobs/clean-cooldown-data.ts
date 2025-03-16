import { Database, Job } from '@core';

const CleanCooldownData = new Job({
  id: 'clean-cooldown-data',
  schedule: '0 0 * * *', // Every day at midnight
  run: async () => {
    const data = await Database.CommandCooldown.findMany();

    for (const entry of data) {
      const { duration } = entry;
      const now = Date.now();
      const initialLength = entry.usages.length;

      entry.usages = entry.usages.filter((usage) => {
        const diff = now - usage.valueOf();
        return diff < duration;
      });

      const finalLength = entry.usages.length;
      if (finalLength !== initialLength) {
        if (finalLength === 0) {
          await Database.CommandCooldown.delete({ id: entry.id });
        } else {
          await Database.CommandCooldown.update({
            where: { id: entry.id },
            data: { usages: entry.usages },
          });
        }
      }
    }
  },
});

export default CleanCooldownData;
