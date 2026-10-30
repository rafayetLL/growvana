import React from 'react';

// The five schematics for the Forecast Agent documentation page.
//
// THE DIAGRAMS CARRY THE STRUCTURE. The prose beside them explains craft and
// judgement; anything about how the parts fit together — what reads what, what
// is handed to whom, what never happens — belongs in a drawing here rather than
// in another paragraph there.
//
// Same conventions as MetaAdDocDiagrams.jsx and EmailDocDiagrams.jsx, so the
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

/** 01 — five inputs, the agent, three kinds of output. */
export function DiagramContext() {
  return (
    <svg
      viewBox="0 0 1040 500"
      role="img"
      aria-label="Five inputs — your Amazon exports, your weekly reports and decks, your question, your answers to its one brief, and files you add later — feed the Forecast Agent, which writes small programs that run on those files and has no internet and no link to your Amazon account. It hands back a forecast workbook, an answer in chat, and on request a methodology write-up, a deck, a PDF or a chart."
    >
      <defs>
        <Arrow id="df1-a" />
        <Arrow id="df1-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="var(--doc-accent)">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the five inputs ---- */}
      <rect x="20" y="48" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="76" fontSize="13" fill="currentColor">Your Amazon exports</text>
      <text className="svg-sub" x="38" y="98" fontSize="11.5" fill="currentColor" opacity=".62">sales, POs, inventory, ads</text>

      <rect x="20" y="134" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="162" fontSize="13" fill="currentColor">Weekly reports</text>
      <text className="svg-sub" x="38" y="184" fontSize="11.5" fill="currentColor" opacity=".62">the CSM deck, PDFs</text>

      <rect x="20" y="220" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="248" fontSize="13" fill="currentColor">Your question</text>
      <text className="svg-sub" x="38" y="270" fontSize="11.5" fill="currentColor" opacity=".62">in your own words</text>

      <rect x="20" y="306" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="334" fontSize="13" fill="currentColor">Your answers</text>
      <text className="svg-sub" x="38" y="356" fontSize="11.5" fill="currentColor" opacity=".62">to its one brief</text>

      <rect x="20" y="392" width="188" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="420" fontSize="13" fill="currentColor">Files added later</text>
      <text className="svg-sub" x="38" y="442" fontSize="11.5" fill="currentColor" opacity=".62">on any later message</text>

      {/* ---- five routes in ---- */}
      <line x1="208" y1="82" x2="432" y2="82" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df1-c)" />
      <text className="svg-mono" x="320" y="72" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">opened and read, never changed</text>

      <line x1="208" y1="168" x2="432" y2="168" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df1-c)" />
      <text className="svg-mono" x="320" y="158" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">pictures of pages are read too</text>

      <line x1="208" y1="254" x2="432" y2="254" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df1-c)" />
      <text className="svg-mono" x="320" y="244" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">decides the kind of job</text>

      <line x1="208" y1="340" x2="432" y2="340" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df1-c)" />
      <text className="svg-mono" x="320" y="330" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">settle the plan before it builds</text>

      <line x1="208" y1="426" x2="432" y2="426" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df1-c)" />
      <text className="svg-mono" x="320" y="416" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">join the same picture</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="44" width="224" height="420" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="80" fontSize="16" fill="var(--doc-accent)" textAnchor="middle">Forecast Agent</text>
      <line x1="460" y1="96" x2="636" y2="96" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="548" y="124" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">One analyst, one ongoing</text>
      <text className="svg-sub" x="548" y="146" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">conversation per brand.</text>
      <text className="svg-sub" x="548" y="168" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">It writes small programs</text>
      <text className="svg-sub" x="548" y="190" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">that run on your files.</text>

      <rect x="460" y="216" width="176" height="54" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="238" fontSize="11.5" fill="currentColor" textAnchor="middle">A forecast, a what-if,</text>
      <text className="svg-label" x="548" y="258" fontSize="11.5" fill="currentColor" textAnchor="middle">or a briefing</text>

      <text className="svg-sub" x="548" y="304" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">Every number is worked out</text>
      <text className="svg-sub" x="548" y="326" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">by a program and read back</text>
      <text className="svg-sub" x="548" y="348" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">before it is stated.</text>

      <text className="svg-sub" x="548" y="386" fontSize="11.5" fill="var(--doc-warm)" textAnchor="middle">No internet, and no link</text>
      <text className="svg-sub" x="548" y="408" fontSize="11.5" fill="var(--doc-warm)" textAnchor="middle">to your Amazon account.</text>
      <text className="svg-sub" x="548" y="430" fontSize="11.5" fill="var(--doc-warm)" textAnchor="middle">Only what you send.</text>

      {/* ---- what comes back ---- */}
      <line x1="660" y1="254" x2="796" y2="254" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df1-a)" />
      <text className="svg-mono" x="728" y="242" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">published the</text>
      <text className="svg-mono" x="728" y="270" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">moment it&rsquo;s ready</text>

      <rect x="800" y="76" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="108" fontSize="13" fill="currentColor">Forecast workbook</text>
      <text className="svg-sub" x="818" y="130" fontSize="11" fill="currentColor" opacity=".62">Excel with live formulas,</text>
      <text className="svg-sub" x="818" y="148" fontSize="11" fill="currentColor" opacity=".62">weekly and per ASIN</text>

      <rect x="800" y="212" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="244" fontSize="13" fill="currentColor">An answer in chat</text>
      <text className="svg-sub" x="818" y="266" fontSize="11" fill="currentColor" opacity=".62">headline numbers, each</text>
      <text className="svg-sub" x="818" y="284" fontSize="11" fill="currentColor" opacity=".62">with where it came from</text>

      <rect x="800" y="348" width="220" height="84" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="818" y="380" fontSize="13" fill="currentColor">Only when you ask</text>
      <text className="svg-sub" x="818" y="402" fontSize="11" fill="currentColor" opacity=".62">a methodology write-up,</text>
      <text className="svg-sub" x="818" y="420" fontSize="11" fill="currentColor" opacity=".62">a deck, a PDF, a chart</text>

      <text className="svg-sub" x="910" y="470" fontSize="11" fill="currentColor" opacity=".5" textAnchor="middle">opens in a panel beside the chat</text>
    </svg>
  );
}

