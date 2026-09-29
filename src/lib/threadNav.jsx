import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  forgetThread,
  getThread,
  rememberThread,
  recallThread,
} from './threadHistoryApi.js';

// Which thread each agent has open, and how a screen is asked to reopen another one.
//
// **A CONTEXT RATHER THAN PROPS, because of where the sidebar lives.** Every agent
// screen renders its own `<Sidebar>` — seven components do — so passing the thread
// list down would mean threading the same four props through seven large files and
// keeping them in step forever. The sidebar reads this directly instead, and a screen
// only touches it for the two things that are genuinely its own business: saying which
// thread it has open, and picking up a request to reopen a different one.
//
// The state here is deliberately thin: an agent slug and a thread id. Everything a
// thread CONTAINS is always re-read from the backend, so nothing cached here can go
// stale in a way that shows a user old work.

const ThreadNavContext = createContext(null);

// A no-op shape, so a screen rendered outside the provider (a test harness, a
// server-render smoke check) reads sensible values instead of throwing on null.
const INERT = {
  openThreadIds: {},
  refreshKey: 0,
  openThread: () => {},
  noteThread: () => {},
  closeThread: () => {},
  resumeFor: () => null,
  resumeHandled: () => {},
  bumpThreads: () => {},
  startNewThread: () => {},
  newThreadToken: () => 0,
  recall: () => null,
};

export function useThreadNav() {
  return useContext(ThreadNavContext) || INERT;
}

// Navigation is deliberately NOT done here. The sidebar is what a thread is clicked
// in, and it already holds the app's `onSelectView`, so it switches view itself right
// after asking for the reopen. Routing it through this provider would mean handing
// the provider a callback that lives in the component it wraps.
export function ThreadNavProvider({ children }) {
  // agent slug → the thread id that agent currently has open.
  const [openThreadIds, setOpenThreadIds] = useState({});
  // agent slug → { threadId, token }. A screen watches this, hydrates, and clears it.
  // The token is what makes reopening the SAME thread twice work: without it the
  // value would be unchanged and no effect would fire, so a user who navigated away
  // and clicked the same thread again would get nothing.
  const [resume, setResume] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const tokenRef = useRef(0);

  const noteThread = useCallback((agent, threadId) => {
    if (!agent || !threadId) return;
    setOpenThreadIds((prev) =>
      prev[agent] === threadId ? prev : { ...prev, [agent]: threadId },
    );
    rememberThread(agent, threadId);
  }, []);

  const openThread = useCallback(
    (agent, threadId) => {
      if (!agent || !threadId) return;
      tokenRef.current += 1;
      setResume((prev) => ({ ...prev, [agent]: { threadId, token: tokenRef.current } }));
      noteThread(agent, threadId);
    },
    [noteThread],
  );

  // A thread that turned out not to exist any more — a 404 on reopen. Forgetting it
  // is what stops a deleted or mistyped id being retried on every single load.
  const closeThread = useCallback((agent) => {
    setOpenThreadIds((prev) => {
      if (!(agent in prev)) return prev;
      const next = { ...prev };
      delete next[agent];
      return next;
    });
    forgetThread(agent);
  }, []);

  const resumeFor = useCallback((agent) => resume[agent] || null, [resume]);

  const resumeHandled = useCallback((agent) => {
    setResume((prev) => {
      if (!(agent in prev)) return prev;
      const next = { ...prev };
      delete next[agent];
      return next;
    });
  }, []);

  // Called when a turn finishes: a thread that just gained a title, or moved to the
  // top of the list, should not sit stale in the sidebar behind the user.
  const bumpThreads = useCallback(() => setRefreshKey((k) => k + 1), []);

  // "Start a fresh thread in THIS agent", which is not the same as "New project".
  // New project throws the whole session away and goes back to the chooser; this
  // leaves every other agent exactly where it is and sends one of them back to its
  // own setup form. A user auditing a second product has not changed project.
  //
  // The open thread is forgotten as part of it — otherwise the next reload would
  // reopen the thread they just stepped away from, over the new one.
  const [newThread, setNewThread] = useState({});
  const startNewThread = useCallback(
    (agent) => {
      tokenRef.current += 1;
      setNewThread((prev) => ({ ...prev, [agent]: tokenRef.current }));
      closeThread(agent);
    },
    [closeThread],
  );
  const newThreadToken = useCallback((agent) => newThread[agent] || 0, [newThread]);

  const value = useMemo(
    () => ({
      openThreadIds,
      refreshKey,
      openThread,
      noteThread,
      closeThread,
      resumeFor,
      resumeHandled,
      bumpThreads,
      startNewThread,
      newThreadToken,
      recall: recallThread,
    }),
    [
      openThreadIds,
      refreshKey,
      openThread,
      noteThread,
      closeThread,
      resumeFor,
      resumeHandled,
      bumpThreads,
      startNewThread,
      newThreadToken,
    ],
  );

  return (
    <ThreadNavContext.Provider value={value}>{children}</ThreadNavContext.Provider>
  );
}

