import React from 'react';

// The five schematics for the Email Marketing Agent documentation page.
//
// THE DIAGRAMS CARRY THE STRUCTURE. The prose beside them explains craft and
// judgement; anything about how the parts fit together — what reads what, what
// is handed to whom, what never happens — belongs in a drawing here rather than
// in another paragraph there.
//
// Same conventions as MetaAdDocDiagrams.jsx, so the two pages read as one set:
// every colour is `currentColor` or a `--doc-*` custom property (never a hex),
// accent marks the agent and what it is given, warm marks what never happens.
//
// SPACING RULES OF THUMB, so a later edit does not re-crowd them:
//   · sub-text lines sit 18px apart, never less — 16 read as a wall
//   · a box keeps >= 14px between its last line of text and its own bottom edge
//   · boxes in a row are >= 24px apart; an arrow needs 26px of clear run
//   · viewBox width stays near 1040, which is roughly 1:1 with the rendered
//     page — widening it shrinks every label instead of spacing anything out

function Arrow({ id, fill = 'currentColor' }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 8"
      refX="9"
      refY="4"
      markerWidth="8"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <polygon points="0,0 10,4 0,8" fill={fill} />
    </marker>
  );
}

/** 01 — five inputs, the agent, three tabs. */
export function DiagramContext() {
  return (
    <svg
      viewBox="0 0 1040 500"
      role="img"
      aria-label="Five inputs — your Company Blueprint, your homepage's pictures and look, your answers to the opening questions, images you upload, and files you attach — feed the Email Marketing Agent, which fills three tabs: Strategy, Content and Design."
    >
      <defs>
        <Arrow id="de1-a" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the five inputs ---- */}
      <rect x="20" y="48" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="76" fontSize="13" fill="currentColor">Company Blueprint</text>
      <text className="svg-sub" x="38" y="98" fontSize="11.5" fill="currentColor" opacity=".62">brand bible &middot; buyer personas</text>

      <rect x="20" y="134" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="162" fontSize="13" fill="currentColor">Your homepage</text>
      <text className="svg-sub" x="38" y="184" fontSize="11.5" fill="currentColor" opacity=".62">its pictures, colours and type</text>

      <rect x="20" y="220" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="248" fontSize="13" fill="currentColor">Your answers</text>
      <text className="svg-sub" x="38" y="270" fontSize="11.5" fill="currentColor" opacity=".62">to the opening questions</text>

      <rect x="20" y="306" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="334" fontSize="13" fill="currentColor">Images you upload</text>
      <text className="svg-sub" x="38" y="356" fontSize="11.5" fill="currentColor" opacity=".62">photography for this campaign</text>

      <rect x="20" y="392" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="420" fontSize="13" fill="currentColor">Files you attach</text>
      <text className="svg-sub" x="38" y="442" fontSize="11.5" fill="currentColor" opacity=".62">a brief, a rival&rsquo;s email</text>

      {/* ---- five routes in ---- */}
      <line x1="208" y1="82" x2="432" y2="82" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de1-a)" />
      <text className="svg-mono" x="320" y="72" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">copied in at the start</text>

      <line x1="208" y1="168" x2="432" y2="168" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de1-a)" />
      <text className="svg-mono" x="320" y="158" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">read once</text>

      <line x1="208" y1="254" x2="432" y2="254" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de1-a)" />
      <text className="svg-mono" x="320" y="244" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">asked once</text>

      <line x1="208" y1="340" x2="432" y2="340" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de1-a)" />
      <text className="svg-mono" x="320" y="330" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">placed in the email</text>

      <line x1="208" y1="426" x2="432" y2="426" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#de1-a)" />
      <text className="svg-mono" x="320" y="416" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">context only</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="44" width="224" height="420" rx="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="80" fontSize="16" fill="currentColor" textAnchor="middle">Email Agent</text>
      <line x1="460" y1="96" x2="636" y2="96" stroke="currentColor" strokeOpacity=".25" />
      <text className="svg-sub" x="548" y="124" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">You talk to it in chat.</text>
      <text className="svg-sub" x="548" y="146" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">It plans the campaign, then</text>
      <text className="svg-sub" x="548" y="168" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">sends a copywriter and a</text>
      <text className="svg-sub" x="548" y="190" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">designer to work on it.</text>

      <rect x="460" y="216" width="176" height="54" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="238" fontSize="11.5" fill="currentColor" textAnchor="middle">One email,</text>
      <text className="svg-label" x="548" y="258" fontSize="11.5" fill="currentColor" textAnchor="middle">or a sequence of them</text>

      <text className="svg-sub" x="548" y="304" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Each tab is owned by</text>
      <text className="svg-sub" x="548" y="326" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">exactly one specialist &mdash;</text>
      <text className="svg-sub" x="548" y="348" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">nobody else writes it.</text>

      <text className="svg-sub" x="548" y="386" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">It never sends anything.</text>
      <text className="svg-sub" x="548" y="408" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">The finished email goes to</text>
      <text className="svg-sub" x="548" y="430" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">your own sending tool.</text>

      {/* ---- the three tabs ---- */}
      <line x1="660" y1="254" x2="796" y2="254" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de1-a)" />
      <text className="svg-mono" x="728" y="242" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">fill in as</text>
      <text className="svg-mono" x="728" y="270" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">the turn runs</text>

      <rect x="800" y="76" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="108" fontSize="13" fill="currentColor">Strategy</text>
      <text className="svg-sub" x="818" y="130" fontSize="11" fill="currentColor" opacity=".62">the plan, who it&rsquo;s for,</text>
      <text className="svg-sub" x="818" y="148" fontSize="11" fill="currentColor" opacity=".62">and any warnings</text>

      <rect x="800" y="212" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="244" fontSize="13" fill="currentColor">Content</text>
      <text className="svg-sub" x="818" y="266" fontSize="11" fill="currentColor" opacity=".62">subject lines, the copy,</text>
      <text className="svg-sub" x="818" y="284" fontSize="11" fill="currentColor" opacity=".62">buttons and A/B tests</text>

      <rect x="800" y="348" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="380" fontSize="13" fill="currentColor">Design</text>
      <text className="svg-sub" x="818" y="402" fontSize="11" fill="currentColor" opacity=".62">the finished email,</text>
      <text className="svg-sub" x="818" y="420" fontSize="11" fill="currentColor" opacity=".62">ready to preview</text>

      <text className="svg-sub" x="910" y="470" fontSize="11" fill="currentColor" opacity=".5" textAnchor="middle">three tabs on one canvas</text>
    </svg>
  );
}

