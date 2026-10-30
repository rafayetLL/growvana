import React from 'react';

// The five schematics for the Foundation Agent documentation page.
//
// THE DIAGRAMS CARRY THE STRUCTURE. The prose beside them explains craft and
// judgement; anything about how the parts fit together — what reads what, what
// is handed to whom, what never happens — belongs in a drawing here rather than
// in another paragraph there.
//
// Same conventions as MetaAdDocDiagrams.jsx and EmailDocDiagrams.jsx, so the
// pages read as one set: every colour is `currentColor` or a `--doc-*` custom
// property (never a hex), accent marks the agent and what it is given, warm
// marks what never happens. Marker ids are prefixed `dfn` so they can never
// collide with another page's diagrams in the same document.
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

/** 01 — four inputs, the agent, four documents and the Blueprint. */
export function DiagramContext() {
  return (
    <svg
      viewBox="0 0 1040 500"
      role="img"
      aria-label="Four inputs — your website address, which is required, your documents, which are optional, your answers to the opening questions, and files you attach in chat — feed the Foundation Agent, which produces five documents: Market Analysis, Competitive Analysis, Brand Bible, Buyer Personas, and the Company Blueprint that sums them up."
    >
      <defs>
        <Arrow id="dfn1-a" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the four inputs ---- */}
      <rect x="20" y="52" width="188" height="76" rx="9" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="38" y="84" fontSize="13" fill="var(--doc-accent)">Your website address</text>
      <text className="svg-sub" x="38" y="106" fontSize="11.5" fill="var(--doc-accent)" opacity=".85">the one thing it must have</text>

      <rect x="20" y="164" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="196" fontSize="13" fill="currentColor">Your documents</text>
      <text className="svg-sub" x="38" y="218" fontSize="11.5" fill="currentColor" opacity=".62">optional &middot; decks, research</text>

      <rect x="20" y="276" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="308" fontSize="13" fill="currentColor">Your answers</text>
      <text className="svg-sub" x="38" y="330" fontSize="11.5" fill="currentColor" opacity=".62">to the opening questions</text>

      <rect x="20" y="388" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="420" fontSize="13" fill="currentColor">Files you attach</text>
      <text className="svg-sub" x="38" y="442" fontSize="11.5" fill="currentColor" opacity=".62">in chat, at any time</text>

      {/* ---- four routes in ---- */}
      <line x1="208" y1="90" x2="432" y2="90" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn1-a)" />
      <text className="svg-mono" x="320" y="80" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">read in full at the start</text>

      <line x1="208" y1="202" x2="432" y2="202" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn1-a)" />
      <text className="svg-mono" x="320" y="192" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">each read on its own</text>

      <line x1="208" y1="314" x2="432" y2="314" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn1-a)" />
      <text className="svg-mono" x="320" y="304" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">asked once, all optional</text>

      <line x1="208" y1="426" x2="432" y2="426" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dfn1-a)" />
      <text className="svg-mono" x="320" y="416" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">passed to the right writer</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="48" width="224" height="416" rx="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="86" fontSize="16" fill="currentColor" textAnchor="middle">Foundation Agent</text>
      <line x1="460" y1="102" x2="636" y2="102" stroke="currentColor" strokeOpacity=".25" />
      <text className="svg-sub" x="548" y="130" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">You talk to it in chat.</text>
      <text className="svg-sub" x="548" y="152" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">It reads your brand, asks</text>
      <text className="svg-sub" x="548" y="174" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">what it can&rsquo;t find, then</text>
      <text className="svg-sub" x="548" y="196" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">sends writers to work.</text>

      <rect x="460" y="224" width="176" height="54" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="246" fontSize="11.5" fill="currentColor" textAnchor="middle">Four documents,</text>
      <text className="svg-label" x="548" y="266" fontSize="11.5" fill="currentColor" textAnchor="middle">then the Blueprint</text>

      <text className="svg-sub" x="548" y="312" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Each document has its own</text>
      <text className="svg-sub" x="548" y="334" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">writer &mdash; the agent you</text>
      <text className="svg-sub" x="548" y="356" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">talk to writes none of them.</text>

      <text className="svg-sub" x="548" y="394" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Nothing is final until you</text>
      <text className="svg-sub" x="548" y="416" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">approve it, and you can ask</text>
      <text className="svg-sub" x="548" y="438" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">for changes at any time.</text>

      {/* ---- the five documents ---- */}
      <line x1="660" y1="250" x2="796" y2="250" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn1-a)" />
      <text className="svg-mono" x="728" y="238" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">appear as</text>
      <text className="svg-mono" x="728" y="266" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">they&rsquo;re written</text>

      <rect x="800" y="48" width="220" height="64" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="74" fontSize="13" fill="currentColor">Market Analysis</text>
      <text className="svg-sub" x="818" y="94" fontSize="11" fill="currentColor" opacity=".62">the market, and where it&rsquo;s going</text>

      <rect x="800" y="132" width="220" height="64" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="158" fontSize="13" fill="currentColor">Competitive Analysis</text>
      <text className="svg-sub" x="818" y="178" fontSize="11" fill="currentColor" opacity=".62">who you&rsquo;re up against</text>

      <rect x="800" y="216" width="220" height="64" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="242" fontSize="13" fill="currentColor">Brand Bible</text>
      <text className="svg-sub" x="818" y="262" fontSize="11" fill="currentColor" opacity=".62">who you are, how you sound</text>

      <rect x="800" y="300" width="220" height="64" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="326" fontSize="13" fill="currentColor">Buyer Personas</text>
      <text className="svg-sub" x="818" y="346" fontSize="11" fill="currentColor" opacity=".62">who buys, and why</text>

      <rect x="800" y="384" width="220" height="64" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-label" x="818" y="410" fontSize="13" fill="var(--doc-accent)">Company Blueprint</text>
      <text className="svg-sub" x="818" y="430" fontSize="11" fill="var(--doc-accent)" opacity=".9">a summary over all four</text>

      <text className="svg-sub" x="910" y="478" fontSize="11" fill="currentColor" opacity=".5" textAnchor="middle">five entries in the progress panel</text>
    </svg>
  );
}