/** 02 — the brief: read first, propose once, then build on any reply. */
export function DiagramBrief() {
  return (
    <svg
      viewBox="0 0 1040 664"
      role="img"
      aria-label="Before the first build in a thread, the agent opens every file you sent, then sends one brief with four parts: what it understood, what it will assume, what you mentioned that never arrived, and up to three questions, each with a recommended answer. Any reply — go, a correction, the missing file, or an answer — means build, and a skipped question takes the recommended answer. There is no brief at all for a question about how a week went, or for work already under way. It never asks about growth, weeks of cover, pricing, which tabs to build or formatting, nor anything your files already answer."
    >
      <defs>
        <Arrow id="df2-a" />
        <Arrow id="df2-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the request and the reading ---- */}
      <rect x="20" y="48" width="200" height="110" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="120" y="82" fontSize="13" fill="currentColor" textAnchor="middle">You ask for</text>
      <text className="svg-label" x="120" y="102" fontSize="13" fill="currentColor" textAnchor="middle">a forecast</text>
      <text className="svg-sub" x="120" y="126" fontSize="11" fill="currentColor" opacity=".62" textAnchor="middle">and attach your exports</text>

      <line x1="220" y1="103" x2="246" y2="103" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df2-a)" />

      <rect x="250" y="48" width="210" height="110" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="268" y="76" fontSize="13" fill="currentColor">It opens every file</text>
      <text className="svg-sub" x="268" y="98" fontSize="11" fill="currentColor" opacity=".68">the account, the channel,</text>
      <text className="svg-sub" x="268" y="116" fontSize="11" fill="currentColor" opacity=".68">the latest complete week,</text>
      <text className="svg-sub" x="268" y="134" fontSize="11" fill="currentColor" opacity=".68">and what is missing</text>

      <line x1="460" y1="103" x2="486" y2="103" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df2-c)" />

      {/* ---- the brief ---- */}
      <rect x="490" y="48" width="530" height="304" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-tag" x="510" y="74" fontSize="9.5" fill="var(--doc-accent)">THE BRIEF &mdash; ONCE, BEFORE THE FIRST BUILD</text>

      <text className="svg-label" x="510" y="106" fontSize="12.5" fill="var(--doc-accent)">What I understood</text>
      <text className="svg-sub" x="510" y="126" fontSize="11" fill="var(--doc-accent)" opacity=".85">the goal and who reads it, the deliverable, the horizon, the channel,</text>
      <text className="svg-sub" x="510" y="144" fontSize="11" fill="var(--doc-accent)" opacity=".85">the revenue basis &mdash; and whether this is a target or a prediction</text>
      <line x1="510" y1="160" x2="1000" y2="160" stroke="var(--doc-accent)" strokeOpacity=".25" />

      <text className="svg-label" x="510" y="178" fontSize="12.5" fill="var(--doc-accent)">What I&rsquo;ll assume</text>
      <text className="svg-sub" x="510" y="198" fontSize="11" fill="var(--doc-accent)" opacity=".85">growth, weeks of cover, the promo calendar, which ASINs are in &mdash;</text>
      <text className="svg-sub" x="510" y="216" fontSize="11" fill="var(--doc-accent)" opacity=".85">its own calls, shown so you can correct them</text>
      <line x1="510" y1="232" x2="1000" y2="232" stroke="var(--doc-accent)" strokeOpacity=".25" />

      <text className="svg-label" x="510" y="250" fontSize="12.5" fill="var(--doc-accent)">What you mentioned that never arrived</text>
      <text className="svg-sub" x="510" y="270" fontSize="11" fill="var(--doc-accent)" opacity=".85">named the way you named it: &ldquo;the promo calendar you mentioned&rdquo;</text>
      <line x1="510" y1="284" x2="1000" y2="284" stroke="var(--doc-accent)" strokeOpacity=".25" />

      <text className="svg-label" x="510" y="302" fontSize="12.5" fill="var(--doc-accent)">Up to three questions</text>
      <text className="svg-sub" x="510" y="322" fontSize="11" fill="var(--doc-accent)" opacity=".85">each with two to five options and the answer it recommends</text>

      {/* ---- when there is no brief ---- */}
      <rect x="20" y="184" width="440" height="168" rx="10" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-tag" x="40" y="210" fontSize="9.5" fill="var(--doc-warm)">NO BRIEF AT ALL</text>
      <text className="svg-sub" x="40" y="238" fontSize="11" fill="var(--doc-warm)" opacity=".9">When you ask how a week went, which ASINs are at risk,</text>
      <text className="svg-sub" x="40" y="256" fontSize="11" fill="var(--doc-warm)" opacity=".9">or whether ad spend is working &mdash; it simply answers,</text>
      <text className="svg-sub" x="40" y="274" fontSize="11" fill="var(--doc-warm)" opacity=".9">with the numbers and the files they came from.</text>
      <text className="svg-sub" x="40" y="302" fontSize="11" fill="var(--doc-warm)" opacity=".9">When it is carrying on work already started</text>
      <text className="svg-sub" x="40" y="320" fontSize="11" fill="var(--doc-warm)" opacity=".9">in this thread.</text>

      {/* ---- the reply ---- */}
      <line x1="755" y1="352" x2="755" y2="380" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df2-a)" />

      <rect x="490" y="384" width="530" height="100" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="510" y="410" fontSize="12.5" fill="currentColor">Your reply &mdash; any of these means build</text>
      <rect x="510" y="428" width="114" height="36" rx="18" fill="var(--doc-surface2)" />
      <text className="svg-sub" x="567" y="451" fontSize="11.5" fill="currentColor" textAnchor="middle">go</text>
      <rect x="636" y="428" width="114" height="36" rx="18" fill="var(--doc-surface2)" />
      <text className="svg-sub" x="693" y="451" fontSize="11.5" fill="currentColor" textAnchor="middle">a correction</text>
      <rect x="762" y="428" width="114" height="36" rx="18" fill="var(--doc-surface2)" />
      <text className="svg-sub" x="819" y="451" fontSize="11.5" fill="currentColor" textAnchor="middle">the missing file</text>
      <rect x="888" y="428" width="114" height="36" rx="18" fill="var(--doc-surface2)" />
      <text className="svg-sub" x="945" y="451" fontSize="11.5" fill="currentColor" textAnchor="middle">an answer</text>

      <line x1="755" y1="484" x2="755" y2="512" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#df2-c)" />

      <rect x="490" y="516" width="530" height="64" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-label" x="510" y="542" fontSize="13" fill="var(--doc-accent)">It builds</text>
      <text className="svg-sub" x="510" y="562" fontSize="11" fill="var(--doc-accent)" opacity=".9">a skipped question takes the recommended answer, listed as one to check</text>

      {/* ---- what it never asks ---- */}
      <rect x="20" y="384" width="440" height="196" rx="10" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-tag" x="40" y="410" fontSize="9.5" fill="var(--doc-warm)">NEVER ASKED</text>
      <text className="svg-sub" x="40" y="438" fontSize="11" fill="var(--doc-warm)" opacity=".9">Organic growth, weeks of cover, pricing, which</text>
      <text className="svg-sub" x="40" y="456" fontSize="11" fill="var(--doc-warm)" opacity=".9">tabs to build, or how anything is formatted &mdash;</text>
      <text className="svg-sub" x="40" y="474" fontSize="11" fill="var(--doc-warm)" opacity=".9">those are its call, listed under what it will assume.</text>
      <text className="svg-sub" x="40" y="502" fontSize="11" fill="var(--doc-warm)" opacity=".9">Anything your files already answer.</text>
      <text className="svg-sub" x="40" y="530" fontSize="11" fill="var(--doc-warm)" opacity=".9">Anything that would not change the method</text>
      <text className="svg-sub" x="40" y="548" fontSize="11" fill="var(--doc-warm)" opacity=".9">or the headline numbers.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="612" x2="1020" y2="612" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="640" fontSize="12.5" fill="var(--doc-accent)">Usually one round.</text>
      <text className="svg-sub" x="160" y="640" fontSize="12" fill="currentColor" opacity=".7">Your reply is the go-ahead. It briefs again only if that reply changes the job itself.</text>
    </svg>
  );
}

