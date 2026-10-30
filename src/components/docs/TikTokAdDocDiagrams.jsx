import React from 'react';

// The five schematics for the TikTok Ad Agent documentation page.
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

/** 01 — three inputs, one refused, the agent, two outputs. */
export function DiagramContext() {
  return (
    <svg
      viewBox="0 0 1040 420"
      role="img"
      aria-label="Three things go in — the TikTok Ads Library, read for each ad you pick; your Company Blueprint, which is optional and copied in at the start; and your messages, every turn. Files and pictures cannot be attached at all. The TikTok Ad Agent, one analyst you talk to, watches up to five picked ads at a time and returns two things: a diagnosis page for each ad, and a short reply in chat."
    >
      <defs>
        <Arrow id="dt1-a" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the inputs ---- */}
      <rect x="20" y="48" width="220" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="76" fontSize="13" fill="currentColor">TikTok Ads Library</text>
      <text className="svg-sub" x="38" y="98" fontSize="11.5" fill="currentColor" opacity=".62">the ads you search for and pick</text>

      <rect x="20" y="134" width="220" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="162" fontSize="13" fill="currentColor">Company Blueprint</text>
      <text className="svg-sub" x="38" y="184" fontSize="11.5" fill="currentColor" opacity=".62">optional &middot; brand bible, personas</text>

      <rect x="20" y="220" width="220" height="68" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="248" fontSize="13" fill="currentColor">Your messages</text>
      <text className="svg-sub" x="38" y="270" fontSize="11.5" fill="currentColor" opacity=".62">questions, asks and changes</text>

      <rect x="20" y="306" width="220" height="68" rx="9" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-label" x="38" y="334" fontSize="13" fill="var(--doc-warm)">Files and pictures</text>
      <text className="svg-sub" x="38" y="356" fontSize="11.5" fill="var(--doc-warm)" opacity=".9">nothing can be attached</text>

      {/* ---- routes in ---- */}
      <line x1="240" y1="82" x2="432" y2="82" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt1-a)" />
      <text className="svg-mono" x="336" y="72" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">read for each ad</text>

      <line x1="240" y1="168" x2="432" y2="168" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt1-a)" />
      <text className="svg-mono" x="336" y="158" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">copied in at the start</text>

      <line x1="240" y1="254" x2="432" y2="254" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt1-a)" />
      <text className="svg-mono" x="336" y="244" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">every turn</text>

      <line x1="240" y1="340" x2="380" y2="340" stroke="var(--doc-warm)" strokeWidth="1.4" strokeDasharray="5 4" />
      <line x1="384" y1="332" x2="400" y2="348" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <line x1="400" y1="332" x2="384" y2="348" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <text className="svg-mono" x="310" y="330" fontSize="10" fill="var(--doc-warm)" textAnchor="middle">not accepted</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="44" width="224" height="330" rx="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="80" fontSize="16" fill="currentColor" textAnchor="middle">TikTok Ad Agent</text>
      <line x1="460" y1="96" x2="636" y2="96" stroke="currentColor" strokeOpacity=".25" />
      <text className="svg-sub" x="548" y="124" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">One analyst you talk to.</text>
      <text className="svg-sub" x="548" y="146" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">It watches the ads you pick</text>
      <text className="svg-sub" x="548" y="168" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">and writes a diagnosis page</text>
      <text className="svg-sub" x="548" y="190" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">for each one.</text>

      <rect x="460" y="214" width="176" height="54" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="236" fontSize="11.5" fill="currentColor" textAnchor="middle">Up to five ads</text>
      <text className="svg-label" x="548" y="256" fontSize="11.5" fill="currentColor" textAnchor="middle">picked at a time</text>

      <text className="svg-sub" x="548" y="300" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">It never touches an ad</text>
      <text className="svg-sub" x="548" y="322" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">account &mdash; only what TikTok</text>
      <text className="svg-sub" x="548" y="344" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">publishes in its library.</text>

      {/* ---- the two outputs ---- */}
      <line x1="660" y1="138" x2="796" y2="138" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt1-a)" />
      <text className="svg-mono" x="728" y="128" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">one per ad</text>

      <line x1="660" y1="288" x2="796" y2="288" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt1-a)" />
      <text className="svg-mono" x="728" y="278" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">every turn</text>

      <rect x="800" y="96" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="128" fontSize="13" fill="currentColor">A diagnosis page</text>
      <text className="svg-sub" x="818" y="150" fontSize="11" fill="currentColor" opacity=".62">for each ad: the audit, a score</text>
      <text className="svg-sub" x="818" y="168" fontSize="11" fill="currentColor" opacity=".62">and exactly what to change</text>

      <rect x="800" y="246" width="220" height="84" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="278" fontSize="13" fill="currentColor">A reply in chat</text>
      <text className="svg-sub" x="818" y="300" fontSize="11" fill="currentColor" opacity=".62">a few sentences on what</text>
      <text className="svg-sub" x="818" y="318" fontSize="11" fill="currentColor" opacity=".62">matters most, and what next</text>

      <text className="svg-sub" x="910" y="364" fontSize="11" fill="currentColor" opacity=".5" textAnchor="middle">returned together</text>
    </svg>
  );
}

