import preact, { createContext }                                   from 'preact';
import { useContext, useDebugValue, useEffect, useMemo, useState } from 'preact/hooks';
import { Action, Listener, Store }                                 from 'unistore';


// @see [typesafe-actions](https://github.com/piotrwitek/typesafe-actions)
export interface Types {
  // type RootState = ...
}

type RootState = Types extends { RootState: infer T } ? T : any;

export const UnistoreContext = createContext<Store<any>|null>(null);

export const UnistoreProvider: preact.Provider<Store<any>|null> = UnistoreContext.Provider;

export function useStore<K = RootState>(): Store<K> {
  const context = useMemo(() => UnistoreContext, []);
  const store = useContext(context);
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
    setSelected(newVal);
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


interface ActionContext<K = RootState> {
  readonly state: K;
  readonly s: K;
  dispatch: Dispatch<K>;
  dis: Dispatch<K>;
  setState<U extends keyof K>(update: Pick<K, U>, overwrite?: boolean, action?: Action<K>): void;
  set<U extends keyof K>(update: Pick<K, U>, overwrite?: boolean, action?: Action<K>): void;
}

export type ActionFnAsync<K = RootState> = (context: ActionContext<K>, ...args: any[]) => Promise<Partial<K>|void>;
export type ActionFnSync<K = RootState> = (context: ActionContext<K>, ...args: any[]) => Partial<K>|void;
export type AnyAction<K = RootState> = ActionFnAsync<K>|ActionFnSync<K>;
export type AnyAC<K = RootState> = (...args: []) => AnyAction<K>;


export interface Dispatch<K = RootState> {
  (actionFn: ActionFnAsync<K>): Promise<void>;
  (actionFn: ActionFnSync<K>): void;
}

function dispatchFactory<K = RootState>(store: Store<K>): Dispatch<K> {
  function dispatch(actionFn: ActionFnAsync<K>): Promise<void>;
  function dispatch(actionFn: ActionFnSync<K>): void;
  function dispatch(actionFn: AnyAction<K>) {
    const state = store.getState();
    const context: ActionContext<K> = {
      state,
      s       : state,
      setState: store.setState,
      set     : store.setState,
      dispatch,
      dis     : dispatch,
    };
    const mutated = actionFn(context);

    if (mutated == null) {
      return;
    }

    if (typeof (mutated as Promise<Partial<K>>).then === 'function') {
      return (mutated as Promise<Partial<K>>).then(res => {
        store.setState(res as Pick<K, keyof K>, false, actionFn as any);
      });
    }

    return store.setState(mutated as Pick<K, keyof K>, false, actionFn as any);
  }

  return dispatch;
}


export function useDispatch<K = RootState>(): Dispatch<K> {
  const store = useStore();
  return useMemo(() => dispatchFactory(store), []);
}
