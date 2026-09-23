import React from 'react';

// The five schematics for the Meta Ad Agent documentation page.
//
// THE DIAGRAMS CARRY THE STRUCTURE. The prose beside them explains craft and
// judgement; anything about how the parts fit together — what reads what, what
// is handed to whom, what never happens — belongs in a drawing here rather than
// in another paragraph there.
//
// All colour comes from three places so light / dark / print all work without
// duplicating a drawing: `currentColor` (inherited from the .doc wrapper's text
// colour), and the `--doc-accent*` / `--doc-warm*` / `--doc-surface2` custom
// properties declared on `.doc-page` in index.css. Nothing here hard-codes a hex.
//
// Each figure is sized by its viewBox and scaled by CSS; the parent <figure>
// owns the horizontal scroller, so a wide drawing never widens the page.
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

/** 01 — four inputs, the agent, four documents. */
export function DiagramContext() {
  return (
    <svg
      viewBox="0 0 1040 500"
      role="img"
      aria-label="Four inputs — your Meta ad account copied into the Growvana database, your Company Blueprint, competitor ad libraries, and the files you attach — feed the Meta Ad Agent, which produces four documents: ad diagnosis, competitor lens, strategy and ad creative."
    >
      <defs>
        <Arrow id="dg1-a" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT GOES IN</text>
      <text className="svg-tag" x="436" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE AGENT</text>
      <text className="svg-tag" x="800" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT YOU GET</text>

      {/* ---- the four inputs ---- */}
      <rect x="20" y="52" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="84" fontSize="13" fill="currentColor">Your Meta ad account</text>
      <text className="svg-sub" x="38" y="106" fontSize="11.5" fill="currentColor" opacity=".62">campaigns, ads, spend, results</text>

      <rect x="20" y="164" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="196" fontSize="13" fill="currentColor">Company Blueprint</text>
      <text className="svg-sub" x="38" y="218" fontSize="11.5" fill="currentColor" opacity=".62">brand bible &middot; buyer personas</text>

      <rect x="20" y="276" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="308" fontSize="13" fill="currentColor">Competitor ads</text>
      <text className="svg-sub" x="38" y="330" fontSize="11.5" fill="currentColor" opacity=".62">public ad libraries</text>

      <rect x="20" y="388" width="188" height="76" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="38" y="420" fontSize="13" fill="currentColor">Files you attach</text>
      <text className="svg-sub" x="38" y="442" fontSize="11.5" fill="currentColor" opacity=".62">a rival&rsquo;s ad, a brief, a photo</text>

      {/* ---- the copy, and the four routes in ---- */}
      <line x1="208" y1="90" x2="248" y2="90" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg1-a)" />
      <text className="svg-mono" x="228" y="78" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">copied</text>

      <rect x="252" y="48" width="144" height="84" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="324" y="78" fontSize="13" fill="var(--doc-accent)" textAnchor="middle">Growvana</text>
      <text className="svg-label" x="324" y="96" fontSize="13" fill="var(--doc-accent)" textAnchor="middle">database</text>
      <text className="svg-sub" x="324" y="116" fontSize="10.5" fill="var(--doc-accent)" opacity=".8" textAnchor="middle">refreshed on demand</text>

      <line x1="396" y1="90" x2="432" y2="90" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg1-a)" />

      <path d="M208 202 H 316 V 150 H 432" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg1-a)" />
      <text className="svg-mono" x="224" y="194" fontSize="10" fill="currentColor" opacity=".6">who you are</text>

      <path d="M208 314 H 340 V 240 H 432" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg1-a)" />
      {/* Kept short enough to clear the elbow it sits above — a longer label runs
          straight through the vertical leg of its own connector. */}
      <text className="svg-mono" x="224" y="303" fontSize="10" fill="currentColor" opacity=".6">fetched mid-turn</text>

      <path d="M208 426 H 364 V 330 H 432" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg1-a)" />
      <text className="svg-mono" x="224" y="415" fontSize="10" fill="currentColor" opacity=".6">kept all session</text>

      {/* ---- the agent ---- */}
      <rect x="436" y="48" width="224" height="416" rx="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text className="svg-title" x="548" y="86" fontSize="16" fill="currentColor" textAnchor="middle">Meta Ad Agent</text>
      <line x1="460" y1="102" x2="636" y2="102" stroke="currentColor" strokeOpacity=".25" />
      <text className="svg-sub" x="548" y="130" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">You talk to it in chat.</text>
      <text className="svg-sub" x="548" y="152" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">It decides which of its four</text>
      <text className="svg-sub" x="548" y="174" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">specialists to send to work,</text>
      <text className="svg-sub" x="548" y="196" fontSize="11.5" fill="currentColor" opacity=".72" textAnchor="middle">every turn.</text>

      <rect x="460" y="224" width="176" height="54" rx="7" fill="var(--doc-surface2)" />
      <text className="svg-label" x="548" y="246" fontSize="11.5" fill="currentColor" textAnchor="middle">Flow A &mdash; create new ads</text>
      <text className="svg-label" x="548" y="266" fontSize="11.5" fill="currentColor" textAnchor="middle">Flow B &mdash; tune live ads</text>

      <text className="svg-sub" x="548" y="312" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Each document is owned by</text>
      <text className="svg-sub" x="548" y="334" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">exactly one specialist &mdash;</text>
      <text className="svg-sub" x="548" y="356" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">nobody else writes it.</text>

      <text className="svg-sub" x="548" y="394" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">It writes nothing back to</text>
      <text className="svg-sub" x="548" y="416" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">Meta. Nothing goes live</text>
      <text className="svg-sub" x="548" y="438" fontSize="11.5" fill="currentColor" opacity=".6" textAnchor="middle">until you publish it.</text>

      {/* ---- the four documents ---- */}
      <line x1="660" y1="250" x2="796" y2="250" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg1-a)" />
      <text className="svg-mono" x="728" y="238" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">appear as</text>
      <text className="svg-mono" x="728" y="266" fontSize="10" fill="currentColor" opacity=".6" textAnchor="middle">they finish</text>

      <rect x="800" y="56" width="220" height="76" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="88" fontSize="13" fill="currentColor">Ad Diagnosis</text>
      <text className="svg-sub" x="818" y="110" fontSize="11" fill="currentColor" opacity=".62">what&rsquo;s wrong, and why</text>

      <rect x="800" y="160" width="220" height="76" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="192" fontSize="13" fill="currentColor">Competitor Lens</text>
      <text className="svg-sub" x="818" y="214" fontSize="11" fill="currentColor" opacity=".62">what rivals are running</text>

      <rect x="800" y="264" width="220" height="76" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="296" fontSize="13" fill="currentColor">Strategy</text>
      <text className="svg-sub" x="818" y="318" fontSize="11" fill="currentColor" opacity=".62">what to do about it</text>

      <rect x="800" y="368" width="220" height="76" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".3" />
      <text className="svg-label" x="818" y="400" fontSize="13" fill="currentColor">Ad Creative</text>
      <text className="svg-sub" x="818" y="422" fontSize="11" fill="currentColor" opacity=".62">the actual ads + images</text>

      <text className="svg-sub" x="910" y="478" fontSize="11" fill="currentColor" opacity=".5" textAnchor="middle">four tabs on one canvas</text>
    </svg>
  );
}