/** 02 — the opening questions: what is never asked, what is, who acts on it. */
export function DiagramQuestions() {
  return (
    <svg
      viewBox="0 0 1040 600"
      role="img"
      aria-label="The opening questions. On the left, what the Blueprint and homepage already settle — voice and claims, who buys, colours and type, the pictures on hand — which is never asked. In the middle, what only you know, asked once: how many emails and over how long, which is always asked, then what prompts the send, how well readers know you, what is on offer, what proof exists, how it should look, and house rules. On the right, the three specialists who act on each answer."
    >
      <defs>
        <Arrow id="de2-a" />
        <Arrow id="de2-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">ALREADY SETTLED &mdash; NEVER ASKED</text>
      <text className="svg-tag" x="360" y="26" fontSize="10.5" fill="var(--doc-accent)">ONLY YOU KNOW &mdash; ASKED ONCE</text>
      <text className="svg-tag" x="736" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHO ACTS ON THE ANSWER</text>

      {/* ---- what the brand context already answers ---- */}
      <rect x="20" y="48" width="290" height="440" rx="10" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="5 4" />

      <text className="svg-label" x="40" y="82" fontSize="12.5" fill="currentColor" opacity=".8">Brand Bible</text>
      <text className="svg-sub" x="40" y="102" fontSize="11" fill="currentColor" opacity=".55">voice, claims, what you may and</text>
      <text className="svg-sub" x="40" y="120" fontSize="11" fill="currentColor" opacity=".55">may not say</text>

      <text className="svg-label" x="40" y="168" fontSize="12.5" fill="currentColor" opacity=".8">Buyer Personas</text>
      <text className="svg-sub" x="40" y="188" fontSize="11" fill="currentColor" opacity=".55">who buys, what they worry about,</text>
      <text className="svg-sub" x="40" y="206" fontSize="11" fill="currentColor" opacity=".55">what makes them act</text>

      <text className="svg-label" x="40" y="254" fontSize="12.5" fill="currentColor" opacity=".8">Design identity</text>
      <text className="svg-sub" x="40" y="274" fontSize="11" fill="currentColor" opacity=".55">colours, type, button styles</text>

      <text className="svg-label" x="40" y="322" fontSize="12.5" fill="currentColor" opacity=".8">Your homepage&rsquo;s pictures</text>
      <text className="svg-sub" x="40" y="342" fontSize="11" fill="currentColor" opacity=".55">what the brand can already show</text>

      <line x1="40" y1="380" x2="290" y2="380" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="40" y="406" fontSize="11" fill="currentColor" opacity=".7">Anything about the business itself</text>
      <text className="svg-sub" x="40" y="424" fontSize="11" fill="currentColor" opacity=".7">&mdash; revenue, team, budget, tools &mdash;</text>
      <text className="svg-sub" x="40" y="442" fontSize="11" fill="currentColor" opacity=".7">is never asked either. Anything it</text>
      <text className="svg-sub" x="40" y="460" fontSize="11" fill="currentColor" opacity=".7">can look up, it searches for instead.</text>

      <line x1="310" y1="268" x2="356" y2="268" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de2-a)" />
      <text className="svg-mono" x="333" y="256" fontSize="9.5" fill="currentColor" opacity=".6" textAnchor="middle">the gap</text>

      {/* ---- what only the user knows ---- */}
      <rect x="360" y="48" width="320" height="440" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />

      <rect x="378" y="64" width="284" height="64" rx="7" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-tag" x="394" y="84" fontSize="9" fill="var(--doc-accent)">ALWAYS ASKED</text>
      <text className="svg-label" x="394" y="104" fontSize="12.5" fill="var(--doc-accent)">How many emails, over how long</text>
      <text className="svg-sub" x="394" y="120" fontSize="10.5" fill="var(--doc-accent)" opacity=".85">&ldquo;let the strategist decide&rdquo; is always an option</text>

      <text className="svg-sub" x="394" y="160" fontSize="11.5" fill="var(--doc-accent)">What&rsquo;s prompting this send, and who</text>
      <text className="svg-sub" x="394" y="178" fontSize="11.5" fill="var(--doc-accent)">it&rsquo;s going to</text>
      <text className="svg-sub" x="394" y="206" fontSize="11.5" fill="var(--doc-accent)">How well those readers already</text>
      <text className="svg-sub" x="394" y="224" fontSize="11.5" fill="var(--doc-accent)">know you</text>
      <text className="svg-sub" x="394" y="252" fontSize="11.5" fill="var(--doc-accent)">What&rsquo;s on offer, and what they</text>
      <text className="svg-sub" x="394" y="270" fontSize="11.5" fill="var(--doc-accent)">should do about it</text>
      <text className="svg-sub" x="394" y="298" fontSize="11.5" fill="var(--doc-accent)">What you can back it up with</text>
      <text className="svg-sub" x="394" y="326" fontSize="11.5" fill="var(--doc-accent)">How it should look and read</text>
      <text className="svg-sub" x="394" y="354" fontSize="11.5" fill="var(--doc-accent)">House rules &mdash; emojis, first names,</text>
      <text className="svg-sub" x="394" y="372" fontSize="11.5" fill="var(--doc-accent)">discounts, A/B variants</text>

      <line x1="378" y1="398" x2="662" y2="398" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="394" y="422" fontSize="10.5" fill="var(--doc-accent)" opacity=".9">Where to look first, not a checklist.</text>
      <text className="svg-sub" x="394" y="440" fontSize="10.5" fill="var(--doc-accent)" opacity=".9">Usually three to seven questions &mdash;</text>
      <text className="svg-sub" x="394" y="458" fontSize="10.5" fill="var(--doc-accent)" opacity=".9">no quota, never padded to reach one.</text>

      {/* ---- the three readers ---- */}
      <line x1="680" y1="112" x2="732" y2="112" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#de2-c)" />
      <line x1="680" y1="268" x2="732" y2="268" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#de2-c)" />
      <line x1="680" y1="424" x2="732" y2="424" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#de2-c)" />

      <rect x="736" y="56" width="284" height="112" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="754" y="84" fontSize="13" fill="currentColor">The strategist</text>
      <text className="svg-sub" x="754" y="106" fontSize="11" fill="currentColor" opacity=".68">The kind of email, how many, what</text>
      <text className="svg-sub" x="754" y="124" fontSize="11" fill="currentColor" opacity=".68">sets each one off, the hook, and</text>
      <text className="svg-sub" x="754" y="142" fontSize="11" fill="currentColor" opacity=".68">which persona it&rsquo;s for.</text>

      <rect x="736" y="212" width="284" height="112" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="754" y="240" fontSize="13" fill="currentColor">The copywriter</text>
      <text className="svg-sub" x="754" y="262" fontSize="11" fill="currentColor" opacity=".68">May not invent proof &mdash; so it can</text>
      <text className="svg-sub" x="754" y="280" fontSize="11" fill="currentColor" opacity=".68">only use the stories, numbers and</text>
      <text className="svg-sub" x="754" y="298" fontSize="11" fill="currentColor" opacity=".68">reviews you say you have.</text>

      <rect x="736" y="368" width="284" height="112" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="754" y="396" fontSize="13" fill="currentColor">The designer</text>
      <text className="svg-sub" x="754" y="418" fontSize="11" fill="currentColor" opacity=".68">Already has your colours and type.</text>
      <text className="svg-sub" x="754" y="436" fontSize="11" fill="currentColor" opacity=".68">What it lacks is the shape and the</text>
      <text className="svg-sub" x="754" y="454" fontSize="11" fill="currentColor" opacity=".68">length the email should take.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="524" x2="1020" y2="524" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="552" fontSize="12.5" fill="var(--doc-accent)">Asked once, never again.</text>
      <text className="svg-sub" x="186" y="552" fontSize="12" fill="currentColor" opacity=".7">Every answer is optional. A question earns its place only if a different answer would</text>
      <text className="svg-sub" x="20" y="574" fontSize="12" fill="currentColor" opacity=".7">visibly change the email you get back &mdash; anything merely interesting is left out.</text>
    </svg>
  );
}

