import React from 'react';

// The five schematics for the Google Ad Agent documentation page.
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
// Marker ids are prefixed `dgg` — Meta's page already uses `dg1-` … `dg5-`, and
// ids are document-wide, so a shared prefix would only be safe while exactly one
// doc page is mounted.
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

/** 01 — what goes in, the agent, what comes out. */
export function DiagramContext() {
  return (
    <svg
      viewBox="0 0 1040 462"
      role="img"
      aria-label="Three things go into the Google Ad Agent: which ads to look at, given as an ad link, an advertiser or a website; your Company Blueprint, which is optional and copied in once; and your messages. Files and images are not accepted. The agent reads only what Google publishes about each ad, never your ad account, and never quotes spend, clicks or click-through rate. Three things come out: a reply in chat, one diagnosis page per ad, and a note of which pages changed."
    >
      <defs>
        <Arrow id="dgg1-a" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the inputs ---- */}
      <rect x="20" y="48" width="208" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="76" fontSize="13" fill="currentColor">Which ads</text>
      <text className="svg-sub" x="38" y="98" fontSize="11.5" fill="currentColor" opacity=".62">an ad link, advertiser or site</text>

      <rect x="20" y="134" width="208" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" strokeDasharray="5 4" />
      <text className="svg-label" x="38" y="162" fontSize="13" fill="currentColor">Company Blueprint</text>
      <text className="svg-sub" x="38" y="184" fontSize="11.5" fill="currentColor" opacity=".62">brand bible &middot; buyer personas</text>

      <rect x="20" y="220" width="208" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="248" fontSize="13" fill="currentColor">Your messages</text>
      <text className="svg-sub" x="38" y="270" fontSize="11.5" fill="currentColor" opacity=".62">questions, changes, go-aheads</text>

      <rect x="20" y="306" width="208" height="68" rx="9" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-label" x="38" y="334" fontSize="13" fill="var(--doc-warm)">Files and images</text>
      <text className="svg-sub" x="38" y="356" fontSize="11.5" fill="var(--doc-warm)" opacity=".9">not accepted by this agent</text>

      {/* ---- routes in ---- */}
      <line x1="228" y1="82" x2="432" y2="82" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg1-a)" />
      <text className="svg-mono" x="330" y="72" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">the ads you pick</text>

      <line x1="228" y1="168" x2="432" y2="168" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dgg1-a)" />
      <text className="svg-mono" x="330" y="158" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">optional &middot; copied in once</text>

      <line x1="228" y1="254" x2="432" y2="254" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg1-a)" />
      <text className="svg-mono" x="330" y="244" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">every message</text>

      <line x1="228" y1="340" x2="360" y2="340" stroke="var(--doc-warm)" strokeWidth="1.4" strokeDasharray="4 4" />
      <line x1="364" y1="332" x2="380" y2="348" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <line x1="380" y1="332" x2="364" y2="348" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <text className="svg-mono" x="300" y="330" fontSize="10" fill="var(--doc-warm)" textAnchor="middle">not accepted</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="44" width="224" height="340" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="80" fontSize="16" fill="var(--doc-accent)" textAnchor="middle">Google Ad Agent</text>
      <line x1="460" y1="96" x2="636" y2="96" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="548" y="124" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">One agent. You talk to it,</text>
      <text className="svg-sub" x="548" y="146" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">and it does the work itself &mdash;</text>
      <text className="svg-sub" x="548" y="168" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">no team behind it.</text>

      <rect x="460" y="190" width="176" height="78" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="214" fontSize="11.5" fill="currentColor" textAnchor="middle">Reads only what Google</text>
      <text className="svg-label" x="548" y="232" fontSize="11.5" fill="currentColor" textAnchor="middle">publishes about an ad</text>
      <text className="svg-sub" x="548" y="252" fontSize="10.5" fill="currentColor" opacity=".65" textAnchor="middle">never your ad account</text>

      <text className="svg-sub" x="548" y="300" fontSize="11.5" fill="var(--doc-warm)" textAnchor="middle">Google publishes no spend,</text>
      <text className="svg-sub" x="548" y="322" fontSize="11.5" fill="var(--doc-warm)" textAnchor="middle">clicks or click-through rate,</text>
      <text className="svg-sub" x="548" y="344" fontSize="11.5" fill="var(--doc-warm)" textAnchor="middle">so it never quotes them.</text>

      {/* ---- the outputs ---- */}
      <line x1="660" y1="214" x2="796" y2="214" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg1-a)" />
      <text className="svg-mono" x="728" y="202" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">each</text>
      <text className="svg-mono" x="728" y="230" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">message</text>

      <rect x="800" y="60" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="92" fontSize="13" fill="currentColor">A reply in chat</text>
      <text className="svg-sub" x="818" y="114" fontSize="11" fill="currentColor" opacity=".62">what it found or changed,</text>
      <text className="svg-sub" x="818" y="132" fontSize="11" fill="currentColor" opacity=".62">appearing as it is written</text>

      <rect x="800" y="172" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="204" fontSize="13" fill="currentColor">A diagnosis page per ad</text>
      <text className="svg-sub" x="818" y="226" fontSize="11" fill="currentColor" opacity=".62">findings, a score, and the</text>
      <text className="svg-sub" x="818" y="244" fontSize="11" fill="currentColor" opacity=".62">fixes written out in full</text>

      <rect x="800" y="284" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="316" fontSize="13" fill="currentColor">Which pages changed</text>
      <text className="svg-sub" x="818" y="338" fontSize="11" fill="currentColor" opacity=".62">so you know which ones</text>
      <text className="svg-sub" x="818" y="356" fontSize="11" fill="currentColor" opacity=".62">to look at again</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="412" x2="1020" y2="412" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="440" fontSize="12.5" fill="var(--doc-accent)">It never touches your Google Ads account.</text>
      <text className="svg-sub" x="300" y="440" fontSize="12" fill="currentColor" opacity=".7">It reads the public record, so any advertiser&rsquo;s ads can be looked at &mdash; yours or a rival&rsquo;s.</text>
    </svg>
  );
}

