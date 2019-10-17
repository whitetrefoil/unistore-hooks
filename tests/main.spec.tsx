import delay                                                                        from 'delay';
import * as preact                                                                  from 'preact';
import * as React                                                                   from 'preact/compat';
import { Fragment }                                                                 from 'preact/compat';
import { useContext }                                                               from 'preact/hooks';
import { act, teardown }                                                            from 'preact/test-utils';
import createStore                                                                  from 'unistore';
import { UnistoreContext, UnistoreProvider, useDispatch, useSelector, useSetState } from '../src/main';

jest.resetModules();

let container: HTMLDivElement|null = null;


afterEach(() => {
  container != null && document.body.removeChild(container);
  container = null;
  teardown();
});

async function render(elem: React.JSX.Element) {
  return act(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    preact.render(elem, container);
  });
}


test('useStore', () => {
  const store = createStore({ a: 1 });
  const Consumer = () => {
    const ctx = useContext(UnistoreContext);
    const a = ctx!.getState()!.a;
    return <Fragment>{a}</Fragment>;
  };
  const Debug = () => (
    <UnistoreProvider value={store}><Consumer/></UnistoreProvider>
  );

  render(<Debug/>);

  expect(container!.textContent).toBe('1');
});


describe('useSelector & useDispatch', () => {
  test('normal usage', async() => {
    const store = createStore({ a: 1 });
    const Consumer = () => {
      const dispatch = useDispatch();
      const a = useSelector(s => s.a);
      const onClick = () => dispatch(({ state, setState }) => {
        setState({
          ...state,
          a: state.a + 1,
        });
      });
      return (
        <div>
          <div id="result">{a}</div>
          <button id="action" onClick={onClick}>btn</button>
        </div>
      );
    };
    const Debug = () => (
      <UnistoreProvider value={store}><Consumer/></UnistoreProvider>
    );

    await render(<Debug/>);

    const result = container!.querySelector('#result');
    expect(result!.textContent).toBe('1');

    const button = container!.querySelector('#action') as HTMLButtonElement;
    await act(() => {
      button.click();
    });

    expect(result!.textContent).toBe('2');

    await act(() => {
      button.click();
    });

    expect(result!.textContent).toBe('3');
  });

  test('async', async() => {
    const store = createStore({});
    const Consumer = () => {
      const dispatch = useDispatch();
      const a = useSelector(s => s.a ?? 0);
      const b = useSelector(s => s.b ?? 0);
      const onClick = async() => {
        await dispatch(async({ state, setState }) => new Promise(resolve => {
          setTimeout(() => {
            setState({
              ...state,
              a: (state.a ?? 0) + 1,
            });
            resolve();
          }, 100);
        }));
        dispatch(({ s, set }) => {
          set({ ...s, b: 1 });
        });
      };
      return (
        <div>
          <div id="result">{a}</div>
          <div id="b">{b}</div>
          <button id="action" onClick={onClick}>btn</button>
        </div>
      );
    };
    const Debug = () => (
      <UnistoreProvider value={store}><Consumer/></UnistoreProvider>
    );

    await render(<Debug/>);

    const result = container!.querySelector('#result');
    const resultB = container!.querySelector('#b');
    expect(result!.textContent).toBe('0');
    expect(resultB!.textContent).toBe('0');

    const button = container!.querySelector('#action') as HTMLButtonElement;
    await act(() => {
      button.click();
    });

    expect(result!.textContent).toBe('0');
    expect(resultB!.textContent).toBe('0');

    await delay(50);
    expect(result!.textContent).toBe('0');
    expect(resultB!.textContent).toBe('0');

    await delay(100);
    expect(result!.textContent).toBe('1');
    expect(resultB!.textContent).toBe('1');

    await act(async() => {
      await button.click();
    });

    await delay(150);

    expect(result!.textContent).toBe('2');
  });

  test('ensure no react hooks in `dispatch`', async() => {
    const store = createStore({});
    const Consumer = () => {
      const dispatch = useDispatch();
      const a = useSelector(s => s.a);
      const b = useSelector(s => s.b);

      a != null && dispatch(({ s, set }) => set({ ...s, b: s.b ?? 1 }));

      const onClick = () => a != null
        ? dispatch(({ s, set }) => set({ b: s.b }, true))
        : dispatch(({ s, set }) => set({ b: s.b, a: 1 }));

      return (
        <div>
          <div id="a">{a}</div>
          <div id="b">{b}</div>
          <button id="action" onClick={onClick}>btn</button>
        </div>
      );
    };
    const Debug = () => (
      <UnistoreProvider value={store}><Consumer/></UnistoreProvider>
    );

    await render(<Debug/>);
    const a = container!.querySelector('#a')!;
    const b = container!.querySelector('#b')!;
    const action = container!.querySelector('#action') as HTMLButtonElement;

    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('1');
    expect(b.textContent).toBe('1');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('1');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('1');
    expect(b.textContent).toBe('1');
  });
});


describe('useSetState', () => {
  test('as patch', async() => {
    const store = createStore({});
    const Consumer = () => {
      const setState = useSetState();
      const a = useSelector(s => s.a);
      const b = useSelector(s => s.b);

      a != null && setState({ a, b: b ?? 1 });

      const onClick = () => a != null
        ? setState({ b }, true)
        : setState({ b, a: 1 });

      return (
        <div>
          <div id="a">{a}</div>
          <div id="b">{b}</div>
          <button id="action" onClick={onClick}>btn</button>
        </div>
      );
    };
    const Debug = () => (
      <UnistoreProvider value={store}><Consumer/></UnistoreProvider>
    );

    await render(<Debug/>);
    const a = container!.querySelector('#a')!;
    const b = container!.querySelector('#b')!;
    const action = container!.querySelector('#action') as HTMLButtonElement;

    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('1');
    expect(b.textContent).toBe('1');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('1');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('1');
    expect(b.textContent).toBe('1');
  })

  test('as function', async() => {
    const store = createStore({});
    const Consumer = () => {
      const setState = useSetState();
      const a = useSelector(s => s.a);
      const b = useSelector(s => s.b);

      a != null && setState(s => ({ ...s, b: b ?? 1 }));

      const onClick = () => a != null
        ? setState(s => ({ b }), true)
        : setState(s => ({ ...s, a: 1 }));

      return (
        <div>
          <div id="a">{a}</div>
          <div id="b">{b}</div>
          <button id="action" onClick={onClick}>btn</button>
        </div>
      );
    };
    const Debug = () => (
      <UnistoreProvider value={store}><Consumer/></UnistoreProvider>
    );

    await render(<Debug/>);
    const a = container!.querySelector('#a')!;
    const b = container!.querySelector('#b')!;
    const action = container!.querySelector('#action') as HTMLButtonElement;

    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('1');
    expect(b.textContent).toBe('1');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('1');

    await act(() => {
      action.click();
    });
    expect(a.textContent).toBe('1');
    expect(b.textContent).toBe('1');
  })
});
