import { Middleware, MiddlewareContext } from '.';

class MiddlewareManager<Context extends MiddlewareContext> {
  private previousResult: unknown;
  async runMiddleware<C extends Context>(
    context: C,
    middlewares: Middleware<C>[],
  ) {
    if (middlewares.length === 0) return true;
    for (const middleware of middlewares.filter((e) => e.disabled !== true)) {
      let nextCalled = false;
      const next = () => (nextCalled = true);
      const runtimeCtx = Object.assign(context, {
        next,
        previousResult: this.previousResult,
        previousMiddleware:
          middlewares[middlewares.indexOf(middleware) - 1] ?? null,
        nextMiddleware:
          middlewares[middlewares.indexOf(middleware) + 1] ?? null,
      });
      const returnValue = await middleware.run(runtimeCtx, context);
      this.previousResult = returnValue;
      if (!nextCalled) return false;
    }
    return true;
  }
}

export { MiddlewareManager };