/** 02 — three ways to start, the list, and the ads you pick. */
export function DiagramPicking() {
  return (
    <svg
      viewBox="0 0 1040 584"
      role="img"
      aria-label="Three ways to start a conversation. A link to one ad in Google's Ads Transparency Center picks that ad straight away, with no list. An advertiser ID gives up to 40 of that advertiser's ads to choose from. A website address gives every advertiser whose ads point at it, often resellers rather than the brand, and each ad says who runs it. From the list you pick up to five at a time. The ads you have picked are the only ones the agent can see, diagnose or change; picking more later adds to them and nothing drops out. To look at a different advertiser, start a new conversation."
    >
      <defs>
        <Arrow id="dgg2-a" />
        <Arrow id="dgg2-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THREE WAYS TO START &mdash; ONE PER CONVERSATION</text>

      {/* ---- the three starting points ---- */}
      <rect x="20" y="44" width="310" height="150" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="68" fontSize="9.5" fill="currentColor" opacity=".5">1 &middot; ONE AD</text>
      <text className="svg-label" x="40" y="92" fontSize="13" fill="currentColor">A link to one ad</text>
      <text className="svg-sub" x="40" y="116" fontSize="11" fill="currentColor" opacity=".68">Its page in Google&rsquo;s Ads Transparency</text>
      <text className="svg-sub" x="40" y="134" fontSize="11" fill="currentColor" opacity=".68">Center, copied from the browser.</text>
      <text className="svg-mono" x="40" y="176" fontSize="9.5" fill="var(--doc-accent)">that ad, already picked &mdash; no list</text>

      <rect x="365" y="44" width="310" height="150" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="385" y="68" fontSize="9.5" fill="currentColor" opacity=".5">2 &middot; ONE ADVERTISER</text>
      <text className="svg-label" x="385" y="92" fontSize="13" fill="currentColor">An advertiser ID</text>
      <text className="svg-sub" x="385" y="116" fontSize="11" fill="currentColor" opacity=".68">Google&rsquo;s own number for the</text>
      <text className="svg-sub" x="385" y="134" fontSize="11" fill="currentColor" opacity=".68">advertiser, starting AR.</text>
      <text className="svg-mono" x="385" y="176" fontSize="9.5" fill="var(--doc-accent)">up to 40 of their ads to choose from</text>

      <rect x="710" y="44" width="310" height="150" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="730" y="68" fontSize="9.5" fill="currentColor" opacity=".5">3 &middot; ONE WEBSITE</text>
      <text className="svg-label" x="730" y="92" fontSize="13" fill="currentColor">A website address</text>
      <text className="svg-sub" x="730" y="116" fontSize="11" fill="currentColor" opacity=".68">Every advertiser whose ads point</text>
      <text className="svg-sub" x="730" y="134" fontSize="11" fill="currentColor" opacity=".68">at it &mdash; often resellers, not the</text>
      <text className="svg-sub" x="730" y="152" fontSize="11" fill="currentColor" opacity=".68">brand itself.</text>
      <text className="svg-mono" x="730" y="176" fontSize="9.5" fill="var(--doc-accent)">each ad says who runs it</text>

      {/* ---- into the list ---- */}
      <line x1="520" y1="194" x2="520" y2="236" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg2-a)" />
      <line x1="865" y1="194" x2="865" y2="236" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg2-a)" />

      <rect x="365" y="240" width="655" height="92" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="385" y="268" fontSize="13" fill="currentColor">The ads to choose from</text>
      <text className="svg-sub" x="385" y="290" fontSize="11" fill="currentColor" opacity=".68">Each shown with its format &mdash; text, image or video &mdash; a preview picture, and how many</text>
      <text className="svg-sub" x="385" y="308" fontSize="11" fill="currentColor" opacity=".68">days it has run. Google&rsquo;s full count of the advertiser&rsquo;s ads comes with the list.</text>

      {/* ---- the one-ad path skips the list ---- */}
      <path d="M175 194 V 428 H 296" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dgg2-c)" />
      <text className="svg-mono" x="188" y="300" fontSize="9.5" fill="var(--doc-accent)">already picked</text>

      <line x1="692" y1="332" x2="692" y2="376" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dgg2-c)" />
      <text className="svg-mono" x="708" y="358" fontSize="9.5" fill="currentColor" opacity=".6">you pick up to five at a time</text>

      {/* ---- the ads you've picked ---- */}
      <rect x="300" y="380" width="720" height="96" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-tag" x="320" y="404" fontSize="9.5" fill="var(--doc-accent)">THE ADS YOU&rsquo;VE PICKED</text>
      <text className="svg-label" x="320" y="428" fontSize="13" fill="var(--doc-accent)">The only ads it can see, diagnose or change.</text>
      <text className="svg-sub" x="320" y="452" fontSize="11" fill="var(--doc-accent)" opacity=".9">Pick more later and they join the set, up to five a message. Nothing ever drops out of it.</text>

      <text className="svg-sub" x="300" y="506" fontSize="11" fill="var(--doc-warm)">Ask about an ad you haven&rsquo;t picked and it asks you to pick it first &mdash; it never goes looking for one.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="532" x2="1020" y2="532" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="560" fontSize="12.5" fill="var(--doc-accent)">One conversation, one starting point.</text>
      <text className="svg-sub" x="270" y="560" fontSize="12" fill="currentColor" opacity=".7">To look at a different advertiser, start a new conversation.</text>
    </svg>
  );
}