/** 03 — one message: the agent writes a program, the program writes the numbers. */
export function DiagramTurn() {
  return (
    <svg
      viewBox="0 0 1040 690"
      role="img"
      aria-label="One message. The Forecast Agent reads your message, its own notes and the files the question needs, and decides the method. Then a loop: it writes a program, the program runs on your files and does every calculation, and the agent reads the answer back — repeated until the work is done. No figure is typed in from memory. It then builds the workbook with one program, checks the finished file, and only then publishes it and replies."
    >
      <defs>
        <Arrow id="df3-a" />
        <Arrow id="df3-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the message and the agent ---- */}
      <rect x="20" y="40" width="180" height="110" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="110" y="84" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="110" y="104" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="110" y="126" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">and any new files</text>

      <line x1="200" y1="95" x2="226" y2="95" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df3-a)" />

      <rect x="230" y="40" width="790" height="110" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="250" y="70" fontSize="13.5" fill="var(--doc-accent)">The Forecast Agent</text>
      <text className="svg-sub" x="250" y="94" fontSize="11" fill="var(--doc-accent)" opacity=".9">Reads your message, then its own notes from earlier messages, then the files the question needs.</text>
      <text className="svg-sub" x="250" y="112" fontSize="11" fill="var(--doc-accent)" opacity=".9">Decides what kind of job this is and which method fits &mdash; then hands every calculation to a program.</text>

      {/* ---- the loop ---- */}
      <text className="svg-tag" x="20" y="178" fontSize="9.5" fill="var(--doc-accent)">THE AGENT WRITES THE PROGRAM; THE PROGRAM WRITES THE NUMBERS</text>
      <line x1="20" y1="190" x2="1020" y2="190" stroke="var(--doc-accent)" strokeOpacity=".4" strokeDasharray="5 5" />

      <path d="M330 150 V 210 H 170 V 230" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#df3-c)" />

      <rect x="20" y="234" width="300" height="130" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="256" fontSize="9.5" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="40" y="280" fontSize="13" fill="currentColor">It writes a program</text>
      <text className="svg-sub" x="40" y="302" fontSize="11" fill="currentColor" opacity=".68">Plain step-by-step instructions:</text>
      <text className="svg-sub" x="40" y="320" fontSize="11" fill="currentColor" opacity=".68">open this export, find the latest</text>
      <text className="svg-sub" x="40" y="338" fontSize="11" fill="currentColor" opacity=".68">complete week, total units by ASIN.</text>

      <line x1="320" y1="299" x2="356" y2="299" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df3-a)" />

      <rect x="360" y="234" width="320" height="130" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="380" y="256" fontSize="9.5" fill="currentColor" opacity=".5">2</text>
      <text className="svg-label" x="380" y="280" fontSize="13" fill="currentColor">The program runs on your files</text>
      <text className="svg-sub" x="380" y="302" fontSize="11" fill="currentColor" opacity=".68">The computer does every sum, every</text>
      <text className="svg-sub" x="380" y="320" fontSize="11" fill="currentColor" opacity=".68">average, every split by product &mdash;</text>
      <text className="svg-sub" x="380" y="338" fontSize="11" fill="currentColor" opacity=".68">the same way every time it runs.</text>

      <line x1="680" y1="299" x2="716" y2="299" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df3-a)" />

      <rect x="720" y="234" width="300" height="130" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="740" y="256" fontSize="9.5" fill="currentColor" opacity=".5">3</text>
      <text className="svg-label" x="740" y="280" fontSize="13" fill="currentColor">It reads the answer back</text>
      <text className="svg-sub" x="740" y="302" fontSize="11" fill="currentColor" opacity=".68">and decides what to look at next.</text>
      <text className="svg-sub" x="740" y="320" fontSize="11" fill="currentColor" opacity=".68">A number is stated to you only</text>
      <text className="svg-sub" x="740" y="338" fontSize="11" fill="currentColor" opacity=".68">after it has been read back.</text>

      <path d="M870 364 V 392 H 170 V 368" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.3" strokeDasharray="5 4" markerEnd="url(#df3-a)" />
      <text className="svg-mono" x="520" y="412" fontSize="9.5" fill="currentColor" opacity=".6" textAnchor="middle">repeated until the work is done</text>

      <rect x="20" y="428" width="1000" height="40" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="453" fontSize="11" fill="var(--doc-warm)">No figure is ever typed in from memory, and no worked-out value is written into a workbook by hand.</text>

      {/* ---- build, check, publish ---- */}
      <line x1="170" y1="468" x2="170" y2="496" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df3-a)" />

      <rect x="20" y="500" width="300" height="130" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="40" y="528" fontSize="13" fill="currentColor">Build the workbook</text>
      <text className="svg-sub" x="40" y="550" fontSize="11" fill="currentColor" opacity=".68">One program writes every tab</text>
      <text className="svg-sub" x="40" y="568" fontSize="11" fill="currentColor" opacity=".68">end to end, with live formulas</text>
      <text className="svg-sub" x="40" y="586" fontSize="11" fill="currentColor" opacity=".68">rather than pasted results.</text>

      <line x1="320" y1="565" x2="356" y2="565" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df3-a)" />

      <rect x="360" y="500" width="320" height="130" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="380" y="528" fontSize="13" fill="currentColor">Check the finished file</text>
      <text className="svg-sub" x="380" y="550" fontSize="11" fill="currentColor" opacity=".68">Recalculate until no formula errors,</text>
      <text className="svg-sub" x="380" y="568" fontSize="11" fill="currentColor" opacity=".68">then test the week grid, the seasonal</text>
      <text className="svg-sub" x="380" y="586" fontSize="11" fill="currentColor" opacity=".68">curve, the run-rate, the totals and</text>
      <text className="svg-sub" x="380" y="604" fontSize="11" fill="currentColor" opacity=".68">every figure it means to quote.</text>

      <line x1="680" y1="565" x2="716" y2="565" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df3-a)" />

      <rect x="720" y="500" width="300" height="130" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="740" y="528" fontSize="13" fill="currentColor">Publish, then reply</text>
      <text className="svg-sub" x="740" y="550" fontSize="11" fill="currentColor" opacity=".68">The download appears as soon as</text>
      <text className="svg-sub" x="740" y="568" fontSize="11" fill="currentColor" opacity=".68">the file is published. The reply</text>
      <text className="svg-sub" x="740" y="586" fontSize="11" fill="currentColor" opacity=".68">leads with the headline numbers.</text>

      <text className="svg-sub" x="20" y="664" fontSize="11" fill="var(--doc-warm)">Nothing is published before the checks pass &mdash; once you can download a file, it is the checked one.</text>
    </svg>
  );
}