/**
 * Reopening a past thread, for one agent screen.
 *
 * All four screens reopen a thread the same way and differ only in what they do with
 * it, so the fetching, the two triggers, the 404 rule and the already-loaded guard
 * live here once and each screen supplies just its own `apply`.
 *
 * THERE ARE TWO TRIGGERS, and they are different events:
 *   - the user clicked a thread in the sidebar;
 *   - the page was refreshed and this browser had a thread open last time.
 * The second runs once, on mount, and only when `shouldRecall()` agrees — a screen
 * that is already mid-thread must never have it pulled out from under it.
 *
 * @param agent      The history slug ('pdp', 'email', 'meta-ad', 'foundation').
 * @param apply      Called with the thread payload. Put it on screen.
 * @param shouldRecall Read ONCE on mount. Return false to skip the refresh restore.
 * @param boundThreadId The thread this screen is TIED to, when it is tied to one.
 *   The Foundation and Email screens are handed their thread by the app, so on a
 *   refresh they must reopen THAT one — reopening whichever thread this browser
 *   last had would load one conversation while every turn streamed to another. The
 *   screens that mint their own id (PDP, Meta Ad) leave it unset and use the recall.
 * @returns {{loading: boolean, error: ?string, notFound: boolean, markLoaded: function}}
 *   `notFound` is the 404 on its own, because "there is no such thread" is a
 *   different answer from "the read failed" — a screen bound to a thread the backend
 *   has never seen should go and CREATE it, which a failed read must never trigger.
 *   `markLoaded(threadId)` is what a screen calls after it STARTS a new thread, so
 *   the sidebar can mark it and a refresh can find it again.
 */
export function useThreadResume(agent, { apply, shouldRecall, boundThreadId }) {
  const { resumeFor, resumeHandled, noteThread, closeThread, recall } = useThreadNav();
  const resume = resumeFor(agent);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // A 404 specifically, kept apart from `error`. "This thread does not exist" is not
  // a failure for every caller: a screen that was told to reopen a thread the
  // backend has never seen can legitimately go and CREATE it, where a screen told to
  // reopen one that failed to load must not.
  const [notFound, setNotFound] = useState(false);

  // Whichever thread is on screen. Guards against re-fetching the thread already
  // open — clicking the active row in the sidebar should do nothing, not reload.
  const loadedRef = useRef(null);
  // Held in refs so the effects below do not re-run when a screen re-renders and
  // hands in a freshly-created closure, which is every render.
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const shouldRecallRef = useRef(shouldRecall);
  shouldRecallRef.current = shouldRecall;

  const markLoaded = useCallback(
    (threadId) => {
      if (!threadId) return;
      loadedRef.current = threadId;
      noteThread(agent, threadId);
    },
    [agent, noteThread],
  );

  const load = useCallback(
    (threadId) => {
      if (!threadId || loadedRef.current === threadId) return;
      setLoading(true);
      setError(null);
      setNotFound(false);
      getThread(agent, threadId)
        .then((thread) => {
          applyRef.current?.(thread);
          markLoaded(thread.thread_id || threadId);
        })
        .catch((e) => {
          // A 404 means the id names no thread — forget it, or every later load
          // retries something that is not there. Anything else may well work next
          // time, so it is reported and the id is kept.
          if (e?.httpStatus === 404) {
            closeThread(agent);
            setNotFound(true);
          } else {
            setError(e?.message || 'Could not reopen that thread.');
          }
        })
        .finally(() => setLoading(false));
    },
    [agent, closeThread, markLoaded],
  );

  // Trigger 1 — the sidebar asked. `token` changes even when the same thread is
  // reopened, which is what makes clicking one twice work after navigating away.
  useEffect(() => {
    if (!resume) return;
    load(resume.threadId);
    resumeHandled(agent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume?.token]);

  // Trigger 2 — the refresh. Once per thread this screen is bound to, and never
  // over live work.
  //
  // It keys on `boundThreadId` rather than running purely on mount, because the
  // screens that have one are mounted BEFORE the app knows it: the app restores the
  // session, then hands the id down. An effect that only ran on mount would see an
  // empty id, do nothing, and never look again.
  const recalledRef = useRef(null);
  useEffect(() => {
    const target = boundThreadId === undefined ? recall(agent) : boundThreadId;
    if (!target || recalledRef.current === target) return;
    recalledRef.current = target;
    if (shouldRecallRef.current && !shouldRecallRef.current()) return;
    load(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundThreadId]);

  return { loading, error, notFound, markLoaded };
}

/**
 * "Start a fresh thread in this agent" — the sidebar's + New.
 *
 * Fires `handler` when that agent's + New is pressed, and NOT on mount: the token
 * starts at 0 and the first render records it, so only a real press moves it. A
 * screen's handler puts it back on its setup form with a new id; nothing is sent to
 * the backend, because a thread there only exists once init has run.
 */
export function useNewThread(agent, handler) {
  const { newThreadToken } = useThreadNav();
  const token = newThreadToken(agent);
  const seenRef = useRef(token);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (token === seenRef.current) return;
    seenRef.current = token;
    handlerRef.current?.();
  }, [token]);
}