/** 03 — one message: the agent decides, uses its four abilities in rounds, then replies. */
export function DiagramTurn() {
  return (
    <svg
      viewBox="0 0 1040 690"
      role="img"
      aria-label="One message. Your message goes to the Google Ad Agent, which is given the conversation and a live list of the ads you have picked, each marked as having a page or not, and whether its search demand has been measured. A plain question is answered straight away. Otherwise it uses any of four abilities: write the pages for every picked ad without one, all at the same time; read a page back; change a page in place; or look closer at an ad's own record, pictures, video or search demand. Each result comes back to the agent, which picks the next step. When no step is left, it replies, streamed as it is written. It never pastes a page into the chat, never quotes spend, clicks or click-through rate, and never rebuilds a page you did not ask it to rebuild. A message gets up to five rounds."
    >
      <defs>
        <Arrow id="dgg3-a" />
        <Arrow id="dgg3-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the message and the agent ---- */}
      <rect x="20" y="52" width="170" height="156" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="105" y="110" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="105" y="130" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="105" y="156" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or pick more ads</text>
      <text className="svg-sub" x="105" y="173" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">to look at</text>

      <line x1="190" y1="130" x2="216" y2="130" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg3-a)" />

      <rect x="220" y="52" width="520" height="156" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="240" y="82" fontSize="13.5" fill="var(--doc-accent)">The Google Ad Agent</text>
      <text className="svg-sub" x="240" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Reads your message, decides what it needs, and does the work itself.</text>
      <line x1="240" y1="118" x2="720" y2="118" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="240" y="140" fontSize="10.5" fill="var(--doc-accent)">Given: the conversation so far, and a live list of the ads you&rsquo;ve picked &mdash; each</text>
      <text className="svg-sub" x="240" y="158" fontSize="10.5" fill="var(--doc-accent)">marked as having a page or not yet, and whether its search demand has been</text>
      <text className="svg-sub" x="240" y="176" fontSize="10.5" fill="var(--doc-accent)">measured. It may search the web, but only to understand what you asked.</text>

      <line x1="740" y1="92" x2="766" y2="92" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dgg3-a)" />
      <rect x="770" y="52" width="250" height="80" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="895" y="86" fontSize="12" fill="currentColor" textAnchor="middle">Just a question? It answers</text>
      <text className="svg-label" x="895" y="106" fontSize="12" fill="currentColor" textAnchor="middle">straight away, no step needed.</text>

      {/* ---- the result comes back ---- */}
      <path d="M1020 338 H 1030 V 176 H 744" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" strokeDasharray="5 4" markerEnd="url(#dgg3-c)" />
      <text className="svg-mono" x="895" y="166" fontSize="9.5" fill="var(--doc-accent)" textAnchor="middle">each result comes back</text>
      <text className="svg-mono" x="895" y="194" fontSize="9.5" fill="var(--doc-accent)" textAnchor="middle">and it picks the next step</text>

      {/* ---- the four abilities ---- */}
      <text className="svg-tag" x="20" y="232" fontSize="9.5" fill="var(--doc-accent)">WHAT IT CAN DO</text>
      <path d="M480 208 V 236" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <line x1="136" y1="236" x2="904" y2="236" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <line x1="136" y1="236" x2="136" y2="262" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dgg3-c)" />
      <line x1="392" y1="236" x2="392" y2="262" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dgg3-c)" />
      <line x1="648" y1="236" x2="648" y2="262" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dgg3-c)" />
      <line x1="904" y1="236" x2="904" y2="262" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dgg3-c)" />

      <rect x="20" y="266" width="232" height="144" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="288" fontSize="9.5" fill="currentColor" opacity=".5">A</text>
      <text className="svg-label" x="40" y="310" fontSize="13" fill="currentColor">Write the pages</text>
      <text className="svg-sub" x="40" y="334" fontSize="11" fill="currentColor" opacity=".68">Every picked ad without a</text>
      <text className="svg-sub" x="40" y="352" fontSize="11" fill="currentColor" opacity=".68">page, all at the same time.</text>
      <text className="svg-sub" x="40" y="370" fontSize="11" fill="currentColor" opacity=".68">It says which ones it&rsquo;s on.</text>
      <text className="svg-mono" x="40" y="394" fontSize="9.5" fill="var(--doc-accent)">the slow one &mdash; see 04</text>

      <rect x="276" y="266" width="232" height="144" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="296" y="288" fontSize="9.5" fill="currentColor" opacity=".5">B</text>
      <text className="svg-label" x="296" y="310" fontSize="13" fill="currentColor">Read a page back</text>
      <text className="svg-sub" x="296" y="334" fontSize="11" fill="currentColor" opacity=".68">Before changing a page, or</text>
      <text className="svg-sub" x="296" y="352" fontSize="11" fill="currentColor" opacity=".68">to answer about one written</text>
      <text className="svg-sub" x="296" y="370" fontSize="11" fill="currentColor" opacity=".68">in an earlier message.</text>

      <rect x="532" y="266" width="232" height="144" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="552" y="288" fontSize="9.5" fill="currentColor" opacity=".5">C</text>
      <text className="svg-label" x="552" y="310" fontSize="13" fill="currentColor">Change a page in place</text>
      <text className="svg-sub" x="552" y="334" fontSize="11" fill="currentColor" opacity=".68">Only what you asked about,</text>
      <text className="svg-sub" x="552" y="352" fontSize="11" fill="currentColor" opacity=".68">everywhere it appears on the</text>
      <text className="svg-sub" x="552" y="370" fontSize="11" fill="currentColor" opacity=".68">page. Nothing else moves.</text>

      <rect x="788" y="266" width="232" height="144" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="808" y="288" fontSize="9.5" fill="currentColor" opacity=".5">D</text>
      <text className="svg-label" x="808" y="310" fontSize="13" fill="currentColor">Look closer at an ad</text>
      <text className="svg-sub" x="808" y="334" fontSize="11" fill="currentColor" opacity=".68">Its public record, its</text>
      <text className="svg-sub" x="808" y="352" fontSize="11" fill="currentColor" opacity=".68">pictures, the video, or its</text>
      <text className="svg-sub" x="808" y="370" fontSize="11" fill="currentColor" opacity=".68">search demand &mdash; when no</text>
      <text className="svg-sub" x="808" y="388" fontSize="11" fill="currentColor" opacity=".68">page answers the question.</text>

      {/* ---- the reply ---- */}
      <path d="M136 410 V 438 H 904 V 410" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <path d="M392 410 V 438" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <path d="M648 410 V 438" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <line x1="520" y1="438" x2="520" y2="464" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg3-a)" />
      <text className="svg-mono" x="536" y="456" fontSize="9.5" fill="currentColor" opacity=".6">when no step is left</text>

      <rect x="260" y="468" width="520" height="84" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="520" y="496" fontSize="12.5" fill="currentColor" textAnchor="middle">Its reply to you</text>
      <text className="svg-sub" x="520" y="518" fontSize="10.5" fill="currentColor" opacity=".68" textAnchor="middle">streamed as it&rsquo;s written: what changed, and on a new page,</text>
      <text className="svg-sub" x="520" y="536" fontSize="10.5" fill="currentColor" opacity=".68" textAnchor="middle">the one thing that matters most</text>

      <rect x="20" y="576" width="1000" height="40" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="601" fontSize="11" fill="var(--doc-warm)">It never pastes a page into the chat, never quotes spend, clicks or click-through rate, and never rebuilds a page you didn&rsquo;t ask it to rebuild.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="640" x2="1020" y2="640" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="668" fontSize="12.5" fill="var(--doc-accent)">Up to five rounds per message.</text>
      <text className="svg-sub" x="226" y="668" fontSize="12" fill="currentColor" opacity=".7">If it hasn&rsquo;t finished by then, it stops, says where things stand, and keeps everything already done.</text>
    </svg>
  );
}