/** 02 — from a free-text search to one investigation. */
export function DiagramSearch() {
  return (
    <svg
      viewBox="0 0 1040 684"
      role="img"
      aria-label="Finding the ads. You type a brand or a topic and get back two lists, matching advertisers and TikTok's own keyword ideas; this is browsing and can be repeated freely. You then start from one of three: an advertiser, giving that brand's own ads; a keyword, giving matching ads from many brands; or a pasted ad link, giving that one ad already picked. The first two produce a list of up to twelve ads, newest first, from the past twelve months in every region. Withdrawn ads appear in the list but can never be picked or diagnosed, and if every ad is withdrawn nothing is started. You pick up to five at a time, and the investigation starts: after the first pick, message or page, a new search means a new conversation."
    >
      <defs>
        <Arrow id="dt2-a" />
        <Arrow id="dt2-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- 1 · find ---- */}
      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">1 &middot; SEARCH</text>

      <rect x="20" y="48" width="220" height="128" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="130" y="98" fontSize="13" fill="currentColor" textAnchor="middle">You type a brand</text>
      <text className="svg-label" x="130" y="118" fontSize="13" fill="currentColor" textAnchor="middle">or a topic</text>
      <text className="svg-sub" x="130" y="144" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">a name, a word, anything</text>

      <path d="M240 112 H 268 V 77 H 296" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt2-a)" />
      <path d="M268 112 V 147 H 296" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt2-a)" />

      <rect x="300" y="48" width="300" height="58" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="318" y="72" fontSize="12.5" fill="currentColor">Advertisers</text>
      <text className="svg-sub" x="318" y="92" fontSize="11" fill="currentColor" opacity=".65">the brands that match</text>

      <rect x="300" y="118" width="300" height="58" rx="8" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="318" y="142" fontSize="12.5" fill="currentColor">Keywords</text>
      <text className="svg-sub" x="318" y="162" fontSize="11" fill="currentColor" opacity=".65">TikTok&rsquo;s own topic ideas &mdash; often none</text>

      <rect x="640" y="48" width="380" height="128" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="5 4" />
      <text className="svg-tag" x="660" y="72" fontSize="9.5" fill="currentColor" opacity=".6">BROWSING &mdash; NOT A CONVERSATION YET</text>
      <text className="svg-sub" x="660" y="98" fontSize="11" fill="currentColor" opacity=".72">Search as often as you like. TikTok answers</text>
      <text className="svg-sub" x="660" y="116" fontSize="11" fill="currentColor" opacity=".72">with both lists because a word like &ldquo;data&rdquo;</text>
      <text className="svg-sub" x="660" y="134" fontSize="11" fill="currentColor" opacity=".72">could be a company or a subject, and only</text>
      <text className="svg-sub" x="660" y="152" fontSize="11" fill="currentColor" opacity=".72">you know which one you meant.</text>

      {/* ---- 2 · three ways to start ---- */}
      <line x1="450" y1="176" x2="450" y2="204" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <line x1="250" y1="204" x2="520" y2="204" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <line x1="250" y1="204" x2="250" y2="246" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt2-c)" />
      <line x1="520" y1="204" x2="520" y2="246" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt2-c)" />
      <line x1="865" y1="196" x2="865" y2="246" stroke="var(--doc-accent)" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#dt2-c)" />
      <text className="svg-mono" x="877" y="226" fontSize="10" fill="var(--doc-accent)">or paste a link</text>

      <text className="svg-tag" x="20" y="236" fontSize="10.5" fill="var(--doc-accent)">2 &middot; START FROM ONE</text>

      <rect x="20" y="250" width="310" height="96" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="40" y="278" fontSize="13" fill="var(--doc-accent)">An advertiser</text>
      <text className="svg-sub" x="40" y="302" fontSize="11" fill="var(--doc-accent)" opacity=".9">that one brand&rsquo;s own ads</text>

      <rect x="365" y="250" width="310" height="96" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="385" y="278" fontSize="13" fill="var(--doc-accent)">A keyword</text>
      <text className="svg-sub" x="385" y="302" fontSize="11" fill="var(--doc-accent)" opacity=".9">ads that match it, from</text>
      <text className="svg-sub" x="385" y="320" fontSize="11" fill="var(--doc-accent)" opacity=".9">many different brands</text>

      <rect x="710" y="250" width="310" height="96" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="730" y="278" fontSize="13" fill="var(--doc-accent)">An ad&rsquo;s link</text>
      <text className="svg-sub" x="730" y="302" fontSize="11" fill="var(--doc-accent)" opacity=".9">that one ad, already picked &mdash;</text>
      <text className="svg-sub" x="730" y="320" fontSize="11" fill="var(--doc-accent)" opacity=".9">no list to choose from</text>

      {/* ---- 3 · the list ---- */}
      <text className="svg-tag" x="20" y="390" fontSize="10.5" fill="currentColor" opacity=".45">3 &middot; THE LIST</text>
      <line x1="175" y1="346" x2="175" y2="400" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt2-a)" />
      <line x1="520" y1="346" x2="520" y2="400" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt2-a)" />

      <rect x="20" y="404" width="640" height="168" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="40" y="432" fontSize="13" fill="currentColor">Up to 12 ads, newest first</text>
      <text className="svg-sub" x="40" y="454" fontSize="11" fill="currentColor" opacity=".68">from the past twelve months, in every region &mdash; each with who ran it, how long it ran, and its cover</text>

      {/* twelve cover tiles; the 4th and the 9th are withdrawn */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = 40 + i * 46;
        const withdrawn = i === 3 || i === 8;
        return withdrawn ? (
          <g key={i}>
            <rect x={x} y="482" width="34" height="60" rx="4" fill="none" stroke="var(--doc-warm)" strokeOpacity=".7" strokeDasharray="3 3" />
            <line x1={x + 9} y1="502" x2={x + 25} y2="522" stroke="var(--doc-warm)" strokeWidth="1.5" />
            <line x1={x + 25} y1="502" x2={x + 9} y2="522" stroke="var(--doc-warm)" strokeWidth="1.5" />
          </g>
        ) : (
          <rect key={i} x={x} y="482" width="34" height="60" rx="4" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
        );
      })}

      <rect x="690" y="404" width="300" height="168" rx="10" fill="var(--doc-warm-soft)" stroke="var(--doc-warm)" strokeOpacity=".55" />
      <text className="svg-tag" x="710" y="428" fontSize="9.5" fill="var(--doc-warm)">WITHDRAWN ADS</text>
      <text className="svg-sub" x="710" y="452" fontSize="11" fill="var(--doc-warm)">TikTok has taken these down and</text>
      <text className="svg-sub" x="710" y="470" fontSize="11" fill="var(--doc-warm)">publishes nothing about them. They</text>
      <text className="svg-sub" x="710" y="488" fontSize="11" fill="var(--doc-warm)">are shown, but can never be picked</text>
      <text className="svg-sub" x="710" y="506" fontSize="11" fill="var(--doc-warm)">or diagnosed.</text>
      <text className="svg-sub" x="710" y="534" fontSize="11" fill="var(--doc-warm)">All of them withdrawn? Nothing</text>
      <text className="svg-sub" x="710" y="552" fontSize="11" fill="var(--doc-warm)">is started &mdash; search again.</text>

      {/* ---- 4 · the investigation ---- */}
      <line x1="1008" y1="346" x2="1008" y2="600" stroke="var(--doc-accent)" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#dt2-c)" />
      <line x1="340" y1="572" x2="340" y2="600" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt2-a)" />
      <text className="svg-mono" x="352" y="592" fontSize="10" fill="currentColor" opacity=".6">pick up to five at a time</text>

      <rect x="20" y="604" width="1000" height="64" rx="10" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="40" y="630" fontSize="12.5" fill="var(--doc-accent)">The investigation starts with the ads you pick &mdash; the only ones the agent can work on.</text>
      <text className="svg-sub" x="40" y="652" fontSize="11" fill="var(--doc-accent)" opacity=".9">Until then, a search can be swapped for another. After the first pick, message or page, a new search means a new conversation.</text>
    </svg>
  );
}

