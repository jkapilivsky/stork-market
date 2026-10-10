"use client";

// The /vote "experience" for one very special guest. Every trap ends after a
// few attempts, so the guess always gets saved eventually.
import { useEffect, useRef, useState } from "react";
import { useEvent } from "./EventProvider";
import type { Gender } from "./model";

export function isChaosGuest(name: string | undefined) {
  return Boolean(
    name &&
      name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .includes("alvaro"),
  );
}

type Stage = "cookies" | "partners" | "pick" | "tiny" | "loading";
const other = (g: Gender): Gender => (g === "boy" ? "girl" : "boy");

export function ChaosVote() {
  const [stage, setStage] = useState<Stage>("cookies");
  const [choice, setChoice] = useState<Gender | null>(null);
  return (
    <div className="chaos">
      <div className="chaos-marquee" aria-hidden="true">
        <span>
          ⚠️ LIMITED TIME OFFER ⚠️ YOUR GUESS IS VERY IMPORTANT TO US ⚠️ PLEASE
          HOLD ⚠️ 1 OTHER PERSON IS VIEWING THIS BABY ⚠️
        </span>
      </div>
      {stage === "cookies" && (
        <Cookies
          onAccept={() => setStage("partners")}
          onReject={() => setStage("pick")}
        />
      )}
      {stage === "partners" && <Partners onDone={() => setStage("pick")} />}
      {stage === "pick" && (
        <Pick
          choice={choice}
          setChoice={setChoice}
          onDone={() => setStage("tiny")}
        />
      )}
      {stage === "tiny" && choice && (
        <Tiny choice={choice} onDone={() => setStage("loading")} />
      )}
      {stage === "loading" && choice && <Loading choice={choice} />}
    </div>
  );
}

function Cookies({
  onAccept,
  onReject,
}: {
  onAccept: () => void;
  onReject: () => void;
}) {
  const [dodges, setDodges] = useState(0);
  const [pos, setPos] = useState({ left: 70, top: 88 });
  function dodge() {
    if (dodges >= 4) return false;
    setDodges((d) => d + 1);
    setPos({ left: 5 + Math.random() * 70, top: 10 + Math.random() * 80 });
    return true;
  }
  return (
    <section className="chaos-card chaos-cookies">
      <h2>🍪 We value your privacy*</h2>
      <p className="chaos-fine">
        *We do not. By guessing you agree to share your guess, your vibes, your
        aunt&apos;s phone number, and the name of your first pet with 847
        trusted partners, the stork, and Kevin.
      </p>
      <button className="chaos-mega" onClick={onAccept}>
        ACCEPT ALL &amp; MAKE ME HAPPY 😍
      </button>
      <button
        className="chaos-runaway"
        style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
        onPointerEnter={(e) => e.pointerType === "mouse" && dodge()}
        onClick={() => {
          if (!dodge()) onReject();
        }}
      >
        {dodges >= 4 ? "ugh fine, reject" : "reject (sad)"}
      </button>
    </section>
  );
}

function Partners({ onDone }: { onDone: () => void }) {
  const partners = Array.from({ length: 40 }, (_, i) => i);
  const [checked, setChecked] = useState(() => new Set(partners));
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState("");
  return (
    <section className="chaos-card chaos-partners">
      <h2>Manage your 847 partners</h2>
      <p className="chaos-fine">Showing 40 of 847. Uncheck to opt out.</p>
      <div className="chaos-partner-list">
        {partners.map((i) => (
          <label key={i}>
            <input
              type="checkbox"
              checked={checked.has(i)}
              onChange={() => {
                const next = new Set(checked);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                // Opting out of one partner opts you in to a neighbor.
                next.add((i + 7) % partners.length);
                setChecked(next);
              }}
            />
            {PARTNER_NAMES[i % PARTNER_NAMES.length]} #{i + 1}
          </label>
        ))}
      </div>
      {msg && <p className="chaos-msg">{msg}</p>}
      <button
        className="chaos-tiny-btn"
        onClick={() => {
          if (tries < 2) {
            setTries(tries + 1);
            setMsg(
              tries === 0
                ? "Error 418: I'm a teapot. Please try again."
                : "Your preferences have been saved! (They have not.) Try once more.",
            );
            setChecked(new Set(partners));
          } else onDone();
        }}
      >
        save preferences
      </button>
    </section>
  );
}