/** 03 — one message: the strategist decides, then copy and/or design, then a wrap-up. */
export function DiagramTurn() {
  return (
    <svg
      viewBox="0 0 1040 740"
      role="img"
      aria-label="One conversation turn: your message goes to the campaign strategist, which either answers and stops, or writes or updates the plan and sends the copywriter, the designer, or both — copy always first. Both specialists read the whole conversation. A short wrap-up then says what actually changed. Each box states what that step is given."
    >
      <defs>
        <Arrow id="de3-a" />
        <Arrow id="de3-c" fill="var(--doc-accent)" />
        <Arrow id="de3-w" fill="var(--doc-warm)" />
      </defs>

      {/* ---- the conversational half ---- */}
      <rect x="20" y="52" width="170" height="156" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="105" y="110" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="105" y="130" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="105" y="156" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or answers, an image</text>
      <text className="svg-sub" x="105" y="173" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">to use, or a file</text>

      <line x1="190" y1="130" x2="216" y2="130" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de3-a)" />

      <rect x="220" y="52" width="520" height="156" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="240" y="82" fontSize="13.5" fill="var(--doc-accent)">The campaign strategist</text>
      <text className="svg-sub" x="240" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Replies to you, decides what the message needs, and writes the plan.</text>
      <line x1="240" y1="118" x2="720" y2="118" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="240" y="140" fontSize="10.5" fill="var(--doc-accent)">Given: your brand and personas, your answers, your homepage&rsquo;s pictures, every file</text>
      <text className="svg-sub" x="240" y="158" fontSize="10.5" fill="var(--doc-accent)">you have sent, the whole conversation &mdash; and a status of what is already drafted</text>
      <text className="svg-sub" x="240" y="176" fontSize="10.5" fill="var(--doc-accent)">and designed, which it trusts over its own memory.</text>

      <line x1="740" y1="130" x2="766" y2="130" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#de3-a)" />
      <rect x="770" y="98" width="250" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="895" y="125" fontSize="12" fill="currentColor" textAnchor="middle">Just a question? It answers</text>
      <text className="svg-label" x="895" y="145" fontSize="12" fill="currentColor" textAnchor="middle">and the turn ends here.</text>

      {/* ---- the plan ---- */}
      <line x1="480" y1="208" x2="480" y2="240" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#de3-c)" />
      <rect x="300" y="244" width="360" height="62" rx="9" fill="var(--doc-surface2)" stroke="var(--doc-accent)" strokeOpacity=".6" />
      <text className="svg-label" x="480" y="270" fontSize="12.5" fill="currentColor" textAnchor="middle">The plan &mdash; on your Strategy tab</text>
      <text className="svg-sub" x="480" y="290" fontSize="10.5" fill="currentColor" opacity=".65" textAnchor="middle">written or updated only when you asked for something to be made</text>

      {/* ---- the line both specialists sit behind ---- */}
      <text className="svg-tag" x="20" y="342" fontSize="9.5" fill="var(--doc-accent)">BOTH SPECIALISTS READ THE WHOLE CONVERSATION</text>
      <line x1="20" y1="354" x2="1020" y2="354" stroke="var(--doc-accent)" strokeOpacity=".4" strokeDasharray="5 5" />

      <path d="M480 306 V 376 H 250 V 396" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#de3-c)" />
      <path d="M480 376 H 790 V 396" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" strokeDasharray="5 4" markerEnd="url(#de3-c)" />

      {/* ---- the two specialists ---- */}
      <rect x="20" y="400" width="460" height="186" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="424" fontSize="9.5" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="40" y="448" fontSize="13" fill="currentColor">The copywriter</text>
      <text className="svg-sub" x="40" y="470" fontSize="11" fill="currentColor" opacity=".68">Writes the words: subject lines, the body, the buttons, the A/B tests.</text>
      <line x1="40" y1="486" x2="460" y2="486" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="40" y="508" fontSize="10.5" fill="var(--doc-accent)">Given: the plan&rsquo;s brief for the words, your brand and personas,</text>
      <text className="svg-sub" x="40" y="526" fontSize="10.5" fill="var(--doc-accent)">the homepage pictures by name, and the images you uploaded by name.</text>
      <text className="svg-mono" x="40" y="564" fontSize="9.5" fill="currentColor" opacity=".5">&#8635; edits, then checks every button and field still lines up</text>

      <line x1="480" y1="493" x2="556" y2="493" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#de3-a)" />
      <text className="svg-mono" x="518" y="481" fontSize="9.5" fill="currentColor" opacity=".6" textAnchor="middle">copy</text>
      <text className="svg-mono" x="518" y="511" fontSize="9.5" fill="currentColor" opacity=".6" textAnchor="middle">first</text>

      <rect x="560" y="400" width="460" height="186" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="580" y="424" fontSize="9.5" fill="currentColor" opacity=".5">2</text>
      <text className="svg-label" x="580" y="448" fontSize="13" fill="currentColor">The designer</text>
      <text className="svg-sub" x="580" y="470" fontSize="11" fill="currentColor" opacity=".68">Builds the finished email around that copy, without rewording it.</text>
      <line x1="580" y1="486" x2="1000" y2="486" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="580" y="508" fontSize="10.5" fill="var(--doc-accent)">Given: the plan&rsquo;s look-and-feel, the finished copy, your design</text>
      <text className="svg-sub" x="580" y="526" fontSize="10.5" fill="var(--doc-accent)">identity, the homepage pictures, and your uploads as real pictures.</text>
      <text className="svg-mono" x="580" y="564" fontSize="9.5" fill="currentColor" opacity=".5">&#8635; reads the current email, edits it, reads again</text>

      <text className="svg-sub" x="580" y="606" fontSize="10.5" fill="var(--doc-warm)">No plan or no copy yet? It says so and offers to do that first.</text>

      {/* ---- the close ---- */}
      {/* The designer's leg leaves from its right edge, not its centre — the
          no-plan note sits under the centre and the line would cut through it. */}
      <path d="M250 586 V 640 H 420" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <path d="M1010 586 V 640 H 840" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <line x1="420" y1="640" x2="436" y2="640" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de3-a)" />
      <line x1="840" y1="640" x2="824" y2="640" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de3-a)" />

      <rect x="440" y="614" width="380" height="54" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="630" y="636" fontSize="12.5" fill="currentColor" textAnchor="middle">Wrap-up message</text>
      <text className="svg-sub" x="630" y="655" fontSize="10.5" fill="currentColor" opacity=".68" textAnchor="middle">what actually changed, read off the email before and after</text>

      <line x1="20" y1="692" x2="1020" y2="692" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="720" fontSize="12.5" fill="var(--doc-accent)">The plan carries over.</text>
      <text className="svg-sub" x="168" y="720" fontSize="12" fill="currentColor" opacity=".7">It stays in place across turns until a new one replaces it, so each message builds on it rather than starting again.</text>
    </svg>
  );
}