/** 04 — what the page writer is given, and the seven parts of the page. */
export function DiagramPage() {
  return (
    <svg
      viewBox="0 0 1040 600"
      role="img"
      aria-label="One diagnosis page. The page writer is given the ad's public record, every picture, a read of the video, a search-demand measurement when the ad is found by searching, and your Blueprint if there is one. One writer runs per ad, all at once; it researches the site, the competitors and current Google rules first, then writes the whole page, judging the ad against its own kind only. The page has seven parts, top to bottom: the verdict, priority findings, the ad as served, the scorecard, element by element, market and background, and recommendations. Everything is open on the page and no spend, clicks or click-through rate appear. Every recommendation fixes a finding above it and names the one number in your own account that would confirm it."
    >
      <defs>
        <Arrow id="dgg4-a" />
        <Arrow id="dgg4-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT IT IS GIVEN, PER AD</text>
      <text className="svg-tag" x="334" y="26" fontSize="10.5" fill="var(--doc-accent)">THE PAGE WRITER</text>
      <text className="svg-tag" x="640" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE PAGE, TOP TO BOTTOM</text>

      {/* ---- what the writer is given ---- */}
      <rect x="20" y="44" width="266" height="58" rx="8" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="36" y="68" fontSize="12.5" fill="currentColor">The ad&rsquo;s public record</text>
      <text className="svg-sub" x="36" y="87" fontSize="10.5" fill="currentColor" opacity=".62">every version, where and how long it ran</text>

      <rect x="20" y="112" width="266" height="58" rx="8" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="36" y="136" fontSize="12.5" fill="currentColor">Every picture</text>
      <text className="svg-sub" x="36" y="155" fontSize="10.5" fill="currentColor" opacity=".62">ad art, store screenshots, product photos</text>

      <rect x="20" y="180" width="266" height="58" rx="8" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="36" y="204" fontSize="12.5" fill="currentColor">The video, watched</text>
      <text className="svg-sub" x="36" y="223" fontSize="10.5" fill="currentColor" opacity=".62">scenes to the second, on-screen text, sound</text>

      <rect x="20" y="248" width="266" height="58" rx="8" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="36" y="272" fontSize="12.5" fill="currentColor">Search demand</text>
      <text className="svg-sub" x="36" y="291" fontSize="10.5" fill="currentColor" opacity=".62">only for ads found by searching &mdash; see 05</text>

      <rect x="20" y="316" width="266" height="58" rx="8" fill="none" stroke="currentColor" strokeOpacity=".38" strokeDasharray="5 4" />
      <text className="svg-label" x="36" y="340" fontSize="12.5" fill="currentColor">Your Blueprint, if given</text>
      <text className="svg-sub" x="36" y="359" fontSize="10.5" fill="currentColor" opacity=".62">the page&rsquo;s look, and who buys from you</text>

      <path d="M286 73 H 302 M286 141 H 302 M286 209 H 302 M286 277 H 302 M286 345 H 302 M302 73 V 345" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <line x1="302" y1="209" x2="330" y2="209" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dgg4-c)" />

      {/* ---- the writer ---- */}
      <rect x="334" y="92" width="250" height="238" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <text className="svg-title" x="459" y="128" fontSize="15" fill="var(--doc-accent)" textAnchor="middle">The page writer</text>
      <text className="svg-sub" x="459" y="150" fontSize="11" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">one for each ad, all at once</text>
      <line x1="356" y1="166" x2="562" y2="166" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="459" y="192" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">Researches first: the site,</text>
      <text className="svg-sub" x="459" y="210" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">the competitors where the</text>
      <text className="svg-sub" x="459" y="228" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">ad ran, and current Google</text>
      <text className="svg-sub" x="459" y="246" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">rules for its format.</text>
      <text className="svg-sub" x="459" y="274" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">Then writes the whole page</text>
      <text className="svg-sub" x="459" y="292" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">in one go, judging the ad</text>
      <text className="svg-sub" x="459" y="310" fontSize="11" fill="var(--doc-accent)" textAnchor="middle">against its own kind only.</text>

      <line x1="584" y1="209" x2="636" y2="209" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg4-a)" />

      {/* ---- the seven parts ---- */}
      <rect x="640" y="44" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-mono" x="656" y="70" fontSize="10" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="680" y="66" fontSize="12.5" fill="currentColor">The verdict</text>
      <text className="svg-sub" x="680" y="84" fontSize="10.5" fill="currentColor" opacity=".62">one line that is the verdict, then a short overview</text>

      <rect x="640" y="104" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-mono" x="656" y="130" fontSize="10" fill="currentColor" opacity=".5">2</text>
      <text className="svg-label" x="680" y="126" fontSize="12.5" fill="currentColor">Priority findings</text>
      <text className="svg-sub" x="680" y="144" fontSize="10.5" fill="currentColor" opacity=".62">three to five, ranked by what each one costs you</text>

      <rect x="640" y="164" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-mono" x="656" y="190" fontSize="10" fill="currentColor" opacity=".5">3</text>
      <text className="svg-label" x="680" y="186" fontSize="12.5" fill="currentColor">The ad as served</text>
      <text className="svg-sub" x="680" y="204" fontSize="10.5" fill="currentColor" opacity=".62">every version, where it ran, and what isn&rsquo;t published</text>

      <rect x="640" y="224" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-mono" x="656" y="250" fontSize="10" fill="currentColor" opacity=".5">4</text>
      <text className="svg-label" x="680" y="246" fontSize="12.5" fill="currentColor">The scorecard</text>
      <text className="svg-sub" x="680" y="264" fontSize="10.5" fill="currentColor" opacity=".62">eight measures out of 10, weighted for the format</text>

      <rect x="640" y="284" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-mono" x="656" y="310" fontSize="10" fill="currentColor" opacity=".5">5</text>
      <text className="svg-label" x="680" y="306" fontSize="12.5" fill="currentColor">Element by element</text>
      <text className="svg-sub" x="680" y="324" fontSize="10.5" fill="currentColor" opacity=".62">every part of every version: aligned, or not aligned</text>

      <rect x="640" y="344" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-mono" x="656" y="370" fontSize="10" fill="currentColor" opacity=".5">6</text>
      <text className="svg-label" x="680" y="366" fontSize="12.5" fill="currentColor">Market and background</text>
      <text className="svg-sub" x="680" y="384" fontSize="10.5" fill="currentColor" opacity=".62">competitors, the claims they own, the keyword table</text>

      <rect x="640" y="404" width="380" height="54" rx="8" fill="var(--doc-surface2)" stroke="var(--doc-accent)" strokeOpacity=".6" />
      <text className="svg-mono" x="656" y="430" fontSize="10" fill="var(--doc-accent)">7</text>
      <text className="svg-label" x="680" y="426" fontSize="12.5" fill="var(--doc-accent)">Recommendations</text>
      <text className="svg-sub" x="680" y="444" fontSize="10.5" fill="currentColor" opacity=".62">in order, each fixing a finding, the fix written out</text>

      <rect x="20" y="486" width="1000" height="40" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="511" fontSize="11" fill="var(--doc-warm)">Everything is open on the page &mdash; nothing folded away &mdash; and no spend, clicks or click-through rate appear, because Google publishes none.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="550" x2="1020" y2="550" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="578" fontSize="12.5" fill="var(--doc-accent)">Built to be acted on.</text>
      <text className="svg-sub" x="162" y="578" fontSize="12" fill="currentColor" opacity=".7">Every recommendation fixes a finding above it and names the one number in your own account that would confirm it.</text>
    </svg>
  );
}

