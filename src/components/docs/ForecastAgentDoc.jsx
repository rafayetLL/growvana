import React from 'react';
import {
  DiagramContext,
  DiagramBrief,
  DiagramTurn,
  DiagramThread,
  DiagramMethods,
} from './ForecastDocDiagrams.jsx';

// Static documentation for the Forecast Agent. No data fetching, no props from
// the wire — this is a written page, kept in sync by hand with the agent's
// system prompt, its forecasting playbook and the endpoint. Built the same way
// as MetaAdAgentDoc.jsx and EmailAgentDoc.jsx, using only the `.doc-*` classes
// and elements those pages already use, so the print stylesheet and the Word
// export need nothing new.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// ForecastDocDiagrams.jsx rather than in another paragraph here.

// No `updated` date, for the same reason as the other pages: a stamp is only as
// true as the last person to remember it, and a stale one is worse than none.
export const FORECAST_DOC_META = {
  title: 'Forecast Agent',
  subtitle: 'How it reads your Amazon exports, agrees the job with you, and builds a forecast you can check.',
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

export default function ForecastAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what goes in, what comes out ===================== */}
      <Section
        num="01"
        title="What goes in, and what comes out"
        intro={
          <>
            <p>
              The Forecast Agent is an Amazon analyst you talk to. You send it the exports you already
              pull from Vendor Central or Seller Central, say in your own words what you need, and it
              works from those files and nothing else. What comes back is a forecast workbook you can
              open beside the chat, a sourced answer in the chat itself, or both.
            </p>
            <p>
              Everything happens inside a <strong>thread</strong>: one continuous conversation about
              one brand&rsquo;s Amazon business. A thread remembers every message and every file sent
              to it, so you can come back to it, add a newer export, and ask the next question without
              starting again.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>It only knows what you send it.</b> The agent has no link to your Amazon account and
              no internet. Every number it gives you is worked out from a file you attached, so a
              forecast is only ever as current as the latest export in the thread.
            </>
          }
        >
          <DiagramContext />
        </Figure>

        <h3 className="doc-h3">Three kinds of request</h3>
        <p className="doc-lead">
          It reads what you are actually asking for and decides the shape of the answer itself.
          Nobody has to tell it which tabs to build.
        </p>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '16%' }}>Request</th>
                <th style={{ width: '38%' }}>Sounds like</th>
                <th style={{ width: '46%' }}>What you get</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Forecast</td>
                <td>
                  <em>&ldquo;Build a Q4 forecast&rdquo;, &ldquo;what does it take to hit
                  $10M&rdquo;, &ldquo;PO plan through year end&rdquo;</em>
                </td>
                <td>
                  An Excel workbook with the weekly forecast and its assumptions, plus a short summary
                  in the chat.
                </td>
              </tr>
              <tr>
                <td>What-if</td>
                <td>
                  <em>&ldquo;If I run 20% off my top ten ASINs in September, what changes?&rdquo;,
                  &ldquo;what discount depth should I run?&rdquo;</em>
                </td>
                <td>
                  The forecast as it stands and the changed one side by side, so the difference the
                  change makes can be read directly.
                </td>
              </tr>
              <tr>
                <td>Briefing</td>
                <td>
                  <em>&ldquo;How did last week go?&rdquo;, &ldquo;which ASINs are at risk?&rdquo;,
                  &ldquo;is ad spend efficient?&rdquo;</em>
                </td>
                <td>
                  An answer in the chat: numbers with their source, week-on-week and year-on-year
                  where the export carries them, and a short list of flags such as out of stock, thin
                  cover, rejected POs or ad-cost outliers. No workbook unless you ask for one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="doc-list">
          <li>
            <strong>Built for 1P Vendor Central first</strong> — the purchase-order chain between
            Amazon and a vendor is what it is best at. Seller Central and FBA are supported too.
          </li>
          <li>
            <strong>It reads what the exports actually hold</strong> — spreadsheets (including the
            older .xls trackers), CSVs, PDFs, PowerPoint and Word files, text, and pictures. The
            weekly CSM report often arrives as pictures of pages with no text in them; it reads
            those pages as images rather than treating them as empty.
          </li>
          <li>
            <strong>Up to 20 files per message, 50 MB each</strong>, and you can add more on any
            later message.
          </li>
          <li>
            <strong>If one of your files cannot be used at all</strong> — it is empty, locked, not
            what its name says, or a picture with no figures it can read — it tells you which one
            and what to send instead, while it carries on with the rest.
          </li>
          <li>
            <strong>It is an Amazon analyst and nothing else.</strong> A question about what fill
            rate means or which export it needs gets a real answer; a request outside your Amazon
            business gets one sentence saying so and a pointer back to what it can help with.
          </li>
        </ul>
      </Section>

      {/* ===================== 02 — the brief ===================== */}
      <Section
        num="02"
        title="It agrees the job before it builds"
        intro={
          <p>
            A forecast build takes around fifteen minutes and usually ends up in front of someone
            senior. Building the wrong one wastes an afternoon on both sides. So before the first
            build in a thread, once it has read every file, the agent sends a short{' '}
            <strong>brief</strong>: how it read your request, the defaults it will take, and anything
            you mentioned that it cannot find. It proposes; it does not interrogate.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramBrief />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>What earns a question</h3>
            <dl>
              <dt>A file you mentioned that isn&rsquo;t there</dt>
              <dd>
                &ldquo;The promo calendar is attached&rdquo;, and it isn&rsquo;t. It checks your
                message against the files deliberately, because this is the most common reason a
                finished forecast gets thrown away.
              </dd>
              <dt>A plan with no number named</dt>
              <dd>
                A full-year plan could be a prediction or a target, and the two produce very
                different workbooks. Name a number and it is a target; no question needed.
              </dd>
              <dt>Both channels in the files, and your message silent</dt>
              <dd>Vendor Central or Seller Central — the revenue basis follows from the answer.</dd>
              <dt>A revenue basis that genuinely matters</dt>
              <dd>
                When Shipped COGS and Shipped Revenue differ materially and nothing says which you
                mean.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>How it writes them</h3>
            <dl>
              <dt>Three at most</dt>
              <dd>One good question beats three adequate ones, and zero is a perfectly good brief.</dd>
              <dt>Options you pick in five seconds</dt>
              <dd>
                Two to five, in your words — &ldquo;Shipped COGS (what Amazon pays you)&rdquo;, not
                &ldquo;COGS basis&rdquo;.
              </dd>
              <dt>Its recommendation comes first</dt>
              <dd>And it is exactly what happens if you skip the question.</dd>
              <dt>No yes-or-no, no two-in-one</dt>
              <dd>It offers the real alternatives, one decision per question.</dd>
              <dt>Nothing your files answer</dt>
              <dd>If it had to open a file to write the options, it already has the answer.</dd>
            </dl>
          </div>
        </div>

        <p className="doc-lead">
          Files you send after it asked may be the answer. It reads them before falling back to its
          recommendation, and says which ones it checked.
        </p>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why default instead of ask?</strong> You can&rsquo;t tell it what growth rate to
            assume — that is what the forecast is for. An assumption stated next to a real number is
            far easier to correct than a question asked in the abstract, because you can see what it
            did to the forecast. So when something is unclear it takes the most defensible reading,
            writes it down as an assumption, and builds.
          </p>
        </div>
      </Section>

      {/* ===================== 03 — one turn ===================== */}
      <Section
        num="03"
        title="How one message turns into numbers"
        intro={
          <>
            <p>
              The agent does not do arithmetic in its head. For every calculation it writes a{' '}
              <strong>program</strong> — a short set of plain, step-by-step instructions a computer
              follows exactly — runs it against your files, and reads the result. The agent decides
              what to work out; the program works it out.
            </p>
            <p>
              That is what makes the numbers trustworthy: the same instructions on the same files
              give the same answer every time, and every figure can be traced back to the file it
              came from.
            </p>
          </>
        }
      >
        <Figure caption={null}>
          <DiagramTurn />
        </Figure>

        <h3 className="doc-h3">What it holds itself to</h3>
        <ul className="doc-list">
          <li>
            <strong>Real formulas, never pasted results.</strong> Change an input in the workbook and
            the forecast moves with it — the workbook is a model you can work with, not a printout.
          </li>
          <li>
            <strong>One program builds the whole workbook</strong>, end to end. A correction means
            fixing that program once and building again, never patching cells by hand.
          </li>
          <li>
            <strong>A missing input is never made up.</strong> The cell that needs it reads{' '}
            <em>NEEDS INPUT</em>, the reply names what would fill it, and everything that does not
            depend on it is delivered anyway. A workbook that is 90% done is worth more than a
            question.
          </li>
          <li>
            <strong>Every driver is labelled with its source</strong> — which file, which tab, as of
            which date — rather than buried inside a formula.
          </li>
          <li>
            <strong>It stops when the work is correct, not when it is perfect.</strong> Column widths
            and one more cross-check of something already covered are not worth more of your
            waiting time.
          </li>
        </ul>

        <h3 className="doc-h3">The checks, in plain terms</h3>
        <p className="doc-lead">
          Two checks run on the finished file, once, before anything is published. A failure is a
          defect to fix, never a note to pass on. A warning gets either a fix or a sentence of
          explanation in the reply.
        </p>
        <Bench
          rows={[
            ['Formulas', 'the workbook is recalculated until not one formula returns an error'],
            ['Weeks', 'every week runs Sunday to Saturday, and no week appears twice'],
            ['Seasonal curve', 'averages about 1.0 across the months it covers, and stays within roughly 0.5 to 2.0'],
            ['Run-rate', 'a forecast well over about 1.5 times the current run-rate is justified in the summary or revised'],
            ['Totals', 'the per-ASIN detail adds back to the weekly total, with the difference reported as a number'],
            ['Quoted figures', 'every number it means to put in the reply is declared first, then matched against the workbook'],
            ['Last year', 'the forecast window is compared with the same window last year'],
          ]}
        />

        <p className="doc-fine">
          You can watch it work: each step shows in the chat as a short line — <em>Reading a
          file</em>, <em>Running analysis</em>, <em>Publishing a deliverable</em> — and a finished
          file appears for download the moment it is published, before the reply has finished.
        </p>
      </Section>

      {/* ===================== 04 — what a thread keeps ===================== */}
      <Section
        num="04"
        title="What a thread remembers"
        intro={
          <p>
            Each thread keeps its own folder on our side, and that folder is the thread&rsquo;s
            whole memory: the conversation, your files, the agent&rsquo;s working notes and the
            finished deliverables. Nothing carries over from one thread to another, so two brands —
            or two separate projects for one brand — never see each other&rsquo;s numbers.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>Notes, not re-reading.</b> At the start of an investigation the agent writes down
              what it established — the account, the channel, the latest complete week, what each
              file covers and what is missing. Every later message starts from those notes, so a
              follow-up question does not pay for the whole first read again.
            </>
          }
        >
          <DiagramThread />
        </Figure>

        <ul className="doc-list">
          <li>
            <strong>Every file stays in play.</strong> Send the PO history three messages after the
            sales dashboard and both are part of the next answer. It says what it is reusing from
            earlier and what it read fresh.
          </li>
          <li>
            <strong>A rebuild replaces the file, it doesn&rsquo;t pile up copies.</strong> The new
            workbook is built and checked separately, then swapped in whole under the same name — so
            the one you open is always the latest, and never one half-way through being written.
          </li>
          <li>
            <strong>Your files are evidence, not instructions.</strong> If a cell, a sheet name or a
            note inside an export reads like a command addressed to the agent, it mentions that it
            is there and carries on — only you, in the chat, decide what it does.
          </li>
          <li>
            <strong>Coming back later</strong> is a matter of opening the same thread: the
            conversation, the files and the latest workbook are all where you left them.
          </li>
        </ul>
      </Section>

      {/* ===================== 05 — the methods ===================== */}
      <Section
        num="05"
        title="How it forecasts"
        intro={
          <>
            <p>
              The method is not improvised for each request. The agent applies{' '}
              <strong>Growvana&rsquo;s own forecasting framework</strong>, drawn from forecasts
              delivered to real brands, and every default in it is a number it states in the workbook
              so you can see it and overrule it. Where it departs from one, it says so and why.
            </p>
            <p>
              Two words used below: <strong>1P</strong> is selling to Amazon as a vendor, through
              Vendor Central; <strong>3P</strong> is selling on Amazon yourself, through Seller
              Central, usually with Amazon storing and shipping the stock (FBA).
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>On 1P, the weekly PO by ASIN is the answer.</b> A forecast that lands on revenue
              without saying what Amazon will order, week by week and product by product, has not
              answered the question a vendor is really asking: how much stock to hold, and when.
            </>
          }
        >
          <DiagramMethods />
        </Figure>

        <Panel
          num="01"
          title="Run-rate × seasonality × promo"
          owns="When: no number is named"
          lede={
            <>
              <p>
                The default on Vendor Central, and the answer to &ldquo;what does Q4 look
                like?&rdquo;: what the purchase orders look like week by week if nothing changes.
                A confirmed recent weekly rate is carried forward through your brand&rsquo;s own
                seasonal curve and its promotional calendar.
              </p>
              <p>
                <strong>The seasonal curve is built from your own prior-year months</strong>, not
                from a generic retail calendar — the single most important judgement in the model,
                and the one where general holiday intuition is most often wrong.
              </p>
            </>
          }
        >
          <h4>How each piece is set</h4>
          <ul>
            <li>
              <strong>The starting rate</strong> — the last two to four complete weeks, named by
              date. Never a partial final week, which the last week in an Amazon export usually is.
            </li>
            <li>
              <strong>The curve&rsquo;s level is checked, not just its shape.</strong> A brand
              running at a third of last year&rsquo;s volume does not get last year&rsquo;s peak.
            </li>
            <li>
              <strong>Organic growth</strong> is stated on its own, 3% a month by default for a
              stable range, so you can see which part of the forecast is doing the work.
            </li>
            <li>
              When last year&rsquo;s history is on a different channel from the forecast, it says it
              borrowed that curve and that the product mix may differ.
            </li>
          </ul>

          <h4>The promo ladder it uses without your calendar</h4>
          <p className="doc-know-lead">
            Your own promo calendar always wins. Without one it models this standard ladder, labelled{' '}
            <em>modeled, not a submitted plan</em>, as extra units on top of seasonality — never as a
            price cut:
          </p>
          <Bench
            rows={[
              ['Coupon-only push', 'about 8%'],
              ['Back-to-school or holiday reset', 'about 12%'],
              ['Pre-Q4 ramp', 'about 5%'],
              ['Q4 kickoff, Best Deals', 'about 10%'],
              ['Turkey 5 and Black Friday', 'about 45%'],
              ['Cyber Monday and its tail', 'about 35%'],
              ['Gifting, free shipping', 'about 18%'],
              ['Post-Christmas', 'about 5%'],
              ['New Year reset', 'about 30%'],
            ]}
          />
        </Panel>

        <Panel
          num="02"
          title="Target-solved, three scenarios"
          owns="When: you name a number"
          lede={
            <>
              <p>
                &ldquo;What does it take to hit $10M?&rdquo; is solved backwards: what the rest of the
                year has to do to land on your number, expressed as three scenarios. And it says, in
                these words, that the result is <strong>a requirement, not a prediction</strong> — a
                target that reads like a forecast is the most misleading thing it could hand you.
              </p>
              <p>
                The period is split where your own demand turns, not at a calendar quarter: a quieter
                stretch before the peak, and the peak itself, which carries the plan.
              </p>
            </>
          }
        >
          <h4>The three scenarios</h4>
          <Bench
            rows={[
              ['Aggressive', 'solved exactly to your target'],
              ['Middle', 'half of the extra peak-season lift the target needs actually lands'],
              ['Conservative', 'a fifth of that extra lift lands'],
            ]}
          />
          <ul>
            <li>
              Never a flat percentage of the target — a share of the required push is a statement
              about how much of it lands; a flat percentage means nothing.
            </li>
          </ul>

          <h4>Measured against what you have already done</h4>
          <ul>
            <li>
              <strong>The benchmark is mandatory.</strong> The same calendar window in each prior
              year, turned into a daily rate so different-length windows compare fairly, and the ask
              stated as a percentage of it. &ldquo;We are asking for 60% of what you already did in
              this window&rdquo; is something a finance team can act on.
            </li>
            <li>
              <strong>Against the most recent year on its own, too.</strong> A multi-year average
              can flatter a plan badly when last year broke the trend — which can turn the
              &ldquo;conservative&rdquo; case into a continuation of decline rather than a floor, and
              it says so.
            </li>
            <li>
              Products that spiked at Black Friday last year get more of this year&rsquo;s peak, and
              those that did not get less, rather than one flat lift across the range.
            </li>
          </ul>
        </Panel>

        <Panel
          num="03"
          title="Per ASIN, plus a reorder engine"
          owns="When: you reorder from a supplier"
          lede={
            <>
              <p>
                For 3P and FBA, where the question is when to order from your own supplier. Each
                product is forecast from its own recent weekly sales and trend, the products are added
                up, and an order-up-to engine turns that demand into order quantities.
              </p>
              <p>
                It bolts onto either of the other two whenever you ask for purchase orders.
              </p>
            </>
          }
        >
          <h4>The settings it starts from</h4>
          <Bench
            rows={[
              ['Starting rate', 'the average of the last four actual weeks, named'],
              ['Trend', 'held between −3% and +6% a week, so a small, noisy product cannot run away'],
              ['Price', 'average selling price held flat over the window'],
              ['Cover target', '7 weeks on Vendor Central (the middle of 6–8), 4 weeks on FBA'],
              ['Lead time', 'every leg added up — supplier to warehouse, warehouse to Amazon'],
            ]}
          />
          <ul>
            <li>
              <strong>Every order row shows two dates</strong>: the week to place the order and the
              week of sales it is sized for. A plan whose orders peak in the same week as demand is
              wrong, and it knows it.
            </li>
            <li>Any product under two weeks of cover is flagged.</li>
            <li>
              Extra ad spend is turned into extra sales from your own recent ad-cost-to-sales ratio,
              then trimmed for diminishing returns — not guessed.
            </li>
          </ul>
        </Panel>

        <Panel
          num="04"
          title="The what-if"
          owns="When: you name a promo or ad change"
          lede={
            <>
              <p>
                A what-if is not a new forecast. It is the as-is forecast with one block of inputs
                changed, built after the as-is one and placed beside it, so the difference can be put
                down to the change and nothing else.
              </p>
              <p>
                <strong>The change sits in labelled cells</strong> — which ASINs, which dates, what
                discount, what extra ad spend — so you can turn 20% into 30% and watch the model move.
              </p>
            </>
          }
        >
          <h4>What it gets right that is easy to get wrong</h4>
          <ul>
            <li>
              <strong>A discount is not the same as its lift.</strong> 20% off lands in the 15–20%
              extra-units band, not at 20% because the discount is 20%.
            </li>
            <li>
              <strong>The PO moves earlier, not just bigger.</strong> Extra sales in the promo weeks
              raise the orders in the weeks <em>before</em> them, by the vendor lead time.
            </li>
            <li>
              <strong>A promotion pulls demand forward</strong>, so the weeks after it dip rather than
              snapping back to normal, and the payback it assumed is stated.
            </li>
            <li>
              It reports the difference — extra units, extra revenue, the margin given up to the
              discount, and how the POs change in size and timing.
            </li>
            <li>
              Asked which depth to run, it models three side by side. Deeper is not automatically
              better: past a point the extra units stop paying for the margin, and that crossover is
              the real answer.
            </li>
          </ul>
        </Panel>

        <h3 className="doc-h3">Standards every forecast follows</h3>
        <ul className="doc-list">
          <li>
            <strong>The Amazon week</strong> — every week runs Sunday to Saturday, and the first
            forecast week is the first full one after the last confirmed actual.
          </li>
          <li>
            <strong>Which revenue, said out loud.</strong> Three numbers get called revenue on Vendor
            Central: <em>Ordered Revenue</em> (what customers ordered), <em>Shipped Revenue</em>{' '}
            (Amazon&rsquo;s retail sales) and <em>Shipped COGS</em> (what Amazon pays you — your own
            revenue). It forecasts the one asked for, labels it, and carries the ratio so the other
            can be read off without a rebuild.
          </li>
          <li>
            <strong>Never a bare &ldquo;Ordered&rdquo; label.</strong> In Amazon&rsquo;s own exports
            &ldquo;Units Ordered&rdquo; and &ldquo;Ordered Units&rdquo; mean different things, so the
            workbook says <em>Customer Order Units</em> for demand and <em>Vendor PO Units</em> for
            what Amazon orders from you.
          </li>
          <li>
            <strong>A channel switch is checked without being asked.</strong> For a brand moving
            from Seller Central to Vendor Central, a category far smaller on the new channel than on
            the old has usually not ramped up yet — that is channel maturity, not weak demand, and it
            is raised in the brief.
          </li>
          <li>
            <strong>Where the exports mislead, it says so</strong> — a column of zeros that means
            &ldquo;not reported&rdquo; rather than &ldquo;no demand&rdquo;, week labels in the wrong
            order, an ads report from the wrong account — named in the workbook and the reply.
          </li>
        </ul>
      </Section>

      {/* ===================== 06 — what you get back ===================== */}
      <Section
        num="06"
        title="What you get back"
        intro={
          <p>
            The workbook carries the detail; the chat carries the headline. Each finished file shows
            up in the chat as a card, and opens in a panel beside the conversation — so the numbers
            and the discussion about them sit side by side.
          </p>
        }
      >
        <h3 className="doc-h3">The forecast workbook</h3>
        <p className="doc-lead">
          The tabs are chosen to fit the question — a four-tab workbook that answers it well beats a
          nine-tab one padded to match a template. These are the ones that usually earn their place.
          Whatever the shape, you can always find the headline numbers, the assumptions behind them,
          the weekly detail, and where every number came from.
        </p>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Tab</th>
                <th style={{ width: '78%' }}>What it holds</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Executive Summary</td>
                <td>
                  The whole answer on one screen: the current run-rate, the forecast for the window,
                  the peak week, a full-year estimate, the method in a few lines, the assumptions to
                  check and the data gaps. On a target, the scenarios and the prior-year benchmark.
                </td>
              </tr>
              <tr>
                <td>Assumptions</td>
                <td>
                  Every driver as a labelled input with its source — run-rate, revenue basis, lead
                  time, fill rate, growth, cover targets, the seasonal curve and the promo phases.
                  Change one cell here and the forecast moves.
                </td>
              </tr>
              <tr>
                <td>Weekly Forecast</td>
                <td>
                  One row per week: the drivers applied that week and the resulting revenue and units
                  — and on Vendor Central the purchase orders, placed ahead of demand by the lead time.
                </td>
              </tr>
              <tr>
                <td>ASIN detail</td>
                <td>
                  Products down the side, weeks across, adding back exactly to the weekly totals.
                  Products running short on cover are shaded.
                </td>
              </tr>
              <tr>
                <td>Monthly Revenue Summary</td>
                <td>
                  The weekly forecast rolled up by month, beside the same months last year — often the
                  only tab a finance team reads.
                </td>
              </tr>
              <tr>
                <td>Data Sources</td>
                <td>
                  One row per file used: what it provided and how recent it is. It is what keeps the
                  workbook checkable a month later.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="doc-h4">Reading it</h4>
        <Bench
          rows={[
            ['Blue text', 'an input someone typed in'],
            ['Black text', 'a formula'],
            ['Green text', 'a figure brought in from another tab'],
            ['Yellow fill', 'a lever you are expected to change'],
          ]}
        />

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>The reply in chat</h3>
            <dl>
              <dt>The headline first</dt>
              <dd>
                The window, the totals, the peak week, and how they compare with last year or the
                current run-rate.
              </dd>
              <dt>The method in two sentences</dt>
              <dd>Including anything it deliberately did not do.</dd>
              <dt>Three to five assumptions to check</dt>
              <dd>The ones most worth your eye before the numbers go any further.</dd>
              <dt>The data gaps</dt>
              <dd>And exactly what to send to close each one.</dd>
              <dt>The file, by name</dt>
              <dd>And what was checked — including any check it skipped rather than passed.</dd>
              <dt>In plain business language</dt>
              <dd>
                No formulas, cell references or technical terms — a finished piece of work and the
                numbers in it.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>Other deliverables</h3>
            <dl>
              <dt>A methodology write-up — on request</dt>
              <dd>
                Ask how it was built and you get a two-to-three-page Word document: how it read the
                request, what arrived and what was missing, the method and why it fits, every
                assumption with its source, the benchmark, what the checks verified, and the
                limitations, stated plainly. It is not produced on every build, because the workbook
                already carries the method.
              </dd>
              <dt>Decks, PDFs, charts and data extracts</dt>
              <dd>When a request calls for one.</dd>
              <dt>Previews beside the chat</dt>
              <dd>
                Spreadsheets open one tab per sheet, and PDFs as pages. Word files and decks open or
                download in full.
              </dd>
              <dt>Predictable names</dt>
              <dd>
                A forecast is named for the brand, the window and the date it was built, so a
                returning team finds the same things in the same places.
              </dd>
            </dl>
          </div>
        </div>
      </Section>
    </div>
  );
}