/** 02 — the first read: three readings at once, the gap check, the questions. */
export function DiagramOpening() {
  return (
    <svg
      viewBox="0 0 1040 600"
      role="img"
      aria-label="The first read. Your website address and any documents you gave are read three ways at the same time: each document on its own, the pages of your website with the most to say about the brand, and your homepage's look — its colours, fonts, buttons and pictures. What is still missing after that, and after searching the web, becomes the opening questions, which are asked once and are all optional. Anything your materials already say, or a web search can find, is never asked. All three readings are kept for every document written later."
    >
      <defs>
        <Arrow id="dfn2-a" />
        <Arrow id="dfn2-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">YOU GIVE IT</text>
      <text className="svg-tag" x="212" y="26" fontSize="10.5" fill="var(--doc-accent)">READ AT THE SAME TIME</text>
      <text className="svg-tag" x="584" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THEN</text>
      <text className="svg-tag" x="812" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU SEE</text>

      {/* ---- what the user gives ---- */}
      <rect x="20" y="180" width="148" height="138" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="94" y="216" fontSize="13" fill="currentColor" textAnchor="middle">Your website</text>
      <text className="svg-label" x="94" y="236" fontSize="13" fill="currentColor" textAnchor="middle">address</text>
      <text className="svg-sub" x="94" y="264" fontSize="11" fill="currentColor" opacity=".62" textAnchor="middle">and any documents</text>
      <text className="svg-sub" x="94" y="282" fontSize="11" fill="currentColor" opacity=".62" textAnchor="middle">you have</text>

      <line x1="168" y1="249" x2="208" y2="249" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn2-a)" />
      <path d="M180 249 V 111 H 208" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn2-a)" />
      <path d="M180 249 V 387 H 208" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn2-a)" />

      {/* ---- the three readings ---- */}
      <rect x="212" y="52" width="330" height="118" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="232" y="82" fontSize="13" fill="var(--doc-accent)">Your documents</text>
      <text className="svg-sub" x="232" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Each one read on its own, all at the same time,</text>
      <text className="svg-sub" x="232" y="122" fontSize="11" fill="var(--doc-accent)" opacity=".9">for brand language, proof, products and buyers.</text>
      <text className="svg-mono" x="232" y="152" fontSize="10" fill="var(--doc-accent)">&rarr; a short brief per document</text>

      <rect x="212" y="190" width="330" height="118" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="232" y="220" fontSize="13" fill="var(--doc-accent)">Your website</text>
      <text className="svg-sub" x="232" y="242" fontSize="11" fill="var(--doc-accent)" opacity=".9">Every page on the site is found, then the ones</text>
      <text className="svg-sub" x="232" y="260" fontSize="11" fill="var(--doc-accent)" opacity=".9">with the most to say about the brand are read.</text>
      <text className="svg-mono" x="232" y="290" fontSize="10" fill="var(--doc-accent)">&rarr; About and Products first, legal pages skipped</text>

      <rect x="212" y="328" width="330" height="118" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="232" y="358" fontSize="13" fill="var(--doc-accent)">Your homepage&rsquo;s look</text>
      <text className="svg-sub" x="232" y="380" fontSize="11" fill="var(--doc-accent)" opacity=".9">Opened the way a visitor sees it, and captured</text>
      <text className="svg-sub" x="232" y="398" fontSize="11" fill="var(--doc-accent)" opacity=".9">whole: colours, fonts, corners and buttons.</text>
      <text className="svg-mono" x="232" y="428" fontSize="10" fill="var(--doc-accent)">&rarr; the design identity, plus every picture named</text>

      {/* ---- converging on the gap check ---- */}
      <path d="M542 111 H 560 V 249" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.4" />
      <path d="M542 387 H 560 V 249" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.4" />
      <line x1="542" y1="249" x2="580" y2="249" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn2-a)" />

      <rect x="584" y="180" width="190" height="138" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="679" y="212" fontSize="13" fill="currentColor" textAnchor="middle">What&rsquo;s still missing?</text>
      <text className="svg-sub" x="679" y="238" fontSize="11" fill="currentColor" opacity=".68" textAnchor="middle">It searches the web for</text>
      <text className="svg-sub" x="679" y="256" fontSize="11" fill="currentColor" opacity=".68" textAnchor="middle">whatever it can look up,</text>
      <text className="svg-sub" x="679" y="274" fontSize="11" fill="currentColor" opacity=".68" textAnchor="middle">and keeps only what only</text>
      <text className="svg-sub" x="679" y="292" fontSize="11" fill="currentColor" opacity=".68" textAnchor="middle">you could know.</text>

      <line x1="774" y1="249" x2="808" y2="249" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dfn2-c)" />

      {/* ---- the questions ---- */}
      <rect x="812" y="150" width="208" height="198" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-tag" x="830" y="176" fontSize="9" fill="var(--doc-accent)">ASKED ONCE</text>
      <text className="svg-label" x="830" y="200" fontSize="13" fill="var(--doc-accent)">The opening questions</text>
      <text className="svg-sub" x="830" y="224" fontSize="11" fill="var(--doc-accent)" opacity=".9">Options drawn from your own</text>
      <text className="svg-sub" x="830" y="242" fontSize="11" fill="var(--doc-accent)" opacity=".9">brand and its competitors.</text>
      <text className="svg-sub" x="830" y="266" fontSize="11" fill="var(--doc-accent)" opacity=".9">Pick several, type your own,</text>
      <text className="svg-sub" x="830" y="284" fontSize="11" fill="var(--doc-accent)" opacity=".9">or skip any of them.</text>
      <line x1="830" y1="300" x2="1002" y2="300" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="830" y="320" fontSize="10.5" fill="var(--doc-accent)" opacity=".9">No quota, never padded.</text>

      {/* ---- what is never asked ---- */}
      <rect x="20" y="472" width="1000" height="40" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="497" fontSize="11" fill="var(--doc-warm)">Never asked: anything your documents or website already say, anything a web search can find, or your company&rsquo;s name.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="536" x2="1020" y2="536" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="564" fontSize="12.5" fill="var(--doc-accent)">Kept for good.</text>
      <text className="svg-sub" x="128" y="564" fontSize="12" fill="currentColor" opacity=".7">All three readings stay with your brand. Every document is written from them, and other</text>
      <text className="svg-sub" x="20" y="586" fontSize="12" fill="currentColor" opacity=".7">agents reuse your homepage&rsquo;s pictures without reading the site again.</text>
    </svg>
  );
}