/** 02 — the sync: two ways to ask, the two phases, where it goes, how it ends. */
export function DiagramSync() {
  return (
    <svg
      viewBox="0 0 1040 630"
      role="img"
      aria-label="The sync flow: started either by asking for a re-sync or by a stale check that only proceeds if the copy has aged out. Phase one fetches the account structure in four requests side by side and stops outright if it fails. Phase two then asks Meta for performance reports, but only for the ads phase one found, in small batches. Both are written to the Growvana database, and the run ends as success, partial or failed — stamping a date that only a successful run earns, which the next stale check reads."
    >
      <defs>
        <Arrow id="dg2-a" />
        <Arrow id="dg2-c" fill="var(--doc-accent)" />
      </defs>

      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">THE TWO WAYS TO ASK</text>
      <text className="svg-tag" x="234" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHAT IT PULLS FROM META, IN ORDER</text>
      <text className="svg-tag" x="618" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHERE IT GOES</text>
      <text className="svg-tag" x="828" y="26" fontSize="10.5" fill="currentColor" opacity=".45">HOW IT ENDS</text>

      {/* ---- the two triggers ---- */}
      <rect x="20" y="48" width="190" height="84" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="38" y="78" fontSize="13" fill="currentColor">&ldquo;Sync it&rdquo;</text>
      <text className="svg-sub" x="38" y="100" fontSize="11" fill="currentColor" opacity=".65">Pull the account now, however</text>
      <text className="svg-sub" x="38" y="118" fontSize="11" fill="currentColor" opacity=".65">recently it was last pulled.</text>

      <rect x="20" y="156" width="190" height="102" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="38" y="186" fontSize="13" fill="currentColor">&ldquo;Sync it if it&rsquo;s old&rdquo;</text>
      <text className="svg-sub" x="38" y="208" fontSize="11" fill="currentColor" opacity=".65">Look up when this account last</text>
      <text className="svg-sub" x="38" y="226" fontSize="11" fill="currentColor" opacity=".65">synced successfully, and compare</text>
      <text className="svg-sub" x="38" y="244" fontSize="11" fill="currentColor" opacity=".65">it to a set number of days.</text>

      <path d="M115 258 V 282" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 3" markerEnd="url(#dg2-a)" />
      <rect x="20" y="286" width="190" height="62" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 3" />
      <text className="svg-label" x="38" y="312" fontSize="12" fill="currentColor">Still fresh &rarr; nothing happens</text>
      <text className="svg-sub" x="38" y="334" fontSize="11" fill="currentColor" opacity=".65">Meta is never called. No cost, no wait.</text>

      <path d="M210 90 H 222 V 110 H 230" fill="none" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg2-a)" />
      <path d="M210 207 H 222 V 110" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <text className="svg-mono" x="226" y="150" fontSize="10" fill="currentColor" opacity=".6" textAnchor="end">too old &rarr;</text>

      {/* ---- phase 1: the structure ---- */}
      <rect x="234" y="48" width="360" height="158" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="254" y="74" fontSize="9.5" fill="currentColor" opacity=".5">PHASE 1 &mdash; FOUR REQUESTS, SIDE BY SIDE</text>
      <text className="svg-title" x="254" y="100" fontSize="14" fill="currentColor">The structure</text>
      <text className="svg-sub" x="254" y="124" fontSize="11" fill="currentColor" opacity=".7">Account, campaigns, ad sets, ads and the</text>
      <text className="svg-sub" x="254" y="142" fontSize="11" fill="currentColor" opacity=".7">creatives inside them. Every ad in the</text>
      <text className="svg-sub" x="254" y="160" fontSize="11" fill="currentColor" opacity=".7">account is fetched, never a sample.</text>
      <line x1="254" y1="174" x2="574" y2="174" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-mono" x="254" y="192" fontSize="9.5" fill="var(--doc-warm)" opacity=".9">if this fails the sync stops here &mdash; never an empty success</text>

      <line x1="414" y1="206" x2="414" y2="228" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#dg2-a)" />
      <text className="svg-mono" x="426" y="222" fontSize="10" fill="currentColor" opacity=".6">then, and only then</text>

      {/* ---- phase 2: the numbers ---- */}
      <rect x="234" y="232" width="360" height="176" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-tag" x="254" y="258" fontSize="9.5" fill="currentColor" opacity=".5">PHASE 2 &mdash; ONLY FOR THE ADS PHASE 1 FOUND</text>
      <text className="svg-title" x="254" y="284" fontSize="14" fill="currentColor">The numbers</text>
      <text className="svg-sub" x="254" y="308" fontSize="11" fill="currentColor" opacity=".7">Spend, results and audience breakdowns,</text>
      <text className="svg-sub" x="254" y="326" fontSize="11" fill="currentColor" opacity=".7">day by day. Meta builds these in the</text>
      <text className="svg-sub" x="254" y="344" fontSize="11" fill="currentColor" opacity=".7">background &mdash; the sync submits a report,</text>
      <text className="svg-sub" x="254" y="362" fontSize="11" fill="currentColor" opacity=".7">waits, then collects the rows.</text>
      <line x1="254" y1="376" x2="574" y2="376" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-mono" x="254" y="394" fontSize="9.5" fill="currentColor" opacity=".55">small batches &middot; 3 in flight &middot; 40&ndash;60s all in</text>

      {/* ---- the destination ---- */}
      <path d="M594 118 H 606 V 223" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M594 320 H 606 V 223" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <line x1="606" y1="223" x2="614" y2="223" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg2-a)" />

      <rect x="618" y="48" width="186" height="360" rx="11" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-title" x="711" y="80" fontSize="13.5" fill="var(--doc-accent)" textAnchor="middle">Saved to the</text>
      <text className="svg-title" x="711" y="100" fontSize="13.5" fill="var(--doc-accent)" textAnchor="middle">Growvana database</text>
      <line x1="636" y1="118" x2="786" y2="118" stroke="var(--doc-accent)" strokeOpacity=".35" />
      <text className="svg-sub" x="636" y="144" fontSize="11" fill="var(--doc-accent)" opacity=".9">Written parents-first, so</text>
      <text className="svg-sub" x="636" y="162" fontSize="11" fill="var(--doc-accent)" opacity=".9">nothing points at something</text>
      <text className="svg-sub" x="636" y="180" fontSize="11" fill="var(--doc-accent)" opacity=".9">that isn&rsquo;t there yet.</text>
      <text className="svg-sub" x="636" y="212" fontSize="11" fill="var(--doc-accent)" opacity=".9">Re-running updates what&rsquo;s</text>
      <text className="svg-sub" x="636" y="230" fontSize="11" fill="var(--doc-accent)" opacity=".9">already saved &mdash; it never</text>
      <text className="svg-sub" x="636" y="248" fontSize="11" fill="var(--doc-accent)" opacity=".9">creates duplicates.</text>
      <text className="svg-sub" x="636" y="280" fontSize="11" fill="var(--doc-accent)" opacity=".9">Meta&rsquo;s untouched replies are</text>
      <text className="svg-sub" x="636" y="298" fontSize="11" fill="var(--doc-accent)" opacity=".9">kept from every run, so the</text>
      <text className="svg-sub" x="636" y="316" fontSize="11" fill="var(--doc-accent)" opacity=".9">tables can be rebuilt without</text>
      <text className="svg-sub" x="636" y="334" fontSize="11" fill="var(--doc-accent)" opacity=".9">calling Meta again.</text>
      <text className="svg-sub" x="636" y="366" fontSize="11" fill="var(--doc-accent)" opacity=".9">The access token is stored</text>
      <text className="svg-sub" x="636" y="384" fontSize="11" fill="var(--doc-accent)" opacity=".9">encrypted.</text>

      <line x1="804" y1="223" x2="824" y2="223" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg2-a)" />

      {/* ---- the three endings ---- */}
      <rect x="828" y="48" width="192" height="72" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="846" y="78" fontSize="12.5" fill="currentColor">Success</text>
      <text className="svg-sub" x="846" y="100" fontSize="11" fill="currentColor" opacity=".65">Everything landed.</text>

      <rect x="828" y="136" width="192" height="96" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="846" y="166" fontSize="12.5" fill="currentColor">Partial</text>
      <text className="svg-sub" x="846" y="188" fontSize="11" fill="currentColor" opacity=".65">A report was throttled.</text>
      <text className="svg-sub" x="846" y="206" fontSize="11" fill="currentColor" opacity=".65">What did arrive is still</text>
      <text className="svg-sub" x="846" y="224" fontSize="11" fill="currentColor" opacity=".65">kept, and it says which.</text>

      <rect x="828" y="248" width="192" height="78" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="846" y="278" fontSize="12.5" fill="currentColor">Failed</text>
      <text className="svg-sub" x="846" y="300" fontSize="11" fill="currentColor" opacity=".65">You&rsquo;re shown Meta&rsquo;s own</text>
      <text className="svg-sub" x="846" y="318" fontSize="11" fill="currentColor" opacity=".65">wording, not ours.</text>

      {/* ---- the loop that makes the stale check work ---- */}
      <path d="M916 326 V 472 H 810" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dg2-c)" />
      <rect x="618" y="442" width="186" height="60" rx="9" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-label" x="711" y="468" fontSize="12.5" fill="var(--doc-accent)" textAnchor="middle">The run is dated</text>
      <text className="svg-sub" x="711" y="488" fontSize="11" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">only if it succeeded</text>

      <path d="M618 472 H 8 V 200 H 16" fill="none" stroke="var(--doc-accent)" strokeWidth="1.4" markerEnd="url(#dg2-c)" />
      <text className="svg-mono" x="390" y="462" fontSize="10" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">the date the next stale check reads</text>

      <line x1="20" y1="560" x2="1020" y2="560" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="588" fontSize="12.5" fill="var(--doc-warm)">One-way, always.</text>
      <text className="svg-sub" x="134" y="588" fontSize="12" fill="currentColor" opacity=".7">The sync only ever reads from Meta. Nothing in Growvana is written back to your</text>
      <text className="svg-sub" x="20" y="610" fontSize="12" fill="currentColor" opacity=".7">ad account &mdash; not by the sync, and not by the agent. Publishing a finished ad stays a separate, human decision.</text>
    </svg>
  );
}

