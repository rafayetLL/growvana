import React from 'react';
import {
  DiagramContext,
  DiagramSync,
  DiagramFlows,
  DiagramTurn,
  DiagramFiles,
} from './MetaAdDocDiagrams.jsx';

// Static documentation for the Meta Ad Agent. No data fetching, no props from
// the wire — this is a written page, kept in sync by hand with the workflow's
// prompts and graph.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// MetaAdDocDiagrams.jsx rather than in another paragraph here — that is what
// keeps this page short enough to read.
//
// Layout classes live in index.css under `.doc` rather than as Tailwind
// utilities, because the same rules have to be overridden wholesale by the
// print stylesheet (see `@media print` there) and a utility soup would make
// that impossible to target.

// No `updated` date. The page is kept in sync with the agent by hand, so a stamp
// is only ever as true as the last person to remember it — and a stale one is
// worse than none, because it tells a reader the rest of the page was checked
// on a day it was not.
export const META_AD_DOC_META = {
  title: 'Meta Ad Agent',
  subtitle: 'How it reads your ad account, what it knows about Meta, and what it produces.',
};

function Section({ num, title, intro, children }) {
  return (
    <section className="doc-section">
      <div className="doc-sec-head">
        <span className="doc-sec-num">{num}</span>
        <div>
          <h2>{title}</h2>
          {intro}
        </div>
      </div>
      {children}
    </section>
  );
}

