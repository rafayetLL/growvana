import React from 'react';

// The five schematics for the PDP Agent documentation page.
//
// THE DIAGRAMS CARRY THE STRUCTURE. The prose beside them explains craft and
// judgement; anything about how the parts fit together — what reads what, what
// is handed to whom, what never happens — belongs in a drawing here rather than
// in another paragraph there.
//
// Same conventions as EmailDocDiagrams.jsx and MetaAdDocDiagrams.jsx, so the
// pages read as one set: every colour is `currentColor` or a `--doc-*` custom
// property (never a hex), accent marks the agent and what it is given, warm
// marks what never happens.
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

/** A filled dot for "this area reads it", a faint dash for "it does not". */
function Mark({ x, y, on }) {
  if (on) return <circle cx={x} cy={y} r="5" fill="var(--doc-accent)" />;
  return <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke="currentColor" strokeOpacity=".3" strokeWidth="1.4" />;
}

/** 01 — five inputs, the agent, four tabs. */
export function DiagramPdpContext() {
  return (
    <svg
      viewBox="0 0 1040 500"
      role="img"
      aria-label="Five inputs — your product as a page address or your own description, where it sells, your Company Blueprint if you have one, your answers to the opening questions, and files you attach — feed the PDP Agent, which fills four tabs: the Auditor's audit page, the Scout's competitor field, the Strategist's strategy and the Studio's draft page with its pictures. Nothing is published."
    >
      <defs>
        <Arrow id="dp1-a" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the five inputs ---- */}
      <rect x="20" y="48" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="76" fontSize="13" fill="currentColor">Your product</text>
      <text className="svg-sub" x="38" y="98" fontSize="11.5" fill="currentColor" opacity=".62">a page address, or your words</text>

      <rect x="20" y="134" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="162" fontSize="13" fill="currentColor">Where it sells</text>
      <text className="svg-sub" x="38" y="184" fontSize="11.5" fill="currentColor" opacity=".62">Amazon, or another store</text>

      <rect x="20" y="220" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" strokeDasharray="5 4" />
      <text className="svg-label" x="38" y="248" fontSize="13" fill="currentColor">Company Blueprint</text>
      <text className="svg-sub" x="38" y="270" fontSize="11.5" fill="currentColor" opacity=".62">optional &mdash; brand and buyers</text>

      <rect x="20" y="306" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="334" fontSize="13" fill="currentColor">Your answers</text>
      <text className="svg-sub" x="38" y="356" fontSize="11.5" fill="currentColor" opacity=".62">to the opening questions</text>

      <rect x="20" y="392" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="420" fontSize="13" fill="currentColor">Files you attach</text>
      <text className="svg-sub" x="38" y="442" fontSize="11.5" fill="currentColor" opacity=".62">a brief, a rival&rsquo;s page, a photo</text>

      {/* ---- five routes in ---- */}
      <line x1="208" y1="82" x2="432" y2="82" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp1-a)" />
      <text className="svg-mono" x="320" y="72" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">fixed at the start</text>

      <line x1="208" y1="168" x2="432" y2="168" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp1-a)" />
      <text className="svg-mono" x="320" y="158" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">decides the rules it judges by</text>

      <line x1="208" y1="254" x2="432" y2="254" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dp1-a)" />
      <text className="svg-mono" x="320" y="244" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">copied in at the start</text>

      <line x1="208" y1="340" x2="432" y2="340" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp1-a)" />
      <text className="svg-mono" x="320" y="330" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">asked once</text>

      <line x1="208" y1="426" x2="432" y2="426" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp1-a)" />
      <text className="svg-mono" x="320" y="416" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">kept for the whole session</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="44" width="224" height="420" rx="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="80" fontSize="16" fill="currentColor" textAnchor="middle">PDP Agent</text>
      <line x1="460" y1="96" x2="636" y2="96" stroke="currentColor" strokeOpacity=".25" />
      <text className="svg-sub" x="548" y="124" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">You talk to it in chat.</text>
      <text className="svg-sub" x="548" y="146" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">A CMO answers you and</text>
      <text className="svg-sub" x="548" y="168" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">decides which of four</text>
      <text className="svg-sub" x="548" y="190" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">specialists does the work.</text>

      <rect x="460" y="216" width="176" height="54" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="238" fontSize="11.5" fill="currentColor" textAnchor="middle">One product</text>
      <text className="svg-label" x="548" y="258" fontSize="11.5" fill="currentColor" textAnchor="middle">per session</text>

      <text className="svg-sub" x="548" y="304" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Each tab is owned by</text>
      <text className="svg-sub" x="548" y="326" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">exactly one specialist &mdash;</text>
      <text className="svg-sub" x="548" y="348" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">nobody else writes it.</text>

      <text className="svg-sub" x="548" y="386" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">It never publishes anything.</text>
      <text className="svg-sub" x="548" y="408" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Your live page is untouched</text>
      <text className="svg-sub" x="548" y="430" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">until you change it yourself.</text>

      {/* ---- the four tabs ---- */}
      <line x1="660" y1="240" x2="796" y2="240" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp1-a)" />
      <text className="svg-mono" x="728" y="228" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">each fills in</text>
      <text className="svg-mono" x="728" y="256" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">as it finishes</text>

      <rect x="800" y="44" width="220" height="80" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="72" fontSize="13" fill="currentColor">Auditor</text>
      <text className="svg-sub" x="818" y="92" fontSize="11" fill="currentColor" opacity=".62">the audit: what is true of</text>
      <text className="svg-sub" x="818" y="110" fontSize="11" fill="currentColor" opacity=".62">your page, area by area</text>

      <rect x="800" y="148" width="220" height="80" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="176" fontSize="13" fill="currentColor">Scout</text>
      <text className="svg-sub" x="818" y="196" fontSize="11" fill="currentColor" opacity=".62">the competitor field: what</text>
      <text className="svg-sub" x="818" y="214" fontSize="11" fill="currentColor" opacity=".62">the winning pages do</text>

      <rect x="800" y="252" width="220" height="80" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="280" fontSize="13" fill="currentColor">Strategist</text>
      <text className="svg-sub" x="818" y="300" fontSize="11" fill="currentColor" opacity=".62">the strategy: what to change,</text>
      <text className="svg-sub" x="818" y="318" fontSize="11" fill="currentColor" opacity=".62">and the plan for the pictures</text>

      <rect x="800" y="356" width="220" height="80" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="384" fontSize="13" fill="currentColor">Studio</text>
      <text className="svg-sub" x="818" y="404" fontSize="11" fill="currentColor" opacity=".62">a draft page and its pictures,</text>
      <text className="svg-sub" x="818" y="422" fontSize="11" fill="currentColor" opacity=".62">ready for you to publish</text>

      <text className="svg-sub" x="910" y="470" fontSize="11" fill="currentColor" opacity=".5" textAnchor="middle">four tabs, one per specialist</text>
    </svg>
  );
}