/** 03 — the order the documents are written in, and the four states a document can be in. */
export function DiagramOrder() {
  return (
    <svg
      viewBox="0 0 1040 600"
      role="img"
      aria-label="The order. First the Market Analysis and the Competitive Analysis are written side by side. Once both have a draft, the Brand Bible and the Buyer Personas are written side by side, each reading the first two. Last, once all four exist, the Company Blueprint is written on its own: a summary of 100 words or fewer across all four, with the four documents placed beneath it. Every document then moves through four states: drafting, drafted and waiting for you, accepted, and revised when an accepted one is changed. Asking for a later document approves the earlier ones that are waiting."
    >
      <defs>
        <Arrow id="dfn3-a" />
        <Arrow id="dfn3-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">FIRST</text>
      <text className="svg-tag" x="372" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THEN</text>
      <text className="svg-tag" x="724" y="26" fontSize="10.5" fill="var(--doc-accent)">LAST</text>

      {/* ---- first pair ---- */}
      <rect x="20" y="48" width="280" height="108" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="38" y="78" fontSize="13" fill="currentColor">Market Analysis</text>
      <text className="svg-sub" x="38" y="100" fontSize="11" fill="currentColor" opacity=".68">How big the market is, where it&rsquo;s</text>
      <text className="svg-sub" x="38" y="118" fontSize="11" fill="currentColor" opacity=".68">heading, and the rules it plays by.</text>
      <text className="svg-mono" x="38" y="142" fontSize="9.5" fill="currentColor" opacity=".5">researched on the web as it writes</text>

      <rect x="20" y="176" width="280" height="108" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="38" y="206" fontSize="13" fill="currentColor">Competitive Analysis</text>
      <text className="svg-sub" x="38" y="228" fontSize="11" fill="currentColor" opacity=".68">Who you&rsquo;re up against, what they</text>
      <text className="svg-sub" x="38" y="246" fontSize="11" fill="currentColor" opacity=".68">say, and the space nobody owns.</text>
      <text className="svg-mono" x="38" y="270" fontSize="9.5" fill="currentColor" opacity=".5">researched on the web as it writes</text>

      <path d="M300 102 H 326 M300 230 H 326 M326 102 V 230" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.4" />
      <line x1="326" y1="166" x2="368" y2="166" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn3-a)" />

      {/* ---- second pair ---- */}
      <rect x="372" y="48" width="280" height="108" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="390" y="78" fontSize="13" fill="currentColor">Brand Bible</text>
      <text className="svg-sub" x="390" y="100" fontSize="11" fill="currentColor" opacity=".68">Who the brand is, how it sounds,</text>
      <text className="svg-sub" x="390" y="118" fontSize="11" fill="currentColor" opacity=".68">what it says, and how it looks.</text>
      <text className="svg-mono" x="390" y="142" fontSize="9.5" fill="currentColor" opacity=".5">reads the first two as background</text>

      <rect x="372" y="176" width="280" height="108" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="390" y="206" fontSize="13" fill="currentColor">Buyer Personas</text>
      <text className="svg-sub" x="390" y="228" fontSize="11" fill="currentColor" opacity=".68">The groups of people who buy,</text>
      <text className="svg-sub" x="390" y="246" fontSize="11" fill="currentColor" opacity=".68">and what makes each one act.</text>
      <text className="svg-mono" x="390" y="270" fontSize="9.5" fill="currentColor" opacity=".5">built to fit the first two</text>

      <path d="M652 102 H 678 M652 230 H 678 M678 102 V 230" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" strokeWidth="1.4" />
      <line x1="678" y1="166" x2="720" y2="166" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dfn3-c)" />

      {/* ---- the Blueprint ---- */}
      <rect x="724" y="48" width="296" height="236" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="744" y="78" fontSize="13.5" fill="var(--doc-accent)">Company Blueprint</text>
      <text className="svg-sub" x="744" y="102" fontSize="11" fill="var(--doc-accent)" opacity=".9">A summary of 100 words or fewer,</text>
      <text className="svg-sub" x="744" y="120" fontSize="11" fill="var(--doc-accent)" opacity=".9">written across all four: how you win,</text>
      <text className="svg-sub" x="744" y="138" fontSize="11" fill="var(--doc-accent)" opacity=".9">the open space, the trend that matters,</text>
      <text className="svg-sub" x="744" y="156" fontSize="11" fill="var(--doc-accent)" opacity=".9">your main buyer, and the moves that</text>
      <text className="svg-sub" x="744" y="174" fontSize="11" fill="var(--doc-accent)" opacity=".9">follow from all of it.</text>
      <line x1="744" y1="192" x2="1000" y2="192" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="744" y="214" fontSize="11" fill="var(--doc-accent)" opacity=".9">Then the four documents, placed</text>
      <text className="svg-sub" x="744" y="232" fontSize="11" fill="var(--doc-accent)" opacity=".9">beneath it as they stand.</text>
      <text className="svg-mono" x="744" y="264" fontSize="9.5" fill="var(--doc-accent)">always written on its own</text>

      <text className="svg-mono" x="20" y="310" fontSize="10" fill="currentColor" opacity=".6">written side by side</text>
      <text className="svg-mono" x="372" y="310" fontSize="10" fill="currentColor" opacity=".6">side by side, once the first two exist</text>
      <text className="svg-mono" x="724" y="310" fontSize="10" fill="currentColor" opacity=".6">once all four exist</text>

      {/* ---- the four states ---- */}
      <line x1="20" y1="336" x2="1020" y2="336" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-tag" x="20" y="362" fontSize="9.5" fill="currentColor" opacity=".55">EVERY DOCUMENT WAITS FOR YOU</text>

      <rect x="20" y="378" width="226" height="106" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="38" y="406" fontSize="12.5" fill="currentColor">Drafting</text>
      <text className="svg-sub" x="38" y="428" fontSize="11" fill="currentColor" opacity=".68">Being written now. You can</text>
      <text className="svg-sub" x="38" y="446" fontSize="11" fill="currentColor" opacity=".68">watch it appear as it goes.</text>

      <line x1="246" y1="431" x2="274" y2="431" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn3-a)" />

      <rect x="278" y="378" width="226" height="106" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="296" y="406" fontSize="12.5" fill="var(--doc-accent)">Drafted</text>
      <text className="svg-sub" x="296" y="428" fontSize="11" fill="var(--doc-accent)" opacity=".9">Waiting for you. Approve it,</text>
      <text className="svg-sub" x="296" y="446" fontSize="11" fill="var(--doc-accent)" opacity=".9">or ask for changes and it&rsquo;s</text>
      <text className="svg-sub" x="296" y="464" fontSize="11" fill="var(--doc-accent)" opacity=".9">written again.</text>

      <line x1="504" y1="431" x2="532" y2="431" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn3-a)" />

      <rect x="536" y="378" width="226" height="106" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="554" y="406" fontSize="12.5" fill="currentColor">Accepted</text>
      <text className="svg-sub" x="554" y="428" fontSize="11" fill="currentColor" opacity=".68">Approved. This is the version</text>
      <text className="svg-sub" x="554" y="446" fontSize="11" fill="currentColor" opacity=".68">everything else is built on.</text>

      <line x1="762" y1="431" x2="790" y2="431" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dfn3-a)" />

      <rect x="794" y="378" width="226" height="106" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" strokeDasharray="5 4" />
      <text className="svg-label" x="812" y="406" fontSize="12.5" fill="currentColor">Revised</text>
      <text className="svg-sub" x="812" y="428" fontSize="11" fill="currentColor" opacity=".68">Approved, then changed. The</text>
      <text className="svg-sub" x="812" y="446" fontSize="11" fill="currentColor" opacity=".68">approved one still counts until</text>
      <text className="svg-sub" x="812" y="464" fontSize="11" fill="currentColor" opacity=".68">you approve the new one.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="516" x2="1020" y2="516" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="544" fontSize="12.5" fill="var(--doc-accent)">Asking for the next step approves the last.</text>
      <text className="svg-sub" x="20" y="568" fontSize="12" fill="currentColor" opacity=".7">Ask for the Brand Bible while the first two are waiting, and they are approved for you. Ask before they exist,</text>
      <text className="svg-sub" x="20" y="588" fontSize="12" fill="currentColor" opacity=".7">and it offers to write them first; say yes, and it writes everything in order within the one message.</text>
    </svg>
  );
}

