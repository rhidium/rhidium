import moduleAlias from 'module-alias';

// Note: We can't use _moduleAliases in package.json as it doesn't support __dirname

// Changes should be reflected in tsconfig.json:
// tsconfig.json = Intellisense
// module-alias = Runtime

moduleAlias.addAliases({
  '@client': `${__dirname}/`,
  '@core': `${__dirname}/../core`,
  '@modules': `${__dirname}/../modules/`,
});
