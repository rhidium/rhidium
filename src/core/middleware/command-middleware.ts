import { Client } from '../client';
import { BaseInteraction, ChatInputCommandInteraction } from 'discord.js';
import {
  CreateMiddleware,
  Middleware,
  MiddlewareContext,
  MiddlewareManager,
  MiddlewareRunFunction,
  createMiddleware,
} from '.';

export type RunResult = {
  data: Awaited<unknown> | unknown;
  success: boolean;
  error: Error | undefined;
};

export type CommandMiddlewareFunction = MiddlewareRunFunction<
  CommandMiddlewareContext<BaseInteraction>
>;

export type CommandMiddlewareFunctionWithResult = MiddlewareRunFunction<
  CommandMiddlewareContext<BaseInteraction, RunResult>
>;

export type ChatInputMiddlewareFunction = MiddlewareRunFunction<
  CommandMiddlewareContext<ChatInputCommandInteraction>
>;

export type CommandMiddlewareMetaContext = {
  invokedAt: Date;
  startRunTs: [number, number];
};

export type CommandMiddlewareContext<
  I extends BaseInteraction,
  CreateContext extends MiddlewareContext = MiddlewareContext,
> = MiddlewareContext &
  CommandMiddlewareMetaContext &
  CreateContext & {
    interaction: I;
    client: Client<true>;
    /**
     * I'm not gonna lie - I must have tried for over 6 hours to
     * get the this#Command available in the context, but it just
     * wouldn't work with our instantiated overloads.
     */
  };

export type RunExecutionReturnValuesOptions<
  I extends BaseInteraction,
  Context extends CommandMiddlewareContext<I>,
> = {
  value: unknown;
  middleware: CreateMiddleware<Context>[];
};

export type RunExecutionReturnValues<
  I extends BaseInteraction,
  Context extends CommandMiddlewareContext<I>,
> = {
  value: unknown;
  middleware: Middleware<Context>[];
};

export interface CommandMiddlewareOptions<
  I extends BaseInteraction,
  Context extends CommandMiddlewareContext<I>,
> {
  preRunChecks?: CreateMiddleware<Context>[];
  preRunThrottle?: CreateMiddleware<Context>[];
  preRunExecution?: CreateMiddleware<Context>[];
  postRunExecution?: CreateMiddleware<Context & RunResult>[];
  runExecutionReturnValues?: RunExecutionReturnValuesOptions<I, Context>[];
}

export class CommandMiddleware<
  I extends BaseInteraction,
  Context extends CommandMiddlewareContext<I>,
> extends MiddlewareManager<Context> {
  preRunChecks: Middleware<Context>[];
  preRunThrottle: Middleware<Context>[];
  preRunExecution: Middleware<Context>[];
  postRunExecution: Middleware<Context & RunResult>[];
  runExecutionReturnValues: RunExecutionReturnValues<I, Context>[];
  constructor(options: CommandMiddlewareOptions<I, Context>) {
    super();
    this.preRunChecks = options.preRunChecks?.map(createMiddleware) ?? [];
    this.preRunThrottle = options.preRunThrottle?.map(createMiddleware) ?? [];
    this.preRunExecution = options.preRunExecution?.map(createMiddleware) ?? [];
    this.postRunExecution =
      options.postRunExecution?.map(createMiddleware) ?? [];
    this.runExecutionReturnValues =
      options.runExecutionReturnValues?.map(({ value, middleware }) => {
        return {
          value,
          middleware: middleware.map(createMiddleware),
        };
      }) ?? [];
  }

  use = (middleware: CommandMiddlewareOptions<I, Context>) => {
    this.preRunChecks.push(
      ...(middleware.preRunChecks?.map(createMiddleware) ?? []),
    );
    this.preRunThrottle.push(
      ...(middleware.preRunThrottle?.map(createMiddleware) ?? []),
    );
    this.preRunExecution.push(
      ...(middleware.preRunExecution?.map(createMiddleware) ?? []),
    );
    this.postRunExecution.push(
      ...(middleware.postRunExecution?.map(createMiddleware) ?? []),
    );
    this.runExecutionReturnValues.push(
      ...(middleware.runExecutionReturnValues?.map(({ value, middleware }) => {
        return {
          value,
          middleware: middleware.map(createMiddleware),
        };
      }) ?? []),
    );
    return this;
  };
}
