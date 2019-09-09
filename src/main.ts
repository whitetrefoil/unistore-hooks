import { createContext }                                  from 'preact';
import { useContext, useDebugValue, useEffect, useState } from 'preact/hooks';
import { ActionFn, Listener, Store }                      from 'unistore';


// @see [typesafe-actions](https://github.com/piotrwitek/typesafe-actions)
export interface Types {
  // type RootState = ...
}

type RootState = Types extends { RootState: infer T } ? T : any;

export const UnistoreContext = createContext<Store<any>|null>(null);

export function useStore<K = RootState>(): Store<K> {
  const store = useContext(UnistoreContext);
  if (store == null) {
    throw new Error('No unistore found!');
  }
  return store;
}


type Selector<R, K = RootState> = (state: K) => R;


export function useSelector<R, K = RootState>(selector: Selector<R, K>): R {
  const store = useStore<K>();
  const state = store.getState();

  const [selected, setSelected] = useState<R>(selector(state));

  const listener: Listener<K> = s => {
    const newVal = selector(s);
    if (newVal !== selected) {
      setSelected(newVal);
    }
  };

  useEffect(() => {
    store.subscribe(listener);
    return () => {
      store.unsubscribe(listener);
    };
  }, []);

  useDebugValue(selected);
  return selected;
}


export function useSelectorFallback<R, F, K = RootState>(selector: Selector<R, K>, fallback: F): NonNullable<R>|F {
  const store = useStore<K>();
  const state = store.getState();
  const _selected = selector(state);
  const nonNullableSelected = _selected == null ? fallback : _selected as NonNullable<R>;

  const [selected, setSelected] = useState<NonNullable<R>|F>(nonNullableSelected);

  const listener: Listener<K> = s => {
    const newVal = selector(s);
    const nonNullNewVal = newVal == null ? fallback : newVal as NonNullable<R>;
    if (newVal !== selected) {
      setSelected(nonNullNewVal);
    }
  };

  useEffect(() => {
    store.subscribe(listener);
    return () => {
      store.unsubscribe(listener);
    };
  }, []);

  useDebugValue(selected);
  return selected;
}


type ActionFnAsync<K = RootState> = (state: K, ...args: any[]) => Promise<Partial<K>|void>;
type ActionFnSync<K = RootState> = (state: K, ...args: any[]) => Partial<K>|void;

export function useAction<K = RootState>(actionFn: ActionFnAsync<K>): Promise<void>;
export function useAction<K = RootState>(actionFn: ActionFnSync<K>): void;
export function useAction<K = RootState>(actionFn: ActionFn<K>) {
  const store = useStore<K>();
  const state = store.getState();
  const mutated = actionFn(state);
  if (typeof (mutated as Promise<Partial<K>>).then === 'function') {
    return (mutated as Promise<Partial<K>>).then(res => {
      store.setState(res as Pick<K, keyof K>, false, actionFn);
    });
  }
  return store.setState(mutated as Pick<K, keyof K>, false, actionFn);
}

type BoundAction<F> =
  F extends (state: infer K, ...args: infer A) => infer R ? (...args: A) => R
    : never;

export function usePrebindAction<K = RootState>(actionFn: (
  state: K,
) => Promise<Partial<K>|void>|Partial<K>|void): BoundAction<typeof actionFn>;
export function usePrebindAction<A1, K = RootState>(actionFn: (
  state: K,
  arg1: A1,
) => Promise<Partial<K>|void>|Partial<K>|void): BoundAction<typeof actionFn>;
export function usePrebindAction<A1, A2, K = RootState>(actionFn: (
  state: K,
  arg1: A1,
  arg2: A2,
) => Promise<Partial<K>|void>|Partial<K>|void): BoundAction<typeof actionFn>;
export function usePrebindAction<A1, A2, A3, K = RootState>(actionFn: (
  state: K,
  arg1: A1,
  arg2: A2,
  arg3: A3,
) => Promise<Partial<K>|void>|Partial<K>|void): BoundAction<typeof actionFn>;
export function usePrebindAction<A1, A2, A3, A4, K = RootState>(actionFn: (
  state: K,
  arg1: A1,
  arg2: A2,
  arg3: A3,
  arg4: A4,
) => Promise<Partial<K>|void>|Partial<K>|void): BoundAction<typeof actionFn>;
export function usePrebindAction<K = RootState>(actionFn: ActionFn<K>): any {
  const store = useStore<K>();
  const state = store.getState();

  return (...args: any[]) => {
    const mutated = actionFn(state, ...args);
    if (typeof (mutated as Promise<Partial<K>>).then === 'function') {
      return (mutated as Promise<Partial<K>>).then(res => {
        store.setState(res as Pick<K, keyof K>, false, actionFn);
      });
    }
    return store.setState(mutated as Pick<K, keyof K>, false, actionFn);
  };
}