function Figure({ children, caption }) {
  return (
    <figure className="doc-fig">
      <div className="doc-scroller">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Panel({ num, title, owns, lede, children }) {
  return (
    <article className="doc-panel">
      <header>
        <span className="doc-panel-num">{num}</span>
        <h3>{title}</h3>
        <span className="doc-panel-owns">{owns}</span>
      </header>
      <div className="doc-panel-body">
        <div className="doc-panel-lede">{lede}</div>
        <div className="doc-panel-know">{children}</div>
      </div>
    </article>
  );
}

function Bench({ rows }) {
  return (
    <dl className="doc-bench">
      {rows.map(([term, def]) => (
        <React.Fragment key={term}>
          <dt>{term}</dt>
          <dd>{def}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function MetaAdAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what it looks at ===================== */}
      <Section
        num="01"
        title="What the agent is looking at"
        intro={
          <p>
            Four sources go in; four living documents come out. The agent never touches your Meta
            account directly — a separate sync job copies it first, and the agent only ever reads
            that copy.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>The first hop is the one that matters.</b> The agent reads a <em>copy</em> of your
              ad account, so a slow or rate-limited Meta connection can never stall a conversation —
              and the agent can never change a live ad by accident.
            </>
          }
        >
          <DiagramContext />
        </Figure>
      </Section>

      {/* ===================== 02 — the sync ===================== */}
      <Section
        num="02"
        title="The sync: how your ad data gets here"
        intro={
          <>
            <p>
              A completely separate job from the conversation, and the only part of the system that
              ever speaks to Meta. It runs once when an account is connected, and after that only
              when someone asks for it again.
            </p>
            <p>
              It happens in two stages, and it is worth fixing the two words before anything else.{' '}
              <strong>The structure</strong> is what exists in your account and how it is set up —
              your campaigns, your ad sets, your ads, the wording and pictures inside them. No
              performance figures at all. <strong>The numbers</strong> are what each of those ads
              actually did. Meta hands the two over in completely different ways, and that is the
              whole reason the sync is shaped the way it is.
            </p>
          </>
        }
      >
        <Figure caption={null}>
          <DiagramSync />
        </Figure>

        <h3 className="doc-h3">Phase 1 — the structure</h3>
        <p className="doc-lead">
          Four ordinary questions, asked at the same time and answered immediately: what is this
          account, what campaigns are in it, what ad sets are in those, and what ads are in those.
          Each ad&rsquo;s wording and images come back attached to it in the same answer.{' '}
          <strong>Every ad is fetched, never a sample</strong> — then archived and deleted ones are
          dropped as noise, and everything else, paused ads included, is kept.{' '}
          <strong>The ads left after that are the list phase 2 works from.</strong>
        </p>

        <div className="doc-depth">
          <div>
            <h4>What comes back</h4>
            <span className="doc-depth-note">
              Not a summary — the account itself, down to the level Ads Manager shows you and in
              places further.
            </span>
            <ul>
              <li>
                <strong>Account</strong> — currency, time zone, amount spent, balance, spend cap,
                status, funding source.
              </li>
              <li>
                <strong>Campaigns</strong> — objective, buying type, bid strategy, daily and lifetime
                budget and what&rsquo;s left of it, spend cap, special ad categories, start and stop
                dates, and both the status you set and the status Meta is honouring.
              </li>
              <li>
                <strong>Ad sets</strong> — optimisation goal, billing event, bid amount and strategy,
                budgets, destination, attribution window, schedule, and the{' '}
                <strong>full targeting definition</strong>.
              </li>
              <li>
                <strong>Ads</strong> — status, anything Meta has flagged, and the tracking and
                conversion setup.
              </li>
              <li>
                <strong>Creatives</strong> — headline, body, call-to-action type, image and its URL,
                video, thumbnail, Instagram permalink, destination link and its tracking tags. Where
                you gave Meta several headlines and images to mix between, every one of them is kept
                separately too.
              </li>
            </ul>
          </div>
        </div>

        <h3 className="doc-h3">Phase 2 — the numbers</h3>
        <p className="doc-lead">
          Performance figures don&rsquo;t come back on the spot. You order a <strong>report</strong>{' '}
          — which is just a written order saying <em>these figures, for these ads, over this
          period</em> — Meta goes away and builds it, the sync checks back every few seconds until
          it&rsquo;s ready, and then collects the finished rows. It is slower than simply asking, and
          it is the only dependable way to get figures broken down for a lot of ads at once.
        </p>
        <p className="doc-lead">
          Seven reports are ordered, all of them about the ads phase 1 kept, and each one split into
          batches so no single order is enormous. The batch sizes differ because the reports differ
          in how much work they are for Meta — which is what the limits further down are about.
        </p>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '17%' }}>Report</th>
                <th style={{ width: '25%' }}>One row per</th>
                <th style={{ width: '46%' }}>What it makes answerable</th>
                <th style={{ width: '12%' }}>Ads per request</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>The totals</td>
                <td>the ad, added up across the whole period you chose</td>
                <td>
                  <em>How did this ad do overall?</em> The full metric set — delivery, engagement,
                  the action funnel with a cost against each, video drop-off, and Meta&rsquo;s three
                  rankings.
                </td>
                <td>100</td>
              </tr>
              <tr>
                <td>Daily</td>
                <td>the ad, on one single day</td>
                <td>
                  <em>Is it getting better or wearing out?</em> The only possible source of a
                  fatigue read — clicks sliding while views hold steady doesn&rsquo;t exist in a
                  total. Dated in the account&rsquo;s own time zone, so the days match Ads Manager.
                </td>
                <td>40</td>
              </tr>
              <tr>
                <td>Age × gender</td>
                <td>the ad, per age-and-gender pair</td>
                <td>
                  <em>Who is actually converting?</em> The two together rather than in separate
                  lists, so the combination is visible.
                </td>
                <td>100</td>
              </tr>
              <tr>
                <td>Country</td>
                <td>the ad, per country</td>
                <td>
                  <em>Which markets are carrying it</em>, and which are absorbing budget.
                </td>
                <td>100</td>
              </tr>
              <tr>
                <td>Placement</td>
                <td>
                  the ad, per combination of app, spot within it, and device — Facebook feed on a
                  phone is one row, Instagram Reels on a laptop is another
                </td>
                <td>
                  <em>Where is the money actually going?</em> This is where quiet waste usually
                  hides, and it is the heaviest report of the seven — hence the smallest batch.
                </td>
                <td>25</td>
              </tr>
              <tr>
                <td>Creative pieces</td>
                <td>the ad, per headline, body, image or button</td>
                <td>
                  <em>Which version is doing the work?</em> For ads where you gave Meta several
                  headlines and images and let it mix them. Meta will only report one of those four
                  at a time, so each is asked for separately and stitched back together.
                </td>
                <td>200</td>
              </tr>
              <tr>
                <td>Hour of day</td>
                <td>the ad, per hour</td>
                <td>
                  <em>When does it convert?</em> The dayparting view, in the account&rsquo;s own
                  time zone. Optional — asked for only when wanted.
                </td>
                <td>50</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-depth">
          <div>
            <h4>The metrics themselves</h4>
            <span className="doc-depth-note">
              What each ad did — what it cost, who it reached, and what they did next.
            </span>
            <ul>
              <li>
                <strong>Delivery</strong> — impressions, reach, frequency, spend, CPM.
              </li>
              <li>
                <strong>Engagement</strong> — clicks, CTR, link clicks and link CTR specifically, CPC.
              </li>
              <li>
                <strong>The whole action funnel, with a cost against each</strong> — purchases,
                leads, registrations, add-to-carts, checkouts started, subscriptions, payment info
                added, applications, contacts, outbound clicks, post and page engagement, reactions,
                and every pixel conversion event you fire.
              </li>
              <li>
                <strong>Revenue per action</strong>, not just counts — which is what makes return on
                spend calculable rather than guessed.
              </li>
              <li>
                <strong>Video</strong> — plays, how many reached 25, 50, 75, 95 and 100% of the way
                through, ThruPlays, and what each cost.
              </li>
              <li>
                <strong>Meta&rsquo;s own three rankings</strong> — quality, engagement rate and
                conversion rate, each relative to the ads competing for the same audience.
              </li>
              <li>
                Every conversion figure is counted on a <strong>7-day click, 1-day view</strong>{' '}
                window, and every money figure is in the account&rsquo;s own currency — so what you
                read here and what Ads Manager shows are the same number.
              </li>
            </ul>
          </div>

          <div>
            <h4>What gets kept afterwards</h4>
            <span className="doc-depth-note">
              Both phases are saved together, into fourteen tables.
            </span>
            <ul>
              <li>
                <strong>The structure</strong> — one entry per campaign, ad set, ad and creative,
                saved before the things that point at them, so nothing ever refers to something that
                isn&rsquo;t there.
              </li>
              <li>
                <strong>The day-by-day rows</strong>, which are the record of what was spent.
              </li>
              <li>
                <strong>The broken-down rows</strong> — one per age group, country, placement, hour
                and creative variant.
              </li>
              <li>
                <strong>A short summary per ad</strong>, worked out in advance for 7 days, 30 days
                and all time — so a passing question in chat doesn&rsquo;t mean recalculating
                anything.
              </li>
              <li>
                <strong>Meta&rsquo;s replies, untouched</strong>, kept from every run — so the
                tables can be rebuilt later without asking Meta again.
              </li>
              <li>
                <strong>A log of the run itself</strong> — when it started and finished, how much it
                wrote, how it ended, and anything that went wrong.
              </li>
            </ul>
          </div>
        </div>

        <p className="doc-fine">
          <strong>The window is yours to pick</strong> — today or yesterday, the last 3, 7, 14, 28,
          30 or 90 days, this or last month, quarter or year, or the account&rsquo;s full lifetime.
          Thirty days is the default. You also choose whether to take every ad or only the top
          spenders.
        </p>

        <h3 className="doc-h3">Staying inside Meta&rsquo;s limits</h3>
        <p className="doc-lead">
          Meta puts a ceiling on how much any one ad account can ask of it in an hour — a rolling
          hour, so it is always the last sixty minutes rather than an hour that resets on the clock.
          It measures two different things, and only one of them ever gets close.
        </p>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>What Meta counts</th>
                <th style={{ width: '30%' }}>How much you get in an hour</th>
                <th style={{ width: '50%' }}>How close a sync comes to it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>How many times you ask</td>
                <td>
                  Grows with the size of the account: roughly 300 requests plus 40 for every running
                  ad on the structure side, and 600 plus 400 per running ad on the reporting side.
                </td>
                <td>
                  <strong>Nowhere near it.</strong> Even a 1,200-ad account uses under half a percent
                  of the reporting allowance on a full sync, because the batches get bigger as the
                  account does. Several full syncs an hour would still be comfortable.
                </td>
              </tr>
              <tr>
                <td>How hard the asking is to answer</td>
                <td>
                  Scored separately, as a percentage used up — Meta charges you for how much work a
                  request costs it to compute, not just for asking.
                </td>
                <td>
                  <strong>This is the one that bites.</strong> A broken-down report across thirty
                  days is genuinely expensive for Meta to build, and the placement one — every
                  combination of app, position and device — is the most expensive of all. A handful
                  of those can use up the hour long before the count of requests moves at all.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="doc-h4">What one sync actually costs</h4>
        <p className="doc-lead">
          The structure side is the only part that grows noticeably with the account, and only in one
          place: campaigns and ad sets come back 500 to a page, so they are one request each, while
          ads come back only 50 to a page because every ad drags its creative along with it. So 1,200
          ads is 24 pages of ads, and that is the number moving in the third column below.
        </p>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Ads in the account</th>
                <th style={{ width: '14%' }}>Kept after filtering</th>
                <th style={{ width: '24%' }}>Requests in phase 1</th>
                <th style={{ width: '14%' }}>Reports in phase 2</th>
                <th style={{ width: '14%' }}>Requests in phase 2</th>
                <th style={{ width: '16%' }}>Share of the hour</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>~60</td>
                <td>~40</td>
                <td>5 — one each for the account, campaigns and ad sets, plus 2 pages of ads</td>
                <td>11</td>
                <td>~70</td>
                <td>under 0.5%</td>
              </tr>
              <tr>
                <td>~250</td>
                <td>~200</td>
                <td>8 — the same three, plus 5 pages of ads</td>
                <td>23</td>
                <td>~140</td>
                <td>under 0.5%</td>
              </tr>
              <tr>
                <td>~1,200</td>
                <td>~1,000</td>
                <td>~28 — the same three, plus 24 pages of ads</td>
                <td>115</td>
                <td>~800</td>
                <td>under 0.5%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="doc-fine">
          Every single exchange counts as one request — including each time the sync checks whether a
          report is ready yet, and each page of results it collects. The share stays flat across all
          three rows because the batches scale with the account. Note that Meta only counts ads that
          are <em>currently running</em> when working out your allowance, so an account that is mostly
          paused has a smaller one than its ad count suggests.
        </p>

        <h4 className="doc-h4">How the sync paces itself</h4>
        <p className="doc-lead">
          All of it is built against the second limit — the expensive-to-answer one — because that is
          the one a real account runs into.
        </p>
        <ul className="doc-list">
          <li>
            <strong>Meta says how full the hour is on every single reply</strong>, and the sync reads
            it. Once it passes 80% used, it waits before sending anything else rather than sending
            the request that gets it blocked.
          </li>
          <li>
            <strong>The heavy reports are asked for in smaller pieces</strong> — 40 ads at a time for
            the day-by-day one, 25 for placement — and <strong>no more than three reports are ever in
            progress at once</strong>, so the work is spread out instead of fired off in a burst.
          </li>
          <li>
            <strong>If Meta does block it, it waits as long as Meta says to</strong> and tries three
            times before giving up, rather than hammering away. And if a report comes back as too big
            for Meta to return at all, the sync cuts the batch in half and asks again.
          </li>
          <li>
            <strong>An empty run is never saved.</strong> Blocked during phase 1 and the run stops
            outright; blocked during phase 2 and it keeps everything that did arrive, marks the run
            as partial, and names the reports that didn&rsquo;t make it.
          </li>
          <li>
            <strong>And it simply doesn&rsquo;t re-sync unless the copy is old.</strong> That, more
            than any of the above, is what keeps an account inside its limits — repeatedly pulling
            everything is the only thing that would genuinely exhaust them.
          </li>
        </ul>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why a copy at all, rather than asking Meta live?</strong> A full pull takes forty
            to sixty seconds — far too slow to sit inside a chat reply. The second limit above means
            a busy day of asking Meta directly would turn into failed conversations. And one message
            runs the same numbers past several specialists; reading them once, from our own copy,
            means they all see an identical picture.
          </p>
        </div>
      </Section>

      {/* ===================== 03 — the two flows ===================== */}
      <Section
        num="03"
        title="The fork: two flows, one engine"
        intro={
          <p>
            You pick a flow when you start a session, and it is fixed for the life of that session.
            The first three steps are where the two genuinely differ; after that they run the same
            engine on different material.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>All four specialists run in both flows — what changes is the material.</b> Both read
              the synced copy and take a different slice: Flow A the whole account, Flow B the ten
              ads you&rsquo;ll choose from. That difference is what makes the diagnosis account-wide
              in one and ad-by-ad in the other.
            </>
          }
        >
          <DiagramFlows />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>Flow A — Create new ads</h3>
            <dl>
              <dt>Use it when</dt>
              <dd>You&rsquo;re launching something new, or the account is too thin to learn from.</dd>
              <dt>What it needs</dt>
              <dd>
                A Company Blueprint. An ad account is optional — without one there&rsquo;s nothing to
                diagnose, so that tab gets a short notice instead of a report. Lens, strategy and
                creative all still run.
              </dd>
              <dt>Its first move</dt>
              <dd>
                The gap check. It reads your brand bible, your personas, your image library, your
                account&rsquo;s headline figures and the open web — then asks only about what none of
                them could settle, each as a short multiple choice with suggested answers, so
                you&rsquo;re picking rather than writing.
              </dd>
              <dt>What it always asks</dt>
              <dd>
                Three, every time: <strong>the ad format and look</strong> (image or carousel — video
                isn&rsquo;t supported yet), <strong>where the ad lands and what its button says</strong>,
                and <strong>the budget and the dates</strong>. Beyond those it asks only what would
                visibly change the ads that come back — usually five to eight questions in total,
                but there&rsquo;s no quota and it never pads to reach one.
              </dd>
              <dt>What it won&rsquo;t ask</dt>
              <dd>
                Anything your Blueprint already answers, anything about the business rather than this
                campaign, and anything the system can&rsquo;t build. If it can see you have no
                product photography, it asks whether you can send some —{' '}
                <strong>a file you attach there becomes the reference the image maker renders from.</strong>
              </dd>
              <dt>What you end up with</dt>
              <dd>
                A publishable campaign built from scratch — objective, audience, budget shape, and
                every ad with its copy and images.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>Flow B — Tune existing ads</h3>
            <dl>
              <dt>Use it when</dt>
              <dd>
                Ads are already running and you want to know what&rsquo;s dragging and how to fix it.
              </dd>
              <dt>What it needs</dt>
              <dd>
                A synced ad account with at least one ad. An empty account is refused up front rather
                than handing you an empty picker.
              </dd>
              <dt>Its first move</dt>
              <dd>
                The ad picker — no AI, no waiting, no gap questions. Up to ten ads come straight out
                of the synced copy, ordered by how well they&rsquo;re delivering. The agent only
                starts thinking once you&rsquo;ve chosen.
              </dd>
              <dt>What the first read covers</dt>
              <dd>
                Exactly the ads you ticked, and for each one the diagnosis gets that ad&rsquo;s real
                numbers <em>and</em> its real creative — images as pictures, or the video described
                shot by shot with its audio.
              </dd>
              <dt>What you end up with</dt>
              <dd>
                A diagnosis and a plan for each ad you picked, and a draft that starts as a faithful
                copy of what&rsquo;s live so you can see exactly what changed.
              </dd>
            </dl>
          </div>
        </div>

        <div className="doc-note">
          <p>
            <strong>The two never mix.</strong> A session is one flow for life. Send campaign answers
            to a tuning session, or ad selections to a creating session, and it&rsquo;s refused in
            plain English rather than quietly doing the wrong thing. Picking an ad that isn&rsquo;t
            in the synced copy is refused too — otherwise the diagnosis would go looking and silently
            find nothing.
          </p>
        </div>
      </Section>

      {/* ===================== 04 — one turn ===================== */}
      <Section
        num="04"
        title="What happens when you send one message"
        intro={
          <p>
            The engine both flows share. It runs top to bottom every time you hit send — including
            when you&rsquo;re only asking a question. Each box says what that step is handed, because
            that is most of why the answers come out the way they do.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramTurn />
        </Figure>
      </Section>

      {/* ===================== 05 — attached files ===================== */}
      <Section
        num="05"
        title="The files you attach"
        intro={
          <p>
            You can attach a file to any message — a competitor&rsquo;s ad, a screenshot, a brief, a
            photo to work from. Two things are worth knowing: a file stays available for the whole
            session rather than the turn it arrived on, and the agent decides <em>per specialist</em>{' '}
            which files each one actually sees.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>Refer to a file in words and the agent finds it.</b> &ldquo;The competitor ad I sent
              earlier&rdquo; resolves to the id that file was given on arrival, however many turns
              ago that was — so you never have to re-upload something to talk about it again.
            </>
          }
        >
          <DiagramFiles />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>What it does with one</h3>
            <dl>
              <dt>Forwards the file itself</dt>
              <dd>
                A specialist receives the real file, not the agent&rsquo;s description of it — so it
                reads the rival&rsquo;s actual headline, or looks at your actual photograph.
              </dd>
              <dt>Splits them per specialist</dt>
              <dd>
                One turn can send a screenshot to the diagnosis and a different competitor ad to the
                strategy. Each gets only what its own work is about.
              </dd>
              <dt>Splits them per picture</dt>
              <dd>
                The image maker goes one level finer: within a single batch, one file can steer one
                image while the others are untouched by it.
              </dd>
              <dt>Says what it is</dt>
              <dd>
                A forwarded file always arrives with an instruction naming it and saying what to do
                with it — a file with no explanation gets ignored or used wrongly.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>What it won&rsquo;t do</h3>
            <dl>
              <dt>Send one to the Competitor Lens</dt>
              <dd>
                Never, on any turn. That step maps what other advertisers publish, and its searches
                stay grounded on your own ads. Ask for &ldquo;more like this one&rdquo; and the ad
                gets described in words instead.
              </dd>
              <dt>Publish one as an asset</dt>
              <dd>
                An attachment is planning context. It is never dropped into an ad draft as the image
                that ships, and it never changes an ad that is live in your account.
              </dd>
              <dt>Describe one it can&rsquo;t see</dt>
              <dd>
                If a file can&rsquo;t be read, it&rsquo;s named and forwarded rather than guessed at.
              </dd>
              <dt>Take a file it can&rsquo;t use</dt>
              <dd>
                JPEG, PNG, WebP and PDF, up to 10 MB each. Anything else stops the turn with a
                message naming the file, rather than being dropped quietly.
              </dd>
            </dl>
          </div>
        </div>
      </Section>

      {/* ===================== 06 — the specialists ===================== */}
      <Section
        num="06"
        title="The four specialists, and what each one knows"
        intro={
          <>
            <p>
              Each owns exactly one document and nobody else writes it. And none is a general
              marketing assistant pointed at Facebook: each carries its own body of Meta-specific
              craft — the benchmarks, thresholds, frameworks, placement rules and policy lines that
              decide whether an ad works or gets rejected.
            </p>
            <p>
              The fourth splits again. Writing an ad and making its picture are different crafts, so
              they&rsquo;re two separate hands with separate instructions — the copywriter never
              decides what the image looks like, and the image maker is given the finished copy
              rather than guessing at it.
            </p>
          </>
        }
      >
        <Panel
          num="01"
          title="Ad Diagnosis"
          owns="Owns: what is true"
          lede={
            <>
              <p>
                A Meta performance analyst. It judges everything the data carries — every metric, the
                action funnel and its per-action costs, the daily trend, every breakdown of who saw
                the ad and where — <em>and</em> the creative itself. The point is to connect the two:
                a weak spot in the creative explaining a number in the data.
              </p>
              <p>
                It is forbidden from prescribing. No roadmap, no to-do list, no owner or timeline
                columns, even if you ask. That&rsquo;s the next step&rsquo;s job, and keeping the line
                sharp is what stops the two documents contradicting each other.
              </p>
              <p>
                It closes with a structured verdict on four areas — images, campaign, ad set, ad
                creative — each marked <em>needs work</em> or not, with the change the data suggests.
                That verdict routes the work downstream.
              </p>
            </>
          }
        >
          <h4>Benchmarks it grades against</h4>
          <Bench
            rows={[
              ['Link CTR', 'weak under 1%, strong over 2%'],
              ['CPM', '$7–14 typical; rising while results stay flat means competition or weak relevance'],
              ['Purchase CVR', '~1.5–2% · lead forms run far higher, ~7–8%'],
              ['ROAS', '~1.9× is rough break-even-plus; most ecommerce needs 2–4×'],
              ['Hook rate', 'first 3 seconds — good 25%+, kill below 15%'],
              ['Hold rate', 'does the middle deliver — good 20–25%, weak under 18%'],
              ['Frequency', 'watch above 3.0, strong fatigue above 4.0 on cold traffic'],
            ]}
          />

          <h4>Patterns it recognises</h4>
          <ul>
            <li>
              High hook with low hold = a strong open that doesn&rsquo;t pay off. Low hook with high
              hold = the content works but the first frame doesn&rsquo;t stop the scroll.
            </li>
            <li>
              CTR sliding while impressions hold is the earliest fatigue tell — and creative peaks
              around days 7–21 and decays by week three or four, so a fading older ad usually reads
              as fatigue rather than a targeting fault.
            </li>
            <li>
              Meta&rsquo;s quality, engagement and conversion rankings are <em>relative</em> to the
              ads competing for the same audience, so &ldquo;below average&rdquo; is a real flag.
            </li>
            <li>
              <strong>One ad, one offer, one message, one audience.</strong> A creative that is well
              made but aimed at the wrong audience or objective is still marked off — craft
              doesn&rsquo;t excuse a mismatch.
            </li>
            <li>
              Tall 4:5 tends to beat square in feed; on video, the message has to land with the{' '}
              <em>sound off</em>.
            </li>
          </ul>

          <h4>How it reads a video</h4>
          <ul>
            <li>
              A separate pass watches and listens first and writes down what is actually there — the
              hook in the first three seconds, each scene beat with its timestamp, the on-screen text
              quoted, the voiceover, the pacing, when the brand appears and when the call to action
              lands.
            </li>
            <li>
              That description is written with <strong>no access to performance numbers</strong>, so
              it can&rsquo;t flatter a winner or bury a loser. The diagnosis then judges it{' '}
              <em>against</em> the numbers.
            </li>
            <li>
              Where only a thumbnail exists, it judges the single frame and says so rather than
              inventing beats it cannot see.
            </li>
          </ul>

          <h4>What the report contains</h4>
          <ul>
            <li>
              The verdict first, before any detail. Then the creative shown, and a critique marking{' '}
              <em>every</em> element — headline, body, call to action, image or video — as aligned or
              not, each with one line on what&rsquo;s wrong.
            </li>
            <li>
              The day-by-day trend read rather than just plotted: the direction named, and the days
              spend spiked or results dried up called out.
            </li>
            <li>
              Where the money went by placement, and who saw it by age, gender and country — so waste
              is visible rather than buried in a table.
            </li>
            <li>It closes on three to five findings that tie a symptom to its probable cause.</li>
            <li>
              The account-wide version mirrors Meta&rsquo;s own hierarchy — account, campaigns, ad
              sets, ads — and at each level gives an overall read plus the best three and worst
              three, ranked by cost per result. Never a dump of every row.
            </li>
          </ul>

          <h4>Discipline</h4>
          <ul>
            <li>
              Benchmarks are a sanity check, never a verdict — every metric is read against the
              ad&rsquo;s own objective and the rest of the account first.
            </li>
            <li>
              It can search the web when a benchmark is too generic for your niche, but folds what it
              learns in silently and never quotes a source.
            </li>
            <li>Numbers come only from your data. It may never source your own figures from the web.</li>
            <li>
              <strong>Ask for a change and it patches that part</strong> — it re-reads its own page
              and edits the specific passage rather than regenerating the document, so nothing else
              drifts while you&rsquo;re fixing one line.
            </li>
          </ul>
        </Panel>

        <Panel
          num="02"
          title="Competitor Lens"
          owns="Owns: what rivals do"
          lede={
            <>
              <p>
                It benchmarks you against real ads pulled from the Meta Ad Library, on one idea
                specific to paid social: <strong>nobody keeps paying to run a loser.</strong> How long
                an ad has been live is the most honest signal available, because the advertiser is
                voting with their own budget every day it stays up.
              </p>
              <p>
                So it reads the copy and, for video, the full spoken transcript as ground truth for
                what each ad says — then looks for patterns repeating across several long-runners,
                never a one-off.
              </p>
              <p>
                Refreshed from scratch every time it runs, so it always matches your current
                selection. It is also the one specialist that never receives a file you attached.
              </p>
            </>
          }
        >
          <h4>Signals it reads on each rival ad</h4>
          <Bench
            rows={[
              ['Days running', 'the winner signal — first seen to last seen'],
              ['Last active', 'a long-runner that stopped a year ago is a stale pattern, not a live one'],
              ['Maturity', 'testing → scaling → winning'],
              ['Rank & direction', 'climbing or declining against tracked ads'],
              ['EU/UK reach', 'with its age and gender split — Meta only discloses reach in the EU'],
              ['Advertiser scale', 'page and follower counts, how many ads they run at once, store traffic, review volume'],
            ]}
          />

          <h4>How it filters</h4>
          <ul>
            <li>
              It keeps direct <em>and</em> adjacent competitors, drops keyword-only matches from a
              different category, then ranks what&rsquo;s left by how much is genuinely transferable.
            </li>
            <li>
              Every number from the ad library is a modelled estimate, give or take 20–40% — treated
              as directional, never quoted as fact.
            </li>
          </ul>

          <h4>What it hands you</h4>
          <ul>
            <li>Why each long-runner keeps running — the mechanism, proof or angle being funded.</li>
            <li>
              Four to six open lanes: each ties a specific competitor pattern to a specific claim your
              brand bible or personas actually support, so it&rsquo;s a lane <em>you</em> can win.
            </li>
            <li>An honest read naming the single biggest move — and it&rsquo;s told not to hedge.</li>
            <li>
              It writes about rivals by name and by what their ad says, never by an internal ID, and
              says so plainly if the competitor data comes back thin rather than padding.
            </li>
          </ul>
        </Panel>

        <Panel
          num="03"
          title="Strategy"
          owns="Owns: what to do"
          lede={
            <>
              <p>
                It walks the funnel — impression, three-second view, hold, link click, landing page
                view, conversion — and names the <strong>first big drop-off</strong>. That stage is
                the problem; everything downstream is a symptom. Then it joins that leak to the
                whitespace the Competitor Lens found, and commits to <em>one</em> bet rather than a
                list of chores.
              </p>
              <p>
                The governing rule is a leverage order: creative and offer first, because with broad
                targeting the creative <em>is</em> the targeting; then audience, then placement, then
                bid and budget mechanics — real, but they can never rescue weak creative. Effort
                follows the biggest leak multiplied by the budget behind it, so a small leak on heavy
                spend outranks a large one on nothing.
              </p>
            </>
          }
        >
          <h4>Symptom → the move it calls for</h4>
          <Bench
            rows={[
              ['Low hook rate', 'fix the opener — first frame, first three seconds'],
              ['Hook fine, hold poor', 'fix the middle: pacing, story, a faster payoff'],
              ['Low CTR', "hook, body and CTA aren't promising one thing"],
              ['Good CTR, poor conversion', 'offer and landing page — not targeting'],
              ['Clicks not becoming page views', 'tracking, load speed, mobile — not media'],
              ['Frequency up, CTR down, CPM up', 'creative fatigue; refresh, and broaden if the pool is small'],
            ]}
          />

          <h4>How Meta itself behaves — and why that shapes the plan</h4>
          <ul>
            <li>
              <strong>Meta has to learn before it performs.</strong> It needs roughly 50 results a
              week from an ad set before it stops guessing who to show the ad to — so the budget has
              to be big enough to actually buy 50 of whatever you&rsquo;re asking for.
            </li>
            <li>
              <strong>Changing too much sends it back to the start.</strong> A budget jump over about
              a fifth, a new audience, or a swapped image all restart that learning. Which is why a
              winner gets raised gradually — around 20% every few days — instead of doubled.
            </li>
            <li>
              <strong>Fewer, bigger beats more, smaller.</strong> Split across many small ad sets,
              none collects enough results to learn from. New angles become extra ads in one ad set,
              not more ad sets.
            </li>
            <li>
              <strong>Let it target broadly.</strong> Given the right creative, Meta finds buyers
              better than hand-picked interests do. Retargeting stays a small slice — re-showing ads
              to people who already know you looks wonderful on a report, but it mostly takes credit
              for sales the cold ads earned.
            </li>
          </ul>

          <h4>How it sets up a test</h4>
          <ul>
            <li>
              <strong>One change at a time</strong> — change the image and the headline together and
              you&rsquo;ll never know which did it.
            </li>
            <li>
              <strong>It names the number that settles it before the test runs.</strong> Did the
              opening stop people? Hook rate. Did the rest hold them? Hold rate. Was the offer
              appealing? Click-through. Did the landing page close it? Cost per result.
            </li>
            <li>
              <strong>Wait for enough evidence</strong> — roughly 50 sales or leads, and one to two
              full weeks, so a good Tuesday isn&rsquo;t mistaken for a trend. Only a clear disaster
              gets killed early.
            </li>
            <li>
              <strong>Refresh before it goes stale</strong> — every two to four weeks once fatigue
              shows — and test genuinely different <em>angles</em>, not five versions of one idea in
              different colours.
            </li>
            <li>
              <strong>Borrow the mechanics, not the message.</strong> If the market has proven a
              format or offer type works, use it — but win on a different angle. A rival&rsquo;s
              winning ad depends on their margins and their customers, not yours.
            </li>
          </ul>

          <h4>What the plan itself contains</h4>
          <ul>
            <li>
              One headline bet stated plainly with the evidence behind it, then the moves ranked by
              impact, each tagged to the finding it answers and what it should shift.
            </li>
            <li>Two to four things worth testing, each with the metric that will prove or kill it.</li>
            <li>
              Creative direction covering <em>both</em> the words and the picture — on an existing ad,
              specifically what to keep, change and try next.
            </li>
            <li>
              Where to concentrate spend and what to cut, and a closing read on what realistically
              moves — with no invented precision.
            </li>
            <li>
              A brand-new campaign is planned as one campaign, one ad set, one ad unless you ask for
              more. Starting wide is how budgets get spread too thin to learn.
            </li>
            <li>
              <strong>Ask for a change and it patches that part</strong>, leaving the rest of the
              document exactly as it was.
            </li>
          </ul>
        </Panel>

        <Panel
          num="04"
          title="Ad Creative"
          owns="Owns: what ships"
          lede={
            <>
              <p>
                It builds the thing you&rsquo;d actually publish — the campaign, the ad set, and the
                ads inside them. But it writes only the <em>structure</em>. The words and the pictures
                come from two separate hands with their own instructions, below; this one commissions
                them and assembles the result.
              </p>
              <p>
                On the tuning flow the draft starts as a mirror of your live ads, real Meta IDs and
                all, so every change is visible against what&rsquo;s running today.
              </p>
              <p>
                Everything it sets is checked against Meta&rsquo;s own list of permitted values before
                it lands — a wrong one comes straight back and gets fixed, rather than surfacing as a
                failed publish later.
              </p>
            </>
          }
        >
          <h4>What a good structure looks like</h4>
          <ul>
            <li>
              <strong>Consolidate, don&rsquo;t fragment.</strong> One objective per campaign, and one
              ad set holding several genuinely different ads beats several thin ad sets — each ad set
              needs its own 50 results a week to learn.
            </li>
            <li>
              <strong>The creative is the targeting.</strong> Meta reads the ad itself as the
              strongest signal of who should see it, so an ad set eventually wants several distinct
              angles and lets broad targeting find the buyers.
            </li>
            <li>
              <strong>The objective and what it optimises for must agree</strong> — sales to
              conversions or value, leads to lead generation, traffic to landing-page views rather
              than raw clicks. Optimising for cheap clicks while wanting purchases is the most common
              waste there is.
            </li>
            <li>
              <strong>Broad by default:</strong> a country, an age band the persona justifies, and
              Meta&rsquo;s own audience expansion on. Interests only when the strategy names a niche
              to anchor on, and kept short — never a stack of micro-interests.
            </li>
            <li>
              <strong>Placements left automatic</strong> unless the creative is built only for feed or
              only for stories — and that choice decides which image shapes the ads need.
            </li>
            <li>
              <strong>Budget on one level only</strong>, campaign or ad set, never both. If you
              haven&rsquo;t said a number, it&rsquo;s left blank for you rather than invented.
            </li>
            <li>
              Names that read at a glance — the product, the objective and the angle — never
              &ldquo;Campaign 1&rdquo;.
            </li>
          </ul>

          <h4>Changing it afterwards</h4>
          <ul>
            <li>
              <strong>Edits are surgical, not rewrites.</strong> Swap one headline, change the
              audience, add or drop a carousel card, pick a different option from a pool — it changes
              exactly that. Nothing else in the draft moves.
            </li>
            <li>
              <strong>Video ads aren&rsquo;t supported yet</strong> — single-image and carousel only,
              which is why the campaign questions never offer a video format.
            </li>
          </ul>
        </Panel>

        <Panel
          num="04 · i"
          title="The copywriter"
          owns="Owns: what the ad says"
          lede={
            <>
              <p>
                A separate writer with its own brief: the strategy&rsquo;s bet, this ad&rsquo;s angle,
                the brand voice, the personas and the competitor findings — then told to make this ad
                distinctly different from its siblings.
              </p>
              <p>
                <strong>Every field comes back as a pool of options, not one answer</strong>, and each
                option has to pull a <em>different</em> persuasion lever — pain to relief, benefit,
                social proof, curiosity gap, offer, urgency. So what you&rsquo;re choosing between is
                a real test rather than five rewordings of one idea. The strongest is listed first as
                the default.
              </p>
              <p>It writes copy only. It never decides what the picture looks like.</p>
            </>
          }
        >
          <h4>Where the words have to fit</h4>
          <Bench
            rows={[
              ['Primary text', 'only ~125 characters show before the mobile “See more” fold — the hook lands inside them, the single most important idea inside the first 80'],
              ['Headline', '40 characters, 27 to be safe across placements; it renders bold under the image, so it’s the offer or the promise, never a slogan'],
              ['Description', '25 characters, shown in only a few placements — reinforcement such as free shipping or a guarantee, never anything the ad needs'],
              ['Carousel headline', 'under 30 characters; these truncate hardest of all'],
            ]}
          />

          <h4>Structures it writes to</h4>
          <ul>
            <li>
              Problem → agitate → solve for pain-led angles; before → after → bridge for
              transformation; attention → interest → desire → action as a general scroll-interrupt;
              hook → story → offer for warm traffic and founder-voice ads. Matched to{' '}
              <strong>how aware the audience already is</strong> — cold traffic needs educating before
              it&rsquo;s sold to.
            </li>
            <li>
              Hook types are spread across the pool rather than reworded: a callout naming the exact
              person, a bold specific claim, a pattern interrupt, an open loop, a surprising figure, a
              first-person story open. The hook has to land in the first line or it hasn&rsquo;t
              landed.
            </li>
            <li>
              <strong>Length is a product decision, so it tests both.</strong> Short copy tends to win
              for simple or low-price offers; well-structured long copy can win for complex ones. The
              pool carries a tight version and a longer one, and the market decides.
            </li>
            <li>
              The button matches the objective and the stage — buy or shop for purchase intent, sign
              up or get a quote for leads, learn more for cold traffic — and the options differ in how
              much commitment they ask for, so that&rsquo;s testable too.
            </li>
          </ul>

          <h4>Voice</h4>
          <ul>
            <li>
              <strong>Native to the feed.</strong> Copy that reads &ldquo;ad-shaped&rdquo; — corporate
              filler, hype adjectives, stacked exclamation marks — gets scrolled past. Specificity is
              what stops the scroll: a real number, a named outcome, an actual situation.
            </li>
            <li>Urgency only when the offer genuinely makes it true.</li>
            <li>
              <strong>The promise has to survive the click.</strong> The claim and phrasing carry
              through to the landing page — an ad must never promise what the page can&rsquo;t
              deliver.
            </li>
            <li>
              <strong>It may not invent proof.</strong> No made-up statistics, review counts or
              testimonials — social proof can only use what the strategy or brand context provides.
            </li>
          </ul>

          <h4>On a carousel</h4>
          <ul>
            <li>
              Card one is the hook and has to earn the swipe. Each middle card advances exactly one
              point — one product, one benefit, one proof — never two. The last card closes with the
              offer and the strongest call to action.
            </li>
          </ul>

          <h4>Meta policy — the rejection lines</h4>
          <ul>
            <li>
              <strong>Never imply the ad knows something personal about the reader</strong> — health,
              body, age, finances, religion, relationship status. A second-person question naming the
              attribute is the classic rejection, so it states the benefit or describes the situation
              instead of labelling the reader.
            </li>
            <li>
              No sensational or clickbait framing, no before-and-after claims, no unverifiable
              superlatives or guarantees — no &ldquo;#1&rdquo;, no &ldquo;guaranteed results&rdquo;.
            </li>
            <li>
              No caps-lock, stacked punctuation or emoji walls; they read as spam to people and to the
              review system alike.
            </li>
          </ul>
        </Panel>

        <Panel
          num="04 · ii"
          title="The image maker"
          owns="Owns: what the ad shows"
          lede={
            <>
              <p>
                A separate renderer, and it is handed a lot: your brand&rsquo;s visual identity, the
                personas, the competitor landscape as inspiration rather than something to copy, the
                ad set&rsquo;s audience, the ad&rsquo;s own finished copy, your real product
                photographs, any file you attached for this picture, and — on a tune — what the
                diagnosis said about the image running today.
              </p>
              <p>
                Because it already holds all that,{' '}
                <strong>the art direction it receives is deliberately two or three lines</strong>:
                what this shot should show, and on a tune what to change. Every rule below is already
                in its own instructions, so the direction never restates them.
              </p>
              <p>
                Images are made per shape — feed, stories — and a new render is{' '}
                <strong>added as the next version, never over the top of the last</strong>, so you can
                compare and go back.
              </p>
            </>
          }
        >
          <h4>The kind of picture depends on who&rsquo;s seeing it</h4>
          <p className="doc-know-lead">
            The same product needs a different photograph for a stranger than for someone who nearly
            bought last week. <strong>Nine named formats are written into its instructions</strong> —
            the nine below — each tied to the stage it suits. It picks whichever this ad&rsquo;s
            objective and angle call for, and only composes freely when none is the stronger move.
          </p>

          <p className="doc-fgroup">
            <b>For someone who&rsquo;s never heard of you</b>
            It has to look like something worth looking at, not like an ad, or it&rsquo;s scrolled
            past.
          </p>
          <ul>
            <li>
              <strong>Lifestyle</strong> — the product being used, in a real setting. The default for
              a cold audience, because it reads as content rather than advertising.
            </li>
            <li>
              <strong>Customer-style still</strong> — looks like a real customer shot it on their
              phone. Unpolished on purpose; the most trusted look there is for a stranger.
            </li>
            <li>
              <strong>Pattern interrupt</strong> — deliberately odd, borrowing the visual language of
              an ordinary post. Awareness only, and never off-tone for the brand.
            </li>
            <li>
              <strong>Us versus them</strong> — a split frame: the awkward old way beside your way.
              The &ldquo;them&rdquo; is always an unbranded stand-in, never a real competitor.
            </li>
          </ul>

          <p className="doc-fgroup">
            <b>For someone weighing it up</b>
            They know what it is. Now they want to know what it does.
          </p>
          <ul>
            <li>
              <strong>Feature callout</strong> — the product with three to five short labels pointing
              at what each part is for.
            </li>
            <li>
              <strong>Editorial</strong> — a magazine-feature look: restrained type, real white space.
              Reads as credible rather than salesy, and lands well with older audiences.
            </li>
          </ul>

          <p className="doc-fgroup">
            <b>For someone who already knows you</b>
            They&rsquo;ve visited, or bought before. The job is to close.
          </p>
          <ul>
            <li>
              <strong>Testimonial card</strong> — a short customer quote and a star rating on a clean
              background. The voice stays role-level — &ldquo;verified customer&rdquo; — never an
              invented person or a faked screenshot of a review site.
            </li>
            <li>
              <strong>Offer card</strong> — the deal itself set big and bold, product beside it. For
              promotions and the bottom of the funnel.
            </li>
            <li>
              <strong>Studio shot</strong> — the product, well lit, nothing else. For catalogue,
              retargeting and brand-polish moments.
            </li>
          </ul>

          <h4>What makes an ad image work</h4>
          <ul>
            <li>
              <strong>One dominant subject</strong>, large and obvious, separated from its background.
              More than about three competing elements and the message is lost. It has to read at
              thumbnail size and survive a squint.
            </li>
            <li>
              <strong>Designed against the feed itself.</strong> The same frame has to hold in a white
              feed and a black one, so a near-white or near-black image is avoided — it dissolves into
              one of them. Standout is built inside the frame instead.
            </li>
            <li>
              <strong>Native, not ad-shaped</strong> — a photo a person would actually post. Product
              in use beats product on white; a subject caught mid-action stops the scroll better than
              a posed one.
            </li>
            <li>
              <strong>The gaze is directed on purpose</strong> — someone looking at the product drives
              attention to it; eye contact builds trust but holds attention on the face.
            </li>
            <li>
              <strong>Cast from the targeting.</strong> Age, styling, setting and cultural cues come
              from the ad set&rsquo;s actual audience, so the people in the picture look like the
              people being sold to.
            </li>
          </ul>

          <h4>Real, not &ldquo;AI-perfect&rdquo;</h4>
          <ul>
            <li>
              The instructions push against the model&rsquo;s own drift toward airbrushed stock
              polish: natural skin and hair, candid poses, lived-in rooms, honest shadows.
            </li>
            <li>
              <strong>The AI tells are named and guarded against</strong> — correct hands, one
              coherent light source with matching shadows and reflections, real texture rather than
              waxy plastic, clean edges, colour that isn&rsquo;t over-saturated.
            </li>
            <li>
              <strong>Your real product, not a look-alike.</strong> Your own product and logo
              photographs are attached as references on almost every render — that&rsquo;s what stops
              it inventing a plausible version of your packaging. A file you attach can be pinned to
              one specific picture the same way.
            </li>
          </ul>

          <h4>Fitting Meta&rsquo;s frames</h4>
          <ul>
            <li>
              <strong>Feed (tall or square):</strong> keep text and logos out of the bottom fifth —
              that&rsquo;s where Meta puts its own headline and button.
            </li>
            <li>
              <strong>Stories and Reels (vertical):</strong> everything that matters stays in the
              centre band. The top strip and the sides are app furniture, and Reels covers roughly a
              third of the bottom — so it protects the larger zone when unsure.
            </li>
            <li>
              <strong>Background may bleed, meaning may not.</strong> Meta can re-crop or extend the
              outer edges, so the product, the faces and any text never sit near an edge.
            </li>
            <li>
              <strong>Text in the image</strong> is generated from the ad&rsquo;s own offer — short,
              bold, correctly spelled, legible at thumbnail size. Or none at all, with space left, when
              copy will be laid over it later.
            </li>
          </ul>

          <h4>Meta policy — the rejection lines</h4>
          <ul>
            <li>
              <strong>Never draw a button or anything that looks tappable.</strong> Meta renders its
              own call to action; a painted one is a disapproval. No fake interface, no invented
              verified badges, no play buttons, no watermarks or borders.
            </li>
            <li>
              No before-and-after frames for health, weight or beauty — no split-frame results, no
              scales, no idealised-body close-ups.
            </li>
            <li>
              No image that implies the ad knows something personal about the viewer. Aspiration,
              never accusation.
            </li>
            <li>
              <strong>Only your brand appears.</strong> In an old-way-versus-this-way image the
              &ldquo;old way&rdquo; is always an unbranded stand-in, never a recognisable competitor —
              and a testimonial card stays role-level, never a fabricated person or a fake screenshot
              of a review site.
            </li>
          </ul>
        </Panel>
      </Section>
    </div>
  );
}
