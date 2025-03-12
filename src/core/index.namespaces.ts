/**
 * Provides exports as namespaces, primarily used for typedoc documentation, never imported in the library itself.
 * Typedoc documentation could alternatively use multiple entry points which would create the namespaces for us.
 */
export * as MClient from './client';
export * as Commands from './commands/index.namespaces';
export * as ComponentActions from './component-actions';
export * as Constants from './constants';
export * as DataStructures from './data-structures';
export * as Language from './i18n';
export * as Jobs from './jobs';
export * as Logger from './logger';
export * as Managers from './managers';
export * as Middleware from './middleware';
export * as Utils from './utils';