/** 02 — the three ways in, the product check, then questions and research side by side. */
export function DiagramPdpOpening() {
  return (
    <svg
      viewBox="0 0 1040 640"
      role="img"
      aria-label="How a session starts. There are three ways in, chosen once: an Amazon link, whose listing fields are read exactly; another storefront's link, which is captured as a full-page picture with every image on it and measured from its own code; or your own description of a product not yet published, with links to any photos. A link is first checked to be one product you can buy. Then two things happen at the same time: the opening questions, which ask only what your page and Blueprint cannot settle, and the market research, three Google searches that bring back how often terms are searched, what buyers ask and how rival products are titled. The questions are asked once, never again."
    >
      <defs>
        <Arrow id="dp2-a" />
        <Arrow id="dp2-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THREE WAYS IN &mdash; CHOSEN ONCE, FIXED FOR THE SESSION</text>

      {/* ---- the three ways in ---- */}
      <rect x="20" y="44" width="310" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="68" fontSize="9.5" fill="currentColor" opacity=".5">1 &middot; AMAZON</text>
      <text className="svg-label" x="40" y="92" fontSize="13" fill="currentColor">An Amazon link</text>
      <text className="svg-sub" x="40" y="116" fontSize="11" fill="currentColor" opacity=".68">Every field of your listing is read</text>
      <text className="svg-sub" x="40" y="134" fontSize="11" fill="currentColor" opacity=".68">exactly &mdash; the title, the bullets, the</text>
      <text className="svg-sub" x="40" y="152" fontSize="11" fill="currentColor" opacity=".68">gallery and the A+ panels.</text>
      <text className="svg-mono" x="40" y="216" fontSize="9.5" fill="var(--doc-accent)">no page reading &mdash; Amazon owns the page</text>

      <rect x="365" y="44" width="310" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="385" y="68" fontSize="9.5" fill="currentColor" opacity=".5">2 &middot; ANY OTHER STOREFRONT</text>
      <text className="svg-label" x="385" y="92" fontSize="13" fill="currentColor">A link to your product page</text>
      <text className="svg-sub" x="385" y="116" fontSize="11" fill="currentColor" opacity=".68">A full-page picture of it, every image</text>
      <text className="svg-sub" x="385" y="134" fontSize="11" fill="currentColor" opacity=".68">on it, and a reading of the page&rsquo;s</text>
      <text className="svg-sub" x="385" y="152" fontSize="11" fill="currentColor" opacity=".68">own code.</text>
      <text className="svg-mono" x="385" y="216" fontSize="9.5" fill="var(--doc-accent)">title, headings, word count, page weight</text>

      <rect x="710" y="44" width="310" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" strokeDasharray="5 4" />
      <text className="svg-mono" x="730" y="68" fontSize="9.5" fill="currentColor" opacity=".5">3 &middot; NOT PUBLISHED YET</text>
      <text className="svg-label" x="730" y="92" fontSize="13" fill="currentColor">Your own description</text>
      <text className="svg-sub" x="730" y="116" fontSize="11" fill="currentColor" opacity=".68">What it is, who it&rsquo;s for, what it&rsquo;s</text>
      <text className="svg-sub" x="730" y="134" fontSize="11" fill="currentColor" opacity=".68">made of &mdash; plus links to any photos</text>
      <text className="svg-sub" x="730" y="152" fontSize="11" fill="currentColor" opacity=".68">you have. No photos is fine.</text>
      <text className="svg-mono" x="730" y="216" fontSize="9.5" fill="var(--doc-warm)">no page yet &mdash; only the photos are audited</text>

      {/* ---- the product check, links only ---- */}
      <line x1="175" y1="240" x2="175" y2="264" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp2-a)" />
      <line x1="520" y1="240" x2="520" y2="264" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp2-a)" />

      <rect x="20" y="268" width="655" height="56" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="40" y="290" fontSize="12" fill="currentColor">Is this one product you can buy?</text>
      <text className="svg-sub" x="40" y="310" fontSize="10.5" fill="currentColor" opacity=".68">A category page, a search, a blog or a sign-in wall is turned away; when unsure, it lets the page through.</text>

      <line x1="265" y1="324" x2="265" y2="362" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp2-c)" />
      <line x1="600" y1="324" x2="600" y2="362" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp2-c)" />
      <line x1="865" y1="240" x2="865" y2="362" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp2-c)" />
      <text className="svg-tag" x="700" y="346" fontSize="9.5" fill="var(--doc-accent)">THEN, AT THE SAME TIME</text>

      {/* ---- the two opening jobs ---- */}
      <rect x="20" y="366" width="490" height="196" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-label" x="40" y="394" fontSize="13.5" fill="var(--doc-accent)">The opening questions</text>
      <text className="svg-sub" x="40" y="416" fontSize="11" fill="var(--doc-accent)" opacity=".9">Only what your page and your Blueprint cannot settle:</text>
      <text className="svg-sub" x="40" y="440" fontSize="11" fill="var(--doc-accent)">&middot; what you want this page to become</text>
      <text className="svg-sub" x="40" y="458" fontSize="11" fill="var(--doc-accent)">&middot; what you can change, and what is fixed</text>
      <text className="svg-sub" x="40" y="476" fontSize="11" fill="var(--doc-accent)">&middot; facts about the product only you know</text>
      <text className="svg-sub" x="40" y="494" fontSize="11" fill="var(--doc-accent)">&middot; facts about your buyers only you know</text>
      <line x1="40" y1="512" x2="490" y2="512" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-mono" x="40" y="536" fontSize="10" fill="var(--doc-accent)">usually 3&ndash;7 &middot; pick any that apply &middot; every one optional</text>

      <rect x="530" y="366" width="490" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="550" y="394" fontSize="13.5" fill="currentColor">The market research</text>
      <text className="svg-sub" x="550" y="416" fontSize="11" fill="currentColor" opacity=".68">Three Google searches, chosen from your product: its category,</text>
      <text className="svg-sub" x="550" y="434" fontSize="11" fill="currentColor" opacity=".68">what defines it, and what buyers use it for. It brings back:</text>
      <text className="svg-sub" x="550" y="458" fontSize="11" fill="currentColor" opacity=".8">&middot; how often each term is searched, and when it peaks</text>
      <text className="svg-sub" x="550" y="476" fontSize="11" fill="currentColor" opacity=".8">&middot; what a click costs, and how hard the term is to rank for</text>
      <text className="svg-sub" x="550" y="494" fontSize="11" fill="currentColor" opacity=".8">&middot; the questions buyers ask, and how rival products are titled</text>
      <line x1="550" y1="512" x2="1000" y2="512" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-mono" x="550" y="536" fontSize="10" fill="currentColor" opacity=".55">gathered once &middot; never looked up again mid-session</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="590" x2="1020" y2="590" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="618" fontSize="12.5" fill="var(--doc-accent)">Asked once, never again.</text>
      <text className="svg-sub" x="186" y="618" fontSize="12" fill="currentColor" opacity=".7">Skip a question and the agent assumes the best answer for your brand, and tells you what it assumed.</text>
    </svg>
  );
}