/** 03 — one message: the analyst decides, does any of four things, then replies. */
export function DiagramTurn() {
  return (
    <svg
      viewBox="0 0 1040 640"
      role="img"
      aria-label="One conversation turn. Your message, and the first time the ads you picked, goes to the analyst, which talks to you and decides what the message needs; it is given only the ads you picked, each marked with whether its page is ready, and the conversation so far. A plain question is answered and the turn ends. Otherwise it may do any of four things, several in one turn: write a new page for every picked ad without one, all at once; edit a page, changing only the exact words asked about; check the ad itself — its library record, the written account of its video, or its pictures; or ask you first when it cannot tell which ad or what you mean. It may go round several times, then replies in a few sentences, and the pages come back with the reply."
    >
      <defs>
        <Arrow id="dt3-a" />
        <Arrow id="dt3-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the message and the analyst ---- */}
      <rect x="20" y="52" width="170" height="150" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="105" y="108" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="105" y="128" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="105" y="154" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">and, the first time,</text>
      <text className="svg-sub" x="105" y="171" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">the ads you picked</text>

      <line x1="190" y1="128" x2="216" y2="128" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt3-a)" />

      <rect x="220" y="52" width="520" height="150" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="240" y="82" fontSize="13.5" fill="var(--doc-accent)">The analyst</text>
      <text className="svg-sub" x="240" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Talks to you and decides what each message needs &mdash; one agent, both jobs.</text>
      <line x1="240" y1="118" x2="720" y2="118" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="240" y="140" fontSize="10.5" fill="var(--doc-accent)">Given: the ads you have picked, each marked with whether its page is</text>
      <text className="svg-sub" x="240" y="158" fontSize="10.5" fill="var(--doc-accent)">ready yet, and the conversation so far. It cannot see the brand&rsquo;s other</text>
      <text className="svg-sub" x="240" y="176" fontSize="10.5" fill="var(--doc-accent)">ads &mdash; to talk about one, you pick it first.</text>

      <line x1="740" y1="128" x2="766" y2="128" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dt3-a)" />
      <rect x="770" y="96" width="250" height="64" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="895" y="123" fontSize="12" fill="currentColor" textAnchor="middle">Just a question? It answers</text>
      <text className="svg-label" x="895" y="143" fontSize="12" fill="currentColor" textAnchor="middle">and the turn ends here.</text>

      {/* ---- the four things it can do ---- */}
      <text className="svg-tag" x="20" y="222" fontSize="9.5" fill="var(--doc-accent)">ONE MESSAGE MAY DO SEVERAL OF THESE</text>
      <line x1="480" y1="202" x2="480" y2="232" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <line x1="137" y1="232" x2="902" y2="232" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <line x1="137" y1="232" x2="137" y2="256" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt3-c)" />
      <line x1="392" y1="232" x2="392" y2="256" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt3-c)" />
      <line x1="647" y1="232" x2="647" y2="256" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt3-c)" />
      <line x1="902" y1="232" x2="902" y2="256" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt3-c)" />

      <rect x="20" y="260" width="235" height="170" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="38" y="284" fontSize="9.5" fill="var(--doc-accent)">WRITE</text>
      <text className="svg-label" x="38" y="308" fontSize="13" fill="currentColor">A new page</text>
      <text className="svg-sub" x="38" y="332" fontSize="11" fill="currentColor" opacity=".7">for every picked ad that has</text>
      <text className="svg-sub" x="38" y="350" fontSize="11" fill="currentColor" opacity=".7">none yet &mdash; all of them at</text>
      <text className="svg-sub" x="38" y="368" fontSize="11" fill="currentColor" opacity=".7">the same time, a page each.</text>
      <text className="svg-mono" x="38" y="412" fontSize="9.5" fill="currentColor" opacity=".5">rebuilt only when you ask</text>

      <rect x="275" y="260" width="235" height="170" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="293" y="284" fontSize="9.5" fill="var(--doc-accent)">CHANGE</text>
      <text className="svg-label" x="293" y="308" fontSize="13" fill="currentColor">Edit a page</text>
      <text className="svg-sub" x="293" y="332" fontSize="11" fill="currentColor" opacity=".7">reads the page as it stands</text>
      <text className="svg-sub" x="293" y="350" fontSize="11" fill="currentColor" opacity=".7">and changes only the exact</text>
      <text className="svg-sub" x="293" y="368" fontSize="11" fill="currentColor" opacity=".7">words you asked about &mdash;</text>
      <text className="svg-sub" x="293" y="386" fontSize="11" fill="currentColor" opacity=".7">nothing else moves.</text>
      <text className="svg-mono" x="293" y="412" fontSize="9.5" fill="currentColor" opacity=".5">the default for any change</text>

      <rect x="530" y="260" width="235" height="170" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="548" y="284" fontSize="9.5" fill="var(--doc-accent)">LOOK</text>
      <text className="svg-label" x="548" y="308" fontSize="13" fill="currentColor">Check the ad itself</text>
      <text className="svg-sub" x="548" y="332" fontSize="11" fill="currentColor" opacity=".7">its library record, the</text>
      <text className="svg-sub" x="548" y="350" fontSize="11" fill="currentColor" opacity=".7">written account of its video,</text>
      <text className="svg-sub" x="548" y="368" fontSize="11" fill="currentColor" opacity=".7">or its pictures &mdash; when the</text>
      <text className="svg-sub" x="548" y="386" fontSize="11" fill="currentColor" opacity=".7">page doesn&rsquo;t hold the answer.</text>
      <text className="svg-mono" x="548" y="412" fontSize="9.5" fill="currentColor" opacity=".5">only what the question needs</text>

      <rect x="785" y="260" width="235" height="170" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="803" y="284" fontSize="9.5" fill="var(--doc-accent)">ASK</text>
      <text className="svg-label" x="803" y="308" fontSize="13" fill="currentColor">Ask you first</text>
      <text className="svg-sub" x="803" y="332" fontSize="11" fill="currentColor" opacity=".7">when it can&rsquo;t tell which ad</text>
      <text className="svg-sub" x="803" y="350" fontSize="11" fill="currentColor" opacity=".7">you mean, or what you want</text>
      <text className="svg-sub" x="803" y="368" fontSize="11" fill="currentColor" opacity=".7">done, rather than guessing.</text>
      <text className="svg-mono" x="803" y="412" fontSize="9.5" fill="var(--doc-warm)">never invents an ad</text>

      {/* ---- the reply ---- */}
      <path d="M137 430 V 460 H 902 V 430" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <line x1="392" y1="430" x2="392" y2="460" stroke="currentColor" strokeOpacity=".45" />
      <line x1="647" y1="430" x2="647" y2="460" stroke="currentColor" strokeOpacity=".45" />
      <line x1="520" y1="460" x2="520" y2="486" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt3-a)" />

      <rect x="300" y="490" width="440" height="64" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="520" y="515" fontSize="12.5" fill="currentColor" textAnchor="middle">Its reply</text>
      <text className="svg-sub" x="520" y="537" fontSize="10.5" fill="currentColor" opacity=".68" textAnchor="middle">a few sentences: what matters most, and what to do next</text>

      <text className="svg-mono" x="760" y="516" fontSize="9.5" fill="currentColor" opacity=".5">↻ may go round several times</text>
      <text className="svg-mono" x="760" y="533" fontSize="9.5" fill="currentColor" opacity=".5">before it replies</text>

      <line x1="20" y1="584" x2="1020" y2="584" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="614" fontSize="12.5" fill="var(--doc-accent)">The pages come with it.</text>
      <text className="svg-sub" x="190" y="614" fontSize="12" fill="currentColor" opacity=".7">Every reply carries the pages, with the ones this message created or changed marked as such.</text>
    </svg>
  );
}