/** 04 — what one thread holds, and what the agent may do with each part. */
export function DiagramThread() {
  return (
    <svg
      viewBox="0 0 1040 560"
      role="img"
      aria-label="One thread holds four things: the conversation, your files, the agent's working notes, and the deliverables. The agent reads its notes at the start of every message. Your files are read and never changed. The notes — what each file covers, the latest complete week, what is missing, the brief and your answers, and the programs it wrote — are rewritten as it works. Deliverables are written only once checked, and a rebuild replaces the old file under the same name. Walled off from the agent: every other thread, the internet and your Amazon account. Text inside your files is read as data, never as an instruction."
    >
      <defs>
        <Arrow id="df4-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the agent ---- */}
      <rect x="20" y="150" width="220" height="200" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-title" x="130" y="186" fontSize="14" fill="var(--doc-accent)" textAnchor="middle">Forecast Agent</text>
      <line x1="40" y1="200" x2="220" y2="200" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="130" y="226" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">Every message starts by</text>
      <text className="svg-sub" x="130" y="244" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">reading its own notes,</text>
      <text className="svg-sub" x="130" y="262" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">then re-opens only what</text>
      <text className="svg-sub" x="130" y="280" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">changed or what the new</text>
      <text className="svg-sub" x="130" y="298" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">question needs.</text>

      <line x1="240" y1="250" x2="286" y2="250" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#df4-c)" />

      {/* ---- the thread ---- */}
      <rect x="290" y="40" width="730" height="420" rx="12" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="310" y="66" fontSize="9.5" fill="currentColor" opacity=".6">ONE THREAD &mdash; ONE BRAND, ONE ONGOING CONVERSATION</text>

      <rect x="310" y="86" width="340" height="170" rx="9" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <text className="svg-label" x="330" y="114" fontSize="13" fill="currentColor">The conversation</text>
      <text className="svg-sub" x="330" y="136" fontSize="11" fill="currentColor" opacity=".68">Every message, both sides, in order &mdash;</text>
      <text className="svg-sub" x="330" y="154" fontSize="11" fill="currentColor" opacity=".68">so a later message builds on the</text>
      <text className="svg-sub" x="330" y="172" fontSize="11" fill="currentColor" opacity=".68">earlier ones instead of starting over.</text>
      <text className="svg-mono" x="330" y="234" fontSize="9.5" fill="currentColor" opacity=".55">kept for the life of the thread</text>

      <rect x="670" y="86" width="330" height="170" rx="9" fill="none" stroke="var(--doc-accent)" strokeOpacity=".7" />
      <text className="svg-label" x="690" y="114" fontSize="13" fill="var(--doc-accent)">Your files</text>
      <text className="svg-sub" x="690" y="136" fontSize="11" fill="currentColor" opacity=".68">Everything you have ever sent to</text>
      <text className="svg-sub" x="690" y="154" fontSize="11" fill="currentColor" opacity=".68">this thread, not just this message&rsquo;s.</text>
      <text className="svg-sub" x="690" y="172" fontSize="11" fill="currentColor" opacity=".68">Never changed, moved or deleted.</text>
      <text className="svg-mono" x="690" y="234" fontSize="9.5" fill="var(--doc-accent)">read, never changed</text>

      <rect x="310" y="272" width="340" height="170" rx="9" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <text className="svg-label" x="330" y="300" fontSize="13" fill="currentColor">Working notes</text>
      <text className="svg-sub" x="330" y="322" fontSize="11" fill="currentColor" opacity=".68">What each file covers, the latest</text>
      <text className="svg-sub" x="330" y="340" fontSize="11" fill="currentColor" opacity=".68">complete week, what is missing,</text>
      <text className="svg-sub" x="330" y="358" fontSize="11" fill="currentColor" opacity=".68">the brief and your answers, and</text>
      <text className="svg-sub" x="330" y="376" fontSize="11" fill="currentColor" opacity=".68">the programs it wrote.</text>
      <text className="svg-mono" x="330" y="420" fontSize="9.5" fill="currentColor" opacity=".55">read and rewritten as it works</text>

      <rect x="670" y="272" width="330" height="170" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".35" />
      <text className="svg-label" x="690" y="300" fontSize="13" fill="currentColor">Deliverables</text>
      <text className="svg-sub" x="690" y="322" fontSize="11" fill="currentColor" opacity=".68">The finished files you download.</text>
      <text className="svg-sub" x="690" y="340" fontSize="11" fill="currentColor" opacity=".68">A rebuild replaces the old file</text>
      <text className="svg-sub" x="690" y="358" fontSize="11" fill="currentColor" opacity=".68">whole, under the same name.</text>
      <text className="svg-mono" x="690" y="420" fontSize="9.5" fill="currentColor" opacity=".55">written only once checked</text>

      {/* ---- what is walled off ---- */}
      <rect x="20" y="480" width="1000" height="64" rx="8" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="505" fontSize="11" fill="var(--doc-warm)">Walled off from it: every other thread, the internet, and your Amazon account itself.</text>
      <text className="svg-sub" x="40" y="525" fontSize="11" fill="var(--doc-warm)">Text inside your files is read as data, never as an instruction &mdash; if a cell seems aimed at the agent, it tells you so.</text>
    </svg>
  );
}