/** 03 — one message: the CMO decides, then the fixed arc, each step speaking for itself. */
export function DiagramPdpTurn() {
  return (
    <svg
      viewBox="0 0 1040 680"
      role="img"
      aria-label="One conversation turn. Your message goes to the CMO, which replies first and either stops there or starts the specialists you asked for. The order never changes: the Auditor and the Scout run at the same time, then the Strategist, then the Studio. Each box says what that step is given and what it never does: the Auditor never searches or scores, the Scout never receives your files, the Strategist never runs without an audit and the Studio never runs without a strategy. Each specialist tells you what it did the moment it finishes."
    >
      <defs>
        <Arrow id="dp3-a" />
        <Arrow id="dp3-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the conversational half ---- */}
      <rect x="20" y="52" width="150" height="160" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="95" y="112" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="95" y="132" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="95" y="158" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or your answers,</text>
      <text className="svg-sub" x="95" y="175" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or a file</text>

      <line x1="170" y1="132" x2="196" y2="132" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp3-a)" />

      <rect x="200" y="52" width="556" height="160" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="220" y="82" fontSize="13.5" fill="var(--doc-accent)">The CMO</text>
      <text className="svg-sub" x="220" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Replies to you first, and decides who works this turn.</text>
      <line x1="220" y1="118" x2="736" y2="118" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="220" y="140" fontSize="10.5" fill="var(--doc-accent)">Given: your product and what the page measures, your answers, your Blueprint,</text>
      <text className="svg-sub" x="220" y="158" fontSize="10.5" fill="var(--doc-accent)">pictures of the audit, the strategy and the draft, a summary of the competitor</text>
      <text className="svg-sub" x="220" y="176" fontSize="10.5" fill="var(--doc-accent)">field, every file you have sent, and the whole conversation.</text>

      <line x1="756" y1="132" x2="782" y2="132" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dp3-a)" />
      <rect x="786" y="100" width="234" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="903" y="127" fontSize="12" fill="currentColor" textAnchor="middle">Just a question? It answers</text>
      <text className="svg-label" x="903" y="147" fontSize="12" fill="currentColor" textAnchor="middle">and the turn ends here.</text>

      {/* ---- the dispatch ---- */}
      <path d="M478 212 V 258" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <path d="M131 258 H 909" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" strokeDasharray="5 4" />
      <text className="svg-sub" x="500" y="248" fontSize="10.5" fill="var(--doc-accent)">only the steps your message needs &mdash; files go by id, only to who needs them</text>
      <line x1="131" y1="258" x2="131" y2="292" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp3-c)" />
      <line x1="377" y1="258" x2="377" y2="292" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp3-c)" />
      <line x1="651" y1="258" x2="651" y2="292" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp3-c)" />
      <line x1="909" y1="258" x2="909" y2="292" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp3-c)" />

      {/* ---- the pair that runs together ---- */}
      <rect x="10" y="284" width="488" height="262" rx="12" fill="none" stroke="var(--doc-accent)" strokeOpacity=".45" strokeDasharray="5 4" />

      <rect x="20" y="296" width="222" height="236" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="38" y="320" fontSize="9.5" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="38" y="344" fontSize="13" fill="currentColor">Auditor</text>
      <text className="svg-sub" x="38" y="366" fontSize="11" fill="currentColor" opacity=".68">What is true of your page,</text>
      <text className="svg-sub" x="38" y="384" fontSize="11" fill="currentColor" opacity=".68">area by area.</text>
      <line x1="38" y1="400" x2="224" y2="400" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="38" y="422" fontSize="10.5" fill="var(--doc-accent)">Given: your page, what it</text>
      <text className="svg-sub" x="38" y="440" fontSize="10.5" fill="var(--doc-accent)">measures, the market research</text>
      <text className="svg-sub" x="38" y="458" fontSize="10.5" fill="var(--doc-accent)">and your photographs.</text>
      <text className="svg-mono" x="38" y="490" fontSize="9.5" fill="currentColor" opacity=".55">files: when forwarded</text>
      <text className="svg-mono" x="38" y="510" fontSize="9.5" fill="var(--doc-warm)">never searches, never scores</text>

      <rect x="266" y="296" width="222" height="236" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="284" y="320" fontSize="9.5" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="284" y="344" fontSize="13" fill="currentColor">Scout</text>
      <text className="svg-sub" x="284" y="366" fontSize="11" fill="currentColor" opacity=".68">What the winning pages in</text>
      <text className="svg-sub" x="284" y="384" fontSize="11" fill="currentColor" opacity=".68">your category do.</text>
      <line x1="284" y1="400" x2="470" y2="400" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="284" y="422" fontSize="10.5" fill="var(--doc-accent)">Given: your product, your</text>
      <text className="svg-sub" x="284" y="440" fontSize="10.5" fill="var(--doc-accent)">Blueprint, and the rival pages</text>
      <text className="svg-sub" x="284" y="458" fontSize="10.5" fill="var(--doc-accent)">it finds and reads itself.</text>
      <text className="svg-mono" x="284" y="490" fontSize="9.5" fill="currentColor" opacity=".55">the slowest step: minutes</text>
      <text className="svg-mono" x="284" y="510" fontSize="9.5" fill="var(--doc-warm)">never receives your files</text>

      <text className="svg-tag" x="254" y="566" fontSize="9.5" fill="var(--doc-accent)" textAnchor="middle">THESE TWO RUN AT THE SAME TIME</text>

      {/* ---- the two that follow ---- */}
      <line x1="498" y1="414" x2="536" y2="414" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#dp3-a)" />

      <rect x="540" y="296" width="222" height="236" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="558" y="320" fontSize="9.5" fill="currentColor" opacity=".5">2</text>
      <text className="svg-label" x="558" y="344" fontSize="13" fill="currentColor">Strategist</text>
      <text className="svg-sub" x="558" y="366" fontSize="11" fill="currentColor" opacity=".68">What to change &mdash; the only</text>
      <text className="svg-sub" x="558" y="384" fontSize="11" fill="currentColor" opacity=".68">step that prescribes.</text>
      <line x1="558" y1="400" x2="744" y2="400" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="558" y="422" fontSize="10.5" fill="var(--doc-accent)">Given: the audit, the</text>
      <text className="svg-sub" x="558" y="440" fontSize="10.5" fill="var(--doc-accent)">competitor summary, the</text>
      <text className="svg-sub" x="558" y="458" fontSize="10.5" fill="var(--doc-accent)">research and your photos.</text>
      <text className="svg-mono" x="558" y="490" fontSize="9.5" fill="currentColor" opacity=".55">files: when forwarded</text>
      <text className="svg-mono" x="558" y="510" fontSize="9.5" fill="var(--doc-warm)">never runs without an audit</text>

      <line x1="762" y1="414" x2="794" y2="414" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#dp3-a)" />

      <rect x="798" y="296" width="222" height="236" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="816" y="320" fontSize="9.5" fill="currentColor" opacity=".5">3</text>
      <text className="svg-label" x="816" y="344" fontSize="13" fill="currentColor">Studio</text>
      <text className="svg-sub" x="816" y="366" fontSize="11" fill="currentColor" opacity=".68">The words and the pictures</text>
      <text className="svg-sub" x="816" y="384" fontSize="11" fill="currentColor" opacity=".68">you publish.</text>
      <line x1="816" y1="400" x2="1002" y2="400" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="816" y="422" fontSize="10.5" fill="var(--doc-accent)">Given: the strategy as its</text>
      <text className="svg-sub" x="816" y="440" fontSize="10.5" fill="var(--doc-accent)">brief, the audit, your photos</text>
      <text className="svg-sub" x="816" y="458" fontSize="10.5" fill="var(--doc-accent)">as reference.</text>
      <text className="svg-mono" x="816" y="490" fontSize="9.5" fill="currentColor" opacity=".55">files: chosen per picture</text>
      <text className="svg-mono" x="816" y="510" fontSize="9.5" fill="var(--doc-warm)">never runs without a strategy</text>

      {/* ---- the close ---- */}
      <line x1="20" y1="600" x2="1020" y2="600" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="628" fontSize="12.5" fill="var(--doc-accent)">Nothing waits for the end.</text>
      <text className="svg-sub" x="186" y="628" fontSize="12" fill="currentColor" opacity=".7">Each specialist tells you what it did the moment it finishes, and its tab fills in then &mdash; so</text>
      <text className="svg-sub" x="20" y="650" fontSize="12" fill="currentColor" opacity=".7">the audit and the competitor field can arrive in either order, and a long turn shows progress the whole way through.</text>
    </svg>
  );
}