/** 04 — a change request: local vs shared, and edit vs rebuild. */
export function DiagramEdits() {
  return (
    <svg
      viewBox="0 0 1040 600"
      role="img"
      aria-label="A change request. The strategist first asks whether the thing lives in one piece or several. A local change — a colour, one subject line — moves only the piece it lives in. A shared change — a headline, a button label, the campaign concept — moves every piece it appears in, in the same turn, without asking. Subject lines and preview text never touch the design. Then each piece is edited in place, replacing only the exact words or code that change; it is rebuilt from scratch only when you ask for that."
    >
      <defs>
        <Arrow id="de4-a" />
        <Arrow id="de4-c" fill="var(--doc-accent)" />
      </defs>

      <rect x="380" y="20" width="280" height="64" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="520" y="46" fontSize="13" fill="var(--doc-accent)" textAnchor="middle">You ask for a change</text>
      <text className="svg-sub" x="520" y="66" fontSize="11" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">Does it live in one piece, or several?</text>

      <path d="M520 84 V 108 H 250 V 128" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#de4-c)" />
      <path d="M520 108 H 790 V 128" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#de4-c)" />

      {/* ---- local ---- */}
      <rect x="20" y="132" width="460" height="214" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="40" y="158" fontSize="9.5" fill="currentColor" opacity=".6">LOCAL &mdash; LIVES IN ONE PIECE</text>
      <text className="svg-label" x="40" y="184" fontSize="13" fill="currentColor">Only that piece moves.</text>
      <text className="svg-sub" x="40" y="210" fontSize="11" fill="currentColor" opacity=".72">A colour, a font, spacing, layout, a button&rsquo;s style</text>
      <text className="svg-mono" x="40" y="228" fontSize="10" fill="var(--doc-accent)">&rarr; the design only</text>
      <text className="svg-sub" x="40" y="256" fontSize="11" fill="currentColor" opacity=".72">One subject line, the preview text, an A/B test</text>
      <text className="svg-mono" x="40" y="274" fontSize="10" fill="var(--doc-accent)">&rarr; the copy only</text>
      <text className="svg-sub" x="40" y="302" fontSize="11" fill="currentColor" opacity=".72">A warning, the sequence timing, when it stops</text>
      <text className="svg-mono" x="40" y="320" fontSize="10" fill="var(--doc-accent)">&rarr; the plan only</text>

      {/* ---- shared ---- */}
      <rect x="560" y="132" width="460" height="214" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="580" y="158" fontSize="9.5" fill="currentColor" opacity=".6">SHARED &mdash; SHOWS UP IN MORE THAN ONE</text>
      <text className="svg-label" x="580" y="184" fontSize="13" fill="currentColor">All of them move, in the same turn.</text>
      <text className="svg-sub" x="580" y="210" fontSize="11" fill="currentColor" opacity=".72">A headline, body copy, a button&rsquo;s wording, the footer</text>
      <text className="svg-mono" x="580" y="228" fontSize="10" fill="var(--doc-accent)">&rarr; the copy and the design</text>
      <text className="svg-sub" x="580" y="256" fontSize="11" fill="currentColor" opacity=".72">The concept, the audience, the hook, the main action</text>
      <text className="svg-mono" x="580" y="274" fontSize="10" fill="var(--doc-accent)">&rarr; the plan, the copy and the design</text>
      <text className="svg-sub" x="580" y="302" fontSize="11" fill="currentColor" opacity=".72">The mood, or which pictures to lean on</text>
      <text className="svg-mono" x="580" y="320" fontSize="10" fill="var(--doc-accent)">&rarr; the plan and the design</text>

      <rect x="20" y="364" width="1000" height="40" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="389" fontSize="11" fill="var(--doc-warm)">Subject lines and preview text are what the inbox shows, not the email itself &mdash; so changing them never touches the design.</text>

      {/* ---- edit or rebuild ---- */}
      <line x1="520" y1="404" x2="520" y2="432" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#de4-a)" />

      <rect x="20" y="436" width="600" height="118" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-tag" x="40" y="462" fontSize="9.5" fill="var(--doc-accent)">THE DEFAULT &mdash; EDIT IN PLACE</text>
      <text className="svg-sub" x="40" y="488" fontSize="11" fill="var(--doc-accent)">Each piece finds the exact words or code that change and replaces</text>
      <text className="svg-sub" x="40" y="506" fontSize="11" fill="var(--doc-accent)">only those. Everything you already approved stays as it was &mdash;</text>
      <text className="svg-sub" x="40" y="524" fontSize="11" fill="var(--doc-accent)">identical, not just similar. Unclear which you meant? It edits.</text>

      <rect x="644" y="436" width="376" height="118" rx="10" fill="none" stroke="currentColor" strokeOpacity=".35" strokeDasharray="5 4" />
      <text className="svg-tag" x="664" y="462" fontSize="9.5" fill="currentColor" opacity=".6">ONLY WHEN YOU SAY SO &mdash; REBUILD</text>
      <text className="svg-sub" x="664" y="488" fontSize="11" fill="currentColor" opacity=".72">&ldquo;Start over&rdquo;, &ldquo;new campaign&rdquo;, &ldquo;totally</text>
      <text className="svg-sub" x="664" y="506" fontSize="11" fill="currentColor" opacity=".72">different&rdquo; &mdash; or a change so sweeping that</text>
      <text className="svg-sub" x="664" y="524" fontSize="11" fill="currentColor" opacity=".72">editing would touch most of the email.</text>

      <text className="svg-sub" x="20" y="586" fontSize="11" fill="currentColor" opacity=".55">It doesn&rsquo;t ask before spreading a shared change &mdash; it makes it everywhere and tells you where.</text>
    </svg>
  );
}