/** 03 — the fork: the two flows side by side. */
export function DiagramFlows() {
  return (
    <svg
      viewBox="0 0 1000 1092"
      role="img"
      aria-label="Side-by-side comparison of the create-new-ads flow and the tune-existing-ads flow. Both begin by reading the synced copy of the ad account; Flow A loads the whole account and asks campaign questions, Flow B loads up to ten ads to pick from. All four specialists then run in both flows on different material, before the flows converge on one ongoing conversation."
    >
      <defs>
        <Arrow id="dg3-a" />
        <Arrow id="dg3-c" fill="var(--doc-accent)" />
        <Arrow id="dg3-t" fill="var(--doc-warm)" />
      </defs>

      <rect x="340" y="16" width="320" height="56" rx="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text className="svg-label" x="500" y="42" fontSize="13.5" fill="currentColor" textAnchor="middle">You start a session and choose a flow</text>
      <text className="svg-sub" x="500" y="62" fontSize="11" fill="currentColor" opacity=".62" textAnchor="middle">the choice is locked in from here</text>

      <line x1="500" y1="72" x2="500" y2="92" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#dg3-a)" />

      <rect x="30" y="96" width="940" height="64" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.3" />
      <text className="svg-label" x="500" y="124" fontSize="13" fill="var(--doc-accent)" textAnchor="middle">Both flows begin by reading the synced copy of your ad account</text>
      <text className="svg-sub" x="500" y="146" fontSize="11" fill="var(--doc-accent)" opacity=".85" textAnchor="middle">Never Meta itself &mdash; the sync already did that. Each flow takes a different slice of it.</text>

      <path d="M420 160 V 182 H 250 V 200" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg3-c)" />
      <path d="M580 160 V 182 H 750 V 200" fill="none" stroke="var(--doc-warm)" strokeWidth="1.5" markerEnd="url(#dg3-t)" />

      <rect x="30" y="206" width="440" height="38" rx="7" fill="var(--doc-accent-soft)" />
      <text className="svg-title" x="50" y="231" fontSize="14" fill="var(--doc-accent)">Flow A &mdash; Create new ads</text>

      <rect x="530" y="206" width="440" height="38" rx="7" fill="var(--doc-warm-soft)" />
      <text className="svg-title" x="550" y="231" fontSize="14" fill="var(--doc-warm)">Flow B &mdash; Tune existing ads</text>

      <line x1="500" y1="252" x2="500" y2="776" stroke="currentColor" strokeOpacity=".15" strokeDasharray="3 5" />

      <text className="svg-tag" x="500" y="328" fontSize="9.5" fill="currentColor" opacity=".4" textAnchor="middle">STEP 1</text>
      <text className="svg-tag" x="500" y="462" fontSize="9.5" fill="currentColor" opacity=".4" textAnchor="middle">STEP 2</text>
      <text className="svg-tag" x="500" y="660" fontSize="9.5" fill="currentColor" opacity=".4" textAnchor="middle">STEP 3</text>

      {/* ---- step 1 ---- */}
      <rect x="30" y="268" width="440" height="112" rx="9" fill="var(--doc-surface2)" stroke="var(--doc-accent)" strokeOpacity=".5" />
      <text className="svg-label" x="52" y="298" fontSize="13" fill="currentColor">The whole account loads, then you&rsquo;re asked</text>
      <text className="svg-sub" x="52" y="322" fontSize="11.5" fill="currentColor" opacity=".68">Every synced ad becomes a running brief. The gap check then</text>
      <text className="svg-sub" x="52" y="342" fontSize="11.5" fill="currentColor" opacity=".68">reads your brand bible, your personas, your image library, the</text>
      <text className="svg-sub" x="52" y="362" fontSize="11.5" fill="currentColor" opacity=".68">account&rsquo;s headline figures, and the web.</text>

      <rect x="530" y="268" width="440" height="112" rx="9" fill="var(--doc-surface2)" stroke="var(--doc-warm)" strokeOpacity=".5" />
      <text className="svg-label" x="552" y="298" fontSize="13" fill="currentColor">Up to ten of your ads load, for picking</text>
      <text className="svg-sub" x="552" y="322" fontSize="11.5" fill="currentColor" opacity=".68">Best-delivering first: what Meta is actually running, then</text>
      <text className="svg-sub" x="552" y="342" fontSize="11.5" fill="currentColor" opacity=".68">switched on but not delivering, then switched off &mdash; with</text>
      <text className="svg-sub" x="552" y="362" fontSize="11.5" fill="currentColor" opacity=".68">their headline numbers. No AI at all.</text>

      <line x1="250" y1="380" x2="250" y2="412" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg3-c)" />
      <line x1="750" y1="380" x2="750" y2="412" stroke="var(--doc-warm)" strokeWidth="1.5" markerEnd="url(#dg3-t)" />

      {/* ---- step 2 ---- */}
      <rect x="30" y="416" width="440" height="92" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="52" y="446" fontSize="13" fill="currentColor">You answer the questions</text>
      <text className="svg-sub" x="52" y="470" fontSize="11.5" fill="currentColor" opacity=".68">Skipping is allowed. Your answers become the brief that</text>
      <text className="svg-sub" x="52" y="490" fontSize="11.5" fill="currentColor" opacity=".68">every later step is written against.</text>

      <rect x="530" y="416" width="440" height="92" rx="9" fill="none" stroke="currentColor" strokeOpacity=".38" />
      <text className="svg-label" x="552" y="446" fontSize="13" fill="currentColor">You tick the ads to work on</text>
      <text className="svg-sub" x="552" y="470" fontSize="11.5" fill="currentColor" opacity=".68">Your selection is the scope. Add more later and they join</text>
      <text className="svg-sub" x="552" y="490" fontSize="11.5" fill="currentColor" opacity=".68">the set &mdash; nothing already picked drops out.</text>

      <line x1="250" y1="508" x2="250" y2="540" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg3-c)" />
      <line x1="750" y1="508" x2="750" y2="540" stroke="var(--doc-warm)" strokeWidth="1.5" markerEnd="url(#dg3-t)" />

      {/* ---- step 3 ---- */}
      <rect x="30" y="544" width="440" height="232" rx="9" fill="none" stroke="var(--doc-accent)" strokeOpacity=".5" />
      <text className="svg-tag" x="52" y="570" fontSize="9.5" fill="var(--doc-accent)">THE SAME FOUR SPECIALISTS, DIFFERENT JOB</text>
      <text className="svg-label" x="52" y="604" fontSize="12" fill="currentColor">Diagnosis</text>
      <text className="svg-sub" x="176" y="604" fontSize="11.5" fill="currentColor" opacity=".68">every ad in the account, not a sample</text>
      <text className="svg-label" x="52" y="642" fontSize="12" fill="currentColor">Competitor Lens</text>
      <text className="svg-sub" x="176" y="642" fontSize="11.5" fill="currentColor" opacity=".68">searched from your brand and your</text>
      <text className="svg-sub" x="176" y="662" fontSize="11.5" fill="currentColor" opacity=".68">answers &mdash; you have no ads to match</text>
      <text className="svg-label" x="52" y="700" fontSize="12" fill="currentColor">Strategy</text>
      <text className="svg-sub" x="176" y="700" fontSize="11.5" fill="currentColor" opacity=".68">one plan for the new campaign</text>
      <text className="svg-label" x="52" y="738" fontSize="12" fill="currentColor">Creative</text>
      <text className="svg-sub" x="176" y="738" fontSize="11.5" fill="currentColor" opacity=".68">builds the campaign, the ad set</text>
      <text className="svg-sub" x="176" y="758" fontSize="11.5" fill="currentColor" opacity=".68">and every ad from nothing</text>

      <rect x="530" y="544" width="440" height="232" rx="9" fill="none" stroke="var(--doc-warm)" strokeOpacity=".5" />
      <text className="svg-tag" x="552" y="570" fontSize="9.5" fill="var(--doc-warm)">THE SAME FOUR SPECIALISTS, DIFFERENT JOB</text>
      <text className="svg-label" x="552" y="604" fontSize="12" fill="currentColor">Diagnosis</text>
      <text className="svg-sub" x="676" y="604" fontSize="11.5" fill="currentColor" opacity=".68">one report per ad you picked</text>
      <text className="svg-label" x="552" y="642" fontSize="12" fill="currentColor">Competitor Lens</text>
      <text className="svg-sub" x="676" y="642" fontSize="11.5" fill="currentColor" opacity=".68">searched against the ads you</text>
      <text className="svg-sub" x="676" y="662" fontSize="11.5" fill="currentColor" opacity=".68">picked, so rivals line up with them</text>
      <text className="svg-label" x="552" y="700" fontSize="12" fill="currentColor">Strategy</text>
      <text className="svg-sub" x="676" y="700" fontSize="11.5" fill="currentColor" opacity=".68">one plan per ad, matched 1:1</text>
      <text className="svg-label" x="552" y="738" fontSize="12" fill="currentColor">Creative</text>
      <text className="svg-sub" x="676" y="738" fontSize="11.5" fill="currentColor" opacity=".68">starts as a mirror of your live ads</text>
      <text className="svg-sub" x="676" y="758" fontSize="11.5" fill="currentColor" opacity=".68">&mdash; real Meta IDs &mdash; and edits on top</text>

      <path d="M250 776 V 812 H 500 V 838" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg3-c)" />
      <path d="M750 776 V 812 H 500" fill="none" stroke="var(--doc-warm)" strokeWidth="1.5" />

      <rect x="130" y="842" width="740" height="118" rx="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text className="svg-tag" x="500" y="870" fontSize="9.5" fill="currentColor" opacity=".45" textAnchor="middle">FROM HERE ON, IDENTICAL</text>
      <text className="svg-title" x="500" y="898" fontSize="15" fill="currentColor" textAnchor="middle">One ongoing conversation</text>
      <text className="svg-sub" x="500" y="924" fontSize="12" fill="currentColor" opacity=".7" textAnchor="middle">Every message you send runs the engine in section 04. Ask for a rewrite, a new</text>
      <text className="svg-sub" x="500" y="944" fontSize="12" fill="currentColor" opacity=".7" textAnchor="middle">angle, a fresh image, or just a question &mdash; the agent works out what&rsquo;s needed.</text>

      <text className="svg-sub" x="500" y="992" fontSize="11.5" fill="currentColor" opacity=".55" textAnchor="middle">One session, remembered between messages &mdash; close the tab and come back to it.</text>

      <rect x="30" y="1012" width="440" height="68" rx="9" fill="var(--doc-accent-soft)" />
      <text className="svg-label" x="50" y="1038" fontSize="12" fill="var(--doc-accent)">No ad account? Flow A still runs.</text>
      <text className="svg-sub" x="50" y="1058" fontSize="10.5" fill="var(--doc-accent)" opacity=".9">The diagnosis posts a short notice instead of a report &mdash;</text>
      <text className="svg-sub" x="50" y="1074" fontSize="10.5" fill="var(--doc-accent)" opacity=".9">lens, strategy and creative all still work.</text>

      <rect x="530" y="1012" width="440" height="68" rx="9" fill="var(--doc-warm-soft)" />
      <text className="svg-label" x="550" y="1038" fontSize="12" fill="var(--doc-warm)">Flow B needs a connected account.</text>
      <text className="svg-sub" x="550" y="1058" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">With at least one ad in it. An empty account is refused</text>
      <text className="svg-sub" x="550" y="1074" fontSize="10.5" fill="var(--doc-warm)" opacity=".9">up front, not handed over as a blank picker.</text>
    </svg>
  );
}