/** 04 — one message: the strategist decides, the writers write, the strategist closes. */
export function DiagramTurn() {
  return (
    <svg
      viewBox="0 0 1040 630"
      role="img"
      aria-label="One message. Your message goes to the strategist you talk to, the only part of the agent that sees the whole conversation. It either answers and stops, or sends one or more of five writers — Market Analysis, Competitive Analysis, Brand Bible, Buyer Personas and the Company Blueprint — each with its own instruction and only the files it needs. Each writer is given only what its document depends on, and the Blueprint writer is always sent alone. When the writers finish, the strategist runs again: it sends the next writers or writes its closing message. A file you attach goes only to the writer it concerns."
    >
      <defs>
        <Arrow id="dfn4-a" />
        <Arrow id="dfn4-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the conversational half ---- */}
      <rect x="20" y="52" width="170" height="156" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="105" y="110" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="105" y="130" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="105" y="156" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or your answers,</text>
      <text className="svg-sub" x="105" y="173" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or a file</text>

      <line x1="190" y1="130" x2="216" y2="130" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn4-a)" />

      <rect x="220" y="52" width="520" height="156" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="240" y="82" fontSize="13.5" fill="var(--doc-accent)">The strategist you talk to</text>
      <text className="svg-sub" x="240" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Answers you, records what you approve, and decides which writers to send.</text>
      <line x1="240" y1="118" x2="720" y2="118" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="240" y="140" fontSize="10.5" fill="var(--doc-accent)">Given: the readings of your website and documents, your answers, which</text>
      <text className="svg-sub" x="240" y="158" fontSize="10.5" fill="var(--doc-accent)">documents are drafted or approved, a log of what has happened so far,</text>
      <text className="svg-sub" x="240" y="176" fontSize="10.5" fill="var(--doc-accent)">and every file you&rsquo;ve sent. It is the only part that reads the conversation.</text>

      <line x1="740" y1="130" x2="766" y2="130" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dfn4-a)" />
      <rect x="770" y="98" width="250" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="895" y="125" fontSize="12" fill="currentColor" textAnchor="middle">Just a question? It answers</text>
      <text className="svg-label" x="895" y="145" fontSize="12" fill="currentColor" textAnchor="middle">and the turn ends here.</text>

      {/* ---- out to the writers ---- */}
      <line x1="480" y1="208" x2="480" y2="244" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-mono" x="492" y="230" fontSize="10" fill="var(--doc-accent)">an instruction each, plus only the files it needs</text>
      <path d="M112 244 H 928" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <line x1="112" y1="244" x2="112" y2="268" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dfn4-c)" />
      <line x1="316" y1="244" x2="316" y2="268" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dfn4-c)" />
      <line x1="520" y1="244" x2="520" y2="268" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dfn4-c)" />
      <line x1="724" y1="244" x2="724" y2="268" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dfn4-c)" />
      <line x1="928" y1="244" x2="928" y2="268" stroke="var(--doc-accent)" strokeWidth="1.3" strokeDasharray="5 4" markerEnd="url(#dfn4-c)" />

      {/* ---- the five writers ---- */}
      <rect x="20" y="272" width="184" height="118" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="36" y="300" fontSize="12.5" fill="currentColor">Market Analysis</text>
      <text className="svg-sub" x="36" y="322" fontSize="10.5" fill="var(--doc-accent)">your readings and</text>
      <text className="svg-sub" x="36" y="340" fontSize="10.5" fill="var(--doc-accent)">your answers</text>
      <text className="svg-mono" x="36" y="372" fontSize="9.5" fill="currentColor" opacity=".5">searches the web</text>

      <rect x="224" y="272" width="184" height="118" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="240" y="300" fontSize="12.5" fill="currentColor">Competitive Analysis</text>
      <text className="svg-sub" x="240" y="322" fontSize="10.5" fill="var(--doc-accent)">your readings and</text>
      <text className="svg-sub" x="240" y="340" fontSize="10.5" fill="var(--doc-accent)">your answers</text>
      <text className="svg-mono" x="240" y="372" fontSize="9.5" fill="currentColor" opacity=".5">searches the web</text>

      <rect x="428" y="272" width="184" height="118" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="444" y="300" fontSize="12.5" fill="currentColor">Brand Bible</text>
      <text className="svg-sub" x="444" y="322" fontSize="10.5" fill="var(--doc-accent)">+ the first two documents</text>
      <text className="svg-sub" x="444" y="340" fontSize="10.5" fill="var(--doc-accent)">and your homepage&rsquo;s look</text>
      <text className="svg-mono" x="444" y="372" fontSize="9.5" fill="currentColor" opacity=".5">searches the web</text>

      <rect x="632" y="272" width="184" height="118" rx="9" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="648" y="300" fontSize="12.5" fill="currentColor">Buyer Personas</text>
      <text className="svg-sub" x="648" y="322" fontSize="10.5" fill="var(--doc-accent)">+ the first two documents,</text>
      <text className="svg-sub" x="648" y="340" fontSize="10.5" fill="var(--doc-accent)">and fits itself to them</text>
      <text className="svg-mono" x="648" y="372" fontSize="9.5" fill="currentColor" opacity=".5">searches the web</text>

      <rect x="836" y="272" width="184" height="118" rx="9" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" strokeDasharray="5 4" />
      <text className="svg-label" x="852" y="300" fontSize="12.5" fill="currentColor">Company Blueprint</text>
      <text className="svg-sub" x="852" y="322" fontSize="10.5" fill="var(--doc-accent)">the four documents,</text>
      <text className="svg-sub" x="852" y="340" fontSize="10.5" fill="var(--doc-accent)">and nothing else</text>
      <text className="svg-mono" x="852" y="372" fontSize="9.5" fill="currentColor" opacity=".5">always sent on its own</text>

      {/* ---- back to the strategist ---- */}
      <line x1="112" y1="390" x2="112" y2="414" stroke="currentColor" strokeOpacity=".45" />
      <line x1="316" y1="390" x2="316" y2="414" stroke="currentColor" strokeOpacity=".45" />
      <line x1="724" y1="390" x2="724" y2="414" stroke="currentColor" strokeOpacity=".45" />
      <line x1="928" y1="390" x2="928" y2="414" stroke="currentColor" strokeOpacity=".45" />
      <path d="M112 414 H 928" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <line x1="520" y1="390" x2="520" y2="440" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dfn4-a)" />

      <rect x="300" y="444" width="440" height="88" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="520" y="472" fontSize="12.5" fill="currentColor" textAnchor="middle">Back to the strategist</text>
      <text className="svg-sub" x="520" y="494" fontSize="10.5" fill="currentColor" opacity=".68" textAnchor="middle">It sends the next writers, or writes its closing message.</text>
      <text className="svg-mono" x="520" y="516" fontSize="9.5" fill="currentColor" opacity=".5" textAnchor="middle">↻ repeats until what you asked for is drafted</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="556" x2="1020" y2="556" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="584" fontSize="12.5" fill="var(--doc-accent)">Files go where they belong.</text>
      <text className="svg-sub" x="206" y="584" fontSize="12" fill="currentColor" opacity=".7">A file you attach reaches a writer only when the strategist sends it there &mdash; a tone-of-voice</text>
      <text className="svg-sub" x="20" y="606" fontSize="12" fill="currentColor" opacity=".7">guide to the Brand Bible, a competitor teardown to the Competitive Analysis &mdash; with a note saying what it is for.</text>
    </svg>
  );
}

