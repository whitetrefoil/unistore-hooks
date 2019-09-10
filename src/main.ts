import { createContext }                                           from 'preact';
import { useContext, useDebugValue, useEffect, useMemo, useState } from 'preact/hooks';
import { ActionFn, Listener, Store }                               from 'unistore';


// @see [typesafe-actions](https://github.com/piotrwitek/typesafe-actions)
export interface Types {
  // type RootState = ...
}

type RootState = Types extends { RootState: infer T } ? T : any;

// Use a local variable will cause problem if this lib and the code using it
// required two different 'preact.js', e.g. NPM not deduped properly.
// So use a global variable.
export const UnistoreContext = createContext<Store<any>|null>(null);

// declare global {
//   interface Window {
//     __WT_UNISTORE__CONTEXT__?: preact.Context<Store<any>|null>;
//   }
// }
//
// window.__WT_UNISTORE__CONTEXT__ = preact.createContext<Store<any>|null>(null);
//
export const UnistoreProvider: preact.Provider<Store<any>|null> = UnistoreContext.Provider;


export function useStore<K = RootState>(): Store<K> {
  const context = useMemo(() => UnistoreContext, []);
  const store = useContext(context);
  // const store = useContext(window.__WT_UNISTORE__CONTEXT__);
  if (store == null) {
    throw new Error('No unistore found!');
  }
  return store;
}


export type Selector<R, K = RootState> = (state: K) => R;


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


export type ActionFnAsync<K = RootState> = (state: K, store: Store<K>, ...args: any[]) => Promise<Partial<K>|void>|void;
export type ActionFnSync<K = RootState> = (state: K, store: Store<K>, ...args: any[]) => Partial<K>|void;
export type AnyAction<K = RootState> = ActionFnAsync<K>|ActionFnSync<K>;
export type AnyAC<K = RootState> = (...args: []) => AnyAction<K>;


export interface Dispatch<K = RootState> {
  (actionFn: ActionFnAsync<K>): Promise<void>;
  (actionFn: ActionFnSync<K>): void;
}

function dispatch<K = RootState>(actionFn: ActionFnAsync<K>): Promise<void>;
function dispatch<K = RootState>(actionFn: ActionFnSync<K>): void;
function dispatch<K = RootState>(actionFn: ActionFn<K>) {
  const store = useStore<K>();
  const state = store.getState();
  const mutated = actionFn(state, store);

  if (mutated == null) {
    return;
  }

  if (typeof (mutated as Promise<Partial<K>>).then === 'function') {
    return (mutated as Promise<Partial<K>>).then(res => {
      store.setState(res as Pick<K, keyof K>, false, actionFn);
    });
  }

  return store.setState(mutated as Pick<K, keyof K>, false, actionFn);
}


export function useDispatch<K = RootState>(): Dispatch<K> {
  return dispatch;
}