/** 05 — the Vendor Central chain, and the three method shapes chosen by your words. */
export function DiagramMethods() {
  return (
    <svg
      viewBox="0 0 1040 608"
      role="img"
      aria-label="On Vendor Central everything comes back to one chain: weekly sell-through, Amazon's on-hand stock and any promo or advertising change together set next week's purchase order, because Amazon restocks each ASIN to about six to eight weeks of forward cover; revenue rides on top of the PO plan. Below, the shape of the forecast follows your words: what does Q4 look like leads to run-rate times seasonality times promo, the default; what does it take to hit a number leads to a target-solved plan with three scenarios, a requirement rather than a prediction; when do I reorder from my supplier leads to a per-ASIN forecast with a reorder engine for Seller Central or FBA. Any of the three can be run as-is or as a what-if."
    >
      <defs>
        <Arrow id="df5-a" />
        <Arrow id="df5-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">ON VENDOR CENTRAL, EVERYTHING COMES BACK TO ONE CHAIN</text>

      {/* ---- the three drivers ---- */}
      <rect x="20" y="48" width="250" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="74" fontSize="13" fill="currentColor">Weekly sell-through</text>
      <text className="svg-sub" x="38" y="94" fontSize="11" fill="currentColor" opacity=".62">how fast each ASIN is selling</text>

      <rect x="20" y="128" width="250" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="154" fontSize="13" fill="currentColor">Amazon&rsquo;s on-hand stock</text>
      <text className="svg-sub" x="38" y="174" fontSize="11" fill="currentColor" opacity=".62">what sits in its warehouses now</text>

      <rect x="20" y="208" width="250" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="234" fontSize="13" fill="currentColor">Promo and ad changes</text>
      <text className="svg-sub" x="38" y="254" fontSize="11" fill="currentColor" opacity=".62">the extra sell-through they drive</text>

      <path d="M270 80 H 298 V 130 H 326" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df5-c)" />
      <line x1="270" y1="160" x2="326" y2="160" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df5-c)" />
      <path d="M270 240 H 298 V 190 H 326" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#df5-c)" />

      {/* ---- the PO ---- */}
      <rect x="330" y="88" width="300" height="144" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="350" y="116" fontSize="13" fill="var(--doc-accent)">Next week&rsquo;s purchase order</text>
      <text className="svg-sub" x="350" y="140" fontSize="11" fill="var(--doc-accent)" opacity=".9">Amazon restocks each ASIN to about</text>
      <text className="svg-sub" x="350" y="158" fontSize="11" fill="var(--doc-accent)" opacity=".9">6&ndash;8 weeks of forward cover. The gap</text>
      <text className="svg-sub" x="350" y="176" fontSize="11" fill="var(--doc-accent)" opacity=".9">between what is on hand and that</text>
      <text className="svg-sub" x="350" y="194" fontSize="11" fill="var(--doc-accent)" opacity=".9">target is the PO.</text>

      <line x1="630" y1="160" x2="686" y2="160" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#df5-a)" />

      <rect x="690" y="88" width="330" height="144" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="710" y="116" fontSize="13" fill="currentColor">Revenue rides on top</text>
      <text className="svg-sub" x="710" y="140" fontSize="11" fill="currentColor" opacity=".68">The weekly PO by ASIN is the answer.</text>
      <text className="svg-sub" x="710" y="158" fontSize="11" fill="currentColor" opacity=".68">Revenue follows from it, with the</text>
      <text className="svg-sub" x="710" y="176" fontSize="11" fill="currentColor" opacity=".68">ratio between Shipped COGS and</text>
      <text className="svg-sub" x="710" y="194" fontSize="11" fill="currentColor" opacity=".68">Shipped Revenue carried alongside.</text>

      {/* ---- the three shapes ---- */}
      <line x1="20" y1="290" x2="1020" y2="290" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-tag" x="20" y="318" fontSize="9.5" fill="var(--doc-accent)">THE SHAPE FOLLOWS YOUR WORDS, NOT THE FILES</text>

      <rect x="20" y="336" width="316" height="180" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-sub" x="40" y="364" fontSize="12" fill="currentColor" opacity=".72">&ldquo;What does Q4 look like?&rdquo;</text>
      <line x1="40" y1="382" x2="316" y2="382" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="40" y="410" fontSize="13" fill="var(--doc-accent)">Run-rate &times; seasonality &times; promo</text>
      <text className="svg-sub" x="40" y="432" fontSize="11" fill="currentColor" opacity=".68">The default on Vendor Central:</text>
      <text className="svg-sub" x="40" y="450" fontSize="11" fill="currentColor" opacity=".68">weekly POs if nothing changes.</text>
      <text className="svg-mono" x="40" y="490" fontSize="9.5" fill="currentColor" opacity=".55">recent weeks &times; your own seasonal curve</text>

      <rect x="362" y="336" width="316" height="180" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-sub" x="382" y="364" fontSize="12" fill="currentColor" opacity=".72">&ldquo;What does it take to hit $10M?&rdquo;</text>
      <line x1="382" y1="382" x2="658" y2="382" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="382" y="410" fontSize="13" fill="var(--doc-accent)">Target-solved, three scenarios</text>
      <text className="svg-sub" x="382" y="432" fontSize="11" fill="currentColor" opacity=".68">Solved backwards from your number &mdash;</text>
      <text className="svg-sub" x="382" y="450" fontSize="11" fill="currentColor" opacity=".68">a requirement, not a prediction.</text>
      <text className="svg-mono" x="382" y="490" fontSize="9.5" fill="currentColor" opacity=".55">measured against your past years</text>

      <rect x="704" y="336" width="316" height="180" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-sub" x="724" y="364" fontSize="12" fill="currentColor" opacity=".72">&ldquo;When do I reorder from my supplier?&rdquo;</text>
      <line x1="724" y1="382" x2="1000" y2="382" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="724" y="410" fontSize="13" fill="var(--doc-accent)">Per ASIN, plus a reorder engine</text>
      <text className="svg-sub" x="724" y="432" fontSize="11" fill="currentColor" opacity=".68">Each product from its own recent</text>
      <text className="svg-sub" x="724" y="450" fontSize="11" fill="currentColor" opacity=".68">sales, for Seller Central and FBA.</text>
      <text className="svg-mono" x="724" y="490" fontSize="9.5" fill="currentColor" opacity=".55">orders sized to stock and lead time</text>

      {/* ---- as-is or what-if ---- */}
      <rect x="20" y="540" width="1000" height="48" rx="8" fill="var(--doc-accent-soft)" />
      <text className="svg-sub" x="40" y="569" fontSize="11" fill="var(--doc-accent)">Any of the three can be as-is or a what-if: the as-is model first, then the change beside it, so the difference is plain to see.</text>
    </svg>
  );
}
