export interface StateHooks<TContext = unknown> {
  enter?: (context: TContext, prevState?: string) => void;
  update?: (context: TContext, delta: number) => void;
  exit?: (context: TContext, nextState?: string) => void;
}

export interface TransitionRule<TContext = unknown> {
  to: string;
  condition: (context: TContext) => boolean;
  guard?: (context: TContext) => boolean;
}