function Pick({
  choice,
  setChoice,
  onDone,
}: {
  choice: Gender | null;
  setChoice: (g: Gender | null) => void;
  onDone: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [misclicks, setMisclicks] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [msg, setMsg] = useState("Please select an option below ↓ (it's above)");
  useEffect(() => {
    const swap = setInterval(() => setFlipped((f) => !f), 1300);
    const toggle = setInterval(() => setEnabled((e) => !e), 700);
    return () => {
      clearInterval(swap);
      clearInterval(toggle);
    };
  }, []);
  const order: Gender[] = flipped ? ["girl", "boy"] : ["boy", "girl"];
  function pick(g: Gender) {
    if (misclicks < 2) {
      setMisclicks(misclicks + 1);
      setChoice(other(g));
      setMsg(`Got it! You picked ${other(g).toUpperCase()} 👍`);
    } else {
      setChoice(g);
      setMsg(`Fine. ${g.toUpperCase()}. Happy now?`);
    }
  }
  function next() {
    if (!choice) {
      setMsg("You must select an option before you can select an option.");
      return;
    }
    const lines = [
      "Are you sure?",
      "Are you SURE sure?",
      "Processing… jk. Click again.",
      "Our continue button is experiencing high demand.",
    ];
    if (clicks < lines.length) {
      setMsg(lines[clicks]);
      setClicks(clicks + 1);
    } else onDone();
  }
  return (
    <section className="chaos-card chaos-pick">
      <h2>Wat is ur gues??</h2>
      <p className="chaos-msg">{msg}</p>
      <div className="chaos-choices">
        {order.map((g) => (
          <button
            key={g}
            className={`chaos-choice is-${g} ${choice === g ? "is-on" : ""}`}
            onClick={() => pick(g)}
          >
            {g === "boy" ? "B0Y" : "G1RL"}
          </button>
        ))}
      </div>
      <button
        className="chaos-mega"
        onClick={() => {
          setChoice(null);
          setMisclicks(0);
          setMsg("Oops! That was the 'erase my answer' button 🙃");
        }}
      >
        CONTINUE ➜
      </button>
      <button
        className="chaos-tiny-btn chaos-blinky"
        disabled={!enabled}
        onClick={next}
      >
        next ›
      </button>
    </section>
  );
}

function Tiny({ choice, onDone }: { choice: Gender; onDone: () => void }) {
  const [tooBig, setTooBig] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [checked, setChecked] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const wasBig = useRef(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => {
      const big = vv.scale >= 1.8;
      if (big && !wasBig.current) {
        wasBig.current = true;
        setTooBig(true);
      } else if (!big && vv.scale < 1.25 && wasBig.current) {
        wasBig.current = false;
        setTooBig(false);
        setRounds((r) => r + 1);
      }
    };
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    if (!checked || timedOut) return;
    const t = setTimeout(() => {
      setChecked(false);
      setTimedOut(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [checked, timedOut]);
  const shrunk = rounds < 2;
  return (
    <>
      <section className={`chaos-card chaos-tiny ${shrunk ? "is-shrunk" : ""}`}>
        <h2>Confirm your guess</h2>
        <p>
          You guessed <strong>{choice.toUpperCase()}</strong>. Please confirm
          below that you do not not want to confirm.
        </p>
        {!shrunk && <p className="chaos-msg">fine. FINE. here, normal size.</p>}
        <label className="chaos-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I have read and agree to not disagree
        </label>
        {timedOut && !checked && (
          <p className="chaos-msg">Session timed out 😬 Please check again.</p>
        )}
        <button
          className="chaos-tiny-btn"
          disabled={!checked}
          onClick={onDone}
        >
          confirm
        </button>
      </section>
      {shrunk && (
        <button
          className="chaos-hidden-zoom"
          onClick={() => {
            setTooBig(true);
            setTimeout(() => {
              setTooBig(false);
              setRounds((r) => r + 1);
            }, 1800);
          }}
        >
          🔍 can&apos;t read it? zoom in
        </button>
      )}
      {tooBig && (
        <div className="chaos-zoom-wall" role="alert">
          TOO ZOOMED IN 😵‍💫
          <small>please zoom out to continue</small>
        </div>
      )}
    </>
  );
}

function Loading({ choice }: { choice: Gender }) {
  const { submit } = useEvent();
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("Uploading your guess to the stork…");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);
  useEffect(() => {
    const steps: [number, number, string][] = [
      [400, 37, "Uploading your guess to the stork…"],
      [900, 71, "Consulting the baby…"],
      [1500, 99, "Almost there…"],
      [3300, 12, "Recalculating vibes 🔮"],
      [4300, 64, "Asking Kevin…"],
      [5200, 100, "Done! (for real)"],
    ];
    const timers = steps.map(([ms, p, l]) =>
      setTimeout(() => {
        setPct(p);
        setLabel(l);
      }, ms),
    );
    const save = setTimeout(async () => {
      if (saving.current) return;
      saving.current = true;
      try {
        await submitRef.current({ action: "vote", vote: choice });
      } catch (e) {
        saving.current = false;
        setError(e instanceof Error ? e.message : "Please try again.");
      }
    }, 5600);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(save);
    };
  }, [choice, attempt]);
  return (
    <section className="chaos-card chaos-loading">
      <h2>{label}</h2>
      <div className="chaos-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="chaos-fine">{pct}%</p>
      {error && (
        <>
          <p className="chaos-msg">{error}</p>
          <button
            className="chaos-tiny-btn"
            onClick={() => {
              setError("");
              setAttempt((a) => a + 1);
            }}
          >
            try again (real button, promise)
          </button>
        </>
      )}
    </section>
  );
}

const PARTNER_NAMES = [
  "The Stork LLC",
  "Big Diaper",
  "Kevin",
  "Grandma's Group Chat",
  "Baby Name Brokers Inc.",
  "Pacifier Analytics",
  "Onesie Data Co.",
  "Your Mom",
];