/** 04 — one conversation turn, with what each step is handed. */
export function DiagramTurn() {
  return (
    <svg
      viewBox="0 0 1040 772"
      role="img"
      aria-label="One conversation turn: your message goes to a data agent that fetches real figures, then to the CMO, which either replies and stops or dispatches work to four specialists. Each specialist is handed an instruction, a short note and only the files the CMO chose for it, but never the conversation itself; each box states what it is given."
    >
      <defs>
        <Arrow id="dg4-a" />
        <Arrow id="dg4-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- the conversational half ---- */}
      <rect x="20" y="52" width="150" height="148" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="95" y="106" fontSize="13" fill="currentColor" textAnchor="middle">You send a</text>
      <text className="svg-label" x="95" y="126" fontSize="13" fill="currentColor" textAnchor="middle">message</text>
      <text className="svg-sub" x="95" y="152" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or answers, ad picks,</text>
      <text className="svg-sub" x="95" y="169" fontSize="10.5" fill="currentColor" opacity=".62" textAnchor="middle">or a file</text>

      <line x1="170" y1="126" x2="196" y2="126" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg4-a)" />

      <rect x="200" y="52" width="250" height="148" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="220" y="82" fontSize="13" fill="currentColor">Data agent</text>
      <text className="svg-sub" x="220" y="104" fontSize="11" fill="currentColor" opacity=".68">Fetches the exact figures your</text>
      <text className="svg-sub" x="220" y="122" fontSize="11" fill="currentColor" opacity=".68">message calls for.</text>
      <line x1="220" y1="136" x2="430" y2="136" stroke="currentColor" strokeOpacity=".22" />
      <text className="svg-sub" x="220" y="156" fontSize="10.5" fill="var(--doc-accent)">Given: your message, the shape</text>
      <text className="svg-sub" x="220" y="172" fontSize="10.5" fill="var(--doc-accent)">of the synced copy, and any file</text>
      <text className="svg-sub" x="220" y="188" fontSize="10.5" fill="var(--doc-accent)">on this turn.</text>

      <line x1="450" y1="126" x2="476" y2="126" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg4-a)" />

      <rect x="480" y="52" width="290" height="148" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="500" y="82" fontSize="13.5" fill="var(--doc-accent)">The CMO</text>
      <text className="svg-sub" x="500" y="104" fontSize="11" fill="var(--doc-accent)" opacity=".9">Replies to you, and decides who works.</text>
      <line x1="500" y1="118" x2="750" y2="118" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-sub" x="500" y="138" fontSize="10.5" fill="var(--doc-accent)">Given: everything. Brand, personas, your</text>
      <text className="svg-sub" x="500" y="154" fontSize="10.5" fill="var(--doc-accent)">answers, a running brief of the account,</text>
      <text className="svg-sub" x="500" y="170" fontSize="10.5" fill="var(--doc-accent)">every file you have ever sent, and the</text>
      <text className="svg-sub" x="500" y="186" fontSize="10.5" fill="var(--doc-accent)">whole conversation.</text>

      <line x1="770" y1="126" x2="796" y2="126" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dg4-a)" />
      <rect x="800" y="96" width="220" height="62" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="910" y="122" fontSize="12" fill="currentColor" textAnchor="middle">Just a question? It answers</text>
      <text className="svg-label" x="910" y="142" fontSize="12" fill="currentColor" textAnchor="middle">and the turn ends here.</text>

      {/* ---- the line every specialist sits behind ---- */}
      <text className="svg-tag" x="20" y="242" fontSize="9.5" fill="var(--doc-warm)">PAST THIS LINE, NOTHING READS THE CONVERSATION</text>
      <line x1="20" y1="254" x2="1020" y2="254" stroke="var(--doc-warm)" strokeOpacity=".5" strokeDasharray="5 5" />
      <text className="svg-sub" x="20" y="276" fontSize="11" fill="currentColor" opacity=".72">Each specialist gets one instruction, a short note of what still matters, and only the files the CMO chose for it.</text>
      <text className="svg-sub" x="20" y="296" fontSize="11" fill="currentColor" opacity=".72">The CMO starts the chain wherever the request needs.</text>

      <path d="M625 200 V 316" fill="none" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <path d="M136 316 H 904" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" strokeDasharray="5 4" />
      <line x1="136" y1="316" x2="136" y2="328" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg4-c)" />
      <line x1="392" y1="316" x2="392" y2="328" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg4-c)" />
      <line x1="648" y1="316" x2="648" y2="328" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg4-c)" />
      <line x1="904" y1="316" x2="904" y2="328" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg4-c)" />

      {/* ---- the four specialists ---- */}
      <rect x="20" y="332" width="232" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="38" y="356" fontSize="9.5" fill="currentColor" opacity=".5">1</text>
      <text className="svg-label" x="38" y="380" fontSize="13" fill="currentColor">Ad Diagnosis</text>
      <text className="svg-sub" x="38" y="402" fontSize="11" fill="currentColor" opacity=".68">What&rsquo;s underperforming, and why.</text>
      <line x1="38" y1="418" x2="234" y2="418" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="38" y="440" fontSize="10.5" fill="var(--doc-accent)">Given: each ad&rsquo;s full numbers,</text>
      <text className="svg-sub" x="38" y="456" fontSize="10.5" fill="var(--doc-accent)">plus its real creative &mdash; images as</text>
      <text className="svg-sub" x="38" y="472" fontSize="10.5" fill="var(--doc-accent)">pictures, video with its audio.</text>
      <text className="svg-mono" x="38" y="506" fontSize="9.5" fill="currentColor" opacity=".5">&#8635; writes, re-reads, revises</text>

      <rect x="276" y="332" width="232" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="294" y="356" fontSize="9.5" fill="currentColor" opacity=".5">2</text>
      <text className="svg-label" x="294" y="380" fontSize="13" fill="currentColor">Competitor Lens</text>
      <text className="svg-sub" x="294" y="402" fontSize="11" fill="currentColor" opacity=".68">What rivals run, and for how long.</text>
      <line x1="294" y1="418" x2="490" y2="418" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="294" y="440" fontSize="10.5" fill="var(--doc-accent)">Given: your brand, personas and</text>
      <text className="svg-sub" x="294" y="456" fontSize="10.5" fill="var(--doc-accent)">your own current ads &mdash; never a</text>
      <text className="svg-sub" x="294" y="472" fontSize="10.5" fill="var(--doc-accent)">file you attached.</text>
      <text className="svg-mono" x="294" y="506" fontSize="9.5" fill="currentColor" opacity=".5">one pass: search, filter, write up</text>

      <rect x="532" y="332" width="232" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="550" y="356" fontSize="9.5" fill="currentColor" opacity=".5">3</text>
      <text className="svg-label" x="550" y="380" fontSize="13" fill="currentColor">Strategy</text>
      <text className="svg-sub" x="550" y="402" fontSize="11" fill="currentColor" opacity=".68">The only step allowed to prescribe.</text>
      <line x1="550" y1="418" x2="746" y2="418" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="550" y="440" fontSize="10.5" fill="var(--doc-accent)">Given: the finished diagnosis, the</text>
      <text className="svg-sub" x="550" y="456" fontSize="10.5" fill="var(--doc-accent)">competitor findings, and the live</text>
      <text className="svg-sub" x="550" y="472" fontSize="10.5" fill="var(--doc-accent)">ad&rsquo;s own copy when tuning.</text>
      <text className="svg-mono" x="550" y="506" fontSize="9.5" fill="currentColor" opacity=".5">&#8635; writes, re-reads, revises</text>

      <rect x="788" y="332" width="232" height="196" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-mono" x="806" y="356" fontSize="9.5" fill="currentColor" opacity=".5">4</text>
      <text className="svg-label" x="806" y="380" fontSize="13" fill="currentColor">Ad Creative</text>
      <text className="svg-sub" x="806" y="402" fontSize="11" fill="currentColor" opacity=".68">The ads themselves.</text>
      <line x1="806" y1="418" x2="1002" y2="418" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-sub" x="806" y="440" fontSize="10.5" fill="var(--doc-accent)">Given: the strategy pages, the angle</text>
      <text className="svg-sub" x="806" y="456" fontSize="10.5" fill="var(--doc-accent)">it&rsquo;s been handed, and Meta&rsquo;s own</text>
      <text className="svg-sub" x="806" y="472" fontSize="10.5" fill="var(--doc-accent)">list of permitted settings.</text>
      <text className="svg-mono" x="806" y="506" fontSize="9.5" fill="currentColor" opacity=".5">&#8635; writes, re-reads, revises</text>

      {/* ---- the close ---- */}
      <line x1="136" y1="528" x2="136" y2="556" stroke="currentColor" strokeOpacity=".45" />
      <line x1="392" y1="528" x2="392" y2="556" stroke="currentColor" strokeOpacity=".45" />
      <line x1="648" y1="528" x2="648" y2="556" stroke="currentColor" strokeOpacity=".45" />
      <line x1="904" y1="528" x2="904" y2="556" stroke="currentColor" strokeOpacity=".45" />
      <path d="M136 556 H 904" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <line x1="520" y1="556" x2="520" y2="584" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#dg4-a)" />

      <rect x="320" y="588" width="400" height="84" rx="10" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="520" y="618" fontSize="13" fill="currentColor" textAnchor="middle">Wrap-up message</text>
      <text className="svg-sub" x="520" y="640" fontSize="11" fill="currentColor" opacity=".68" textAnchor="middle">What actually landed on the canvas this turn &mdash; and the</text>
      <text className="svg-sub" x="520" y="658" fontSize="11" fill="currentColor" opacity=".68" textAnchor="middle">one step you might want next.</text>

      <line x1="20" y1="704" x2="1020" y2="704" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="732" fontSize="12.5" fill="var(--doc-accent)">Nothing waits for the end.</text>
      <text className="svg-sub" x="176" y="732" fontSize="12" fill="currentColor" opacity=".7">Each document appears on your canvas the moment its specialist finishes, and the</text>
      <text className="svg-sub" x="20" y="754" fontSize="12" fill="currentColor" opacity=".7">agent&rsquo;s replies type out word by word &mdash; so a long turn shows progress the whole way through instead of a spinner.</text>
    </svg>
  );
}