/** 05 — three sources of imagery, and which of them can end up in the email. */
export function DiagramImages() {
  return (
    <svg
      viewBox="0 0 1040 560"
      role="img"
      aria-label="Three kinds of picture and file. Your homepage's pictures, read once at the start, are the default imagery and are placed in the email as themselves. Images you upload for this campaign are named by you, seen by the designer as real pictures, and placed in the email where they fit, ahead of the homepage ones. Files you attach in chat stay available all session and shape the plan, the words and the look, but are never placed in the email."
    >
      <defs>
        <Arrow id="de5-a" />
        <Arrow id="de5-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the three sources ---- */}
      <rect x="20" y="20" width="310" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="44" fontSize="9.5" fill="currentColor" opacity=".5">1 &middot; THE DEFAULT</text>
      <text className="svg-label" x="40" y="68" fontSize="13" fill="currentColor">Your homepage&rsquo;s pictures</text>
      <text className="svg-sub" x="40" y="92" fontSize="11" fill="currentColor" opacity=".68">Read once, at the start. Each comes</text>
      <text className="svg-sub" x="40" y="110" fontSize="11" fill="currentColor" opacity=".68">with what it shows and how it sits on</text>
      <text className="svg-sub" x="40" y="128" fontSize="11" fill="currentColor" opacity=".68">the page &mdash; which is how the designer</text>
      <text className="svg-sub" x="40" y="146" fontSize="11" fill="currentColor" opacity=".68">picks one for a section.</text>
      <text className="svg-mono" x="40" y="190" fontSize="9.5" fill="var(--doc-accent)">used as they are, never altered</text>

      <rect x="365" y="20" width="310" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="385" y="44" fontSize="9.5" fill="currentColor" opacity=".5">2 &middot; TAKES PRIORITY</text>
      <text className="svg-label" x="385" y="68" fontSize="13" fill="currentColor">Images you upload</text>
      <text className="svg-sub" x="385" y="92" fontSize="11" fill="currentColor" opacity=".68">Photography for this campaign, each</text>
      <text className="svg-sub" x="385" y="110" fontSize="11" fill="currentColor" opacity=".68">under a name you give it. The designer</text>
      <text className="svg-sub" x="385" y="128" fontSize="11" fill="currentColor" opacity=".68">sees the actual picture, not just the</text>
      <text className="svg-sub" x="385" y="146" fontSize="11" fill="currentColor" opacity=".68">name, and uses it ahead of the homepage.</text>
      <text className="svg-mono" x="385" y="190" fontSize="9.5" fill="var(--doc-accent)">JPEG, PNG or WebP</text>

      <rect x="710" y="20" width="310" height="196" rx="10" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-mono" x="730" y="44" fontSize="9.5" fill="var(--doc-warm)" opacity=".8">3 &middot; CONTEXT ONLY</text>
      <text className="svg-label" x="730" y="68" fontSize="13" fill="var(--doc-warm)">Files you attach in chat</text>
      <text className="svg-sub" x="730" y="92" fontSize="11" fill="var(--doc-warm)" opacity=".9">A brief, a rival&rsquo;s email, a screenshot,</text>
      <text className="svg-sub" x="730" y="110" fontSize="11" fill="var(--doc-warm)" opacity=".9">a layout you like. Kept for the whole</text>
      <text className="svg-sub" x="730" y="128" fontSize="11" fill="var(--doc-warm)" opacity=".9">session. They shape the plan, the</text>
      <text className="svg-sub" x="730" y="146" fontSize="11" fill="var(--doc-warm)" opacity=".9">words and the look.</text>
      <text className="svg-mono" x="730" y="190" fontSize="9.5" fill="var(--doc-warm)">never placed in the email</text>

      {/* ---- where each goes ---- */}
      <path d="M175 216 V 288 H 380" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#de5-c)" />
      <line x1="520" y1="216" x2="520" y2="270" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#de5-c)" />
      <path d="M865 216 V 288 H 668" fill="none" stroke="var(--doc-warm)" strokeWidth="1.4" strokeDasharray="5 4" />
      <line x1="684" y1="280" x2="700" y2="296" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <line x1="700" y1="280" x2="684" y2="296" stroke="var(--doc-warm)" strokeWidth="1.8" />

      <rect x="384" y="274" width="272" height="72" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="520" y="304" fontSize="13" fill="var(--doc-accent)" textAnchor="middle">The finished email</text>
      <text className="svg-sub" x="520" y="326" fontSize="11" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">pictures from 1 and 2, never 3</text>

      {/* ---- how a picture is judged ---- */}
      <line x1="20" y1="380" x2="1020" y2="380" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-tag" x="20" y="406" fontSize="9.5" fill="currentColor" opacity=".55">EVERY PICTURE IS JUDGED BEFORE IT IS PLACED</text>

      <text className="svg-sub" x="20" y="434" fontSize="11" fill="currentColor" opacity=".72">A picture with words already in it</text>
      <text className="svg-sub" x="20" y="452" fontSize="11" fill="currentColor" opacity=".72">is framed as it is &mdash; never has a</text>
      <text className="svg-sub" x="20" y="470" fontSize="11" fill="currentColor" opacity=".72">headline laid over the top.</text>

      <text className="svg-sub" x="365" y="434" fontSize="11" fill="currentColor" opacity=".72">A weak, blurry or off-topic picture</text>
      <text className="svg-sub" x="365" y="452" fontSize="11" fill="currentColor" opacity=".72">is kept small, never stretched into</text>
      <text className="svg-sub" x="365" y="470" fontSize="11" fill="currentColor" opacity=".72">the hero at the top.</text>

      <text className="svg-sub" x="710" y="434" fontSize="11" fill="currentColor" opacity=".72">A logo or site icon is only ever</text>
      <text className="svg-sub" x="710" y="452" fontSize="11" fill="currentColor" opacity=".72">used as a logo &mdash; small, in the</text>
      <text className="svg-sub" x="710" y="470" fontSize="11" fill="currentColor" opacity=".72">header or footer.</text>

      <line x1="20" y1="500" x2="1020" y2="500" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="530" fontSize="12.5" fill="var(--doc-accent)">No pictures at all?</text>
      <text className="svg-sub" x="148" y="530" fontSize="12" fill="currentColor" opacity=".7">The email is built from type, colour and shapes it draws itself &mdash; never from an image it made up.</text>
    </svg>
  );
}
