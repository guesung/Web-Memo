import { useEffect } from 'react';

interface UsePropagateEventCallbackFn {
  pushStateCallbackFn?: EventListenerOrEventListenerObject;
  replaceStateCallbackFn?: EventListenerOrEventListenerObject;
}

interface CustomPropagateEvent extends Event {
  arguments: unknown[];
}

export default function usePropagateEvent({
  pushStateCallbackFn = () => {},
  replaceStateCallbackFn = () => {},
}: UsePropagateEventCallbackFn) {
  useEffect(() => {
    var _wr = function (type: keyof History) {
      var orig = history[type] as Function;
      return function (...args: unknown[]) {
        // @ts-ignore
        var rv = orig.apply(this, args);
        var event = new Event(type) as CustomPropagateEvent;
        event.arguments = args;
        window.dispatchEvent(event);
        return rv;
      };
    };

    history.pushState = _wr('pushState');
    history.replaceState = _wr('replaceState');

    window.addEventListener('replaceState', replaceStateCallbackFn);
    window.addEventListener('replaceState', pushStateCallbackFn);
    return () => {
      window.removeEventListener('replaceState', pushStateCallbackFn);
    };
  }, []);
}