/** 05 — a file you attach: what happens once, and what happens every turn after. */
export function DiagramFiles() {
  return (
    <svg
      viewBox="0 0 1040 672"
      role="img"
      aria-label="How an attached file travels. Once, on arrival: its type and size are checked, images are resized to 2000 pixels on the long edge, and it is given a short id such as att-1 that it keeps for the whole session, surviving even when older messages are summarised. On every turn after: the CMO sees every file and forwards specific ids to specific specialists — Ad Diagnosis, Strategy and Ad Creative can each receive different files on the same turn, and the Competitor Lens never receives one."
    >
      <defs>
        <Arrow id="dg5-a" />
        <Arrow id="dg5-c" fill="var(--doc-accent)" />
      </defs>

      {/* ---- arrival: once per file, ever ---- */}
      <text className="svg-tag" x="20" y="26" fontSize="10.5" fill="currentColor" opacity=".45">WHEN A FILE ARRIVES &mdash; ONCE PER FILE, EVER</text>

      <rect x="20" y="46" width="232" height="144" rx="9" fill="none" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="40" y="78" fontSize="13" fill="currentColor">You attach a file</text>
      <text className="svg-sub" x="40" y="102" fontSize="11" fill="currentColor" opacity=".68">A competitor&rsquo;s ad, a screenshot,</text>
      <text className="svg-sub" x="40" y="120" fontSize="11" fill="currentColor" opacity=".68">a brief, a photo to work from.</text>
      <line x1="40" y1="136" x2="232" y2="136" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-mono" x="40" y="158" fontSize="10" fill="currentColor" opacity=".55">JPEG &middot; PNG &middot; WebP &middot; PDF</text>
      <text className="svg-mono" x="40" y="176" fontSize="10" fill="currentColor" opacity=".55">10 MB each</text>

      <line x1="252" y1="118" x2="280" y2="118" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg5-a)" />

      <rect x="284" y="46" width="252" height="144" rx="9" fill="var(--doc-surface2)" stroke="currentColor" strokeOpacity=".4" />
      <text className="svg-label" x="304" y="78" fontSize="13" fill="currentColor">Checked, then shrunk</text>
      <text className="svg-sub" x="304" y="102" fontSize="11" fill="currentColor" opacity=".68">Type and size are checked on</text>
      <text className="svg-sub" x="304" y="120" fontSize="11" fill="currentColor" opacity=".68">arrival. Images are resized once,</text>
      <text className="svg-sub" x="304" y="138" fontSize="11" fill="currentColor" opacity=".68">to 2000px on the long edge.</text>
      <line x1="304" y1="152" x2="516" y2="152" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-mono" x="304" y="174" fontSize="10" fill="currentColor" opacity=".55">refused? the turn stops, naming it</text>

      <line x1="536" y1="118" x2="564" y2="118" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#dg5-a)" />

      <rect x="568" y="46" width="252" height="144" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.4" />
      <text className="svg-label" x="588" y="78" fontSize="13" fill="var(--doc-accent)">It gets an id &mdash; att-1</text>
      <text className="svg-sub" x="588" y="102" fontSize="11" fill="var(--doc-accent)" opacity=".9">And answers to it for the whole</text>
      <text className="svg-sub" x="588" y="120" fontSize="11" fill="var(--doc-accent)" opacity=".9">session. Every later turn can</text>
      <text className="svg-sub" x="588" y="138" fontSize="11" fill="var(--doc-accent)" opacity=".9">still reach it by that id.</text>
      <line x1="588" y1="152" x2="800" y2="152" stroke="var(--doc-accent)" strokeOpacity=".3" />
      <text className="svg-mono" x="588" y="174" fontSize="10" fill="var(--doc-accent)" opacity=".8">nothing expires &middot; nothing re-uploads</text>

      <line x1="820" y1="118" x2="848" y2="118" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" markerEnd="url(#dg5-a)" />

      <rect x="852" y="46" width="168" height="144" rx="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 4" />
      <text className="svg-label" x="870" y="78" fontSize="13" fill="currentColor">A long chat</text>
      <text className="svg-sub" x="870" y="102" fontSize="11" fill="currentColor" opacity=".68">When older messages</text>
      <text className="svg-sub" x="870" y="120" fontSize="11" fill="currentColor" opacity=".68">are summarised, the</text>
      <text className="svg-sub" x="870" y="138" fontSize="11" fill="currentColor" opacity=".68">files come across with</text>
      <text className="svg-sub" x="870" y="156" fontSize="11" fill="currentColor" opacity=".68">them.</text>

      {/* ---- forwarding: every turn after ---- */}
      <text className="svg-tag" x="20" y="234" fontSize="9.5" fill="currentColor" opacity=".45">ON EVERY TURN AFTER &mdash; THE CMO DECIDES WHO SEES WHAT</text>
      <line x1="20" y1="246" x2="1020" y2="246" stroke="currentColor" strokeOpacity=".2" />

      <rect x="340" y="266" width="360" height="104" rx="9" fill="var(--doc-accent-soft)" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <text className="svg-label" x="520" y="296" fontSize="13.5" fill="var(--doc-accent)" textAnchor="middle">The CMO sees every file, always</text>
      <text className="svg-sub" x="520" y="320" fontSize="11" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">It forwards by naming ids &mdash; so different specialists</text>
      <text className="svg-sub" x="520" y="338" fontSize="11" fill="var(--doc-accent)" opacity=".9" textAnchor="middle">can get different files on the same turn.</text>
      <text className="svg-mono" x="520" y="360" fontSize="10" fill="var(--doc-accent)" opacity=".8" textAnchor="middle">att-3 &rarr; Creative &middot; att-5 &rarr; Diagnosis</text>

      <line x1="520" y1="370" x2="520" y2="398" stroke="var(--doc-accent)" strokeWidth="1.5" />
      <path d="M136 398 H 904" fill="none" stroke="var(--doc-accent)" strokeWidth="1.3" strokeDasharray="5 4" />
      <line x1="136" y1="398" x2="136" y2="410" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg5-c)" />
      <line x1="648" y1="398" x2="648" y2="410" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg5-c)" />
      <line x1="904" y1="398" x2="904" y2="410" stroke="var(--doc-accent)" strokeWidth="1.5" markerEnd="url(#dg5-c)" />
      {/* The lens gets a CROSS, not a thinner arrow. A dashed stub here read as a
          weaker connection, which is the opposite of the point: the line passes
          over this specialist and never lands on it. */}
      <line x1="386" y1="400" x2="398" y2="412" stroke="var(--doc-warm)" strokeWidth="1.8" />
      <line x1="398" y1="400" x2="386" y2="412" stroke="var(--doc-warm)" strokeWidth="1.8" />

      <rect x="20" y="414" width="232" height="160" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="38" y="444" fontSize="13" fill="currentColor">Ad Diagnosis</text>
      <text className="svg-sub" x="38" y="468" fontSize="11" fill="currentColor" opacity=".68">Gets a file when the question</text>
      <text className="svg-sub" x="38" y="486" fontSize="11" fill="currentColor" opacity=".68">is about a specific ad &mdash; a</text>
      <text className="svg-sub" x="38" y="504" fontSize="11" fill="currentColor" opacity=".68">screenshot pointing at one.</text>
      <text className="svg-mono" x="38" y="544" fontSize="10" fill="currentColor" opacity=".5">the file itself, not a description</text>

      <rect x="276" y="414" width="232" height="160" rx="10" fill="none" stroke="var(--doc-warm)" strokeOpacity=".65" strokeDasharray="5 4" />
      <text className="svg-label" x="294" y="444" fontSize="13" fill="var(--doc-warm)">Competitor Lens</text>
      <text className="svg-sub" x="294" y="468" fontSize="11" fill="var(--doc-warm)" opacity=".9">Never receives a file, on any</text>
      <text className="svg-sub" x="294" y="486" fontSize="11" fill="var(--doc-warm)" opacity=".9">turn. Its searches stay</text>
      <text className="svg-sub" x="294" y="504" fontSize="11" fill="var(--doc-warm)" opacity=".9">grounded on your own ads.</text>
      <text className="svg-mono" x="294" y="544" fontSize="10" fill="var(--doc-warm)" opacity=".75">describe it in words instead</text>

      <rect x="532" y="414" width="232" height="160" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="550" y="444" fontSize="13" fill="currentColor">Strategy</text>
      <text className="svg-sub" x="550" y="468" fontSize="11" fill="currentColor" opacity=".68">Gets a file the plan should</text>
      <text className="svg-sub" x="550" y="486" fontSize="11" fill="currentColor" opacity=".68">answer &mdash; a rival&rsquo;s ad you</text>
      <text className="svg-sub" x="550" y="504" fontSize="11" fill="currentColor" opacity=".68">want beaten.</text>
      <text className="svg-mono" x="550" y="544" fontSize="10" fill="currentColor" opacity=".5">the file itself, not a description</text>

      <rect x="788" y="414" width="232" height="160" rx="10" fill="none" stroke="currentColor" strokeOpacity=".45" />
      <text className="svg-label" x="806" y="444" fontSize="13" fill="currentColor">Ad Creative</text>
      <text className="svg-sub" x="806" y="468" fontSize="11" fill="currentColor" opacity=".68">Gets a file to work from, and</text>
      <text className="svg-sub" x="806" y="486" fontSize="11" fill="currentColor" opacity=".68">chooses per image which of</text>
      <text className="svg-sub" x="806" y="504" fontSize="11" fill="currentColor" opacity=".68">them belong on that one.</text>
      <text className="svg-mono" x="806" y="544" fontSize="10" fill="currentColor" opacity=".5">one file can steer one picture</text>

      <line x1="20" y1="606" x2="1020" y2="606" stroke="currentColor" strokeOpacity=".2" />
      <text className="svg-label" x="20" y="634" fontSize="12.5" fill="var(--doc-warm)">Context, never content.</text>
      <text className="svg-sub" x="162" y="634" fontSize="12" fill="currentColor" opacity=".7">A file you attach is planning material &mdash; it is never published as an ad asset,</text>
      <text className="svg-sub" x="20" y="656" fontSize="12" fill="currentColor" opacity=".7">and it never changes an ad that is live in your account.</text>
    </svg>
  );
}