/** 04 — what the page writer reads for one ad, and what is never on the page. */
export function DiagramReading() {
  return (
    <svg
      viewBox="0 0 1040 634"
      role="img"
      aria-label="How one ad is read. Three sources go to the page writer, one for each ad, all at the same time: the library record — who ran and paid for it, when it showed, the regions with impressions as ranges, reach and the audience aimed at, the age bands and genders, any custom audience list, the button text and where it led, and the declared objective; the creative — a video watched once with sound on, or every image in order when there is no video file, or the cover still when the video will not play, which the page says; and research on the web — the brand's site, the page the ad clicked through to, competitors on TikTok in the same regions and current TikTok rules. The writer is also given your Brand Bible and personas when you started from your Blueprint. It produces the diagnosis page. Never on the page: spend, clicks, click-through rate, CPM, ROAS, conversions, watch time or completion rate, which TikTok's library does not publish, and search demand, since TikTok ads are not served from searches."
    >
      <defs>
        <Arrow id="dt4-a" />
        <Arrow id="dt4-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT IT READS, PER AD</text>
      <text className="svg-tag" x="400" y="26" fontSize="10.5" fill="var(--doc-accent)">THE PAGE WRITER</text>
      <text className="svg-tag" x="700" y="26" fontSize="10.5" fill="var(--doc-warm)">NEVER ON THE PAGE</text>

      {/* ---- the library record ---- */}
      <rect x="20" y="48" width="320" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="40" y="76" fontSize="13" fill="currentColor">The library record</text>
      <text className="svg-sub" x="40" y="100" fontSize="11" fill="currentColor" opacity=".7">who ran it, and who paid for it</text>
      <text className="svg-sub" x="40" y="118" fontSize="11" fill="currentColor" opacity=".7">when it first and last showed</text>
      <text className="svg-sub" x="40" y="136" fontSize="11" fill="currentColor" opacity=".7">the regions, impressions as ranges</text>
      <text className="svg-sub" x="40" y="154" fontSize="11" fill="currentColor" opacity=".7">how many it reached, and aimed at</text>
      <text className="svg-sub" x="40" y="172" fontSize="11" fill="currentColor" opacity=".7">the age bands and genders included</text>
      <text className="svg-sub" x="40" y="190" fontSize="11" fill="currentColor" opacity=".7">a custom audience list, or none</text>
      <text className="svg-sub" x="40" y="208" fontSize="11" fill="currentColor" opacity=".7">the button text, and where it led</text>
      <text className="svg-sub" x="40" y="226" fontSize="11" fill="currentColor" opacity=".7">the objective the advertiser chose</text>

      {/* ---- the creative ---- */}
      <rect x="20" y="264" width="320" height="210" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="40" y="292" fontSize="13" fill="currentColor">The creative</text>
      <text className="svg-label" x="40" y="316" fontSize="11.5" fill="var(--doc-accent)">A video &mdash; watched once, sound on</text>
      <text className="svg-sub" x="40" y="336" fontSize="11" fill="currentColor" opacity=".7">the first three seconds, each scene</text>
      <text className="svg-sub" x="40" y="354" fontSize="11" fill="currentColor" opacity=".7">with its time, the words on screen</text>
      <text className="svg-sub" x="40" y="372" fontSize="11" fill="currentColor" opacity=".7">and where they sit, voice and music,</text>
      <text className="svg-sub" x="40" y="390" fontSize="11" fill="currentColor" opacity=".7">pacing, product, brand and the ask</text>
      <text className="svg-label" x="40" y="418" fontSize="11.5" fill="var(--doc-accent)">No video file &mdash; every image, in order</text>
      <text className="svg-sub" x="40" y="442" fontSize="11" fill="currentColor" opacity=".7">Won&rsquo;t play &mdash; the cover still, and the</text>
      <text className="svg-sub" x="40" y="460" fontSize="11" fill="currentColor" opacity=".7">page says the video wasn&rsquo;t watched</text>

      {/* ---- research ---- */}
      <rect x="20" y="494" width="320" height="120" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="40" y="522" fontSize="13" fill="currentColor">Research on the web</text>
      <text className="svg-sub" x="40" y="546" fontSize="11" fill="currentColor" opacity=".7">the brand&rsquo;s site, and the page</text>
      <text className="svg-sub" x="40" y="564" fontSize="11" fill="currentColor" opacity=".7">the ad clicked through to</text>
      <text className="svg-sub" x="40" y="582" fontSize="11" fill="currentColor" opacity=".7">competitors advertising on TikTok</text>
      <text className="svg-sub" x="40" y="600" fontSize="11" fill="currentColor" opacity=".7">in the same regions; current rules</text>

      {/* ---- into the writer ---- */}
      <path d="M340 146 H 368 V 260 H 396" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt4-c)" />
      <line x1="340" y1="369" x2="396" y2="369" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt4-c)" />
      <path d="M340 554 H 368 V 410 H 396" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dt4-c)" />

      <rect x="400" y="200" width="240" height="260" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.6" />
      <text className="svg-title" x="520" y="236" fontSize="16" fill="var(--doc-accent)" textAnchor="middle">Page writer</text>
      <line x1="424" y1="252" x2="616" y2="252" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="520" y="280" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">One for each ad,</text>
      <text className="svg-sub" x="520" y="302" fontSize="11.5" fill="var(--doc-accent)" textAnchor="middle">all at the same time.</text>
      <text className="svg-sub" x="520" y="340" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">Also given your Brand</text>
      <text className="svg-sub" x="520" y="362" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">Bible and personas, when</text>
      <text className="svg-sub" x="520" y="384" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">you started from your</text>
      <text className="svg-sub" x="520" y="406" fontSize="11.5" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">Company Blueprint.</text>

      {/* ---- what never appears ---- */}
      <rect x="700" y="48" width="320" height="220" rx="10" fill="var(--doc-warm-soft)" stroke="var(--doc-warm)" strokeOpacity=".55" />
      <text className="svg-tag" x="720" y="72" fontSize="9.5" fill="var(--doc-warm)">NOT IN TIKTOK&rsquo;S LIBRARY</text>
      <text className="svg-sub" x="720" y="98" fontSize="11" fill="var(--doc-warm)">Spend, clicks, click-through rate,</text>
      <text className="svg-sub" x="720" y="116" fontSize="11" fill="var(--doc-warm)">CPM, ROAS, conversions, watch time</text>
      <text className="svg-sub" x="720" y="134" fontSize="11" fill="var(--doc-warm)">and completion rate. TikTok doesn&rsquo;t</text>
      <text className="svg-sub" x="720" y="152" fontSize="11" fill="var(--doc-warm)">publish them, so none is estimated &mdash;</text>
      <text className="svg-sub" x="720" y="170" fontSize="11" fill="var(--doc-warm)">and a range is never made a number.</text>
      <text className="svg-sub" x="720" y="202" fontSize="11" fill="var(--doc-warm)">Search demand. TikTok ads aren&rsquo;t</text>
      <text className="svg-sub" x="720" y="220" fontSize="11" fill="var(--doc-warm)">served from searches, so there is</text>
      <text className="svg-sub" x="720" y="238" fontSize="11" fill="var(--doc-warm)">nothing of that kind to read.</text>

      {/* ---- the page ---- */}
      <line x1="640" y1="342" x2="696" y2="342" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dt4-a)" />
      <rect x="700" y="300" width="320" height="84" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="720" y="332" fontSize="13" fill="currentColor">The diagnosis page</text>
      <text className="svg-sub" x="720" y="354" fontSize="11" fill="currentColor" opacity=".68">the audit, a score, and what to change</text>

      <text className="svg-sub" x="700" y="428" fontSize="11" fill="currentColor" opacity=".6">TikTok doesn&rsquo;t say whether an ad is a video</text>
      <text className="svg-sub" x="700" y="446" fontSize="11" fill="currentColor" opacity=".6">or a set of images. The page works that out</text>
      <text className="svg-sub" x="700" y="464" fontSize="11" fill="currentColor" opacity=".6">from the creative, and says it is a reading.</text>
    </svg>
  );
}