/** 05 — whether search demand is measured, how, and where it lands on the page. */
export function DiagramDemand() {
  return (
    <svg
      viewBox="0 0 1040 516"
      role="img"
      aria-label="Search demand. The page writer, having seen the whole ad, decides whether people find it by searching. If not — an app ad, a playable, a YouTube video or a display banner — demand is not measured, and the page says so in one line and states the priorities in words. If so — a search ad, a Shopping or Maps listing, or an ad that names something people type — it picks one or two seed phrases of two or three words, never the brand and never the ad's copy; gets Google search data for the United States in English: the keywords around each seed with monthly searches, cost per click, difficulty, competition, intent and trend, plus the questions buyers ask and related searches; and puts it on the page as a keyword table with the ones to bid on marked TARGET, each target's fit to the ad out of five, its match type, landing page and negatives, and new headlines each carrying one target. Every figure is labelled as US demand and none is estimated. It is measured once per ad and kept."
    >
      <defs>
        <Arrow id="dgg5-a" />
        <Arrow id="dgg5-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the question ---- */}
      <rect x="20" y="20" width="460" height="90" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="40" y="52" fontSize="13.5" fill="var(--doc-accent)">Do people find this ad by searching?</text>
      <text className="svg-sub" x="40" y="76" fontSize="11" fill="var(--doc-accent)" opacity=".9">The page writer decides, having seen the whole ad &mdash;</text>
      <text className="svg-sub" x="40" y="94" fontSize="11" fill="var(--doc-accent)" opacity=".9">its words, its pictures and where it was shown.</text>

      <line x1="480" y1="65" x2="556" y2="65" stroke="var(--doc-warm)" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#dgg5-a)" />
      <text className="svg-mono" x="518" y="55" fontSize="9.5" fill="var(--doc-warm)" textAnchor="middle">no</text>

      <rect x="560" y="20" width="460" height="90" rx="10" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-label" x="580" y="52" fontSize="12.5" fill="var(--doc-warm)">An app ad, a playable, a YouTube video, a display banner</text>
      <text className="svg-sub" x="580" y="76" fontSize="11" fill="var(--doc-warm)" opacity=".9">Not measured. The page says so in one line and gives</text>
      <text className="svg-sub" x="580" y="94" fontSize="11" fill="var(--doc-warm)" opacity=".9">the keyword priorities in words, with no figures.</text>

      {/* ---- yes ---- */}
      <line x1="175" y1="110" x2="175" y2="176" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dgg5-c)" />
      <text className="svg-mono" x="190" y="136" fontSize="9.5" fill="var(--doc-accent)">yes &mdash; a search ad, a Shopping or Maps listing,</text>
      <text className="svg-mono" x="190" y="154" fontSize="9.5" fill="var(--doc-accent)">or an ad that names something people type</text>

      <rect x="20" y="180" width="310" height="168" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="40" y="204" fontSize="9.5" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="40" y="226" fontSize="13" fill="currentColor">One or two seed phrases</text>
      <text className="svg-sub" x="40" y="252" fontSize="11" fill="currentColor" opacity=".68">Two or three words each, typed</text>
      <text className="svg-sub" x="40" y="270" fontSize="11" fill="currentColor" opacity=".68">the way a shopper would search</text>
      <text className="svg-sub" x="40" y="288" fontSize="11" fill="currentColor" opacity=".68">for the product or category.</text>
      <text className="svg-sub" x="40" y="316" fontSize="11" fill="var(--doc-warm)">Never the brand name, never</text>
      <text className="svg-sub" x="40" y="334" fontSize="11" fill="var(--doc-warm)">the ad&rsquo;s own copy.</text>

      <line x1="330" y1="264" x2="361" y2="264" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dgg5-a)" />

      <rect x="365" y="180" width="310" height="168" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="385" y="204" fontSize="9.5" fill="currentColor" opacity=".5">2 &middot; UNITED STATES, ENGLISH</text>
      <text className="svg-label" x="385" y="226" fontSize="13" fill="currentColor">Google search data</text>
      <text className="svg-sub" x="385" y="252" fontSize="11" fill="currentColor" opacity=".68">The keywords around each seed, with</text>
      <text className="svg-sub" x="385" y="270" fontSize="11" fill="currentColor" opacity=".68">monthly searches, cost per click,</text>
      <text className="svg-sub" x="385" y="288" fontSize="11" fill="currentColor" opacity=".68">difficulty, competition, intent, trend.</text>
      <text className="svg-sub" x="385" y="316" fontSize="11" fill="currentColor" opacity=".68">The questions buyers ask, and the</text>
      <text className="svg-sub" x="385" y="334" fontSize="11" fill="currentColor" opacity=".68">related searches Google shows.</text>

      <line x1="675" y1="264" x2="706" y2="264" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dgg5-c)" />

      <rect x="710" y="180" width="310" height="168" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-mono" x="730" y="204" fontSize="9.5" fill="var(--doc-accent)">3</text>
      <text className="svg-label" x="730" y="226" fontSize="13" fill="var(--doc-accent)">On the page</text>
      <text className="svg-sub" x="730" y="252" fontSize="11" fill="var(--doc-accent)">The full keyword table, the ones</text>
      <text className="svg-sub" x="730" y="270" fontSize="11" fill="var(--doc-accent)">to bid on marked TARGET.</text>
      <text className="svg-sub" x="730" y="288" fontSize="11" fill="var(--doc-accent)">For each target: its fit to this ad</text>
      <text className="svg-sub" x="730" y="306" fontSize="11" fill="var(--doc-accent)">out of 5, match type, landing page,</text>
      <text className="svg-sub" x="730" y="324" fontSize="11" fill="var(--doc-accent)">negatives, and a headline carrying it.</text>

      <rect x="20" y="376" width="1000" height="40" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-sub" x="40" y="401" fontSize="11" fill="var(--doc-warm)">Every figure on the page comes from this reading and is labelled as US demand &mdash; never estimated, never stretched to another market or language.</text>

      {/* ---- the rule underneath ---- */}
      <line x1="20" y1="444" x2="1020" y2="444" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="472" fontSize="12.5" fill="var(--doc-accent)">Measured once per ad, then kept.</text>
      <text className="svg-sub" x="240" y="472" fontSize="12" fill="currentColor" opacity=".7">A rebuild, an edit or a later question reuses the same figures &mdash; and you can ask the agent about them</text>
      <text className="svg-sub" x="240" y="494" fontSize="12" fill="currentColor" opacity=".7">directly, which it answers from the reading rather than from a guess.</text>
    </svg>
  );
}
