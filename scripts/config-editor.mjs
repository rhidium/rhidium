import { readFileSync, writeFileSync } from 'fs';

(async () => {
  let jsonEditor;
  try  {
    jsonEditor = await import('@rhidium/json-editor');
  }
  catch {
    console.error('Please install @rhidium/json-editor: "pnpm run setup:config && pnpm run config-editor"');
    process.exit(1);
  }

  const dataFilePath = './config/config.json';
  try {
    readFileSync(dataFilePath, { encoding: 'utf-8' });
  }
  catch {
    writeFileSync(
      dataFilePath,
      readFileSync('./config/config.example.json', { encoding: 'utf-8' }),
      { encoding: 'utf-8' }
    );
  }

  const {
    startJSONEditor,
  } = jsonEditor;
  
  const jsonSchema = readFileSync('./config/config.schema.json', { encoding: 'utf-8' });
  
  startJSONEditor({
    port: 3000,
    dataFilePath,
    createBackup: true,
    schemaString: jsonSchema,
    // data: JSON.parse(readFileSync(dataFilePath, { encoding: 'utf-8' })),
  });
})();