/** 04 — the four audit areas and the evidence each one is handed; what never reaches it. */
export function DiagramPdpAudit() {
  const cols = [431, 599, 767, 935];
  // A mark of 'alt' is a short label instead of a dot: Images is handed one line
  // of the page measurement only — whether the pictures carry alt text.
  const rows = [
    ['Your page as published', 'a picture of it, or the listing fields', [1, 1, 0, 1]],
    ['What the page measures', 'from its own code, at the start', [1, 1, 'alt', 1]],
    ['How often terms are searched', 'from the opening research', [1, 1, 0, 0]],
    ['What buyers ask', 'questions from Google’s results', [1, 1, 1, 1]],
    ['How rival products are titled', 'on Google — not from the Scout', [1, 0, 0, 0]],
    ['Your photographs', 'each one, looked at as a picture', [0, 0, 1, 0]],
  ];
  return (
    <svg
      viewBox="0 0 1040 680"
      role="img"
      aria-label="The four audit areas and what each one is handed. SEO asks whether search will surface the page and reads the page, its measurements, how often terms are searched, what buyers ask and how rival products are titled on Google. AEO, AI Engine Optimization, asks whether an AI engine will understand, trust and cite the page and reads the page, its measurements, search figures and buyer questions. Images reads your photographs and buyer questions. Layout reads the page, its measurements and buyer questions. All four also read your product, your answers, your Blueprint, the platform's rules and any file forwarded to them. Never in the audit: the Scout's research, a live web search, or a score. On a product described rather than linked, only Images can run."
    >
      {/* ---- the four area headers ---- */}
      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT EACH AREA IS HANDED</text>

      {[
        ['SEO', 'will search', 'surface it?'],
        ['AEO', 'AI Engine Optimization:', 'will an AI engine cite it?'],
        ['Images', 'do the pictures', 'do their job?'],
        ['Layout', 'does the order', 'build to the sale?'],
      ].map(([name, a, b], i) => (
        <g key={name}>
          <rect x={cols[i] - 79} y="40" width="158" height="80" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
          <text className="svg-label" x={cols[i]} y="66" fontSize="13" fill="var(--doc-accent)" textAnchor="middle">{name}</text>
          <text className="svg-sub" x={cols[i]} y="86" fontSize="10" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">{a}</text>
          <text className="svg-sub" x={cols[i]} y="104" fontSize="10" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">{b}</text>
        </g>
      ))}

      {/* ---- the evidence rows ---- */}
      {rows.map(([label, sub, marks], r) => {
        const top = 136 + r * 48;
        return (
          <g key={label}>
            <line x1="20" y1={top} x2="1014" y2={top} stroke="currentColor" strokeOpacity=".12" />
            <text className="svg-label" x="20" y={top + 22} fontSize="12" fill="currentColor">{label}</text>
            <text className="svg-sub" x="20" y={top + 39} fontSize="10.5" fill="currentColor" opacity=".6">{sub}</text>
            {marks.map((on, c) =>
              on === 'alt' ? (
                <text key={c} className="svg-mono" x={cols[c]} y={top + 29} fontSize="9.5" fill="var(--doc-accent)" textAnchor="middle">alt text only</text>
              ) : (
                <Mark key={c} x={cols[c]} y={top + 26} on={Boolean(on)} />
              ),
            )}
          </g>
        );
      })}
      <line x1="20" y1="424" x2="1014" y2="424" stroke="currentColor" strokeOpacity=".12" />

      <rect x="20" y="438" width="994" height="40" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-sub" x="40" y="463" fontSize="11" fill="currentColor" opacity=".8">All four also read: your product, your answers, your Blueprint, the platform&rsquo;s rules, and any file the CMO forwards.</text>

      {/* ---- what never reaches the audit ---- */}
      <rect x="20" y="500" width="994" height="104" rx="10" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-tag" x="40" y="524" fontSize="9.5" fill="var(--doc-warm)">NEVER IN THE AUDIT</text>

      <text className="svg-label" x="40" y="550" fontSize="12" fill="var(--doc-warm)">The Scout&rsquo;s research</text>
      <text className="svg-sub" x="40" y="570" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">Your page is judged on its own terms,</text>
      <text className="svg-sub" x="40" y="588" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">never against a rival&rsquo;s.</text>

      <text className="svg-label" x="370" y="550" fontSize="12" fill="var(--doc-warm)">A live web search</text>
      <text className="svg-sub" x="370" y="570" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">Market figures are gathered once, at the</text>
      <text className="svg-sub" x="370" y="588" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">start, and never looked up mid-audit.</text>

      <text className="svg-label" x="700" y="550" fontSize="12" fill="var(--doc-warm)">A score</text>
      <text className="svg-sub" x="700" y="570" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">Every finding is said in words, with</text>
      <text className="svg-sub" x="700" y="588" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">what it rests on. No grade, no dial.</text>

      <line x1="20" y1="630" x2="1020" y2="630" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="658" fontSize="12.5" fill="var(--doc-accent)">Only described it?</text>
      <text className="svg-sub" x="148" y="658" fontSize="12" fill="currentColor" opacity=".7">With no published page, only Images can run &mdash; and only when you added photos. The other three have nothing to judge yet.</text>
    </svg>
  );
}