/** 05 — what the other agents read from the Foundation. */
export function DiagramFeeds() {
  return (
    <svg
      viewBox="0 0 1040 540"
      role="img"
      aria-label="What every other agent reads. The Foundation hands on four things: the Brand Bible, the Buyer Personas, the Competitive Analysis, and your homepage's pictures; the Market Analysis and the Blueprint's summary stay behind and reach other agents only through the documents written from them. The Email Marketing Agent reads the Brand Bible, the Buyer Personas and your homepage's pictures. The Meta Ad Agent reads all four. The PDP Agent, the Google Ad Agent and the TikTok Ad Agent read the Brand Bible and the Buyer Personas, the last two only when linked to a brand. Your colours and fonts travel inside the Brand Bible."
    >
      <defs>
        <Arrow id="dfn5-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="var(--doc-accent)">THE FOUNDATION HANDS ON</text>
      <text className="svg-tag" x="330" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHICH AGENT READS WHAT</text>

      {/* ---- what the Foundation hands on ---- */}
      <rect x="20" y="48" width="260" height="380" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-title" x="150" y="80" fontSize="15" fill="var(--doc-accent)" textAnchor="middle">Foundation Agent</text>

      <rect x="40" y="100" width="220" height="44" rx="7" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" />
      <text className="svg-label" x="56" y="127" fontSize="12.5" fill="var(--doc-accent)">Brand Bible</text>
      <rect x="40" y="156" width="220" height="44" rx="7" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" />
      <text className="svg-label" x="56" y="183" fontSize="12.5" fill="var(--doc-accent)">Buyer Personas</text>
      <rect x="40" y="212" width="220" height="44" rx="7" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" />
      <text className="svg-label" x="56" y="239" fontSize="12.5" fill="var(--doc-accent)">Competitive Analysis</text>
      <rect x="40" y="268" width="220" height="44" rx="7" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" />
      <text className="svg-label" x="56" y="295" fontSize="12.5" fill="var(--doc-accent)">Homepage pictures</text>

      <line x1="40" y1="330" x2="260" y2="330" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="40" y="352" fontSize="10.5" fill="var(--doc-accent)" opacity=".85">Stays here: the Market Analysis</text>
      <text className="svg-sub" x="40" y="370" fontSize="10.5" fill="var(--doc-accent)" opacity=".85">and the Blueprint&rsquo;s summary. They</text>
      <text className="svg-sub" x="40" y="388" fontSize="10.5" fill="var(--doc-accent)" opacity=".85">reach other agents through the</text>
      <text className="svg-sub" x="40" y="406" fontSize="10.5" fill="var(--doc-accent)" opacity=".85">documents written from them.</text>

      <line x1="280" y1="238" x2="326" y2="238" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dfn5-c)" />

      {/* ---- the matrix ---- */}
      <text className="svg-label" x="591" y="70" fontSize="11.5" fill="currentColor" textAnchor="middle">Brand</text>
      <text className="svg-label" x="591" y="88" fontSize="11.5" fill="currentColor" textAnchor="middle">Bible</text>
      <text className="svg-label" x="714" y="70" fontSize="11.5" fill="currentColor" textAnchor="middle">Buyer</text>
      <text className="svg-label" x="714" y="88" fontSize="11.5" fill="currentColor" textAnchor="middle">Personas</text>
      <text className="svg-label" x="836" y="70" fontSize="11.5" fill="currentColor" textAnchor="middle">Competitive</text>
      <text className="svg-label" x="836" y="88" fontSize="11.5" fill="currentColor" textAnchor="middle">Analysis</text>
      <text className="svg-label" x="959" y="70" fontSize="11.5" fill="currentColor" textAnchor="middle">Homepage</text>
      <text className="svg-label" x="959" y="88" fontSize="11.5" fill="currentColor" textAnchor="middle">pictures</text>
      <line x1="330" y1="104" x2="1020" y2="104" stroke="currentColor" strokeOpacity=".3" />

      {/* row 1 — Email */}
      <rect x="330" y="108" width="690" height="56" rx="6" fill="var(--doc-surface2)" />
      <text className="svg-label" x="348" y="132" fontSize="12.5" fill="currentColor">Email Marketing Agent</text>
      <text className="svg-sub" x="348" y="150" fontSize="10.5" fill="currentColor" opacity=".6">campaigns and sequences</text>
      <circle cx="591" cy="136" r="6" fill="var(--doc-accent)" />
      <circle cx="714" cy="136" r="6" fill="var(--doc-accent)" />
      <line x1="830" y1="136" x2="842" y2="136" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
      <circle cx="959" cy="136" r="6" fill="var(--doc-accent)" />

      {/* row 2 — Meta Ad */}
      <text className="svg-label" x="348" y="188" fontSize="12.5" fill="currentColor">Meta Ad Agent</text>
      <text className="svg-sub" x="348" y="206" fontSize="10.5" fill="currentColor" opacity=".6">Facebook and Instagram ads</text>
      <circle cx="591" cy="192" r="6" fill="var(--doc-accent)" />
      <circle cx="714" cy="192" r="6" fill="var(--doc-accent)" />
      <circle cx="836" cy="192" r="6" fill="var(--doc-accent)" />
      <circle cx="959" cy="192" r="6" fill="var(--doc-accent)" />

      {/* row 3 — PDP */}
      <rect x="330" y="220" width="690" height="56" rx="6" fill="var(--doc-surface2)" />
      <text className="svg-label" x="348" y="244" fontSize="12.5" fill="currentColor">PDP Agent</text>
      <text className="svg-sub" x="348" y="262" fontSize="10.5" fill="currentColor" opacity=".6">product page audits</text>
      <circle cx="591" cy="248" r="6" fill="var(--doc-accent)" />
      <circle cx="714" cy="248" r="6" fill="var(--doc-accent)" />
      <line x1="830" y1="248" x2="842" y2="248" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
      <line x1="953" y1="248" x2="965" y2="248" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />

      {/* row 4 — Google Ad */}
      <text className="svg-label" x="348" y="300" fontSize="12.5" fill="currentColor">Google Ad Agent</text>
      <text className="svg-sub" x="348" y="318" fontSize="10.5" fill="currentColor" opacity=".6">only when linked to a brand</text>
      <circle cx="591" cy="304" r="6" fill="none" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <circle cx="714" cy="304" r="6" fill="none" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <line x1="830" y1="304" x2="842" y2="304" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
      <line x1="953" y1="304" x2="965" y2="304" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />

      {/* row 5 — TikTok Ad */}
      <rect x="330" y="332" width="690" height="56" rx="6" fill="var(--doc-surface2)" />
      <text className="svg-label" x="348" y="356" fontSize="12.5" fill="currentColor">TikTok Ad Agent</text>
      <text className="svg-sub" x="348" y="374" fontSize="10.5" fill="currentColor" opacity=".6">only when linked to a brand</text>
      <circle cx="591" cy="360" r="6" fill="none" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <circle cx="714" cy="360" r="6" fill="none" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <line x1="830" y1="360" x2="842" y2="360" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
      <line x1="953" y1="360" x2="965" y2="360" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />

      {/* legend */}
      <circle cx="336" cy="416" r="5" fill="var(--doc-accent)" />
      <text className="svg-mono" x="348" y="420" fontSize="10" fill="currentColor" opacity=".6">read when a session starts</text>
      <circle cx="530" cy="416" r="5" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-mono" x="542" y="420" fontSize="10" fill="currentColor" opacity=".6">read only if the session is linked to a brand</text>
      <line x1="842" y1="416" x2="854" y2="416" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" />
      <text className="svg-mono" x="864" y="420" fontSize="10" fill="currentColor" opacity=".6">not read</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="460" x2="1020" y2="460" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="488" fontSize="12.5" fill="var(--doc-accent)">Your colours and fonts travel inside the Brand Bible.</text>
      <text className="svg-sub" x="20" y="512" fontSize="12" fill="currentColor" opacity=".7">Its last section is the design identity read from your homepage, so every agent that reads the Brand Bible has your look too.</text>
    </svg>
  );
}