/** 05 — the seven parts of a diagnosis page, and what holds across all of them. */
export function DiagramPage() {
  const parts = [
    ['1', 'The verdict', 'the title is the verdict; tags, a short overview, the overall score'],
    ['2', 'Priority Findings', 'three to five problems, costliest first — and the one asset to keep'],
    ['3', 'Creative Inventory & Evidence', 'the creative itself, where it ran, who it reached, what isn’t known'],
    ['4', 'Creative Effectiveness Scorecard', 'eight scores out of ten, weighted into one score out of a hundred'],
    ['5', 'Creative Element Audit', 'each element Aligned or Not aligned, with the moment it happens'],
    ['6', 'Market and Funnel Fit', 'competitors, the claims each owns, the buyer stage the ad speaks to'],
    ['7', 'Recommendations & Action Plan', 'numbered changes in order, plus a brief ready to hand over as written'],
  ];
  const notes = [
    ['Your brand’s look', 'laid out in your design identity,', 'or a calm, neutral one without it'],
    ['Every picture shown', 'every image the ad published,', 'in order — never just the first'],
    ['Nothing folded away', 'no tabs, no “show more” — every', 'part visible from top to bottom'],
    ['Ranges stay ranges', 'reach and impressions are ranges', 'on TikTok, and are never narrowed'],
    ['Every change has a reason', 'each recommendation answers a', 'finding further up the page'],
  ];
  return (
    <svg
      viewBox="0 0 1040 620"
      role="img"
      aria-label="A diagnosis page has seven parts, top to bottom: the verdict, whose title is the verdict, with tags, an overview and the overall score; Priority Findings, three to five problems costliest first plus the one asset to keep; Creative Inventory and Evidence; the Creative Effectiveness Scorecard, eight scores out of ten weighted into one out of a hundred; the Creative Element Audit, each element Aligned or Not aligned; Market and Funnel Fit; and Recommendations and Action Plan, numbered changes plus a ready-to-use brief. Parts one to six are the audit, part seven the answer. True of every page: it takes your brand's look, shows every picture the ad published, folds nothing away, keeps ranges as ranges, and ties every recommendation to a finding. It never sets dates, owners, budgets or bids."
    >
      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE PAGE, TOP TO BOTTOM</text>
      <text className="svg-tag" x="700" y="26" fontSize="10.5" fill="currentColor" opacity=".45">TRUE OF EVERY PAGE</text>

      <rect x="20" y="40" width="580" height="560" rx="10" fill="none" stroke="currentColor" strokeOpacity=".3" />

      {parts.map(([num, title, sub], i) => {
        const y = 52 + i * 78;
        const last = i === parts.length - 1;
        return (
          <g key={num}>
            <rect
              x="36"
              y={y}
              width="548"
              height="66"
              rx="8"
              fill={last ? 'var(--doc-accent-soft)' : 'none'}
              stroke={last ? 'var(--doc-accent)' : 'currentColor'}
              strokeOpacity={last ? '1' : '.3'}
              strokeWidth={last ? '1.4' : '1'}
            />
            <text className="svg-mono" x="54" y={y + 28} fontSize="10" fill={last ? 'var(--doc-accent)' : 'currentColor'} opacity=".6">{num}</text>
            <text className="svg-label" x="80" y={y + 28} fontSize="13" fill={last ? 'var(--doc-accent)' : 'currentColor'}>{title}</text>
            <text className="svg-sub" x="80" y={y + 49} fontSize="11" fill={last ? 'var(--doc-accent)' : 'currentColor'} opacity=".7">{sub}</text>
          </g>
        );
      })}

      {/* ---- audit vs answer ---- */}
      <path d="M610 52 H 618 V 508 H 610" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-mono" x="626" y="284" fontSize="10" fill="currentColor" opacity=".55">audit</text>
      <path d="M610 520 H 618 V 586 H 610" fill="none" stroke="var(--doc-accent)" strokeOpacity=".8" />
      <text className="svg-mono" x="626" y="557" fontSize="10" fill="var(--doc-accent)">answer</text>

      {/* ---- what holds across the page ---- */}
      {notes.map(([title, a, b], i) => {
        const y = 66 + i * 100;
        return (
          <g key={title}>
            <rect x="700" y={y - 16} width="3" height="62" fill="var(--doc-accent)" />
            <text className="svg-label" x="716" y={y} fontSize="12.5" fill="currentColor">{title}</text>
            <text className="svg-sub" x="716" y={y + 22} fontSize="11" fill="currentColor" opacity=".68">{a}</text>
            <text className="svg-sub" x="716" y={y + 40} fontSize="11" fill="currentColor" opacity=".68">{b}</text>
          </g>
        );
      })}

      <text className="svg-sub" x="700" y="560" fontSize="11" fill="var(--doc-warm)">No dates, owners, budgets or bids &mdash;</text>
      <text className="svg-sub" x="700" y="578" fontSize="11" fill="var(--doc-warm)">those are yours to set.</text>
    </svg>
  );
}