/** 05 — the image plan: the Strategist's verdict on each photograph, and how the Studio carries it out. */
export function DiagramPdpImagePlan() {
  return (
    <svg
      viewBox="0 0 1040 600"
      role="img"
      aria-label="The image plan. The Strategist judges each of your photographs by the job it does on the page and gives it one of three verdicts: keep, when it already does its job; reshoot, when it half does its job and is remade for the same one; or new, a picture for a job nothing covers yet that your photographs can supply. A subject no photograph shows is left out and never invented. The Studio then makes every picture the plan asks for — a floor, never a ceiling — using your real photographs as reference, and adds each take beside the last instead of over it. Four to nine pictures in all, the hero first."
    >
      <defs>
        <Arrow id="dp5-a" />
        <Arrow id="dp5-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">YOUR PHOTOGRAPHS</text>
      <text className="svg-tag" x="262" y="26" fontSize="10.5" fill="var(--doc-accent)">THE STRATEGIST JUDGES EACH BY ITS JOB</text>
      <text className="svg-tag" x="700" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE STUDIO MAKES THE PLAN</text>

      {/* ---- the photographs ---- */}
      <rect x="20" y="48" width="190" height="328" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <rect x="44" y="72" width="62" height="62" rx="5" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".25" />
      <rect x="124" y="72" width="62" height="62" rx="5" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".25" />
      <rect x="44" y="152" width="62" height="62" rx="5" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".25" />
      <rect x="124" y="152" width="62" height="62" rx="5" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".25" />
      <text className="svg-label" x="38" y="250" fontSize="12.5" fill="currentColor">The pictures you</text>
      <text className="svg-label" x="38" y="270" fontSize="12.5" fill="currentColor">already have</text>
      <text className="svg-sub" x="38" y="294" fontSize="10.5" fill="currentColor" opacity=".62">from your page, or the</text>
      <text className="svg-sub" x="38" y="312" fontSize="10.5" fill="currentColor" opacity=".62">photo links you gave.</text>
      <text className="svg-sub" x="38" y="336" fontSize="10.5" fill="currentColor" opacity=".62">None? Then every picture</text>
      <text className="svg-sub" x="38" y="354" fontSize="10.5" fill="currentColor" opacity=".62">the plan names is new.</text>

      <path d="M210 212 H 232" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M232 80 V 344" fill="none" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.2" />
      <line x1="232" y1="80" x2="258" y2="80" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp5-a)" />
      <line x1="232" y1="168" x2="258" y2="168" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp5-a)" />
      <line x1="232" y1="256" x2="258" y2="256" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dp5-a)" />
      <line x1="232" y1="344" x2="258" y2="344" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dp5-a)" />

      {/* ---- the four verdicts ---- */}
      <rect x="262" y="48" width="400" height="64" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-tag" x="280" y="85" fontSize="11" fill="var(--doc-accent)">KEEP</text>
      <text className="svg-sub" x="380" y="74" fontSize="11" fill="var(--doc-accent)">It already does its job.</text>
      <text className="svg-sub" x="380" y="92" fontSize="11" fill="var(--doc-accent)" opacity=".85">Shown as it is &mdash; nothing is remade.</text>

      <rect x="262" y="136" width="400" height="64" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-tag" x="280" y="173" fontSize="11" fill="var(--doc-accent)">RESHOOT</text>
      <text className="svg-sub" x="380" y="162" fontSize="11" fill="var(--doc-accent)">It half does its job, or does it badly.</text>
      <text className="svg-sub" x="380" y="180" fontSize="11" fill="var(--doc-accent)" opacity=".85">Remade for the same job, from the original.</text>

      <rect x="262" y="224" width="400" height="64" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-tag" x="280" y="261" fontSize="11" fill="var(--doc-accent)">NEW</text>
      <text className="svg-sub" x="380" y="250" fontSize="11" fill="var(--doc-accent)">A job no picture covers yet &mdash;</text>
      <text className="svg-sub" x="380" y="268" fontSize="11" fill="var(--doc-accent)" opacity=".85">and one your photographs can supply.</text>

      <rect x="262" y="312" width="400" height="64" rx="9" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-tag" x="280" y="349" fontSize="11" fill="var(--doc-warm)">LEFT OUT</text>
      <text className="svg-sub" x="380" y="338" fontSize="11" fill="var(--doc-warm)">A subject no photograph shows.</text>
      <text className="svg-sub" x="380" y="356" fontSize="11" fill="var(--doc-warm)" opacity=".9">Never invented &mdash; the set is smaller.</text>

      {/* ---- into the Studio ---- */}
      <line x1="662" y1="80" x2="696" y2="80" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp5-c)" />
      <line x1="662" y1="168" x2="696" y2="168" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp5-c)" />
      <line x1="662" y1="256" x2="696" y2="256" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dp5-c)" />
      <path d="M662 344 H 696" fill="none" stroke="var(--doc-warm)" strokeWidth="1.4" strokeDasharray="5 4" />
      <line x1="672" y1="336" x2="688" y2="352" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <line x1="688" y1="336" x2="672" y2="352" stroke="var(--doc-warm)" strokeWidth="1.8" />

      <rect x="700" y="48" width="320" height="328" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="720" y="78" fontSize="13.5" fill="currentColor">The Studio</text>
      <text className="svg-sub" x="720" y="100" fontSize="11" fill="currentColor" opacity=".68">Makes every picture the plan asks for</text>
      <text className="svg-sub" x="720" y="118" fontSize="11" fill="currentColor" opacity=".68">&mdash; a floor, never a ceiling.</text>
      <line x1="720" y1="134" x2="1000" y2="134" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="720" y="158" fontSize="10.5" fill="var(--doc-accent)">Kept photos go on the page as they are.</text>
      <text className="svg-sub" x="720" y="182" fontSize="10.5" fill="var(--doc-accent)">A reshoot starts from the photo it replaces.</text>
      <text className="svg-sub" x="720" y="206" fontSize="10.5" fill="var(--doc-accent)">New pictures work from your real photos,</text>
      <text className="svg-sub" x="720" y="224" fontSize="10.5" fill="var(--doc-accent)">so the product is never made up.</text>
      <text className="svg-sub" x="720" y="248" fontSize="10.5" fill="currentColor" opacity=".72">It may add pictures the plan didn&rsquo;t name,</text>
      <text className="svg-sub" x="720" y="266" fontSize="10.5" fill="currentColor" opacity=".72">and sharpen the direction. It may not</text>
      <text className="svg-sub" x="720" y="284" fontSize="10.5" fill="currentColor" opacity=".72">change what a planned picture is for.</text>
      <line x1="720" y1="304" x2="1000" y2="304" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-mono" x="720" y="328" fontSize="9.5" fill="currentColor" opacity=".55">each take added beside the last,</text>
      <text className="svg-mono" x="720" y="346" fontSize="9.5" fill="currentColor" opacity=".55">never over it</text>

      {/* ---- the shape of the set ---- */}
      <line x1="20" y1="408" x2="1020" y2="408" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-tag" x="20" y="434" fontSize="9.5" fill="currentColor" opacity=".55">THE SHAPE OF THE SET</text>

      <text className="svg-label" x="20" y="462" fontSize="12" fill="currentColor">Four to nine in all</text>
      <text className="svg-sub" x="20" y="482" fontSize="10.5" fill="currentColor" opacity=".7">Four to six for a simple, low-cost product;</text>
      <text className="svg-sub" x="20" y="500" fontSize="10.5" fill="currentColor" opacity=".7">seven to nine for one that&rsquo;s worn, technical</text>
      <text className="svg-sub" x="20" y="518" fontSize="10.5" fill="currentColor" opacity=".7">or costly. Never padded to reach it.</text>

      <text className="svg-label" x="365" y="462" fontSize="12" fill="currentColor">The hero first</text>
      <text className="svg-sub" x="365" y="482" fontSize="10.5" fill="currentColor" opacity=".7">Then the pictures that answer the</text>
      <text className="svg-sub" x="365" y="500" fontSize="10.5" fill="currentColor" opacity=".7">buyer&rsquo;s biggest doubts, in that order.</text>

      <text className="svg-label" x="710" y="462" fontSize="12" fill="currentColor">Some jobs are required</text>
      <text className="svg-sub" x="710" y="482" fontSize="10.5" fill="currentColor" opacity=".7">Someone wearing it, if it&rsquo;s worn; scale, if size</text>
      <text className="svg-sub" x="710" y="500" fontSize="10.5" fill="currentColor" opacity=".7">is hard to judge; a facts panel, if it&rsquo;s eaten,</text>
      <text className="svg-sub" x="710" y="518" fontSize="10.5" fill="currentColor" opacity=".7">drunk or applied; fit, if it must connect.</text>

      <line x1="20" y1="544" x2="1020" y2="544" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="572" fontSize="12.5" fill="var(--doc-accent)">A different job is a new picture.</text>
      <text className="svg-sub" x="248" y="572" fontSize="12" fill="currentColor" opacity=".7">If a photo should do something else, it is set aside and a new picture is planned &mdash; not a reshoot.</text>
    </svg>
  );
}
